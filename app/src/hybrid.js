// ═══════════════════════════════════════════════════════════════════════
// REAL ENGINE — NoteVault Hybrid, Firebase AI Logic hybrid inference
// (12 Nov 2026). Replaces the 5 Nov MOCK engine (same exported interface,
// so main.js, vault.js, budget.js and guards.js do not change shape).
//
// Every AI call goes through the Firebase AI Logic client SDK:
//   - getAI(firebaseApp, { backend: new GoogleAIBackend() })
//     → Gemini Developer API (free tier, no card, no Vertex AI / Blaze).
//   - getGenerativeModel(ai, { mode, inCloudParams: { model } })
//     → PREFER_ON_DEVICE hybrid model; cloud fallback is explicitly
//     gemini-3.5-flash-lite (current stable flash-lite, verified on the
//     official supported-models page 12 Nov 2026; gemini-2.5-flash-lite is
//     being retired and routes to 3.5-flash-lite from 1 Dec 2026).
//   - A separate plain cloud model serves Deep Dive (multi-turn chat),
//     because on-device inference is single-turn only per the docs.
//   - Every response's inferenceSource is read from the SDK response
//     (verified: GenerateContentResponse.inferenceSource, SDK v12.5.0+;
//     the SDK returns "on_device" / "in_cloud", normalised here to
//     ON_DEVICE / IN_CLOUD). If the SDK ever omits it, the source is
//     DERIVED from mode + device readiness and the reason says so —
//     the chip never claims a source it cannot prove.
//
// Privacy is enforced in OUR code, not only in the SDK:
//   - ONLY_ON_DEVICE + device model not ready → ask/summarise/organise
//     throw BEFORE any SDK call (no network, no silent cloud leak).
//   - Deep Dive (chat) in ONLY_ON_DEVICE → throws before any cloud call.
//   - No Firebase config → every model call throws FirebaseNotConfiguredError
//     before any SDK call. The vault, search and grounded refusal still work.
//
// On-device availability is NEVER faked: deviceModelReady flips true only
// after a successful initializeDeviceModel() (real Nano download via the
// SDK). getDeviceModelAvailability() reads Chrome's LanguageModel API when
// present and reports "unavailable" honestly otherwise.
//
// INTERFACE CONTRACT (identical to the mock it replaces):
//   createModel(overrides?) → model { deviceModelReady, initializeDeviceModel, generateContent, startChat }
//   setPrivacyMode(on)      → PREFER_ON_DEVICE ⇄ ONLY_ON_DEVICE
//   getMode()               → current InferenceMode string
//   initDeviceModel(model, onProgress) → real Nano download (0→1)
//   ask(model, prompt)      → { text, inferenceSource, route, reason, fallbackAttempts }
//   summarise(model, note)  → { json: { bullets: [..3] }, inferenceSource, route, reason }
//   organise(model, notes)  → { json: { groups: [{ tag, noteIds, noteTitles }] }, ... }
//   model.startChat()       → { history, sendMessage(msg) } (cloud-only)
//   getEngineInfo()         → { engine: "FIREBASE_AI_LOGIC", ... }
//   getDeviceModelAvailability() → "available" | "downloading" | "downloadable" | "unavailable" | "unknown"
//   normalizeInferenceSource(value, fallback?) → "ON_DEVICE" | "IN_CLOUD" | null
// ═══════════════════════════════════════════════════════════════════════
import { tokenize } from "./guards.js";
import {
  FIREBASE_CONFIG,
  CLOUD_MODEL,
  isFirebaseConfigured,
  readEnvConfig,
} from "./firebase-config.js";
import { getFirebase, FirebaseNotConfiguredError } from "./firebase-app.js";

export { FirebaseNotConfiguredError };
export const MOCK_ENGINE = false;

// App-facing mode strings (kept identical to the mock so main.js does not
// change). They are mapped to the SDK's InferenceMode when a model is made.
export const InferenceMode = Object.freeze({
  PREFER_ON_DEVICE: "PREFER_ON_DEVICE",
  ONLY_ON_DEVICE: "ONLY_ON_DEVICE",
  PREFER_IN_CLOUD: "PREFER_IN_CLOUD",
  ONLY_IN_CLOUD: "ONLY_IN_CLOUD",
});

// Default mode for Ask / Summarise / Organise. Privacy mode flips this to
// ONLY_ON_DEVICE. Deep Dive (chat) is always cloud, like the real SDK.
let mode = InferenceMode.PREFER_ON_DEVICE;

export function setPrivacyMode(on) {
  mode = on ? InferenceMode.ONLY_ON_DEVICE : InferenceMode.PREFER_ON_DEVICE;
  return mode;
}

export function getMode() {
  return mode;
}

export function getEngineInfo() {
  const configured = isFirebaseConfigured(readEnvConfig());
  return {
    engine: "FIREBASE_AI_LOGIC",
    mock: false,
    mode,
    cloudModel: CLOUD_MODEL,
    sdk: "firebase ^12.5.0 (hybrid inference + inferenceSource)",
    configured,
    note: configured
      ? "Real Firebase AI Logic wiring — every AI call goes through the Firebase AI Logic SDK (Gemini Developer API, free tier). On-device Gemini Nano when available, cloud gemini-3.5-flash-lite otherwise."
      : "Real Firebase AI Logic wiring, but no Firebase project is configured yet — add your config (README.md § Firebase setup). The vault and grounded search still work; model calls fail loudly until then.",
  };
}

// --- inferenceSource normalisation ----------------------------------------
// The SDK (v12.19.0, verified in node_modules) returns "on_device" /
// "in_cloud" (lowercase snake_case), while the docs prose writes ON_DEVICE /
// IN_CLOUD. Accept both, plus the bare forms, and nothing else.
export function normalizeInferenceSource(value, fallback = null) {
  const v = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (v === "on_device" || v === "ondevice") return "ON_DEVICE";
  if (v === "in_cloud" || v === "incloud") return "IN_CLOUD";
  return fallback;
}

// Derive the source from routing state when the SDK omits inferenceSource.
// Only used as a fallback — the reason string always says it was derived.
function deriveSource({ mode: m, deviceReady }) {
  if (m === InferenceMode.ONLY_ON_DEVICE) return deviceReady ? "ON_DEVICE" : null;
  if (m === InferenceMode.PREFER_ON_DEVICE) return deviceReady ? "ON_DEVICE" : "IN_CLOUD";
  return "IN_CLOUD"; // PREFER_IN_CLOUD / ONLY_IN_CLOUD
}

function buildRoute({ source, mode: m, deviceReady, derived, kind }) {
  const cloudSuffix = ` (Firebase AI Logic · ${CLOUD_MODEL})`;
  if (source === "ON_DEVICE") {
    return {
      inferenceSource: "ON_DEVICE",
      route: "on-device",
      reason:
        (kind === "chat"
          ? "Chat answered on-device — this should not happen (chat is cloud-only); treating as on-device because the SDK reported it"
          : "On-device model (Gemini Nano) — private · instant · free") +
        (derived ? " · source derived from routing state (SDK did not report inferenceSource)" : ""),
      fallbackAttempts: 0,
    };
  }
  let reason;
  let fallbackAttempts = 0;
  if (kind === "chat") {
    reason = `Multi-turn chat is cloud-only${cloudSuffix}`;
  } else if (m === InferenceMode.PREFER_ON_DEVICE && !deviceReady) {
    reason = `On-device model not ready — fell back to cloud${cloudSuffix}`;
    fallbackAttempts = 1;
  } else if (m === InferenceMode.PREFER_ON_DEVICE && deviceReady) {
    reason = `On-device model ready but this request fell back to cloud${cloudSuffix}`;
    fallbackAttempts = 1;
  } else {
    reason = `Cloud model${cloudSuffix}`;
  }
  if (derived) reason += " · source derived from routing state (SDK did not report inferenceSource)";
  return { inferenceSource: "IN_CLOUD", route: "cloud", reason, fallbackAttempts };
}

// --- On-device availability (honest, never faked) -------------------------
export async function getDeviceModelAvailability() {
  try {
    const LM = globalThis.LanguageModel;
    if (!LM || typeof LM.availability !== "function") return "unavailable";
    const v = await LM.availability();
    if (v === "available" || v === "downloading" || v === "downloadable") return v;
    return "unavailable";
  } catch {
    return "unknown";
  }
}

// --- Model -----------------------------------------------------------------
export function createModel(overrides = {}) {
  const config = overrides.config || readEnvConfig();
  const injectedSdk = overrides.sdk || null;
  const state = {
    deviceModelReady: false,
    hybridModels: new Map(), // app mode -> SDK GenerativeModel
    initializedModels: new Set(), // SDK models already initializeDeviceModel()'d
    cloudChatModel: null,
    chatSession: null,
    firebase: null, // { app, ai, sdk } once loaded
  };

  async function ensureFirebase() {
    if (state.firebase) return state.firebase;
    if (!isFirebaseConfigured(config)) throw new FirebaseNotConfiguredError();
    state.firebase = await getFirebase({ sdk: injectedSdk, config });
    return state.firebase;
  }

  function sdkModeFor(appMode) {
    const impl = state.firebase.sdk;
    const sdkModes = impl.InferenceMode;
    switch (appMode) {
      case InferenceMode.ONLY_ON_DEVICE:
        return sdkModes.ONLY_ON_DEVICE;
      case InferenceMode.PREFER_IN_CLOUD:
        return sdkModes.PREFER_IN_CLOUD;
      case InferenceMode.ONLY_IN_CLOUD:
        return sdkModes.ONLY_IN_CLOUD;
      default:
        return sdkModes.PREFER_ON_DEVICE;
    }
  }

  async function getHybridModel() {
    const m = getMode();
    if (state.hybridModels.has(m)) return state.hybridModels.get(m);
    const { ai, sdk } = await ensureFirebase();
    const model = sdk.getGenerativeModel(ai, {
      mode: sdkModeFor(m),
      inCloudParams: {
        model: CLOUD_MODEL,
        generationConfig: { maxOutputTokens: 1024 },
      },
    });
    state.hybridModels.set(m, model);
    return model;
  }

  async function getCloudChatModel() {
    if (state.cloudChatModel) return state.cloudChatModel;
    const { ai, sdk } = await ensureFirebase();
    state.cloudChatModel = sdk.getGenerativeModel(ai, {
      model: CLOUD_MODEL,
      generationConfig: { maxOutputTokens: 1024 },
    });
    return state.cloudChatModel;
  }

  // The SDK requires initializeDeviceModel() per GenerativeModel instance,
  // after a user interaction and before generateContent(). Only called for
  // ONLY_ON_DEVICE (where the SDK would throw without it); PREFER_ON_DEVICE
  // must NOT block on a download — its contract is to fall back to cloud.
  async function ensureDeviceInitialized(model) {
    if (state.initializedModels.has(model)) return;
    await model.initializeDeviceModel();
    state.initializedModels.add(model);
  }

  function privacyError() {
    return new Error(
      "Privacy mode is on and the on-device model is not ready — no cloud call was made. " +
        "Enable the on-device model first, or turn privacy mode off.",
    );
  }

  const model = {
    get deviceModelReady() {
      return state.deviceModelReady;
    },

    async initializeDeviceModel(onProgress) {
      // Honest pre-check: if this browser has no Prompt API at all, say so
      // before the SDK throws a cryptic error.
      const avail = await getDeviceModelAvailability();
      if (avail === "unavailable") {
        throw new Error(
          "On-device model is not available in this browser — Chrome on Desktop v139+ " +
            "with the Prompt API flag (chrome://flags/#prompt-api-for-gemini-nano-multimodal-input) " +
            "is required. The cloud fallback stays on.",
        );
      }
      const sdkModel = await getHybridModel();
      await sdkModel.initializeDeviceModel((v) => onProgress?.(v));
      state.initializedModels.add(sdkModel);
      state.deviceModelReady = true;
      return true;
    },

    async generateContent(prompt) {
      // Privacy is enforced here, before any SDK call: in ONLY_ON_DEVICE
      // with no ready device model, NOTHING may reach the cloud.
      if (getMode() === InferenceMode.ONLY_ON_DEVICE && !state.deviceModelReady) {
        throw privacyError();
      }
      const sdkModel = await getHybridModel();
      if (getMode() === InferenceMode.ONLY_ON_DEVICE) {
        await ensureDeviceInitialized(sdkModel);
      }
      const result = await sdkModel.generateContent(prompt);
      const r = result.response;
      const rawSource = r.inferenceSource ?? null;
      const derived = rawSource == null;
      const source = normalizeInferenceSource(
        rawSource,
        deriveSource({ mode: getMode(), deviceReady: state.deviceModelReady }),
      );
      if (!source) {
        throw new Error(
          "Firebase AI Logic did not report which path served this request, and no route " +
            "could be derived — the answer is not shown.",
        );
      }
      const route = buildRoute({
        source,
        mode: getMode(),
        deviceReady: state.deviceModelReady,
        derived,
        kind: "ask",
      });
      return {
        response: {
          text: () => r.text(),
          inferenceSource: route.inferenceSource,
          route: route.route,
          reason: route.reason,
          fallbackAttempts: route.fallbackAttempts,
        },
      };
    },

    startChat() {
      const history = [];
      return {
        history,
        async sendMessage(message) {
          // Chat is cloud-only. In privacy mode it throws BEFORE any call.
          if (getMode() === InferenceMode.ONLY_ON_DEVICE) {
            throw new Error(
              "Privacy mode is on — Deep Dive (chat) needs the cloud, so no message was sent. " +
                "Turn privacy mode off to use Deep Dive.",
            );
          }
          const chatModel = await getCloudChatModel();
          if (!state.chatSession) state.chatSession = chatModel.startChat();
          const result = await state.chatSession.sendMessage(message);
          const r = result.response;
          const source = normalizeInferenceSource(r.inferenceSource ?? null, "IN_CLOUD");
          const route = buildRoute({
            source,
            mode: getMode(),
            deviceReady: state.deviceModelReady,
            derived: r.inferenceSource == null,
            kind: "chat",
          });
          history.push({ role: "user", text: message });
          history.push({ role: "model", text: r.text() });
          return {
            response: {
              text: () => r.text(),
              inferenceSource: route.inferenceSource,
              route: route.route,
              reason: route.reason,
              fallbackAttempts: route.fallbackAttempts,
            },
          };
        },
      };
    },
  };
  return model;
}

// MUST be called after/on a user interaction and BEFORE any generateContent()
// call in the real SDK. Here it forwards to the model's method.
export function initDeviceModel(model, onProgress) {
  return model.initializeDeviceModel((v) => onProgress?.(v));
}

// Single-turn ask. Same signature as the starter: (model, prompt) and
// { text, inferenceSource } — plus route/reason/fallbackAttempts for the UI.
export async function ask(model, prompt) {
  const result = await model.generateContent(prompt);
  const r = result.response;
  return {
    text: r.text(),
    inferenceSource: r.inferenceSource,
    route: r.route,
    reason: r.reason,
    fallbackAttempts: r.fallbackAttempts ?? 0,
  };
}

// --- Structured JSON (prompt-based, one path for both routes) ---------------
// responseSchema config differs between the on-device and cloud paths, so
// Summarise / Organise ask for JSON in the prompt and parse the reply.
// The model is still the Firebase AI Logic model in both cases. If the
// reply is not parseable JSON, a LOCAL extractive/keyword fallback produces
// the same shape — with the reason saying so, and no extra model call.
function extractJson(text) {
  const raw = String(text || "");
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function splitSentences(text) {
  return String(text || "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 0);
}

// Local extractive fallback for Summarise (same sentences the mock used).
function extractiveBullets(content) {
  const sentences = splitSentences(content).filter((s) => !s.startsWith("SYNTHETIC SAMPLE NOTE"));
  const bullets = [];
  if (sentences.length > 0) bullets.push(sentences[0]);
  const rest = sentences
    .slice(1)
    .filter((s) => s.length >= 40 && s.length <= 160)
    .sort((a, b) => b.length - a.length);
  for (const s of rest) {
    if (bullets.length >= 3) break;
    if (!bullets.includes(s)) bullets.push(s);
  }
  return bullets;
}

// Summarise one note into 3 bullets, in the structured-JSON shape.
export async function summarise(model, note) {
  const prompt = [
    "Summarise the note below into exactly 3 short bullets.",
    'Respond with ONLY a JSON object in this shape: {"bullets": ["...", "...", "..."]}. No markdown, no extra text.',
    "",
    `Title: ${note.title}`,
    `Note:\n${note.content || ""}`,
  ].join("\n");
  const result = await model.generateContent(prompt);
  const r = result.response;
  const parsed = extractJson(r.text());
  if (parsed && Array.isArray(parsed.bullets) && parsed.bullets.length > 0) {
    return {
      json: { bullets: parsed.bullets.slice(0, 3).map(String) },
      inferenceSource: r.inferenceSource,
      route: r.route,
      reason: `${r.reason} · structured JSON parsed`,
      fallbackAttempts: r.fallbackAttempts ?? 0,
    };
  }
  return {
    json: { bullets: extractiveBullets(note.content || "") },
    inferenceSource: r.inferenceSource,
    route: r.route,
    reason: `${r.reason} · model JSON unparseable — local extractive fallback (no extra model call)`,
    fallbackAttempts: r.fallbackAttempts ?? 0,
  };
}

// Organise: a grouping plan by tag. Plan only — no notes are changed.
const TAG_RULES = [
  [/garden|plant|water|compost|seed/i, "Garden"],
  [/clinic|household|health|patient|danger|visit/i, "Health"],
  [/book|chapter|reading|author/i, "Reading"],
  [/trip|travel|pack|route|stay|homestay|hotel/i, "Travel"],
  [/project|idea|app|tool|build/i, "Projects"],
];

function keywordGroups(notes) {
  const groups = new Map();
  for (const note of notes || []) {
    const hay = `${note.title} ${note.content}`;
    let tag = "Unsorted";
    for (const [re, name] of TAG_RULES) {
      if (re.test(hay)) {
        tag = name;
        break;
      }
    }
    if (!groups.has(tag)) groups.set(tag, { tag, noteIds: [], noteTitles: [] });
    const g = groups.get(tag);
    g.noteIds.push(note.id);
    g.noteTitles.push(note.title);
  }
  return [...groups.values()];
}

export async function organise(model, notes) {
  const list = (notes || [])
    .map((n, i) => `${i + 1}. [${n.id}] ${n.title}`)
    .join("\n");
  const prompt = [
    "Group the notes below by topic.",
    'Respond with ONLY a JSON object in this shape: {"groups": [{"tag": "...", "noteIds": ["..."], "noteTitles": ["..."]}]}. No markdown, no extra text. Use the note ids exactly as given.',
    "",
    list,
  ].join("\n");
  const result = await model.generateContent(prompt);
  const r = result.response;
  const parsed = extractJson(r.text());
  if (parsed && Array.isArray(parsed.groups)) {
    const groups = parsed.groups
      .filter((g) => g && typeof g.tag === "string" && Array.isArray(g.noteTitles) && g.noteTitles.length > 0)
      .map((g) => ({
        tag: g.tag,
        noteIds: Array.isArray(g.noteIds) ? g.noteIds.map(String) : [],
        noteTitles: g.noteTitles.map(String),
      }));
    if (groups.length > 0) {
      return {
        json: { groups },
        inferenceSource: r.inferenceSource,
        route: r.route,
        reason: `${r.reason} · structured JSON parsed`,
        fallbackAttempts: r.fallbackAttempts ?? 0,
      };
    }
  }
  return {
    json: { groups: keywordGroups(notes) },
    inferenceSource: r.inferenceSource,
    route: r.route,
    reason: `${r.reason} · model JSON unparseable — local keyword fallback (no extra model call)`,
    fallbackAttempts: r.fallbackAttempts ?? 0,
  };
}
