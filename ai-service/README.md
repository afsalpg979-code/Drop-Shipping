# FALCONS STORE Python AI service

FastAPI microservice for the storefront assistant and future recommendation/analytics workers.

## Run locally
```bash
cd ai-service
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Configuration
Set these in the service environment (never in the browser):
- `AI_SERVICE_TOKEN`: shared secret used by the Node API.
- `AI_PROVIDER_API_KEY`: optional API key for an OpenAI-compatible chat-completions provider.
- `AI_PROVIDER_BASE_URL`: provider API base URL; defaults to the OpenAI API.
- `AI_PROVIDER_MODEL`: model name; defaults to `gpt-4o-mini`.

Without a provider key, the service uses deterministic fallback responses. This makes local development possible without paid AI credentials. The service deliberately has no direct Supabase or payment credentials. Order-specific assistance must be added through authenticated Node API tools with customer ownership checks.

## Endpoints
- `GET /health`
- `POST /v1/chat` (Node-to-Python; shared-token protected when configured)

Do not expose port 8000 publicly. Put it on a private network behind the Node API.
