import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';

// Note: Ensure these environment variables are set in your .env file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasCompleteConfig = Object.values(firebaseConfig).every(Boolean);

// Initialize Firebase only if config is provided to avoid crashing the app if missing.
let app = null;
let messaging = null;
let messagingSupportPromise = null;

try {
  if (hasCompleteConfig) {
    app = initializeApp(firebaseConfig);
  } else {
    console.warn('Firebase config is missing. Push notifications will not work. Please add VITE_FIREBASE_* env variables.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase', error);
}

const getMessagingClient = async () => {
  if (!app || typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  if (!messagingSupportPromise) messagingSupportPromise = isSupported();
  if (!(await messagingSupportPromise)) return null;
  if (!messaging) messaging = getMessaging(app);
  return messaging;
};

const registerMessagingWorker = async () => {
  const config = encodeURIComponent(JSON.stringify(firebaseConfig));
  const registration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?config=${config}`,
    { scope: '/' }
  );
  await navigator.serviceWorker.ready;
  if (!registration.active) {
    throw new Error('Firebase messaging service worker did not become active');
  }
  return registration;
};

export const requestFirebaseNotificationPermission = async ({ requestPermission = true } = {}) => {
  const client = await getMessagingClient();
  if (!client || typeof Notification === 'undefined') {
    console.warn('Firebase Messaging is not supported in this browser.');
    return null;
  }

  try {
    let permission = Notification.permission;
    if (permission !== 'granted' && requestPermission && permission !== 'denied') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      const serviceWorkerRegistration = await registerMessagingWorker();
      const currentToken = await getToken(client, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration,
      });

      if (currentToken) {
        return currentToken;
      } else {
        console.warn('No registration token available. Request permission to generate one.');
        return null;
      }
    } else {
      console.warn('Notification permission denied or default.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    return null;
  }
};

export const onForegroundMessage = async (callback) => {
  const client = await getMessagingClient();
  if (!client) return () => {};
  return onMessage(client, callback);
};

export { messaging };
