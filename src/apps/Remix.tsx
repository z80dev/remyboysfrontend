import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import type { AppProps } from "../os/apps";
import { artSrc } from "../lib/art";
import { Icon } from "../os/icons";
import { StatusBar } from "../os/ui";
import "./Remix.css";

const TOTAL_ART = 4490;
const PAGE_SIZE = 24;
const DRAFT_KEY = "remy-remix.draft";
const RESULT_KEY = "remy-remix.result";
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MODELS = [
  { id: "openai/gpt-image-2.5-flare", label: "GPT Image 2.5 Flare", priceLabel: "About 1.5¢ in a sample · variable" },
] as const;
const PRESETS = [
  {
    id: "screenprint",
    label: "Screen print",
    text: "Reimagine this character as a bold two-colour screen print, crisp ink edges, subtle paper grain.",
  },
  {
    id: "storybook",
    label: "Storybook",
    text: "Render this character in a charming hand-painted storybook illustration, soft gouache texture and warm light.",
  },
  {
    id: "pixel",
    label: "Pixel art",
    text: "Transform this character into polished 16-bit pixel art, a compact limited palette and clean readable silhouette.",
  },
  {
    id: "sticker",
    label: "Sticker sheet",
    text: "Create a die-cut vinyl sticker portrait of this character, clean thick white border, glossy finish and simple bold shapes.",
  },
] as const;

type Result = {
  imageDataUrl: string;
  model: string;
  costUsd: number | null;
  artIndex: number;
  prompt: string;
  createdAt: string;
  referenceImageUsed?: boolean;
  referenceImageName?: string;
  referenceImageDataUrl?: string;
};
type Draft = { artIndex: number; prompt: string; model: string };
type UploadedImage = { name: string; dataUrl: string; width: number; height: number };

function readDraft(): Draft | undefined {
  const value = safeRead<unknown>("localStorage", DRAFT_KEY);
  if (!value || typeof value !== "object") return undefined;
  const draft = value as Partial<Draft>;
  if (
    typeof draft.artIndex !== "number" ||
    !Number.isInteger(draft.artIndex) ||
    draft.artIndex < 0 ||
    draft.artIndex >= TOTAL_ART ||
    typeof draft.prompt !== "string" ||
    typeof draft.model !== "string"
  )
    return undefined;
  return { artIndex: draft.artIndex, prompt: draft.prompt.slice(0, 2000), model: draft.model };
}

function readResult(): Result | undefined {
  const value = safeRead<unknown>("sessionStorage", RESULT_KEY);
  if (!value || typeof value !== "object") return undefined;
  const result = value as Partial<Result>;
  if (
    typeof result.imageDataUrl !== "string" ||
    !result.imageDataUrl.startsWith("data:image/") ||
    typeof result.model !== "string" ||
    (typeof result.costUsd !== "number" && result.costUsd !== null) ||
    typeof result.artIndex !== "number" ||
    !Number.isInteger(result.artIndex) ||
    result.artIndex < 0 ||
    result.artIndex >= TOTAL_ART ||
    typeof result.prompt !== "string" ||
    typeof result.createdAt !== "string"
  )
    return undefined;
  return result as Result;
}
function safeRead<T>(storage: "localStorage" | "sessionStorage", key: string): T | undefined {
  try {
    const raw = window[storage].getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}
function safeWrite(storage: "localStorage" | "sessionStorage", key: string, value: unknown) {
  try {
    window[storage].setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
function dataExtension(dataUrl: string) {
  const mime = dataUrl.match(/^data:([^;,]+)/)?.[1]?.toLowerCase();
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/avif") return "avif";
  if (mime === "image/bmp") return "bmp";
  if (mime === "image/tiff") return "tiff";
  return "img";
}
function explainError(body: unknown, status: number) {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") return body.error;
  return `Remix request failed (HTTP ${status}). Please try again.`;
}

// A paid request belongs to the browser session, not the closable OS window.
let studio: {
  busy: boolean;
  error: string;
  result?: Result;
  savedResult: boolean;
  pending?: Draft;
  upload?: UploadedImage;
  uploadLoading: boolean;
  uploadError: string;
} = {
  busy: false,
  error: "",
  result: readResult(),
  savedResult: true,
  uploadLoading: false,
  uploadError: "",
};
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => studio;
function updateStudio(change: Partial<typeof studio>) {
  studio = { ...studio, ...change };
  for (const listener of listeners) listener();
}

let uploadVersion = 0;
async function loadUpload(file: File) {
  const version = ++uploadVersion;
  updateStudio({ uploadLoading: true, uploadError: "", upload: undefined });
  try {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      throw new Error("Choose a PNG, JPEG, or WebP image.");
    }
    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      throw new Error("Choose an image up to 4 MB.");
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("The image could not be read. Please choose it again."));
      reader.readAsDataURL(file);
    });
    const image = new Image();
    image.src = dataUrl;
    try {
      await image.decode();
    } catch {
      throw new Error("This file could not be decoded as an image. Try another PNG, JPEG, or WebP.");
    }
    if (version === uploadVersion) {
      updateStudio({ upload: { name: file.name, dataUrl, width: image.naturalWidth, height: image.naturalHeight } });
    }
  } catch (cause) {
    if (version === uploadVersion)
      updateStudio({ uploadError: cause instanceof Error ? cause.message : "Upload failed." });
  } finally {
    if (version === uploadVersion) updateStudio({ uploadLoading: false });
  }
}

export function Remix({ param }: AppProps) {
  const routeIndex = param !== undefined && /^\d+$/.test(param) ? Number(param) : undefined;
  const initialDraft = useMemo(readDraft, []);
  const [selected, setSelected] = useState(() =>
    routeIndex !== undefined && routeIndex >= 0 && routeIndex < TOTAL_ART
      ? routeIndex
      : (initialDraft?.artIndex ?? 2069),
  );
  const [prompt, setPrompt] = useState(() => initialDraft?.prompt ?? "");
  const [model, setModel] = useState<string>(() =>
    MODELS.some((item) => item.id === initialDraft?.model) ? initialDraft!.model : MODELS[0].id,
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(() =>
    Math.floor(
      (routeIndex !== undefined && routeIndex >= 0 && routeIndex < TOTAL_ART
        ? routeIndex
        : (initialDraft?.artIndex ?? 2069)) / PAGE_SIZE,
    ),
  );
  const [available, setAvailable] = useState<boolean | null>(null);
  const [availabilityError, setAvailabilityError] = useState("");
  const { busy, error, result, savedResult, pending, upload, uploadLoading, uploadError } = useSyncExternalStore(
    subscribe,
    snapshot,
  );
  const [savedDraft, setSavedDraft] = useState(true);
  const layoutRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const layout = layoutRef.current;
    const output = resultRef.current;
    if (result && layout && output) {
      layout.scrollTop += output.getBoundingClientRect().top - layout.getBoundingClientRect().top;
    }
  }, [result]);

  useEffect(() => {
    if (routeIndex !== undefined && routeIndex >= 0 && routeIndex < TOTAL_ART) {
      setSelected(routeIndex);
      setPage(Math.floor(routeIndex / PAGE_SIZE));
    }
  }, [routeIndex]);
  useEffect(() => {
    setSavedDraft(safeWrite("localStorage", DRAFT_KEY, { artIndex: selected, prompt, model } satisfies Draft));
  }, [selected, prompt, model]);
  useEffect(() => {
    let active = true;
    fetch("/api/remix")
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(explainError(body, response.status));
        return body as { available?: boolean; models?: { id: string; label: string; priceLabel: string }[] };
      })
      .then((body) => {
        if (active) {
          setAvailable(body.available === true);
          setAvailabilityError("");
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setAvailable(false);
          setAvailabilityError(cause instanceof Error ? cause.message : "Remix service is unavailable.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim();
    if (!query) return undefined;
    if (!/^\d+$/.test(query)) return [];
    return Array.from({ length: TOTAL_ART }, (_, index) => index).filter((index) => String(index).includes(query));
  }, [search]);
  const count = filtered?.length ?? TOTAL_ART;
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visibleArt = filtered
    ? filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
    : Array.from({ length: Math.min(PAGE_SIZE, TOTAL_ART - safePage * PAGE_SIZE) }, (_, i) => safePage * PAGE_SIZE + i);
  const generate = async (event: FormEvent) => {
    event.preventDefault();
    if (
      studio.busy ||
      studio.uploadLoading ||
      studio.uploadError ||
      available !== true ||
      !prompt.trim() ||
      selected < 0 ||
      selected >= TOTAL_ART
    )
      return;
    const reference = studio.upload;
    const submitted = {
      artIndex: selected,
      prompt: prompt.trim(),
      model,
      ...(reference ? { referenceImage: reference.dataUrl } : {}),
    };
    updateStudio({ busy: true, error: "", pending: submitted });
    try {
      const response = await fetch("/api/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitted),
      });
      const body: unknown = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(explainError(body, response.status));
      if (
        !body ||
        typeof body !== "object" ||
        !("imageDataUrl" in body) ||
        typeof body.imageDataUrl !== "string" ||
        !body.imageDataUrl.startsWith("data:image/")
      ) {
        throw new Error("The remix service returned an image in an unexpected format.");
      }
      const completed = { ...body, ...(reference ? { referenceImageName: reference.name } : {}) } as Result;
      if (
        (typeof completed.costUsd !== "number" && completed.costUsd !== null) ||
        (typeof completed.costUsd === "number" && (!Number.isFinite(completed.costUsd) || completed.costUsd < 0)) ||
        typeof completed.model !== "string" ||
        typeof completed.artIndex !== "number" ||
        typeof completed.prompt !== "string" ||
        typeof completed.createdAt !== "string"
      ) {
        throw new Error("The remix service returned incomplete result details.");
      }
      if (
        completed.artIndex !== submitted.artIndex ||
        completed.prompt !== submitted.prompt ||
        completed.model !== submitted.model ||
        completed.referenceImageUsed !== Boolean(reference)
      )
        throw new Error("The remix service returned details that do not match this request.");
      const persisted = safeWrite("sessionStorage", RESULT_KEY, completed);
      if (!persisted) {
        try {
          sessionStorage.removeItem(RESULT_KEY);
        } catch {
          /* Storage may be disabled. */
        }
      }
      updateStudio({
        result: { ...completed, ...(reference ? { referenceImageDataUrl: reference.dataUrl } : {}) },
        savedResult: persisted,
      });
    } catch (cause) {
      updateStudio({ error: cause instanceof Error ? cause.message : "Remix failed. No automatic retry was made." });
    } finally {
      updateStudio({ busy: false, pending: undefined });
    }
  };
  const goPage = (next: number) => setPage(Math.max(0, Math.min(pageCount - 1, next)));
  const chooseRandom = () => {
    const index = Math.floor(Math.random() * TOTAL_ART);
    setSelected(index);
    setPage(Math.floor(index / PAGE_SIZE));
    setSearch("");
  };
  const download = (image: string, index: number) => {
    const anchor = document.createElement("a");
    anchor.href = image;
    anchor.download = `remy-${index}-remix.${dataExtension(image)}`;
    anchor.click();
  };
  const selectedModel = MODELS.find((item) => item.id === model) ?? MODELS[0];

  return (
    <div className="remix-app">
      <header className="remix-masthead">
        <div className="remix-mark">
          <Icon name="remix" size={38} />
        </div>
        <div>
          <div className="remix-eyebrow">REMY OS · CREATIVE STUDIO</div>
          <h1>Remix a Remy</h1>
          <p>Same Remy. A whole new world.</p>
        </div>
        <div className="remix-count">
          <b>4,490</b>
          <span>originals</span>
        </div>
      </header>
      <div className="remix-layout" ref={layoutRef}>
        <section className="remix-browser" aria-labelledby="remix-choose-title">
          <div className="remix-section-heading">
            <div>
              <span className="remix-step">01 / SOURCE</span>
              <h2 id="remix-choose-title">Choose your original</h2>
            </div>
            <button type="button" className="btn remix-random" onClick={chooseRandom}>
              <Icon name="random" size={17} /> Surprise me
            </button>
          </div>
          <label className="remix-search">
            <Icon name="search" size={18} />
            <span className="sr-only">Find original art number</span>
            <input
              inputMode="numeric"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value.replace(/\D/g, ""));
                setPage(0);
              }}
              placeholder="Find original art number…"
            />
            <kbd>0–4489</kbd>
          </label>
          <div className="remix-grid" role="group" aria-label="Original Remy art">
            {visibleArt.map((index) => (
              <button
                key={index}
                id={`remy-source-${index}`}
                type="button"
                aria-pressed={selected === index}
                className={`remix-tile${selected === index ? " is-selected" : ""}`}
                onClick={() => setSelected(index)}
                title={`Original art number ${index}`}
              >
                <img src={artSrc(index)} alt="" loading="lazy" />
                <span>#{index}</span>
                {selected === index && (
                  <span className="remix-check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            ))}
            {!visibleArt.length && <p className="remix-empty">No original art number matches “{search}”.</p>}
          </div>
          <div className="remix-pages">
            <span>
              {count
                ? `${safePage * PAGE_SIZE + 1}–${Math.min(count, (safePage + 1) * PAGE_SIZE)} of ${count.toLocaleString()}`
                : "No matches"}
            </span>
            <div>
              <button
                type="button"
                className="btn"
                onClick={() => goPage(safePage - 1)}
                disabled={safePage === 0}
                aria-label="Previous page"
              >
                ‹
              </button>
              <span>
                Page {safePage + 1} / {pageCount}
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => goPage(safePage + 1)}
                disabled={safePage + 1 >= pageCount}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </div>
          <div className="remix-selected">
            <img src={artSrc(selected)} alt={`Original Remy art number ${selected}`} />
            <div>
              <span>IMAGE 1 · YOUR REMY</span>
              <b>Character #{selected}</b>
              <small>Original art number · not the current token ID</small>
            </div>
          </div>
        </section>

        <section className="remix-workbench" aria-labelledby="remix-prompt-title">
          <div className="remix-section-heading">
            <div>
              <span className="remix-step">02 / ART DIRECTION</span>
              <h2 id="remix-prompt-title">Describe the new look</h2>
            </div>
          </div>
          <div className="remix-presets" aria-label="Optional prompt starters">
            {PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.id}
                className="remix-chip"
                onClick={() =>
                  setPrompt((current) => (current ? `${current.trim()}\n\n${preset.text}`.slice(0, 2000) : preset.text))
                }
              >
                {preset.label}
                <span aria-hidden="true">＋</span>
              </button>
            ))}
          </div>
          <form onSubmit={generate}>
            <label className="sr-only" htmlFor="remix-prompt">
              Prompt
            </label>
            <textarea
              id="remix-prompt"
              maxLength={2000}
              rows={6}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="A neon-lit arcade champion, airbrushed 1980s sci-fi poster…"
            />
            <div className="remix-text-meta">
              <span>Be specific about medium, mood, light and palette.</span>
              <span>{prompt.length.toLocaleString()} / 2,000</span>
            </div>
            <div className="remix-upload" aria-labelledby="remix-upload-title">
              <div className="remix-section-heading">
                <div>
                  <span className="remix-step">IMAGE 2 · OPTIONAL</span>
                  <h2 id="remix-upload-title">Add your own reference</h2>
                </div>
              </div>
              <p className="remix-upload-help">An outfit, a scene, a style — show Remy what you have in mind.</p>
              <button
                type="button"
                className="btn remix-upload-picker"
                disabled={busy}
                onClick={() => uploadInputRef.current?.click()}
                aria-describedby="remix-upload-help"
              >
                {upload ? "Replace reference image..." : "Choose reference image..."}
              </button>
              <input
                id="remix-upload"
                ref={uploadInputRef}
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                aria-describedby="remix-upload-help"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void loadUpload(file);
                }}
              />
              <p id="remix-upload-help" className="remix-upload-help">
                PNG, JPEG or WebP · up to 4 MB. Your Remy is always image 1; this upload is always image 2. Use “image
                1” and “image 2” in your prompt.
              </p>
              {uploadLoading && <p role="status">Opening reference image…</p>}
              {upload && (
                <div className="remix-upload-preview">
                  <img src={upload.dataUrl} alt="Image 2: your uploaded reference" />
                  <div>
                    <b>{upload.name}</b>
                    <small>
                      {upload.width} × {upload.height} · image 2
                    </small>
                  </div>
                </div>
              )}
              {(upload || uploadLoading || uploadError) && (
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => {
                    uploadVersion++;
                    updateStudio({ upload: undefined, uploadLoading: false, uploadError: "" });
                  }}
                >
                  {uploadLoading ? "Cancel upload" : "Remove reference"}
                </button>
              )}
              {uploadError && (
                <p className="remix-error" role="alert">
                  {uploadError}
                </p>
              )}
              <p className="remix-upload-help">
                Sent to OpenRouter only when you create a remix. Kept in this tab’s memory, not browser storage;
                re-upload after refreshing. A second image adds input-token cost.
              </p>
            </div>
            <div className="remix-model-label">Image model</div>
            <div className="remix-models" role="radiogroup" aria-label="Image model">
              {MODELS.map((item) => (
                <label key={item.id} className={`remix-model${model === item.id ? " active" : ""}`}>
                  <input
                    type="radio"
                    name="remix-model"
                    value={item.id}
                    checked={model === item.id}
                    onChange={() => setModel(item.id)}
                  />
                  <span>
                    <b>{item.label}</b>
                    <small>{item.priceLabel}</small>
                  </span>
                  {model === item.id && <span className="remix-radio-check">✓</span>}
                </label>
              ))}
            </div>
            <p className="remix-price-note">
              GPT Image 2.5 Flare measured about $0.0145 in one sample; actual token-based charges vary with usage.
            </p>
            <button
              className="btn default remix-generate"
              type="submit"
              disabled={available !== true || busy || uploadLoading || Boolean(uploadError) || !prompt.trim()}
            >
              {busy ? (
                <>
                  <span className="remix-spinner" aria-hidden="true" /> Making your remix…
                </>
              ) : (
                <>
                  <Icon name="remix" size={22} /> Create remix
                </>
              )}
            </button>
            <div
              className={`remix-service ${available === true ? "online" : available === false ? "offline" : ""}`}
              role="status"
            >
              {available === null
                ? "Connecting to the studio…"
                : available
                  ? "Studio ready · one image per request"
                  : availabilityError || "The remix studio is currently unavailable."}
            </div>
            {busy && (
              <p className="remix-storage-note" role="status">
                Remixing Character #{pending?.artIndex}. You can close this window, but keep this browser tab open until
                it finishes.
              </p>
            )}
            {error && (
              <div className="remix-error" role="alert">
                <Icon name="warning" size={19} />
                <span>{error}</span>
              </div>
            )}
          </form>
          {!savedDraft && (
            <p className="remix-storage-note" role="status">
              Browser storage is full; your draft will remain available only while this page is open.
            </p>
          )}
          {!savedResult && result && (
            <p className="remix-storage-note" role="status">
              Browser storage is full; this result will remain available only while this page is open.
            </p>
          )}
        </section>
        {result && (
          <section className="remix-result" ref={resultRef} aria-live="polite">
            <div className="remix-result-head">
              <span className="remix-step">03 / YOUR REMIX</span>
              <h2>Character #{result.artIndex}, reimagined</h2>
              <p>
                Original art #{result.artIndex} · {new Date(result.createdAt).toLocaleString()}
              </p>
            </div>
            {result.referenceImageUsed && (
              <div className="remix-result-reference">
                {result.referenceImageDataUrl && (
                  <img src={result.referenceImageDataUrl} alt="Image 2 used for this remix" />
                )}
                <span>
                  <b>Image 2 used:</b> {result.referenceImageName ?? "Uploaded reference"}
                  {!result.referenceImageDataUrl && " · upload preview is no longer stored"}
                </span>
              </div>
            )}
            <div className="remix-compare">
              <figure>
                <div className="remix-image">
                  <img src={artSrc(result.artIndex)} alt={`Original Character ${result.artIndex}`} />
                </div>
                <figcaption>Original · #{result.artIndex}</figcaption>
              </figure>
              <span className="remix-arrow" aria-hidden="true">
                →
              </span>
              <figure>
                <div className="remix-image">
                  <img src={result.imageDataUrl} alt={`AI remix of original Character ${result.artIndex}`} />
                </div>
                <figcaption>
                  Remix · {MODELS.find((item) => item.id === result.model)?.label ?? result.model}
                </figcaption>
              </figure>
            </div>
            <div className="remix-result-actions">
              <button
                type="button"
                className="btn default"
                onClick={() => download(result.imageDataUrl, result.artIndex)}
              >
                <Icon name="download" size={17} /> Download image
              </button>
              <span>{result.costUsd == null ? "Final cost not reported" : `Billed $${result.costUsd.toFixed(6)}`}</span>
            </div>
            <details className="remix-used-prompt">
              <summary>View the prompt used</summary>
              <p>{result.prompt}</p>
            </details>
          </section>
        )}
      </div>
      <StatusBar right={selectedModel.label}>
        {busy
          ? `Generating original art #${pending?.artIndex}…`
          : result
            ? `Last result · original art #${result.artIndex}`
            : "Ready · sponsored remixes · 5 attempts per network each day"}
      </StatusBar>
    </div>
  );
}
