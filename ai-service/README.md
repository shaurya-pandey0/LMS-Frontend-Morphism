# LifeTrack AI Service

A standalone FastAPI microservice that adds AI features to LifeTrack, kept
completely separate from the Spring Boot backend. It provides LLM-powered
**insights** and a grounded **chat assistant**, with a deterministic
rule-based fallback so it never hard-fails.

It is **provider-agnostic**: it talks to any OpenAI-compatible
`/v1/chat/completions` API. Switch between LM Studio, OpenAI, Mistral and
Gemini by changing a few environment variables — no code changes.

## Strict JSON contract (Pydantic)

Every boundary is validated by Pydantic:

1. **Inbound requests** are validated by FastAPI against the request models.
2. **Raw LLM output** is requested as JSON and validated against a Pydantic
   schema (`AiInsightList` / `AiChatReply`). If the model returns anything that
   doesn't validate, the service falls back to deterministic rules — so what it
   returns is *always* a validated object.
3. **Outbound responses** use typed Pydantic response models.

To maximise compliance the client negotiates the provider's structured-output
mode automatically: `json_schema` → `json_object` → prompt-only, caching
whichever the provider accepts.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Service + active provider/model |
| GET | `/models` | List models available on the configured provider |
| POST | `/insights` | LLM insights from aggregated lifestyle data (rule fallback) |
| POST | `/chat` | Grounded assistant reply (`full` or `local_vector` mode) |
| POST | `/vectors/upsert` | Embed + index a user's journal entries (local) |
| POST | `/vectors/search` | Semantic search over a user's local index |
| DELETE | `/vectors/{user_key}` | Drop a user's local vector store |

Interactive docs at `http://localhost:8100/docs` once running.

## Local vector DB (optional)

Two retrieval strategies, selectable per `/chat` request (default from
`AI_RETRIEVAL_MODE`):

| `context_mode` | Behaviour | Trade-off |
| --- | --- | --- |
| `full` | Caller sends full `context`; forwarded to the LLM (current behaviour). | Simple; larger prompts / more tokens. |
| `local_vector` | Embed the query with the local Nomic model, retrieve top-k journal snippets from the user's RAM index, build a smaller context. | Saves tokens/credits, private, fast. Needs `user_key` + an indexed store. |

**How it works:** journal text is embedded locally via `text-embedding-nomic`
on LM Studio (no cloud), then [`turbovec`](https://pypi.org/project/turbovec/)
(Google TurboQuant) compresses each vector to 4-bit and keeps a fast in-RAM
index. Retrieval avoids re-reading all raw records per request. If `turbovec`
isn't installable on your platform, the service auto-falls back to a NumPy
cosine index — same API.

**Per-user, per-system stores:** each `user_key` gets its own folder under
`VECTOR_DATA_DIR` (`data/users/<sha256(salt:user_key)>/`) holding the index,
payload snippets, and metadata. A new login creates a fresh store; returning
users load theirs into RAM (LRU-cached). Stores are fully isolated. `user_key`
is hashed (with `USER_KEY_SALT`) so raw ids never appear in paths, and
`data/` is git-ignored.

```bash
# Index a user's journal entries (call on journal create/update)
curl -X POST http://localhost:8100/vectors/upsert -H "Content-Type: application/json" -d '{
  "user_key": "alex@example.com",
  "records": [{"id": "j1", "date": "2026-06-25", "mood": "calm", "text": "Slept well, went for a run."}]
}'

# Semantic search
curl -X POST http://localhost:8100/vectors/search -H "Content-Type: application/json" -d '{
  "user_key": "alex@example.com", "query": "when did I sleep well?", "k": 5
}'

# Chat using local retrieval instead of full context
curl -X POST http://localhost:8100/chat -H "Content-Type: application/json" -d '{
  "query": "what helps me feel rested?", "context_mode": "local_vector", "user_key": "alex@example.com"
}'
```

## Configuration

Copy `.env.example` to `.env` and set values. Provider base-URL defaults:

| `AI_PROVIDER` | Default `AI_BASE_URL` |
| --- | --- |
| `lmstudio` | `http://localhost:1234/v1` |
| `openai` | `https://api.openai.com/v1` |
| `mistral` | `https://api.mistral.ai/v1` |
| `gemini` | `https://generativelanguage.googleapis.com/v1beta/openai` |

Swapping providers is just: set `AI_PROVIDER`, `AI_API_KEY`, optionally
`AI_BASE_URL` and `AI_MODEL`. Call `GET /models` to discover model names, then
pass `"model"` per request or set `AI_MODEL` as the default.

### LLM / provider

| Variable | Default | Notes |
| --- | --- | --- |
| `AI_PROVIDER` | `lmstudio` | Provider preset |
| `AI_BASE_URL` | (per provider) | Override the endpoint |
| `AI_API_KEY` | – | Bearer key (LM Studio may not need one) |
| `AI_MODEL` | – | Default model; overridable per request |
| `AI_JSON_MODE` | `auto` | `auto` / `json_schema` / `json_object` / `none` |
| `AI_TEMPERATURE` | `0.4` | |
| `AI_TIMEOUT_SECONDS` | `60` | |
| `AI_MAX_TOKENS` | `800` | |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | |

### Local vector DB

| Variable | Default | Notes |
| --- | --- | --- |
| `AI_RETRIEVAL_MODE` | `full` | Default mode for `/chat`: `full` or `local_vector` |
| `EMBEDDING_MODEL` | `text-embedding-nomic` | Embedding model id on the provider |
| `VECTOR_DATA_DIR` | `./data/users` | Root of per-user stores |
| `VECTOR_TOP_K` | `5` | Snippets retrieved per query |
| `VECTOR_CACHE_USERS` | `16` | Max user indexes resident in RAM (LRU) |
| `VECTOR_BIT_WIDTH` | `4` | TurboQuant compression width |
| `VECTOR_BACKEND` | `auto` | `auto` / `turbovec` / `numpy` |
| `USER_KEY_SALT` | `lifetrack-local` | **Change in production**; salts the on-disk user folder hash |
| `MAX_SNIPPET_CHARS` | `500` | Max characters stored per indexed entry |

## Run

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # then edit
uvicorn app.main:app --host 127.0.0.1 --port 8100
```

Or use `./run.ps1`.

## Example calls

```bash
# Insights
curl -X POST http://localhost:8100/insights \
  -H "Content-Type: application/json" \
  -d '{
        "user_name": "Priya",
        "context": {
          "period_days": 7, "avg_sleep_hours": 5.2,
          "weekly_spend": 1565.0, "spend_threshold": 1000.0,
          "avg_water_ml": 1450.0, "habit_consistency": 0.28,
          "mood_counts": {"tired": 4, "anxious": 2, "calm": 1}
        }
      }'

# Chat
curl -X POST http://localhost:8100/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "How was my sleep this week?",
       "context": {"avg_sleep_hours": 5.2, "mood_counts": {"tired": 4}}}'
```

## How the Spring backend integrates

The Spring backend aggregates a user's trailing-window data (the same numbers
it already computes for `/api/analytics` and `/api/insights`), maps them to the
`context` object, and POSTs to `/insights` or `/chat`. The frontend's Journal
"AI Assistant" calls `/chat`; the Insights views can call `/insights`. If this
service is down, the Spring side keeps serving its own built-in rule-based
insights, so the app degrades gracefully.
