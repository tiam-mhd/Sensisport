# Sensi Sport

فروشگاه دوزبانهٔ فارسی و انگلیسی برای تجهیزات رزمی. برنامه با Next.js، React، TypeScript، PostgreSQL و Drizzle ساخته شده و برای اجرای کانتینری روی Runflare آماده شده است.

## وضعیت محتوا

- کاتالوگ محصول عمداً خالی است. هیچ نام، قیمت، موجودی، ویژگی، ضمانت یا روش ارسالی از روی حدس وارد نشده است.
- صفحهٔ اصلی از تصویر پیوست‌شدهٔ کاربر در `public/images/hero/ninja-hero.png` استفاده می‌کند.
- حساب عمومی [sensi_sport](https://www.instagram.com/sensi_sport/) از محیط مرور این پروژه قابل بررسی نبود. نتیجه در `content/instagram-source-audit.json` ثبت شده؛ CSV هم فقط سرستون‌های ممیزی را دارد.
- هویت بصری رسمی از Instagram قابل تأیید نبود؛ ظاهر فعلی فقط از تصویر قهرمان پیوست‌شده الهام گرفته، تک‌رنگ است و نشان نوشتاری «SENSI SPORT» را به‌عنوان متن موقت نشان می‌دهد، نه لوگو یا رنگ رسمی.
- درگاه پرداخت واقعی پیاده‌سازی نشده است. سفارش مبلغ‌دار در تولید غیرفعال می‌ماند؛ درخواست استعلام قیمت بدون ثبت مبلغ قابل استفاده است.

## اجرای محلی با Docker Compose

نیازمندی‌ها: Node.js 22، npm و Docker Engine به‌همراه Docker Compose.

```powershell
Copy-Item .env.example .env
```

در `.env` یک `AUTH_SECRET` تصادفی ۳۲ بایتی یا بیشتر بگذارید و `ADMIN_EMAIL` و `ADMIN_PASSWORD` را با مقادیر واقعی خود عوض کنید. برای ساخت secret می‌توان از این دستور استفاده کرد و خروجی را در `.env` گذاشت:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

سپس وابستگی‌ها را نصب و سرویس‌های پایگاه داده و رسانه را اجرا کنید:

```powershell
npm.cmd install
docker compose up -d db minio
npm.cmd run db:migrate
npm.cmd run db:seed-admin
docker compose up --build -d web
```

فروشگاه روی `http://localhost:3000/fa` و `http://localhost:3000/en` در دسترس است. پنل مدیریت پس از ساخت مدیر اولیه در `/fa/admin/login` یا `/en/admin/login` قرار دارد. برای اجرای مستقیم بدون Docker، پس از مهاجرت پایگاه داده از `npm.cmd run dev` استفاده کنید.

برای توقف سرویس‌ها:

```powershell
docker compose down
```

این دستور volumeها و داده‌ها را پاک نمی‌کند. از `docker compose down -v` فقط وقتی استفاده کنید که حذف داده‌های محلی موردنظر باشد.

## پایگاه داده و مدیر اولیه

- مدل‌ها در `src/db/schema.ts` هستند؛ migrationهای نسخه‌بندی‌شده در `src/db/migrations/` نگهداری می‌شوند.
- پس از تغییر schema، فایل SQL تازه را با `npm run db:new-migration -- add_a_short_name` بسازید، DDL آن را با `src/db/schema.ts` هماهنگ کنید و همراه کد نگه دارید. migrationهای اجراشده با checksum محافظت می‌شوند و نباید ویرایش شوند. اجرای migrationها با `npm run db:migrate` انجام می‌شود.
- `npm run db:seed-admin` فقط نخستین حساب مدیر را می‌سازد؛ ایمیل واقعی و گذرواژهٔ منحصربه‌فرد ۱۶ تا ۲۰۰ نویسه لازم است. این فرمان اگر مدیری از قبل وجود داشته باشد متوقف می‌شود. هر دو فرمان نگهداری از Node.js و بستهٔ `pg` استفاده می‌کنند و داخل ایمیج تولید هم قرار دارند.
- رمزهای عبور با scrypt هش می‌شوند؛ نشست با کوکی HttpOnly امضاشده نگهداری می‌شود.

## رسانه، کاتالوگ و سفارش‌ها

- توسعه از MinIO در Docker Compose استفاده می‌کند. تولید به یک فضای ذخیره‌سازی S3-compatible مانند R2 یا S3 نیاز دارد؛ `S3_ENDPOINT`، `S3_REGION`، `S3_BUCKET`، `S3_ACCESS_KEY_ID` و `S3_SECRET_ACCESS_KEY` را در محیط تولید تنظیم کنید.
- برای انتشار محصول، منبع عمومی Instagram، دو ترجمه، وضعیت قیمت، و تصویر مرجع بررسی‌شده لازم است. تا وقتی اطلاعات از منبع معتبر نیامده، محصول را پیش‌نویس نگه دارید.
- از بخش محصولات پنل مدیریت، تصویر اصلی مرجع را بارگذاری کنید. تصویر سایت فقط وقتی اضافه شود که همان محصول را با وفاداری کامل نمایش دهد؛ تصویر مرجع و تصویر تولیدشده در پنل از هم مشخص‌اند.
- قیمت در کوچک‌ترین واحد پول و به‌صورت integer ذخیره می‌شود. برای «استعلام قیمت» مبلغ ثبت نکنید.
- روش ارسال، کوپن و متن خدمات فقط بعد از تأیید فروشگاه از پنل مدیریت فعال شوند.
- `/api/health` سلامت فرایند را می‌سنجد و `/api/ready` اتصال PostgreSQL را بررسی می‌کند.

## فرمان‌های نگهداری و بررسی

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

راهنمای جزئی انتشار روی میزبان در [docs/runflare-deployment.fa.md](docs/runflare-deployment.fa.md) است.
