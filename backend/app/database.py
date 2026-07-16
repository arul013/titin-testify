"""
Learning Nexus CBT — Supabase Database Client
"""

# pyrefly: ignore [missing-import]
from supabase import create_client, Client
from app.config import get_settings


def get_supabase_client() -> Client:
    """Get Supabase client using anon key (respects RLS)."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_key)


def get_supabase_admin() -> Client:
    """Get Supabase admin client using service role key (bypasses RLS).
    
    Use this only for admin operations like creating users.
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)
