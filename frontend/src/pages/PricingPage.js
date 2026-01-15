import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '.@/components/ui/card';
import { Button } from '.@/components/ui/button';
import { Input } from '.@/components/ui/input';
import { Label } from '.@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '.@/components/ui/select';
import { Textarea } from '.@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '.@/components/ui/dialog';
import { Switch } from '.@/components/ui/switch';
import { Search, Plus, Calculator, History, Download, AlertCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '.@/components/ui/alert';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const PricingPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [partData, setPartData] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showQuotationDialog, setShowQuotationDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pricing form
  const [pricingForm, setPricingForm] = useState({
    part_number: '',
    part_name: '',
    is_available: true,
    supplier_id: '',
    supplier_price: '',
    supplier_date: '',
    profit_margin_percentage: '',
    final_price: '',
    notes: ''
  });

  // Quotation form
  const [quotationForm, setQuotationForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    vin_number: '',
    items: [],
    notes: ''
  });

  const [suggestedPrice, setSuggestedPrice] = useState(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${API}/suppliers`);
      setSuppliers(response.data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('يرجى إدخال رقم القطعة');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API}/parts/search`, {
        params: { part_number: searchTerm }
      });

      setPartData(response.data);
      
      if (response.data.found) {
        setPricingForm({
          ...pricingForm,
          part_number: response.data.part.part_number,
          part_name: response.data.part.part_name || ''
        });
      } else {
        setPricingForm({
          ...pricingForm,
          part_number: searchTerm,
          part_name: ''
        });
      }
    } catch (error) {
      toast.error('فشل البحث عن القطعة');
    } finally {
      setLoading(false);
    }
  };

  const calculateSuggestedPrice = async () => {
    if (!pricingForm.supplier_price || isNaN(parseFloat(pricingForm.supplier_price))) {
      toast.error('يرجى إدخال سعر المورد الصحيح');
      return;
    }

    try {
      const response = await axios.get(`${API}/profit-margins/calculate`, {
        params: {
          part_number: pricingForm.part_number,
          supplier_price: parseFloat(pricingForm.supplier_price)
        }
      });

      setSuggestedPrice(response.data);
      setPricingForm({
        ...pricingForm,
        profit_margin_percentage: response.data.margin_percentage.toString(),
        final_price: response.data.suggested_final_price.toString()
      });
      toast.success('تم حساب السعر المقترح بنجاح');
    } catch (error) {
      toast.error('فشل حساب السعر المقترح');
    }
  };

  const handleSubmitPricing = async (e) => {
    e.preventDefault();

    if (!pricingForm.final_price || parseFloat(pricingForm.final_price) <= 0) {
      toast.error('يرجى إدخال سعر نهائي صحيح');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...pricingForm,
        supplier_price: pricingForm.supplier_price ? parseFloat(pricingForm.supplier_price) : null,
        profit_margin_percentage: pricingForm.profit_margin_percentage ? parseFloat(pricingForm.profit_margin_percentage) : null,
        final_price: parseFloat(pricingForm.final_price),
        supplier_date: pricingForm.supplier_date || null
      };

      await axios.post(`${API}/pricing`, payload);
      toast.success('تم حفظ التسعير بنجاح');
      setShowPricingDialog(false);
      handleSearch(); // Refresh part data
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل حفظ التسعير');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuotation = async (e) => {
    e.preventDefault();

    if (!quotationForm.customer_name || !quotationForm.customer_phone) {
      toast.error('يرجى إدخال بيانات العميل المطلوبة');
      return;
    }

    if (!partData || !partData.part) {
      toast.error('يرجى اختيار قطعة أولاً');
      return;
    }

    setLoading(true);
    try {
      const quotationData = {
        ...quotationForm,
        items: [{
          part_number: partData.part.part_number,
          part_name: partData.part.part_name,
          quantity: 1,
          unit_price: partData.part.last_price || 0,
          total_price: partData.part.last_price || 0,
          car_brand: '',
          car_model: '',
          car_year: ''
        }]
      };

      const response = await axios.post(`${API}/quotations`, quotationData);
      toast.success('تم إنشاء عرض السعر بنجاح');
      
      // Download PDF
      const pdfResponse = await axios.get(`${API}/quotations/${response.data.quotation_id}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([pdfResponse.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quotation_${response.data.quotation_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      setShowQuotationDialog(false);
      resetQuotationForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إنشاء عرض السعر');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPricingForm({
      part_number: '',
      part_name: '',
      is_available: true,
      supplier_id: '',
      supplier_price: '',
      supplier_date: '',
      profit_margin_percentage: '',
      final_price: '',
      notes: ''
    });
    setSuggestedPrice(null);
  };

  const resetQuotationForm = () => {
    setQuotationForm({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      vin_number: '',
      items: [],
      notes: ''
    });
  };

  return (
    <div className="space-y-6" dir="rtl" data-testid="pricing-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">تسعير القطع</h1>
          <p className="text-muted-foreground mt-1">بحث عن القطع وإضافة تسعير جديد وإنشاء عروض أسعار</p>
        </div>
      </div>

      {/* Search Section */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            البحث عن قطعة
          </CardTitle>
          <CardDescription>ابحث عن القطع باستخدام رقم القطعة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                data-testid="part-search-input"
                placeholder="أدخل رقم القطعة"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                dir="ltr"
                className="text-right"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading} data-testid="search-button">
              <Search className="ml-2 h-4 w-4" />
              بحث
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Part Info */}
      {partData && (
        <Card data-testid="part-info-card" className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              معلومات القطعة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {partData.found ? (
              <div className="space-y-4">
                {/* Part Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-3 bg-secondary rounded">
                    <p className="text-sm text-muted-foreground">رقم القطعة</p>
                    <p className="font-mono font-bold text-lg">{partData.part.part_number}</p>
                  </div>
                  <div className="p-3 bg-secondary rounded">
                    <p className="text-sm text-muted-foreground">اسم القطعة</p>
                    <p className="font-medium">{partData.part.part_name || 'غير محدد'}</p>
                  </div>
                  <div className="p-3 bg-success/10 rounded border border-success">
                    <p className="text-sm text-muted-foreground">آخر سعر</p>
                    <p className="font-bold text-lg text-success">
                      {partData.part.last_price ? `${partData.part.last_price.toFixed(2)} ر.س` : '-'}
                    </p>
                  </div>
                  <div className="p-3 bg-secondary rounded">
                    <p className="text-sm text-muted-foreground">تاريخ آخر تسعير</p>
                    <p className="font-medium">
                      {partData.part.last_pricing_date
                        ? new Date(partData.part.last_pricing_date).toLocaleDateString('ar-SA')
                        : '-'}
                    </p>
                  </div>
                  <div className="p-3 bg-secondary rounded">
                    <p className="text-sm text-muted-foreground">الفرع</p>
                    <p className="font-medium">{partData.part.last_pricing_branch || '-'}</p>
                  </div>
                  <div className="p-3 bg-secondary rounded">
                    <p className="text-sm text-muted-foreground">الحالة</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      partData.part.is_available_in_stock
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {partData.part.is_available_in_stock ? 'متوفر بالمخزون' : 'غير متوفر'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 flex-wrap">
                  <Button 
                    onClick={() => setShowPricingDialog(true)} 
                    data-testid="add-pricing-button"
                    className="flex-1"
                  >
                    <Plus className="ml-2 h-4 w-4" />
                    إضافة تسعير جديد
                  </Button>
                  <Button 
                    onClick={() => setShowQuotationDialog(true)} 
                    variant="outline"
                    data-testid="create-quotation-button"
                    className="flex-1"
                  >
                    <Download className="ml-2 h-4 w-4" />
                    إنشاء عرض سعر
                  </Button>
                  {partData.history && partData.history.length > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setShowHistoryDialog(true)} 
                      data-testid="view-history-button"
                      className="flex-1"
                    >
                      <History className="ml-2 h-4 w-4" />
                      السجل ({partData.history.length})
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  لم يتم العثور على القطعة. يمكنك إضافة تسعير جديد لهذه القطعة.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Pricing Dialog */}
      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إضافة تسعير جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitPricing} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="part_number">رقم القطعة *</Label>
                <Input
                  id="part_number"
                  value={pricingForm.part_number}
                  disabled
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div>
                <Label htmlFor="part_name">اسم القطعة</Label>
                <Input
                  id="part_name"
                  value={pricingForm.part_name}
                  onChange={(e) => setPricingForm({ ...pricingForm, part_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier_id">المورد</Label>
                <Select
                  value={pricingForm.supplier_id}
                  onValueChange={(value) => setPricingForm({ ...pricingForm, supplier_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المورد" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="supplier_date">تاريخ السعر</Label>
                <Input
                  id="supplier_date"
                  type="date"
                  value={pricingForm.supplier_date}
                  onChange={(e) => setPricingForm({ ...pricingForm, supplier_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier_price">سعر المورد *</Label>
                <div className="flex gap-2">
                  <Input
                    id="supplier_price"
                    type="number"
                    step="0.01"
                    value={pricingForm.supplier_price}
                    onChange={(e) => setPricingForm({ ...pricingForm, supplier_price: e.target.value })}
                    dir="ltr"
                    className="text-right"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={calculateSuggestedPrice}
                    disabled={loading}
                  >
                    <Calculator className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="profit_margin_percentage">نسبة الربح (%)</Label>
                <Input
                  id="profit_margin_percentage"
                  type="number"
                  step="0.01"
                  value={pricingForm.profit_margin_percentage}
                  onChange={(e) => setPricingForm({ ...pricingForm, profit_margin_percentage: e.target.value })}
                  dir="ltr"
                  className="text-right"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="final_price">السعر النهائي *</Label>
              <Input
                id="final_price"
                type="number"
                step="0.01"
                value={pricingForm.final_price}
                onChange={(e) => setPricingForm({ ...pricingForm, final_price: e.target.value })}
                dir="ltr"
                className="text-right font-bold text-lg"
                required
              />
            </div>

            <div>
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                value={pricingForm.notes}
                onChange={(e) => setPricingForm({ ...pricingForm, notes: e.target.value })}
                placeholder="أضف أي ملاحظات"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowPricingDialog(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading}>
                حفظ التسعير
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Quotation Dialog */}
      <Dialog open={showQuotationDialog} onOpenChange={setShowQuotationDialog}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إنشاء عرض سعر</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateQuotation} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_name">اسم العميل *</Label>
                <Input
                  id="customer_name"
                  value={quotationForm.customer_name}
                  onChange={(e) => setQuotationForm({ ...quotationForm, customer_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="customer_phone">رقم الجوال *</Label>
                <Input
                  id="customer_phone"
                  type="tel"
                  value={quotationForm.customer_phone}
                  onChange={(e) => setQuotationForm({ ...quotationForm, customer_phone: e.target.value })}
                  dir="ltr"
                  className="text-right"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_email">البريد الإلكتروني</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={quotationForm.customer_email}
                  onChange={(e) => setQuotationForm({ ...quotationForm, customer_email: e.target.value })}
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div>
                <Label htmlFor="vin_number">رقم الهيكل (VIN)</Label>
                <Input
                  id="vin_number"
                  value={quotationForm.vin_number}
                  onChange={(e) => setQuotationForm({ ...quotationForm, vin_number: e.target.value })}
                  dir="ltr"
                  className="text-right"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                value={quotationForm.notes}
                onChange={(e) => setQuotationForm({ ...quotationForm, notes: e.target.value })}
                placeholder="أضف أي ملاحظات خاصة"
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                سيتم إنشاء عرض سعر يتضمن القطعة المحددة بالسعر الحالي وتحميل ملف PDF تلقائياً.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowQuotationDialog(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading}>
                <Download className="ml-2 h-4 w-4" />
                إنشاء وتحميل PDF
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      {partData?.history && (
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent dir="rtl" className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>سجل التسعير</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {partData.history.map((entry, idx) => (
                <div key={idx} className="p-3 border rounded hover:bg-secondary/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">السعر: {entry.final_price?.toFixed(2)} ر.س</p>
                      <p className="text-sm text-muted-foreground">
                        التاريخ: {new Date(entry.created_at).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                    <span className="text-xs bg-secondary px-2 py-1 rounded">
                      {entry.supplier_name || 'بدون مورد'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
