"""Application settings loaded from environment variables."""

from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration — reads .env file automatically."""

    # --- Service ---
    environment: str = "development"
    ai_service_port: int = 8100
    grpc_port: int = 50051
    log_level: str = "DEBUG"

    # --- LLM API Keys (global, referenced by model_providers via env_var_name) ---
    openai_api_key: str = ""
    google_api_key: str = ""

    # --- Qdrant ---
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_api_key: str = ""

    # --- Redis ---
    redis_uri: str = "redis://localhost:6380"
    redis_password: str = "redis123"
    redis_db: int = 1

    # --- Admin DB ---
    admin_db_path: str = "./data/admin.db"

    # --- Encryption ---
    encryption_key: str = ""

    # --- Embedding ---
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536

    # --- Default gRPC target for backend ---
    default_grpc_target: str = "localhost:50052"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @property
    def admin_db_url(self) -> str:
        path = Path(self.admin_db_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite+aiosqlite:///{path}"

    @property
    def is_dev(self) -> bool:
        return self.environment == "development"


# Singleton
_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
