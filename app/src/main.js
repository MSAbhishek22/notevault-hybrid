// NoteVault Hybrid — UI wiring (real Firebase AI Logic engine, 12 Nov 2026).
// Every answer shows its route (On device / Cloud / none) read from the
// SDK response's inferenceSource. No mock anywhere: if Firebase is not
// configured or the on-device model is not ready, the app says so loudly.
// The engine lives in hybrid.js; this file only uses its exported functions.
import {
  createModel,
  initDeviceModel,
  setPrivacyMode,
  getMode,
  ask,
  summarise,
  organise,
  getEngineInfo,
  getDeviceModelAvailability,
  FirebaseNotConfiguredError,
} from "./hybrid.js";
import {
  listNotes,
  getNote,
  searchNotes,
  deleteNote,
  seedSamples,
  restoreSamples,
  importFiles,
  importText,
} from "./vault.js";
import {
  buildGroundedPrompt,
  capExcerpts,
  flagSuspicious,
  MAX_NOTES_PER_CALL,
} from "./guards.js";
import { recordCall, getBudget } from "./budget.js";

const $ = (id) => document.getElementById(id);

const model = createModel();
let selectedNoteId = null;
let chat = null;
let asking = false;
let chatting = false;
// Set at boot from getEngineInfo(): "Firebase AI Logic" once configured,
// "Not configured" until the Firebase project is added.
let engineLabel = "Firebase AI Logic";

function esc(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Routing panel ---------------------------------------------------------
function chipHtml(result) {
  const route = result?.route || "none";
  const label =
    route === "on-device" ? "On device" : route === "cloud" ? "Cloud" : "No model call";
  const cls = route === "on-device" ? "chip-device" : route === "cloud" ? "chip-cloud" : "chip-none";
  const source = result?.inferenceSource ? ` · ${result.inferenceSource}` : "";
  const fallback =
    result?.fallbackAttempts > 0
      ? ` · fallback attempted (${result.fallbackAttempts})`
      : "";
  const reason = result?.reason ? ` — ${esc(result.reason)}` : "";
  return (
    `<span class="chip ${cls}">${label}</span>` +
    `<span class="route-meta">${source}${fallback}${reason}</span>` +
    `<span class="engine-tag">${esc(engineLabel)}</span>`
  );
}

function renderRouting(el, result) {
  if (el) el.innerHTML = chipHtml(result);
}

// --- Budget meter ----------------------------------------------------------
function renderBudget() {
  const el = $("budget-meter");
  if (!el) return;
  const b = getBudget();
  const pct = Math.min(100, Math.round((b.cloudUsed / b.dailyBudget) * 100));
  el.innerHTML =
    `<div class="budget-row"><strong>Cloud budget today:</strong> ${b.cloudUsed} / ${b.dailyBudget} calls used (${pct}%)</div>` +
    `<div class="budget-bar"><div class="budget-fill" style="width:${pct}%"></div></div>` +
    `<div class="budget-row">On-device calls today: ${b.onDeviceUsed} (free, no budget spent)</div>` +
    `<div class="budget-note">Budget number is a PLACEHOLDER — read the free-tier limit for gemini-3.5-flash-lite from AI Studio at deploy time. The meter counts calls, not tokens.</div>`;
}

// --- Vault list + preview --------------------------------------------------
function noteItemHtml(item) {
  const note = item.note;
  const sourceLabel = note.source === "sample" ? "SAMPLE" : note.source === "import" ? "IMPORT" : "PASTE";
  return (
    `<li data-id="${esc(note.id)}" class="${note.id === selectedNoteId ? "selected" : ""}">` +
    `<div class="note-title">${esc(note.title)}</div>` +
    `<div class="note-excerpt">${esc(item.excerpt || "")}</div>` +
    `<div class="note-meta"><span class="source-badge">${sourceLabel}</span> ` +
    `${(note.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join(" ")} ` +
    `<button class="mini-btn" data-action="delete" data-id="${esc(note.id)}">Delete</button></div>` +
    `</li>`
  );
}

function renderNoteList(items) {
  const list = $("note-list");
  const count = $("note-count");
  if (!list) return;
  list.innerHTML = items.map(noteItemHtml).join("") || `<li class="empty">No notes yet — import a file, paste a note, or restore the samples.</li>`;
  if (count) count.textContent = `${items.length} note${items.length === 1 ? "" : "s"}`;
}

async function refreshList(query = "") {
  const q = (query ?? $("search-notes")?.value ?? "").trim();
  const items = q ? await searchNotes(q) : (await listNotes()).map((note) => ({ note, score: 0, excerpt: "" }));
  // Fill excerpts for the unfiltered view.
  if (!q) {
    for (const item of items) {
      const body = String(item.note.content || "").replace(/\s+/g, " ").trim();
      item.excerpt = body.length > 160 ? `${body.slice(0, 160)}…` : body;
    }
  }
  renderNoteList(items);
}

function renderPreview(note) {
  const preview = $("note-preview");
  if (!preview) return;
  if (!note) {
    preview.innerHTML = `<p class="hint">Select a note to preview it, summarise it, or delete it.</p>`;
    return;
  }
  const flags = flagSuspicious(note.content);
  const flagHtml = flags.length
    ? `<div class="warning">⚠️ This note contains instruction-like text (${flags.map(esc).join(", ")}). Notes are treated as data, never as instructions.</div>`
    : "";
  const sourceLabel = note.source === "sample" ? "SAMPLE (synthetic)" : note.source === "import" ? "IMPORTED" : "PASTED";
  preview.innerHTML =
    `<h3>${esc(note.title)}</h3>` +
    `<div class="note-meta"><span class="source-badge">${sourceLabel}</span> ` +
    `${(note.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join(" ")}</div>` +
    flagHtml +
    `<pre class="note-body">${esc(note.content)}</pre>` +
    `<div class="btn-row">` +
    `<button id="summarise-btn">Summarise this note</button>` +
    `<button id="preview-delete-btn" class="secondary">Delete note</button>` +
    `</div>` +
    `<div id="summary-output"></div>`;
  $("summarise-btn")?.addEventListener("click", onSummarise);
  $("preview-delete-btn")?.addEventListener("click", () => onDeleteNote(note.id));
}

async function selectNote(id) {
  selectedNoteId = id;
  const note = await getNote(id);
  renderPreview(note);
  await refreshList();
}

async function onDeleteNote(id) {
  await deleteNote(id);
  if (selectedNoteId === id) {
    selectedNoteId = null;
    renderPreview(null);
  }
  await refreshList();
}

// --- Ask -------------------------------------------------------------------
async function onAsk() {
  if (asking) return;
  const q = $("question")?.value.trim() || "";
  const answerEl = $("answer");
  const routingEl = $("routing-panel");
  if (!q) {
    if (answerEl) answerEl.textContent = "Type a question first.";
    return;
  }
  asking = true;
  $("ask-btn").disabled = true;
  try {
    // Grounded first: local search, no model call when nothing matches.
    const results = await searchNotes(q);
    if (results.length === 0) {
      if (answerEl) {
        answerEl.textContent =
          "No matching notes — I couldn't find that in your vault, so no model call was made and no budget was spent.";
      }
      renderRouting(routingEl, {
        route: "none",
        reason: "Grounded refusal — no matching notes, 0 budget spent",
      });
      return;
    }
    const excerpts = capExcerpts(
      results.slice(0, MAX_NOTES_PER_CALL).map((r) => ({ title: r.note.title, text: r.note.content })),
    );
    const prompt = buildGroundedPrompt(q, excerpts);
    if (answerEl) answerEl.textContent = "Thinking…";
    const res = await ask(model, prompt);
    recordCall(res.inferenceSource);
    if (answerEl) answerEl.textContent = res.text;
    renderRouting(routingEl, res);
    renderBudget();
  } catch (err) {
    // Loud failure: the error message is already a complete sentence
    // (privacy refusal, missing Firebase config, or an SDK error).
    // Nothing was sent anywhere in the privacy/config cases.
    if (answerEl) {
      answerEl.textContent = err.message || String(err);
    }
    renderRouting(routingEl, {
      route: "none",
      reason:
        err instanceof FirebaseNotConfiguredError
          ? "Setup needed — no model call made"
          : "Loud refusal — no cloud call made",
    });
  } finally {
    asking = false;
    $("ask-btn").disabled = false;
  }
}

// --- Summarise -------------------------------------------------------------
async function onSummarise() {
  const out = $("summary-output");
  if (!selectedNoteId) return;
  const note = await getNote(selectedNoteId);
  if (!note || !out) return;
  out.innerHTML = `<p class="hint">Summarising…</p>`;
  try {
    const res = await summarise(model, note);
    recordCall(res.inferenceSource);
    const bullets = (res.json?.bullets || []).map((b) => `<li>${esc(b)}</li>`).join("");
    out.innerHTML =
      `<h4>Summary — 3 bullets</h4><ul class="bullets">${bullets}</ul>` +
      `<details><summary>Structured JSON</summary><pre class="json">${esc(JSON.stringify(res.json, null, 2))}</pre></details>` +
      `<div class="route-line">${chipHtml(res)}</div>`;
    renderBudget();
  } catch (err) {
    out.innerHTML = `<p class="refusal">${esc(err.message || String(err))}</p>`;
  }
}

// --- Deep Dive (cloud chat) -------------------------------------------------
function chatLine(role, text, route) {
  const log = $("chat-log");
  if (!log) return;
  const div = document.createElement("div");
  div.className = `chat-line chat-${role}`;
  const label = role === "user" ? "You" : role === "system" ? "Note" : "Deep Dive · Cloud";
  div.innerHTML = `<strong>${esc(label)}:</strong> <span></span>`;
  div.querySelector("span").textContent = text;
  if (route) {
    const meta = document.createElement("div");
    meta.className = "route-line";
    meta.innerHTML = chipHtml(route);
    div.appendChild(meta);
  }
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

async function onChatSend() {
  if (chatting) return;
  const input = $("chat-input");
  const msg = input?.value.trim() || "";
  if (!msg) return;
  if (getMode() === "ONLY_ON_DEVICE") {
    chatLine("system", "Privacy mode is on — Deep Dive needs the cloud, so no message was sent. Turn privacy mode off to use Deep Dive.");
    input.value = "";
    return;
  }
  if (!navigator.onLine) {
    chatLine("system", "You are offline — Deep Dive needs the cloud. On-device Ask still works.");
    input.value = "";
    return;
  }
  chatting = true;
  $("chat-send").disabled = true;
  try {
    chatLine("user", msg);
    input.value = "";
    if (!chat) chat = model.startChat();
    // Ground the chat turn in the vault: top matches, or the 3 most recent
    // notes when nothing matches (labelled as such in the log).
    const results = await searchNotes(msg);
    let excerpts;
    if (results.length > 0) {
      excerpts = results.slice(0, MAX_NOTES_PER_CALL).map((r) => ({ title: r.note.title, text: r.note.content }));
    } else {
      const recent = (await listNotes()).slice(0, MAX_NOTES_PER_CALL);
      excerpts = recent.map((n) => ({ title: n.title, text: n.content }));
      chatLine("system", "No notes matched your message — using your 3 most recent notes as context.");
    }
    const prompt = buildGroundedPrompt(msg, capExcerpts(excerpts));
    const result = await chat.sendMessage(prompt);
    const r = result.response;
    recordCall(r.inferenceSource);
    chatLine("model", r.text(), { inferenceSource: r.inferenceSource, route: r.route, reason: r.reason });
    renderBudget();
  } catch (err) {
    chatLine("system", err.message || String(err));
  } finally {
    chatting = false;
    $("chat-send").disabled = false;
  }
}

// --- Organise (tag plan) -----------------------------------------------------
async function onOrganise() {
  const out = $("organise-output");
  if (!out) return;
  out.innerHTML = `<p class="hint">Planning…</p>`;
  try {
    const notes = await listNotes();
    if (notes.length === 0) {
      out.innerHTML = `<p class="hint">The vault is empty — nothing to organise.</p>`;
      return;
    }
    const res = await organise(model, notes);
    recordCall(res.inferenceSource);
    const groups = (res.json?.groups || [])
      .map(
        (g) =>
          `<div class="org-group"><strong>${esc(g.tag)}</strong> — ${g.noteTitles.map(esc).join(", ")}</div>`,
      )
      .join("");
    out.innerHTML =
      `<h4>Tag plan (plan only — no notes were changed)</h4>${groups}` +
      `<div class="route-line">${chipHtml(res)}</div>`;
    renderBudget();
  } catch (err) {
    out.innerHTML = `<p class="refusal">${esc(err.message || String(err))}</p>`;
  }
}

// --- Model / privacy / connectivity -----------------------------------------
function updateModeBadge() {
  const badge = $("mode-badge");
  const privacyOn = getMode() === "ONLY_ON_DEVICE";
  if (badge) {
    badge.textContent = privacyOn
      ? "Mode: on-device only (ONLY_ON_DEVICE)"
      : "Mode: hybrid (PREFER_ON_DEVICE)";
  }
  const deepNote = $("deep-dive-note");
  if (deepNote) {
    deepNote.textContent = privacyOn
      ? "Privacy mode is on — Deep Dive is cloud-only, so it is paused until you turn privacy mode off."
      : "Multi-note synthesis + follow-up chat. Cloud-only — the app says so before you send anything.";
  }
  if ($("chat-send")) $("chat-send").disabled = privacyOn || !navigator.onLine;
}

function updateOnline() {
  const el = $("online-status");
  const online = navigator.onLine;
  if (el) {
    el.textContent = online
      ? "Online"
      : "Offline — cloud features unavailable, on-device Ask still works";
  }
  updateModeBadge();
}

async function onInitModel() {
  const status = $("model-status");
  const btn = $("init-model-btn");
  if (btn) btn.disabled = true;
  try {
    // Honest pre-check: no Prompt API in this browser means no on-device
    // model at all — say so instead of starting a download that cannot work.
    const avail = await getDeviceModelAvailability();
    if (avail === "unavailable") {
      if (status) {
        status.textContent =
          "Model: on-device not available in this browser — Chrome on Desktop v139+ with the Prompt API flag is required. Cloud fallback stays on.";
      }
      if (btn) btn.disabled = false;
      return;
    }
    if (status) status.textContent = `Model: downloading… 0% (${avail})`;
    await initDeviceModel(model, (v) => {
      if (status) status.textContent = `Model: downloading… ${Math.round(v * 100)}%`;
    });
    if (status) status.textContent = "Model: ready — on-device";
  } catch (err) {
    if (status) status.textContent = `Model: failed — ${err.message || err}`;
    if (btn) btn.disabled = false;
  }
}

// --- Boot --------------------------------------------------------------------
async function boot() {
  const info = getEngineInfo();
  engineLabel = info.configured ? "Firebase AI Logic" : "Not configured";
  const banner = $("engine-banner");
  if (banner) {
    banner.textContent = info.configured
      ? `FIREBASE AI LOGIC — ${info.note}`
      : `FIREBASE AI LOGIC — NOT CONFIGURED. ${info.note}`;
  }
  await seedSamples();
  await refreshList();
  renderBudget();
  updateModeBadge();
  updateOnline();

  $("search-notes")?.addEventListener("input", () => refreshList());
  $("ask-btn")?.addEventListener("click", onAsk);
  $("question")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onAsk();
  });
  $("init-model-btn")?.addEventListener("click", onInitModel);
  $("privacy-mode")?.addEventListener("change", (e) => {
    setPrivacyMode(e.target.checked);
    chat = null; // mode changed — start a fresh chat session later
    updateModeBadge();
  });
  $("chat-send")?.addEventListener("click", onChatSend);
  $("chat-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onChatSend();
  });
  $("organise-btn")?.addEventListener("click", onOrganise);
  $("import-notes")?.addEventListener("change", async (e) => {
    const res = await importFiles(e.target.files);
    const status = $("import-status");
    if (status) {
      status.textContent = `Imported ${res.added} note${res.added === 1 ? "" : "s"}` +
        (res.skipped ? `, skipped ${res.skipped} (empty or not .md/.txt)` : "") + ".";
    }
    e.target.value = "";
    await refreshList();
  });
  $("paste-add")?.addEventListener("click", async () => {
    const title = $("paste-title")?.value.trim() || "Pasted note";
    const body = $("paste-body")?.value || "";
    const note = await importText(title, body);
    const status = $("import-status");
    if (status) status.textContent = note ? `Added “${note.title}”.` : "Nothing to add — the pasted text was empty.";
    if ($("paste-title")) $("paste-title").value = "";
    if ($("paste-body")) $("paste-body").value = "";
    await refreshList();
  });
  $("restore-samples")?.addEventListener("click", async () => {
    const res = await restoreSamples();
    const status = $("import-status");
    if (status) status.textContent = res.restored ? `Restored ${res.restored} sample note${res.restored === 1 ? "" : "s"}.` : "All sample notes are already in the vault.";
    await refreshList();
  });
  $("note-list")?.addEventListener("click", async (e) => {
    const target = e.target;
    const actionBtn = target.closest?.("[data-action='delete']");
    if (actionBtn) {
      e.stopPropagation();
      await onDeleteNote(actionBtn.dataset.id);
      return;
    }
    const li = target.closest?.("li[data-id]");
    if (li) await selectNote(li.dataset.id);
  });

  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
}

boot().catch((err) => {
  const answerEl = $("answer");
  if (answerEl) answerEl.textContent = `App failed to start: ${err.message || err}`;
  // eslint-disable-next-line no-console
  console.error("NoteVault Hybrid failed to start:", err);
});
