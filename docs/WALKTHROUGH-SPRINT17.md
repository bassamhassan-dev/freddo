# Sprint 17 — الدخول بجوجل وفيسبوك OAuth (شرح بالمصري)

## الهدف
قرار بسام (نقطة 9 المتعلقة): تسجيل دخول بجوجل وفيسبوك جنب الإيميل
والباسورد. الكود كامل ومتختبر — ناقصه بس بيانات التطبيقات من Google Cloud
و Meta، ودي بتركب في `.env` من غير أي تعديل كود.

## إزاي الفلو شغال

1. صفحة الدخول/التسجيل بتسأل السيرفر `GET /api/auth/oauth/providers`،
   وبتظهر زرار جوجل/فيسبوك **بس للمزود المتظبط**. مفيش credentials؟
   الصفحة زي ما هي بالظبط.
2. الزرار بيودي `GET /api/auth/oauth/:provider` → السيرفر بيرد 302 لشاشة
   الموافقة بتاعة المزود، ومعاه **state ممضون بـ JWT عمره 10 دقايق** — ده
   الـ CSRF token بتاع الفلو.
3. المزود يرجع المتصفح لـ `/api/auth/oauth/:provider/callback?code&state`.
   السيرفر بيتحقق من الـ state، بيستبدل الـ code بتوكن (server-side،
   السيكرت مابيقربش من المتصفح)، وبيجيب البروفايل.
4. لو كله تمام: كوكي الـ refresh بتتظبط والمتصفح بيروح
   `/oauth/callback` في الكلاينت، وهي بتعمل refresh عادي وبتدخل المستخدم.
5. لو حصل خطأ: رجوع لـ `/login?oauthError=CODE` ورسالة مفهومة باللغتين.

## سياسة ربط الحسابات (مهمة، اتحفظت في الكود)
1. provider id معروف → دخول مباشر.
2. **إيميل مؤكد من المزود يطابق حساب موجود → ربط** (شخص واحد = حساب واحد،
   ممنوع duplicates).
3. إيميل مؤكد جديد → حساب customer جديد.
إيميل **مش مؤكد** بيترفض (`OAUTH_EMAIL_UNVERIFIED`) — الربط على إيميل غير
مؤكد معناه إن أي حد يكتب إيميل حد تاني وياخد حسابه. ومفيش إيميل خالص
بيترفض (`OAUTH_EMAIL_REQUIRED`).

## قرارات معمارية
- **مفيش passport**: تبادل الكود عبارة عن callين HTTPS لكل مزود، فإطار
  strategies كان هيبقى وزن من غير مكسب. المكالمات معزولة في
  `oauth.providers.js` وقابلة للحقن في الاختبارات.
- `passwordHash` بقى مطلوب **بس** لما مفيش ولا provider id — حسابات
  OAuth-only مالهاش باسورد. الدخول بالباسورد زي ما هو تمامًا.
- `oauthGoogleId` / `oauthFacebookId` عليهم unique sparse indexes.

## الاختبارات (5 جداد — المجموع 102/102 سيرفر)
1. الـ providers endpoint بيعكس الظبط، والمزود غير المتظبط 503.
2. البداية بتحوّل لجوجل بـ state ممضون.
3. إيميل مؤكد جديد بينشئ customer ويظبط الكوكي.
4. إيميل مؤكد موجود **بيترابط** مش بيتكرر.
5. state مزوّر / إيميل غير مؤكد / بدون إيميل → رجوع للدخول بكود خطأ،
   ومفيش حساب اتنشأ.

## الظبط اليدوي (لما بيانات التطبيقات تجهز)
### Google
1. console.cloud.google.com → مشروع جديد → OAuth consent screen (External)
   → Credentials → Create OAuth client ID (Web).
2. Authorized redirect URIs: `http://localhost:5000/api/auth/oauth/google/callback`
   (ورابط الدومين الحقيقي عند النشر).
3. انسخ Client ID و Secret في `server/.env`.

### Facebook
1. developers.facebook.com → Create App (Consumer) → أضف منتج Facebook Login.
2. Valid OAuth Redirect URIs: `http://localhost:5000/api/auth/oauth/facebook/callback`.
3. من Settings → Basic انسخ App ID و App Secret في `server/.env`.

بعدها شغّل `npm run dev` وجرّب الزرارين — أول دخول بينشئ الحساب وتلاقيه
في Mongo مع oauthGoogleId/oauthFacebookId.
