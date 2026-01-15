from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone

class UserRole:
    SUPER_ADMIN = "super_admin"  # SaaS Owner
    ADMIN = "admin"  # Company Admin
    EMPLOYEE = "employee"

# Company Model (Multi-Tenant)
class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str  # Unique company code for login
    subdomain: Optional[str] = None  # Optional subdomain
    logo_url: Optional[str] = None
    primary_color: str = "#0F172A"
    secondary_color: str = "#64748B"
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: bool = True
    subscription_plan: str = "basic"  # basic, pro, enterprise
    max_users: int = 10
    max_branches: int = 5
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompanyCreate(BaseModel):
    name: str
    code: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

class CompanySettings(BaseModel):
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None

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
    company_code: str  # Company identifier for multi-tenant
    email: EmailStr
    password: str
    full_name: str
    role: str
    branch_id: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User
    company: Optional[dict] = None  # Include company info

class Branch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str  # Multi-tenant key
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
    company_id: str  # Multi-tenant key
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
    company_id: str  # Multi-tenant key
    part_number: str
    part_name: Optional[str] = None
    car_brand: Optional[str] = None
    car_model: Optional[str] = None
    car_year: Optional[str] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    stock_quantity: Optional[int] = 0
    last_price: Optional[float] = None
    last_pricing_date: Optional[datetime] = None
    last_pricing_branch: Optional[str] = None
    is_available_in_stock: Optional[bool] = None
    supplier_used: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PartCreate(BaseModel):
    part_number: str
    part_name: Optional[str] = None
    car_brand: Optional[str] = None
    car_model: Optional[str] = None
    car_year: Optional[str] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    stock_quantity: Optional[int] = 0

class PricingHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str  # Multi-tenant key
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

# New Multi-Item Inquiry Models
class InquiryItem(BaseModel):
    part_number: str
    part_name: Optional[str] = None
    car_brand: Optional[str] = None
    car_model: Optional[str] = None
    car_year: Optional[str] = None
    quoted_price: Optional[float] = None
    notes: Optional[str] = None

class CustomerInquiry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str  # Multi-tenant key
    inquiry_number: str = Field(default_factory=lambda: f"INQ-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}")
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    vin_number: Optional[str] = None  # VIN number (optional)
    items: List[InquiryItem]
    total_amount: Optional[float] = None
    branch_id: str
    branch_name: str
    employee_id: str
    employee_name: str
    status: str = "pending"  # pending, quoted, completed, cancelled
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InquiryCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    items: List[InquiryItem]

# Quotation Models
class QuotationItem(BaseModel):
    part_number: str
    part_name: str
    car_brand: Optional[str] = None
    car_model: Optional[str] = None
    car_year: Optional[str] = None
    quantity: int = 1
    unit_price: float
    total_price: float

class Quotation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str  # Multi-tenant key
    quotation_number: str = Field(default_factory=lambda: f"QT-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}")
    inquiry_id: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    items: List[QuotationItem]
    subtotal: float
    vat_amount: float
    total_amount: float
    notes: Optional[str] = None
    branch_id: str
    branch_name: str
    employee_id: str
    employee_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuotationCreate(BaseModel):
    inquiry_id: str
    items: List[QuotationItem]
    notes: Optional[str] = None

class ProfitMargin(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str  # Multi-tenant key
    part_number: Optional[str] = None
    margin_percentage: float
    is_default: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class ProfitMarginCreate(BaseModel):
    part_number: Optional[str] = None
    margin_percentage: float
    is_default: bool = False
