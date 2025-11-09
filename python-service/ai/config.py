import json
import os
from functools import lru_cache
from typing import Dict, Literal, Optional

from dotenv import load_dotenv

load_dotenv()

ModelProvider = Literal["openai", "local"]


class AISettings:
    """Centralised configuration for AI-related components."""

    def __init__(self) -> None:
        self.model_provider: ModelProvider = (os.getenv("MODEL_PROVIDER") or "openai").lower()  # type: ignore[assignment]
        self.openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
        self.openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.openai_embedding_model: str = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
        self.openai_base_url: Optional[str] = os.getenv("OPENAI_BASE_URL")
        self.openai_organization: Optional[str] = os.getenv("OPENAI_ORG") or os.getenv("OPENAI_ORGANIZATION")
        self.openai_project: Optional[str] = os.getenv("OPENAI_PROJECT")
        self.openai_default_headers: Optional[Dict[str, str]] = self._load_headers(os.getenv("OPENAI_DEFAULT_HEADERS"))
        self.openai_use_responses: bool = self._resolve_use_responses()
        self.local_summarization_model: str = os.getenv(
            "LOCAL_SUMMARIZATION_MODEL",
            "sshleifer/distilbart-cnn-12-6",
        )
        self.local_embedding_model: str = os.getenv(
            "LOCAL_EMBEDDING_MODEL",
            "sentence-transformers/all-MiniLM-L6-v2",
        )
        self.vector_db_path: str = os.getenv("VECTOR_DB_PATH", "./data/vectors")
        self.summary_max_tokens: int = int(os.getenv("SUMMARY_MAX_TOKENS", "256"))
        self.summary_min_length: int = int(os.getenv("SUMMARY_MIN_LENGTH", "40"))
        self.summary_max_length: int = int(os.getenv("SUMMARY_MAX_LENGTH", "120"))
        self.default_tag_count: int = int(os.getenv("TAG_COUNT", "5"))
        self.chunk_size: int = int(os.getenv("AI_CHUNK_SIZE", "500"))
        self.chunk_overlap: int = int(os.getenv("AI_CHUNK_OVERLAP", "50"))

        if self.model_provider == "openai" and not self.openai_api_key:
            raise RuntimeError("MODEL_PROVIDER is set to 'openai' but OPENAI_API_KEY is missing")

    def _resolve_use_responses(self) -> bool:
        """
        Determine whether to call the Responses API (default for official OpenAI)
        or fall back to legacy chat completions (required for providers like OpenRouter).
        """

        raw = os.getenv("OPENAI_USE_RESPONSES")
        if raw is not None:
            return raw.lower() not in {"0", "false", "no"}

        if self.openai_base_url and "openrouter" in self.openai_base_url.lower():
            return False
        return True

    def _load_headers(self, raw_headers: Optional[str]) -> Optional[Dict[str, str]]:
        if not raw_headers:
            return None

        try:
            parsed = json.loads(raw_headers)
            if isinstance(parsed, dict):
                return {str(k): str(v) for k, v in parsed.items()}
        except json.JSONDecodeError:
            pass

        headers: Dict[str, str] = {}
        for segment in raw_headers.split(";"):
            if ":" not in segment:
                continue
            key, value = segment.split(":", 1)
            headers[key.strip()] = value.strip()

        return headers or None


@lru_cache(maxsize=1)
def get_settings() -> AISettings:
    return AISettings()
