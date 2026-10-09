#!/bin/bash
# Render a motion piece on the gaming PC so this PC stays usable:  bash tools/motion/remote.sh zb-teaser-3d
# STILLS=1.2,3 BG=renders/motion/stream-bg.png bash tools/motion/remote.sh <name>   → just those stills (see render.js)
# Copies tools/motion, the art under public/comp and the recorder's playwright over, renders there, and brings
# renders/motion/<name>* back. Same paths on both PCs (C:\Users\elias\Stream_Studio), like tools/recorder/remote.sh.
set -e
HOST=elias@EliasDator; NAME=$1
cd "$(dirname "$0")/../.."
tar -cf - tools/motion public/comp tools/recorder/package*.json $( [ -n "$BG" ] && echo "$BG" ) \
  | ssh -q $HOST '(if not exist C:\Users\elias\Stream_Studio mkdir C:\Users\elias\Stream_Studio) & tar -xf - -C C:/Users/elias/Stream_Studio'
ssh -q $HOST "cd /d C:\\Users\\elias\\Stream_Studio & (if exist renders\\motion\\$NAME* del /q renders\\motion\\$NAME*) & (if not exist tools\\recorder\\node_modules (cd tools\\recorder & call npm ci --silent & cd ..\\..)) & set STILLS=$STILLS& set BG=$BG& node tools/motion/render.js $NAME"
mkdir -p renders/motion
scp -q "$HOST:Stream_Studio/renders/motion/$NAME*" renders/motion/
ls -t renders/motion/$NAME* | head -8
