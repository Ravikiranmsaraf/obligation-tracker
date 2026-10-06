import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyADaPeBRIF0V8zfTr3RmzGBevuhmNRjDg4",
  authDomain: "obligation-tracker-19de9.firebaseapp.com",
  projectId: "obligation-tracker-19de9",
  storageBucket: "obligation-tracker-19de9.firebasestorage.app",
  messagingSenderId: "894777437404",
  appId: "1:894777437404:web:44500f1b6bd450d0879819"
};
export const VAPID_KEY = "BIjKl5baFnauWrmuEuaTvDFctYFWy10g3TRmIgxOn6M5PMCb52D439lelyaPHSrnYfJbq42B_IMkgeq0p6HawgE";

const app = initializeApp(firebaseConfig);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;