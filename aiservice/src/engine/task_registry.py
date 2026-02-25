"""Task Registry — auto-discovers all task types from the task_types package.

Drop a new .py file into task_types/ → it's automatically available in workflows.
No registration needed, no code changes elsewhere.
"""

from __future__ import annotations

import importlib
import pkgutil
from typing import Any

import structlog

from src.engine.task_types.base_task import BaseTask

logger = structlog.get_logger()

# Registry: task_type string → task class
_REGISTRY: dict[str, type[BaseTask]] = {}
_discovered = False


def _discover() -> None:
    """Scan task_types package, register every BaseTask subclass."""
    global _discovered
    if _discovered:
        return

    import src.engine.task_types as pkg

    for _importer, modname, _ispkg in pkgutil.iter_modules(pkg.__path__):
        if modname.startswith("_") or modname == "base_task":
            continue
        module = importlib.import_module(f"src.engine.task_types.{modname}")
        for attr_name in dir(module):
            obj = getattr(module, attr_name)
            if (
                isinstance(obj, type)
                and issubclass(obj, BaseTask)
                and obj is not BaseTask
                and obj.task_type
            ):
                _REGISTRY[obj.task_type] = obj
                logger.debug("task_registry.registered", task_type=obj.task_type)

    _discovered = True
    logger.info("task_registry.discovery_complete", count=len(_REGISTRY))


def get_task_class(task_type: str) -> type[BaseTask]:
    """Look up a task class by its task_type string."""
    _discover()
    cls = _REGISTRY.get(task_type)
    if cls is None:
        raise ValueError(
            f"Unknown task_type '{task_type}'. "
            f"Available: {list(_REGISTRY.keys())}"
        )
    return cls


def create_task(task_type: str, config: dict[str, Any], **deps: Any) -> BaseTask:
    """Instantiate a task from its type string + config."""
    cls = get_task_class(task_type)
    return cls(config=config, **deps)


def list_task_types() -> list[str]:
    """Return all registered task type names."""
    _discover()
    return list(_REGISTRY.keys())
