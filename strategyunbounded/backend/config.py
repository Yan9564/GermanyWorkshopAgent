from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    AZURE_OPENAI_API_KEY: str
    AZURE_OPENAI_ENDPOINT: str
    AZURE_OPENAI_API_VERSION: str = "2024-10-01-preview"
    AZURE_OPENAI_CHAT_DEPLOYMENT: str = "gpt-4o-mini"
    AZURE_OPENAI_TTS_DEPLOYMENT: str = "tts-1"
    AZURE_OPENAI_WHISPER_DEPLOYMENT: str = "whisper-1"
    AZURE_OPENAI_TTS_VOICE: str = "onyx"

    DATABASE_URL: str

    ADMIN_PIN: str
    SESSION_SECRET: str

    DEFAULT_SYSTEM_PROMPT: str = (
        "You are Benjamin, an expert AI strategy consultant facilitating a business innovation "
        "workshop. Your role is to help organisations discover practical, commercially viable AI "
        "use cases that address their real operational challenges. Prioritise ideas that are "
        "implementable within 12 months by a mid-sized organisation. Be specific to the industry "
        "and problem context described. All monetary estimates must use euros (€)."
    )

    ALLOWED_ORIGINS: str = "http://localhost:3000"


settings = Settings()
