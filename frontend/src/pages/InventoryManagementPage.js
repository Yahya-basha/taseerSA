import React, { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Download, Upload, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const InventoryManagementPage = () => {
  const [uploading, setUploading] = useState(false);

  const downloadTemplate = async () => {
    try {
      const response = await axios({
        url: `${API}/inventory/excel/template`,
        method: 'GET',
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'parts_template.xlsx';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        link.remove();
      }, 100);
      
      toast.success('تم تحميل القالب بنجاح');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('فشل تحميل القالب');
    }
  };

  const exportInventory = async () => {
    try {
      const response = await axios({
        url: `${API}/inventory/excel/export`,
        method: 'GET',
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        link.remove();
      }, 100);
      
      toast.success('تم تصدير المخزون بنجاح');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('فشل تصدير المخزون');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      await axios.post(`${API}/inventory/excel/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('تم رفع الملف ومعالجته بنجاح');
      event.target.value = null;
    } catch (error) {
      toast.error('فشل رفع الملف');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl" data-testid="inventory-management-page">
      <div>
        <h1 className="text-3xl font-bold text-primary">إدارة المخزون عبر Excel</h1>
        <p className="text-muted-foreground mt-1">استيراد وتصدير بيانات القطع</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Download Template */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5 text-accent" />
              تحميل القالب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              قم بتحميل قالب Excel لإضافة القطع الجديدة أو تحديث القطع الموجودة
            </p>
            <Button onClick={downloadTemplate} className="w-full" data-testid="download-template-button">
              <Download className="ml-2 h-4 w-4" />
              تحميل القالب
            </Button>
          </CardContent>
        </Card>

        {/* Upload File */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5 text-success" />
              رفع ملف
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              قم برفع ملف Excel المعبأ لإضافة أو تحديث القطع تلقائياً
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              data-testid="file-upload-input"
            />
            <Button
              onClick={() => document.getElementById('file-upload').click()}
              disabled={uploading}
              className="w-full"
              data-testid="upload-file-button"
            >
              <Upload className="ml-2 h-4 w-4" />
              {uploading ? 'جاري الرفع...' : 'رفع ملف Excel'}
            </Button>
          </CardContent>
        </Card>

        {/* Export Inventory */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5 text-warning" />
              تصدير المخزون
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              قم بتصدير جميع القطع الموجودة في المخزون إلى ملف Excel
            </p>
            <Button onClick={exportInventory} variant="outline" className="w-full" data-testid="export-inventory-button">
              <Download className="ml-2 h-4 w-4" />
              تصدير المخزون
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>تعليمات الاستخدام</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center font-bold">1</span>
              <div>
                <p className="font-medium">تحميل القالب</p>
                <p className="text-muted-foreground">قم بتحميل قالب Excel الذي يحتوي على الحقول المطلوبة</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center font-bold">2</span>
              <div>
                <p className="font-medium">تعبئة البيانات</p>
                <p className="text-muted-foreground">
                  قم بملء البيانات في القالب:
                  <br />• رقم القطعة (مطلوب)
                  <br />• اسم القطعة
                  <br />• ماركة السيارة، الموديل، السنة
                  <br />• سعر الشراء وسعر البيع
                  <br />• الكمية المتوفرة
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center font-bold">3</span>
              <div>
                <p className="font-medium">رفع الملف</p>
                <p className="text-muted-foreground">قم برفع الملف المعبأ وسيتم تحديث المخزون تلقائياً</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};