// NoteVault Hybrid — Firebase project config (12 Nov 2026).
//
// The values below are PLACEHOLDERS ONLY. No real Firebase config, API key,
// or secret belongs in this repo — ever.
//
// How the app gets its config (in order):
//   1. Build-time env vars: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN,
//      VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET,
//      VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID.
//      (Set these in Vercel → Project → Settings → Environment Variables
//      before deploy; Vite inlines them at build time. This is the
//      recommended path — the repo stays clean.)
//   2. The FIREBASE_CONFIG object below, filled in from the Firebase
//      console (Project settings → Your apps → Web app) by the parent at
//      deploy time. Only do this if env vars are not available.
//
// About the apiKey: a Firebase web apiKey is a public client identifier,
// not a secret — it is safe to ship in a web bundle. It is protected by
// Firebase App Check + API restrictions in the Google Cloud console, not by
// secrecy. Even so, this repo ships placeholders only; the real values live
// in the console / deploy env vars, never in git.
//
// Cloud model: gemini-3.5-flash-lite (current stable flash-lite, released
// 21 Jul 2026 — verified on the official supported-models page, 12 Nov 2026).
// gemini-2.5-flash-lite is being retired: the same page routes its requests
// to gemini-3.5-flash-lite from 1 Dec 2026. Do not use a 2.5 model name.

export const CLOUD_MODEL = "gemini-3.5-flash-lite";

// reCAPTCHA Enterprise site key for Firebase App Check (production).
// Created in the Firebase console → App Check → Apps → reCAPTCHA Enterprise.
// Empty = App Check is NOT initialised by the app; see README.md § Firebase
// setup. (Localhost uses the App Check debug provider instead — also in the
// README.) Leave empty until the console step is done.
export const APP_CHECK_SITE_KEY = "";

export const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const PLACEHOLDER_VALUES = new Set([
  "YOUR_API_KEY",
  "YOUR_PROJECT_ID",
  "YOUR_MESSAGING_SENDER_ID",
  "YOUR_APP_ID",
  "",
]);

function readEnv() {
  try {
    const env = import.meta.env ?? {};
    return {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    };
  } catch {
    return {};
  }
}

// Env vars win over the placeholder object; missing env vars fall back to
// the object (which is placeholders until the parent fills it in).
export function readEnvConfig() {
  const env = readEnv();
  const cfg = { ...FIREBASE_CONFIG };
  for (const key of Object.keys(cfg)) {
    if (env[key]) cfg[key] = env[key];
  }
  return cfg;
}

export function isFirebaseConfigured(config = readEnvConfig()) {
  if (!config || typeof config !== "object") return false;
  const fields = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"];
  for (const f of fields) {
    const v = config[f];
    if (typeof v !== "string" || v.trim() === "" || PLACEHOLDER_VALUES.has(v.trim())) return false;
  }
  return true;
}
