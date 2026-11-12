#!/bin/sh
# Renders the logo rasters: icon.svg into site/app/icon.png, then that tile over the old one in banner.png.
# Usage: CHROME=/path/to/chrome .github/media/render.sh (needs ffmpeg).
set -e
cd "$(dirname "$0")"
"$CHROME" --headless --no-sandbox --hide-scrollbars --default-background-color=00000000 \
  --window-size=512,512 --screenshot="$PWD/../../site/app/icon.png" "file://$PWD/icon.svg"
ffmpeg -loglevel error -y -i banner.png -i ../../site/app/icon.png \
  -filter_complex "[1]scale=48:48:flags=lanczos[tile];[0]drawbox=92:94:48:48:0xfbfaf7:fill[bg];[bg][tile]overlay=92:94" \
  -pix_fmt rgb24 -frames:v 1 -update 1 next.png
mv next.png banner.png
