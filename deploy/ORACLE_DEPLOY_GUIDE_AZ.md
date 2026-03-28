# Oracle Cloud Free Tier - Deploy Təlimatı

## 1. Oracle Cloud Hesabı Yaradın
1. https://cloud.oracle.com/free saytına daxil olun
2. "Start for Free" düyməsinə basın
3. Qeydiyyatdan keçin (kredit kartı lazımdır, amma pulsuz tier-dən istifadə etdikdə pul tutulmur)

## 2. VM (Virtual Maşın) Yaradın
1. Oracle Cloud Console-da "Compute > Instances" bölməsinə keçin
2. "Create Instance" basın
3. Parametrlər:
   - **Ad**: `qr-restoran`
   - **Image**: Ubuntu 22.04 (və ya Oracle Linux 8)
   - **Shape**: `VM.Standard.E2.1.Micro` (Always Free!)
   - **RAM**: 1 GB
   - **Boot volume**: 50 GB (pulsuz)
4. SSH key-i yükləyin (kompüterinizdə `ssh-keygen` ilə yaradın)
5. "Create" basın

## 3. Firewall (Security List) Açın
1. "Networking > Virtual Cloud Networks" bölməsinə keçin
2. VCN-ə daxil olun > "Security Lists" > Default Security List
3. "Add Ingress Rules" basın:
   - **Source CIDR**: `0.0.0.0/0`
   - **Destination Port**: `80,443`
   - **Protocol**: TCP
4. VM-in iptables-ini da açın:
```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## 4. Docker Quraşdırın (SSH ilə VM-ə qoşulduqdan sonra)
```bash
# VM-ə SSH ilə qoşulun
ssh -i ~/.ssh/your_key ubuntu@YOUR_VM_IP

# Docker quraşdırın
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Docker Compose quraşdırın
sudo apt-get install -y docker-compose-plugin

# Çıxıb yenidən daxil olun (docker qrupu aktivləşsin)
exit
ssh -i ~/.ssh/your_key ubuntu@YOUR_VM_IP
```

## 5. Layihəni Yükləyin
```bash
# Git quraşdırın (əgər yoxdursa)
sudo apt-get install -y git

# Layihəni klonlayın (GitHub-dan Save etdikdən sonra)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

## 6. Environment Dəyişənlərini Qurun
```bash
cd deploy
cp .env.example .env
nano .env
```

`.env` faylını belə redaktə edin:
```
REACT_APP_BACKEND_URL=http://YOUR_VM_IP
MONGO_URL=mongodb://mongo:27017
DB_NAME=restaurant_db
```

> `YOUR_VM_IP` yerinə Oracle VM-nizin Public IP ünvanını yazın.

## 7. Deploy edin!
```bash
# deploy qovluğundan
docker compose up -d --build
```

Bu komanda:
- React frontend-i build edəcək
- FastAPI backend-i hazırlayacaq
- MongoDB başladacaq
- Nginx reverse proxy quracaq

## 8. Test edin
Brauzerdə açın: `http://YOUR_VM_IP`

## 9. Domain Bağlayın (İstəyə bağlı)
1. Freenom.com və ya başqa xidmətdən pulsuz domain alın
2. DNS-i VM-in IP-sinə yönləndirin
3. SSL sertifikatı üçün:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## 10. Yeniləmə (Update)
```bash
cd YOUR_REPO
git pull
cd deploy
docker compose up -d --build
```

---

## Faydalı Komandalar
```bash
# Logları görmək
docker compose logs -f

# Yenidən başlatmaq
docker compose restart

# Dayandırmaq
docker compose down

# MongoDB yedekləmə (backup)
docker compose exec mongo mongodump --out /data/backup
docker cp $(docker compose ps -q mongo):/data/backup ./backup
```

## Problem həlli
- **Səhifə açılmırsa**: `sudo iptables -L` ilə firewall-u yoxlayın
- **Backend xətası**: `docker compose logs app` ilə logları yoxlayın
- **MongoDB xətası**: `docker compose logs mongo` ilə yoxlayın
- **RAM bitibsə**: Swap əlavə edin:
```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```
