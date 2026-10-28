# Proyecto de AED

Autores: Sara, Ángel, Javier

# Estructura del repositorio

```         
.
├── brainstorming.md                # Anotamos ideas
├── data                            # Datos (gitignored)
│   ├── Barrios2026.zip
│   └── densidad_barrios_2025.csv
├── EnlaceRepo.txt
├── ProyectoAED.Rproj
├── pruebas
│   ├── angel.Rmd
│   ├── javi.Rmd
│   └── sara.Rmd
├── README.md
├── ReportFinal                     # Documento final en limpio
│   ├── appendix.tex
│   ├── Definitions
│   ├── mybibfile.bib
│   ├── ProyectoAED_Rmd.log
│   ├── ProyectoAED_Rmd.pdf
│   ├── ProyectoAED_Rmd.Rmd
│   └── ProyectoAED_Rmd.tex
├── temp                            # Archivos temporales
│   └── test_Data.Rmd
```

- `data/`: Los datos se descargarán automáticamente al ejecutar el código.
- `pruebas/`: Archivos donde cada uno de nosotros hacemos nuestras pruebas antes de escribir directamente en el report final.
- `ReportFinal/`: Carpeta generata por el *template*, donde está el .Rmd definitivo con todo nuestro código y que compilaremos como .pdf.
- `temp`: Cualquier cosa que necesitemos conservar y compartir con el resto del grupo que hayamos hecho en sucio.

# Workflow

En `pruebas/`, cada uno tiene su propio .Rmd donde podemos hacer nuestras pruebas y ponerlas en común, antes de escribir directamente sobre el documento final. Estos .Rmd no están estrictamente "bloqueados" a cada uno de nosotros; Ángel puede editar `javi.md` si lo ve necesario y a Javi le parece bien.

De esta manera, evitaremos _merge conflicts_ innecesarios. También mantendremos un flujo de trabajo más limpio y ordenado.

# Statement sobre el uso de IA

NO MANDÉIS A VUESTROS COMPAÑEROS A LEER LA BULLSHIT QUE OS HA GENERADO LA IA. EL TIEMPO DE LOS DEMÁS ES TAN IMPORTANTE COMO EL VUESTRO.