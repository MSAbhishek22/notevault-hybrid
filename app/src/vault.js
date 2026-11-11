// NoteVault Hybrid — vault: IndexedDB storage, import, local search.
// Local-first: notes live in the browser. No account, no server, no upload.
// Search is plain keyword scoring over title + content — no AI is needed
// (and no model call is made) to find notes. The app never edits a note's
// content; Organise only prints a plan. (Shell, 5 Nov 2026.)
import { SAMPLE_NOTES } from "./samples.js";

const DB_NAME = "notevault-hybrid";
const DB_VERSION = 1;
const STORE = "notes";

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
  "is", "are", "was", "were", "what", "when", "where", "how", "why",
  "do", "does", "did", "i", "my", "me", "we", "you", "it", "its",
  "this", "that", "these", "those", "about", "from", "by", "at", "as",
]);

export function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function countOccurrences(haystack, needle) {
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    n += 1;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return n;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
  });
}

let dbPromise = null;
function getDb() {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
  });
}

function newId() {
  return `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function listNotes() {
  const db = await getDb();
  const notes = await reqToPromise(
    db.transaction(STORE, "readonly").objectStore(STORE).getAll(),
  );
  return notes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function getNote(id) {
  const db = await getDb();
  return reqToPromise(
    db.transaction(STORE, "readonly").objectStore(STORE).get(id),
  );
}

export async function addNote({ title, content, tags = [], source = "paste" }) {
  const now = Date.now();
  const note = {
    id: newId(),
    title: String(title || "Untitled note").trim() || "Untitled note",
    content: String(content || ""),
    tags,
    source,
    createdAt: now,
    updatedAt: now,
  };
  const db = await getDb();
  await reqToPromise(
    db.transaction(STORE, "readwrite").objectStore(STORE).add(note),
  );
  return note;
}

export async function deleteNote(id) {
  const db = await getDb();
  await reqToPromise(
    db.transaction(STORE, "readwrite").objectStore(STORE).delete(id),
  );
}

// Seed the synthetic samples only when the vault is empty.
export async function seedSamples() {
  const existing = await listNotes();
  if (existing.length > 0) return { seeded: 0, already: existing.length };
  const db = await getDb();
  const now = Date.now();
  for (const s of SAMPLE_NOTES) {
    const note = { ...s, createdAt: now, updatedAt: now };
    await reqToPromise(
      db.transaction(STORE, "readwrite").objectStore(STORE).put(note),
    );
  }
  return { seeded: SAMPLE_NOTES.length, already: 0 };
}

// Re-add any deleted sample notes (same ids, so nothing duplicates).
export async function restoreSamples() {
  const db = await getDb();
  const now = Date.now();
  let restored = 0;
  for (const s of SAMPLE_NOTES) {
    const existing = await getNote(s.id);
    if (!existing) {
      await reqToPromise(
        db.transaction(STORE, "readwrite")
          .objectStore(STORE)
          .put({ ...s, createdAt: now, updatedAt: now }),
      );
      restored += 1;
    }
  }
  return { restored };
}

function firstExcerpt(note, maxLen = 160) {
  const body = String(note.content || "").replace(/\s+/g, " ").trim();
  return body.length > maxLen ? `${body.slice(0, maxLen)}…` : body;
}

function bestExcerpt(note, terms, maxLen = 160) {
  const sentences = String(note.content || "").split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    const lower = s.toLowerCase();
    if (terms.some((t) => lower.includes(t))) {
      const clean = s.replace(/\s+/g, " ").trim();
      return clean.length > maxLen ? `${clean.slice(0, maxLen)}…` : clean;
    }
  }
  return firstExcerpt(note, maxLen);
}

// Local keyword search. Title matches count 3x, body matches 1x per hit.
// Returns [{ note, score, excerpt }] sorted by score, best first.
export async function searchNotes(query) {
  const notes = await listNotes();
  const terms = tokenize(query);
  if (terms.length === 0) {
    return notes.map((note) => ({ note, score: 0, excerpt: firstExcerpt(note) }));
  }
  const scored = [];
  for (const note of notes) {
    const title = note.title.toLowerCase();
    const body = note.content.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (title.includes(t)) score += 3;
      score += countOccurrences(body, t);
    }
    if (score > 0) scored.push({ note, score, excerpt: bestExcerpt(note, terms) });
  }
  return scored.sort((a, b) => b.score - a.score);
}

// Import .md / .txt files the user picks. Reads files only; never writes to disk.
export async function importFiles(fileList) {
  const files = Array.from(fileList || []);
  let added = 0;
  let skipped = 0;
  for (const file of files) {
    const name = file.name || "";
    if (!/\.(md|txt)$/i.test(name)) {
      skipped += 1;
      continue;
    }
    const text = await file.text();
    if (!text.trim()) {
      skipped += 1;
      continue;
    }
    const title = name.replace(/\.(md|txt)$/i, "").replace(/[-_]+/g, " ").trim() || "Imported note";
    await addNote({ title, content: text, tags: [], source: "import" });
    added += 1;
  }
  return { added, skipped };
}

export async function importText(title, content) {
  if (!String(content || "").trim()) return null;
  return addNote({ title, content, tags: [], source: "paste" });
}
