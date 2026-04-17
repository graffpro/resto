import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.qrrestoran.staff',
  appName: 'QR Restoran',
  webDir: 'build',
  server: {
    // This will be overridden by the user's actual server URL
    url: 'https://table-sync-pro.preview.emergentagent.com',
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
    webContentsDebuggingEnabled: true,
  },
};

export default config;
