from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

SECRET_KEY = os.environ.get('SECRET_KEY', 'durra-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class UserRole:
    ADMIN = "admin"
    EMPLOYEE = "employee"

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: str
    branch_id: Optional[str] = None
    branch_name: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str
    branch_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Branch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BranchCreate(BaseModel):
    name: str
    code: str

class Supplier(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    contact_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class SupplierCreate(BaseModel):
    name: str
    contact_number: Optional[str] = None
    notes: Optional[str] = None

class Part(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    part_number: str
    part_name: Optional[str] = None
    last_price: Optional[float] = None
    last_pricing_date: Optional[datetime] = None
    last_pricing_branch: Optional[str] = None
    is_available_in_stock: Optional[bool] = None
    supplier_used: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PartCreate(BaseModel):
    part_number: str
    part_name: Optional[str] = None

class PricingHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    part_number: str
    part_name: Optional[str] = None
    branch_id: str
    branch_name: str
    employee_id: str
    employee_name: str
    is_available: bool
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    supplier_price: Optional[float] = None
    supplier_date: Optional[datetime] = None
    vat_rate: float = 0.15
    profit_margin_percentage: Optional[float] = None
    final_price: float
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PricingCreate(BaseModel):
    part_number: str
    part_name: Optional[str] = None
    is_available: bool
    supplier_id: Optional[str] = None
    supplier_price: Optional[float] = None
    supplier_date: Optional[datetime] = None
    profit_margin_percentage: Optional[float] = None
    final_price: float
    notes: Optional[str] = None

class CustomerInquiry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    customer_phone: str
    part_number: str
    part_name: Optional[str] = None
    quoted_price: float
    price_source: str
    branch_id: str
    branch_name: str
    employee_id: str
    employee_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InquiryCreate(BaseModel):
    customer_name: str
    customer_phone: str
    part_number: str
    part_name: Optional[str] = None
    quoted_price: float
    price_source: str

class ProfitMargin(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    part_number: Optional[str] = None
    margin_percentage: float
    is_default: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class ProfitMarginCreate(BaseModel):
    part_number: Optional[str] = None
    margin_percentage: float
    is_default: bool = False

class DashboardStats(BaseModel):
    total_parts: int
    total_inquiries: int
    total_suppliers: int
    total_employees: int
    recent_pricing: List[PricingHistory]
    inquiry_trends: List[Dict[str, Any]]
    top_parts: List[Dict[str, Any]]
    branch_stats: List[Dict[str, Any]]

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="بيانات الاعتماد غير صحيحة",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user_doc is None:
        raise credentials_exception
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية للوصول"
        )
    return current_user

# Auth Routes
@api_router.post("/auth/register", response_model=User)
async def register(user_input: UserCreate, current_admin: User = Depends(get_current_admin)):
    existing = await db.users.find_one({"email": user_input.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم بالفعل")
    
    branch_name = None
    if user_input.branch_id:
        branch = await db.branches.find_one({"id": user_input.branch_id}, {"_id": 0})
        if branch:
            branch_name = branch['name']
    
    user_dict = user_input.model_dump(exclude={'password'})
    user_obj = User(**user_dict, branch_name=branch_name)
    
    doc = user_obj.model_dump()
    doc['password'] = get_password_hash(user_input.password)
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return user_obj

@api_router.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user_doc = await db.users.find_one({"email": form_data.username}, {"_id": 0})
    if not user_doc or not verify_password(form_data.password, user_doc['password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="البريد الإلكتروني أو كلمة المرور غير صحيحة"
        )
    
    if not user_doc.get('is_active', True):
        raise HTTPException(status_code=400, detail="الحساب غير نشط")
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(**{k: v for k, v in user_doc.items() if k != 'password'})
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Branch Routes
@api_router.post("/branches", response_model=Branch)
async def create_branch(branch_input: BranchCreate, current_admin: User = Depends(get_current_admin)):
    existing = await db.branches.find_one({"code": branch_input.code}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="رمز الفرع مستخدم بالفعل")
    
    branch = Branch(**branch_input.model_dump())
    doc = branch.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.branches.insert_one(doc)
    return branch

@api_router.get("/branches", response_model=List[Branch])
async def get_branches(current_user: User = Depends(get_current_user)):
    branches = await db.branches.find({"is_active": True}, {"_id": 0}).to_list(100)
    for branch in branches:
        if isinstance(branch.get('created_at'), str):
            branch['created_at'] = datetime.fromisoformat(branch['created_at'])
    return branches

@api_router.put("/branches/{branch_id}", response_model=Branch)
async def update_branch(branch_id: str, branch_input: BranchCreate, current_admin: User = Depends(get_current_admin)):
    existing = await db.branches.find_one({"id": branch_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الفرع غير موجود")
    
    await db.branches.update_one({"id": branch_id}, {"$set": branch_input.model_dump()})
    updated = await db.branches.find_one({"id": branch_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Branch(**updated)

# Supplier Routes
@api_router.post("/suppliers", response_model=Supplier)
async def create_supplier(supplier_input: SupplierCreate, current_user: User = Depends(get_current_user)):
    supplier = Supplier(**supplier_input.model_dump(), created_by=current_user.id)
    doc = supplier.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.suppliers.insert_one(doc)
    return supplier

@api_router.get("/suppliers", response_model=List[Supplier])
async def get_suppliers(current_user: User = Depends(get_current_user)):
    suppliers = await db.suppliers.find({}, {"_id": 0}).to_list(1000)
    for supplier in suppliers:
        if isinstance(supplier.get('created_at'), str):
            supplier['created_at'] = datetime.fromisoformat(supplier['created_at'])
    return suppliers

@api_router.put("/suppliers/{supplier_id}", response_model=Supplier)
async def update_supplier(supplier_id: str, supplier_input: SupplierCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية لتعديل الموردين")
    
    existing = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="المورد غير موجود")
    
    await db.suppliers.update_one({"id": supplier_id}, {"$set": supplier_input.model_dump()})
    updated = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Supplier(**updated)

@api_router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str, current_admin: User = Depends(get_current_admin)):
    result = await db.suppliers.delete_one({"id": supplier_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="المورد غير موجود")
    return {"message": "تم حذف المورد بنجاح"}

# Part Routes
@api_router.get("/parts/search")
async def search_part(part_number: str, current_user: User = Depends(get_current_user)):
    part = await db.parts.find_one({"part_number": part_number}, {"_id": 0})
    if not part:
        return {"found": False, "part_number": part_number}
    
    if isinstance(part.get('created_at'), str):
        part['created_at'] = datetime.fromisoformat(part['created_at'])
    if isinstance(part.get('last_pricing_date'), str):
        part['last_pricing_date'] = datetime.fromisoformat(part['last_pricing_date'])
    
    # Get pricing history
    history = await db.pricing_history.find(
        {"part_number": part_number},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    for h in history:
        if isinstance(h.get('created_at'), str):
            h['created_at'] = datetime.fromisoformat(h['created_at'])
        if isinstance(h.get('supplier_date'), str):
            h['supplier_date'] = datetime.fromisoformat(h['supplier_date'])
    
    return {"found": True, "part": part, "history": history}

@api_router.get("/parts", response_model=List[Part])
async def get_parts(current_user: User = Depends(get_current_user)):
    parts = await db.parts.find({}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    for part in parts:
        if isinstance(part.get('created_at'), str):
            part['created_at'] = datetime.fromisoformat(part['created_at'])
        if isinstance(part.get('last_pricing_date'), str):
            part['last_pricing_date'] = datetime.fromisoformat(part['last_pricing_date'])
    return parts

# Pricing Routes
@api_router.post("/pricing", response_model=PricingHistory)
async def create_pricing(pricing_input: PricingCreate, current_user: User = Depends(get_current_user)):
    supplier_name = None
    if pricing_input.supplier_id:
        supplier = await db.suppliers.find_one({"id": pricing_input.supplier_id}, {"_id": 0})
        if supplier:
            supplier_name = supplier['name']
    
    pricing = PricingHistory(
        **pricing_input.model_dump(),
        branch_id=current_user.branch_id or "main",
        branch_name=current_user.branch_name or "الفرع الرئيسي",
        employee_id=current_user.id,
        employee_name=current_user.full_name,
        supplier_name=supplier_name
    )
    
    doc = pricing.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('supplier_date'):
        doc['supplier_date'] = doc['supplier_date'].isoformat()
    
    await db.pricing_history.insert_one(doc)
    
    # Update part info
    part_update = {
        "part_number": pricing_input.part_number,
        "part_name": pricing_input.part_name,
        "last_price": pricing_input.final_price,
        "last_pricing_date": doc['created_at'],
        "last_pricing_branch": pricing.branch_name,
        "is_available_in_stock": pricing_input.is_available,
        "supplier_used": supplier_name
    }
    
    await db.parts.update_one(
        {"part_number": pricing_input.part_number},
        {"$set": part_update, "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": doc['created_at']}},
        upsert=True
    )
    
    return pricing

@api_router.get("/pricing", response_model=List[PricingHistory])
async def get_pricing_history(
    part_number: Optional[str] = None,
    branch_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if part_number:
        query["part_number"] = part_number
    if branch_id:
        query["branch_id"] = branch_id
    elif current_user.role == UserRole.EMPLOYEE and current_user.branch_id:
        query["branch_id"] = current_user.branch_id
    
    history = await db.pricing_history.find(query, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    for h in history:
        if isinstance(h.get('created_at'), str):
            h['created_at'] = datetime.fromisoformat(h['created_at'])
        if isinstance(h.get('supplier_date'), str):
            h['supplier_date'] = datetime.fromisoformat(h['supplier_date'])
    return history

@api_router.delete("/pricing/{pricing_id}")
async def delete_pricing(pricing_id: str, current_admin: User = Depends(get_current_admin)):
    result = await db.pricing_history.delete_one({"id": pricing_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="التسعير غير موجود")
    return {"message": "تم حذف التسعير بنجاح"}

# Customer Inquiry Routes
@api_router.post("/inquiries", response_model=CustomerInquiry)
async def create_inquiry(inquiry_input: InquiryCreate, current_user: User = Depends(get_current_user)):
    inquiry = CustomerInquiry(
        **inquiry_input.model_dump(),
        branch_id=current_user.branch_id or "main",
        branch_name=current_user.branch_name or "الفرع الرئيسي",
        employee_id=current_user.id,
        employee_name=current_user.full_name
    )
    
    doc = inquiry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.customer_inquiries.insert_one(doc)
    return inquiry

@api_router.get("/inquiries", response_model=List[CustomerInquiry])
async def get_inquiries(
    customer_phone: Optional[str] = None,
    part_number: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if customer_phone:
        query["customer_phone"] = customer_phone
    if part_number:
        query["part_number"] = part_number
    if current_user.role == UserRole.EMPLOYEE and current_user.branch_id:
        query["branch_id"] = current_user.branch_id
    
    inquiries = await db.customer_inquiries.find(query, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    for inq in inquiries:
        if isinstance(inq.get('created_at'), str):
            inq['created_at'] = datetime.fromisoformat(inq['created_at'])
    return inquiries

# Profit Margin Routes
@api_router.post("/profit-margins", response_model=ProfitMargin)
async def create_profit_margin(margin_input: ProfitMarginCreate, current_admin: User = Depends(get_current_admin)):
    margin = ProfitMargin(**margin_input.model_dump(), created_by=current_admin.id)
    doc = margin.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.profit_margins.insert_one(doc)
    return margin

@api_router.get("/profit-margins", response_model=List[ProfitMargin])
async def get_profit_margins(current_user: User = Depends(get_current_user)):
    margins = await db.profit_margins.find({}, {"_id": 0}).to_list(100)
    for margin in margins:
        if isinstance(margin.get('created_at'), str):
            margin['created_at'] = datetime.fromisoformat(margin['created_at'])
    return margins

@api_router.get("/profit-margins/calculate")
async def calculate_profit_margin(
    part_number: str,
    supplier_price: float,
    current_user: User = Depends(get_current_user)
):
    # Check for part-specific margin
    specific_margin = await db.profit_margins.find_one(
        {"part_number": part_number},
        {"_id": 0}
    )
    
    if specific_margin:
        margin_percentage = specific_margin['margin_percentage']
    else:
        # Get default margin
        default_margin = await db.profit_margins.find_one(
            {"is_default": True},
            {"_id": 0}
        )
        margin_percentage = default_margin['margin_percentage'] if default_margin else 20.0
    
    # Calculate suggested price
    vat_rate = 0.15
    price_with_vat = supplier_price * (1 + vat_rate)
    final_price = price_with_vat * (1 + margin_percentage / 100)
    
    return {
        "supplier_price": supplier_price,
        "vat_amount": supplier_price * vat_rate,
        "price_with_vat": price_with_vat,
        "margin_percentage": margin_percentage,
        "margin_amount": price_with_vat * (margin_percentage / 100),
        "suggested_final_price": round(final_price, 2)
    }

# Dashboard Stats
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    # Total counts
    total_parts = await db.parts.count_documents({})
    total_inquiries = await db.customer_inquiries.count_documents({})
    total_suppliers = await db.suppliers.count_documents({})
    total_employees = await db.users.count_documents({"role": UserRole.EMPLOYEE})
    
    # Recent pricing
    recent_pricing = await db.pricing_history.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    for rp in recent_pricing:
        if isinstance(rp.get('created_at'), str):
            rp['created_at'] = datetime.fromisoformat(rp['created_at'])
        if isinstance(rp.get('supplier_date'), str):
            rp['supplier_date'] = datetime.fromisoformat(rp['supplier_date'])
    
    # Inquiry trends (last 7 days)
    from datetime import timedelta
    inquiry_trends = []
    for i in range(6, -1, -1):
        date = datetime.now(timezone.utc) - timedelta(days=i)
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        end_of_day = date.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
        
        count = await db.customer_inquiries.count_documents({
            "created_at": {"$gte": start_of_day, "$lte": end_of_day}
        })
        
        inquiry_trends.append({
            "date": date.strftime("%Y-%m-%d"),
            "count": count
        })
    
    # Top parts by inquiry
    pipeline = [
        {"$group": {"_id": "$part_number", "count": {"$sum": 1}, "part_name": {"$first": "$part_name"}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_parts_cursor = db.customer_inquiries.aggregate(pipeline)
    top_parts = await top_parts_cursor.to_list(5)
    top_parts = [
        {"part_number": p["_id"], "part_name": p.get("part_name", ""), "inquiry_count": p["count"]}
        for p in top_parts
    ]
    
    # Branch stats
    pipeline = [
        {"$group": {"_id": "$branch_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    branch_stats_cursor = db.customer_inquiries.aggregate(pipeline)
    branch_stats = await branch_stats_cursor.to_list(10)
    branch_stats = [
        {"branch_name": b["_id"] or "غير محدد", "inquiry_count": b["count"]}
        for b in branch_stats
    ]
    
    return DashboardStats(
        total_parts=total_parts,
        total_inquiries=total_inquiries,
        total_suppliers=total_suppliers,
        total_employees=total_employees,
        recent_pricing=[PricingHistory(**rp) for rp in recent_pricing],
        inquiry_trends=inquiry_trends,
        top_parts=top_parts,
        branch_stats=branch_stats
    )

# Users Management
@api_router.get("/users", response_model=List[User])
async def get_users(current_admin: User = Depends(get_current_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    return users

@api_router.put("/users/{user_id}/toggle-status")
async def toggle_user_status(user_id: str, current_admin: User = Depends(get_current_admin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    new_status = not user.get('is_active', True)
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": new_status}})
    return {"message": "تم تحديث حالة المستخدم بنجاح", "is_active": new_status}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db():
    # Create default admin if not exists
    admin_exists = await db.users.find_one({"role": UserRole.ADMIN})
    if not admin_exists:
        admin = User(
            email="admin@durra.com",
            full_name="مدير النظام",
            role=UserRole.ADMIN,
            is_active=True
        )
        doc = admin.model_dump()
        doc['password'] = get_password_hash("admin123")
        doc['created_at'] = doc['created_at'].isoformat()
        await db.users.insert_one(doc)
        logger.info("تم إنشاء حساب المدير الافتراضي: admin@durra.com / admin123")
    
    # Create default branches
    branches_data = [
        {"name": "الفرع الرئيسي", "code": "MAIN"},
        {"name": "فرع الرواف", "code": "RAWAF"},
        {"name": "فرع كيا", "code": "KIA"}
    ]
    
    for branch_data in branches_data:
        exists = await db.branches.find_one({"code": branch_data["code"]})
        if not exists:
            branch = Branch(**branch_data)
            doc = branch.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.branches.insert_one(doc)
            logger.info(f"تم إنشاء الفرع: {branch_data['name']}")
    
    # Create default profit margin
    default_margin = await db.profit_margins.find_one({"is_default": True})
    if not default_margin:
        margin = ProfitMargin(margin_percentage=20.0, is_default=True, created_by="system")
        doc = margin.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.profit_margins.insert_one(doc)
        logger.info("تم إنشاء نسبة المكسب الافتراضية: 20%")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()