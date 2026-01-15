import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Edit2, Trash2, AlertCircle, Building2, Toggle2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AdminDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [deleteCompanyId, setDeleteCompanyId] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contact_email: '',
    subscription_plan: 'basic',
    max_users: 10,
    max_branches: 5,
    is_active: true,
    logo_url: '',
    primary_color: '#0F172A',
    secondary_color: '#64748B'
  });

  // Redirect if not super admin
  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await axios.get(`${API}/admin/companies`);
      setCompanies(response.data);
    } catch (error) {
      toast.error('فشل تحميل الشركات');
    }
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/png')) {
      toast.error('يجب أن يكون الملف من نوع PNG');
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      toast.error('حجم الملف يجب أن لا يتجاوز 1 ميجابايت');
      return;
    }

    // In a real app, you would upload to a server or cloud storage
    // For now, we'll create a data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData({ ...formData, logo_url: e.target.result });
      toast.success('تم تحميل الشعار بنجاح');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingCompanyId) {
        // Update company
        await axios.put(`${API}/admin/companies/${editingCompanyId}`, formData);
        toast.success('تم تحديث الشركة بنجاح');
      } else {
        // Create new company
        await axios.post(`${API}/admin/companies`, formData);
        toast.success('تم إنشاء الشركة بنجاح');
      }
      setShowDialog(false);
      resetForm();
      fetchCompanies();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشلت العملية');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (company) => {
    setEditingCompanyId(company.id);
    setFormData({
      name: company.name,
      code: company.code,
      contact_email: company.contact_email,
      subscription_plan: company.subscription_plan || 'basic',
      max_users: company.max_users || 10,
      max_branches: company.max_branches || 5,
      is_active: company.is_active,
      logo_url: company.logo_url || '',
      primary_color: company.primary_color || '#0F172A',
      secondary_color: company.secondary_color || '#64748B'
    });
    setShowDialog(true);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await axios.delete(`${API}/admin/companies/${deleteCompanyId}`);
      toast.success('تم حذف الشركة وبياناتها بنجاح');
      setShowDeleteConfirm(false);
      setDeleteCompanyId(null);
      fetchCompanies();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل حذف الشركة');
    } finally {
      setLoading(false);
    }
  };

  const toggleCompanyStatus = async (companyId, currentStatus) => {
    try {
      await axios.put(`${API}/admin/companies/${companyId}`, {
        is_active: !currentStatus
      });
      toast.success('تم تحديث حالة الشركة');
      fetchCompanies();
    } catch (error) {
      toast.error('فشل تحديث الحالة');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      contact_email: '',
      subscription_plan: 'basic',
      max_users: 10,
      max_branches: 5,
      is_active: true,
      logo_url: '',
      primary_color: '#0F172A',
      secondary_color: '#64748B'
    });
    setEditingCompanyId(null);
    setLogoFile(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  if (user?.role !== 'super_admin') {
    return null;
  }

  return (
    <div className="space-y-6" dir="rtl" data-testid="admin-dashboard-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">لوحة تحكم مدير النظام</h1>
          <p className="text-muted-foreground mt-1">إدارة الشركات والإعدادات العامة</p>
        </div>
        <Button onClick={openAddDialog} data-testid="add-company-button">
          <Plus className="ml-2 h-4 w-4" />
          إضافة شركة
        </Button>
      </div>

      {/* Companies List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map((company) => (
          <Card key={company.id} className="card-hover">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    {company.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    رمز الشركة: <span className="font-mono">{company.code}</span>
                  </CardDescription>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  company.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {company.is_active ? 'نشطة' : 'معطلة'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">البريد الإلكتروني:</span>
                  <span dir="ltr" className="text-right">{company.contact_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">خطة الاشتراك:</span>
                  <span>{company.subscription_plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">عدد المستخدمين:</span>
                  <span>{company.max_users}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">عدد الفروع:</span>
                  <span>{company.max_branches}</span>
                </div>
              </div>

              {/* Company Colors Preview */}
              <div className="flex gap-2">
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: company.primary_color }}
                  title="اللون الرئيسي"
                />
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: company.secondary_color }}
                  title="اللون الثانوي"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(company)}
                  data-testid={`edit-company-${company.id}`}
                  className="flex-1"
                >
                  <Edit2 className="h-4 w-4 ml-2" />
                  تعديل
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleCompanyStatus(company.id, company.is_active)}
                  data-testid={`toggle-company-${company.id}`}
                >
                  <Toggle2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setDeleteCompanyId(company.id);
                    setShowDeleteConfirm(true);
                  }}
                  data-testid={`delete-company-${company.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Company Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCompanyId ? 'تعديل الشركة' : 'إضافة شركة جديدة'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">اسم الشركة *</Label>
                <Input
                  id="name"
                  data-testid="company-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="code">رمز الشركة *</Label>
                <Input
                  id="code"
                  data-testid="company-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  disabled={editingCompanyId ? true : false}
                  dir="ltr"
                  className="text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_email">البريد الإلكتروني *</Label>
                <Input
                  id="contact_email"
                  data-testid="company-email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  required
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div>
                <Label htmlFor="subscription_plan">خطة الاشتراك *</Label>
                <Input
                  id="subscription_plan"
                  data-testid="subscription-plan"
                  value={formData.subscription_plan}
                  onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max_users">عدد المستخدمين الأقصى</Label>
                <Input
                  id="max_users"
                  data-testid="max-users"
                  type="number"
                  value={formData.max_users}
                  onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="max_branches">عدد الفروع الأقصى</Label>
                <Input
                  id="max_branches"
                  data-testid="max-branches"
                  type="number"
                  value={formData.max_branches}
                  onChange={(e) => setFormData({ ...formData, max_branches: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div>
              <Label htmlFor="logo">شعار الشركة (PNG، بحد أقصى 1 ميجابايت)</Label>
              <div className="flex gap-2">
                <Input
                  id="logo"
                  data-testid="company-logo"
                  type="file"
                  accept="image/png"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleLogoUpload(e.target.files[0]);
                    }
                  }}
                />
              </div>
              {formData.logo_url && (
                <div className="mt-2">
                  <img
                    src={formData.logo_url}
                    alt="Company Logo"
                    className="h-16 w-auto border rounded p-1"
                  />
                </div>
              )}
            </div>

            {/* Colors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary_color">اللون الرئيسي</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    dir="ltr"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="secondary_color">اللون الثانوي</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    dir="ltr"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading} data-testid="submit-company-button">
                {editingCompanyId ? 'تحديث' : 'إنشاء'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              هل أنت متأكد من رغبتك في حذف هذه الشركة وجميع بياناتها؟ لا يمكن التراجع عن هذه العملية.
            </AlertDescription>
          </Alert>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
              data-testid="confirm-delete-company-button"
            >
              حذف الشركة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
