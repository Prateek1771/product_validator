from pathlib import Path

from dotenv import load_dotenv
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")  # exports LANGSMITH_* etc. for libraries that read os.environ


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(ROOT / ".env", ROOT / "backend" / ".env"), extra="ignore")

    openai_api_key: str = ""
    openai_llm_model: str = "gpt-4o-mini"      # platform "fast" model (plan + extract + LLM decisions)
    openai_strong_model: str = "gpt-4.1"       # platform "strong" model (final brief)
    anthropic_api_key: str | None = None       # optional platform keys; users can bring their own
    google_api_key: str | None = None
    secrets_key: str | None = None             # Fernet key that encrypts user-supplied API keys
    openrouter_api_key: str = ""  # platform key: Jev decisions (and OpenRouter models only when a user picks them)
    jev_model: str = "typesafe/jev-1.13"
    context_dev_api_key: str = ""
    tavily_api_key: str | None = Field(None, validation_alias=AliasChoices("TAVILY_API_KEY", "TAVILY_SEARCH_API_KEY"))
    firecrawl_api_key: str | None = None
    insforge_base_url: str
    insforge_api_key: str
    langsmith_tracing: bool = False  # LANGSMITH_TRACING/API_KEY/PROJECT enable LangGraph tracing
    cors_origins: str = "http://localhost:3000,http://localhost:4317"
    max_iterations: int = 2        # extra research loops Jev may request
    scrapes_per_task: int = 2      # Context.dev credits: 1 per search + 1 per scrape


settings = Settings()
