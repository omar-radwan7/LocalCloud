"""Embedding helpers and vector-store management."""

from __future__ import annotations

import asyncio
from typing import Dict, List, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

from ai.config import AISettings, get_settings

try:
    from openai import OpenAI  # type: ignore
except ImportError:  # pragma: no cover
    OpenAI = None  # type: ignore

try:
    from sentence_transformers import SentenceTransformer  # type: ignore
except ImportError:  # pragma: no cover
    SentenceTransformer = None  # type: ignore


class EmbeddingManager:
    def __init__(self, settings: AISettings | None = None) -> None:
        self.settings = settings or get_settings()
        self.provider = self.settings.model_provider

        self._openai_client = None
        self._local_model = None

        if self.provider == "openai":
            if OpenAI is None:
                raise RuntimeError("openai package required for remote embeddings")
            client_kwargs = {}
            if self.settings.openai_base_url:
                client_kwargs["base_url"] = self.settings.openai_base_url
            if self.settings.openai_default_headers:
                client_kwargs["default_headers"] = self.settings.openai_default_headers
            if self.settings.openai_organization:
                client_kwargs["organization"] = self.settings.openai_organization
            if self.settings.openai_project:
                client_kwargs["project"] = self.settings.openai_project
            self._openai_client = OpenAI(api_key=self.settings.openai_api_key, **client_kwargs)
        else:
            if SentenceTransformer is None:
                raise RuntimeError("sentence-transformers package required for local embeddings")
            self._local_model = SentenceTransformer(self.settings.local_embedding_model)

        self._client = chromadb.PersistentClient(
            path=self.settings.vector_db_path,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self._collection = self._client.get_or_create_collection(
            name="files",
            metadata={"hnsw:space": "cosine"},
        )

    async def embed_text(self, text: str) -> List[float]:
        if not text.strip():
            return []

        if self.provider == "openai":
            return await asyncio.to_thread(self._embed_openai, text)
        return await asyncio.to_thread(self._embed_local, text)

    def _embed_openai(self, text: str) -> List[float]:
        assert self._openai_client is not None
        response = self._openai_client.embeddings.create(
            input=text,
            model=self.settings.openai_embedding_model,
        )
        return list(response.data[0].embedding)  # type: ignore[attr-defined]

    def _embed_local(self, text: str) -> List[float]:
        assert self._local_model is not None
        embedding = self._local_model.encode(text, normalize_embeddings=True)
        return embedding.tolist()

    async def upsert_document(
        self,
        file_id: str,
        text: str,
        metadata: Optional[Dict[str, str]] = None,
        embedding: Optional[List[float]] = None,
    ) -> List[float]:
        embedding = embedding or await self.embed_text(text)
        if not embedding:
            return []

        self._collection.upsert(
            ids=[file_id],
            embeddings=[embedding],
            metadatas=[metadata or {}],
            documents=[text],
        )
        return embedding

    def delete_document(self, file_id: str) -> None:
        try:
            self._collection.delete(ids=[file_id])
        except Exception:
            pass

    async def search(self, query: str, top_k: int = 5) -> List[Dict[str, object]]:
        query_embedding = await self.embed_text(query)
        if not query_embedding:
            return []

        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
        )

        matches: List[Dict[str, object]] = []
        ids = results.get("ids", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        documents = results.get("documents", [[]])[0]

        for idx, file_id in enumerate(ids):
            matches.append(
                {
                    "file_id": file_id,
                    "score": 1 - distances[idx] if idx < len(distances) else None,
                    "metadata": metadatas[idx] if idx < len(metadatas) else {},
                    "document": documents[idx] if idx < len(documents) else "",
                }
            )
        return matches
