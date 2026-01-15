import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Package } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const PartsPage = () => {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      const response = await axios.get(`${API}/parts`);
      setParts(response.data);
    } catch (error) {
      toast.error('فشل تحميل القطع');
    } finally {
      setLoading(false);
    }
  };

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
    <div className="space-y-6" dir="rtl" data-testid="parts-page">
      <div>
        <h1 className="text-3xl font-bold text-primary">إدارة القطع</h1>
        <p className="text-muted-foreground mt-1">قائمة بجميع القطع التي تم تسعيرها</p>
      </div>

      {parts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا توجد قطع بعد</p>
            <p className="text-sm text-muted-foreground mt-2">قم بإضافة تسعير للقطع من صفحة التسعير</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full data-table" data-testid="parts-table">
                <thead>
                  <tr className="border-b bg-secondary">
                    <th className="py-3 px-4 text-right font-medium">رقم القطعة</th>
                    <th className="py-3 px-4 text-right font-medium">اسم القطعة</th>
                    <th className="py-3 px-4 text-right font-medium">آخر سعر</th>
                    <th className="py-3 px-4 text-right font-medium">تاريخ التسعير</th>
                    <th className="py-3 px-4 text-right font-medium">الفرع</th>
                    <th className="py-3 px-4 text-right font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((part, index) => (
                    <tr key={part.id} className="border-b hover:bg-secondary/50" data-testid={`part-row-${index}`}>
                      <td className="py-3 px-4 font-mono">{part.part_number}</td>
                      <td className="py-3 px-4">{part.part_name || '-'}</td>
                      <td className="py-3 px-4 font-numbers font-bold">
                        {part.last_price ? `${part.last_price.toFixed(2)} ر.س` : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {part.last_pricing_date
                          ? new Date(part.last_pricing_date).toLocaleDateString('ar-SA')
                          : '-'}
                      </td>
                      <td className="py-3 px-4">{part.last_pricing_branch || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          part.is_available_in_stock
                            ? 'bg-success text-white'
                            : 'bg-warning text-white'
                        }`}>
                          {part.is_available_in_stock ? 'متوفر' : 'غير متوفر'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};