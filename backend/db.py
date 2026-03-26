"""
Database access layer using supabase-py.
"""

from __future__ import annotations

from supabase import create_client, Client

from backend.config import config


def get_client() -> Client:
    """Return a Supabase client with service role (full access)."""
    return create_client(config.supabase_url, config.supabase_service_key)
