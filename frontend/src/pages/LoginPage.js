import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '.@/contexts/AuthContext';
import { Button } from '.@/components/ui/button';
import { Input } from '.@/components/ui/input';
import { Label } from '.@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '.@/components/ui/card';
import { LogIn, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const LoginPage = () => {
  const [companyCode, setCompanyCode] = useState('DURRA');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Format: company_code:email
    const username = companyCode ? `${companyCode}:${email}` : email;
    const result = await login(username, password);
    
    if (result.success) {
      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/dashboard');
    } else {
      toast.error(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center login-background" dir="rtl">
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(15,23,42,0.8)] to-[rgba(15,23,42,0.95)]"></div>
      
      <Card className="w-full max-w-md mx-4 relative z-10 shadow-2xl" data-testid="login-card">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold text-primary">تسعيّر</CardTitle>
          <CardDescription className="text-base">
            نظام إدارة تسعير قطع الغيار للشركات
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyCode">رمز الشركة</Label>
              <Input
                id="companyCode"
                type="text"
                data-testid="company-code-input"
                placeholder="DURRA"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                required
                dir="ltr"
                className="text-right"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                data-testid="email-input"
                placeholder="admin@durra.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
                className="text-right"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                data-testid="password-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
                className="text-right"
              />
            </div>
            
            <Button
              type="submit"
              data-testid="login-button"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                <>
                  <LogIn className="ml-2 h-4 w-4" />
                  تسجيل الدخول
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-secondary rounded-md">
            <p className="text-sm text-center text-muted-foreground mb-3">
              <strong>حسابات تجريبية:</strong>
            </p>
            <div className="space-y-2 text-xs">
              <div>
                <p className="font-bold">شركة دُرّة السيارة:</p>
                <p className="font-mono">رمز الشركة: DURRA</p>
                <p className="font-mono">البريد: admin@durra.com</p>
                <p className="font-mono">كلمة المرور: admin123</p>
              </div>
              <div className="border-t pt-2 mt-2">
                <p className="font-bold">شركة تجريبية:</p>
                <p className="font-mono">رمز الشركة: DEMO</p>
                <p className="font-mono">البريد: admin@demo.com</p>
                <p className="font-mono">كلمة المرور: admin123</p>
              </div>
              <div className="border-t pt-2 mt-2">
                <p className="font-bold text-accent">Super Admin:</p>
                <p className="font-mono">رمز الشركة: DURRA</p>
                <p className="font-mono">البريد: superadmin@taseer.com</p>
                <p className="font-mono">كلمة المرور: super123</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};