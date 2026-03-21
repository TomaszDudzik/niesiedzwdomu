"""
Source adapter registry.
Maps source IDs (from scrape_sources table) to adapter classes.
"""

from __future__ import annotations

from backend.sources.base import BaseSourceAdapter
from backend.sources.example_adapter import ExampleAdapter

# Register adapters here as you add new sources.
# Key = value of scrape_sources.scrape_config->>'adapter_class'
ADAPTER_MAP: dict[str, type[BaseSourceAdapter]] = {
    "example": ExampleAdapter,
    # "krakow_dla_dzieci": KrakowDlaDzieciAdapter,
    # "dzieckowkrakowie": DzieckoWKrakowieAdapter,
}


def get_adapter(source: dict) -> BaseSourceAdapter:
    """Instantiate the right adapter for a source row."""
    adapter_key = source.get("scrape_config", {}).get("adapter_class", "example")
    adapter_cls = ADAPTER_MAP.get(adapter_key)

    if adapter_cls is None:
        raise ValueError(f"No adapter registered for '{adapter_key}'. "
                         f"Available: {list(ADAPTER_MAP.keys())}")

    return adapter_cls(source.get("scrape_config", {}))
