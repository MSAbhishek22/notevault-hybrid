// NoteVault Hybrid — bundled sample notes (SYNTHETIC SAMPLES, 5 Nov 2026).
// All content is fictional, written for this demo. Nothing here is a real
// person's data, a real household, or a real medical record. Sample notes are
// seeded into IndexedDB only when the vault is empty, and can be deleted
// from the UI. Every sample is labelled SYNTHETIC in its title, its tags,
// and the first line of its content.
export const SAMPLE_NOTES = [
  {
    id: "sample-clinic",
    title: "Clinic field visit — household A (synthetic)",
    tags: ["synthetic", "health"],
    source: "sample",
    content: `SYNTHETIC SAMPLE NOTE — fictional content for demo only.

Household A has five members. The pregnant woman is seven months along and her blood pressure was normal at the visit. The newborn is twelve days old, feeding well, and has no fever. No danger signs were found on the checklist today.

Follow-up: visit again in two weeks. Carry ORS packets and the referral slips. If the baby develops a fever or stops feeding, escalate per protocol the same day.`,
  },
  {
    id: "sample-garden",
    title: "Garden notes — monsoon planting (synthetic)",
    tags: ["synthetic", "garden"],
    source: "sample",
    content: `SYNTHETIC SAMPLE NOTE — fictional content for demo only.

Planted tomatoes, spinach and coriander on 12 July. Water in the morning only, never in the evening. Spray neem solution if aphids appear on the tomato leaves. Spinach should be ready to harvest in three weeks. Turn the compost once a week and keep it covered during heavy rain.`,
  },
  {
    id: "sample-book",
    title: "Book notes — The Design of Everyday Things (synthetic)",
    tags: ["synthetic", "reading"],
    source: "sample",
    content: `SYNTHETIC SAMPLE NOTE — fictional content for demo only.

Key ideas: affordances are what an object lets you do; signifiers show you how. Good mapping means the controls match the thing they control. Feedback must be immediate and visible. A Norman door is a door you push when you should pull — the design failed, not the person. Error messages should explain how to recover, not just what went wrong.`,
  },
  {
    id: "sample-trip",
    title: "Hill station trip checklist (synthetic)",
    tags: ["synthetic", "travel"],
    source: "sample",
    content: `SYNTHETIC SAMPLE NOTE — fictional content for demo only.

Leave Friday at 6 AM and take the NH-7 route. Pack rain jackets and warm layers. The homestay near the lake is booked for two nights. Carry some cash — the village shops do not take cards. Download offline maps before leaving, because mobile signal drops after the pass. Return on Sunday evening.`,
  },
  {
    id: "sample-ideas",
    title: "Project ideas — small tools (synthetic)",
    tags: ["synthetic", "projects"],
    source: "sample",
    content: `SYNTHETIC SAMPLE NOTE — fictional content for demo only.

Three small tool ideas. One: a receipt scanner for kirana bills that totals the month's spending. Two: a watering reminder for house plants that adjusts for the season. Three: an offline bus timetable for routes with patchy mobile signal. The bus timetable is the simplest to build first because the data barely changes.`,
  },
];
