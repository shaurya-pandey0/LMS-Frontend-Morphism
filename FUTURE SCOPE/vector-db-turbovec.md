# Design & Implementation: Local Vector Store for LifeTrack AI Service

> [!NOTE]
> **Implementation Status: Active with NumPy Fallback**
> The vector storage and retrieval architecture described here is implemented under `ai-service/app/vector/` (`store.py`, `index.py`, `retrieval.py`).
> In production on GCP, the service actively runs the robust `NumpyFallbackIndex` (exact cosine similarity) for semantic search over user journal entries (`/vectors/upsert`, `/vectors/search`). TurboVec (4-bit quantizer) remains an optional accelerated backend.

## 1. Goal

Add an optional, fully-local retrieval layer to the AI microservice so that
chat and insights can be grounded in a user's journal history **without**
re-reading and looping over all raw text on every request, and **without** any
cloud dependency.

Two ideas combine:

1. **Local embeddings** via the Nomic model already hosted on LM Studio
   (`nomic-embed-text`), reached through the OpenAI-compatible
   `POST /v1/embeddings` endpoint we already point at.
2. **TurboVec** — a packaged implementation of Google's TurboQuant algorithm —
   to compress each embedding to ~4 bits and keep a fast in-RAM index per user.

Result: privacy (data never leaves the machine), low memory/disk footprint
(4-bit vectors), and fast top-k retrieval instead of full-table scans.

> Implementation caveat: confirm the `turbovec` package exists and its API
> before coding. The design below isolates it behind a small interface
> (`VectorIndex`) so we can swap in a fallback (e.g. brute-force NumPy cosine or
> FAISS) if the package is unavailable, without touching the rest of the service.

## 2. Two retrieval modes (user-selectable)

The user (or the calling backend) chooses per request, defaulting from config:

| Mode | What happens | Trade-off |
| --- | --- | --- |
| `full` (current behaviour) | The caller sends the full aggregated `context`; we forward it to the LLM as today. | Simplest, no embeddings, larger prompts / more tokens. |
| `local_vector` | We embed the query locally, retrieve the top-k most relevant journal snippets from the user's RAM index, and build a **smaller processed context**. | Saves API credits/tokens, private, fast; needs the local index populated. |

This satisfies "keep vectorization and direct full-data sending optional."

## 3. Per-user, per-system stores

```
ai-service/
  data/
    users/                     # all users who have logged in on this system
      <user_key>/              # one folder per user (e.g. hashed user id/email)
        meta.json              # user id, created_at, embedding model, dim, count
        index.tvec             # TurboVec persisted 4-bit index (or fallback file)
        payloads.jsonl         # id -> {date, mood, text snippet} (validated)
```

- `user_key` is a filesystem-safe hash of the authenticated user id (never the
  raw email) to avoid leaking PII in paths.
- **New login on a system → new store.** On first request for a `user_key`
  whose folder doesn't exist, the `UserStoreManager` creates it and an empty
  index. Existing users load their persisted index into RAM on first use.
- An in-process LRU cache keeps a bounded number of user indexes resident in
  RAM; least-recently-used indexes are flushed to disk and evicted.

## 4. Components

```
app/
  embeddings.py        # NomicEmbeddingClient -> POST {base}/embeddings
  vector/
    index.py           # VectorIndex interface + TurboVecIndex + NumpyFallbackIndex
    store.py           # UserStoreManager: create/load/persist per-user stores
    retrieval.py       # embed query -> search -> build compact context
```

### 4.1 Embeddings (`embeddings.py`)
- `async embed(texts: list[str]) -> list[list[float]]`
- Calls the OpenAI-compatible embeddings endpoint with model
  `EMBEDDING_MODEL` (default `nomic-embed-text`).
- Reuses the existing base URL / API key from `Settings`.
- Validates the response shape with Pydantic before returning vectors.

### 4.2 Index (`vector/index.py`)
- `VectorIndex` interface: `add(ids, vectors, payloads)`, `search(vector, k)`,
  `save(path)`, `load(path)`, `__len__`.
- `TurboVecIndex`: wraps TurboVec — quantizes float vectors to 4-bit on `add`,
  performs approximate nearest-neighbour search on `search`, persists/loads the
  compressed index.
- `NumpyFallbackIndex`: stores float32 vectors, cosine similarity brute force.
  Used automatically if TurboVec import fails (logged at startup).

### 4.3 Store manager (`vector/store.py`)
- `get_or_create(user_key) -> UserStore`
- `UserStore.upsert(records)` — embed (if needed) + add to index + append
  payloads + persist.
- `UserStore.search(query_vector, k)` — returns payloads for top-k ids.
- Thread/async-safe per-user lock so concurrent journaling/chat don't corrupt
  the index.

## 5. Data flow

### On journaling (ingest)
```
journal text --> NomicEmbeddingClient.embed() --> 4-bit quantize (TurboVec)
            --> UserStore.upsert(id, vector, {date, mood, snippet})
            --> persist index + payload
```
The Spring backend calls a new `POST /vectors/upsert` when a journal entry is
created/updated (or the frontend can call it directly).

### On chat / insights (retrieve), when mode = `local_vector`
```
query --> embed --> UserStore.search(top_k) --> compact context (snippets)
      --> prompt (smaller) --> LLM --> Pydantic-validated reply
```
When mode = `full`, this step is skipped and the supplied `context` is used as
today.

## 6. New / changed API

```
POST /vectors/upsert       # {user_key, records:[{id,date,mood,text}]}  -> {count}
POST /vectors/search       # {user_key, query, k}                       -> {hits:[...]}
DELETE /vectors/{user_key} # drop a user's local store
```

`/chat` and `/insights` gain an optional field:

```jsonc
{
  "user_key": "…",            // required when context_mode = local_vector
  "context_mode": "full" | "local_vector",   // default from AI_RETRIEVAL_MODE
  "query": "…",
  "context": { … }            // still used in 'full' mode
}
```

All request/response bodies remain **strict Pydantic models**, and the LLM
output stays validated against `AiChatReply` / `AiInsightList` with rule-based
fallback — unchanged by this feature.

## 7. Config additions (`.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `AI_RETRIEVAL_MODE` | `full` | Default mode: `full` or `local_vector` |
| `EMBEDDING_MODEL` | `nomic-embed-text` | Local embedding model on LM Studio |
| `VECTOR_DATA_DIR` | `./data/users` | Root of per-user stores |
| `VECTOR_TOP_K` | `5` | Snippets retrieved per query |
| `VECTOR_CACHE_USERS` | `16` | Max user indexes kept resident in RAM |
| `VECTOR_BACKEND` | `auto` | `auto` / `turbovec` / `numpy` |

## 8. Privacy & security

- Embeddings and the index never leave the machine; no cloud calls.
- User folders are keyed by a salted hash of the user id, not raw PII.
- `payloads.jsonl` stores short snippets, not necessarily full entries
  (configurable max snippet length).
- Per-user isolation: a request for one `user_key` can never read another's
  index.
- `data/users/` is git-ignored.

## 9. Open questions / next steps

1. Verify the `turbovec` package (name, API, license, embedding dim handling).
   If unavailable, ship `NumpyFallbackIndex` first and add TurboVec behind the
   same interface later.
2. Decide who owns ingestion triggers (Spring on journal CRUD vs. a frontend
   call) and how `user_key` is derived consistently on both sides.
3. Confirm `nomic-embed-text` is loaded in LM Studio and its vector dimension.
4. Backfill: a one-time endpoint to index a user's existing journal history.
```
