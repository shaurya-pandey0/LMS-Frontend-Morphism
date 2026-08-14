These frameworks, scripts, and interview-ready stories are grounded directly in your **LifeTrack**, **AI Assessment Recommendation Engine**, and **Hardware-Constrained Local LLM Optimization** projects.

---

## 1. Strategic Delegation: Framework & Story

### The Engineering Framework: Blast-Radius vs. Verification-Overhead Matrix

When asked how you decide between delegating a task to an AI tool versus implementing it manually, use this framework:

$$\text{Delegation Viability} = \frac{\text{Time}_{\text{Manual Implementation}}}{\text{Time}_{\text{Prompting}} + \text{Time}_{\text{Verification}} + \text{Risk}(\text{Blast Radius})}$$

```text
               High ▲
                    │   [DELEGATE WITH GUARDRAILS]     │      [STRICTLY MANUAL]
                    │   - CRUD Scaffolding             │   - Core Security & Auth Filters
                    │   - Unit Test Suites             │   - Concurrency & Thread Pools
  Blast Radius /    │   - DTO & Schema Mappings        │   - Low-Level Hardware/Memory Opt
  Failure Impact    │   - API Documentation            │   - DB Constraint Transitions
                    ├──────────────────────────────────┼───────────────────────────────
                    │   [FULL DELEGATION]              │   [SELECTIVE PROTOTYPING]
                    │   - Regex Generation             │   - Algorithmic Spikes
                    │   - Synthetic Test Fixtures      │   - CSS / UI Layout Tweaks
                    │   - Shell Scripts                │   - Fast PoC Validation
               Low  ▼──────────────────────────────────┴───────────────────────────────►
                    Low                              High
                                Verification Overhead

```

---

### The Interview Script: Intentional Manual Implementation

> **Interviewer Question:** *"Can you share an instance where you deliberately chose NOT to use AI to write code, and why?"*

#### How to Say It in an Interview

> "In my local LLM optimization project, I was working to run a 4B parameter model on a 4GB Pascal GTX 1050 GPU, which initially rendered unusable throughput under 2 tokens per second.
> I deliberately chose **not** to delegate the GPU memory budgeting, quantization layout selection, and KV-cache reuse logic to AI assistants.
> Here is why: Pascal architecture lacks native Tensor Cores. When I tested prompt generation on CUDA offloading parameters, LLMs repeatedly suggested standard FP16 tensor-offloading patterns or generic vLLM memory configurations that either triggered immediate CUDA Out-Of-Memory exceptions or corrupted context windows on a 4GB card.
> The **verification overhead** of debugging AI-generated runtime flags across low-level `llama.cpp` C++ bindings was significantly higher than profiling the hardware constraints myself. I manually calculated the exact parameter split—selecting Q4_0/Q4_1 low-bit GGUF quantization, structuring speculative decoding with a 0.6B draft model, and anchoring the static prompt prefix at the memory start to guarantee KV-cache reuse without recomputation.
> That manual architectural control brought throughput up to 15.6 tokens per second. I treat AI as an accelerator for boilerplate and high-verification domains, but for zero-tolerance hardware limits, security boundaries, and concurrency lifecycles, I write and profile the core implementation manually."

---

## 2. Discernment: 4-Pillar Checklist & Hallucination STAR Story

### The 4-Pillar AI Code Review Checklist

Before any AI-generated code is accepted, run it through this four-boundary gate:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                     4-PILLAR AI CODE REVIEW GATE                       │
├──────────────────────────┬─────────────────────────────────────────────┤
│ 1. API & Contract        │ - Verify methods/signatures exist in the    │
│    Verification          │   exact pinned framework version.           │
│                          │ - Check for deprecated or phantom methods.  │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 2. Boundary & State      │ - Check edge cases: nulls, zero division,   │
│    Conditions            │   empty sets, float precision drift.        │
│                          │ - Verify deterministic handling of errors.  │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 3. Security & Scope      │ - Ensure no reliance on client-side IDs.    │
│    Sanitization          │ - Enforce backend owner-scoped validation.  │
│                          │ - Prevent injection & unvalidated writes.   │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 4. Resource & Lifecycle  │ - Check connection pools, heap allocations. │
│    Management            │ - Prevent heavy dependencies/memory leaks.  │
│                          │ - Verify thread safety (e.g., Maps, pools). │
└──────────────────────────┴─────────────────────────────────────────────┘

```

---

### The Interview Script: Catching an LLM Hallucination (STAR)

> **Interviewer Question:** *"Tell me about a time an AI assistant hallucinated an API or introduced a subtle bug, and how you caught it."*

#### How to Say It in an Interview

> **Situation:**
> "While building the FastAPI hybrid recommendation engine for SHL assessments, I needed to implement vector similarity scoring between incoming candidate queries and our 389-item catalog embeddings matrix."
> **Task:**
> "The pipeline required generating 768-dimensional embeddings using `nomic-embed-text-v1.5` and computing cosine similarity against pre-computed catalog embeddings under strict sub-300ms latency constraints on a lean GCP Cloud Run instance."
> **Action:**
> "I used an LLM to quickly scaffold the similarity endpoint. When reviewing the generated code against my **API Contract and Resource Lifecycle** checklist, I caught two critical issues:
> 1. **Library Hallucination:** The model hallucinated a nonexistent batch-dimension parameter `matryoshka_dim=768` directly on the `llama_cpp` embedding call, which would fail silently at runtime.
> 2. **Heavy Dependency Creep:** To compute vector normalization, the LLM imported PyTorch (`torch.nn.functional.normalize`). Introducing PyTorch would inflate the Docker container footprint by over 2GB, destroying our target of running on a lightweight 1GB RAM Cloud Run instance.
> 
> 
> I rejected the snippet. Instead, I implemented the math using pure, pre-computed $L_2$-normalized NumPy matrices (`np.dot(_embeddings, query_vec)`), executing in under 1 millisecond on CPU without PyTorch."
> **Result:**
> "The total container image stayed under 500MB, cold starts dropped to near zero, and inference stayed sub-millisecond. As a permanent guardrail, I added strict version-pinned dependency validation and static analysis checks to catch unapproved heavy runtime imports."

---

## 3. Diligence: Enterprise Transparency & Production Escalation

### Standardized PR Template for AI-Assisted Work

```markdown
### Summary of Changes
- Added `/command` extraction for reviewable Expense and Daily Log drafts.
- Kept persistence behind the existing JWT-protected Spring endpoints.

### AI Assistance Disclosure
- **Tooling Used:** [Record the exact assistant and version used.]
- **Scope of Assistance:** [State which schemas, prompts, tests, or UI code the assistant helped draft.]
- **Engineer-Owned Decisions:** Spring DTOs and reference values remain the source of truth; FastAPI has no MySQL write path; every command result requires review before persistence.

### 4-Pillar Verification Checklist
- [x] **API Contract:** Matched the Pydantic payloads to `ExpenseRequest` and `DailyLogRequest`; expense drafts contain only `date`, `category`, and `amount`.
- [x] **Boundary Tests:** Ran `ai-service/tests/test_command.py` for chat mode, single/multiple expenses, bad-entry tolerance, unclear categories, clarification, and Daily Log extraction.
- [x] **Security Guard:** Verified `/command` returns drafts only. Confirmed writes use Spring's JWT-protected endpoints, where ownership comes from `SecurityUtils.currentUserId()` rather than a client-supplied `userId`.
- [x] **Fallback Check:** Verified missing or invalid model output falls back to deterministic extraction, while insufficient data returns `clarification_needed` instead of invented values.
- [x] **Frontend Check:** Ran the documented frontend lint and production build.

### Known Limitations
- FastAPI does not yet verify the end user's JWT; React currently orchestrates the Spring-to-FastAPI handoff.
- There are no Spring JUnit tests yet, so do not claim complete cross-owner or backend regression coverage.

```

### Git Commit Tagging Standard

* `[Manual-Core]`: 100% manually engineered security, concurrency, or core logic.
* `[AI-Scaffold]`: AI-generated boilerplate, DTOs, or mock data fixtures.
* `[AI-Assisted-Refactor]`: Manual logic refactored with AI-assisted linting/formatting.

---

### The Interview Script: Production Accountability & Risk Escalation

> **Interviewer Question:** *"If an AI-generated piece of code passes tests but causes a production incident or security leak, who is responsible, and how do you handle escalation?"*

#### How to Say It in an Interview

> "The engineer who commits the code owns 100% of its production behavior. AI is a productivity tool, not a scapegoat.
>
> In *LifeTrack*, I reduced that risk architecturally. FastAPI never writes to MySQL: it returns a Pydantic-validated draft, React shows it for review, and only **Confirm & Save** calls the normal JWT-protected Spring endpoint. Spring resolves the owner from `SecurityUtils.currentUserId()`, validates the DTO and domain rules again, and then writes through JPA. If the provider is unavailable, returns invalid JSON, or fails schema validation, FastAPI catches `LlmError` and uses deterministic rules instead. Missing required data becomes `clarification_needed`, not a guessed record.
>
> For containment, I can stop the optional AI service or force the Insights path to rules with `use_ai: false`; manual forms and Spring's deterministic `/api/insights` remain usable. I would then redeploy the last known-good revision, add a regression test for the exact failure, and only restore the AI path after verification.
>
> I would also state the current limitation honestly: FastAPI does not yet verify the end user's JWT and React currently relays Spring's context. Before a public deployment, I would move orchestration into Spring or verify the forwarded JWT in FastAPI."
> 

---

## 4. Description: 3-Stage Prompt Evolution Case Study

### Case Study: LifeTrack Natural-Language Expense Commands

#### Stage 1: Start From the Existing Domain Contract

Instead of asking an assistant to invent an end-to-end feature, first inspect the contracts that already control persistence:

- Spring `ExpenseRequest` accepts `date`, `category`, and a positive `amount`.
- The configured category vocabulary is `Food`, `Housing`, `Travel`, `Wellness`, and `Misc`.
- Ownership never appears in the payload; Spring derives it from the authenticated JWT.
- A user explicitly selects **+ Expense**, so no model is trusted to classify the command's intent.

The first design decision is therefore to generate a draft matching the existing Spring contract—not a new database model or a direct FastAPI-to-MySQL path.

---

#### Stage 2: Separate Extraction From Persistence

Split the workflow into two trust boundaries:

1. **FastAPI extraction:** Convert natural language into an `ExtractedExpenseList`, validate it with Pydantic, coerce it into the allowed vocabulary, and return `CommandResponse` drafts.
2. **Spring persistence:** After the user confirms, call `POST /api/expenses` with the JWT. Spring independently validates the DTO and category, attaches the authenticated owner, and persists through JPA.

This also supports one message containing several expenses. `payloads` contains every draft, while `payload` remains as a backward-compatible alias for the first item.

---

#### Stage 3: Use a Schema-Grounded Extraction Prompt

A project-aligned prompt is constrained to the raw model contract:

```text
You are an expense extraction engine. Extract only facts explicitly supported by the user's text.

Input Text: "{user_command}"
Default Date: "{iso_date}"

Return raw JSON matching exactly:
{
  "expenses": [
    {
      "date": "YYYY-MM-DD",
      "category": "Food | Housing | Travel | Wellness | Misc",
      "amount": number
    }
  ]
}

Rules:
1. Return one item per distinct expense; do not collapse multiple expenses.
2. Do not invent amounts, dates, or unsupported fields.
3. Use only the allowed category vocabulary.
4. Return JSON only—no markdown or explanatory text.
```

`status` and clarification messages are deliberately not part of the model's `ExtractedExpenseList`. The `/command` handler owns that workflow:

```text
valid structured model output
    -> normalize, filter, and deduplicate drafts

missing model / provider failure / invalid JSON / schema failure
    -> LlmError
    -> deterministic `_rule_extract_expenses` fallback

no usable amount after extraction and history lookup
    -> status: clarification_needed
    -> no draft and no database write

usable drafts
    -> status: success
    -> React review card
    -> Confirm & Save
    -> JWT-protected Spring write
```

### Interview Result

> "I improved the prompt by grounding it in the contracts that already existed instead of asking AI to design the whole feature. Spring's DTO and category vocabulary defined the schema, FastAPI was limited to validated draft extraction, and the handler—not the model—owned fallback and clarification. Provider or parsing failures degrade to deterministic regex rules, and the user must confirm before the normal owner-scoped Spring endpoint can write to MySQL. That kept probabilistic extraction outside the persistence boundary."

### Verification and Honest Limits

- FastAPI command tests cover single and multiple expenses, clarification, unclear-category handling, bad-entry tolerance, Daily Log extraction, and response compatibility.
- The documented frontend lint and production build passed for the feature.
- FastAPI is still not end-user authenticated, and Spring currently has no JUnit suite; those remain explicit follow-up items rather than hidden claims.