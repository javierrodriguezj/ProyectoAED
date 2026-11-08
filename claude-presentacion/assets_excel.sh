#!/usr/bin/env bash
# Genera las capturas de los Excel del padrón usadas en las diapositivas 8 y 9.
# Requiere LibreOffice (soffice), poppler (pdftoppm) e ImageMagick (magick).
set -euo pipefail
cd "$(dirname "$0")"
TMP=$(mktemp -d)
cp ../data/barrios/Distrito_1_Barrio_1.xlsx ../data/barrios/Distrito_11_Barrio_0.xlsx "$TMP"/
# Cada hoja en una sola página (así la hoja «Padron» sale entera)
OPT='pdf:calc_pdf_Export:{"SinglePageSheets":{"type":"boolean","value":"true"}}'
soffice --headless --convert-to "$OPT" --outdir "$TMP" "$TMP"/Distrito_1_Barrio_1.xlsx "$TMP"/Distrito_11_Barrio_0.xlsx >/dev/null
pdftoppm -png -r 110 -f 1 -l 1 "$TMP"/Distrito_1_Barrio_1.pdf "$TMP"/seu
pdftoppm -png -r 110 -f 1 -l 1 "$TMP"/Distrito_11_Barrio_0.pdf "$TMP"/port
SEU=$(ls "$TMP"/seu*.png); PORT=$(ls "$TMP"/port*.png)
mkdir -p assets
# Hoja completa en miniatura, con el tramo ampliado marcado
magick "$SEU" -resize 360x -fill "#F28C2833" -stroke "#F28C28" -strokewidth 4 -draw "rectangle 2,2 240,212" -bordercolor "#C9D2DA" -border 2 assets/excel_hoja_completa.png
# Primer tramo de la hoja, con la tabla 1.2 recuadrada
magick "$SEU" -crop 1300x1150+0+0 +repage -fill none -stroke "#F28C28" -strokewidth 7 -draw "rectangle 3,366 642,424" -bordercolor "#C9D2DA" -border 2 assets/excel_zoom.png
# Tabla 1.2 de La Seu y del Port: cabecera buscada (azul) y valor leído (naranja)
magick "$SEU" -crop 790x130+0+300 +repage -fill none -strokewidth 5 -stroke "#0F2C3F" -draw "rectangle 519,73 640,97" -stroke "#F28C28" -draw "rectangle 2,96 399,120" -bordercolor "#C9D2DA" -border 2 assets/excel_seu_12.png
magick "$PORT" -crop 790x130+0+205 +repage -background white -extent 790x130 -fill none -strokewidth 5 -stroke "#0F2C3F" -draw "rectangle 239,76 661,100" -stroke "#F28C28" -draw "rectangle 2,99 120,123" -bordercolor "#C9D2DA" -border 2 assets/excel_port_12.png
rm -rf "$TMP"
echo "Capturas de Excel generadas en assets/"
