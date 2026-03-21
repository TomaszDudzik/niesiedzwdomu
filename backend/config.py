"""
Central configuration for the scraping pipeline.
Reads from environment variables with sensible defaults.
Loads .env file from project root automatically.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root (two levels up from backend/config.py)
_project_root = Path(__file__).resolve().parent.parent
load_dotenv(_project_root / ".env")


@dataclass(frozen=True)
class Config:
    # Supabase
    supabase_url: str = os.environ.get("SUPABASE_URL", "")
    supabase_service_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    database_url: str = os.environ.get("DATABASE_URL", "")

    # OpenAI
    openai_api_key: str = os.environ.get("OPENAI_API_KEY", "")
    openai_model: str = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    openai_model_fallback: str = os.environ.get("OPENAI_MODEL_FALLBACK", "gpt-4o")
    max_input_tokens: int = 4000

    # Scoring thresholds
    auto_publish_threshold: float = 0.85
    review_threshold: float = 0.50
    # Below review_threshold → rejected

    # Source trust: sources with fewer than this many approved events
    # always go through review regardless of score
    new_source_trust_min: int = 10

    # Fetch settings
    fetch_timeout: int = 30
    max_retries: int = 1
    user_agents: list[str] = field(default_factory=lambda: [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
    ])

    # Allowed enum values (must match existing Supabase schema)
    allowed_categories: list[str] = field(default_factory=lambda: [
        "warsztaty", "spektakl", "muzyka", "sport",
        "natura", "edukacja", "festyn", "kino", "wystawa", "inne",
    ])

    krakow_districts: list[str] = field(default_factory=lambda: [
        "Stare Miasto", "Kazimierz", "Podgórze", "Nowa Huta",
        "Krowodrza", "Bronowice", "Zwierzyniec", "Dębniki",
        "Prądnik Czerwony", "Prądnik Biały", "Czyżyny", "Bieżanów", "Inne",
    ])


config = Config()
