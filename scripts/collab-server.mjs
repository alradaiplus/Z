// Minimal Yjs websocket server (y-websocket protocol) built on `ws` +
// `y-protocols`. y-websocket v3 ships only the client provider, so we implement
// the small server side here. Used for local development and verification; in
// production you'd run this as a standalone service (or swap in a hosted
// provider) and point NEXT_PUBLIC_COLLAB_WS_URL at it.
//
// Run: node scripts/collab-server.mjs   (PORT via COLLAB_PORT, default 1234)

import { WebSocketServer } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

const PORT = Number(process.env.COLLAB_PORT || 1234);

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

/** room -> { doc, awareness, conns: Map<ws, Set<clientId>> } */
const rooms = new Map();

function getRoom(name) {
  let room = rooms.get(name);
  if (room) return room;

  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);
  awareness.setLocalState(null);
  const conns = new Map();

  const broadcast = (msg) => {
    conns.forEach((_, ws) => {
      if (ws.readyState === ws.OPEN) ws.send(msg);
    });
  };

  doc.on("update", (update) => {
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MESSAGE_SYNC);
    syncProtocol.writeUpdate(enc, update);
    broadcast(encoding.toUint8Array(enc));
  });

  awareness.on("update", ({ added, updated, removed }, origin) => {
    const changed = added.concat(updated, removed);
    if (origin && conns.has(origin)) {
      const controlled = conns.get(origin);
      added.forEach((id) => controlled.add(id));
      removed.forEach((id) => controlled.delete(id));
    }
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      enc,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changed),
    );
    broadcast(encoding.toUint8Array(enc));
  });

  room = { doc, awareness, conns };
  rooms.set(name, room);
  return room;
}

const wss = new WebSocketServer({ port: PORT, host: "0.0.0.0" });

wss.on("connection", (ws, req) => {
  const roomName = decodeURIComponent(
    (req.url || "/").slice(1).split("?")[0] || "default",
  );
  const { doc, awareness, conns } = getRoom(roomName);
  conns.set(ws, new Set());

  ws.on("message", (data) => {
    try {
      const message = new Uint8Array(data);
      const decoder = decoding.createDecoder(message);
      const type = decoding.readVarUint(decoder);
      if (type === MESSAGE_SYNC) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        syncProtocol.readSyncMessage(decoder, encoder, doc, ws);
        if (encoding.length(encoder) > 1) {
          ws.send(encoding.toUint8Array(encoder));
        }
      } else if (type === MESSAGE_AWARENESS) {
        awarenessProtocol.applyAwarenessUpdate(
          awareness,
          decoding.readVarUint8Array(decoder),
          ws,
        );
      }
    } catch (e) {
      console.error("message error:", e);
    }
  });

  ws.on("close", () => {
    const controlled = conns.get(ws);
    conns.delete(ws);
    if (controlled && controlled.size) {
      awarenessProtocol.removeAwarenessStates(
        awareness,
        Array.from(controlled),
        null,
      );
    }
    if (conns.size === 0) {
      // Keep the doc in memory briefly; drop the room when empty.
      rooms.delete(roomName);
    }
  });

  // 1) Send sync step 1 so the client can reconcile.
  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, doc);
    ws.send(encoding.toUint8Array(encoder));
  }

  // 2) Send current awareness states.
  const states = awareness.getStates();
  if (states.size > 0) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        awareness,
        Array.from(states.keys()),
      ),
    );
    ws.send(encoding.toUint8Array(encoder));
  }
});

console.log(`✓ collab websocket server listening on ws://0.0.0.0:${PORT}`);
