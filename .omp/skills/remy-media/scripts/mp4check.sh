#!/usr/bin/env bash
# Verify a rendered MP4 (not the runtime): stream facts, a motion strip and per-band audio levels.
#   mp4check.sh <file.mp4> [start=0] [seconds=4]
# Writes <file>.strip.png: 16 frames at 4 fps from [start, start+seconds), 480×270 each, 4×4.
# Prints mean/peak volume of the full mix and of three bands: <150 Hz (bass/kick), 150–1000 Hz (body),
# 1000–5000 Hz (leads/presence). Healthy chip mix: the low band is NOT the loudest by more than ~3 dB
# and 1–5 kHz is within ~6 dB of the low band. If the low band dominates, cut triangle/kick gain.
set -euo pipefail
f=${1:?mp4}; ss=${2:-0}; len=${3:-4}
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate,nb_frames -of compact=p=0 "$f"
fps=$(awk -v l="$len" 'BEGIN{printf "%.4f", 16/l}')
ffmpeg -v error -y -ss "$ss" -t "$len" -i "$f" -vf "fps=$fps,scale=480:270,tile=4x4" -frames:v 1 -update 1 "${f%.mp4}.strip.png"
echo "strip: ${f%.mp4}.strip.png"
band() {
  ffmpeg -nostats -hide_banner -i "$f" -vn -af "$2,volumedetect" -f null - 2>&1 | awk -v n="$1" '/mean_volume/{m=$5} /max_volume/{p=$5} END{printf "%-10s mean %6s dB  peak %6s dB\n", n, m, p}'
}
band full anull
band '<150' lowpass=f=150
band 150-1k 'highpass=f=150,lowpass=f=1000'
band 1k-5k 'highpass=f=1000,lowpass=f=5000'
