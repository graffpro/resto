import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';

// Check if running inside Capacitor native app
export const isNativeApp = Capacitor.isNativePlatform();

// Initialize Capacitor plugins
export const initCapacitor = async () => {
  if (!isNativeApp) return;

  try {
    // Request notification permissions
    const permResult = await LocalNotifications.requestPermissions();
    console.log('Notification permissions:', permResult);

    // Set dark status bar
    await StatusBar.setBackgroundColor({ color: '#1A4D2E' });
  } catch (e) {
    console.error('Capacitor init error:', e);
  }

  // Handle app state changes - keep WebSocket alive
  App.addListener('appStateChange', ({ isActive }) => {
    console.log('App state changed. Is active?', isActive);
    if (isActive) {
      // App came to foreground - reconnect WebSocket if needed
      window.dispatchEvent(new CustomEvent('capacitor-resume'));
    }
  });
};

// Send a local notification (for background alerts)
export const sendLocalNotification = async (title, body) => {
  if (!isNativeApp) return;

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Date.now(),
          sound: 'alarm.wav',
          smallIcon: 'ic_notification',
          iconColor: '#C05C3D',
          ongoing: false,
          autoCancel: true,
          extra: { type: 'order' },
        },
      ],
    });
  } catch (e) {
    console.error('Local notification error:', e);
  }
};

// Vibrate for attention
export const vibrateDevice = async () => {
  if (!isNativeApp) return;
  try {
    const { Haptics } = await import('@capacitor/haptics');
    await Haptics.vibrate({ duration: 1000 });
  } catch (e) {
    console.error('Vibrate error:', e);
  }
};
