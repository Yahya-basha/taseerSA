import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const SuppliersPage = () => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_number: '',
    notes: ''
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${API}/suppliers`);
      setSuppliers(response.data);
    } catch (error) {
      toast.error('فشل تحميل الموردين');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingSupplier) {
        await axios.put(`${API}/suppliers/${editingSupplier.id}`, formData);
        toast.success('تم تحديث المورد بنجاح');
      } else {
        await axios.post(`${API}/suppliers`, formData);
        toast.success('تم إضافة المورد بنجاح');
      }
      setShowDialog(false);
      resetForm();
      fetchSuppliers();
    } catch (error) {
      toast.error(editingSupplier ? 'فشل تحديث المورد' : 'فشل إضافة المورد');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_number: supplier.contact_number || '',
      notes: supplier.notes || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المورد؟')) return;

    try {
      await axios.delete(`${API}/suppliers/${id}`);
      toast.success('تم حذف المورد بنجاح');
      fetchSuppliers();
    } catch (error) {
      toast.error('فشل حذف المورد');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', contact_number: '', notes: '' });
    setEditingSupplier(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  return (
    <div className="space-y-6" dir="rtl" data-testid="suppliers-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">إدارة الموردين</h1>
          <p className="text-muted-foreground mt-1">قائمة بجميع موردي قطع الغيار</p>
        </div>
        <Button onClick={openAddDialog} data-testid="add-supplier-button">
          <Plus className="ml-2 h-4 w-4" />
          إضافة مورد
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((supplier) => (
          <Card key={supplier.id} className="card-hover" data-testid={`supplier-card-${supplier.id}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{supplier.name}</span>
                <div className="flex gap-2">
                  {isAdmin && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(supplier)}
                        data-testid={`edit-supplier-${supplier.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(supplier.id)}
                        data-testid={`delete-supplier-${supplier.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {supplier.contact_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">رقم التواصل</p>
                    <p className="font-mono font-medium" dir="ltr">{supplier.contact_number}</p>
                  </div>
                )}
                {supplier.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">ملاحظات</p>
                    <p className="text-sm">{supplier.notes}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">
                    أضيف في: {new Date(supplier.created_at).toLocaleDateString('ar-SA')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {suppliers.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">لا توجد موردين بعد</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'تعديل المورد' : 'إضافة مورد جديد'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">اسم المورد *</Label>
              <Input
                id="name"
                data-testid="supplier-name-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="contact_number">رقم التواصل</Label>
              <Input
                id="contact_number"
                data-testid="supplier-contact-input"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                dir="ltr"
                className="text-right"
              />
            </div>
            <div>
              <Label htmlFor="notes">ملاحظات</Label>
              <Input
                id="notes"
                data-testid="supplier-notes-input"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading} data-testid="submit-supplier-button">
                {editingSupplier ? 'تحديث' : 'إضافة'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};