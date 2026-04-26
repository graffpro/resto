# 🚀 Deploy Təlimatı — QR Restoran SaaS

Bu sənəd Contabo VPS (resto.az) üzərində dəyişikliklərin tətbiqi üçün addım-addım təlimatdır.

---

## 1️⃣ Lokal: Save to GitHub

Emergent platform-da chat input-da **"Save to Github"** düyməsini istifadə edin:
- Platform avtomatik commit + push edir
- VPS-də sadəcə `git pull` etmək lazımdır

---

## 2️⃣ Contabo VPS-də (resto.az) Deploy

### A) SSH ilə bağlanın:

```bash
ssh root@<your-contabo-ip>
cd /path/to/qr-restoran   # məs: /opt/resto
```

### B) Yeni kodu çəkin:

```bash
git pull origin main
```

### C) Backend dəyişiklikləri (yeni Python paketləri):

```bash
# emergentintegrations paketi yoxdursa quraşdır:
docker compose exec backend pip install emergentintegrations \
  --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# Və ya tam yenidən qur:
docker compose build backend
```

### D) Backend `.env`-də ƏMİN OLUN ki bu var:

```env
EMERGENT_LLM_KEY=sk-emergent-6536b57F5882a67E95
MONGO_URL=mongodb://mongo:27017
DB_NAME=qr_restoran
```

> ⚠️ **Vacib:** `EMERGENT_LLM_KEY` olmasa partner şərhlərinin tərcüməsi işləməyəcək.

### E) Frontend yenidən qur:

```bash
docker compose build frontend
```

### F) Konteynerləri yenidən başlat:

```bash
docker compose down
docker compose up -d

# Logları izləyin:
docker compose logs -f backend
```

### G) Brauzer keşini təmizləyin:

Müştərilərə deyin:
- **Ctrl+Shift+R** (hard refresh)
- Və ya APK üçün: tətbiqi bağlayıb yenidən açın (Capacitor avtomatik yeni JS chunk-ı çəkir)

---

## 3️⃣ Migration (avtomatik)

Backend startup-da bu avtomatik işləyir:
- Köhnə məlumatlara `restaurant_id` daxil edilir (multi-tenant migration)
- `partner_restaurants`, `partner_ratings`, `translation_cache` kolleksiyaları avtomatik yaradılır

Heç bir manual SQL/MongoDB əmri lazım deyil ✅

---

## 4️⃣ Deploy-dan sonra yoxlama

```bash
# Backend sağlam:
curl https://resto.az/api/health

# Tərcümə endpoint:
curl -X POST https://resto.az/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"Çox gözəl!","target_lang":"en"}'

# Partnyor siyahısı:
curl https://resto.az/api/partner-restaurants

# Owner dashboard mövcuddur:
# https://resto.az/owner/partners
```

---

## 5️⃣ Android APK yenilənməsi

APK Capacitor üzərindən qurulur. WebView avtomatik yeni frontend-i çəkir, **APK-nı yenidən qurmaq lazım deyil** (yalnız native plugin əlavə etsəniz).

Native değişiklik gerek olarsa:

```bash
cd /opt/resto/frontend
yarn build
npx cap sync android
cd android && ./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
cp app/build/outputs/apk/debug/app-debug.apk \
   /opt/resto/frontend/public/qr-restoran.apk
```

---

## 6️⃣ Geri qaytarma (rollback)

Bir problem olarsa:

```bash
git log --oneline -10           # son 10 commit-i görün
git reset --hard <commit-hash>  # əvvəlki versiyaya qayıdın
docker compose down && docker compose up -d --build
```

---

## ✅ Bu Sessiyada Edilənlər (deploy etdikdən sonra istifadəçilərə görünəcək)

1. **Multi-tenant data izolyasiyası** — yeni restoranlar artıq bir-birinin məlumatlarını görmür
2. **Admin aktivləşdirmə bug-ı** — admin yenidən aktivləşdirildikdə işçilər də aktivləşir
3. **4 dil dəstəyi** — Az / Tr / Ru / En, brauzer dilindən avtomatik
4. **Partnyor Restoranlar bölməsi** — Landing-də public partnyor kataloqu, reytinq, xəritə
5. **AI ilə şərh tərcüməsi** — hər partnyor şərhində "Tərcümə et" düyməsi
6. **Dialog/modal-ların tam tərcüməsi**
7. **`/login` redirect bug-ı düzəldildi** — root domain artıq landing-i göstərir

---

## 📞 Dəstək

Problem olarsa:
- Backend log: `docker compose logs backend --tail=200`
- Frontend log: `docker compose logs frontend --tail=200`
- Mongo log: `docker compose logs mongo --tail=50`

İdeal olaraq sistemdə Sentry və ya UptimeRobot quraşdırın ki problemlər avtomatik aşkarlansın.
