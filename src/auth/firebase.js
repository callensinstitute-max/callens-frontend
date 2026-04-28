import { initializeApp, getApps, getApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const ALLOWED_LOGIN_EMAIL = "arpitsaxena9798@gmail.com";

const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !String(value || "").trim())
  .map(([key]) => key);

if (missingConfig.length) {
  throw new Error(
    `Missing Firebase config: ${missingConfig.join(", ")}. Set the Vite Firebase environment variables before starting the app.`
  );
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

provider.setCustomParameters({
  prompt: "select_account",
});

let persistenceReadyPromise;

function ensurePersistence() {
  if (!persistenceReadyPromise) {
    persistenceReadyPromise = setPersistence(auth, browserLocalPersistence);
  }

  return persistenceReadyPromise;
}

export async function signInWithGoogle() {
  await ensurePersistence();
  return signInWithPopup(auth, provider);
}

export async function signOutUser() {
  return signOut(auth);
}

export async function getCurrentIdToken() {
  await ensurePersistence();

  if (!auth.currentUser) {
    return null;
  }

  return auth.currentUser.getIdToken();
}

export { auth };
