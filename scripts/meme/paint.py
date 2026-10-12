"""Painted meme art: image generation with Remy originals as character references.

uv run -q --with requests python scripts/meme/paint.py scripts/meme/sets/ipd2026-art.json [--only a,b] [--force] [--n 2] [--jobs 3]

Spec JSON: { "provider": "codex"|"openrouter", "model", "codexModel", "quality", "style",
             "jobs": [{ "name", "aspect": "1:1"|"3:2"|"2:3"|"4:3"|"16:9"|…, "refs": [42, "h123", …], "quality"?, "prompt" }] }
Refs: a number is media/remy/Character<id>.webp; "h<id>" is the Halloween collection's media/halloween/<id>.webp.
Each job sends the referenced media/remy/Character<id>.webp originals plus `style + prompt`; outputs land in
output/meme/art/<name>.png (variants <name>-2.png … with --n). Existing files are skipped unless --force.

Providers:
- codex: drives the local Codex CLI (`codex exec`) signed in with ChatGPT, whose built-in image_generation tool
  uses the ChatGPT image model on the subscription (no API credits). References are attached with -i; the image is
  picked up from ~/.codex/generated_images/<thread id>/. Codex picks the final pixel size (square/landscape/portrait).
- openrouter: OpenRouter Images API (`model`, e.g. openai/gpt-image-2.5-flare); key in
  ~/.config/remy-meme/openrouter.key (or OPENROUTER_API_KEY). Billed per image.
"""

import argparse
import base64
import json
import os
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "meme" / "art"
API = "https://openrouter.ai/api/v1/images"
CODEX_IMAGES = Path.home() / ".codex" / "generated_images"
ORIENT = {"1:1": "square (1024x1024)", "2:3": "portrait (1024x1536)", "3:4": "portrait (1024x1536)", "9:16": "portrait (1024x1536)"}


def key():
    return os.environ.get("OPENROUTER_API_KEY") or (Path.home() / ".config" / "remy-meme" / "openrouter.key").read_text().strip()


def ref_source(r):
    """Ref id → (source image, face crop as (size, y, x)). Ints/'123' are Remy originals (600 px busts that all share one
    mesh, so the face sits at the same spot); 'h123' is Halloween token 123 (1024 px, head centred upper-middle)."""
    r = str(r)
    if r.startswith("h"):
        return ROOT / "media" / "halloween" / f"{r[1:]}.webp", (560, 220, 232)
    return ROOT / "media" / "remy" / f"Character{r}.webp", (360, 80, 120)


def codex_one(job, spec, out):
    orient = ORIENT.get(job.get("aspect", "1:1"), "landscape (1536x1024)")
    prompt = (
        "Use your image generation tool exactly once to create the image described below, at the highest quality, "
        f"{orient}. The attached images are character references only (copy the characters, not their photo backgrounds); "
        "each full bust is followed by a close-up of the same character's face: match those faces exactly, especially the "
        "very large glossy anime eyes with big white highlights and the thick, straight, angled black eyebrows. "
        "Do not create or edit any files yourself. When the image is generated, reply with just: done\n\n"
        + spec["style"] + "\n\n" + job["prompt"]
    )
    with tempfile.TemporaryDirectory() as tmp:
        refs = []
        for i in job.get("refs", []):
            src, (s, y, x) = ref_source(i)
            png, face = Path(tmp) / f"ref{i}.png", Path(tmp) / f"ref{i}-face.png"
            subprocess.run(["sips", "-s", "format", "png", str(src), "--out", str(png)], check=True, capture_output=True)
            subprocess.run(["sips", "-c", str(s), str(s), "--cropOffset", str(y), str(x), str(png), "--out", str(face)], check=True, capture_output=True)
            refs += ["-i", str(png), "-i", str(face)]
        cmd = ["codex", "exec", "--skip-git-repo-check", "--json", "-s", "read-only", "-C", tmp,
               "-m", spec.get("codexModel", "gpt-6-luna"), "-c", "service_tier=default", *refs, "-"]
        err = ""
        for _ in range(2):
            p = subprocess.run(cmd, input=prompt, capture_output=True, text=True, timeout=1200)
            thread = None
            for line in p.stdout.splitlines():
                try:
                    ev = json.loads(line)
                except ValueError:
                    continue
                if ev.get("type") == "thread.started":
                    thread = ev["thread_id"]
                if ev.get("type") in ("error", "turn.failed"):
                    err = json.dumps(ev)[:300]
            imgs = sorted((CODEX_IMAGES / thread).glob("*.png"), key=lambda f: f.stat().st_mtime) if thread else []
            if imgs:
                shutil.copyfile(imgs[-1], out)
                print(f"  {out.name}: codex thread {thread}", flush=True)
                return None
            err = err or f"no image (exit {p.returncode}): {p.stderr[-300:]}"
        return err


def openrouter_one(job, spec, out):
    refs = []
    for i in job.get("refs", []):
        data = base64.b64encode(ref_source(i)[0].read_bytes()).decode()
        refs.append({"type": "image_url", "image_url": {"url": f"data:image/webp;base64,{data}"}})
    body = {
        "model": spec["model"],
        "prompt": spec["style"] + "\n\n" + job["prompt"],
        "aspect_ratio": job.get("aspect", "1:1"),
        "quality": job.get("quality", spec.get("quality", "high")),
        "n": 1,
    }
    if refs:
        body["input_references"] = refs
    err = ""
    for _ in range(3):
        r = requests.post(API, headers={"Authorization": f"Bearer {key()}"}, json=body, timeout=900)
        if r.ok:
            d = r.json()
            if d.get("data"):
                out.write_bytes(base64.b64decode(d["data"][0]["b64_json"]))
                print(f"  {out.name}: ${d.get('usage', {}).get('cost', '?')}", flush=True)
                return None
            err = f"no image: {json.dumps(d)[:300]}"
        else:
            err = f"{r.status_code} {r.text[:300]}"
            if r.status_code in (400, 401, 402, 403):
                break
    return err


def run(job, spec, n, force):
    names = [job["name"]] + [f"{job['name']}-{i}" for i in range(2, n + 1)]
    done = 0
    for nm in names:
        out = OUT / f"{nm}.png"
        if out.exists() and not force:
            continue
        err = (codex_one if spec.get("provider", "codex") == "codex" else openrouter_one)(job, spec, out)
        if err:
            return f"FAIL {nm}: {err}"
        done += 1
    return f"ok {job['name']} ({done} new)"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec")
    ap.add_argument("--only", default="")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--n", type=int, default=1)
    ap.add_argument("--jobs", type=int, default=3, help="parallel generations")
    a = ap.parse_args()
    spec = json.loads(Path(a.spec).read_text())
    only = set(filter(None, a.only.split(",")))
    jobs = [j for j in spec["jobs"] if not only or j["name"] in only]
    OUT.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(a.jobs) as ex:
        results = []
        for line in ex.map(lambda j: run(j, spec, a.n, a.force), jobs):
            print(line, flush=True)
            results.append(line)
    if any(l.startswith("FAIL") for l in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
