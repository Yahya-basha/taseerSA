import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Trash2, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// قائمة ماركات السيارات المدعومة
const CAR_BRANDS = [
  { value: 'hyundai', label: 'هيونداي' },
  { value: 'kia', label: 'كيا' }
];

export const MultiInquiriesPage = () => {
  const [inquiries, setInquiries] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showQuotationDialog, setShowQuotationDialog] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    vin_number: '', // رقم الهيكل (اختياري)
    items: [
      {
        part_number: '',
        part_name: '',
        car_brand: ''
      }
    ]
  });

  const [quotationForm, setQuotationForm] = useState({
    items: []
  });

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      const response = await axios.get(`${API}/inquiries/multi`);
      setInquiries(response.data);
    } catch (error) {
      toast.error('فشل تحميل الاستفسارات');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          part_number: '',
          part_name: '',
          car_brand: ''
        }
      ]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/inquiries/multi`, formData);
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
      vin_number: '',
      items: [
        {
          part_number: '',
          part_name: '',
          car_brand: ''
        }
      ]
    });
  };
  
  // دالة للحصول على اسم الماركة بالعربي
  const getCarBrandLabel = (value) => {
    const brand = CAR_BRANDS.find(b => b.value === value);
    return brand ? brand.label : value;
  };

  const openQuotationDialog = (inquiry) => {
    setSelectedInquiry(inquiry);
    setQuotationForm({
      inquiry_id: inquiry.id,
      items: inquiry.items.map(item => ({
        ...item,
        quantity: 1,
        unit_price: 0,
        price_with_vat: 0, // السعر شامل الضريبة
        total_price: 0
      })),
      notes: ''
    });
    setShowQuotationDialog(true);
  };

  const updateQuotationItem = (index, field, value) => {
    const newItems = [...quotationForm.items];
    const numValue = parseFloat(value) || 0;
    newItems[index][field] = numValue;
    
    // إذا تم إدخال السعر شامل الضريبة، نحسب السعر الأساسي
    if (field === 'price_with_vat') {
      // السعر الأساسي = السعر شامل الضريبة / 1.15
      newItems[index].unit_price = numValue / 1.15;
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
    } else if (field === 'quantity') {
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
    } else if (field === 'unit_price') {
      // إذا تم إدخال السعر الأساسي، نحسب السعر شامل الضريبة
      newItems[index].price_with_vat = numValue * 1.15;
      newItems[index].total_price = newItems[index].quantity * numValue;
    }
    
    setQuotationForm({ ...quotationForm, items: newItems });
  };

  const handleCreateQuotation = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/quotations`, quotationForm);
      toast.success('تم إنشاء عرض الأسعار بنجاح');
      setShowQuotationDialog(false);
      fetchInquiries();
      
      // Download PDF with authentication
      const quotationId = response.data.quotation.id;
      const token = localStorage.getItem('token');
      
      // Use fetch with authorization header to download PDF
      const pdfResponse = await fetch(`${API}/quotations/${quotationId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (pdfResponse.ok) {
        const blob = await pdfResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quotation_${quotationId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        toast.error('فشل تحميل ملف PDF');
      }
    } catch (error) {
      toast.error('فشل إنشاء عرض الأسعار');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'قيد الانتظار', class: 'bg-warning text-white' },
      quoted: { text: 'تم التسعير', class: 'bg-success text-white' },
      completed: { text: 'مكتمل', class: 'bg-accent text-white' },
      cancelled: { text: 'ملغي', class: 'bg-destructive text-white' }
    };
    const badge = badges[status] || badges.pending;
    return <span className={`px-2 py-1 rounded text-xs ${badge.class}`}>{badge.text}</span>;
  };

  return (
    <div className="space-y-6" dir="rtl" data-testid="multi-inquiries-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">استفسارات العملاء - متعدد القطع</h1>
          <p className="text-muted-foreground mt-1">إدارة استفسارات العملاء مع إمكانية عرض الأسعار</p>
        </div>
        <Button onClick={() => setShowDialog(true)} data-testid="add-inquiry-button">
          <Plus className="ml-2 h-4 w-4" />
          إضافة استفسار جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {inquiries.map((inquiry) => (
          <Card key={inquiry.id} className="card-hover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{inquiry.customer_name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {inquiry.inquiry_number} • {inquiry.customer_phone}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(inquiry.status)}
                  {inquiry.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => openQuotationDialog(inquiry)}
                      data-testid={`create-quotation-${inquiry.id}`}
                    >
                      <FileText className="ml-2 h-4 w-4" />
                      إنشاء عرض سعر
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">
                  <strong>القطع المطلوبة ({inquiry.items.length}):</strong>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {inquiry.items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-secondary rounded-md">
                      <p className="font-medium">{item.part_name || item.part_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {getCarBrandLabel(item.car_brand)}
                      </p>
                    </div>
                  ))}
                </div>
                {inquiry.vin_number && (
                  <p className="text-sm text-muted-foreground">
                    <strong>رقم الهيكل:</strong> {inquiry.vin_number}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  تاريخ الإنشاء: {new Date(inquiry.created_at).toLocaleDateString('ar-SA')}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {inquiries.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">لا توجد استفسارات</p>
          </CardContent>
        </Card>
      )}

      {/* Add Inquiry Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة استفسار جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>اسم العميل *</Label>
                <Input
                  data-testid="customer-name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>رقم الجوال *</Label>
                <Input
                  data-testid="customer-phone"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  required
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div>
                <Label>رقم الهيكل (VIN) - اختياري</Label>
                <Input
                  data-testid="vin-number"
                  value={formData.vin_number}
                  onChange={(e) => setFormData({ ...formData, vin_number: e.target.value })}
                  dir="ltr"
                  className="text-right"
                  placeholder="مثال: 5YJSA1E26MF..."
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">القطع المطلوبة</h3>
                <Button type="button" size="sm" onClick={addItem}>
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة قطعة
                </Button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 mb-4 bg-secondary/20">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">قطعة {index + 1}</h4>
                    {formData.items.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>نوع السيارة *</Label>
                      <Select
                        value={item.car_brand}
                        onValueChange={(value) => updateItem(index, 'car_brand', value)}
                      >
                        <SelectTrigger data-testid={`car-brand-${index}`}>
                          <SelectValue placeholder="اختر نوع السيارة" />
                        </SelectTrigger>
                        <SelectContent>
                          {CAR_BRANDS.map((brand) => (
                            <SelectItem key={brand.value} value={brand.value}>
                              {brand.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>اسم القطعة *</Label>
                      <Input
                        data-testid={`part-name-${index}`}
                        value={item.part_name}
                        onChange={(e) => updateItem(index, 'part_name', e.target.value)}
                        required
                        placeholder="مثال: فلتر زيت"
                      />
                    </div>
                    <div>
                      <Label>رقم القطعة *</Label>
                      <Input
                        data-testid={`part-number-${index}`}
                        value={item.part_number}
                        onChange={(e) => updateItem(index, 'part_number', e.target.value)}
                        required
                        dir="ltr"
                        className="text-right"
                        placeholder="مثال: 26300-35503"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading}>
                حفظ الاستفسار
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quotation Dialog */}
      <Dialog open={showQuotationDialog} onOpenChange={setShowQuotationDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء عرض سعر</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedInquiry && (
              <div className="p-4 bg-secondary rounded-lg">
                <p><strong>العميل:</strong> {selectedInquiry.customer_name}</p>
                <p><strong>الجوال:</strong> {selectedInquiry.customer_phone}</p>
              </div>
            )}

            <div className="space-y-3">
              {quotationForm.items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">{item.part_name || item.part_number}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {getCarBrandLabel(item.car_brand)}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label>الكمية</Label>
                      <Input
                        data-testid={`qty-${index}`}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuotationItem(index, 'quantity', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>السعر شامل الضريبة</Label>
                      <Input
                        data-testid={`price-with-vat-${index}`}
                        type="number"
                        step="0.01"
                        value={item.price_with_vat?.toFixed(2) || ''}
                        onChange={(e) => updateQuotationItem(index, 'price_with_vat', e.target.value)}
                        placeholder="أدخل السعر شامل 15%"
                        className="border-primary"
                      />
                    </div>
                    <div>
                      <Label>السعر قبل الضريبة</Label>
                      <Input
                        data-testid={`unit-price-${index}`}
                        type="number"
                        step="0.01"
                        value={item.unit_price?.toFixed(2) || ''}
                        readOnly
                        className="bg-secondary"
                      />
                    </div>
                    <div>
                      <Label>المجموع (بدون ضريبة)</Label>
                      <Input
                        type="number"
                        value={item.total_price?.toFixed(2) || ''}
                        readOnly
                        className="bg-secondary"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="space-y-2 text-left">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span className="font-numbers font-bold">
                    {quotationForm.items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)} ر.س
                  </span>
                </div>
                <div className="flex justify-between text-success">
                  <span>ضريبة القيمة المضافة (15%):</span>
                  <span className="font-numbers font-bold">
                    {(quotationForm.items.reduce((sum, item) => sum + item.total_price, 0) * 0.15).toFixed(2)} ر.س
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>الإجمالي:</span>
                  <span className="font-numbers text-accent">
                    {(quotationForm.items.reduce((sum, item) => sum + item.total_price, 0) * 1.15).toFixed(2)} ر.س
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label>ملاحظات</Label>
              <Input
                value={quotationForm.notes}
                onChange={(e) => setQuotationForm({ ...quotationForm, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowQuotationDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handleCreateQuotation} disabled={loading}>
                <Download className="ml-2 h-4 w-4" />
                إنشاء وتحميل PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
