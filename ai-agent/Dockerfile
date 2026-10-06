# EduFlow AI Agent - FastAPI RAG / quiz generation service
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /srv/ai-agent

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
RUN mkdir -p /srv/ai-agent/data/chroma_db

EXPOSE 8888
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8888/health', timeout=4)" || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8888"]
