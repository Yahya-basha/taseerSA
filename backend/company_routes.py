"""
Company Management Routes for Multi-Tenant SaaS
These routes handle company creation, settings, and management
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from models import Company, CompanyCreate, CompanySettings, User, UserRole
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import os

# Database connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

company_router = APIRouter(prefix="/companies", tags=["companies"])

# Helper function to check super admin
async def get_current_super_admin(current_user: User) -> User:
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="يتطلب صلاحيات Super Admin"
        )
    return current_user

# Helper function to check company admin
async def get_current_company_admin(current_user: User) -> User:
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="يتطلب صلاحيات مدير"
        )
    return current_user

@company_router.post("", response_model=Company)
async def create_company(
    company_input: CompanyCreate,
    current_super_admin: User = Depends(get_current_super_admin)
):
    """
    Create a new company (Super Admin only)
    Each company gets isolated data
    """
    # Check if company code already exists
    existing = await db.companies.find_one({"code": company_input.code}, {"_id": 0})
    if existing:
        raise HTTPException(
            status_code=400,
            detail="رمز الشركة مستخدم بالفعل"
        )
    
    # Create company
    company = Company(**company_input.model_dump())
    doc = company.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.companies.insert_one(doc)
    
    # Create default branch for the company
    default_branch = {
        "id": str(uuid.uuid4()),
        "company_id": company.id,
        "name": "الفرع الرئيسي",
        "code": "MAIN",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.branches.insert_one(default_branch)
    
    # Create default profit margin for the company
    default_margin = {
        "id": str(uuid.uuid4()),
        "company_id": company.id,
        "margin_percentage": 20.0,
        "is_default": True,
        "created_by": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.profit_margins.insert_one(default_margin)
    
    return company

@company_router.get("", response_model=List[Company])
async def get_all_companies(
    current_super_admin: User = Depends(get_current_super_admin)
):
    """
    Get all companies (Super Admin only)
    """
    companies = await db.companies.find({}, {"_id": 0}).to_list(1000)
    for company in companies:
        if isinstance(company.get('created_at'), str):
            company['created_at'] = datetime.fromisoformat(company['created_at'])
    return companies

@company_router.get("/{company_id}", response_model=Company)
async def get_company(
    company_id: str,
    current_user: User = Depends(get_current_company_admin)
):
    """
    Get company details
    Super Admin can access any company
    Company Admin can only access their own company
    """
    # Check permissions
    if current_user.role != UserRole.SUPER_ADMIN and current_user.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية الوصول لهذه الشركة"
        )
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="الشركة غير موجودة")
    
    if isinstance(company.get('created_at'), str):
        company['created_at'] = datetime.fromisoformat(company['created_at'])
    
    return Company(**company)

@company_router.put("/{company_id}/settings", response_model=Company)
async def update_company_settings(
    company_id: str,
    settings: CompanySettings,
    current_user: User = Depends(get_current_company_admin)
):
    """
    Update company settings (logo, colors, etc.)
    Company Admin can update their own company
    Super Admin can update any company
    """
    # Check permissions
    if current_user.role != UserRole.SUPER_ADMIN and current_user.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية تعديل هذه الشركة"
        )
    
    # Get company
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="الشركة غير موجودة")
    
    # Update settings
    update_data = {k: v for k, v in settings.model_dump().items() if v is not None}
    
    if update_data:
        await db.companies.update_one(
            {"id": company_id},
            {"$set": update_data}
        )
    
    # Get updated company
    updated = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    
    return Company(**updated)

@company_router.put("/{company_id}/status")
async def toggle_company_status(
    company_id: str,
    current_super_admin: User = Depends(get_current_super_admin)
):
    """
    Activate/Deactivate company (Super Admin only)
    """
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="الشركة غير موجودة")
    
    new_status = not company.get('is_active', True)
    await db.companies.update_one(
        {"id": company_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {
        "message": "تم تحديث حالة الشركة بنجاح",
        "is_active": new_status
    }

@company_router.get("/{company_id}/stats")
async def get_company_stats(
    company_id: str,
    current_user: User = Depends(get_current_company_admin)
):
    """
    Get company statistics
    """
    # Check permissions
    if current_user.role != UserRole.SUPER_ADMIN and current_user.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية الوصول"
        )
    
    # Get stats
    total_users = await db.users.count_documents({"company_id": company_id})
    total_branches = await db.branches.count_documents({"company_id": company_id})
    total_parts = await db.parts.count_documents({"company_id": company_id})
    total_suppliers = await db.suppliers.count_documents({"company_id": company_id})
    total_inquiries = await db.customer_inquiries_multi.count_documents({"company_id": company_id})
    total_quotations = await db.quotations.count_documents({"company_id": company_id})
    
    return {
        "company_id": company_id,
        "total_users": total_users,
        "total_branches": total_branches,
        "total_parts": total_parts,
        "total_suppliers": total_suppliers,
        "total_inquiries": total_inquiries,
        "total_quotations": total_quotations
    }
