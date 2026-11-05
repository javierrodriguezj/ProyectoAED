### Preguntas a responder que he pensado (Javi):

1.  Oferta, Demanda y Capacidad Ciclista • ¿Existe correspondencia entre la tipología de aparcamiento y el número de plazas? Analizar la distribución del número de plazas por punto de estacionamiento (plazas), identificando zonas con alta atomización (muchos puntos de pocas plazas) frente a zonas con macroaparcamientos. • ¿Dónde se concentran los "desiertos" de estacionamiento ciclista? Calcular la distancia euclídea o de red de cada barrio/sección censal al aparcamiento de bicicletas más cercano para detectar bolsas urbanas desatendidas. • ¿Cómo interactúan los aparcamientos públicos en horquilla/U invertida con las estaciones de Valenbisi? Evaluar si la infraestructura para bicicleta privada complementa a las estaciones de bicicleta compartida o si compiten en las mismas localizaciones centrales dejando la periferia desabastecida.

2.  Intermodalidad con el Transporte Público (EMT y Metro) • ¿Qué paradas de autobús (EMT) o estaciones de metro actúan como nodos intermodales reales? Calcular mediante buffers de proximidad (por ejemplo, radios caminables de 50 a 100 metros) qué porcentaje de paradas de autobús disponen de aparcamiento de bicis en su entorno inmediato.

    • ¿Las líneas de EMT con mayor demanda cuentan con suficiente infraestructura ciclista en sus cabeceras y nodos clave? Identificar puntos críticos de conexión periférica donde los usuarios podrían cambiar de la bicicleta al autobús urbano.

3.  Conexión con la Infraestructura Ciclista (Carril Bici) • ¿Están los aparcamientos ubicados a lo largo de la red de itinerarios ciclistas o exigen circular por calzada/acera?

    Calcular la distancia de cada aparcamiento al eje de carril bici más próximo para detectar paradas aisladas que carecen de acceso seguro. • ¿Cuál es la densidad de aparcamientos por kilómetro de carril bici en los distintos distritos?

4.  Relación Sociodemográfica y Territorial (Barrios y Población) • ¿Existe equidad espacial en el ratio de plazas de bici por habitante? Cruzar los límites de distritos/barrios y el padrón de habitantes para calcular: $$\text{Ratio} = \frac{\text{Plazas de aparcamiento de bicis}}{\text{Población total o población joven (16-35 años)}}$$

    • ¿Se correlaciona la densidad de aparcamientos con la renta media o la densidad poblacional? Verificar si los barrios con mayor densidad residencial o menor renta disponen de una proporción equivalente de infraestructura ciclista frente al centro histórico y zonas turísticas/comerciales.

5.  Puntos de Interés (Equipamientos Públicos) • ¿Tienen los centros educativos (universidades, institutos) y centros sanitarios suficiente cobertura de plazas? Medir la concentración de plazas disponibles en un radio de 200 m de campus universitarios (Tarongers, Blasco Ibáñez, Burjassot/UPV) y hospitales frente a zonas puramente residenciales.

# URL's

- EMT: <https://opendata.vlci.valencia.es/dataset/emt>
- FGV (estaciones): <https://opendata.vlci.valencia.es/dataset/fgv-estacions-estaciones>
- FGV (bocas): <https://opendata.vlci.valencia.es/dataset/fgv-bocas>
- Parking bicis: <https://opendata.vlci.valencia.es/dataset/aparcaments-bicicletes-aparcamientos-bicicletas>
- Valenbisi: <https://opendata.vlci.valencia.es/dataset/valenbisi-disponibilitat-valenbisi-dsiponibilidad>
- Población + otros muchos datos: <https://www.valencia.es/estadistica/inf_dtba/2026/Barrios2026.zip>
- Vulnerabilidad socioeconómica : <https://opendata.vlci.valencia.es/dataset/vulnerabilidad-por-barrios>

# Deprecated:

Valenbisi: <https://opendata.vlci.valencia.es/dataset/valenbisi-disponibilitat-valenbisi-dsiponibilidad>

EMT: <https://opendata.vlci.valencia.es/dataset/emt>

FGV:

Estaciones: <https://opendata.vlci.valencia.es/dataset/fgv-estacions-estaciones>

[NO DESCARGADO DE MOMENTO] Bocas: <https://opendata.vlci.valencia.es/dataset/fgv-bocas>

Vulnerabilidad económica: <https://opendata.vlci.valencia.es/dataset/vulnerabilidad-por-barrios>

Geometría barrios: <https://opendata.vlci.valencia.es/dataset/barris-barrios>

Geometría distritos: <https://opendata.vlci.valencia.es/dataset/districtes-distritos>

Consistent data

En la sección anterior hemos aprovechado para realizar este tipo de transformaciones ya. Por ejemplo, df.vulnerab_eco no era tidy y ha sido reestructurada mediante funciones como pivot_longer() ya que contenía variables en los nombres de las columnas. Otros tipos de transformaciones como renombramientos o reordenaciones también han sido aplciadas para mantener la consistencia con una misma estructura de datos.

# Código deprecated:

# Vulnerabilidad económica

filepath \<- paste0(savedir, 'vulnerab_eco.geojson') data \<- st_read(dsn = '<https://opendata.vlci.valencia.es/dataset/ca18278b-d040-4274-b9c7-c1a9daae54b9/resource/fd2ca0dc-5344-4aad-8934-2077a0bb120d/download/vulnerabilidad-por-barrios.geojson>', quiet = TRUE) if (!file.exists(filepath)) st_write(data, filepath, delete_dsn = TRUE)

df.vulnerab_eco \<- st_read(paste0(savedir, 'vulnerab_eco.geojson'), quiet = TRUE)

df.valenbisi \<- df.valenbisi \|\> mutate(open=as.logical(open), ticket=as.logical(ticket), updated_at=dmy_hms(updated_at, tz='Europe/Madrid'))

df.emt \<- df.emt \|\> mutate(suprimida=as.logical(suprimida), lineas = strsplit(lineas, ","))

df.fgv_paradas \<- df.fgv_paradas \|\> mutate(codigo=as.integer(codigo), tipo=as.logical(tipo), lineas = strsplit(linea, ","), .keep="unused") \|\> relocate(lineas, .before = proximas_llegadas) \|\> rename(proximas_llegadas_es = proximas_llegadas, proximas_llegadas_val = proximes_llegadas)

df.vulnerab_eco \<- df.vulnerab_eco \|\> pivot_longer(cols = matches("\^(ind\|vul)\_"), names_to = c(".value", "categoria"), names_pattern = "\^(.\*)\_(.\*)\$") \|\> rename(indice=ind, vulnerabilidad=vul) \|\> mutate( lon = as.numeric(str_extract(geo_point_2d, "(?\<="lon":\\s)-?[0-9\\.]+")), lat = as.numeric(str_extract(geo_point_2d, "(?\<="lat":\\s)-?[0-9\\.]+")), vulnerabilidad=factor(vulnerabilidad, levels=c("Vulnerabilidad Baja", "Vulnerabilidad Media", "Vulnerabilidad Alta"), ordered=T) ) \|\> relocate(c("lon", "lat"), .before=geo_point_2d) \|\> select(-geo_point_2d)

# Guardamos el dataset. No obstante, no se pueden guardar las dos geometrías en la misma tabla fácilente. Así que solo guardaremos la de los barrios primero.

filepath \<- paste0(savedir, "poblacion_geom_barrios.geojson") barrios_geometria \<- df.pob \|\> select(geom_barrio) suppressWarnings(st_write(barrios_geometria, filepath, delete_dsn = TRUE))

# Ahora guardaremos todo, con ambas geometrías. Debemos separar las geometrías en capas. El problema es que el archivo está encriptado, por eso preferimos guardar el dataset en .geojson también.

filepath \<- paste0(savedir, "poblacion.gpkg")

barrios_limpio \<- df.pob \|\> select(-geom_distrito) suppressWarnings(st_write(barrios_limpio, filepath, layer = "barrios", delete_dsn = TRUE))

distritos_unicos \<- df.pob \|\> st_drop_geometry() \|\> select(coddistrit, nombre_distrito, geom_distrito) \|\> distinct() \|\> st_set_geometry("geom_distrito") \|\> st_cast("MULTIPOLYGON") suppressWarnings(st_write(distritos_unicos, filepath, layer = "distritos", delete_layer = TRUE))

df.geom_barrios \<- NULL; df.geom_distritos \<- NULL; barrios_geometria \<- NULL; barrios_limpio \<- NULL; distritos_unicos \<- NULL; geom_distritos \<- NULL
