# Sprint 40 - شرح بالمصري

## 1. الباج: زرار "الوصفة" مش بيفتح حاجة
- المشكلة الحقيقية: الكلاس `.animate-fade-up` كان بيستخدم `animation-fill-mode: both`. بعد ما الأنيميشن يخلص، بيفضل `transform: translateY(0)` على `<main>`.
- أي عنصر عليه transform بيبقى هو الأساس لأي عنصر `position: fixed` جواه. فالمودال كان طويله 9382px وبيتوسّط بعيد تحت الصفحة، فمبتشوفوش.
- الحل: `ease-out backwards` بدل `both`. بعد الأنيميشن مفيش transform.
- الاختبار: `client/src/styles.test.js` بيفشل لو حد رجّع `both` أو `forwards`.
- اتأكدت في Chrome حقيقي: المودال في النص. نفس الباج كان في مودال الباريستا واتصلح.
- سؤال مقابلة: ليه fixed اتكسر؟ علشان transform بيعمل containing block جديد.

## 2. create-admin
`npm run create-admin -w server` بياخد ADMIN_EMAIL/ADMIN_PASSWORD/ADMIN_NAME. بيعمل أدمن واحد بس ومبيلمسش حاجة تانية. لو الحساب موجود مبيعملش حاجة إلا لو `--reset-password`. لو الإيميل لعميل عادي بيرفض.
مفيش `npm run seed` على داتا حقيقية أبدا.

## 3. trust proxy
في production: `app.set('trust proxy', 1)` علشان redirect URI بتاع OAuth يبقى https والكوكي Secure تشتغل ورا البروكسي.

## 4. SPA rewrites
`client/public/_redirects` (Netlify/Cloudflare) و`client/vercel.json`: أي مسار يرجع index.html علشان refresh على صفحة داخلية ميديش 404.

## 5. الدليل
`docs/SETUP-AR.md`: خطوات Google/Facebook OAuth، SMTP، Atlas، الاستضافة، وأسماء الـ env والفرق بين الضروري والاختياري.
