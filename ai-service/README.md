# LifeTrack AI Service

A standalone FastAPI microservice that adds AI features to LifeTrack, kept
completely separate from the Spring Boot backend. It provides LLM-powered
**insights**, a grounded **chat assistant**, and **natural-language extraction**
of expenses and daily logs — each with a deterministic rule-based fallback, so it
never hard-fails.

It is **provider-agnostic**: it talks to any OpenAI-compatible
`/v1/chat/completions` API. Switch between LM Studio, OpenAI, Mistral and
Gemini by changing a few environment variables — no code changes.

---

## Where it fits

This service holds no database and no user identity. Spring owns both, and every
number in a prompt is computed by Spring before this service sees it.

```
browser (React)
   │  1. GET /api/ai-context        → Spring, with the user's JWT
   │     returns the aggregated trailing-window numbers
   │
   │  2. rename camelCase → snake_case in the browser
   │
   ├─ 3a. POST :8100/insights       → this service → LLM → validated insights
   ├─ 3b. POST :8100/chat           → this service → LLM → validated reply
   └─ 3c. POST :8100/command        → this service → LLM → draft payload(s)
             │
             └─ 4. user confirms a draft
                   POST /api/expenses or /api/daily-logs/merge → Spring writes it
```

Two properties worth stating plainly, because both are easy to assume otherwise:

- **Spring never calls this service.** It has no `RestTemplate` or `WebClient`
  pointing here. The browser orchestrates both calls. The seam is inbound only:
  Spring exposes `/api/ai-context`, this service consumes what the browser
  relays.
- **This service never writes to the database.** `/command` returns *drafts*.
  The user confirms, and the write goes through the normal validated Spring
  endpoint with its own ownership rules.

If this service is down, the app degrades: Spring keeps serving its own built-in
rule-based insights at `/api/insights`, and the AI panel reports the outage.

---

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Service + active provider/model |
| GET | `/models` | List models available on the configured provider |
| POST | `/insights` | LLM insights from aggregated lifestyle data (rule fallback) |
| POST | `/chat` | Grounded assistant reply (`full` or `local_vector` mode) |
| POST | `/command` | Natural language → expense / daily-log draft payloads |
| POST | `/vectors/upsert` | Embed + index a user's journal entries |
| POST | `/vectors/search` | Semantic search over a user's index |
| DELETE | `/vectors/{user_key}` | Drop a user's vector store |

Interactive docs at `http://localhost:8100/docs` once running.

Every response carries a `source` field telling you which path produced it —
check this first when output looks off:

| Endpoint | `source` values |
| --- | --- |
| `/insights` | `ai` (validated model output) / `rules` (deterministic fallback) |
| `/chat` | `ai` / `fallback` (top rule insights stitched into a sentence) |
| `/command` | no `source`; `status` is `success` / `clarification_needed` / `error` |

---

## Strict JSON contract (Pydantic)

Every boundary is validated:

1. **Inbound requests** — FastAPI validates against the request models.
   `InsightsRequest`, `ChatRequest`, `CommandRequest` and the vector requests all
   set `extra="forbid"`, so an unknown top-level field is a `422`, not a silent
   ignore.
2. **Raw LLM output** — requested as JSON and validated against a schema before
   anything uses it:

   | Endpoint | Model must return |
   | --- | --- |
   | `/insights` | `AiInsightList` |
   | `/chat` | `AiChatReply` |
   | `/command` (expense) | `ExtractedExpenseList` |
   | `/command` (daily log) | `ExtractedDailyLogPayload` |

   Anything that fails validation raises `LlmError` and the endpoint falls back
   to deterministic rules. Model text never reaches the caller unvalidated.
3. **Outbound responses** — typed Pydantic response models.

To maximise compliance the client negotiates the provider's structured-output
mode automatically: `json_schema` → `json_object` → prompt-only, caching
whichever the provider accepts for the life of the process. A provider that
answers `400` to one mode is retried with the next.

Two details that bite when extending the schemas:

- **`json_schema` mode strips length and range constraints.** `_grammar_safe_schema`
  removes `maxLength`, `minimum`, `maxItems` and friends before sending, because
  llama.cpp turns them into GBNF repetition counts and rejects large ones —
  silently disabling structured output. The constraints still apply: Pydantic
  enforces them on the way back in.
- **Validation is per-response, not per-item.** One bad entry fails the whole
  object. `ExtractedExpensePayload.amount` therefore has no `gt=0` constraint;
  a model emitting `amount: 0` for one expense would otherwise discard the valid
  expenses alongside it. The `/command` handler filters non-positive amounts
  instead, losing only the bad entry.

---

## `/command` — natural language to structured drafts

Turns "bruh i ate 500 and sent 344 to the house owner" into reviewable drafts.
Used by the Journal page's AI Assistant when the mode pill is set to
**+ Expense** or **+ Daily Log**.

### Request

```jsonc
{
  "target": "expense",          // chat | expense | daily_log
  "text": "ate 500 and sent 344 to the house owner",
  "date": "2026-08-02",         // the USER's local calendar date, not the server's
  "history": [],                // recent turns, for two-step clarification
  "model": null                 // optional per-request override
}
```

`date` is supplied by the caller on purpose: the browser knows the user's local
day, this container may be in a different timezone.

### Response

```jsonc
{
  "target": "expense",
  "status": "success",          // success | clarification_needed | error
  "payload":  { "date": "2026-08-02", "category": "Food",    "amount": 500.0 },
  "payloads": [
    { "date": "2026-08-02", "category": "Food",    "amount": 500.0 },
    { "date": "2026-08-02", "category": "Housing", "amount": 344.0 }
  ],
  "message": "I found 2 expenses in that message: ..."
}
```

**`payloads` is the real answer; `payload` is its first element**, kept so older
callers keep working. Always prefer `payloads`.

### One message, several expenses

A sentence commonly describes more than one spend, so expense extraction is
**list-shaped** (`ExtractedExpenseList`). This matters historically: it used to be
a single object, which forced the model to keep one expense and silently discard
the rest.

Rules the handler applies to each extracted item independently:

- Amounts must be `> 0`; anything else is dropped, that entry only.
- Categories are matched case-insensitively against `EXPENSE_CATEGORIES`.
  Unrecognised values are mapped to the fallback bucket (`Misc`) and logged,
  rather than passed on for Spring to reject with a `400`.
- Dates default to the request's `date`; each expense may carry its own.
- Identical `(date, category, amount)` triples are de-duplicated, in case the
  model repeats itself.
- `daily_log` always produces exactly **one** draft, because a daily log is
  merged per date rather than appended.

### Category inference is by definition, not keyword

The prompt gives the model a short description of what each category *means*
("Housing — the cost of having somewhere to live: rent or money paid to a
landlord, house owner or society, utility bills, maintenance…") and asks it to
reason about what the money was for. There is deliberately **no synonym table**
for the model path, so phrasings nobody anticipated still land correctly. Adding
one would be a maintenance treadmill.

Keep `EXPENSE_CATEGORIES` aligned with Spring's `app.reference.expense-categories`.
Spring is the source of truth and will reject anything outside its list.

### Two-step clarification

If no amount is found anywhere, the response is `clarification_needed` and the
browser shows the message instead of a draft. Sending an amount on the next turn
recovers it from `history` — but only when a single expense is on the table,
otherwise one amount would be stamped onto every draft.

### Rule fallback

With no model configured, or after an `LlmError`, `_rule_extract_expenses` runs.
It splits the text on `and`, `,`, `;`, `also`, `plus`, `then`, finds an amount per
clause, and maps a category from a small keyword table. It keeps the *cardinality*
correct — you still get two drafts — but its category guesses are much weaker
than the model's. `Misc` where you expected something specific is the usual sign
the fallback ran; confirm in the log:

```
WARNING lifetrack.ai: Expense extraction LLM call failed, using rule fallback: ...
```

---

## Local vector DB (optional)

Two retrieval strategies, selectable per `/chat` request (default from
`AI_RETRIEVAL_MODE`):

| `context_mode` | Behaviour | Trade-off |
| --- | --- | --- |
| `full` | Caller sends the full `context`; forwarded to the LLM. | Simple; larger prompts / more tokens. |
| `local_vector` | Embed the query, retrieve top-k journal snippets from the user's index, build a smaller context. | Fewer tokens, faster. Needs `user_key` + an indexed store. |

If `context_mode=local_vector` arrives without a `user_key`, the service logs it
and falls back to the supplied context rather than failing.

### Where the embedding actually happens

> **The embedding call goes to whatever `AI_PROVIDER` is configured**, over HTTP
> to `POST /v1/embeddings`. It is only on-device when that provider is LM Studio
> (or another locally-hosted server). With `AI_PROVIDER=openai`, **journal text is
> sent to OpenAI** to be embedded. Choose deliberately — this is the one place
> raw journal text leaves the machine.

With LM Studio and `text-embedding-nomic` it stays local.
[`turbovec`](https://pypi.org/project/turbovec/) (Google TurboQuant) then
compresses each vector to 4-bit and keeps a fast in-RAM index, so retrieval does
not re-read every raw record. If `turbovec` has no wheel for your platform the
service auto-falls back to a NumPy cosine index — same API, same results, more
memory. Nothing to configure; `VECTOR_BACKEND=auto` handles it.

### Per-user stores

Each `user_key` gets its own folder under `VECTOR_DATA_DIR`:
`data/users/<sha256(salt:user_key)>/`, holding the index, payload snippets and
metadata. New keys create a fresh store; returning ones are loaded into RAM
(LRU-cached, `VECTOR_CACHE_USERS`). Stores are fully isolated. The key is hashed
with `USER_KEY_SALT` so raw ids never appear in paths, and `data/` is git-ignored.

> Changing `USER_KEY_SALT` changes every folder name, orphaning existing stores.
> Set it once, per environment.

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

The React app does not call the vector endpoints today; they exist for the
retrieval experiment and are driven manually.

---

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

Every variable below is read case-insensitively from the environment first, then
`.env`. Environment wins, which is how the containers override the file.

### LLM / provider

| Variable | Default | Notes |
| --- | --- | --- |
| `AI_PROVIDER` | `lmstudio` | Provider preset |
| `AI_BASE_URL` | (per provider) | Override the endpoint |
| `AI_API_KEY` | – | Bearer key (LM Studio may not need one) |
| `AI_MODEL` | – | Default model; overridable per request. **Empty disables every LLM path** and forces the rule fallbacks |
| `AI_JSON_MODE` | `auto` | `auto` / `json_schema` / `json_object` / `none` |
| `AI_TEMPERATURE` | `0.4` | Model wording varies run to run at this setting |
| `AI_TIMEOUT_SECONDS` | `60` | Per provider call |
| `AI_MAX_TOKENS` | `800` | |

### Domain vocabulary

| Variable | Default | Notes |
| --- | --- | --- |
| `EXPENSE_CATEGORIES` | `Food,Housing,Travel,Wellness,Misc` | Comma-separated. Used to build the `/command` prompt and to reject values Spring would refuse. **Keep aligned with `app.reference.expense-categories` on the backend.** The last entry is the "unclear" bucket |

### Local vector DB

| Variable | Default | Notes |
| --- | --- | --- |
| `AI_RETRIEVAL_MODE` | `full` | Default mode for `/chat`: `full` or `local_vector` |
| `EMBEDDING_MODEL` | `text-embedding-nomic` | Embedding model id **on the configured provider**. Use `text-embedding-3-small` with OpenAI |
| `VECTOR_DATA_DIR` | `./data/users` | Root of per-user stores. Mount this if you want persistence |
| `VECTOR_TOP_K` | `5` | Snippets retrieved per query |
| `VECTOR_CACHE_USERS` | `16` | Max user indexes resident in RAM (LRU) |
| `VECTOR_BIT_WIDTH` | `4` | TurboQuant compression width |
| `VECTOR_BACKEND` | `auto` | `auto` / `turbovec` / `numpy` |
| `USER_KEY_SALT` | `lifetrack-local` | **Change in production**; salts the on-disk folder hash. Changing it orphans existing stores |
| `MAX_SNIPPET_CHARS` | `500` | Max characters stored per indexed entry |

### HTTP

| Variable | Default | Notes |
| --- | --- | --- |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Comma-separated. Needed because the browser calls this service directly. Irrelevant if you put it behind a same-origin reverse proxy |

---

## Run

### Locally

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # then edit
uvicorn app.main:app --host 127.0.0.1 --port 8100 --reload
```

Or use `./run.ps1`, which does the same with `--reload`.

`turbovec` is the only dependency that may fail to install; the service works
without it (NumPy fallback). Nothing else needs downloading at build time — there
is no local model in this repo, embeddings are an HTTP call.

### With Docker

`Dockerfile` builds a non-root `python:3.12-slim` image and retries the pip
install without `turbovec` if no wheel exists. Two env vars only apply to the
container entrypoint:

| Variable | Default | Notes |
| --- | --- | --- |
| `AI_PORT` | `8100` | Port uvicorn binds |
| `AI_WORKERS` | `2` | uvicorn worker processes. These calls are I/O-bound |

Note that with more than one worker, the cached structured-output mode and the
LRU vector cache are **per worker**, so the first request to each worker
re-negotiates and re-loads.

See [`../DEPLOYMENT.md`](../DEPLOYMENT.md) for the single-VM stack and
[`../DEPLOYMENT-SPLIT.md`](../DEPLOYMENT-SPLIT.md) for running this service on its
own VM behind a shared-secret gate.

---

## Tests

```powershell
.\.venv\Scripts\Activate.ps1
python -m unittest discover -s tests
```

Run it from the `ai-service` directory. Do not add `-t .` — `tests/` is not a
package, so unittest refuses it with "Start directory is not importable".

`tests/test_command.py` covers the `/command` contract through a FastAPI
`TestClient`: chat mode, single and multi-expense extraction, the unclear-category
bucket, clarification when no amount is present, tolerance of a bad entry beside
good ones, daily-log extraction, and the `payload`/`payloads` relationship.

**The suite is offline and free by design.** `setUp` blanks the resolved model
(`patch.object(main.settings, "ai_model", "")`), so the handler skips the provider
and exercises the deterministic rule path. Without that, every run would bill the
configured API key — nine tests made eight live chat-completion calls before this
was added — and the assertions would depend on model wording.

Do not "fix" a test by removing that patch. The rule path shares all of the
handler's normalisation, so the endpoint contract is still covered; only the
model's own inference is out of scope. Verify that separately against a live
provider when you change a prompt or schema.

---

## Debugging

**Check what the service thinks it is talking to.** `GET /health` returns the
active provider, base URL and default model. `GET /models` proves the credentials
work and lists valid model ids.

**Inspect the exact outbound request.** Immediately before every provider call,
`_dump_prompt()` overwrites `ai-service/prompt.md` with the serialised request
body — messages, temperature, `response_format`, the whole thing. Despite the
`.md` extension it is JSON.

> `prompt.md` can contain the user's name and aggregated lifestyle data, so it is
> git-ignored. It is a debugging aid, not application state. It is written only
> when a call actually happens — not when `use_ai` is false, no model is
> configured, or request validation failed first. A stale `prompt.json` from
> earlier versions may also exist; nothing writes it any more.

**`source: "rules"` or `"fallback"` when you expected `"ai"`** — in order: is
`AI_MODEL` set; is the provider reachable; does the model id exist; did the
provider reject every structured-output mode; did the output fail schema
validation. The log line names which.

**`422` on a request** — a field name is camelCase instead of snake_case, or an
unknown top-level key is present (`extra="forbid"`), or a number is out of range.

---

## Security boundary

> **This service has no authentication.** `/insights`, `/chat`, `/command` and all
> `/vectors/*` endpoints accept any caller. The vector endpoints trust a
> client-supplied `user_key`, so anyone who can reach the port can read or write
> another user's store by guessing a key, and spend your LLM credits.

That is acceptable for local development, where it is bound to `127.0.0.1`. It is
not acceptable on a public host. Before real users, either:

- verify the Spring JWT inside this service and derive `user_key` from the token
  rather than the request body; or
- move the handoff server-side so only Spring talks to this service, and the
  browser never does.

The deployment guides mitigate rather than fix this: nginx rate-limits `/ai/*`,
and the split topology puts this service on a VM with no public ingress behind a
shared-secret gate. Both stop strangers; neither authenticates the *end user*.

---

## Known limitations

- **No end-user authentication** (above). The biggest one.
- **Aggregates, not paired observations.** The context carries averages, totals
  and counts, which grounds summaries but cannot support claims like "your sleep
  predicts next-day productivity". Those need dated pairs and a backend-computed
  sample size. The prompt tells the model not to invent relationships; it cannot
  be relied on to never try.
- **`min_steps` reaches the prompt as a schema default.** The Dashboard does not
  forward the user's real step target, and because `min_steps` defaults to
  `10000` rather than `None`, `exclude_none` keeps it. The model is grounded on a
  number the user never set.
- **The camelCase → snake_case mapping lives in the browser, twice** — as
  `toAiContext()` in `JournalPage.jsx` and inline in `DashboardPage.jsx`. The two
  forward different subsets of the same Spring context, so chat and insights are
  not grounded identically.
- **`avg_steps` and `today_steps` are step *targets*,** derived from
  `DailyLog.stepTarget`. The app records no measured step counts.
- **Rule fallbacks are keyword-based** and much weaker than the model at
  categorisation. They preserve structure and cardinality, not nuance.
- **Multi-worker deployments** re-negotiate the structured-output mode and rebuild
  the vector LRU per worker.
