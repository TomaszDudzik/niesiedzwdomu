"""
Central configuration.
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

    # OpenAI (used for image generation only)
    openai_api_key: str = os.environ.get("OPENAI_API_KEY", "")

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
