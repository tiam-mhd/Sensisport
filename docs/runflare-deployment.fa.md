# استقرار Sensi Sport روی Runflare

این راهنما برای سرویس Docker این مخزن نوشته شده است. برنامه روی پورت داخلی `3000` گوش می‌دهد، Next.js را با `output: "standalone"` می‌سازد و فایل‌های رسانه را روی دیسک کانتینر نگه نمی‌دارد. معماری تولید سه بخش دارد:

1. سرویس اپلیکیشن Docker از همین مخزن؛
2. سرویس PostgreSQL جدا در همان پروژهٔ Runflare؛
3. فضای ذخیره‌سازی S3-compatible بیرونی برای تصاویر محصول.

مستندات Runflare مسیر ساخت پروژه/سرویس، انتشار CLI، اتصال پایگاه داده، تنظیم دامنه و SSL را توضیح می‌دهند: [شروع کار](https://runflare.com/docs/get-started/)، [ساخت سرویس](https://runflare.com/docs/create-service/)، [سرویس Docker](https://runflare.com/هاست-ابری-docker/)، [PostgreSQL](https://runflare.com/docs/postgres/)، [انتشار با CLI](https://runflare.com/docs/work-with-cli/cli-deploy/).

## ۱. آماده‌سازی مخزن

- `Dockerfile` را در ریشهٔ مخزن نگه دارید و تمام مخزن را از ریشه deploy کنید تا فایل‌های `package.json`، lockfile و پوشهٔ `public` در build context باشند.
- فایل `.dockerignore` فایل‌های `.env`، `node_modules`، `.next` و اسناد داخلی `0-DOCS` را از build context کنار می‌گذارد.
- `.gitignore` فایل‌های محرمانه و خروجی build را از Git و انتشار CLI کنار می‌گذارد. `.env.example` فقط نمونهٔ متغیرهاست و راز واقعی در آن قرار ندهید.
- پیش از انتشار، روی ماشینی با دسترسی npm، وابستگی‌ها را با Node.js 22 نصب و lockfile تولید کنید (`npm install`). lockfile را در مخزن نگه دارید تا انتشارهای بعدی تکرارپذیر باشند. Dockerfile در نبود lockfile برای راه‌اندازی اولیه از `npm install` استفاده می‌کند و پس از افزودن lockfile به `npm ci` برمی‌گردد.

## ۲. ساخت پروژه و سرویس‌ها در Runflare

1. در پنل Runflare یک پروژه بسازید.
2. در همان پروژه یک سرویس Docker برای اپلیکیشن بسازید و منبع آن را به مخزن/شاخهٔ موردنظر متصل کنید یا از CLI استفاده کنید. اگر اتصال Git را برگزیدید، دسترسی مخزن را مطابق [راهنمای GitHub](https://runflare.com/docs/ci-cd-setup/how-to-add-github/) یا [راهنمای GitLab](https://runflare.com/docs/ci-cd-setup/how-to-add-gitlab/) تنظیم کنید.
3. سرویس PostgreSQL جداگانه بسازید. منابع CPU، حافظه و دیسک را بر مبنای بار واقعی و پلن حساب خود انتخاب کنید؛ مخزن مقدار ثابتی برای این موارد فرض نمی‌کند.
4. از مشخصات اتصال PostgreSQL در پنل، hostname داخلی، نام پایگاه داده، کاربر، گذرواژه و پورت را بردارید. بین سرویس‌های هم‌پروژه از نشانی داخلی استفاده کنید؛ پورت `5432` معمولاً فقط وقتی لازم است که پنل URI کامل بخواهد. دسترسی عمومی پایگاه داده را فعال نکنید مگر برای نیاز جداگانه و کنترل‌شده. جزئیات را با [راهنمای PostgreSQL Runflare](https://runflare.com/docs/postgres/) تطبیق دهید.
5. یک فضای S3-compatible بیرونی بسازید و bucket و کلیدهای محدود به همان bucket را آماده کنید. endpoint عمومی/خصوصی، region و روش path-style باید با ارائه‌دهندهٔ ذخیره‌سازی انتخابی هماهنگ باشد.

## ۳. متغیرهای محیطی سرویس وب

مقادیر را در تنظیمات محیطی سرویس وب در پنل وارد کنید. secret واقعی را داخل Git یا فایل Docker image نگذارید.

| متغیر | مقدار تولید |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `HOSTNAME` | `0.0.0.0` |
| `APP_URL` | نشانی نهایی HTTPS سایت؛ فعلاً `https://sensishop.timocode.ir`، و هنگام تعویض دامنه همین مقدار را به‌روز کنید |
| `DATABASE_URL` | URI PostgreSQL با hostname خصوصی سرویس Runflare |
| `DB_POOL_MAX` | از `5` شروع کنید و با تعداد replica و سقف اتصال DB هماهنگ کنید |
| `AUTH_SECRET` | راز تصادفی حداقل ۳۲ بایتی؛ جدا از هر محیط دیگر |
| `AUTH_COOKIE_SECURE` | `true` |
| `S3_ENDPOINT` | endpoint فضای S3-compatible |
| `S3_REGION` | region موردنیاز ارائه‌دهنده |
| `S3_BUCKET` | نام bucket تصاویر محصول |
| `S3_ACCESS_KEY_ID` | کلید محدود به bucket |
| `S3_SECRET_ACCESS_KEY` | secret همان کلید |
| `S3_FORCE_PATH_STYLE` | بر اساس endpoint؛ برای endpointهای سازگار با path-style معمولاً `true` |
| `PAYMENT_PROVIDER` | `none` تا زمانی که درگاه واقعی و adapter آن پیاده‌سازی و تأیید نشده باشد |

برای ساخت secret می‌توان محلی اجرا کرد و خروجی را مستقیماً در پنل وارد کرد:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

این پروژه از `.env` داخل سرویس تولید استفاده نمی‌کند. هر متغیر تازه‌ای که در کد سرور خوانده شد باید در پنل هم افزوده شود. کلیدهای S3 و `AUTH_SECRET` را برای کاربر عمومی یا build log چاپ نکنید.

## ۴. build و انتشار

مستند نصب CLI رسمی Runflare فرمان Windows را این‌طور ارائه می‌کند: [نصب و ارتقای CLI](https://runflare.com/docs/work-with-cli/install-and-upgrade-cli/). در PowerShell:

```powershell
Invoke-WebRequest -Uri https://get.runflare.com/install.bat -OutFile .\install.bat
.\install.bat
runflare login
```

در مخزن، از ریشهٔ پروژه اجرا کنید:

```powershell
runflare deploy
```

در اولین انتشار، پروژه و سرویس ساخته‌شده در پنل را در CLI انتخاب کنید. انتشارهای بعدی را هم از همان ریشه انجام دهید تا Dockerfile، کد، lockfile و دارایی hero در context باشند. طبق راهنمای CLI، `runflare deploy -y` برای استفاده از انتخاب‌های cache شده است؛ پیش از استفاده مطمئن شوید مقصد انتخاب‌شده درست است. وضعیت و log را با فرمان‌های زیر بررسی کنید:

```powershell
runflare events
runflare logs -f
```

CLI از `.gitignore` برای حذف فایل‌های محلی پیروی می‌کند. جزئیات و فرمان‌های مجاز دیگر در [راهنمای فرمان‌های CLI](https://runflare.com/docs/work-with-cli/cli-commands/) آمده است. اگر به‌جای CLI، اتصال مخزن را انتخاب کرده‌اید، شاخه و دسترسی webhook را در پنل طبق راهنمای CI/CD تنظیم کنید.

## ۵. دامنه، DNS و TLS

دامنهٔ فعلی فقط مقدار شروع است؛ با تغییر دامنه، مقدار `APP_URL` و تنظیم DNS را عوض کنید.

1. در بخش Domains پنل، `sensishop.timocode.ir` را بدون `https://` و بدون `www` اضافه کنید.
2. مقادیر DNS را که پنل نشان می‌دهد در DNS provider ثبت کنید. اگر Cloudflare یا Arvan DNS با proxy روشن استفاده می‌شود، هر دو مقدار IP و TXT موردنیاز پنل را ثبت و وضعیت proxy را طبق همان راهنما تنظیم کنید.
3. پس از propagation، دامنه را به سرویس وب متصل کنید.
4. گواهی رایگان Runflare را برای دامنه فعال کنید یا گواهی و private key خود را وارد کنید. فقط پس از فعال‌شدن TLS مقدار `APP_URL` را روی `https://sensishop.timocode.ir` بگذارید.

راهنماهای رسمی: [افزودن دامنه](https://runflare.com/docs/how-to-add-domain/)، [اتصال دامنه به سرویس](https://runflare.com/docs/add-domain-to-service/)، [SSL](https://runflare.com/docs/how-to-work-with-ssl/).

## ۶. migration و مدیر اولیه

پس از آماده‌شدن PostgreSQL و متغیرهای محیطی:

1. یک‌بار دستور `npm run db:migrate` را با همان `DATABASE_URL` تولید اجرا کنید. این فرمان فایل‌های SQL شماره‌دار را با advisory lock و checksum ثبت می‌کند. می‌توان آن را از محیطی اجرا کرد که به hostname خصوصی PostgreSQL دسترسی دارد، یا در یک job/اجرای موقت مورداعتماد همان پروژه؛ آن را در هر replica از شروع برنامه اجرا نکنید.
2. حساب اولیه را با `ADMIN_EMAIL` و `ADMIN_PASSWORD` در تنظیمات اجرای موقت همان سرویس Docker یا job مورداعتماد تنظیم و `npm run db:seed-admin` را یک‌بار اجرا کنید. اسکریپت‌ها و SQL migration در ایمیج قرار دارند؛ `pg` از وابستگی‌های runtime برنامه است. گذرواژهٔ واقعی را بعد از اجرا از محیط موقت حذف کنید.
3. ورود مدیر را در `/fa/admin/login` بازبینی کنید.
4. `/api/health` باید پاسخ سلامت فرایند و `/api/ready` باید پاسخ اتصال پایگاه داده بدهد. Docker image healthcheck فقط `/api/health` را می‌سنجد؛ مسیر آماده‌بودن DB جداگانه در دسترس است.

اسکریپت seed فقط در نبود مدیر حساب می‌سازد و اجرای دوباره را رد می‌کند. برای مهاجرت‌های بعدی `npm run db:new-migration -- add_a_short_name` را اجرا کنید، SQL را با `src/db/schema.ts` هماهنگ و بازبینی کنید، سپس آن را یک‌بار پیش از rollout برنامه اجرا کنید. فایل migration ثبت‌شده را تغییر ندهید.

## ۷. بررسی پس از انتشار

- دامنه را با HTTPS باز کنید و هر دو زبان `/fa` و `/en`، صفحهٔ فروشگاه خالی، ورود مدیر و صفحهٔ تنظیمات را بررسی کنید.
- `/api/health` و `/api/ready` را جداگانه بررسی کنید.
- در پنل یا با `runflare logs -f` خطاهای build/runtime را دنبال کنید؛ در صورت تغییر متغیر محیطی، سرویس را طبق تنظیمات پنل restart/redeploy کنید.
- یک تصویر غیرواقعی به کاتالوگ اضافه نکنید. پیش از انتشار محصول باید پست رسمی، متن و گزینه‌های قابل مشاهده، وضعیت قیمت و تصویر مرجع آن بررسی شود.
- درگاه واقعی متصل نیست؛ سفارش پرداختی تولیدی ثبت نمی‌شود. ثبت درخواست استعلام قیمت می‌تواند بدون مبلغ انجام شود.

## ۸. پشتیبان‌گیری و بازگردانی

برای PostgreSQL برنامهٔ پشتیبان‌گیری منظم و نگهداری خارج از چرخهٔ deploy تنظیم کنید و پیش از هر تغییر پرریسک نسخهٔ قابل بازگردانی داشته باشید. مستند Runflare روندهای [ساخت پشتیبان](https://runflare.com/docs/backup/how-to-generate-backup/) و [بازگردانی](https://runflare.com/docs/backup/how-to-restore-backup/) را شرح می‌دهد؛ بررسی کنید نوع سرویس و پلن شما از همان روند پشتیبانی کند. بازیابی پایگاه داده و بازیابی bucket تصاویر دو کار جدا هستند؛ برای هر دو نسخهٔ پشتیبان مستقل نگه دارید.
