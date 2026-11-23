"use client";

import { useEffect, useRef, useState } from "react";
import type { Engine } from "@/lib/engine/Engine";

export default function Experience() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const leadersRef = useRef<SVGSVGElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const holdRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [loading, setLoading] = useState("Preparando");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [drawn, setDrawn] = useState<number | null>(null);
  const [drawKey, setDrawKey] = useState(0);
  const [blueprint, setBlueprint] = useState(false);
  const [muted, setMuted] = useState(false);
  const [fps, setFps] = useState("");

  useEffect(() => {
    let engine: Engine | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { Engine } = await import("@/lib/engine/Engine");
        if (cancelled) return;
        engine = new Engine(canvasRef.current!, {
          labels: labelsRef.current!,
          leaders: leadersRef.current!,
          onProgress: (k, text) => {
            setLoading(text);
            if (barRef.current) barRef.current.style.transform = `scaleX(${k})`;
          },
          onReady: () => setReady(true),
          onHold: (k) => {
            const ring = ringRef.current;
            if (ring) ring.style.strokeDashoffset = String(1 - k);
            holdRef.current?.style.setProperty("--hold", k.toFixed(3));
          },
          onDrawn: (n) => {
            setDrawn(n);
            setDrawKey((x) => x + 1);
          },
          onFps: (f, pr, bloom) => {
            if (new URLSearchParams(location.search).has("debug"))
              setFps(`${f.toFixed(0)} fps · dpr ${pr.toFixed(2)} · bloom ${bloom ? "on" : "off"}`);
          },
        });
        engineRef.current = engine;
        await engine.init();
      } catch (err) {
        console.error(err);
        setFailed(true);
      }
    })();
    const onLoad = () => engineRef.current?.refreshLayout();
    window.addEventListener("load", onLoad);
    document.fonts?.ready.then(onLoad);
    return () => {
      cancelled = true;
      window.removeEventListener("load", onLoad);
      engine?.dispose();
      engineRef.current = null;
    };
  }, []);

  const hold = (on: boolean) => engineRef.current?.setHolding(on);

  return (
    <>
      <canvas ref={canvasRef} className="stage" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />
      <svg ref={leadersRef} className="leaders" aria-hidden="true" />
      <div ref={labelsRef} className="callouts" aria-hidden="true" />

      <header className="nav">
        <a href="#top" className="brand">
          <span className="dot" /> La Gran Tómbola
        </a>
        <nav className="toggles">
          <button
            className={`chip ${blueprint ? "on" : ""}`}
            aria-pressed={blueprint}
            onClick={() => {
              const next = !blueprint;
              setBlueprint(next);
              engineRef.current?.setBlueprint(next);
            }}
          >
            Plano
          </button>
          <button
            className={`chip ${muted ? "" : "on"}`}
            aria-pressed={!muted}
            onClick={() => {
              const next = !muted;
              setMuted(next);
              engineRef.current?.setMuted(next);
            }}
          >
            Sonido
          </button>
        </nav>
      </header>

      <div className="holdbar">
        <button
          ref={holdRef}
          className="hold"
          disabled={!ready}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            hold(true);
          }}
          onPointerUp={() => hold(false)}
          onPointerCancel={() => hold(false)}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat) {
              e.preventDefault();
              hold(true);
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") hold(false);
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <svg viewBox="0 0 64 64" className="hold-ring" aria-hidden="true">
            <circle cx="32" cy="32" r="29" className="track" />
            <circle ref={ringRef} cx="32" cy="32" r="29" className="progress" pathLength={1} />
          </svg>
          <span className="core" />
        </button>
        <div className="holdtext">
          <b>Mantén para girar</b>
          <span>y saca tu bola</span>
        </div>
      </div>

      {drawn !== null && (
        <div className="result" key={drawKey} role="status" aria-live="polite">
          <span>Ha salido el</span>
          <b>{drawn}</b>
        </div>
      )}

      <div className={`loader ${ready ? "done" : ""}`} aria-hidden={ready}>
        <div className="loader-inner">
          <span className="eyebrow">{failed ? "Tu navegador no tiene WebGL" : loading}</span>
          <div className="bar">
            <div ref={barRef} />
          </div>
        </div>
      </div>
      {fps && <div className="debug">{fps}</div>}
    </>
  );
}
