import { useEffect, useState } from "react";
import { HALLOWEEN_MINT } from "../config";
import { HALLOWEEN_IDS } from "../lib/halloweenIds";
import { halloweenImg } from "../lib/media";

const KEY = "remyxp.halloween-mint";
/** This visit's Halloween Remys, in random order: the flyer cycles through them; the haunted wallpaper shows the first unless the user pinned one. */
const FLYER_ART = [...new Set(Array.from({ length: 8 }, () => HALLOWEEN_IDS[Math.floor(Math.random() * HALLOWEEN_IDS.length)]))].slice(0, 6);
export const VISIT_HALLOWEEN = FLYER_ART[0];
const FLYER_MS = 3600;

function Pumpkin() {
  return (
    <svg className="spooky-pumpkin" viewBox="0 0 64 60" aria-hidden="true" focusable="false">
      <path d="M31 14c0-6 2-10 7-12l2 3c-4 2-5 5-5 9z" fill="#4d6b1f" />
      <path d="M37 6c5-3 10-2 13 1-5 0-9 1-12 3z" fill="#6c9a2a" />
      <ellipse cx="18" cy="35" rx="15" ry="20" fill="#d9590b" />
      <ellipse cx="46" cy="35" rx="15" ry="20" fill="#d9590b" />
      <ellipse cx="32" cy="35" rx="16" ry="22" fill="#f47a16" />
      <ellipse cx="26" cy="34" rx="5" ry="19" fill="#ff9330" opacity="0.55" />
      <g className="spooky-face" fill="#ffe36b">
        <path d="M18 30l7-9 6 9z" />
        <path d="M33 30l6-9 7 9z" />
        <path d="M30 34l2-4 2 4z" />
        <path d="M14 39c6 9 30 9 36 0l-4 2-3 4-4-3-3 4-4-4-3 4-4-4-3 3-4-4z" />
      </g>
    </svg>
  );
}

function Bat({ className }: { className: string }) {
  return (
    <svg className={`spooky-bat ${className}`} viewBox="0 0 24 10" aria-hidden="true" focusable="false">
      <path d="M0 4c3-3 6-2 8 0 1-2 2-3 4-1 2-2 3-1 4 1 2-2 5-3 8 0-3 0-5 1-6 4-1-1-3-2-4 0-1-1-2-2-2-2s-1 1-2 2c-1-2-3-1-4 0-1-3-3-4-6-4z" />
    </svg>
  );
}

/** Fog and bats over the Halloween wallpaper (the art itself is the wallpaper background). */
export function HauntedSky() {
  return (
    <div className="haunted" aria-hidden="true">
      {["h1", "h2", "h3", "h4", "h5"].map((c) => (
        <span key={c} className={`haunted-flight ${c}`}>
          <Bat className="haunted-bat" />
        </span>
      ))}
      <div className="haunted-fog f1" />
      <div className="haunted-fog f2" />
    </div>
  );
}

/** Framed Halloween Remys, cross-fading every few seconds, with the jack-o'-lantern as a badge. */
function Portrait() {
  const [on, setOn] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setOn((i) => (i + 1) % FLYER_ART.length), FLYER_MS);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="spooky-portrait">
      <div className="spooky-frame">
        {FLYER_ART.map((id, i) => (
          <img key={id} className={i === on ? "on" : ""} {...halloweenImg(id, "84px")} alt={i === on ? `Halloween Remy #${id}` : ""} />
        ))}
      </div>
      <Pumpkin />
    </div>
  );
}

/** Dismissible Halloween flyer for the free Halloween Remys mint. `pocket` renders the phone Today-screen variant. */
export function HalloweenMint({ pocket }: { pocket?: boolean }) {
  const [hidden, setHidden] = useState(() => localStorage.getItem(KEY) === "1");
  if (hidden) return null;
  const dismiss = () => {
    localStorage.setItem(KEY, "1");
    setHidden(true);
  };
  return (
    <aside
      className={`spooky${pocket ? " pocket-spooky" : ""}`}
      aria-label="Halloween Remys free mint"
      onContextMenu={(e) => e.stopPropagation()}
    >
      <div className="spooky-sky" aria-hidden="true">
        <span className="spooky-moon" />
        <Bat className="b1" />
        <Bat className="b2" />
        <Bat className="b3" />
      </div>
      <button
        type="button"
        className="spooky-x"
        aria-label="Dismiss Halloween mint"
        title="Dismiss"
        onClick={dismiss}
      />
      <Portrait />
      <div className="spooky-copy">
        <span className="spooky-tag">Remy holders only</span>
        <b className="spooky-title">
          Free Mint<small>Halloween Remys</small>
        </b>
        <span className="spooky-text">Hold a Remy? Your Halloween Remy is free on jpeg markets.</span>
        <a className="spooky-cta" href={HALLOWEEN_MINT} target="_blank" rel="noreferrer">
          Mint on jpeg markets ↗
        </a>
      </div>
    </aside>
  );
}
