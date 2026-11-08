#!/usr/bin/env bash
# Recorta márgenes blancos de las figuras y añade un borde uniforme (ejecutar tras figuras.R)
cd "$(dirname "$0")/figuras"
for f in *.png; do
  if [ "$f" = "portada_hex.png" ]; then
    magick "$f" -trim +repage -bordercolor none -border 24 "$f"
  else
    magick "$f" -background white -alpha remove -alpha off -trim +repage -bordercolor white -border 24 "$f"
  fi
done
