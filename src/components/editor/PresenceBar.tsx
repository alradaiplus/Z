"use client";

import { useEffect, useState } from "react";
import type { WebsocketProvider } from "y-websocket";

type Peer = { name: string; color: string };

/**
 * Shows avatars for everyone currently in the page's collaboration room,
 * derived from the provider's awareness states.
 */
export function PresenceBar({ provider }: { provider: WebsocketProvider }) {
  const [peers, setPeers] = useState<Peer[]>([]);

  useEffect(() => {
    const update = () => {
      const seen: Peer[] = [];
      provider.awareness.getStates().forEach((state) => {
        const user = (state as { user?: Peer }).user;
        if (user?.name) seen.push(user);
      });
      setPeers(seen);
    };
    update();
    provider.awareness.on("change", update);
    return () => provider.awareness.off("change", update);
  }, [provider]);

  if (peers.length === 0) return null;

  return (
    <div className="flex items-center -space-x-1.5" title={`${peers.length} online`}>
      {peers.slice(0, 5).map((p, i) => (
        <span
          key={i}
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-bg text-[10px] font-semibold text-white"
          style={{ background: p.color }}
          title={p.name}
        >
          {p.name.slice(0, 1).toUpperCase()}
        </span>
      ))}
      {peers.length > 5 && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-bg bg-surface-hover text-[10px]">
          +{peers.length - 5}
        </span>
      )}
    </div>
  );
}
