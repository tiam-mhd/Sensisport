# استقرار Sensi Sport روی Runflare

این راهنما برای سرویس Docker این مخزن نوشته شده است. برنامه روی پورت داخلی `3000` گوش می‌دهد، Next.js را با `output: "standalone"` می‌سازد و فایل‌های رسانه را روی دیسک کانتینر نگه نمی‌دارد. معماری تولید سه بخش دارد:

1. سرویس اپلیکیشن Docker از همین مخزن؛
2. سرویس PostgreSQL جدا در همان پروژهٔ Runflare؛
3. فضای ذخیره‌سازی S3-compatible بیرونی برای تصاویر محصول.

برای انتشار این مخزن از **سرویس Docker با اتصال GitHub** استفاده کنید. منابع رسمی مربوط: [ساخت پروژه و برنامه Docker](https://docs.runflare.com/docker/docker-create-app/)، [اتصال GitHub و Auto Pull](https://docs.runflare.com/docker/deploy-github/)، [متغیرهای محیطی Docker](https://docs.runflare.com/docker/docker-environment-variable/)، [اتصال داخلی PostgreSQL](https://runflare.com/docs/postgres/)، [دامنه برای Docker](https://docs.runflare.com/docker/docker-add-domain/) و [پشتیبان‌گیری](https://runflare.com/docs/backup/how-to-generate-backup/).

## ۱. چه چیزهایی بسازم؟

در یک پروژه و یک location این دو deployment را بسازید:

| نوع | نام پیشنهادی | تنظیم اصلی |
| --- | --- | --- |
| برنامه Docker | `sensisport-web` | از Dockerfile ریشهٔ مخزن؛ پورت کانتینر `3000` |
| دیتابیس PostgreSQL | `sensisport-db` | نسخهٔ 16 در صورت انتخاب نسخه؛ فقط دسترسی داخلی |

فایل‌های محصول در فضای S3-compatible بیرونی قرار می‌گیرند؛ این مورد deployment رانفلر نیست. یک bucket خصوصی بسازید و endpoint و کلیدهای محدود به همان bucket را بگیرید. برنامه bucket را هنگام اولین upload می‌تواند بسازد، اما ساخت دستی bucket از قبل و دادن مجوز حداقلی `Head/List`, `Get`, `Put`, `Delete` مناسب‌تر است.

دو deployment بالا در یک پروژه باشند تا برنامه با hostname داخلی دیتابیس وصل شود. برای PostgreSQL دامنهٔ عمومی یا پورت ورودی باز نکنید؛ Runflare در اتصال داخلی استفاده از hostname دیتابیس را پشتیبانی می‌کند و پورت در صورت نیاز `5432` است. در این حالت Network جداگانه‌ای لازم نیست.

منابع در Runflare در سطح پروژه محدود و بین سرویس‌ها تقسیم می‌شوند. برای تست اولیه می‌توانید از پلن رایگان فعلی استفاده کنید؛ صفحهٔ رسمی آن 3GB RAM، حدود 1.5GHz CPU، 3GB دیسک و 2 deployment را برای 3 ماه نشان می‌دهد، اما backup ندارد. آن را فقط برای تست انتخاب کنید. برای فروش واقعی پلنی بگیرید که backup داشته باشد و مجموع RAM/CPU/disk کافی برای هر دو سرویس بدهد؛ مصرف و قیمت را پیش از سفارش در [صفحهٔ Docker و پلن‌ها](https://runflare.com/هاست-ابری-docker/) دوباره بررسی کنید. این پروژه برای توسعه نیازمند build چندمرحله‌ای Next.js است؛ اگر build با کمبود RAM شکست خورد منابع برنامه را بالا ببرید.

برای شروع کم‌ترافیک، تخصیص تخمینی **۲GB RAM / 1GHz CPU / 3GB disk برای Docker** و **۱GB RAM / 0.5GHz CPU / 5GB disk برای PostgreSQL** در نظر بگیرید؛ جمع منابع این دو ردیف باید داخل پلن پروژه جا شود. این تخمین تضمین عملکرد نیست؛ با خطاهای build و آمار واقعی منابع را تنظیم کنید. پلن رایگان 3GB دیسک دارد و این تقسیم‌بندی را پوشش نمی‌دهد.

## ۲. ساخت پروژه و سرویس‌ها

1. در پنل Runflare روی **ایجاد پروژه** بزنید؛ شناسهٔ پیشنهادی `sensisport` است. لوکیشن را متناسب با کاربران فروشگاه انتخاب کنید.
2. در بخش سرویس‌های پروژه، نوع **Docker** را انتخاب و برنامه‌ای به نام `sensisport-web` بسازید. سورس از ریشهٔ GitHub می‌آید و Dockerfile در ریشهٔ مخزن است. اگر پنل پورت کانتینر می‌خواهد، `3000` را ثبت کنید.
3. از بخش دیتابیس‌ها در همان پروژه، **PostgreSQL** بسازید. نام پیشنهادی `sensisport-db` است. اگر پنل اجازه می‌دهد database و user جداگانه بسازید، `sensishop` و یک user اختصاصی انتخاب کنید؛ در غیر این صورت مشخصات تولیدشده در جزئیات سرویس را استفاده کنید.
4. بعد از ساخت دیتابیس، hostname داخلی، database، username و password را از صفحهٔ جزئیات آن بردارید. URL تولیدشدهٔ پنل را ترجیح دهید؛ اگر URL را دستی می‌سازید، password دارای نویسه‌های ویژه باید URL-encode شود.
5. هیچ port forwarding یا دسترسی عمومی برای دیتابیس تنظیم نکنید. `DATABASE_URL` برنامه باید hostname داخلی دیتابیس همین پروژه را استفاده کند، نه `localhost`.

Runflare منابع پروژه را بین deploymentها تقسیم می‌کند؛ تعداد deployment موردنیاز را حداقل 2 بگیرید. [راهنمای ساخت پروژه](https://runflare.com/docs/create-project/) و [راهنمای ساخت Docker item](https://docs.runflare.com/docker/docker-create-app/) مراحل پنل را نشان می‌دهند.

## ۳. اتصال مخزن GitHub

1. در جزئیات سرویس Docker گزینهٔ **اتصال به مخزن Git** را باز کنید و روش **GitHub OAuth App** را انتخاب کنید.
2. Runflare را در GitHub مجاز کنید و فقط مخزن `Sensisport` را به آن دسترسی دهید.
3. مخزن `tiam-mhd/Sensisport` و branch `main` را انتخاب و ذخیره کنید.
4. جدیدترین commit روی `main` را در فهرست commitها انتخاب و deploy/revert کنید.
5. گزینهٔ **Auto Pull** را روشن کنید تا pushهای بعدی به `main` خودکار به‌روزرسانی شوند.

این مخزن public است؛ روش OAuth App پیشنهادی است و نیازی به ساخت Personal Access Token کلاسیک ندارد. جزئیات را در [راهنمای رسمی استقرار Docker با GitHub](https://docs.runflare.com/docker/deploy-github/) ببینید.

در مخزن فعلی هنوز `package-lock.json` نیست؛ Dockerfile برای این مرحله از `npm install` استفاده می‌کند. پس از در دسترس بودن npm registry، `npm install` را اجرا و lockfile را commit کنید تا buildهای بعدی با `npm ci` تکرارپذیر شوند.

## ۴. متغیرهای محیطی سرویس وب

در تنظیمات سرویس Docker، بخش **متغیر محیطی** را باز کنید. Bulk Edit فایل `NAME=value` را می‌پذیرد. برای مقدارهای زیر که با `<...>` مشخص شده‌اند، قبل از ذخیره مقدار واقعی را جایگزین کنید؛ آن‌ها را با براکت عیناً ذخیره نکنید.

```dotenv
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
APP_URL=https://sensishop.timocode.ir
DATABASE_URL=postgresql://<DB_USER>:<URL_ENCODED_DB_PASSWORD>@<PRIVATE_DB_HOST>:5432/<DB_NAME>
DB_POOL_MAX=5
AUTH_SECRET=<GENERATE_A_UNIQUE_SECRET>
AUTH_COOKIE_SECURE=true
S3_ENDPOINT=<S3_PROVIDER_ENDPOINT>
S3_REGION=<S3_PROVIDER_REGION>
S3_BUCKET=sensisport-media
S3_ACCESS_KEY_ID=<S3_ACCESS_KEY>
S3_SECRET_ACCESS_KEY=<S3_SECRET_KEY>
S3_FORCE_PATH_STYLE=true
PAYMENT_PROVIDER=none
```

`PORT` و `HOSTNAME` در Dockerfile هم تنظیم شده‌اند؛ اگر پنل خودش port را می‌گیرد، همچنان port کانتینر باید `3000` باشد. `APP_URL` را فقط بعد از آماده‌شدن HTTPS نهایی کنید. اگر دامنه عوض شد، همین مقدار را هم عوض کنید.

برای ساخت `AUTH_SECRET` روی ویندوز Node.js 22:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

در بخش **Secrets** پروژه secretهایی برای `DATABASE_URL`، `AUTH_SECRET` و `S3_ACCESS_KEY_ID` و `S3_SECRET_ACCESS_KEY` بسازید؛ سپس در تنظیم محیطی سرویس Docker برای هرکدام **Mode=Secret** را انتخاب و secret مربوط را متصل کنید. متغیرهای دیگر را **Manual** بگذارید. همه را روی **Use case=Running** تنظیم کنید؛ این برنامه متغیرهای `NEXT_PUBLIC_*` ندارد و تنظیم Build برای این مقادیر لازم نیست. `S3_REGION` و `S3_FORCE_PATH_STYLE` را مطابق ارائه‌دهنده انتخاب کنید. Secret واقعی را در Git، این فایل راهنما یا Docker image نگذارید. راهنمای [Bulk Edit و Secret/Running](https://docs.runflare.com/docker/docker-environment-variable/) جزئیات پنل را شرح می‌دهد.

## ۵. اجرا و بررسی deploy

با GitHub integration، Runflare سورس و Dockerfile را از branch انتخاب‌شده دریافت می‌کند. build از Dockerfile انجام می‌شود؛ دستور build یا start جداگانه در پنل نگذارید. برنامه داخل کانتینر روی `3000` گوش می‌دهد و Docker healthcheck مسیر `/api/health` را می‌خواند.

اگر GitHub integration در دسترس نبود، جایگزین CLI است. نصب Windows طبق [راهنمای CLI](https://docs.runflare.com/docker/deploy-cli/):

```powershell
Invoke-WebRequest -Uri https://get.runflare.com/install.bat -OutFile .\install.bat
.\install.bat
runflare login
```

از ریشهٔ repository اجرا کنید:

```powershell
runflare deploy
```

در اولین deploy، پروژه و Docker item را انتخاب کنید. وضعیت را در سابقهٔ deployment یا با CLI بررسی کنید:

```powershell
runflare events
runflare logs -f
```

CLI از `.gitignore` پیروی می‌کند؛ command `runflare deploy -y` فقط برای مقصد cache‌شده است. جزئیات در [فرمان‌های CLI](https://runflare.com/docs/work-with-cli/cli-commands/) است.

## ۶. migration و مدیر اولیه

بعد از اینکه PostgreSQL ساخته شد و `DATABASE_URL` روی سرویس Docker ذخیره شد:

1. در پنل Runflare وارد Terminal همان Docker item شوید؛ مسیر کاری ایمیج `/app` است.
2. migration اولیه را یک‌بار اجرا کنید:

```sh
cd /app
npm run db:migrate
npm run db:seed-instagram
```

فرمان دوم را پس از migration اجرا کنید تا دسته‌ها، ۱۶ محصولِ استعلام‌محور، ۲۴ منبع پست و پیوند تصاویر محلی در کاتالوگ ثبت شوند. اجرای دوبارهٔ آن رکورد تکراری نمی‌سازد و قیمت/موجودی یا اطلاعات تأییدنشدهٔ ارسال و ضمانت را حدس نمی‌زند.

3. موقتاً در Secrets پروژه `ADMIN_PASSWORD` را بسازید و در متغیرهای محیطی سرویس `ADMIN_EMAIL` و `ADMIN_PASSWORD` را اضافه کنید. برای password از Mode=Secret و برای هر دو Use case=Running استفاده کنید. ذخیره کنید و اگر پنل درخواست کرد سرویس را restart کنید.
4. در همان Terminal مدیر اول را بسازید:

```sh
cd /app
npm run db:seed-admin
```

گذرواژه باید یکتا و ۱۶ تا ۲۰۰ نویسه باشد. پس از پیام موفقیت، `ADMIN_EMAIL` و `ADMIN_PASSWORD` را از متغیرهای سرویس حذف و آن را restart کنید. اسکریپت فقط اولین مدیر را می‌سازد و اجرای دوباره را رد می‌کند. مستندات Docker Runflare دسترسی Terminal درون سرویس را معرفی می‌کند: [سرویس Docker](https://runflare.com/هاست-ابری-docker/).

در deployهای بعدی migrationها را خودکار در هر replica اجرا نکنید. migration تازه را با `npm run db:new-migration -- add_a_short_name` بسازید، SQL را با `src/db/schema.ts` هماهنگ کنید و پیش از rollout، یک‌بار از Terminal اجرا کنید. فایل‌های migration اجراشده با checksum محافظت می‌شوند و نباید ویرایش شوند.

## ۷. دامنه، DNS و TLS

دامنهٔ فعلی فقط مقدار شروع است؛ با تغییر دامنه، مقدار `APP_URL` و تنظیم DNS را عوض کنید.

1. در تنظیمات دامنهٔ پروژه `sensishop.timocode.ir` را بدون `https://` و `www` اضافه کنید.
2. مقدارهای DNS را عیناً از پنل Runflare در DNS provider دامنه ثبت کنید. اگر CDN/proxy دارید، رکورد TXT تأیید مالکیت را هم اگر پنل خواست اضافه کنید؛ IP/TXT را حدس نزنید.
3. پس از فعال‌شدن دامنه، در جزئیات آن گزینهٔ اتصال به سرویس را بزنید و `sensisport-web` را انتخاب کنید.
4. در تنظیم SSL، گواهی رایگان Runflare را انتخاب و ذخیره کنید. پس از فعال‌شدن HTTPS مقدار `APP_URL` را در متغیرهای سرویس روی `https://sensishop.timocode.ir` قرار دهید و سرویس را restart کنید.

DNS دامنهٔ `.ir` ممکن است چند ساعت برای propagation زمان بخواهد. مراحل رسمی: [افزودن دامنه به Docker](https://docs.runflare.com/docker/docker-add-domain/) و [SSL](https://runflare.com/docs/how-to-work-with-ssl/).

## ۸. بررسی پس از انتشار

- دامنه را با HTTPS باز کنید و هر دو زبان `/fa` و `/en`، صفحهٔ فروشگاه خالی، ورود مدیر و صفحهٔ تنظیمات را بررسی کنید.
- `/api/health` و `/api/ready` را جداگانه بررسی کنید.
- در پنل یا با `runflare logs -f` خطاهای build/runtime را دنبال کنید؛ در صورت تغییر متغیر محیطی، سرویس را طبق تنظیمات پنل restart/redeploy کنید.
- یک تصویر غیرواقعی به کاتالوگ اضافه نکنید. پیش از انتشار محصول باید پست رسمی، متن و گزینه‌های قابل مشاهده، وضعیت قیمت و تصویر مرجع آن بررسی شود.
- درگاه واقعی متصل نیست؛ سفارش پرداختی تولیدی ثبت نمی‌شود. ثبت درخواست استعلام قیمت می‌تواند بدون مبلغ انجام شود.

## ۹. پشتیبان‌گیری و بازگردانی

از بخش backup دیتابیس پیش از تغییر schema نسخهٔ پشتیبان بگیرید و بازگردانی را طبق [راهنمای رسمی](https://runflare.com/docs/backup/how-to-restore-backup/) انجام دهید. bucket تصاویر بیرونی است و جداگانه باید backup شود. پلن رایگان Runflare backup ندارد.
