#!/usr/bin/env bash
# Stills → montage, in one step. Run from the repo root.
#   st.sh <film> <t1,t2,...> [cols=3]
# Wipes output/<film>/stills first (old PNGs would otherwise mix into the montage), renders the stills with
# FILMKIT_DEBUG=1 (so a JS error prints its stack instead of a bare message), and tiles them, in time order,
# into output/<film>/montage.png at 640 px per tile. Then READ output/<film>/montage.png.
set -euo pipefail
film=${1:?film}; times=${2:?times e.g. 0.5,2,4.2}; cols=${3:-3}
dir=output/$film/stills
rm -rf "$dir"
FILMKIT_DEBUG=1 filmkit stills "$film" "$times"
n=$(find "$dir" -name '*.png' | wc -l | tr -d ' ')
rows=$(( (n + cols - 1) / cols ))
ffmpeg -v error -y -pattern_type glob -i "$dir/*.png" -vf "scale=640:-1,tile=${cols}x${rows}" -frames:v 1 -update 1 "output/$film/montage.png"
echo "output/$film/montage.png  ($n stills, ${cols}x${rows})"
