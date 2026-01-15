from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, File, UploadFile
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'taseer_db')]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

SECRET_KEY = os.environ.get('SECRET_KEY', 'durra-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# CORS Configuration
cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class UserRole:
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    EMPLOYEE = "employee"

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str  # Multi-tenant key
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
    company_id: Optional[str] = None  # Optional - will be overwritten by backend

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User
    company: Optional[dict] = None

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
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية للوصول"
        )
    return current_user

# Auth Routes
@api_router.post("/auth/register", response_model=User)
async def register(user_input: UserCreate, current_admin: User = Depends(get_current_admin)):
    # Check if email already exists within the same company
    existing = await db.users.find_one({
        "email": user_input.email, 
        "company_id": current_admin.company_id
    }, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم بالفعل في هذه الشركة")
    
    branch_name = None
    if user_input.branch_id:
        # Only get branches from the same company
        branch = await db.branches.find_one({
            "id": user_input.branch_id,
            "company_id": current_admin.company_id
        }, {"_id": 0})
        if branch:
            branch_name = branch['name']
    
    user_dict = user_input.model_dump(exclude={'password'})
    # CRITICAL: Assign the company_id from the current admin (not from frontend)
    user_dict['company_id'] = current_admin.company_id
    user_obj = User(**user_dict, branch_name=branch_name)
    
    doc = user_obj.model_dump()
    doc['password'] = get_password_hash(user_input.password)
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return user_obj

@api_router.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Extract company_code from username (format: company_code:email or just email for backward compatibility)
    company_code = None
    email = form_data.username
    
    if ":" in form_data.username:
        parts = form_data.username.split(":", 1)
        company_code = parts[0]
        email = parts[1]
    
    # Find user
    query = {"email": email}
    if company_code:
        # Get company by code
        company = await db.companies.find_one({"code": company_code}, {"_id": 0})
        if not company:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="رمز الشركة غير صحيح"
            )
        if not company.get('is_active', True):
            raise HTTPException(status_code=400, detail="الشركة غير نشطة")
        query["company_id"] = company['id']
    
    user_doc = await db.users.find_one(query, {"_id": 0})
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
    
    # Get company info
    company_info = None
    if user_doc.get('company_id'):
        company = await db.companies.find_one({"id": user_doc['company_id']}, {"_id": 0})
        if company:
            company_info = {
                "id": company['id'],
                "name": company['name'],
                "code": company['code'],
                "logo_url": company.get('logo_url'),
                "primary_color": company.get('primary_color', '#0F172A'),
                "secondary_color": company.get('secondary_color', '#64748B')
            }
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id, "company_id": user_doc.get('company_id')},  # Include company_id in token
        expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user, company=company_info)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Branch Routes
@api_router.post("/branches", response_model=Branch)
async def create_branch(branch_input: BranchCreate, current_admin: User = Depends(get_current_admin)):
    # Check within company
    existing = await db.branches.find_one({
        "code": branch_input.code,
        "company_id": current_admin.company_id
    }, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="رمز الفرع مستخدم بالفعل")
    
    branch = Branch(**branch_input.model_dump())
    doc = branch.model_dump()
    doc['company_id'] = current_admin.company_id  # Add company_id
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.branches.insert_one(doc)
    return branch

@api_router.get("/branches", response_model=List[Branch])
async def get_branches(current_user: User = Depends(get_current_user)):
    # Filter by company_id
    branches = await db.branches.find({
        "is_active": True,
        "company_id": current_user.company_id
    }, {"_id": 0}).to_list(100)
    for branch in branches:
        if isinstance(branch.get('created_at'), str):
            branch['created_at'] = datetime.fromisoformat(branch['created_at'])
    return branches

@api_router.put("/branches/{branch_id}", response_model=Branch)
async def update_branch(branch_id: str, branch_input: BranchCreate, current_admin: User = Depends(get_current_admin)):
    # Filter by company_id
    existing = await db.branches.find_one({
        "id": branch_id,
        "company_id": current_admin.company_id
    }, {"_id": 0})
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
    doc['company_id'] = current_user.company_id  # Add company_id
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.suppliers.insert_one(doc)
    return supplier

@api_router.get("/suppliers", response_model=List[Supplier])
async def get_suppliers(current_user: User = Depends(get_current_user)):
    # Filter by company_id
    suppliers = await db.suppliers.find(
        {"company_id": current_user.company_id}, 
        {"_id": 0}
    ).to_list(1000)
    for supplier in suppliers:
        if isinstance(supplier.get('created_at'), str):
            supplier['created_at'] = datetime.fromisoformat(supplier['created_at'])
    return suppliers

@api_router.put("/suppliers/{supplier_id}", response_model=Supplier)
async def update_supplier(supplier_id: str, supplier_input: SupplierCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية لتعديل الموردين")
    
    # Filter by company_id
    existing = await db.suppliers.find_one({
        "id": supplier_id,
        "company_id": current_user.company_id
    }, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="المورد غير موجود")
    
    await db.suppliers.update_one({"id": supplier_id}, {"$set": supplier_input.model_dump()})
    updated = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Supplier(**updated)

@api_router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str, current_admin: User = Depends(get_current_admin)):
    # Filter by company_id
    result = await db.suppliers.delete_one({
        "id": supplier_id,
        "company_id": current_admin.company_id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="المورد غير موجود")
    return {"message": "تم حذف المورد بنجاح"}

# Part Routes
@api_router.get("/parts/search")
async def search_part(part_number: str, current_user: User = Depends(get_current_user)):
    # Filter by company_id
    part = await db.parts.find_one({
        "part_number": part_number,
        "company_id": current_user.company_id
    }, {"_id": 0})
    if not part:
        return {"found": False, "part_number": part_number}
    
    if isinstance(part.get('created_at'), str):
        part['created_at'] = datetime.fromisoformat(part['created_at'])
    if isinstance(part.get('last_pricing_date'), str):
        part['last_pricing_date'] = datetime.fromisoformat(part['last_pricing_date'])
    
    # Get pricing history - filter by company_id
    history = await db.pricing_history.find(
        {"part_number": part_number, "company_id": current_user.company_id},
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
    # Filter by company_id
    parts = await db.parts.find(
        {"company_id": current_user.company_id}, 
        {"_id": 0}
    ).sort("created_at", -1).limit(100).to_list(100)
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
        # Filter by company_id
        supplier = await db.suppliers.find_one({
            "id": pricing_input.supplier_id,
            "company_id": current_user.company_id
        }, {"_id": 0})
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
    doc['company_id'] = current_user.company_id  # Add company_id
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('supplier_date'):
        doc['supplier_date'] = doc['supplier_date'].isoformat()
    
    await db.pricing_history.insert_one(doc)
    
    # Update part info - filter by company_id
    part_update = {
        "part_number": pricing_input.part_number,
        "part_name": pricing_input.part_name,
        "last_price": pricing_input.final_price,
        "last_pricing_date": doc['created_at'],
        "last_pricing_branch": pricing.branch_name,
        "is_available_in_stock": pricing_input.is_available,
        "supplier_used": supplier_name,
        "company_id": current_user.company_id
    }
    
    await db.parts.update_one(
        {"part_number": pricing_input.part_number, "company_id": current_user.company_id},
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
    # Always filter by company_id
    query = {"company_id": current_user.company_id}
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
    # Filter by company_id
    result = await db.pricing_history.delete_one({
        "id": pricing_id,
        "company_id": current_admin.company_id
    })
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
    doc['company_id'] = current_user.company_id  # Add company_id
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.customer_inquiries.insert_one(doc)
    return inquiry

@api_router.get("/inquiries", response_model=List[CustomerInquiry])
async def get_inquiries(
    customer_phone: Optional[str] = None,
    part_number: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    # Always filter by company_id
    query = {"company_id": current_user.company_id}
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
    doc['company_id'] = current_admin.company_id  # Add company_id
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.profit_margins.insert_one(doc)
    return margin

@api_router.get("/profit-margins", response_model=List[ProfitMargin])
async def get_profit_margins(current_user: User = Depends(get_current_user)):
    # Filter by company_id
    margins = await db.profit_margins.find(
        {"company_id": current_user.company_id}, 
        {"_id": 0}
    ).to_list(100)
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
    # Check for part-specific margin - filter by company_id
    specific_margin = await db.profit_margins.find_one(
        {"part_number": part_number, "company_id": current_user.company_id},
        {"_id": 0}
    )
    
    if specific_margin:
        margin_percentage = specific_margin['margin_percentage']
    else:
        # Get default margin for the company
        default_margin = await db.profit_margins.find_one(
            {"is_default": True, "company_id": current_user.company_id},
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
    # Filter all counts by company_id
    company_filter = {"company_id": current_user.company_id}
    
    # Total counts
    total_parts = await db.parts.count_documents(company_filter)
    total_inquiries = await db.customer_inquiries.count_documents(company_filter)
    total_suppliers = await db.suppliers.count_documents(company_filter)
    total_employees = await db.users.count_documents({**company_filter, "role": UserRole.EMPLOYEE})
    
    # Recent pricing - filter by company_id
    recent_pricing = await db.pricing_history.find(
        company_filter,
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    for rp in recent_pricing:
        if isinstance(rp.get('created_at'), str):
            rp['created_at'] = datetime.fromisoformat(rp['created_at'])
        if isinstance(rp.get('supplier_date'), str):
            rp['supplier_date'] = datetime.fromisoformat(rp['supplier_date'])
    
    # Inquiry trends (last 7 days) - filter by company_id
    from datetime import timedelta
    inquiry_trends = []
    for i in range(6, -1, -1):
        date = datetime.now(timezone.utc) - timedelta(days=i)
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        end_of_day = date.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
        
        count = await db.customer_inquiries.count_documents({
            **company_filter,
            "created_at": {"$gte": start_of_day, "$lte": end_of_day}
        })
        
        inquiry_trends.append({
            "date": date.strftime("%Y-%m-%d"),
            "count": count
        })
    
    # Top parts by inquiry - filter by company_id
    pipeline = [
        {"$match": company_filter},
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
    
    # Branch stats - filter by company_id
    pipeline = [
        {"$match": company_filter},
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
    # Filter by company_id for data isolation
    users = await db.users.find(
        {"company_id": current_admin.company_id}, 
        {"_id": 0, "password": 0}
    ).to_list(100)
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    return users

@api_router.put("/users/{user_id}/toggle-status")
async def toggle_user_status(user_id: str, current_admin: User = Depends(get_current_admin)):
    # Ensure user belongs to the same company
    user = await db.users.find_one({
        "id": user_id,
        "company_id": current_admin.company_id
    }, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    new_status = not user.get('is_active', True)
    await db.users.update_one(
        {"id": user_id, "company_id": current_admin.company_id}, 
        {"$set": {"is_active": new_status}}
    )
    return {"message": "تم تحديث حالة المستخدم بنجاح", "is_active": new_status}

# Update User
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    branch_id: Optional[str] = None
    role: Optional[str] = None

@api_router.put("/users/{user_id}", response_model=dict)
async def update_user(user_id: str, user_input: UserUpdate, current_admin: User = Depends(get_current_admin)):
    # Ensure user belongs to the same company
    user = await db.users.find_one({
        "id": user_id,
        "company_id": current_admin.company_id
    }, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # Prevent non-super-admin from changing roles
    if user_input.role and current_admin.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية لتغيير الدور")
    
    update_data = {k: v for k, v in user_input.model_dump().items() if v is not None}
    
    if update_data:
        await db.users.update_one(
            {"id": user_id, "company_id": current_admin.company_id},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one(
        {"id": user_id, "company_id": current_admin.company_id},
        {"_id": 0, "password": 0}
    )
    return {"message": "تم تحديث المستخدم بنجاح", "user": updated_user}

# Delete User
@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_admin: User = Depends(get_current_admin)):
    # Prevent deletion of super admin
    user = await db.users.find_one({
        "id": user_id,
        "company_id": current_admin.company_id
    }, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    if user.get('role') == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="لا يمكن حذف مدير النظام الخارق")
    
    result = await db.users.delete_one({
        "id": user_id,
        "company_id": current_admin.company_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    return {"message": "تم حذف المستخدم بنجاح"}

# Password Change
class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@api_router.put("/users/change-password")
async def change_password(password_data: PasswordChange, current_user: User = Depends(get_current_user)):
    # Get user with password
    user_doc = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # Verify current password
    if not verify_password(password_data.current_password, user_doc['password']):
        raise HTTPException(status_code=400, detail="كلمة المرور الحالية غير صحيحة")
    
    # Update password
    new_hashed = get_password_hash(password_data.new_password)
    await db.users.update_one({"id": current_user.id}, {"$set": {"password": new_hashed}})
    
    return {"message": "تم تغيير كلمة المرور بنجاح"}

# Company Settings
class CompanySettingsUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None

@api_router.put("/companies/settings")
async def update_company_settings(settings: CompanySettingsUpdate, current_admin: User = Depends(get_current_admin)):
    # Only admins can update company settings
    update_data = {k: v for k, v in settings.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")
    
    await db.companies.update_one(
        {"id": current_admin.company_id},
        {"$set": update_data}
    )
    
    return {"message": "تم تحديث إعدادات الشركة بنجاح"}

@api_router.get("/companies/current")
async def get_current_company(current_user: User = Depends(get_current_user)):
    company = await db.companies.find_one({"id": current_user.company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="الشركة غير موجودة")
    return company

# Super Admin - Company Management
@api_router.get("/admin/companies", response_model=List[dict])
async def get_all_companies(current_user: User = Depends(get_current_user)):
    # Only super admin can access this
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية للوصول لهذه البيانات")
    
    companies = await db.companies.find({}, {"_id": 0}).to_list(1000)
    for company in companies:
        if isinstance(company.get('created_at'), str):
            company['created_at'] = datetime.fromisoformat(company['created_at'])
    return companies

class CompanyCreate(BaseModel):
    name: str
    code: str
    contact_email: str
    subscription_plan: str = "basic"
    max_users: int = 10
    max_branches: int = 5

@api_router.post("/admin/companies", response_model=dict)
async def create_company(company_input: CompanyCreate, current_user: User = Depends(get_current_user)):
    # Only super admin can create companies
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية لإنشاء شركة")
    
    # Check if code already exists
    existing = await db.companies.find_one({"code": company_input.code})
    if existing:
        raise HTTPException(status_code=400, detail="رمز الشركة مستخدم بالفعل")
    
    company_id = str(uuid.uuid4())
    company_doc = {
        "id": company_id,
        "name": company_input.name,
        "code": company_input.code,
        "contact_email": company_input.contact_email,
        "logo_url": None,
        "primary_color": "#0F172A",
        "secondary_color": "#64748B",
        "subscription_plan": company_input.subscription_plan,
        "max_users": company_input.max_users,
        "max_branches": company_input.max_branches,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.companies.insert_one(company_doc)
    
    # Create default branch
    default_branch = {
        "id": str(uuid.uuid4()),
        "company_id": company_id,
        "name": "الفرع الرئيسي",
        "code": "MAIN",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.branches.insert_one(default_branch)
    
    return {"message": "تم إنشاء الشركة بنجاح", "company_id": company_id}

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    contact_email: Optional[str] = None
    is_active: Optional[bool] = None
    subscription_plan: Optional[str] = None
    max_users: Optional[int] = None
    max_branches: Optional[int] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None

@api_router.put("/admin/companies/{company_id}", response_model=dict)
async def update_company(company_id: str, company_input: CompanyUpdate, current_user: User = Depends(get_current_user)):
    # Only super admin can update companies
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية لتحديث الشركة")
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="الشركة غير موجودة")
    
    update_data = {k: v for k, v in company_input.model_dump().items() if v is not None}
    
    if update_data:
        await db.companies.update_one(
            {"id": company_id},
            {"$set": update_data}
        )
    
    updated_company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    return {"message": "تم تحديث الشركة بنجاح", "company": updated_company}

@api_router.delete("/admin/companies/{company_id}")
async def delete_company(company_id: str, current_user: User = Depends(get_current_user)):
    # Only super admin can delete companies
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية لحذف الشركة")
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="الشركة غير موجودة")
    
    # Delete company and all related data
    await db.companies.delete_one({"id": company_id})
    await db.users.delete_many({"company_id": company_id})
    await db.branches.delete_many({"company_id": company_id})
    await db.suppliers.delete_many({"company_id": company_id})
    await db.parts.delete_many({"company_id": company_id})
    await db.pricing_history.delete_many({"company_id": company_id})
    await db.customer_inquiries.delete_many({"company_id": company_id})
    await db.customer_inquiries_multi.delete_many({"company_id": company_id})
    await db.quotations.delete_many({"company_id": company_id})
    
    return {"message": "تم حذف الشركة وبياناتها بنجاح"}

@app.on_event("startup")
async def startup_db():
    # Create demo companies if not exist
    demo_companies = [
        {"name": "دُرّة السيارة", "code": "DURRA", "contact_email": "info@durra.com"},
        {"name": "تسعير - شركة تجريبية", "code": "DEMO", "contact_email": "demo@taseer.com"}
    ]
    
    for company_data in demo_companies:
        existing_company = await db.companies.find_one({"code": company_data["code"]})
        if not existing_company:
            company_id = str(uuid.uuid4())
            company_doc = {
                "id": company_id,
                "name": company_data["name"],
                "code": company_data["code"],
                "contact_email": company_data["contact_email"],
                "logo_url": None,
                "primary_color": "#0F172A",
                "secondary_color": "#64748B",
                "is_active": True,
                "subscription_plan": "basic",
                "max_users": 10,
                "max_branches": 5,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.companies.insert_one(company_doc)
            logger.info(f"تم إنشاء شركة: {company_data['name']} - رمز: {company_data['code']}")
            
            # Create default branch for the company
            default_branch = {
                "id": str(uuid.uuid4()),
                "company_id": company_id,
                "name": "الفرع الرئيسي",
                "code": "MAIN",
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.branches.insert_one(default_branch)
            
            # Create default profit margin
            default_margin = {
                "id": str(uuid.uuid4()),
                "company_id": company_id,
                "margin_percentage": 20.0,
                "is_default": True,
                "created_by": "system",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.profit_margins.insert_one(default_margin)
    
    # Create default super admin if not exists
    super_admin_exists = await db.users.find_one({"role": "super_admin"})
    if not super_admin_exists:
        # Get DURRA company
        durra_company = await db.companies.find_one({"code": "DURRA"}, {"_id": 0})
        if durra_company:
            super_admin = {
                "id": str(uuid.uuid4()),
                "company_id": durra_company['id'],
                "email": "superadmin@taseer.com",
                "full_name": "Super Admin",
                "role": "super_admin",
                "is_active": True,
                "password": get_password_hash("super123"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(super_admin)
            logger.info("تم إنشاء حساب Super Admin: superadmin@taseer.com / super123")
    
    # Create default admin for each company
    for company_data in demo_companies:
        company = await db.companies.find_one({"code": company_data["code"]}, {"_id": 0})
        if company:
            admin_email = f"admin@{company_data['code'].lower()}.com"
            admin_exists = await db.users.find_one({"email": admin_email, "company_id": company['id']})
            
            if not admin_exists:
                branch = await db.branches.find_one({"company_id": company['id']}, {"_id": 0})
                admin = {
                    "id": str(uuid.uuid4()),
                    "company_id": company['id'],
                    "email": admin_email,
                    "full_name": "مدير النظام",
                    "role": "admin",
                    "branch_id": branch['id'] if branch else None,
                    "branch_name": branch['name'] if branch else None,
                    "is_active": True,
                    "password": get_password_hash("admin123"),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.users.insert_one(admin)
                logger.info(f"تم إنشاء حساب المدير: {admin_email} / admin123 لشركة {company_data['name']}")

# Multi-Item Customer Inquiries Routes
@api_router.post("/inquiries/multi", response_model=dict)
async def create_multi_item_inquiry(inquiry_input: dict, current_user: User = Depends(get_current_user)):
    from models import CustomerInquiry, InquiryItem
    
    items = [InquiryItem(**item) for item in inquiry_input['items']]
    
    inquiry = CustomerInquiry(
        company_id=current_user.company_id,  # Add company_id to model constructor
        customer_name=inquiry_input['customer_name'],
        customer_phone=inquiry_input['customer_phone'],
        customer_email=inquiry_input.get('customer_email'),
        vin_number=inquiry_input.get('vin_number'),  # Add VIN number support
        items=[item.model_dump() for item in items],
        branch_id=current_user.branch_id or "main",
        branch_name=current_user.branch_name or "الفرع الرئيسي",
        employee_id=current_user.id,
        employee_name=current_user.full_name
    )
    
    doc = inquiry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.customer_inquiries_multi.insert_one(doc)
    # Remove MongoDB _id before returning
    doc.pop('_id', None)
    return {"success": True, "inquiry": doc}

@api_router.get("/inquiries/multi")
async def get_multi_item_inquiries(current_user: User = Depends(get_current_user)):
    # Filter by company_id
    query = {"company_id": current_user.company_id}
    if current_user.role == UserRole.EMPLOYEE and current_user.branch_id:
        query["branch_id"] = current_user.branch_id
    
    inquiries = await db.customer_inquiries_multi.find(query, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    for inq in inquiries:
        if isinstance(inq.get('created_at'), str):
            inq['created_at'] = datetime.fromisoformat(inq['created_at'])
    return inquiries

@api_router.get("/inquiries/multi/{inquiry_id}")
async def get_inquiry_by_id(inquiry_id: str, current_user: User = Depends(get_current_user)):
    # Filter by company_id
    inquiry = await db.customer_inquiries_multi.find_one({
        "id": inquiry_id,
        "company_id": current_user.company_id
    }, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="الاستفسار غير موجود")
    return inquiry

# Quotation Routes
@api_router.post("/quotations")
async def create_quotation(quotation_input: dict, current_user: User = Depends(get_current_user)):
    from models import Quotation, QuotationItem
    
    # Get inquiry - filter by company_id
    inquiry = await db.customer_inquiries_multi.find_one({
        "id": quotation_input['inquiry_id'],
        "company_id": current_user.company_id
    }, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="الاستفسار غير موجود")
    
    # Calculate totals
    items = [QuotationItem(**item) for item in quotation_input['items']]
    subtotal = sum(item.total_price for item in items)
    vat_amount = subtotal * 0.15
    total_amount = subtotal + vat_amount
    
    quotation = Quotation(
        company_id=current_user.company_id,  # Add company_id to model constructor
        inquiry_id=quotation_input['inquiry_id'],
        customer_name=inquiry['customer_name'],
        customer_phone=inquiry['customer_phone'],
        customer_email=inquiry.get('customer_email'),
        items=[item.model_dump() for item in items],
        subtotal=subtotal,
        vat_amount=vat_amount,
        total_amount=total_amount,
        notes=quotation_input.get('notes'),
        branch_id=current_user.branch_id or "main",
        branch_name=current_user.branch_name or "الفرع الرئيسي",
        employee_id=current_user.id,
        employee_name=current_user.full_name
    )
    
    doc = quotation.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.quotations.insert_one(doc)
    # Remove MongoDB _id before returning
    doc.pop('_id', None)
    
    # Update inquiry status
    await db.customer_inquiries_multi.update_one(
        {"id": quotation_input['inquiry_id']},
        {"$set": {"status": "quoted"}}
    )
    
    return {"success": True, "quotation": doc}

@api_router.get("/quotations")
async def get_quotations(current_user: User = Depends(get_current_user)):
    # Filter by company_id
    query = {"company_id": current_user.company_id}
    if current_user.role == UserRole.EMPLOYEE and current_user.branch_id:
        query["branch_id"] = current_user.branch_id
    
    quotations = await db.quotations.find(query, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return quotations

@api_router.get("/quotations/{quotation_id}/pdf")
async def download_quotation_pdf(quotation_id: str, current_user: User = Depends(get_current_user)):
    from fastapi.responses import Response
    from pdf_generator_v2 import QuotationPDFGeneratorV2
    
    # Filter by company_id
    quotation = await db.quotations.find_one({
        "id": quotation_id,
        "company_id": current_user.company_id
    }, {"_id": 0})
    if not quotation:
        raise HTTPException(status_code=404, detail="عرض الأسعار غير موجود")
    
    # Get company info for branding
    company = await db.companies.find_one({"id": current_user.company_id}, {"_id": 0})
    
    # Generate PDF with new generator (includes barcode support)
    pdf_generator = QuotationPDFGeneratorV2(company_info=company or {})
    pdf_bytes = pdf_generator.generate_quotation_pdf(quotation, company)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=quotation_{quotation['quotation_number']}.pdf"
        }
    )

# Excel Import/Export Routes
@api_router.get("/inventory/excel/template")
async def download_excel_template(current_admin: User = Depends(get_current_admin)):
    from fastapi.responses import Response
    from excel_handler import ExcelHandler
    
    excel_handler = ExcelHandler()
    excel_bytes = excel_handler.generate_template()
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=parts_template.xlsx"}
    )

@api_router.post("/inventory/excel/upload")
async def upload_excel_inventory(file: UploadFile = File(...), current_admin: User = Depends(get_current_admin)):
    from fastapi import UploadFile, File
    from excel_handler import ExcelHandler
    
    try:
        # Read file content
        contents = await file.read()
        
        # Parse Excel
        excel_handler = ExcelHandler()
        parts_data = excel_handler.parse_excel_file(contents)
        
        # Update database
        updated_count = 0
        added_count = 0
        
        for part_data in parts_data:
            # Add company_id to each part
            part_data['company_id'] = current_admin.company_id
            
            # Check if part exists for this company
            existing = await db.parts.find_one({
                "part_number": part_data['part_number'],
                "company_id": current_admin.company_id
            }, {"_id": 0})
            
            if existing:
                # Update existing part
                await db.parts.update_one(
                    {"part_number": part_data['part_number'], "company_id": current_admin.company_id},
                    {"$set": part_data}
                )
                updated_count += 1
            else:
                # Add new part
                part_data['id'] = str(uuid.uuid4())
                part_data['created_at'] = datetime.now(timezone.utc).isoformat()
                await db.parts.insert_one(part_data)
                added_count += 1
        
        return {
            "success": True,
            "message": "تم معالجة الملف بنجاح",
            "added": added_count,
            "updated": updated_count,
            "total": len(parts_data)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"خطأ في معالجة الملف: {str(e)}")

@api_router.get("/inventory/excel/export")
async def export_inventory_excel(current_admin: User = Depends(get_current_admin)):
    from fastapi.responses import Response
    from excel_handler import ExcelHandler
    
    # Get all parts for this company
    parts = await db.parts.find(
        {"company_id": current_admin.company_id}, 
        {"_id": 0}
    ).to_list(10000)
    
    # Convert to dict format
    parts_data = []
    for part in parts:
        parts_data.append({
            'part_number': part.get('part_number', ''),
            'part_name': part.get('part_name', ''),
            'car_brand': part.get('car_brand', ''),
            'car_model': part.get('car_model', ''),
            'car_year': part.get('car_year', ''),
            'purchase_price': part.get('purchase_price'),
            'selling_price': part.get('selling_price'),
            'stock_quantity': part.get('stock_quantity', 0)
        })
    
    excel_handler = ExcelHandler()
    excel_bytes = excel_handler.export_parts_to_excel(parts_data)
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=inventory_export.xlsx"}
    )

# Reports & Analytics Routes
@api_router.get("/reports/most-requested")
async def get_most_requested_parts(days: int = 30, current_user: User = Depends(get_current_user)):
    from datetime import timedelta
    
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}, "company_id": current_user.company_id}},
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.part_number",
            "part_name": {"$first": "$items.part_name"},
            "car_brand": {"$first": "$items.car_brand"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    
    results = await db.customer_inquiries_multi.aggregate(pipeline).to_list(10)
    
    return [{
        "part_number": r["_id"],
        "part_name": r.get("part_name", ""),
        "car_brand": r.get("car_brand", ""),
        "request_count": r["count"]
    } for r in results]

@api_router.get("/reports/most-quoted")
async def get_most_quoted_parts(days: int = 30, current_user: User = Depends(get_current_user)):
    from datetime import timedelta
    
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}, "company_id": current_user.company_id}},
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.part_number",
            "part_name": {"$first": "$items.part_name"},
            "car_brand": {"$first": "$items.car_brand"},
            "count": {"$sum": 1},
            "total_revenue": {"$sum": "$items.total_price"}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    
    results = await db.quotations.aggregate(pipeline).to_list(10)
    
    return [{
        "part_number": r["_id"],
        "part_name": r.get("part_name", ""),
        "car_brand": r.get("car_brand", ""),
        "quoted_count": r["count"],
        "total_revenue": r["total_revenue"]
    } for r in results]

# Include router after all routes are defined
app.include_router(api_router)

# Include company management router
try:
    from company_routes import company_router
    app.include_router(company_router, prefix="/api")
except Exception as e:
    logger.warning(f"Could not load company_router: {e}")

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()