"""Per-user, per-system vector stores.

Every user who logs in on this machine gets their own folder under
``VECTOR_DATA_DIR`` (default ``data/users``):

    data/users/<user_key_hash>/
        meta.json        # dim, backend, model, counters, ext-id -> int-id map
        index.tvim|.npz  # the vector index (TurboVec or NumPy)
        payloads.jsonl   # int-id -> {ext_id, date, mood, snippet}

A new login (a ``user_key`` not seen before) creates a fresh store; returning
users have their index loaded into RAM. An LRU cache bounds how many indexes
stay resident. Stores are isolated: one user's request can never read another's.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import shutil
from collections import OrderedDict
from typing import Dict, List, Optional, Tuple

from ..config import Settings
from ..schemas import JournalRecord, VectorHit
from . import index as vindex

logger = logging.getLogger("lifetrack.ai.store")


def hash_user_key(user_key: str, salt: str) -> str:
    digest = hashlib.sha256(f"{salt}:{user_key}".encode("utf-8")).hexdigest()
    return digest[:32]


class UserStore:
    """One user's index + payloads, persisted under a folder."""

    def __init__(self, folder: str, settings: Settings):
        self.folder = folder
        self._settings = settings
        self.backend: str = ""
        self.dim: int = 0
        self.model: Optional[str] = None
        self.next_id: int = 1
        self.ext_to_int: Dict[str, int] = {}
        self.payloads: Dict[int, dict] = {}
        self._index = None
        self.lock = asyncio.Lock()

    # -- paths ---------------------------------------------------------------
    @property
    def _meta_path(self) -> str:
        return os.path.join(self.folder, "meta.json")

    @property
    def _payload_path(self) -> str:
        return os.path.join(self.folder, "payloads.jsonl")

    def _index_path(self) -> str:
        return os.path.join(self.folder, vindex.index_filename(self.backend))

    # -- lifecycle -----------------------------------------------------------
    def load(self) -> None:
        with open(self._meta_path, "r", encoding="utf-8") as fh:
            meta = json.load(fh)
        self.backend = meta["backend"]
        self.dim = int(meta["dim"])
        self.model = meta.get("model")
        self.next_id = int(meta.get("next_id", 1))
        self.ext_to_int = {k: int(v) for k, v in meta.get("ext_to_int", {}).items()}

        self.payloads = {}
        if os.path.exists(self._payload_path):
            with open(self._payload_path, "r", encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    rec = json.loads(line)
                    self.payloads[int(rec["int_id"])] = rec

        if self.dim and os.path.exists(self._index_path()):
            self._index = vindex.load_index(
                self._index_path(), dim=self.dim, backend=self.backend,
                bit_width=self._settings.vector_bit_width,
            )

    def _ensure_index(self, dim: int) -> None:
        if self._index is None:
            self.backend = vindex.resolve_backend(self._settings.vector_backend)
            self.dim = dim
            self._index = vindex.new_index(
                dim=dim, backend=self.backend, bit_width=self._settings.vector_bit_width,
            )

    def _persist(self) -> None:
        os.makedirs(self.folder, exist_ok=True)
        if self._index is not None:
            self._index.save(self._index_path())
        with open(self._payload_path, "w", encoding="utf-8") as fh:
            for rec in self.payloads.values():
                fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
        meta = {
            "backend": self.backend,
            "dim": self.dim,
            "model": self.model,
            "next_id": self.next_id,
            "ext_to_int": self.ext_to_int,
            "count": len(self.payloads),
        }
        with open(self._meta_path, "w", encoding="utf-8") as fh:
            json.dump(meta, fh, ensure_ascii=False, indent=2)

    # -- operations ----------------------------------------------------------
    def upsert(self, records: List[JournalRecord], vectors: List[List[float]], model: str) -> int:
        if not records:
            return 0
        self._ensure_index(dim=len(vectors[0]))
        self.model = model

        new_ids: List[int] = []
        new_vecs: List[List[float]] = []
        for rec, vec in zip(records, vectors):
            # Update-in-place: drop the old vector for this external id.
            if rec.id in self.ext_to_int:
                old_int = self.ext_to_int[rec.id]
                self._index.remove(old_int)
                self.payloads.pop(old_int, None)
            int_id = self.next_id
            self.next_id += 1
            self.ext_to_int[rec.id] = int_id
            snippet = rec.text[: self._settings.max_snippet_chars]
            self.payloads[int_id] = {
                "int_id": int_id,
                "ext_id": rec.id,
                "date": rec.date,
                "mood": rec.mood,
                "snippet": snippet,
            }
            new_ids.append(int_id)
            new_vecs.append(vec)

        self._index.add(new_ids, new_vecs)
        self._persist()
        return len(new_ids)

    def search(self, query_vector: List[float], k: int) -> List[VectorHit]:
        if self._index is None or len(self._index) == 0:
            return []
        results = self._index.search(query_vector, k)
        hits: List[VectorHit] = []
        for int_id, score in results:
            payload = self.payloads.get(int_id)
            if not payload:
                continue
            hits.append(VectorHit(
                id=payload.get("ext_id", str(int_id)),
                score=score,
                date=payload.get("date"),
                mood=payload.get("mood"),
                snippet=payload.get("snippet", ""),
            ))
        return hits

    @property
    def count(self) -> int:
        return len(self.payloads)


class UserStoreManager:
    """Creates/loads per-user stores and keeps an LRU of resident indexes."""

    def __init__(self, settings: Settings):
        self._settings = settings
        self._root = os.path.abspath(settings.vector_data_dir)
        self._cache: "OrderedDict[str, UserStore]" = OrderedDict()
        self._capacity = max(1, settings.vector_cache_users)
        self._mgr_lock = asyncio.Lock()
        os.makedirs(self._root, exist_ok=True)

    def _folder(self, key_hash: str) -> str:
        return os.path.join(self._root, key_hash)

    async def get_or_create(self, user_key: str) -> Tuple[str, UserStore]:
        key_hash = hash_user_key(user_key, self._settings.user_key_salt)
        async with self._mgr_lock:
            if key_hash in self._cache:
                self._cache.move_to_end(key_hash)
                return key_hash, self._cache[key_hash]

            store = UserStore(self._folder(key_hash), self._settings)
            if os.path.exists(store._meta_path):
                store.load()  # returning user on this system
            else:
                os.makedirs(store.folder, exist_ok=True)  # new login -> new store
                logger.info("Created new vector store for user %s", key_hash)

            self._cache[key_hash] = store
            self._cache.move_to_end(key_hash)
            while len(self._cache) > self._capacity:
                evicted_hash, _ = self._cache.popitem(last=False)
                logger.info("Evicted vector store %s from RAM cache", evicted_hash)
            return key_hash, store

    async def delete(self, user_key: str) -> Tuple[str, bool]:
        key_hash = hash_user_key(user_key, self._settings.user_key_salt)
        async with self._mgr_lock:
            self._cache.pop(key_hash, None)
            folder = self._folder(key_hash)
            if os.path.isdir(folder):
                shutil.rmtree(folder, ignore_errors=True)
                return key_hash, True
            return key_hash, False
