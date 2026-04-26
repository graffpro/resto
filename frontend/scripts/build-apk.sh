#!/bin/bash
# QR Restoran - APK Build Script
# Bu script sizin Oracle serveriniz üçün APK build edir
#
# İstifadə:
#   ./build-apk.sh https://sizin-server-adresiniz.com
#
# Əvvəlcədən lazım olan proqramlar:
#   - Java 17+ (sudo apt install default-jdk)
#   - Node.js 20+
#   - yarn

set -e

SERVER_URL=${1:-"https://qr-order-platform-5.preview.emergentagent.com"}
echo "=========================================="
echo "  QR Restoran APK Builder"
echo "  Server: $SERVER_URL"
echo "=========================================="

cd "$(dirname "$0")/.."

# Update capacitor config with server URL
cat > capacitor.config.ts << CAPEOF
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.qrrestoran.staff',
  appName: 'QR Restoran',
  webDir: 'build',
  server: {
    url: '${SERVER_URL}',
    cleartext: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_notification",
      iconColor: "#C05C3D",
      sound: "alarm.wav",
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1A4D2E",
      showSpinner: true,
      spinnerColor: "#C05C3D",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#1A4D2E",
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
CAPEOF

echo "[1/4] Frontend build edilir..."
ESLINT_NO_DEV_ERRORS=true CI=false GENERATE_SOURCEMAP=false REACT_APP_BACKEND_URL="$SERVER_URL" yarn build

echo "[2/4] Android sync edilir..."
npx cap sync android

echo "[3/4] APK build edilir..."
cd android
./gradlew assembleDebug --no-daemon

echo "[4/4] APK kopyalanır..."
cp app/build/outputs/apk/debug/app-debug.apk ../build/qr-restoran.apk

echo ""
echo "=========================================="
echo "  APK HAZIRDIR!"
echo "  Fayl: build/qr-restoran.apk"
echo "  Server: $SERVER_URL"
echo "  Ölçü: $(du -h ../build/qr-restoran.apk | cut -f1)"
echo "=========================================="
echo ""
echo "  Android telefona yükləmək üçün:"
echo "  1. APK faylını telefona göndərin (WhatsApp, Telegram, USB)"
echo "  2. Telefonda 'Naməlum mənbələr'dən quraşdırmaya icazə verin"
echo "  3. APK-nı açıb quraşdırın"
