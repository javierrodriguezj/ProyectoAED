# Presentación del proyecto AED

`ProyectoAED_presentacion.pptx` es la presentación de clase (30 diapositivas, 16:9, en español): 26 principales para los 20 minutos de exposición y 4 de anexo para el turno de preguntas. Cada diapositiva lleva un guion breve en las notas del orador.

## Abrir y compartir

- **LibreOffice Impress / PowerPoint / Keynote**: abrir el `.pptx` directamente.
- **Google Presentaciones**: en Google Drive, *Nuevo → Subir archivo* y después *Abrir con → Presentaciones de Google* (o *Archivo → Importar diapositivas* desde una presentación vacía). Se conservan formas, tablas, imágenes, notas del orador y los diseños (*layouts*).
- Solo se usan las fuentes Arial y Courier New (en Linux se sustituyen por Liberation Sans/Mono, con las mismas medidas).

## Regenerar

Desde esta carpeta, con los datos ya descargados en `../data/` (los descarga el Rmd del informe):

```bash
npm install                 # pptxgenjs, react-icons, sharp (solo la primera vez)
Rscript figuras.R           # figuras en ./figuras y cifras en ./datos
./figuras_recortar.sh       # recorta márgenes de las figuras
./assets_excel.sh           # capturas de los Excel del padrón (requiere LibreOffice)
node build_presentacion.js  # genera ProyectoAED_presentacion.pptx
```

| Fichero | Contenido |
|---|---|
| `figuras.R` | Reproduce el pipeline del Rmd y exporta las 6 figuras del informe en formato diapositiva, más 5 nuevas (`extra_*`, `anexo_*`, `portada_hex`) |
| `datos/` | Cifras calculadas por `figuras.R` que se escriben en las diapositivas (correlación, coberturas, rankings…) |
| `assets/` | Capturas de los Excel del padrón (La Seu y el Port) |
| `build_presentacion.js` | Genera el `.pptx` (tema, layouts y contenido de cada diapositiva) |
| `tools/apply_theme.js` | Escribe la paleta de colores en el tema del `.pptx` |
