# QR Restoran — Quraşdırma və Yeniləmə Təlimatı

## Yeniləmə (Artıq işləyən sistem)

```bash
cd /path/to/project
git pull
docker compose -f deploy/docker-compose.yml build
docker compose -f deploy/docker-compose.yml up -d
```

**VACİB**: Bu əmrlər:
- ✅ Yeni kodu yükləyir
- ✅ Docker image yenidən build edir
- ✅ Konteynerləri yenidən başladır
- ✅ MongoDB məlumatları QORUNUR (volume ilə saxlanılır)
- ✅ Köhnə QR kodlar işləyir (IP ilə olanlar da)
- ✅ Mövcud istifadəçilər, sifarişlər, masalar — hamısı saxlanılır
- ❌ `docker compose down -v` İSTİFADƏ ETMƏYİN! `-v` flag volume-ları (databazanı) silir!

---

## Android APK Quraşdırması (Mətbəx / Ofisiant üçün)

### APK Yükləmə:
1. Telefondan bu linki açın: `https://resto.az/qr-restoran.apk`
2. YAXUD: Admin panel → sol menyu → aşağıda yaşıl **"Android APK"** düyməsinə basın

### Telefona Quraşdırma:
1. APK yükləndikdən sonra açın
2. "Naməlum mənbələrdən quraşdırma" soruşarsa → **İcazə verin**
   - Samsung: Ayarlar → Tətbiqlər → Xüsusi giriş → Naməlum tətbiqlər
   - Xiaomi: Ayarlar → Əlavə ayarlar → Gizlilik → Naməlum mənbələr
3. **"Quraşdır"** basın
4. Tətbiqi açın → Giriş ekranı gələcək

### Daxil Olma:
- Mətbəx istifadəçisi: admin paneldə yaradılmış mətbəx login
- Ofisiant istifadəçisi: admin paneldə yaradılmış ofisiant login

### Tətbiqin Xüsusiyyətləri:
- 📱 Ekran həmişə açıq qalır (bağlanmır)
- 🔔 Yeni sifariş gəldikdə davamlı alarm səsi + vibrasiya
- 📡 WebSocket ilə real-time bildirişlər
- 🔄 Hər 4 saniyədə avtomatik yeniləmə
- ⏰ Vaxtlı xidmət bitdikdə xəbərdarlıq

### APK Yeniləmə:
APK yenidən yükləməyə ehtiyac **YOXDUR**! Tətbiq resto.az-dan yüklənir. 
Serverdə kod dəyişdikdə tətbiq avtomatik yeni versiyani göstərəcək.

---

## Köhnə QR Kodlar Haqqında

Köhnə QR kodlar (IP ilə yaradılmış) işləyir çünki:
- `http://178.18.240.211` → `https://resto.az` redirect edir
- Frontend həm `/table/:id` həm `/customer/:id` marşrutlarını dəstəkləyir
- Heç bir köhnə QR kod dəyişdirilmir

Yeni yaradılan masaların QR kodları avtomatik `https://resto.az` ilə yaradılacaq.

---

## Təhlükəsizlik

- MongoDB volume-u `mongo_data` — konteyner yenidən başlasa belə məlumatlar saxlanılır
- Yükləmələr volume-u `uploads_data` — şəkillər saxlanılır
- `docker compose down -v` **HEÇ VAXT** istifadə etməyin!
