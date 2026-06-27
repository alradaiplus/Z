"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { GraphData } from "@/app/app/graph-actions";

type SimNode = {
  id: string;
  title: string;
  type: string;
  degree: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type Camera = { x: number; y: number; scale: number };

// Force tuning.
const REPULSION = 9000;
const SPRING = 0.02;
const LINK_DIST = 90;
const CENTER_PULL = 0.012;
const DAMPING = 0.86;

export function GraphCanvas({
  data,
  focusId,
  className,
}: {
  data: GraphData;
  focusId?: string;
  className?: string;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Mutable simulation state kept in refs so the RAF loop is stable.
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<{ source: SimNode; target: SimNode }[]>([]);
  const cameraRef = useRef<Camera>({ x: 0, y: 0, scale: 1 });
  const sizeRef = useRef({ w: 0, h: 0 });
  const hoverRef = useRef<SimNode | null>(null);
  const dragRef = useRef<SimNode | null>(null);
  const userMovedCamera = useRef(false);
  const pointer = useRef({
    down: false,
    movedDist: 0,
    lastX: 0,
    lastY: 0,
    onNode: null as SimNode | null,
  });

  // (Re)build the simulation graph when the data identity changes.
  useEffect(() => {
    const prev = new Map(nodesRef.current.map((n) => [n.id, n]));
    const count = data.nodes.length;
    nodesRef.current = data.nodes.map((n, i) => {
      const existing = prev.get(n.id);
      const angle = (i / Math.max(1, count)) * Math.PI * 2;
      const radius = 30 + Math.sqrt(count) * 20;
      return (
        existing ?? {
          id: n.id,
          title: n.title || "Untitled",
          type: n.type,
          degree: n.degree,
          x: Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
          y: Math.sin(angle) * radius + (Math.random() - 0.5) * 20,
          vx: 0,
          vy: 0,
        }
      );
    });
    const byId = new Map(nodesRef.current.map((n) => [n.id, n]));
    linksRef.current = data.links
      .map((l) => ({ source: byId.get(l.source)!, target: byId.get(l.target)! }))
      .filter((l) => l.source && l.target);
    userMovedCamera.current = false;
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      sizeRef.current = { w, h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const css = getComputedStyle(document.documentElement);
    const colorVar = (name: string) =>
      `rgb(${css.getPropertyValue(name).trim().split(/\s+/).join(",")})`;

    const worldToScreen = (x: number, y: number) => {
      const { w, h } = sizeRef.current;
      const cam = cameraRef.current;
      return {
        x: (x - cam.x) * cam.scale + w / 2,
        y: (y - cam.y) * cam.scale + h / 2,
      };
    };
    const screenToWorld = (sx: number, sy: number) => {
      const { w, h } = sizeRef.current;
      const cam = cameraRef.current;
      return {
        x: (sx - w / 2) / cam.scale + cam.x,
        y: (sy - h / 2) / cam.scale + cam.y,
      };
    };

    const radiusOf = (n: SimNode) => 4 + Math.min(10, n.degree * 1.5);

    const nodeAt = (sx: number, sy: number): SimNode | null => {
      const nodes = nodesRef.current;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const s = worldToScreen(n.x, n.y);
        const r = radiusOf(n) * cameraRef.current.scale + 4;
        if ((sx - s.x) ** 2 + (sy - s.y) ** 2 <= r * r) return n;
      }
      return null;
    };

    const autoFit = () => {
      const nodes = nodesRef.current;
      if (!nodes.length) return;
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const n of nodes) {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x);
        maxY = Math.max(maxY, n.y);
      }
      const { w, h } = sizeRef.current;
      const pad = 80;
      const bw = Math.max(1, maxX - minX);
      const bh = Math.max(1, maxY - minY);
      const scale = Math.min((w - pad) / bw, (h - pad) / bh, 1.6);
      cameraRef.current = {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        scale: Math.max(0.15, scale),
      };
    };

    const step = () => {
      const nodes = nodesRef.current;
      const links = linksRef.current;
      const drag = dragRef.current;

      // Repulsion (O(n^2); fine for typical workspaces).
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.01) {
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
            d2 = 0.01;
          }
          const dist = Math.sqrt(d2);
          const f = REPULSION / d2;
          const fx = (dx / dist) * f;
          const fy = (dy / dist) * f;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // Springs along links.
      for (const l of links) {
        const dx = l.target.x - l.source.x;
        const dy = l.target.y - l.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = (dist - LINK_DIST) * SPRING;
        const fx = (dx / dist) * f;
        const fy = (dy / dist) * f;
        l.source.vx += fx;
        l.source.vy += fy;
        l.target.vx -= fx;
        l.target.vy -= fy;
      }

      // Centering + integration.
      for (const n of nodes) {
        if (n === drag) {
          n.vx = 0;
          n.vy = 0;
          continue;
        }
        n.vx += -n.x * CENTER_PULL;
        n.vy += -n.y * CENTER_PULL;
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        n.x += n.vx;
        n.y += n.vy;
      }
    };

    const draw = () => {
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);
      const nodes = nodesRef.current;
      const links = linksRef.current;
      const hover = hoverRef.current;
      const neighbors = new Set<string>();
      if (hover) {
        neighbors.add(hover.id);
        for (const l of links) {
          if (l.source.id === hover.id) neighbors.add(l.target.id);
          if (l.target.id === hover.id) neighbors.add(l.source.id);
        }
      }

      const accent = colorVar("--accent");
      const border = colorVar("--border");
      const text = colorVar("--text");
      const muted = colorVar("--muted");

      // Edges.
      for (const l of links) {
        const s = worldToScreen(l.source.x, l.source.y);
        const t = worldToScreen(l.target.x, l.target.y);
        const active =
          hover && (l.source.id === hover.id || l.target.id === hover.id);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = active ? accent : border;
        ctx.globalAlpha = hover && !active ? 0.25 : 0.8;
        ctx.lineWidth = active ? 1.5 : 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Nodes.
      const scale = cameraRef.current.scale;
      for (const n of nodes) {
        const s = worldToScreen(n.x, n.y);
        const r = radiusOf(n) * Math.max(0.6, Math.min(scale, 1.4));
        const isFocus = n.id === focusId;
        const dim = hover ? !neighbors.has(n.id) : false;

        ctx.globalAlpha = dim ? 0.3 : 1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fillStyle =
          n.type === "database" ? "#a855f7" : isFocus ? accent : accent;
        if (n === hover) ctx.fillStyle = accent;
        ctx.fill();
        if (isFocus) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = text;
          ctx.stroke();
        }

        // Labels: show when zoomed in, hovered, focused, or well-connected.
        if (scale > 0.5 || n === hover || isFocus || n.degree >= 3) {
          ctx.globalAlpha = dim ? 0.4 : 1;
          ctx.fillStyle = n === hover || isFocus ? text : muted;
          ctx.font = `${n === hover ? 600 : 400} 11px ui-sans-serif, system-ui`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          const label =
            n.title.length > 24 ? n.title.slice(0, 23) + "…" : n.title;
          ctx.fillText(label, s.x, s.y + r + 3);
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = () => {
      step();
      if (!userMovedCamera.current) autoFit();
      draw();
      raf = requestAnimationFrame(loop);
    };
    loop();

    // ---- Interaction ----
    const getXY = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      const { x, y } = getXY(e);
      const n = nodeAt(x, y);
      pointer.current = {
        down: true,
        movedDist: 0,
        lastX: x,
        lastY: y,
        onNode: n,
      };
      if (n) dragRef.current = n;
      canvas.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      const { x, y } = getXY(e);
      const p = pointer.current;
      if (p.down) {
        const dx = x - p.lastX;
        const dy = y - p.lastY;
        p.movedDist += Math.abs(dx) + Math.abs(dy);
        p.lastX = x;
        p.lastY = y;
        const cam = cameraRef.current;
        if (dragRef.current) {
          const wp = screenToWorld(x, y);
          dragRef.current.x = wp.x;
          dragRef.current.y = wp.y;
        } else {
          cam.x -= dx / cam.scale;
          cam.y -= dy / cam.scale;
          userMovedCamera.current = true;
        }
      } else {
        hoverRef.current = nodeAt(x, y);
        canvas.style.cursor = hoverRef.current ? "pointer" : "grab";
      }
    };

    const onUp = (e: PointerEvent) => {
      const p = pointer.current;
      if (p.onNode && p.movedDist < 5) {
        router.push(`/app/${p.onNode.id}`);
      }
      dragRef.current = null;
      pointer.current.down = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = getXY(e as unknown as PointerEvent);
      const cam = cameraRef.current;
      const before = screenToWorld(x, y);
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      cam.scale = Math.max(0.1, Math.min(4, cam.scale * factor));
      const after = screenToWorld(x, y);
      cam.x += before.x - after.x;
      cam.y += before.y - after.y;
      userMovedCamera.current = true;
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [router, focusId]);

  return (
    <div ref={wrapRef} className={className}>
      <canvas ref={canvasRef} className="block touch-none" />
    </div>
  );
}
