"""Per-IP rate limiting for the auth/brute-force-sensitive endpoints, per
docs/BACKEND_ARCHITECTURE.md's own top security priority (§12): none of
these endpoints had any throttle before this. In-memory backend -- fine for
a single-process deployment at this store's scale; swap slowapi's storage_uri
to Redis if the app is ever run with multiple worker processes, since
in-memory counters don't share state across processes."""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
