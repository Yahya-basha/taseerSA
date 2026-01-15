import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '.@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '.@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, FileText } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const ReportsPage = () => {
  const [mostRequested, setMostRequested] = useState([]);
  const [mostQuoted, setMostQuoted] = useState([]);
  const [timePeriod, setTimePeriod] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [timePeriod]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [requestedRes, quotedRes] = await Promise.all([
        axios.get(`${API}/reports/most-requested?days=${timePeriod}`),
        axios.get(`${API}/reports/most-quoted?days=${timePeriod}`)
      ]);

      setMostRequested(requestedRes.data);
      setMostQuoted(quotedRes.data);
    } catch (error) {
      toast.error('فشل تحميل التقارير');
    } finally {
      setLoading(false);
    }
  };

  const timePeriods = [
    { value: '7', label: 'آخر 7 أيام' },
    { value: '30', label: 'آخر 30 يوم' },
    { value: '90', label: 'آخر 3 أشهر' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl" data-testid="reports-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">التقارير والتحليلات</h1>
          <p className="text-muted-foreground mt-1">تحليل بيانات القطع والمبيعات</p>
        </div>
        <div className="w-48">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger data-testid="time-period-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timePeriods.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Most Requested Parts Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            أكثر القطع طلباً
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mostRequested.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={mostRequested}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="part_number" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="request_count" fill="#3B82F6" name="عدد الطلبات" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد بيانات متاحة
            </div>
          )}
        </CardContent>
      </Card>

      {/* Most Quoted Parts Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-success" />
            أكثر القطع في عروض الأسعار
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mostQuoted.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={mostQuoted}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="part_number" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quoted_count" fill="#10B981" name="عدد عروض الأسعار" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد بيانات متاحة
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Most Requested Table */}
        <Card>
          <CardHeader>
            <CardTitle>تفاصيل القطع الأكثر طلباً</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full data-table" data-testid="most-requested-table">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-3 text-right">#</th>
                    <th className="py-2 px-3 text-right">رقم القطعة</th>
                    <th className="py-2 px-3 text-right">الاسم</th>
                    <th className="py-2 px-3 text-right">العدد</th>
                  </tr>
                </thead>
                <tbody>
                  {mostRequested.map((part, index) => (
                    <tr key={index} className="border-b hover:bg-secondary/50">
                      <td className="py-2 px-3">{index + 1}</td>
                      <td className="py-2 px-3 font-mono">{part.part_number}</td>
                      <td className="py-2 px-3">{part.part_name || '-'}</td>
                      <td className="py-2 px-3 font-numbers font-bold text-accent">{part.request_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Most Quoted Table */}
        <Card>
          <CardHeader>
            <CardTitle>تفاصيل القطع الأكثر في عروض الأسعار</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full data-table" data-testid="most-quoted-table">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-3 text-right">#</th>
                    <th className="py-2 px-3 text-right">رقم القطعة</th>
                    <th className="py-2 px-3 text-right">الاسم</th>
                    <th className="py-2 px-3 text-right">العدد</th>
                    <th className="py-2 px-3 text-right">الإيرادات</th>
                  </tr>
                </thead>
                <tbody>
                  {mostQuoted.map((part, index) => (
                    <tr key={index} className="border-b hover:bg-secondary/50">
                      <td className="py-2 px-3">{index + 1}</td>
                      <td className="py-2 px-3 font-mono">{part.part_number}</td>
                      <td className="py-2 px-3">{part.part_name || '-'}</td>
                      <td className="py-2 px-3 font-numbers font-bold text-success">{part.quoted_count}</td>
                      <td className="py-2 px-3 font-numbers font-bold">{part.total_revenue?.toFixed(2) || '0.00'} ر.س</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};