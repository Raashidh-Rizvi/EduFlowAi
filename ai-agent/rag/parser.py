"""
EduFlow AI - Document & Slide Parser
====================================
Simple, robust extractor for PDF and PPTX slide files.
Extracts page numbers, titles, and slide body text.
"""

import os
import re
import zipfile
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional


class ParsedPage:
    def __init__(self, page_number: int, title: str, text: str):
        self.page_number = page_number
        self.title = title
        self.text = text

    def to_dict(self) -> Dict[str, Any]:
        return {
            "page_number": self.page_number,
            "title": self.title,
            "text": self.text
        }


class DocumentParser:
    """
    Extracts structured pages and text from course documents (PDF and PPTX).
    """

    @staticmethod
    def parse(file_path: str) -> List[ParsedPage]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found on disk: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()

        if ext == ".pdf":
            return DocumentParser._parse_pdf(file_path)
        elif ext in [".pptx", ".ppt"]:
            return DocumentParser._parse_pptx(file_path)
        else:
            return DocumentParser._parse_text(file_path)

    @staticmethod
    def _parse_pdf(file_path: str) -> List[ParsedPage]:
        pages: List[ParsedPage] = []
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            for idx, page in enumerate(reader.pages):
                raw_text = page.extract_text() or ""
                clean_text = raw_text.strip()
                lines = [line.strip() for line in clean_text.splitlines() if line.strip()]
                title = lines[0] if lines else f"Slide {idx + 1}"
                
                # Truncate title if it's too long
                if len(title) > 100:
                    title = title[:97] + "..."

                pages.append(ParsedPage(
                    page_number=idx + 1,
                    title=title,
                    text=clean_text
                ))
        except Exception as e:
            print(f"[DocumentParser] Error reading PDF {file_path}: {e}")
        return pages

    @staticmethod
    def _parse_pptx(file_path: str) -> List[ParsedPage]:
        pages: List[ParsedPage] = []
        try:
            with zipfile.ZipFile(file_path, "r") as z:
                slide_files = [f for f in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml", f)]
                slide_files.sort(key=lambda x: int(re.search(r"\d+", x).group()))

                for idx, sfile in enumerate(slide_files):
                    content = z.read(sfile)
                    root = ET.fromstring(content)
                    text_elements = [
                        elem.text for elem in root.iter()
                        if elem.tag.endswith("}t") and elem.text
                    ]
                    clean_lines = [t.strip() for t in text_elements if t.strip()]
                    title = clean_lines[0] if clean_lines else f"Slide {idx + 1}"
                    if len(title) > 100:
                        title = title[:97] + "..."

                    pages.append(ParsedPage(
                        page_number=idx + 1,
                        title=title,
                        text="\n".join(clean_lines)
                    ))
        except Exception as e:
            print(f"[DocumentParser] Error reading PPTX {file_path}: {e}")
        return pages

    @staticmethod
    def _parse_text(file_path: str) -> List[ParsedPage]:
        pages: List[ParsedPage] = []
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
            for idx, p in enumerate(paragraphs):
                lines = p.splitlines()
                title = lines[0][:80] if lines else f"Section {idx + 1}"
                pages.append(ParsedPage(
                    page_number=idx + 1,
                    title=title,
                    text=p
                ))
        except Exception as e:
            print(f"[DocumentParser] Error reading text file {file_path}: {e}")
        return pages
