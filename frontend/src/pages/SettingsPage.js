import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '.@/components/ui/card';
import { Button } from '.@/components/ui/button';
import { Input } from '.@/components/ui/input';
import { Label } from '.@/components/ui/label';
import { Separator } from '.@/components/ui/separator';
import { Building2, User, Palette, Upload, Save, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const SettingsPage = () => {
  const { user, company, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [companySettings, setCompanySettings] = useState({
    name: company?.name || '',
    logo_url: company?.logo_url || '',
    primary_color: company?.primary_color || '#0F172A',
    secondary_color: company?.secondary_color || '#64748B'
  });
  
  const [userSettings, setUserSettings] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    if (company) {
      setCompanySettings({
        name: company.name || '',
        logo_url: company.logo_url || '',
        primary_color: company.primary_color || '#0F172A',
        secondary_color: company.secondary_color || '#64748B'
      });
    }
    if (user) {
      setUserSettings(prev => ({
        ...prev,
        full_name: user.full_name || '',
        email: user.email || ''
      }));
    }
  }, [company, user]);

  const handleSaveCompanySettings = async () => {
    setLoading(true);
    try {
      await axios.put(`${API}/companies/settings`, companySettings);
      toast.success('تم حفظ إعدادات الشركة بنجاح');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل حفظ الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (userSettings.new_password !== userSettings.confirm_password) {
      toast.error('كلمات المرور غير متطابقة');
      return;
    }
    
    if (userSettings.new_password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${API}/users/change-password`, {
        current_password: userSettings.current_password,
        new_password: userSettings.new_password
      });
      toast.success('تم تغيير كلمة المرور بنجاح');
      setUserSettings(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <div className="space-y-6" dir="rtl" data-testid="settings-page">
      <div>
        <h1 className="text-3xl font-bold text-primary">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">إدارة إعدادات الحساب والشركة</p>
      </div>

      {/* معلومات المستخدم */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            معلومات الحساب
          </CardTitle>
          <CardDescription>معلومات حسابك الشخصي</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>الاسم الكامل</Label>
              <Input
                data-testid="user-fullname"
                value={userSettings.full_name}
                onChange={(e) => setUserSettings({ ...userSettings, full_name: e.target.value })}
                disabled
              />
            </div>
            <div>
              <Label>البريد الإلكتروني</Label>
              <Input
                data-testid="user-email"
                value={userSettings.email}
                disabled
                dir="ltr"
                className="text-right"
              />
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <h3 className="font-medium">تغيير كلمة المرور</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>كلمة المرور الحالية</Label>
              <Input
                data-testid="current-password"
                type="password"
                value={userSettings.current_password}
                onChange={(e) => setUserSettings({ ...userSettings, current_password: e.target.value })}
              />
            </div>
            <div>
              <Label>كلمة المرور الجديدة</Label>
              <Input
                data-testid="new-password"
                type="password"
                value={userSettings.new_password}
                onChange={(e) => setUserSettings({ ...userSettings, new_password: e.target.value })}
              />
            </div>
            <div>
              <Label>تأكيد كلمة المرور</Label>
              <Input
                data-testid="confirm-password"
                type="password"
                value={userSettings.confirm_password}
                onChange={(e) => setUserSettings({ ...userSettings, confirm_password: e.target.value })}
              />
            </div>
          </div>
          <Button
            data-testid="change-password-btn"
            onClick={handleChangePassword}
            disabled={loading || !userSettings.current_password || !userSettings.new_password}
          >
            <Save className="ml-2 h-4 w-4" />
            تغيير كلمة المرور
          </Button>
        </CardContent>
      </Card>

      {/* إعدادات الشركة - للمدراء فقط */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              إعدادات الشركة
            </CardTitle>
            <CardDescription>تخصيص العلامة التجارية للشركة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>اسم الشركة</Label>
                <Input
                  data-testid="company-name"
                  value={companySettings.name}
                  onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
                />
              </div>
              <div>
                <Label>رابط الشعار (URL)</Label>
                <Input
                  data-testid="company-logo"
                  value={companySettings.logo_url || ''}
                  onChange={(e) => setCompanySettings({ ...companySettings, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  dir="ltr"
                  className="text-right"
                />
              </div>
            </div>

            <Separator className="my-4" />

            <h3 className="font-medium flex items-center gap-2">
              <Palette className="w-4 h-4" />
              ألوان العلامة التجارية
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>اللون الرئيسي</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={companySettings.primary_color}
                    onChange={(e) => setCompanySettings({ ...companySettings, primary_color: e.target.value })}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={companySettings.primary_color}
                    onChange={(e) => setCompanySettings({ ...companySettings, primary_color: e.target.value })}
                    dir="ltr"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label>اللون الثانوي</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={companySettings.secondary_color}
                    onChange={(e) => setCompanySettings({ ...companySettings, secondary_color: e.target.value })}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={companySettings.secondary_color}
                    onChange={(e) => setCompanySettings({ ...companySettings, secondary_color: e.target.value })}
                    dir="ltr"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* معاينة الألوان */}
            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-2">معاينة:</p>
              <div className="flex gap-4 items-center">
                <div
                  className="w-20 h-10 rounded flex items-center justify-center text-white text-sm"
                  style={{ backgroundColor: companySettings.primary_color }}
                >
                  رئيسي
                </div>
                <div
                  className="w-20 h-10 rounded flex items-center justify-center text-white text-sm"
                  style={{ backgroundColor: companySettings.secondary_color }}
                >
                  ثانوي
                </div>
              </div>
            </div>

            <Button
              data-testid="save-company-settings"
              onClick={handleSaveCompanySettings}
              disabled={loading}
            >
              <Save className="ml-2 h-4 w-4" />
              حفظ إعدادات الشركة
            </Button>
          </CardContent>
        </Card>
      )}

      {/* زر تسجيل الخروج */}
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-destructive">تسجيل الخروج</h3>
              <p className="text-sm text-muted-foreground">الخروج من حسابك الحالي</p>
            </div>
            <Button
              data-testid="logout-btn"
              variant="destructive"
              onClick={handleLogout}
            >
              <LogOut className="ml-2 h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
