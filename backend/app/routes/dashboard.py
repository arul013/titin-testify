"""
Learning Nexus CBT — Dashboard Routes (Admin & Super Admin)
"""

from fastapi import APIRouter, Depends

from app.models.dashboard import DashboardSummary
from app.models.user import UserProfile
from app.services.dashboard_service import DashboardService
from app.dependencies import require_admin

router = APIRouter(tags=["Dashboard"])


@router.get("/api/dashboard/summary", response_model=DashboardSummary)
async def dashboard_summary(current_user: UserProfile = Depends(require_admin)):
    """Ringkasan dashboard — role-aware (admin: data sendiri; super_admin: sistem + pengguna/audit)."""
    return await DashboardService.summary(current_user)
