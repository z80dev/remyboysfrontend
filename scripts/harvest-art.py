"""Remy's Harvest art: paints the game's source images with the local Codex CLI's image tool (ChatGPT subscription).

uv run -q python scripts/harvest-art.py [--only a,b] [--force] [--jobs 4]

Each job's prompt is STYLE + its own prompt; `refs` are Remy art indices (media/remy/Character<i>.webp) or paths of
earlier outputs (so a later scene can match an earlier one). Raw PNGs land in .cache/harvest-art/raw/<name>.png and
are skipped when present unless --force. `scripts/harvest-sprites.py` cuts and packs them into src/harvest/art/.
Codex is driven like scripts/meme/paint.py: `codex exec` with -i references, the image is collected from
~/.codex/generated_images/<thread id>/.
"""

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / ".cache" / "harvest-art" / "raw"
CODEX_IMAGES = Path.home() / ".codex" / "generated_images"
ORIENT = {"1:1": "square (1024x1024)", "3:2": "landscape (1536x1024)", "2:3": "portrait (1024x1536)"}

STYLE = (
    "Hand-painted gouache storybook illustration for a premium mobile game: visible brush strokes, soft textured "
    "watercolour-paper grain, confident dark ink linework, rich warm autumn palette (corn gold, terracotta, ochre, "
    "turquoise, cream, deep plum), painterly light and depth. Characters are 'Remy' chibi anime boys from the "
    "reference images: big round heads, large glossy anime eyes, thick dark eyebrows, small bodies; keep each "
    "reference's hair colour and style exactly. The Remys are all boys: t-shirts, hoodies, jeans or shorts, sneakers, "
    "never skirts or dresses. No feather headdresses, war paint or costume stereotypes."
)

SPRITE = (
    "Game sprite: the subject(s) on a fully transparent background (PNG alpha). If transparency is impossible, use a "
    "perfectly flat plain white background with no texture, no shadow, no ground and no border. Clean silhouette."
)

JOBS = [
    {
        "name": "bg-day",
        "aspect": "2:3",
        "refs": [],
        "prompt": "Vertical game background, no characters, no text. A golden-hour harvest landscape: a big open warm "
        "sky with soft glowing cumulus clouds and a low sun filling the upper 65% of the image (keep the sky calm and "
        "uncluttered so falling objects read clearly), distant red sandstone mesas and blue-violet hills on the horizon, "
        "rows of tall ripe corn stalks framing the left and right edges, a few autumn cottonwood trees. The bottom 16% "
        "of the image is a flat, smooth, sunlit packed-earth path running straight across the whole width.",
    },
    {
        "name": "hero",
        "aspect": "3:2",
        "refs": [42],
        "prompt": SPRITE + " Character sheet: the SAME red-haired Remy from the reference drawn three times side by "
        "side, full body from hair to sneakers, all facing the viewer, same size, generous empty space between them. "
        "He wears a plain teal t-shirt with no text, blue jeans and red sneakers. In poses 1 and 2 he holds a big round "
        "hand-woven harvest basket (natural reed weave, empty, open top visible) in front of his belly with both hands. "
        "Pose 1: standing, cheerful grin. Pose 2: dizzy and bonked, swirly eyes, little stars, wobbly. Pose 3: "
        "jumping and cheering with both arms up, basket held high over his head, ecstatic open-mouth smile.",
    },
    {
        "name": "items",
        "aspect": "3:2",
        "refs": [],
        "prompt": SPRITE + " Sprite sheet of six separate isolated objects in a 3 by 2 grid, each centred in its own "
        "cell with lots of empty space around it, all similar size, each one vertical and slightly tilted: (1) a ripe "
        "yellow ear of corn with green husks peeled back; (2) a radiant GOLDEN ear of corn glowing with warm light and "
        "tiny sparkles; (3) an heirloom glass-gem flint corn ear with jewel-like rainbow kernels (red, blue, purple, "
        "amber, teal) and pale husks; (4) a plump orange-and-green striped winter squash; (5) a bundle of three green "
        "bean pods tied with a tiny twine; (6) a dark burnt, rotten, mouldy corn ear with black smut, clearly bad.",
    },
    {
        "name": "cabald",
        "aspect": "1:1",
        "refs": [1217],
        "prompt": SPRITE + " Just the head of the completely bald Remy from the reference (shiny bald scalp, no hair at "
        "all), as a round floating cartoon villain head: sickly pale lime-green skin like a goofy cartoon zombie, "
        "furious scowl, gritted teeth, one vein on the forehead, a faint toxic green glow around the edge. Centered, "
        "filling most of the image.",
    },
    {
        "name": "card",
        "aspect": "1:1",
        "refs": [42, 127, 114],
        "prompt": "Game key art poster. Golden-hour cornfield under a glowing sky with red mesas on the horizon. Centre: "
        "the red-haired Remy (first reference, plain teal t-shirt) leaps joyfully with a big woven harvest basket, "
        "catching ears of golden corn that rain down from the sky; a glowing golden corn and a rainbow glass-gem corn "
        "among them, a squash and bean pods tumbling too. The blond Remy and the blue-haired Remy cheer in the "
        "background corn rows. Across the top, large hand-lettered warm cream title text with a dark outline reading "
        "exactly REMY'S HARVEST, and beneath it smaller text reading exactly Happy Indigenous Peoples' Day. Spell "
        "every word exactly as given.",
    },
    {
        "name": "bg-night",
        "aspect": "2:3",
        "refs": ["bg-day"],
        "prompt": "Repaint the attached background as the SAME scene with the SAME composition, framing, trees, corn "
        "rows, mesas, fence and path in exactly the same places, but at night under a huge glowing golden-orange "
        "harvest full moon low over the mesas: deep indigo-to-violet sky full of soft stars and a faint milky way, "
        "moonlit silver-blue clouds, cool blue moonlight on the corn and path, a few warm fireflies. No characters, "
        "no text. Keep the sky calm and uncluttered.",
    },
]


def remy_png(ref, tmp):
    if isinstance(ref, int):
        src = ROOT / "media" / "remy" / f"Character{ref}.webp"
        png = Path(tmp) / f"remy{ref}.png"
        subprocess.run(["sips", "-s", "format", "png", str(src), "--out", str(png)], check=True, capture_output=True)
        return png
    return RAW / f"{ref}.png"


def paint(job, force):
    out = RAW / f"{job['name']}.png"
    if out.exists() and not force:
        return f"{out.name}: exists"
    prompt = (
        "Use your image generation tool exactly once to create the image described below, at the highest quality, "
        f"{ORIENT[job['aspect']]}. Attached images are references only (copy the characters, not their photo "
        "backgrounds). Do not create or edit any files yourself. When the image is generated, reply with just: done\n\n"
        + STYLE + "\n\n" + job["prompt"]
    )
    with tempfile.TemporaryDirectory() as tmp:
        refs = []
        for r in job["refs"]:
            refs += ["-i", str(remy_png(r, tmp))]
        cmd = ["codex", "exec", "--skip-git-repo-check", "--json", "-s", "read-only", "-C", tmp,
               "-m", "gpt-6-luna", "-c", "service_tier=default", *refs, "-"]
        err = ""
        for _ in range(2):
            p = subprocess.run(cmd, input=prompt, capture_output=True, text=True, timeout=1500)
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
                return f"{out.name}: codex thread {thread}"
            err = err or f"no image (exit {p.returncode}): {p.stderr[-300:]}"
        return f"{out.name}: FAILED {err}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--jobs", type=int, default=4)
    a = ap.parse_args()
    RAW.mkdir(parents=True, exist_ok=True)
    only = set(filter(None, a.only.split(",")))
    jobs = [j for j in JOBS if not only or j["name"] in only]
    with ThreadPoolExecutor(a.jobs) as pool:
        msgs = list(pool.map(lambda j: paint(j, a.force), jobs))
    print("\n".join(msgs), flush=True)
    if any("FAILED" in m for m in msgs):
        sys.exit(1)


if __name__ == "__main__":
    main()
