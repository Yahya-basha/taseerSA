# دليل النشر الدائم لنظام تسعيّر على Render و Vercel

هذا الدليل يشرح كيفية نشر مشروع "تسعيّر" بشكل دائم على الإنترنت باستخدام:
- **Render** للواجهة الخلفية (Backend)
- **Vercel** للواجهة الأمامية (Frontend)
- **MongoDB Atlas** لقاعدة البيانات

---

## المتطلبات المسبقة

1. **حساب GitHub** - لرفع الكود
2. **حساب Render** - للواجهة الخلفية
3. **حساب Vercel** - للواجهة الأمامية
4. **حساب MongoDB Atlas** - لقاعدة البيانات (تم إعداده بالفعل)

---

## الخطوة 1: رفع الكود على GitHub

### 1.1 إنشاء مستودع جديد على GitHub
1. اذهب إلى [github.com](https://github.com) وسجل الدخول
2. انقر على **"New"** لإنشاء مستودع جديد
3. اسم المستودع: `taseer` (أو أي اسم تفضله)
4. اختر **"Public"** (حتى يمكن لـ Render و Vercel الوصول إليه)
5. انقر **"Create repository"**

### 1.2 رفع الكود إلى GitHub
```bash
cd /path/to/taseer_project/الموقغ

# تهيئة git
git init
git add .
git commit -m "Initial commit: Taseer SaaS Platform"

# إضافة الـ remote
git remote add origin https://github.com/YOUR_USERNAME/taseer.git

# رفع الكود
git branch -M main
git push -u origin main
```

---

## الخطوة 2: نشر الواجهة الخلفية على Render

### 2.1 إنشاء خدمة جديدة على Render
1. اذهب إلى [render.com](https://render.com) وسجل الدخول
2. انقر على **"New +"** ثم اختر **"Web Service"**
3. اختر **"Connect a repository"** وربط حسابك بـ GitHub
4. اختر مستودع `taseer`

### 2.2 إعدادات الخدمة
| الخيار | القيمة |
|--------|--------|
| **Name** | `taseer-backend` |
| **Environment** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn server:app --host 0.0.0.0 --port 8000` |
| **Plan** | `Free` (أو `Paid` للأداء الأفضل) |

### 2.3 إضافة متغيرات البيئة
انقر على **"Environment"** وأضف المتغيرات التالية:

| المتغير | القيمة |
|---------|--------|
| `MONGO_URL` | `mongodb+srv://yahya9031:OjvL5EzjRfI12nyH@cluster0.fgnu6hi.mongodb.net/?appName=Cluster0` |
| `DB_NAME` | `taseer_db` |
| `SECRET_KEY` | `your-secret-key-here-change-this` (استخدم قيمة عشوائية قوية) |
| `CORS_ORIGINS` | `https://your-frontend-domain.vercel.app,http://localhost:3000` |

### 2.4 النشر
انقر على **"Create Web Service"** وانتظر حتى ينتهي النشر (قد يستغرق 5-10 دقائق).

**ستحصل على رابط مثل:** `https://taseer-backend.onrender.com`

---

## الخطوة 3: نشر الواجهة الأمامية على Vercel

### 3.1 إنشاء مشروع جديد على Vercel
1. اذهب إلى [vercel.com](https://vercel.com) وسجل الدخول
2. انقر على **"Add New"** ثم اختر **"Project"**
3. اختر **"Import Git Repository"** وربط حسابك بـ GitHub
4. اختر مستودع `taseer`

### 3.2 إعدادات المشروع
| الخيار | القيمة |
|--------|--------|
| **Project Name** | `taseer-frontend` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `build` |

### 3.3 إضافة متغيرات البيئة
انقر على **"Environment Variables"** وأضف:

| المتغير | القيمة |
|---------|--------|
| `REACT_APP_BACKEND_URL` | `https://taseer-backend.onrender.com` (استبدل برابط Render الفعلي) |

### 3.4 النشر
انقر على **"Deploy"** وانتظر حتى ينتهي النشر.

**ستحصل على رابط مثل:** `https://taseer-frontend.vercel.app`

---

## الخطوة 4: تحديث إعدادات CORS

بعد حصولك على الروابط النهائية:

### 4.1 تحديث Render
1. اذهب إلى لوحة تحكم Render
2. اختر خدمة `taseer-backend`
3. انقر على **"Environment"**
4. حدّث `CORS_ORIGINS` ليصبح:
   ```
   https://taseer-frontend.vercel.app,http://localhost:3000
   ```
5. انقر **"Save"** وستتم إعادة نشر الخدمة تلقائياً

---

## الخطوة 5: اختبار الموقع الدائم

### 5.1 اختبر الواجهة الأمامية
1. اذهب إلى `https://taseer-frontend.vercel.app`
2. سجل الدخول باستخدام:
   - **البريد:** `admin@durra.com`
   - **كلمة المرور:** `admin123`

### 5.2 اختبر الاتصال بـ API
1. اذهب إلى `https://taseer-backend.onrender.com/docs`
2. يجب أن ترى واجهة Swagger للـ API

### 5.3 اختبر عرض السعر (PDF)
1. سجل الدخول كموظف
2. اذهب إلى "التسعير"
3. ابحث عن قطعة
4. اضغط "إنشاء عرض سعر"
5. تحقق من تحميل ملف PDF بالباركود

---

## 🔧 استكشاف الأخطاء

### المشكلة: "Connection refused" عند الاتصال بـ API
**الحل:** 
- تأكد من أن رابط `REACT_APP_BACKEND_URL` صحيح في Vercel
- تحقق من أن `CORS_ORIGINS` يحتوي على رابط Vercel الصحيح

### المشكلة: "Cannot connect to MongoDB"
**الحل:**
- تأكد من أن رابط `MONGO_URL` صحيح
- تحقق من أن عنوان IP الخاص بـ Render مسموح في MongoDB Atlas:
  1. اذهب إلى MongoDB Atlas
  2. انقر على **"Network Access"**
  3. أضف عنوان IP: `0.0.0.0/0` (للسماح بالوصول من أي مكان)

### المشكلة: "Build failed" على Vercel
**الحل:**
- تأكد من أن `package.json` موجود في مجلد `frontend`
- تأكد من أن جميع التبعيات مثبتة بشكل صحيح

---

## 📊 المراقبة والصيانة

### مراقبة الواجهة الخلفية
- اذهب إلى لوحة تحكم Render
- انقر على **"Logs"** لرؤية سجلات الأخطاء

### مراقبة الواجهة الأمامية
- اذهب إلى لوحة تحكم Vercel
- انقر على **"Analytics"** لرؤية إحصائيات الأداء

### مراقبة قاعدة البيانات
- اذهب إلى MongoDB Atlas
- استخدم **"Monitoring"** لمراقبة الأداء

---

## 🚀 التحديثات المستقبلية

عندما تريد تحديث الكود:

1. قم بالتعديلات المطلوبة محلياً
2. ارفع التغييرات إلى GitHub:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```
3. سيتم النشر تلقائياً على Render و Vercel!

---

## 💡 نصائح الأداء

1. **استخدم CDN:** Vercel توفر CDN مدمج للملفات الثابتة
2. **قلل حجم الصور:** استخدم أدوات ضغط الصور
3. **استخدم Caching:** فعّل caching في MongoDB و API
4. **راقب الأداء:** استخدم أدوات مثل Lighthouse

---

## 📞 الدعم

إذا واجهت مشاكل:
1. تحقق من السجلات (Logs) في Render و Vercel
2. تأكد من صحة متغيرات البيئة
3. جرّب إعادة النشر يدويًا من لوحات التحكم

---

**تم النشر بنجاح! 🎉**

موقعك الآن متاح على الإنترنت بشكل دائم وجاهز للاستخدام!
