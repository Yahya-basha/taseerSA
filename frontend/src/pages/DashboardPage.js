import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Package, FileText, TrendingUp, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ['#0F172A', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      toast.error('فشل تحميل بيانات لوحة التحكم');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="dashboard-loading">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { title: 'إجمالي القطع', value: stats?.total_parts || 0, icon: Package, color: 'text-blue-600' },
    { title: 'الاستفسارات', value: stats?.total_inquiries || 0, icon: FileText, color: 'text-green-600' },
    { title: 'الموردين', value: stats?.total_suppliers || 0, icon: TrendingUp, color: 'text-amber-600' },
    { title: 'الموظفين', value: stats?.total_employees || 0, icon: Users, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6" dir="rtl" data-testid="dashboard-page">
      {/* Header */}
      <div className="dashboard-header rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold">لوحة التحكم</h1>
        <p className="text-gray-200 mt-2">مرحبًا بك في نظام إدارة تسعير قطع الغيار</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="card-hover" data-testid={`stat-card-${index}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold font-numbers mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full bg-secondary ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inquiry Trends */}
        <Card>
          <CardHeader>
            <CardTitle>اتجاهات الاستفسارات (آخر 7 أيام)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.inquiry_trends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" name="عدد الاستفسارات" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Branch Stats */}
        <Card>
          <CardHeader>
            <CardTitle>إحصائيات الفروع</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.branch_stats || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.branch_name}: ${entry.inquiry_count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="inquiry_count"
                >
                  {(stats?.branch_stats || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>آخر عمليات التسعير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full data-table" data-testid="recent-pricing-table">
              <thead>
                <tr className="border-b">
                  <th className="py-3 px-4 text-right font-medium">رقم القطعة</th>
                  <th className="py-3 px-4 text-right font-medium">اسم القطعة</th>
                  <th className="py-3 px-4 text-right font-medium">الفرع</th>
                  <th className="py-3 px-4 text-right font-medium">السعر</th>
                  <th className="py-3 px-4 text-right font-medium">الموظف</th>
                  <th className="py-3 px-4 text-right font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recent_pricing?.slice(0, 5).map((pricing, index) => (
                  <tr key={index} className="border-b hover:bg-secondary/50" data-testid={`pricing-row-${index}`}>
                    <td className="py-3 px-4 font-mono">{pricing.part_number}</td>
                    <td className="py-3 px-4">{pricing.part_name || '-'}</td>
                    <td className="py-3 px-4">{pricing.branch_name}</td>
                    <td className="py-3 px-4 font-numbers font-bold">{pricing.final_price.toFixed(2)} ر.س</td>
                    <td className="py-3 px-4">{pricing.employee_name}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {new Date(pricing.created_at).toLocaleDateString('ar-SA')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!stats?.recent_pricing || stats.recent_pricing.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد عمليات تسعير حديثة
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Parts */}
      <Card>
        <CardHeader>
          <CardTitle>أكثر القطع استفسارًا</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.top_parts?.map((part, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-secondary rounded-lg" data-testid={`top-part-${index}`}>
                <div>
                  <p className="font-medium">{part.part_number}</p>
                  <p className="text-sm text-muted-foreground">{part.part_name || 'غير محدد'}</p>
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold font-numbers text-accent">{part.inquiry_count}</p>
                  <p className="text-xs text-muted-foreground">استفسار</p>
                </div>
              </div>
            ))}
            {(!stats?.top_parts || stats.top_parts.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد بيانات متاحة
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};