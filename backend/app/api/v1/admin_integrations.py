from fastapi import APIRouter, Depends

from app.api.deps import require_admin, require_super_admin
from app.models.integration import IntegrationCreate, IntegrationUpdate
from app.services.integration_service import IntegrationService

# Viewable by admin + super_admin; individual mutation routes below re-gate to
# super_admin only so regular admins get read-only access, per the RBAC ask.
router = APIRouter(prefix="/admin/integrations", tags=["admin:integrations"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list)
async def admin_list_integrations():
    return await IntegrationService.list_public()


@router.post("", dependencies=[Depends(require_super_admin)])
async def admin_create_integration(payload: IntegrationCreate):
    return await IntegrationService.create(payload)


@router.put("/{integration_id}", dependencies=[Depends(require_super_admin)])
async def admin_update_integration(integration_id: str, payload: IntegrationUpdate):
    return await IntegrationService.update(integration_id, payload)


@router.delete("/{integration_id}", dependencies=[Depends(require_super_admin)])
async def admin_delete_integration(integration_id: str):
    await IntegrationService.delete(integration_id)
    return {"deleted": True}
