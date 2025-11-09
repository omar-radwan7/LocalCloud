"""Utility helpers for extracting text from user uploaded files."""

from __future__ import annotations

import io
from typing import Tuple

import chardet
import docx
import magic
import PyPDF2


def _extract_pdf_text(buffer: bytes) -> str:
    reader = PyPDF2.PdfReader(io.BytesIO(buffer))
    pages = []
    for page in reader.pages:
        text = page.extract_text() or ""
        pages.append(text.strip())
    return "\n".join(pages)


def _extract_docx_text(buffer: bytes) -> str:
    document = docx.Document(io.BytesIO(buffer))
    paragraphs = [p.text.strip() for p in document.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def _extract_plain_text(buffer: bytes) -> str:
    detection = chardet.detect(buffer)
    encoding = detection.get("encoding") or "utf-8"
    try:
        return buffer.decode(encoding, errors="ignore")
    except LookupError:
        return buffer.decode("utf-8", errors="ignore")


def extract_text(buffer: bytes, filename: str) -> Tuple[str, str]:
    """Extract a textual representation of the file and return it with the mime type."""

    mime = magic.Magic(mime=True)
    mime_type = mime.from_buffer(buffer)

    if mime_type == "application/pdf":
        text = _extract_pdf_text(buffer)
    elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        text = _extract_docx_text(buffer)
    elif mime_type.startswith("text/") or filename.lower().endswith((".txt", ".md", ".py")):
        text = _extract_plain_text(buffer)
    else:
        # fallback to attempt plain text decoding
        text = _extract_plain_text(buffer)

    return text.strip(), mime_type
