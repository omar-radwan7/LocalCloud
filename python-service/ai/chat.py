"""Chat manager implementing a lightweight RAG pipeline."""

from __future__ import annotations

import asyncio
from typing import Dict, List

from ai.config import AISettings, get_settings
from ai.embeddings import EmbeddingManager
from ai.summarizer import Summarizer

try:
    from openai import OpenAI  # type: ignore
except ImportError:  # pragma: no cover
    OpenAI = None  # type: ignore


class ChatManager:
    def __init__(self, settings: AISettings | None = None) -> None:
        self.settings = settings or get_settings()
        self.embedding_manager = EmbeddingManager(self.settings)
        self.summarizer = Summarizer(self.settings)
        self.provider = self.settings.model_provider

        if self.provider == "openai":
            if OpenAI is None:
                raise RuntimeError("openai package required for chat when MODEL_PROVIDER=openai")
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
        else:
            self._client = None

    async def chat(self, query: str, top_k: int = 4) -> Dict[str, object]:
        matches = await self.embedding_manager.search(query, top_k=top_k)
        context_sections = []
        references: List[Dict[str, object]] = []

        for match in matches:
            document = match.get("document", "")
            if document:
                context_sections.append(document)
            metadata = match.get("metadata", {}) or {}
            references.append(
                {
                    "file_id": match.get("file_id"),
                    "score": match.get("score"),
                    "metadata": metadata,
                }
            )

        context = "\n---\n".join(context_sections)
        if not context:
            return {
                "answer": "I could not find any relevant files for that question.",
                "references": [],
            }

        if self.provider == "openai" and self._client is not None:
            answer = await asyncio.to_thread(self._answer_openai, query, context)
        else:
            answer = await self.summarizer.summarize(f"Question: {query}\n\nContext:\n{context}")
            if not answer:
                answer = "Here is what I found:\n" + context[:500]

        return {"answer": answer, "references": references}

    def _answer_openai(self, query: str, context: str) -> str:
        assert self._client is not None
        prompt = (
            "You are an assistant that answers questions about the user's personal documents. "
            "Using the context provided, answer the question concisely (2-3 sentences).\n\n"
            f"Context:\n{context}\n\nQuestion: {query}\nAnswer:"
        )
        if self.settings.openai_use_responses:
            response = self._client.responses.create(  # type: ignore[attr-defined]
                model=self.settings.openai_model,
                input=prompt,
            )
            return response.output[0].content[0].text.strip() if response.output else ""  # type: ignore[attr-defined]

        response = self._client.chat.completions.create(  # type: ignore[attr-defined]
            model=self.settings.openai_model,
            messages=[
                {
                    "role": "system",
                    "content": "Answer the user's question using the provided context. If the context is insufficient, say so.",
                },
                {"role": "user", "content": prompt},
            ],
        )
        return response.choices[0].message.content.strip() if response.choices else ""  # type: ignore[attr-defined]
