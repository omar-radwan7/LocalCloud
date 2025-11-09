"""Summarisation utilities using either OpenAI or local transformer models."""

from __future__ import annotations

import asyncio
from typing import List

from ai.config import AISettings, get_settings

try:
    from openai import OpenAI  # type: ignore
except ImportError:  # pragma: no cover - optional dependency
    OpenAI = None  # type: ignore

try:
    from transformers import pipeline  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    pipeline = None  # type: ignore


def _chunk_text(text: str, chunk_size: int = 1200, overlap: int = 100) -> List[str]:
    words = text.split()
    if not words:
        return []

    chunks: List[str] = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        if end == len(words):
            break
        start = end - overlap
        if start < 0:
            start = 0
    return chunks


class Summarizer:
    """Wrapper class that chooses between OpenAI API or a local transformer pipeline."""

    def __init__(self, settings: AISettings | None = None) -> None:
        self.settings = settings or get_settings()
        self.provider = self.settings.model_provider

        self._client = None
        self._pipeline = None
        self._use_responses = True

        if self.provider == "openai":
            if OpenAI is None:
                raise RuntimeError("openai package is required when MODEL_PROVIDER=openai")
            client_kwargs = {}
            if self.settings.openai_base_url:
                client_kwargs["base_url"] = self.settings.openai_base_url
            if self.settings.openai_default_headers:
                client_kwargs["default_headers"] = self.settings.openai_default_headers
            if self.settings.openai_organization:
                client_kwargs["organization"] = self.settings.openai_organization
            if self.settings.openai_project:
                client_kwargs["project"] = self.settings.openai_project
            self._client = OpenAI(api_key=self.settings.openai_api_key, **client_kwargs)
            self._use_responses = self.settings.openai_use_responses
        else:
            if pipeline is None:
                raise RuntimeError("transformers package is required for local summarisation")
            self._pipeline = pipeline(
                "summarization",
                model=self.settings.local_summarization_model,
                tokenizer=self.settings.local_summarization_model,
            )

    async def summarize(self, text: str) -> str:
        if not text.strip():
            return ""

        chunks = _chunk_text(text, chunk_size=self.settings.chunk_size, overlap=self.settings.chunk_overlap)
        if not chunks:
            return ""

        if self.provider == "openai":
            return await asyncio.to_thread(self._summarize_openai, chunks)
        return await asyncio.to_thread(self._summarize_local, chunks)

    def _summarize_openai(self, chunks: List[str]) -> str:
        assert self._client is not None
        summaries: List[str] = []
        for chunk in chunks:
            if self._use_responses:
                response = self._client.responses.create(  # type: ignore[attr-defined]
                    model=self.settings.openai_model,
                    input=f"Summarise the following document section in 2-3 sentences:\n\n{chunk}",
                )
                content = response.output[0].content[0].text if response.output else ""  # type: ignore[attr-defined]
            else:
                response = self._client.chat.completions.create(  # type: ignore[attr-defined]
                    model=self.settings.openai_model,
                    messages=[
                        {
                            "role": "system",
                            "content": "Summarise the user's document section in 2-3 sentences focusing on the key points.",
                        },
                        {"role": "user", "content": chunk},
                    ],
                )
                content = (
                    response.choices[0].message.content if response.choices else ""  # type: ignore[attr-defined]
                )
            summaries.append(content.strip())
        return " ".join(summaries).strip()

    def _summarize_local(self, chunks: List[str]) -> str:
        assert self._pipeline is not None
        summaries: List[str] = []
        for chunk in chunks:
            result = self._pipeline(
                chunk,
                max_length=self.settings.summary_max_length,
                min_length=self.settings.summary_min_length,
                do_sample=False,
            )
            if result and isinstance(result, list):
                summaries.append(result[0]["summary_text"].strip())
        return " ".join(summaries).strip()
