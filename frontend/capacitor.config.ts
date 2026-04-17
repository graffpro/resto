import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.qrrestoran.staff',
  appName: 'QR Restoran',
  webDir: 'build',
  server: {
    url: 'https://resto.az',
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
