// NoteVault Hybrid — real-engine tests (12 Nov 2026, vitest).
//
// The real hybrid.js is tested against a FAKE Firebase SDK that records
// every call. That proves the wiring (which SDK functions are called, with
// which mode / model / params) without touching the network or a real
// Firebase project. The fake returns realistic SDK responses, including
// inferenceSource in the SDK's real lowercase form ("on_device" /
// "in_cloud", verified in firebase 12.19.0 types).
//
// Also covers the behaviours of the 5 Nov shell harness (12 checks) that
// the real engine must keep: privacy-mode loud refusal, grounded JSON
// shapes, chat cloud-only, budget counting.
//
// Run: npm test   (vitest run)
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createModel,
  setPrivacyMode,
  getMode,
  ask,
  summarise,
  organise,
  initDeviceModel,
  getEngineInfo,
  getDeviceModelAvailability,
  normalizeInferenceSource,
  MOCK_ENGINE,
  InferenceMode,
} from "../src/hybrid.js";
import { FirebaseNotConfiguredError, resetFirebaseForTests } from "../src/firebase-app.js";
import { recordCall, getBudget, resetBudget } from "../src/budget.js";

const FAKE_CONFIG = {
  apiKey: "fake-api-key",
  authDomain: "fake-project.firebaseapp.com",
  projectId: "fake-project",
  storageBucket: "fake-project.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef",
};

const PLACEHOLDER_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const SAMPLE_NOTE = {
  id: "n1",
  title: "Garden notes",
  content:
    "Water the tomatoes every morning before the sun is strong. " +
    "Compost needs turning once a week or it goes slimy and smells bad. " +
    "The seed packets from March are still good if kept dry and cool in the shed.",
};

function makeFakeSdk({ source = "on_device", chatSource = "in_cloud", garbage = false, omitSource = false } = {}) {
  const calls = [];
  const hybridModel = {
    initializeDeviceModel: vi.fn(async (cb) => {
      cb?.(0.5);
      cb?.(1);
    }),
    generateContent: vi.fn(async (prompt) => {
      calls.push({ kind: "generateContent", prompt: String(prompt) });
      if (garbage) {
        return { response: { text: () => "not json at all, just prose", inferenceSource: source } };
      }
      const text = String(prompt).includes('"groups"')
        ? '{"groups":[{"tag":"Garden","noteIds":["n1"],"noteTitles":["Garden notes"]}]}'
        : '{"bullets":["One.","Two.","Three."]}';
      const response = { text: () => text };
      if (!omitSource && source !== undefined) response.inferenceSource = source;
      return { response };
    }),
    startChat: vi.fn(() => {
      throw new Error("hybrid startChat must never be used — chat is cloud-only");
    }),
  };
  const chatSession = {
    sendMessage: vi.fn(async (msg) => {
      calls.push({ kind: "chat", msg: String(msg) });
      const response = { text: () => "chat answer" };
      if (chatSource !== undefined) response.inferenceSource = chatSource;
      return { response };
    }),
  };
  const cloudModel = {
    startChat: vi.fn(() => chatSession),
    generateContent: vi.fn(async () => {
      throw new Error("cloud generateContent must not be called directly");
    }),
  };
  const sdk = {
    app: {
      initializeApp: vi.fn((cfg) => ({ name: "[DEFAULT]", options: cfg })),
      getApp: vi.fn(() => ({ name: "[DEFAULT]" })),
    },
    ai: {
      getAI: vi.fn((app, opts) => ({ app, backend: opts?.backend })),
      getGenerativeModel: vi.fn((ai, params) => {
        calls.push({ kind: "getGenerativeModel", params });
        return params && params.mode ? hybridModel : cloudModel;
      }),
      GoogleAIBackend: class {
        constructor() {
          this.kind = "google-ai";
        }
      },
      InferenceMode: {
        PREFER_ON_DEVICE: "prefer_on_device",
        ONLY_ON_DEVICE: "only_on_device",
        PREFER_IN_CLOUD: "prefer_in_cloud",
        ONLY_IN_CLOUD: "only_in_cloud",
      },
    },
  };
  return { sdk, calls, hybridModel, cloudModel, chatSession };
}

function fakeLanguageModel(value = "available") {
  globalThis.LanguageModel = { availability: async () => value };
}

beforeEach(() => {
  setPrivacyMode(false);
  resetFirebaseForTests();
  resetBudget();
  delete globalThis.LanguageModel;
});

afterEach(() => {
  delete globalThis.LanguageModel;
  vi.restoreAllMocks();
});

// --- Mode + engine info ----------------------------------------------------
describe("mode and engine info", () => {
  it("defaults to PREFER_ON_DEVICE and flips with the privacy toggle", () => {
    expect(getMode()).toBe(InferenceMode.PREFER_ON_DEVICE);
    expect(setPrivacyMode(true)).toBe(InferenceMode.ONLY_ON_DEVICE);
    expect(getMode()).toBe(InferenceMode.ONLY_ON_DEVICE);
    expect(setPrivacyMode(false)).toBe(InferenceMode.PREFER_ON_DEVICE);
  });

  it("is the real engine, not the mock", () => {
    expect(MOCK_ENGINE).toBe(false);
    const info = getEngineInfo();
    expect(info.engine).toBe("FIREBASE_AI_LOGIC");
    expect(info.mock).toBe(false);
    expect(info.cloudModel).toBe("gemini-3.5-flash-lite");
    // No VITE_FIREBASE_* vars in the test env → placeholders → not configured.
    expect(info.configured).toBe(false);
  });

  it("normalises inferenceSource from the SDK's lowercase form and the docs' uppercase form", () => {
    expect(normalizeInferenceSource("on_device")).toBe("ON_DEVICE");
    expect(normalizeInferenceSource("in_cloud")).toBe("IN_CLOUD");
    expect(normalizeInferenceSource("ON_DEVICE")).toBe("ON_DEVICE");
    expect(normalizeInferenceSource("IN_CLOUD")).toBe("IN_CLOUD");
    expect(normalizeInferenceSource("weird")).toBeNull();
    expect(normalizeInferenceSource("weird", "IN_CLOUD")).toBe("IN_CLOUD");
    expect(normalizeInferenceSource(undefined)).toBeNull();
  });
});

// --- Not configured: loud failure, zero SDK calls ---------------------------
describe("without a Firebase project configured", () => {
  it("ask() throws FirebaseNotConfiguredError and makes no SDK call", async () => {
    const { sdk, hybridModel } = makeFakeSdk();
    const model = createModel({ sdk, config: PLACEHOLDER_CONFIG });
    await expect(ask(model, "hello")).rejects.toBeInstanceOf(FirebaseNotConfiguredError);
    expect(hybridModel.generateContent).not.toHaveBeenCalled();
  });

  it("summarise() and organise() throw before any SDK call", async () => {
    const { sdk, hybridModel } = makeFakeSdk();
    const model = createModel({ sdk, config: PLACEHOLDER_CONFIG });
    await expect(summarise(model, SAMPLE_NOTE)).rejects.toBeInstanceOf(FirebaseNotConfiguredError);
    await expect(organise(model, [SAMPLE_NOTE])).rejects.toBeInstanceOf(FirebaseNotConfiguredError);
    expect(hybridModel.generateContent).not.toHaveBeenCalled();
  });

  it("initializeDeviceModel() throws before any SDK call", async () => {
    fakeLanguageModel("available");
    const { sdk, hybridModel } = makeFakeSdk();
    const model = createModel({ sdk, config: PLACEHOLDER_CONFIG });
    await expect(initDeviceModel(model, () => {})).rejects.toBeInstanceOf(FirebaseNotConfiguredError);
    expect(hybridModel.initializeDeviceModel).not.toHaveBeenCalled();
  });

  it("chat sendMessage() throws before any cloud call", async () => {
    const { sdk, cloudModel } = makeFakeSdk();
    const model = createModel({ sdk, config: PLACEHOLDER_CONFIG });
    const chat = model.startChat();
    await expect(chat.sendMessage("hi")).rejects.toBeInstanceOf(FirebaseNotConfiguredError);
    expect(cloudModel.startChat).not.toHaveBeenCalled();
  });
});

// --- Configured: real SDK calls, correct routing ---------------------------
describe("with a Firebase project configured (fake SDK)", () => {
  it("ask() calls the hybrid model once and reports ON_DEVICE from the SDK source", async () => {
    const { sdk, calls, hybridModel } = makeFakeSdk({ source: "on_device" });
    const model = createModel({ sdk, config: FAKE_CONFIG });
    const res = await ask(model, "What about the tomatoes?");
    expect(hybridModel.generateContent).toHaveBeenCalledTimes(1);
    expect(hybridModel.generateContent).toHaveBeenCalledWith("What about the tomatoes?");
    expect(res.inferenceSource).toBe("ON_DEVICE");
    expect(res.route).toBe("on-device");
    expect(res.fallbackAttempts).toBe(0);
    expect(res.reason).toMatch(/On-device model/);
    // The hybrid model was created in PREFER_ON_DEVICE with the explicit cloud fallback.
    const created = calls.find((c) => c.kind === "getGenerativeModel");
    expect(created.params.mode).toBe("prefer_on_device");
    expect(created.params.inCloudParams.model).toBe("gemini-3.5-flash-lite");
  });

  it("ask() reports IN_CLOUD with a fallback when the device model is not ready", async () => {
    const { sdk } = makeFakeSdk({ source: "in_cloud" });
    const model = createModel({ sdk, config: FAKE_CONFIG });
    const res = await ask(model, "What about the tomatoes?");
    expect(res.inferenceSource).toBe("IN_CLOUD");
    expect(res.route).toBe("cloud");
    expect(res.fallbackAttempts).toBe(1);
    expect(res.reason).toMatch(/fell back to cloud/);
  });

  it("derives the source (and says so) when the SDK omits inferenceSource", async () => {
    const { sdk } = makeFakeSdk({ omitSource: true });
    const model = createModel({ sdk, config: FAKE_CONFIG });
    const res = await ask(model, "What about the tomatoes?");
    expect(res.inferenceSource).toBe("IN_CLOUD"); // device not ready → cloud
    expect(res.reason).toMatch(/derived from routing state/);
  });

  it("initializeDeviceModel() reports progress and flips deviceModelReady", async () => {
    fakeLanguageModel("available");
    const { sdk, hybridModel } = makeFakeSdk();
    const model = createModel({ sdk, config: FAKE_CONFIG });
    expect(model.deviceModelReady).toBe(false);
    const progress = [];
    await initDeviceModel(model, (v) => progress.push(v));
    expect(hybridModel.initializeDeviceModel).toHaveBeenCalledTimes(1);
    expect(progress).toEqual([0.5, 1]);
    expect(model.deviceModelReady).toBe(true);
  });

  it("ONLY_ON_DEVICE after init succeeds on-device with the only_on_device model", async () => {
    fakeLanguageModel("available");
    const { sdk, calls, hybridModel } = makeFakeSdk({ source: "on_device" });
    const model = createModel({ sdk, config: FAKE_CONFIG });
    await initDeviceModel(model, () => {});
    setPrivacyMode(true);
    const res = await ask(model, "What about the tomatoes?");
    expect(res.inferenceSource).toBe("ON_DEVICE");
    expect(res.route).toBe("on-device");
    const modes = calls
      .filter((c) => c.kind === "getGenerativeModel")
      .map((c) => c.params.mode);
    expect(modes).toContain("only_on_device");
    expect(hybridModel.generateContent).toHaveBeenCalled();
  });

  it("ONLY_ON_DEVICE without a ready device model throws loudly and NEVER calls the SDK (no silent cloud leak)", async () => {
    const { sdk, hybridModel } = makeFakeSdk({ source: "in_cloud" });
    const model = createModel({ sdk, config: FAKE_CONFIG });
    setPrivacyMode(true);
    await expect(ask(model, "What about the tomatoes?")).rejects.toThrow(/Privacy mode is on/);
    expect(hybridModel.generateContent).not.toHaveBeenCalled();
    await expect(summarise(model, SAMPLE_NOTE)).rejects.toThrow(/Privacy mode is on/);
    await expect(organise(model, [SAMPLE_NOTE])).rejects.toThrow(/Privacy mode is on/);
    expect(hybridModel.generateContent).not.toHaveBeenCalled();
  });

  it("chat uses the separate cloud model, never the hybrid model", async () => {
    const { sdk, hybridModel, cloudModel, chatSession } = makeFakeSdk();
    const model = createModel({ sdk, config: FAKE_CONFIG });
    const chat = model.startChat();
    const result = await chat.sendMessage("Tell me more");
    expect(cloudModel.startChat).toHaveBeenCalledTimes(1);
    expect(hybridModel.startChat).not.toHaveBeenCalled();
    expect(chatSession.sendMessage).toHaveBeenCalledWith("Tell me more");
    expect(result.response.inferenceSource).toBe("IN_CLOUD");
    expect(result.response.route).toBe("cloud");
    expect(result.response.reason).toMatch(/cloud-only/);
  });

  it("chat in ONLY_ON_DEVICE throws loudly with no cloud call", async () => {
    const { sdk, cloudModel } = makeFakeSdk();
    const model = createModel({ sdk, config: FAKE_CONFIG });
    setPrivacyMode(true);
    const chat = model.startChat();
    await expect(chat.sendMessage("Tell me more")).rejects.toThrow(/Privacy mode is on/);
    expect(cloudModel.startChat).not.toHaveBeenCalled();
  });

  it("summarise() parses the model's JSON bullets", async () => {
    const { sdk } = makeFakeSdk({ source: "in_cloud" });
    const model = createModel({ sdk, config: FAKE_CONFIG });
    const res = await summarise(model, SAMPLE_NOTE);
    expect(res.json).toEqual({ bullets: ["One.", "Two.", "Three."] });
    expect(res.inferenceSource).toBe("IN_CLOUD");
    expect(res.reason).toMatch(/structured JSON parsed/);
  });

  it("summarise() falls back to local extractive bullets when the model JSON is unparseable — no second model call", async () => {
    const { sdk, hybridModel } = makeFakeSdk({ source: "on_device", garbage: true });
    const model = createModel({ sdk, config: FAKE_CONFIG });
    const res = await summarise(model, SAMPLE_NOTE);
    expect(hybridModel.generateContent).toHaveBeenCalledTimes(1);
    expect(res.json.bullets.length).toBeGreaterThan(0);
    expect(res.json.bullets[0]).toMatch(/Water the tomatoes/);
    expect(res.reason).toMatch(/local extractive fallback/);
  });

  it("organise() parses the model's JSON groups", async () => {
    const { sdk } = makeFakeSdk({ source: "on_device" });
    const model = createModel({ sdk, config: FAKE_CONFIG });
    const res = await organise(model, [SAMPLE_NOTE]);
    expect(res.json.groups).toEqual([
      { tag: "Garden", noteIds: ["n1"], noteTitles: ["Garden notes"] },
    ]);
    expect(res.reason).toMatch(/structured JSON parsed/);
  });

  it("organise() falls back to deterministic keyword groups when the model JSON is unparseable", async () => {
    const { sdk } = makeFakeSdk({ source: "in_cloud", garbage: true });
    const model = createModel({ sdk, config: FAKE_CONFIG });
    const res = await organise(model, [SAMPLE_NOTE]);
    expect(res.json.groups).toEqual([
      { tag: "Garden", noteIds: ["n1"], noteTitles: ["Garden notes"] },
    ]);
    expect(res.reason).toMatch(/local keyword fallback/);
  });
});

// --- On-device availability -------------------------------------------------
describe("getDeviceModelAvailability()", () => {
  it("reports unavailable when the browser has no Prompt API", async () => {
    expect(await getDeviceModelAvailability()).toBe("unavailable");
  });

  it("reports the Prompt API state when present", async () => {
    fakeLanguageModel("downloading");
    expect(await getDeviceModelAvailability()).toBe("downloading");
    fakeLanguageModel("available");
    expect(await getDeviceModelAvailability()).toBe("available");
  });

  it("reports unknown when the availability check throws", async () => {
    globalThis.LanguageModel = {
      availability: async () => {
        throw new Error("boom");
      },
    };
    expect(await getDeviceModelAvailability()).toBe("unknown");
  });
});

// --- Budget meter (kept from the shell harness) ------------------------------
describe("budget meter", () => {
  it("counts cloud and on-device calls separately and stays a placeholder", () => {
    recordCall("IN_CLOUD");
    recordCall("IN_CLOUD");
    recordCall("ON_DEVICE");
    const b = getBudget();
    expect(b.cloudUsed).toBe(2);
    expect(b.onDeviceUsed).toBe(1);
    expect(b.verified).toBe(false); // placeholder until AI Studio is read
    expect(b.dailyBudget).toBe(250);
  });
});
