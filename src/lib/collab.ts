// Client-side collaboration config + identity helpers.
//
// Collaboration is OFF unless NEXT_PUBLIC_COLLAB_WS_URL is set at build time.
// When unset (the default), the editor runs in single-user mode with local
// undo/redo and autosave — exactly as before. When set, the editor joins a Yjs
// room over the websocket provider for live multi-user editing + cursors.

export const COLLAB_WS_URL = (
  process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? ""
).trim();

export const collabEnabled = COLLAB_WS_URL.length > 0;

const COLORS = [
  "#e03131",
  "#2f9e44",
  "#1971c2",
  "#f08c00",
  "#9c36b5",
  "#0c8599",
  "#e8590c",
  "#c2255c",
];

const NAMES = [
  "Otter",
  "Falcon",
  "Maple",
  "Comet",
  "Willow",
  "Pixel",
  "Cobalt",
  "Juniper",
  "Saffron",
  "Quartz",
];

export type CollabUser = { name: string; color: string };

/**
 * A stable per-browser identity (random friendly name + color), persisted in
 * localStorage so a user keeps the same cursor identity across pages.
 */
export function getCollabUser(): CollabUser {
  if (typeof window === "undefined") {
    return { name: "Guest", color: COLORS[0] };
  }
  try {
    const cached = localStorage.getItem("z-collab-user");
    if (cached) return JSON.parse(cached) as CollabUser;
  } catch {
    /* ignore */
  }
  const user: CollabUser = {
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
  try {
    localStorage.setItem("z-collab-user", JSON.stringify(user));
  } catch {
    /* ignore */
  }
  return user;
}

export function roomName(pageId: string): string {
  return `page.${pageId}`;
}
