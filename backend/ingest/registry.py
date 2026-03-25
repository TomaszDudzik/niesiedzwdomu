"""Adapter registry — decoupled from CLI to avoid circular imports."""

from __future__ import annotations

_ADAPTERS: dict[str, type] = {}


def register_adapter(name: str, cls: type) -> None:
    _ADAPTERS[name] = cls


def get_adapter(name: str) -> type | None:
    return _ADAPTERS.get(name)


def list_adapters() -> list[str]:
    return sorted(_ADAPTERS)


def load_adapters() -> None:
    """Import adapter modules so they register themselves."""
    try:
        from backend.ingest.adapters import biletyna  # noqa: F401
    except Exception:
        pass
    try:
        from backend.ingest.adapters import ck_podgorza  # noqa: F401
    except Exception:
        pass
