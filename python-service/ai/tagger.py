"""Keyword extraction utilities."""

from __future__ import annotations

import re
from collections import Counter
from typing import List

from ai.config import AISettings, get_settings

try:
    from keybert import KeyBERT  # type: ignore
except ImportError:  # pragma: no cover - optional dependency
    KeyBERT = None  # type: ignore


_STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "would",
    "could",
    "should",
    "there",
    "their",
    "about",
    "into",
    "through",
    "while",
    "where",
    "which",
    "your",
    "have",
    "been",
    "were",
    "will",
    "shall",
}


class Tagger:
    def __init__(self, settings: AISettings | None = None) -> None:
        self.settings = settings or get_settings()
        self.model = None
        if KeyBERT is not None:
            try:
                self.model = KeyBERT(model=self.settings.local_embedding_model)
            except Exception:
                self.model = None

    async def generate_tags(self, text: str, top_n: int | None = None) -> List[str]:
        top_n = top_n or self.settings.default_tag_count
        if not text.strip():
            return []

        if self.model:
            keywords = self.model.extract_keywords(text, top_n=top_n)
            return [word for word, _ in keywords]

        # fallback simple frequency-based keywords
        tokens = re.findall(r"[a-zA-Z0-9_-]+", text.lower())
        filtered = [token for token in tokens if token not in _STOPWORDS and len(token) > 3]
        counter = Counter(filtered)
        most_common = counter.most_common(top_n)
        return [word for word, _ in most_common]
