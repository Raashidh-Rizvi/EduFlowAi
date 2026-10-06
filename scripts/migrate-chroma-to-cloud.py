"""
Copies the local on-disk vector store (ai-agent/data/chroma_db) into Chroma Cloud.

Only text and metadata are copied: Chroma Cloud re-embeds every chunk with the collection
schema (Qwen dense + Splade sparse), and each chunk lands in its course's collection
(eduflow_course_<course_id>), exactly where ChromaVectorStore searches in cloud mode.
Learning sections saved on chunks (sub_lecture_id, learning_section) are kept.

Usage (CHROMA_* from the env, or from the git-ignored .env.production.local):
    python scripts/migrate-chroma-to-cloud.py [--dry-run] [--source ai-agent/data/chroma_db]
"""
import argparse
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AI_AGENT = os.path.join(ROOT, "ai-agent")
LOCAL_PREFIX = "eduflow_materials_"
PAGE = 500


def load_cloud_env():
    env_file = os.path.join(ROOT, ".env.production.local")
    if os.path.exists(env_file):
        with open(env_file, encoding="utf-8") as f:
            for line in f:
                key, _, value = line.partition("=")
                key, value = key.strip(), value.strip().strip('"')
                if key.startswith("CHROMA_") and value and not os.environ.get(key):
                    os.environ[key] = value
    # Cloud mode is chosen by CHROMA_API_KEY; a local persist dir must not win.
    os.environ.pop("CHROMA_PERSIST_DIR", None)
    if not os.environ.get("CHROMA_API_KEY", "").startswith("ck-"):
        sys.exit("CHROMA_API_KEY is missing (set it in the env or .env.production.local).")


def read_local(source: str):
    """All chunks from the local eduflow_materials_* collections, deduplicated by id."""
    import chromadb
    from chromadb.config import Settings
    client = chromadb.PersistentClient(path=source, settings=Settings(anonymized_telemetry=False))
    chunks = {}
    for col in client.list_collections():
        if not col.name.startswith(LOCAL_PREFIX):
            continue
        collection = client.get_collection(col.name)
        offset = 0
        while True:
            page = collection.get(include=["documents", "metadatas"], limit=PAGE, offset=offset)
            for cid, doc, meta in zip(page["ids"], page["documents"], page["metadatas"]):
                if doc and doc.strip():
                    chunks.setdefault(cid, (doc, meta or {}))
            if len(page["ids"]) < PAGE:
                break
            offset += PAGE
        print(f"  {col.name}: {offset + len(page['ids'])} chunks")
    return chunks


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--source", default=os.path.join(AI_AGENT, "data", "chroma_db"))
    args = parser.parse_args()

    sys.path.insert(0, AI_AGENT)
    print(f"Reading {args.source}")
    chunks = read_local(args.source)
    by_course = {}
    for cid, (doc, meta) in chunks.items():
        by_course.setdefault(meta.get("course_id") or "", []).append((cid, doc, meta))

    from rag.vector_store import EMBEDDING_BATCH_SIZE, cloud_collection_name, split_oversized
    for course_id, rows in sorted(by_course.items()):
        print(f"  {cloud_collection_name(course_id)}: {len(rows)} chunks")
    if args.dry_run:
        print(f"Dry run: {len(chunks)} unique chunks would be copied.")
        return

    load_cloud_env()
    from rag.vector_store import ChromaVectorStore
    store = ChromaVectorStore()
    provenance = {
        "embedding_provider": store.active_provider,
        "embedding_model": store.embedding_model_name,
        "embedding_version": store.embedding_version,
    }
    copied = 0
    for course_id, rows in sorted(by_course.items()):
        ids, docs, metas = [], [], []
        for cid, doc, meta in rows:
            parts = split_oversized(doc)
            for part_no, part in enumerate(parts):
                ids.append(cid if len(parts) == 1 else f"{cid}_p{part_no}")
                docs.append(part)
                metas.append({**meta, **provenance})
        collection = store._course_collection(course_id)
        for start in range(0, len(ids), EMBEDDING_BATCH_SIZE):
            end = start + EMBEDDING_BATCH_SIZE
            collection.upsert(ids=ids[start:end], documents=docs[start:end], metadatas=metas[start:end])
        copied += len(ids)
        print(f"  copied {len(ids)} -> {collection.name} (now {collection.count()})")
    print(f"Done: {copied} chunks in Chroma Cloud.")


if __name__ == "__main__":
    main()
