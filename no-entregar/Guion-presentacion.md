Guion:

Creo que la presentacion la deberíamos estructurar por partes.
1. Ángel: Presentación, introducción. Descarga de los datos. Análisis inicial.
2. Sara: P1
3. Javi: P2 y conclusión.

Guion de Ángel:

1. Hola
2. Índice
3. Introducción.
	1. Resumen (Abstract)
4. Descarga de datos RAW
	1. Análisis. `head()`, tipos de variables (y los potenciales problemas), variables que nos interesan y las que no, NAs.
		1. NAs problematicos: Area y densidad de barrios y distritos
		2. hay un barrio sin un coddistbar unico
5. Dataset tidy
	1. Transportes
		1. Qué variables extraemos
		2. Uso de pivot_longer para tidiear
		3. head() final y algunas estadisticas, por completitud (n paradas de cada transporte)
	2. Pob
		1. El problema de los excel. Datos no estructurados, aunque sí con la misma estructura. Uso de la IA. Qué variables extraemos.
		2. Explicación del barrio raro. Unificacion del coddistbar
	3. `head()` del dataset final (transportes y pob)
6. Exploración inicial de los datos
	1. Mapa de todas las paradas
	2. Acotamos el estudio a los barrios donde "alcanza" Valenbisi. Nos quedamos solo con los barrios que SÍ tienen valenbisi.
		1. Aquí NO mencionamos el umbal
		2. Se han eliminado, básicamente, los distritos de Poblats del Sud y Poblats del Nord. 
		3. Curiosamente, también hay un pequeño barrio en medio de valencia, el barrio del Pilar, que no tiene Valenbisi.
		4. 

TO DO:
- [ ] Quitar las cursivas de los nombres de las empresas
