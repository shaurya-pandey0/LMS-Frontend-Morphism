"""Retrieval: turn a query + a user's vector store into a compact context.

This is the 'local_vector' alternative to sending the full context. We embed
the query with the local Nomic model, fetch the top-k most relevant journal
snippets from the user's index, and fold them into a (smaller) LifestyleContext
that grounds the LLM — no looping over all raw records.
"""

from __future__ import annotations

import logging
from typing import List, Optional

from ..embeddings import EmbeddingClient
from ..schemas import LifestyleContext, VectorHit
from .store import UserStoreManager

logger = logging.getLogger("lifetrack.ai.retrieval")


async def retrieve_context(
    *,
    store_manager: UserStoreManager,
    embeddings: EmbeddingClient,
    user_key: str,
    query: str,
    k: int,
    base_context: Optional[LifestyleContext],
    model: Optional[str] = None,
) -> tuple[LifestyleContext, List[VectorHit]]:
    """Build a compact context from the user's vector store.

    Numeric fields from ``base_context`` (sleep, spend, etc.) are preserved if
    supplied; the journal excerpts are replaced with the retrieved snippets.
    """
    _, store = await store_manager.get_or_create(user_key)
    query_vec = await embeddings.embed_one(query, model=model)
    hits = store.search(query_vec, k)

    excerpts = [h.snippet for h in hits if h.snippet]

    if base_context is not None:
        ctx = base_context.model_copy(update={"journal_excerpts": excerpts})
    else:
        ctx = LifestyleContext(journal_excerpts=excerpts)

    return ctx, hits
