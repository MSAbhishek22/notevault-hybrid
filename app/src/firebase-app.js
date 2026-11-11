// NoteVault Hybrid — lazy Firebase initialisation (12 Nov 2026).
//
// Importing this module never touches the network and never requires a
// Firebase project. `getFirebase()` is called only when a model call is
// needed; until the config is filled in it throws FirebaseNotConfiguredError
// (loud, with the setup pointer) instead of failing silently or inventing
// credentials.
//
// SDK loading is a dynamic import, so:
//   - the app boots and the vault/search work with no Firebase project;
//   - unit tests can inject a fake SDK and never touch the real one;
//   - Vite code-splits the Firebase SDK out of the first paint.
//
// Backend: Gemini Developer API (free tier, no card) via GoogleAIBackend.
// Vertex AI / Agent Platform is NEVER used — it needs Blaze billing.
//
// App Check: initialised ONLY when a site key is set (production,
// reCAPTCHA Enterprise site key from VITE_RECAPTCHA_ENTERPRISE_KEY).
// With the key empty the app skips App Check and logs a warning — cloud
// calls may then be rejected if App Check is enforced in the console; see
// README.md § Firebase setup for the debug-provider (localhost) and
// reCAPTCHA (production) steps.
import {
  FIREBASE_CONFIG,
  getAppCheckSiteKey,
  isFirebaseConfigured,
} from "./firebase-config.js";

export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Firebase AI Logic is not configured — add your Firebase project config " +
        "in src/firebase-config.js (or set the VITE_FIREBASE_* env vars at build " +
        "time). See README.md § Firebase setup. The vault and grounded search " +
        "still work; model calls fail loudly until then.",
    );
    this.name = "FirebaseNotConfiguredError";
  }
}

// Cached per (sdk, config) identity so repeated calls are cheap. Tests call
// resetFirebaseForTests() between cases to get a fresh fake.
let cached = null;

export function resetFirebaseForTests() {
  cached = null;
}

export async function getFirebase({ sdk = null, config = FIREBASE_CONFIG } = {}) {
  if (cached && cached.sdk === sdk && cached.config === config) return cached.value;
  if (!isFirebaseConfigured(config)) throw new FirebaseNotConfiguredError();

  const appMod = sdk?.app ?? (await import("firebase/app"));
  const aiMod = sdk?.ai ?? (await import("firebase/ai"));

  let app;
  try {
    app = appMod.initializeApp(config);
  } catch (err) {
    // A second initialisation in the same page (e.g. hot reload) reuses it.
    const msg = String(err?.message || "");
    if (/duplicate-app/i.test(msg) || err?.code === "app/duplicate-app") {
      app = appMod.getApp();
    } else {
      throw err;
    }
  }

  // App Check is initialised here, before getAI() and before any model
  // call, so every AI Logic request carries an App Check token. The key is
  // resolved at call time (not import time) so tests can stub the env var.
  const appCheckSiteKey = getAppCheckSiteKey();
  if (appCheckSiteKey) {
    const acMod = sdk?.appCheck ?? (await import("firebase/app-check"));
    acMod.initializeAppCheck(app, {
      provider: new acMod.ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } else if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(
      "[NoteVault Hybrid] App Check site key is not set — App Check is not " +
        "initialised. If your Firebase project enforces App Check for AI Logic, " +
        "cloud calls will be rejected until the key is added (README.md § Firebase setup).",
    );
  }

  const ai = aiMod.getAI(app, { backend: new aiMod.GoogleAIBackend() });
  const value = { app, ai, sdk: aiMod };
  cached = { sdk, config, value };
  return value;
}
