import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, UserCheck, UserX, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../components/ui/alert';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [deleteUserId, setDeleteUserId] = useState(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'employee',
    branch_id: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchBranches();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      toast.error('فشل تحميل المستخدمين');
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${API}/branches`);
      setBranches(response.data);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUserId) {
        // Update user
        const updateData = {
          full_name: formData.full_name,
          branch_id: formData.branch_id || undefined,
          role: formData.role
        };
        await axios.put(`${API}/users/${editingUserId}`, updateData);
        toast.success('تم تحديث المستخدم بنجاح');
      } else {
        // Create new user
        await axios.post(`${API}/auth/register`, formData);
        toast.success('تم إضافة المستخدم بنجاح');
      }
      setShowDialog(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل العملية');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUserId(user.id);
    setFormData({
      email: user.email,
      password: '',
      full_name: user.full_name,
      role: user.role,
      branch_id: user.branch_id || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await axios.delete(`${API}/users/${deleteUserId}`);
      toast.success('تم حذف المستخدم بنجاح');
      setShowDeleteConfirm(false);
      setDeleteUserId(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل حذف المستخدم');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId) => {
    try {
      await axios.put(`${API}/users/${userId}/toggle-status`);
      toast.success('تم تحديث حالة المستخدم');
      fetchUsers();
    } catch (error) {
      toast.error('فشل تحديث الحالة');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'employee',
      branch_id: ''
    });
    setEditingUserId(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  return (
    <div className="space-y-6" dir="rtl" data-testid="users-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">إدارة المستخدمين</h1>
          <p className="text-muted-foreground mt-1">إدارة مستخدمي النظام والموظفين</p>
        </div>
        <Button onClick={openAddDialog} data-testid="add-user-button">
          <Plus className="ml-2 h-4 w-4" />
          إضافة مستخدم
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full data-table" data-testid="users-table">
              <thead>
                <tr className="border-b bg-secondary">
                  <th className="py-3 px-4 text-right font-medium">الاسم</th>
                  <th className="py-3 px-4 text-right font-medium">البريد الإلكتروني</th>
                  <th className="py-3 px-4 text-right font-medium">الدور</th>
                  <th className="py-3 px-4 text-right font-medium">الفرع</th>
                  <th className="py-3 px-4 text-right font-medium">الحالة</th>
                  <th className="py-3 px-4 text-right font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.id} className="border-b hover:bg-secondary/50" data-testid={`user-row-${index}`}>
                    <td className="py-3 px-4">{user.full_name}</td>
                    <td className="py-3 px-4 font-mono" dir="ltr">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.role === 'admin'
                          ? 'bg-accent text-white'
                          : user.role === 'super_admin'
                          ? 'bg-red-600 text-white'
                          : 'bg-secondary text-foreground'
                      }`}>
                        {user.role === 'admin' ? 'مدير' : user.role === 'super_admin' ? 'مدير النظام' : 'موظف'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{user.branch_name || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.is_active
                          ? 'bg-success text-white'
                          : 'bg-destructive text-white'
                      }`}>
                        {user.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(user)}
                          data-testid={`edit-user-${user.id}`}
                          title="تعديل المستخدم"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleUserStatus(user.id)}
                          data-testid={`toggle-user-${user.id}`}
                        >
                          {user.is_active ? (
                            <><UserX className="ml-2 h-4 w-4" /> تعطيل</>
                          ) : (
                            <><UserCheck className="ml-2 h-4 w-4" /> تفعيل</>
                          )}
                        </Button>
                        {user.role !== 'super_admin' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setDeleteUserId(user.id);
                              setShowDeleteConfirm(true);
                            }}
                            data-testid={`delete-user-${user.id}`}
                            title="حذف المستخدم"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit User Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingUserId ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="full_name">الاسم الكامل *</Label>
              <Input
                id="full_name"
                data-testid="user-full-name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">البريد الإلكتروني *</Label>
              <Input
                id="email"
                data-testid="user-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={editingUserId ? true : false}
                dir="ltr"
                className="text-right"
              />
            </div>
            {!editingUserId && (
              <div>
                <Label htmlFor="password">كلمة المرور *</Label>
                <Input
                  id="password"
                  data-testid="user-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  dir="ltr"
                  className="text-right"
                />
              </div>
            )}
            <div>
              <Label htmlFor="role">الدور *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger data-testid="user-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير نظام</SelectItem>
                  <SelectItem value="employee">موظف فرع</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.role === 'employee' && (
              <div>
                <Label htmlFor="branch_id">الفرع *</Label>
                <Select
                  value={formData.branch_id}
                  onValueChange={(value) => setFormData({ ...formData, branch_id: value })}
                >
                  <SelectTrigger data-testid="user-branch-select">
                    <SelectValue placeholder="اختر الفرع" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading} data-testid="submit-user-button">
                {editingUserId ? 'تحديث' : 'إضافة'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              هل أنت متأكد من رغبتك في حذف هذا المستخدم؟ لا يمكن التراجع عن هذه العملية.
            </AlertDescription>
          </Alert>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
              data-testid="confirm-delete-button"
            >
              حذف
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
