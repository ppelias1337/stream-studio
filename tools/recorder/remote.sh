#!/bin/bash
# Record a demo on the gaming PC so this PC stays usable:  bash tools/recorder/remote.sh demo-rot.js
# Runs at 1/4 speed (the gaming PC captures ~29 fps, so 1/4 still gives >80 fps of content in the heaviest draw).
# SLOW=8 bash tools/recorder/remote.sh ...  for a heavier scene; check list-<name>.txt for gaps if unsure.
# Copies the app (server, public, logos, data) and the recorder over, runs the script there,
# and brings the finished mp4s back into renders/ (sort them into the partner folder there). Same paths on both PCs (C:\Users\elias\Stream_Studio).
set -e
HOST=elias@EliasDator
cd "$(dirname "$0")/../.."
tar -cf - server public logos data package.json tools/recorder/*.js tools/recorder/package*.json \
  | ssh -q $HOST '(if not exist C:\Users\elias\Stream_Studio mkdir C:\Users\elias\Stream_Studio) & tar -xf - -C C:/Users/elias/Stream_Studio'
ssh -q $HOST "cd /d C:\\Users\\elias\\Stream_Studio\\tools\\recorder & (if exist out rmdir /s /q out) & (if not exist node_modules call npm ci --silent) & set REC_SLOW=${SLOW:-4}& node $1"
scp -q "$HOST:Stream_Studio/tools/recorder/out/*.mp4" renders/
echo "done: $(ls -t renders/*.mp4 | head -1)"
