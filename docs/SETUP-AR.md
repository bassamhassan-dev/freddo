# دليل التشغيل الكامل لفريدو (مصري، خطوة بخطوة)

> الخطوات في مواقع جوجل وفيسبوك وغيرها ممكن شكل الشاشات يتغير شوية، بس الأسماء الأساسية (OAuth client، Redirect URI، App ID) ثابتة. كل المتغيرات (env) تتحط في **ملف واحد من اتنين**:
> - `server/.env` للسيرفر (كل حاجة تقريبًا).
> - `client/.env` للواجهة (متغير واحد بس: `VITE_API_URL`).
>
> **ممنوع** ترفع أي `.env` على GitHub (متحط في `.gitignore`). الأسرار مبتتبعتش في شات ولا إيميل.

## 0) الأمر الآمن للمنيو والأدمن (مهم)
- **عمرك ما تشغّل `npm run seed` على داتابيز فيها بيانات حقيقية.** الـseed للتجربة بس وبيرفض يشتغل على production.
- المنيو: `npm run import-menu -w server` (تجربة)، وبعدين `npm run import-menu -w server -- --apply`.
- أول أدمن: املا `ADMIN_EMAIL` و `ADMIN_PASSWORD` (8 حروف+) و `ADMIN_NAME` في `server/.env` وشغّل `npm run create-admin -w server`. بيعمل أدمن واحد بس ومبيلمسش حاجة تانية. لو الأدمن موجود مبيغيرش الباسورد إلا لو ضفت `-- --reset-password`.

## 1) جوجل (Google Login)
1. ادخل https://console.cloud.google.com بحساب جوجل بتاعك. اعمل **New Project** اسمه Freddo.
2. من القايمة: **APIs & Services > OAuth consent screen**. اختار **External**. اكتب اسم التطبيق (Freddo) وإيميل الدعم وإيميلك كـdeveloper contact. الـscopes: `openid` و `email` و `profile` (الأساسيين، مفيش مراجعة من جوجل ليهم).
3. وانت في وضع **Testing** بس الإيميلات اللي في **Test users** هتعرف تدخل. ضيف إيميلك. لما تجهز للناس كلها دوس **Publish app**.
4. **APIs & Services > Credentials > Create credentials > OAuth client ID > Web application**.
5. في **Authorized redirect URIs** حط بالظبط (من غير مسافات ولا `/` زيادة):
   - للتجربة على جهازك: `http://localhost:5000/api/auth/oauth/google/callback`
   - للموقع الحقيقي: `https://api.اسم-الدومين-بتاعك.com/api/auth/oauth/google/callback`
   (الـURI لازم يطابق عنوان **السيرفر** مش الواجهة. السيرفر بيبنيه من الـhost اللي اتطلب منه.)
6. دوس Create هيطلعلك **Client ID** و **Client secret**. حطهم في `server/.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```
7. اعمل restart للسيرفر. زرار جوجل هيظهر لوحده في صفحة الدخول.

## 2) فيسبوك (Facebook Login)
1. ادخل https://developers.facebook.com وسجل كـdeveloper، وبعدين **My Apps > Create App**.
2. اختار use case **Authenticate and request data from users with Facebook Login**، اسم التطبيق Freddo.
3. من **App settings > Basic**: هتلاقي **App ID** و **App Secret** (دوس Show). حطهم في `server/.env`:
   ```
   FACEBOOK_APP_ID=...
   FACEBOOK_APP_SECRET=...
   ```
4. من **Facebook Login > Settings** في **Valid OAuth Redirect URIs** حط:
   - `http://localhost:5000/api/auth/oauth/facebook/callback`
   - `https://api.اسم-الدومين-بتاعك.com/api/auth/oauth/facebook/callback`
5. التطبيق بيبدأ في **Development mode**: بس اللي ليهم role في التطبيق (أنت والـtesters من **App roles**) يعرفوا يدخلوا. عشان الناس كلها تدخل لازم تحوله **Live**، وفيسبوك بيطلب **Privacy Policy URL** وفي **Basic** تحط **App Domains** (دومينك). اعمل صفحة سياسة خصوصية بسيطة قبل كده.
6. restart للسيرفر. المشروع بيطلب `email` و `public_profile` بس.

لو حسابك في فيسبوك مفيهوش إيميل، تسجيل الدخول بيفشل بشكل واضح (مفيش حساب من غير إيميل).

## 3) كل متغيرات `server/.env` (بالأسماء الظبط)
| المتغير | لازم؟ | ملاحظة |
|---|---|---|
| `NODE_ENV` | لازم | `development` على جهازك، `production` على السيرفر الحقيقي. في production الكوكيز بتبقى Secure والـseed بيتقفل |
| `PORT` | اختياري | افتراضي 5000 (الاستضافة غالبًا بتحطه لوحدها) |
| `MONGO_URI` | **لازم** | رابط MongoDB Atlas (تحت). مبيتحطش في الكود ولا في GitHub |
| `CLIENT_URL` | **لازم** | عنوان الواجهة بالظبط، مثلًا `https://freddo.com` من غير `/` في الآخر. بيتحكم في CORS ولينكات الإيميل وإعادة التوجيه بعد OAuth |
| `JWT_ACCESS_SECRET` | **لازم** | نص عشوائي طويل |
| `JWT_REFRESH_SECRET` | **لازم** | نص عشوائي طويل **مختلف** عن اللي فوق |
| `ADMIN_EMAIL` `ADMIN_PASSWORD` `ADMIN_NAME` | لازم مرة واحدة | لأمر `create-admin` |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` `MAIL_FROM` | **لازم قبل ما الزباين الحقيقيين يطلبوا** | تحت |
| `CLOUDINARY_CLOUD_NAME` `CLOUDINARY_API_KEY` `CLOUDINARY_API_SECRET` | اختياري (موصى بيه) | الثلاثة مع بعض |
| `GOOGLE_CLIENT_ID` `GOOGLE_CLIENT_SECRET` | اختياري | فوق |
| `FACEBOOK_APP_ID` `FACEBOOK_APP_SECRET` | اختياري | فوق |

توليد سر عشوائي (شغّله مرتين، واحد لكل سر):
```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 4) `client/.env` (واحد بس)
```
VITE_API_URL=http://localhost:5000          # على جهازك
VITE_API_URL=https://api.اسم-الدومين.com     # في الاستضافة (بيتحط وقت الـbuild)
```
بعد ما تغيره لازم تعمل build تاني (`npm run build`).

## 5) باقي الحاجات اللي ناقصة، مرتبة

### لازم قبل الإطلاق الحقيقي (Blockers)
1. **MongoDB Atlas**: اعمل حساب على https://www.mongodb.com/atlas > cluster مجاني > Database Access (يوزر وباسورد للداتابيز) > Network Access (اسمح بـIP السيرفر، أو `0.0.0.0/0` لو الاستضافة IP بيتغير) > Connect > Drivers وانسخ الرابط. غيّر `<password>` بالباسورد، وزوّد اسم الداتابيز `/freddo` قبل علامة `?`. ده `MONGO_URI`. ثم: `import-menu --apply` و `create-admin`.
2. **الإيميل (SMTP)**: ده blocker حقيقي لأن العميل **لازم يأكد إيميله قبل ما يطلب**. من غير SMTP اللينك بيتطبع في كونسول السيرفر بس. أسهل حل: Gmail بـ**App Password** (فعّل 2-Step Verification على الحساب > Security > App passwords): `SMTP_HOST=smtp.gmail.com`، `SMTP_PORT=587`، `SMTP_SECURE=false`، `SMTP_USER=إيميلك`، `SMTP_PASS=الـApp Password` (16 حرف من غير مسافات)، `MAIL_FROM="Freddo <إيميلك>"`. للحجم الأكبر استخدم خدمة زي Brevo أو Resend أو SendGrid بنفس المتغيرات. (البديل: الدخول بجوجل/فيسبوك بيعدّي لأن الإيميل متأكد من المزوّد.)
3. **أسرار JWT** الاتنين (فوق).
4. **الدومين و HTTPS**: لازم الواجهة والسيرفر على **نفس الدومين الأساسي**، مثلًا `freddo.com` للواجهة و `api.freddo.com` للسيرفر. السبب: كوكي تجديد الدخول `SameSite=Lax` (قرار أمان) ومش بيتبعت بين دومينين مختلفين خالص (زي `x.vercel.app` و `y.onrender.com`)، فالدخول هيقع بعد ما الصفحة تتقفل. لا تستخدم دومينين مختلفين.
5. **استضافة السيرفر** لازم تدعم WebSocket (الشات بيستخدم Socket.IO): Render أو Railway أو VPS. مش Vercel/Netlify Functions. الأمر: build مفيش، start: `npm start -w server`، وحط كل متغيرات `server/.env` في إعدادات الاستضافة. السيرفر بيثق في الـproxy أول ما `NODE_ENV=production` (ده لازم عشان OAuth redirect يطلع https).
6. **استضافة الواجهة** (Vercel أو Netlify أو Cloudflare Pages): Root = `client`، build = `npm run build`، output = `dist`، ومتغير `VITE_API_URL`. ضفت `client/vercel.json` و `client/public/_redirects` عشان الروابط المباشرة زي `/admin` تشتغل.

### اختياري لكن موصى بيه
- **Cloudinary** (https://cloudinary.com حساب مجاني > Dashboard فيه الثلاثة قيم): من غيره الأدمن يقدر يحط صورة برابط بس، مفيش رفع. بيتفعل لما الثلاثة يتحطوا.
- **جوجل وفيسبوك**: الموقع شغال بالإيميل والباسورد من غيرهم.
- **صور المنتجات الحقيقية**: الصور الحالية stock من Wikimedia (مصادرها في `client/public/menu/CREDITS.md`). بدّلها من لوحة الأدمن لما تصوّر مشروباتك.
- **Backup**: فعّل النسخ الاحتياطي في Atlas (الخطط المدفوعة) أو اعمل `mongodump` دوري.
- **صفحة سياسة خصوصية** (لازمة لفيسبوك Live).

### قرارات مفتوحة عندك
- **رسوم التوصيل والمناطق** (لسه مفيش رسوم توصيل في الكود، الطلب بيتحسب بسعر الأصناف بس).
- **كركديه**: المنيو المطبوع مكتوب جنبه "Cardamom" والعربي كركديه (هيبسكس). اتسمّى Karkade (Hibiscus).
- **أسعار الإضافات** (مكسرات، معمول، صوصات...): مقفولة لحد ما تحط سعر من الأدمن.
- **الأقسام القديمة** (Hot Coffee، Desserts...) لسه ظاهرة في لوحة الأدمن، فاضية. امسحها لو عايز.
- **الدفع**: كاش عند الاستلام بس (مفيش دفع أونلاين في الكود).

## 6) تشغيل على جهازك (للتجربة)
```
git pull
npm install
cp server/.env.example server/.env     # وعدّل القيم
cp client/.env.example client/.env
npm run import-menu -w server -- --apply
npm run create-admin -w server
npm run dev
```
الواجهة على http://localhost:5173 والسيرفر على http://localhost:5000.
