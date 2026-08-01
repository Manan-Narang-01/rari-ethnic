from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.models.integration import VALID_CATEGORIES, Integration, IntegrationCreate, IntegrationUpdate
from app.repositories.integration_repo import IntegrationRepository
from app.utils.crypto import decrypt, encrypt, mask
from app.utils.slugify import slugify


def _to_public(doc: dict) -> dict:
    fields = doc.get("fields", [])
    stored = doc.get("credentials", {})
    masked = {}
    for field in fields:
        key = field["key"]
        ciphertext = stored.get(key, "")
        masked[key] = mask(decrypt(ciphertext)) if ciphertext else ""
    return {
        "id": doc["id"],
        "category": doc["category"],
        "provider": doc["provider"],
        "label": doc["label"],
        "is_enabled": doc["is_enabled"],
        "fields": fields,
        # No credential fields at all (e.g. COD) counts as always configured;
        # otherwise configured once at least one field has been set.
        "configured": not fields or any(masked.values()),
        "masked_credentials": masked,
        "updated_at": doc["updated_at"],
    }


# The one credential field per known provider that's actually safe to hand to
# a browser (a publishable/client id, never a secret). Custom providers
# outside this catalog expose nothing beyond enabled/label -- fail closed.
PUBLIC_KEY_FIELD = {
    "stripe": "publishable_key",
    "razorpay": "key_id",
    "paypal": "client_id",
}


def _unique_field_keys(fields: list) -> list:
    """Auto-slugifies any field missing a key, from its label, deduping
    against sibling keys within the same provider (e.g. two fields both
    labelled "Token" become "token" and "token-2")."""
    used = set()
    result = []
    for f in fields:
        key = f.key or slugify(f.label) or "field"
        base, i = key, 2
        while key in used:
            key = f"{base}-{i}"
            i += 1
        used.add(key)
        result.append({"key": key, "label": f.label})
    return result


class IntegrationService:
    @staticmethod
    async def list_public() -> list:
        docs = await IntegrationRepository.list_all()
        return [_to_public(d) for d in docs]

    @staticmethod
    async def list_payment_methods_public() -> list:
        """Storefront-safe view for the checkout page: which payment methods
        are enabled, plus the one publishable key (if any) each needs to
        initialize its widget client-side. Never includes secrets."""
        docs = await IntegrationRepository.list_all()
        result = []
        for d in docs:
            if d["category"] != "payment" or not d["is_enabled"]:
                continue
            public_key = None
            safe_field = PUBLIC_KEY_FIELD.get(d["provider"])
            if safe_field:
                ciphertext = d.get("credentials", {}).get(safe_field, "")
                public_key = decrypt(ciphertext) if ciphertext else None
            result.append({"provider": d["provider"], "label": d["label"], "public_key": public_key})
        return result

    @staticmethod
    async def create(payload: IntegrationCreate) -> dict:
        if payload.category not in VALID_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category must be one of {sorted(VALID_CATEGORIES)}",
            )

        provider = payload.provider or slugify(payload.label)
        if not provider:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not derive a provider key from that label")
        if await IntegrationRepository.provider_exists(payload.category, provider):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A provider with this key already exists in this category")

        fields = _unique_field_keys(payload.fields)
        credentials = {f["key"]: encrypt(payload.credentials[f["key"]]) for f in fields if payload.credentials.get(f["key"])}

        integration = Integration(
            category=payload.category,
            provider=provider,
            label=payload.label,
            fields=fields,
            is_enabled=payload.is_enabled,
            credentials=credentials,
        )
        doc = integration.model_dump()
        doc["updated_at"] = doc["updated_at"].isoformat()
        await IntegrationRepository.insert(doc)
        return _to_public(doc)

    @staticmethod
    async def update(integration_id: str, payload: IntegrationUpdate) -> dict:
        doc = await IntegrationRepository.get_by_id(integration_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration not found")

        updates = {}
        if payload.label is not None:
            updates["label"] = payload.label
        if payload.is_enabled is not None:
            updates["is_enabled"] = payload.is_enabled
        if payload.fields is not None:
            updates["fields"] = [f.model_dump() for f in payload.fields]

        if payload.credentials is not None:
            valid_keys = {f["key"] for f in updates.get("fields", doc.get("fields", []))}
            unknown = set(payload.credentials) - valid_keys
            if unknown:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unknown credential field(s) for {doc['provider']}: {sorted(unknown)}",
                )
            merged = dict(doc.get("credentials", {}))
            for key, value in payload.credentials.items():
                if value:  # blank means "leave unchanged" -- see IntegrationUpdate docstring
                    merged[key] = encrypt(value)
            updates["credentials"] = merged

        if updates:
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            await IntegrationRepository.update(integration_id, updates)

        return _to_public(await IntegrationRepository.get_by_id(integration_id))

    @staticmethod
    async def delete(integration_id: str) -> None:
        if not await IntegrationRepository.delete(integration_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration not found")
