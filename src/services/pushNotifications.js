import { notificationsApi } from './notificationsApi';
import { requestFirebaseNotificationPermission } from '../utils/firebase';

let registeredToken = null;

export const registerPushNotifications = async ({ requestPermission = false } = {}) => {
  try {
    const token = await requestFirebaseNotificationPermission({ requestPermission });
    if (token) {
      if (token !== registeredToken) {
        await notificationsApi.registerDevice(token, 'web', navigator.userAgent, navigator.platform);
        registeredToken = token;
        console.log('FCM token registered with backend successfully.');
      }
    }
  } catch (error) {
    console.error('Failed to register push notifications:', error);
  }
};

export const enablePushNotifications = () => registerPushNotifications({ requestPermission: true });

export const unregisterPushNotifications = async () => {
  if (registeredToken) {
    try {
      await notificationsApi.unregisterDevice(registeredToken);
      registeredToken = null;
      console.log('FCM token unregistered from backend.');
    } catch (error) {
      console.error('Failed to unregister push notifications:', error);
    }
  }
};
