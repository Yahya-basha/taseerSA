import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const BranchesPage = () => {
  const [branches, setBranches] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: ''
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${API}/branches`);
      setBranches(response.data);
    } catch (error) {
      toast.error('فشل تحميل الفروع');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingBranch) {
        await axios.put(`${API}/branches/${editingBranch.id}`, formData);
        toast.success('تم تحديث الفرع بنجاح');
      } else {
        await axios.post(`${API}/branches`, formData);
        toast.success('تم إضافة الفرع بنجاح');
      }
      setShowDialog(false);
      resetForm();
      fetchBranches();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل العملية');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData({ name: '', code: '' });
    setEditingBranch(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  return (
    <div className="space-y-6" dir="rtl" data-testid="branches-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">إدارة الفروع</h1>
          <p className="text-muted-foreground mt-1">إدارة فروع الشركة</p>
        </div>
        <Button onClick={openAddDialog} data-testid="add-branch-button">
          <Plus className="ml-2 h-4 w-4" />
          إضافة فرع
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((branch) => (
          <Card key={branch.id} className="card-hover" data-testid={`branch-card-${branch.id}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{branch.name}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleEdit(branch)}
                  data-testid={`edit-branch-${branch.id}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">رمز الفرع</p>
                  <p className="font-mono font-medium">{branch.code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    أضيف في: {new Date(branch.created_at).toLocaleDateString('ar-SA')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingBranch ? 'تعديل الفرع' : 'إضافة فرع جديد'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">اسم الفرع *</Label>
              <Input
                id="name"
                data-testid="branch-name-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="code">رمز الفرع *</Label>
              <Input
                id="code"
                data-testid="branch-code-input"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
                dir="ltr"
                className="text-right"
                disabled={!!editingBranch}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading} data-testid="submit-branch-button">
                {editingBranch ? 'تحديث' : 'إضافة'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};