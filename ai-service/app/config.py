from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    ai_service_token: str = ""
    ai_provider_api_key: str = ""
    ai_provider_base_url: str = "https://api.openai.com/v1"
    ai_provider_model: str = "gpt-4o-mini"
    ai_provider_timeout_seconds: float = 20.0

settings = Settings()
