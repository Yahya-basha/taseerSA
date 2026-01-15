import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const InquiriesPage = () => {
  const [inquiries, setInquiries] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [searchPart, setSearchPart] = useState('');

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    part_number: '',
    part_name: '',
    quoted_price: '',
    price_source: 'مخزون'
  });

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async (phone = '', part = '') => {
    try {
      const params = {};
      if (phone) params.customer_phone = phone;
      if (part) params.part_number = part;

      const response = await axios.get(`${API}/inquiries`, { params });
      setInquiries(response.data);
    } catch (error) {
      toast.error('فشل تحميل الاستفسارات');
    }
  };

  const handleSearch = () => {
    fetchInquiries(searchPhone, searchPart);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/inquiries`, {
        ...formData,
        quoted_price: parseFloat(formData.quoted_price)
      });
      toast.success('تم حفظ الاستفسار بنجاح');
      setShowDialog(false);
      resetForm();
      fetchInquiries();
    } catch (error) {
      toast.error('فشل حفظ الاستفسار');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_phone: '',
      part_number: '',
      part_name: '',
      quoted_price: '',
      price_source: 'مخزون'
    });
  };

  return (
    <div className="space-y-6" dir="rtl" data-testid="inquiries-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">استفسارات العملاء</h1>
          <p className="text-muted-foreground mt-1">سجل استفسارات العملاء عن القطع</p>
        </div>
        <Button onClick={() => setShowDialog(true)} data-testid="add-inquiry-button">
          <Plus className="ml-2 h-4 w-4" />
          إضافة استفسار
        </Button>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>بحث في الاستفسارات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              data-testid="search-phone-input"
              placeholder="رقم جوال العميل"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              dir="ltr"
              className="text-right"
            />
            <Input
              data-testid="search-part-input"
              placeholder="رقم القطعة"
              value={searchPart}
              onChange={(e) => setSearchPart(e.target.value)}
              dir="ltr"
              className="text-right"
            />
            <Button onClick={handleSearch} data-testid="search-inquiries-button">
              <Search className="ml-2 h-4 w-4" />
              بحث
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inquiries Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full data-table" data-testid="inquiries-table">
              <thead>
                <tr className="border-b bg-secondary">
                  <th className="py-3 px-4 text-right font-medium">التاريخ</th>
                  <th className="py-3 px-4 text-right font-medium">اسم العميل</th>
                  <th className="py-3 px-4 text-right font-medium">رقم الجوال</th>
                  <th className="py-3 px-4 text-right font-medium">رقم القطعة</th>
                  <th className="py-3 px-4 text-right font-medium">اسم القطعة</th>
                  <th className="py-3 px-4 text-right font-medium">السعر</th>
                  <th className="py-3 px-4 text-right font-medium">المصدر</th>
                  <th className="py-3 px-4 text-right font-medium">الفرع</th>
                  <th className="py-3 px-4 text-right font-medium">الموظف</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inquiry, index) => (
                  <tr key={inquiry.id} className="border-b hover:bg-secondary/50" data-testid={`inquiry-row-${index}`}>
                    <td className="py-3 px-4 text-sm">
                      {new Date(inquiry.created_at).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="py-3 px-4">{inquiry.customer_name}</td>
                    <td className="py-3 px-4 font-mono" dir="ltr">{inquiry.customer_phone}</td>
                    <td className="py-3 px-4 font-mono">{inquiry.part_number}</td>
                    <td className="py-3 px-4">{inquiry.part_name || '-'}</td>
                    <td className="py-3 px-4 font-numbers font-bold">{inquiry.quoted_price.toFixed(2)} ر.س</td>
                    <td className="py-3 px-4">{inquiry.price_source}</td>
                    <td className="py-3 px-4">{inquiry.branch_name}</td>
                    <td className="py-3 px-4 text-sm">{inquiry.employee_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {inquiries.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                لا توجد استفسارات
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Inquiry Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة استفسار جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_name">اسم العميل *</Label>
                <Input
                  id="customer_name"
                  data-testid="inquiry-customer-name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="customer_phone">رقم الجوال *</Label>
                <Input
                  id="customer_phone"
                  data-testid="inquiry-customer-phone"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  required
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div>
                <Label htmlFor="part_number">رقم القطعة *</Label>
                <Input
                  id="part_number"
                  data-testid="inquiry-part-number"
                  value={formData.part_number}
                  onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                  required
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div>
                <Label htmlFor="part_name">اسم القطعة</Label>
                <Input
                  id="part_name"
                  data-testid="inquiry-part-name"
                  value={formData.part_name}
                  onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="quoted_price">السعر المعروض *</Label>
                <Input
                  id="quoted_price"
                  data-testid="inquiry-quoted-price"
                  type="number"
                  step="0.01"
                  value={formData.quoted_price}
                  onChange={(e) => setFormData({ ...formData, quoted_price: e.target.value })}
                  required
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div>
                <Label htmlFor="price_source">مصدر السعر *</Label>
                <Input
                  id="price_source"
                  data-testid="inquiry-price-source"
                  value={formData.price_source}
                  onChange={(e) => setFormData({ ...formData, price_source: e.target.value })}
                  placeholder="مخزون / مورد"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading} data-testid="submit-inquiry-button">
                حفظ
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};