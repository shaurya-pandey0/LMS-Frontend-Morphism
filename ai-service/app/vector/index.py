"""Vector index abstraction.

A tiny interface with two implementations:

* ``TurboVecIndex`` — wraps ``turbovec.IdMapIndex`` (Google TurboQuant), which
  quantises vectors to 4 bits and keeps a fast in-RAM index. Stable uint64 ids
  survive deletes; supports ``write``/``load``.
* ``NumpyIndex`` — float32 cosine-similarity fallback used automatically when
  ``turbovec`` cannot be imported (e.g. no wheel for the platform).

Both speak the same interface so the rest of the service is backend-agnostic.
"""

from __future__ import annotations

import logging
from typing import List, Optional, Tuple

import numpy as np

logger = logging.getLogger("lifetrack.ai.vector")

# Result is a list of (id, score), best first.
SearchResult = List[Tuple[int, float]]


def _to_2d_f32(vectors) -> np.ndarray:
    arr = np.asarray(vectors, dtype=np.float32)
    if arr.ndim == 1:
        arr = arr.reshape(1, -1)
    return np.ascontiguousarray(arr)


class TurboVecIndex:
    backend = "turbovec"

    def __init__(self, dim: int, bit_width: int = 4, _raw=None):
        from turbovec import IdMapIndex  # imported lazily

        self.dim = dim
        self.bit_width = bit_width
        self._idx = _raw if _raw is not None else IdMapIndex(dim=dim, bit_width=bit_width)
        self._dirty = True

    def add(self, ids: List[int], vectors) -> None:
        vecs = _to_2d_f32(vectors)
        id_arr = np.asarray(ids, dtype=np.uint64)
        self._idx.add_with_ids(vecs, id_arr)
        self._dirty = True

    def remove(self, id_: int) -> None:
        if self._idx.contains(int(id_)):
            self._idx.remove(int(id_))
            self._dirty = True

    def contains(self, id_: int) -> bool:
        return bool(self._idx.contains(int(id_)))

    def search(self, vector, k: int) -> SearchResult:
        if len(self) == 0:
            return []
        if self._dirty:
            self._idx.prepare()
            self._dirty = False
        scores, ids = self._idx.search(_to_2d_f32(vector), min(k, len(self)))
        return [(int(i), float(s)) for i, s in zip(ids[0], scores[0])]

    def save(self, path: str) -> None:
        if self._dirty:
            self._idx.prepare()
            self._dirty = False
        self._idx.write(path)

    @classmethod
    def load(cls, path: str, dim: int, bit_width: int = 4) -> "TurboVecIndex":
        from turbovec import IdMapIndex

        raw = IdMapIndex.load(path)
        obj = cls(dim=dim, bit_width=bit_width, _raw=raw)
        obj._dirty = False
        return obj

    def __len__(self) -> int:
        return len(self._idx)


class NumpyIndex:
    backend = "numpy"
    EXT = ".npz"

    def __init__(self, dim: int, bit_width: int = 4):
        self.dim = dim
        self.bit_width = bit_width  # unused; kept for interface parity
        self._ids: List[int] = []
        self._mat: Optional[np.ndarray] = None  # (n, dim) L2-normalised

    @staticmethod
    def _normalise(vecs: np.ndarray) -> np.ndarray:
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return vecs / norms

    def add(self, ids: List[int], vectors) -> None:
        vecs = self._normalise(_to_2d_f32(vectors))
        self._mat = vecs if self._mat is None else np.vstack([self._mat, vecs])
        self._ids.extend(int(i) for i in ids)

    def remove(self, id_: int) -> None:
        if id_ not in self._ids or self._mat is None:
            return
        pos = self._ids.index(int(id_))
        self._mat = np.delete(self._mat, pos, axis=0)
        self._ids.pop(pos)

    def contains(self, id_: int) -> bool:
        return int(id_) in self._ids

    def search(self, vector, k: int) -> SearchResult:
        if self._mat is None or not self._ids:
            return []
        q = self._normalise(_to_2d_f32(vector))[0]
        sims = self._mat @ q
        top = np.argsort(-sims)[: min(k, len(self._ids))]
        return [(self._ids[i], float(sims[i])) for i in top]

    def save(self, path: str) -> None:
        mat = self._mat if self._mat is not None else np.zeros((0, self.dim), dtype=np.float32)
        np.savez(path, ids=np.asarray(self._ids, dtype=np.uint64), mat=mat, dim=self.dim)

    @classmethod
    def load(cls, path: str, dim: int, bit_width: int = 4) -> "NumpyIndex":
        data = np.load(path if path.endswith(cls.EXT) else path + cls.EXT)
        obj = cls(dim=int(data["dim"]), bit_width=bit_width)
        ids = data["ids"]
        mat = data["mat"]
        obj._ids = [int(x) for x in ids]
        obj._mat = mat.astype(np.float32) if mat.size else None
        return obj

    def __len__(self) -> int:
        return len(self._ids)


def turbovec_available() -> bool:
    import importlib.util
    return importlib.util.find_spec("turbovec") is not None


def resolve_backend(preferred: str) -> str:
    preferred = (preferred or "auto").strip().lower()
    if preferred == "numpy":
        return "numpy"
    if preferred == "turbovec":
        if not turbovec_available():
            raise RuntimeError("vector_backend=turbovec but the package is not installed")
        return "turbovec"
    # auto
    return "turbovec" if turbovec_available() else "numpy"


def new_index(dim: int, backend: str, bit_width: int = 4):
    if backend == "turbovec":
        return TurboVecIndex(dim=dim, bit_width=bit_width)
    return NumpyIndex(dim=dim, bit_width=bit_width)


def index_filename(backend: str) -> str:
    return "index.tvim" if backend == "turbovec" else "index.npz"


def load_index(path: str, dim: int, backend: str, bit_width: int = 4):
    if backend == "turbovec":
        return TurboVecIndex.load(path, dim=dim, bit_width=bit_width)
    return NumpyIndex.load(path, dim=dim, bit_width=bit_width)
