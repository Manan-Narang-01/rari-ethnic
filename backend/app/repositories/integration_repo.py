from datetime import datetime

from app.database import get_database


class IntegrationRepository:
    @staticmethod
    def _collection():
        return get_database().integrations

    @classmethod
    async def list_all(cls) -> list:
        docs = await cls._collection().find({}, {"_id": 0}).sort([("category", 1), ("label", 1)]).to_list(500)
        return [_coerce_updated_at(d) for d in docs]

    @classmethod
    async def get_by_id(cls, integration_id: str) -> dict:
        doc = await cls._collection().find_one({"id": integration_id}, {"_id": 0})
        return _coerce_updated_at(doc) if doc else None

    @classmethod
    async def get_by_provider(cls, category: str, provider: str) -> dict:
        doc = await cls._collection().find_one({"category": category, "provider": provider}, {"_id": 0})
        return _coerce_updated_at(doc) if doc else None

    @classmethod
    async def provider_exists(cls, category: str, provider: str, *, exclude_id: str = None) -> bool:
        query = {"category": category, "provider": provider}
        if exclude_id:
            query["id"] = {"$ne": exclude_id}
        return await cls._collection().find_one(query) is not None

    @classmethod
    async def insert(cls, doc: dict) -> None:
        await cls._collection().insert_one(doc)

    @classmethod
    async def update(cls, integration_id: str, updates: dict) -> bool:
        r = await cls._collection().update_one({"id": integration_id}, {"$set": updates})
        return r.matched_count > 0

    @classmethod
    async def delete(cls, integration_id: str) -> bool:
        r = await cls._collection().delete_one({"id": integration_id})
        return r.deleted_count > 0

    @classmethod
    async def ensure_defaults(cls, catalog: dict) -> None:
        """Seeds the starter provider catalog. Only runs against a completely
        empty collection -- once any documents exist (including after a
        Super Admin deletes one of the starter providers), this is a no-op,
        so deletes are permanent rather than being re-seeded on next boot."""
        if await cls._collection().count_documents({}) > 0:
            return
        from app.models.integration import Integration

        for category, providers in catalog.items():
            for provider, meta in providers.items():
                doc = Integration(category=category, provider=provider, label=meta["label"], fields=meta["fields"]).model_dump()
                doc["updated_at"] = doc["updated_at"].isoformat()
                await cls.insert(doc)

    @classmethod
    async def ensure_provider_exists(cls, category: str, provider: str, meta: dict) -> None:
        """Introduces a single new catalog provider added in a later version
        of the app (e.g. SMTP) into an install that already has other
        providers -- unlike ensure_defaults, this doesn't require the whole
        collection to be empty. Note: unlike ensure_defaults' starter set,
        this one re-creates the provider on every restart if it's ever
        deleted, since there's no way to tell "never existed" apart from
        "deleted" without a tombstone -- acceptable since this is meant for
        a small number of built-in singleton providers, not arbitrary ones."""
        if await cls.get_by_provider(category, provider):
            return
        from app.models.integration import Integration

        doc = Integration(category=category, provider=provider, label=meta["label"], fields=meta["fields"]).model_dump()
        doc["updated_at"] = doc["updated_at"].isoformat()
        await cls.insert(doc)

    @classmethod
    async def backfill_defaults(cls, catalog: dict) -> None:
        """Migrates documents created before `label`/`fields` were stored on
        the document itself (they used to be looked up from the catalog at
        read time) -- matches them back up by category+provider."""
        async for doc in cls._collection().find({"label": {"$exists": False}}):
            meta = catalog.get(doc["category"], {}).get(doc["provider"])
            if not meta:
                continue
            await cls._collection().update_one(
                {"_id": doc["_id"]},
                {"$set": {"label": meta["label"], "fields": meta["fields"]}},
            )

    @classmethod
    async def ensure_indexes(cls) -> None:
        await cls._collection().create_index("id", unique=True)
        await cls._collection().create_index([("category", 1), ("provider", 1)], unique=True)


def _coerce_updated_at(doc: dict) -> dict:
    if isinstance(doc.get("updated_at"), str):
        doc["updated_at"] = datetime.fromisoformat(doc["updated_at"])
    return doc
