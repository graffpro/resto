import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';

// Check if running inside Capacitor native app
export const isNativeApp = Capacitor.isNativePlatform();

// Initialize Capacitor plugins
export const initCapacitor = async () => {
  if (!isNativeApp) return;

  try {
    // Request notification permissions
    const permResult = await LocalNotifications.requestPermissions();
    console.log('[Capacitor] Notification permissions:', permResult);

    // Set status bar
    try {
      const { StatusBar } = await import('@capacitor/status-bar');
      await StatusBar.setBackgroundColor({ color: '#1A4D2E' });
    } catch (e) {
      console.log('[Capacitor] StatusBar not available');
    }
  } catch (e) {
    console.error('[Capacitor] Init error:', e);
  }

  // Handle app state changes - keep WebSocket alive
  App.addListener('appStateChange', ({ isActive }) => {
    console.log('[Capacitor] App state changed. Active:', isActive);
    if (isActive) {
      window.dispatchEvent(new CustomEvent('capacitor-resume'));
    }
  });

  // Listen for local notification actions
  LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
    console.log('[Capacitor] Notification tapped:', notification);
  });
};

// Counter for unique notification IDs
let notifCounter = 1;

// Send a local notification (for background alerts)
export const sendLocalNotification = async (title, body) => {
  if (!isNativeApp) return;

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: notifCounter++,
          channelId: 'order_notifications',
          sound: null, // Use default system sound
          smallIcon: 'ic_stat_name',
          largeIcon: 'ic_launcher',
          iconColor: '#C05C3D',
          ongoing: false,
          autoCancel: true,
        },
      ],
    });
  } catch (e) {
    console.error('[Capacitor] Local notification error:', e);
  }
};

// Vibrate for attention
export const vibrateDevice = async () => {
  if (!isNativeApp) return;
  try {
    const { Haptics } = await import('@capacitor/haptics');
    await Haptics.vibrate({ duration: 1000 });
  } catch (e) {
    // Fallback to navigator vibrate
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
  }
};
