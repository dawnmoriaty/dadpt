"""Async SQLAlchemy engine & session for admin SQLite database."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.config import get_settings

_engine = None
_session_factory = None


def get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(
            settings.admin_db_url,
            echo=settings.is_dev,
            pool_pre_ping=True,
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _session_factory


async def get_session() -> AsyncSession:
    """FastAPI dependency — yields an async session."""
    factory = get_session_factory()
    async with factory() as session:
        yield session


async def init_db():
    """Create all tables on startup."""
    from src.db.models import Base  # noqa: F811

    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _ensure_model_instance_columns(conn)


async def _ensure_model_instance_columns(conn) -> None:
    """Lightweight schema evolution for SQLite without migrations.

    Phase 2 introduces tuning knobs on model_instances. Existing DBs need
    columns added safely at startup.
    """
    result = await conn.exec_driver_sql("PRAGMA table_info(model_instances)")
    rows = result.fetchall()
    existing_columns = {str(row[1]) for row in rows}

    if "frequency_penalty" not in existing_columns:
        await conn.exec_driver_sql(
            "ALTER TABLE model_instances ADD COLUMN frequency_penalty FLOAT DEFAULT 0.0"
        )

    if "presence_penalty" not in existing_columns:
        await conn.exec_driver_sql(
            "ALTER TABLE model_instances ADD COLUMN presence_penalty FLOAT DEFAULT 0.0"
        )


async def close_db():
    """Cleanup on shutdown."""
    global _engine, _session_factory
    if _engine:
        await _engine.dispose()
        _engine = None
        _session_factory = None
