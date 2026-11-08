# =============================================================================
# Figuras para la presentación (formato diapositiva 16:9)
# Reproduce el pipeline de ReportFinal/ProyectoAED.Rmd y guarda PNG en ./figuras
# Ejecutar desde la carpeta claude-presentacion:  Rscript figuras.R
# =============================================================================
suppressPackageStartupMessages({
  library(sf); library(readxl); library(dplyr); library(tidyr); library(stringr)
  library(ggplot2); library(patchwork); library(ggrepel); library(scales)
})
sf_use_s2(TRUE)

dir.create("figuras", showWarnings = FALSE)
dir.create("datos", showWarnings = FALSE)
savedir <- "../data/"

# ---- Constantes (idénticas al Rmd) -------------------------------------------
CRS_M        <- 25830
COL_MODO     <- c(Valenbisi = "#2a78d6", EMT = "#E2001A", FGV = "#FCD116")
BUFFER_BORDE <- 1000
UMBRAL       <- c(Valenbisi = 250, EMT = 250, FGV = 250)
HEX_M        <- 50

# Tema base legible en proyector
BASE <- 15
guardar <- function(p, nombre, w, h, dpi = 220) {
  ggsave(file.path("figuras", nombre), p, width = w, height = h, dpi = dpi,
         bg = "white", device = png, type = "cairo")
  cat("  ->", nombre, "\n")
}

titulo <- function(x) { x <- str_to_title(x)
  for (w in c("De", "Del", "Les", "La", "I", "Els")) x <- gsub(paste0(" ", w, " "), paste0(" ", tolower(w), " "), x)
  gsub("L'h", "L'H", gsub("L'a", "L'A", gsub("L'i", "L'I", x))) }
# ---- Funciones (idénticas al Rmd) --------------------------------------------
dist_min <- function(origen, destino) {
  idx <- st_nearest_feature(origen, destino)
  as.numeric(st_distance(origen, destino[idx, ], by_element = TRUE))
}
leer_excels <- function(r) {
  h <- read_excel(r, "Padron", col_names=F, col_types="list", .name_repair="minimal")
  b <- basename(r); p <- NA_real_; u <- as.integer(regmatches(b, gregexpr("\\d+", b))[[1]])
  c <- which(!is.na(g <- sapply(h, function(x) grep("^\\s*Densidad de poblaci", x)[1])))[1]
  if(is.na(c)) warning("No se encontró la cabecera de densidad en ", b) else {
    f <- g[c]+1; c <- c-2
    if(c>0 && f<=nrow(h) && length(v <- h[[c]][[f]])) p <- suppressWarnings(as.numeric(v))
  }
  data.frame(coddistrit=u[1], codbar=u[2], nombre_barrio=sub(".*Barrio\\s+\\d+\\.\\d+\\.\\s*", "", as.character(h[[1]][[1]])), personas=p, stringsAsFactors=F)
}

# ---- Datos crudos ------------------------------------------------------------
raw <- list(
  Valenbisi = st_read(paste0(savedir, "valenbisi.geojson"),      quiet = TRUE),
  EMT       = st_read(paste0(savedir, "emt.geojson"),            quiet = TRUE),
  FGV       = st_read(paste0(savedir, "fgv_paradas.geojson"),    quiet = TRUE),
  Barrios   = st_read(paste0(savedir, "geom_barrios.geojson"),   quiet = TRUE),
  Distritos = st_read(paste0(savedir, "geom_distritos.geojson"), quiet = TRUE)
)

# Resumen de los datasets crudos (para tabla del anexo)
resumen <- bind_rows(lapply(names(raw), function(n) {
  d <- raw[[n]]
  data.frame(dataset = n, filas = nrow(d), columnas = ncol(d),
             geometria = as.character(st_geometry_type(d, by_geometry = FALSE)),
             nas = sum(is.na(st_drop_geometry(d))),
             columnas_con_na = paste(names(which(colSums(is.na(st_drop_geometry(d))) > 0)), collapse = ", "),
             nombres = paste(setdiff(names(d), attr(d, "sf_column")), collapse = ", "))
}))
write.csv(resumen, "datos/resumen_crudos.csv", row.names = FALSE)

df.valenbisi   <- raw$Valenbisi %>% st_transform(CRS_M)
df.emt         <- raw$EMT       %>% st_transform(CRS_M)
df.fgv_paradas <- raw$FGV       %>% st_transform(CRS_M)

df.transporte <- bind_rows(
  df.valenbisi   %>% transmute(gid=as.integer(gid), empresa="Valenbisi", lineas=as.list((number))),
  df.emt         %>% transmute(gid=as.integer(gid), empresa="EMT", lineas=strsplit(lineas, ",")),
  df.fgv_paradas %>% transmute(gid=as.integer(gid), empresa="FGV", lineas=strsplit(linea, ",")),
) %>% rename(geometria=geometry) %>% mutate(empresa=as.factor(empresa))

# head(df.transporte) para tabla: una fila de cada empresa
fmt_lineas <- function(l) sapply(l, function(x) paste(head(x, 4), collapse = ", "))
fmt_pt <- function(g) { xy <- st_coordinates(g); sprintf("(%.1f, %.1f)", xy[,1], xy[,2]) }
muestra_tr <- df.transporte %>% group_by(empresa) %>% slice(1:2) %>% ungroup()
write.csv(data.frame(gid = muestra_tr$gid, empresa = as.character(muestra_tr$empresa),
                     lineas = fmt_lineas(muestra_tr$lineas), geometria = fmt_pt(muestra_tr$geometria)),
          "datos/head_transporte.csv", row.names = FALSE)
write.csv(as.data.frame(table(df.transporte$empresa)), "datos/n_transporte.csv", row.names = FALSE)

# ---- Barrios + padrón --------------------------------------------------------
df.geom_barrios_raw <- raw$Barrios %>% st_transform(CRS_M)
df.geom_barrios <- df.geom_barrios_raw %>%
  select(-objectid) %>%
  group_by(coddistbar, codbarrio, coddistrit) %>%
  summarise(nombre = paste(nombre, collapse = "-"),
            gis.gis.BARRIOS.area = sum(gis.gis.BARRIOS.area, na.rm = TRUE), .groups = "drop")

folder <- paste0(savedir, "barrios/")
if (!dir.exists(folder)) unzip(paste0(savedir, "barrios.zip"), exdir = folder)
archivos <- list.files(folder, pattern = "^Distrito_\\d+_Barrio_\\d+\\.xlsx$", full.names = TRUE)
df.info_excels <- do.call(rbind, lapply(archivos, leer_excels)) %>% arrange(coddistrit, codbar)
rownames(df.info_excels) <- NULL
cat("Excels leídos:", length(archivos), " | NA personas:", sum(is.na(df.info_excels$personas)), "\n")

unidades_factor <- 1e-4 # ha
df.pob <- df.geom_barrios %>% mutate(
  id = as.integer(coddistbar),
  superficie = as.numeric(st_area(geometry)) * unidades_factor
) %>% rename(geometria = geometry) %>% select(id, nombre, superficie, geometria) %>%
  left_join(df.info_excels %>% mutate(id=as.integer(paste0(coddistrit, codbar))), by="id") %>%
  group_by(id) %>%
  summarise(nombre = paste(nombre, collapse = "-"), personas = first(personas),
            superficie = sum(superficie, na.rm = TRUE), densidad = personas/superficie)
df.pob_todos <- df.pob
write.csv(st_drop_geometry(df.pob) %>% head(6) %>% mutate(superficie = round(superficie, 1), densidad = round(densidad, 1)),
          "datos/head_pob.csv", row.names = FALSE)

# ---- Exploración: zonas con Valenbisi ----------------------------------------
zonas_con_valenbisi <- df.transporte %>% filter(empresa == "Valenbisi") %>%
  st_join(df.pob %>% select(id)) %>% pull(id) %>% unique() %>% sort()
df.zonas_mapa <- df.pob %>% mutate(is_dentro = id %in% zonas_con_valenbisi)
dominio <- df.pob %>% filter(id %in% zonas_con_valenbisi) %>% st_union()
zonas_unificadas <- st_buffer(dominio, BUFFER_BORDE)
caja <- st_bbox(zonas_unificadas)

plot_mapa_transporte <- function(df_distritos, zonas_unif=NULL, df_transp, bbox=NULL, colores=COL_MODO,
                                 fill_zones=T, draw_perimeter=T, size_pt=.45) {
  ggplot() +
    (if(fill_zones) list(geom_sf(data=df_distritos, aes(fill=is_dentro), col="grey75", linewidth=.25),
                         scale_fill_manual(values=c(`TRUE`="white", `FALSE`="grey92"), guide="none"))
     else geom_sf(data=df_distritos, fill="white", col="grey75", linewidth=.25)) +
    (if(draw_perimeter && !is.null(zonas_unif)) geom_sf(data=st_sf(geometry=zonas_unif), fill=NA, col="grey50", lty="dashed")) +
    geom_sf(data=df_transp, aes(col=empresa), size=size_pt, show.legend=F) +
    facet_wrap(~empresa) + scale_color_manual(values=colores) + theme_void(base_size = BASE + 3) +
    theme(strip.text=element_text(face="bold", hjust=0.5, margin = margin(b = 6))) +
    coord_sf(xlim=bbox[c("xmin","xmax")], ylim=bbox[c("ymin","ymax")], expand=T)
}

# Fig 1: redes completas
p1 <- plot_mapa_transporte(df.zonas_mapa, df_transp = df.transporte, bbox = NULL,
                           fill_zones = FALSE, draw_perimeter = FALSE, size_pt = .7)
guardar(p1, "fig1_redes_completas.png", 9.6, 6.4)

# Fig 2: zona de estudio
p2 <- plot_mapa_transporte(df.zonas_mapa, zonas_unificadas, df.transporte, caja, size_pt = .7)
guardar(p2, "fig2_zona_estudio.png", 12, 4.4)

df.pob_con_bicis <- df.pob %>% filter(id %in% zonas_con_valenbisi)
df.pob <- df.pob_con_bicis %>% bind_rows(df.pob %>% filter(nombre == "EL PILAR"))

# ---- Extra: barrio duplicado 17.5 -------------------------------------------
dup <- df.geom_barrios_raw %>% filter(coddistbar == coddistbar[duplicated(coddistbar)][1])
cat("Barrio duplicado:", unique(dup$coddistbar), paste(dup$nombre, collapse = " / "), "\n")
bb_dup <- st_bbox(st_buffer(st_union(dup), 4500))
p_dup <- ggplot() +
  geom_sf(data = df.geom_barrios_raw, fill = "grey95", col = "grey70", linewidth = .2) +
  geom_sf(data = dup %>% mutate(nombre = titulo(nombre)), aes(fill = nombre), col = "grey20", linewidth = .4) +
  scale_fill_manual(values = c("#F28C28", "#0F2C3F"), name = "Ambos con código 17.5") +
  coord_sf(xlim = bb_dup[c("xmin", "xmax")], ylim = bb_dup[c("ymin", "ymax")]) +
  theme_void(base_size = BASE + 2) + theme(legend.position = "bottom", legend.direction = "vertical",
                                           legend.title = element_text(face = "bold"))
guardar(p_dup, "extra_barrio_duplicado.png", 6, 6.6)

# ---- P1 ----------------------------------------------------------------------
emt_n_barrio <- st_join(df.emt, df.pob) %>% st_drop_geometry() %>% filter(!is.na(id)) %>% count(id, name = "n_emt")
metro_n_barrio <- st_join(df.fgv_paradas, df.pob) %>% st_drop_geometry() %>% filter(!is.na(id)) %>% count(id, name = "n_metro")
valenbisi_n_barrio <- st_join(df.valenbisi, df.pob) %>% st_drop_geometry() %>% filter(!is.na(id)) %>% count(id, name = "n_valenbisi")
datos_transporte_barrio <- df.pob %>% left_join(emt_n_barrio, by = "id") %>%
  left_join(metro_n_barrio, by = "id") %>% left_join(valenbisi_n_barrio, by = "id") %>%
  mutate(across(c(n_emt, n_metro, n_valenbisi), ~coalesce(.x,0)))

b <- element_blank()
tm <- theme_minimal(base_size = BASE) + theme(axis.text=b, axis.ticks=b, legend.position = "bottom",
                                             legend.key.width = unit(1.4, "cm"), legend.key.height = unit(.35, "cm"),
                                             plot.title = element_text(face = "bold", hjust = .5, size = BASE + 1),
                                             legend.title = element_text(vjust = .85))
d <- datos_transporte_barrio
p3 <- ggplot(df.pob)+geom_sf(aes(fill=personas))+scale_fill_gradient(low="#f0ebf6", high="#FF69B4")+tm+labs(title="Población por barrio", fill="Habitantes") +
  ggplot(d)+geom_sf(aes(fill=n_emt))+scale_fill_gradient(low="#fce6e8", high=COL_MODO[["EMT"]])+tm+labs(title="Paradas de EMT", fill="Nº paradas") +
  ggplot(d)+geom_sf(aes(fill=n_metro))+scale_fill_gradient(low="#fef8dc", high=COL_MODO[["FGV"]])+tm+labs(title="Paradas de Metrovalencia", fill="Nº paradas") +
  ggplot(d)+geom_sf(aes(fill=n_valenbisi))+scale_fill_gradient(low="#eaf2fb", high=COL_MODO[["Valenbisi"]], breaks=breaks_width(2))+tm+labs(title="Estaciones de Valenbisi", fill="Nº estaciones") +
  plot_layout(ncol=4)
guardar(p3, "fig3_p1_mapas.png", 16, 5.2)

d <- datos_transporte_barrio <- mutate(datos_transporte_barrio, transporte_total=n_emt+n_metro+n_valenbisi,
                                       ratio_transporte_persona=ifelse(densidad>0, transporte_total/personas, NA))
correlacion <- cor(d$personas, d$transporte_total, use="complete.obs")
cat("Correlación personas-transporte:", round(correlacion, 3), "\n")
tm2 <- tm + theme(panel.grid = b)
s <- scale_fill_gradient(low="white", high="purple")
p4 <- ggplot(d)+geom_sf(aes(fill=transporte_total))+s+tm2+labs(title="Transporte total por barrio", fill="Paradas") +
  ggplot(d)+geom_sf(aes(fill=ratio_transporte_persona*1000))+s+tm2+labs(title="Transporte respecto a la población", fill="Paradas por 1000 hab.") +
  plot_layout(ncol=2)
guardar(p4, "fig4_p1_total_ratio.png", 11, 6.2)

# Extra: dispersión habitantes vs transporte
dd <- st_drop_geometry(d) %>% filter(!is.na(personas))
mod <- lm(transporte_total ~ personas, data = dd)
dd$resid <- resid(mod)
etiq <- bind_rows(dd %>% slice_max(resid, n = 4), dd %>% slice_min(resid, n = 3))
p_sc <- ggplot(dd, aes(personas, transporte_total)) +
  geom_smooth(method = "lm", formula = y ~ x, col = "#0F2C3F", fill = "grey85", linewidth = .9) +
  geom_point(size = 2.6, col = "#F28C28", alpha = .85) +
  geom_point(data = etiq, size = 3.2, shape = 21, fill = "#F28C28", col = "#0F2C3F", stroke = 1) +
  geom_text_repel(data = etiq, aes(label = titulo(nombre)), size = 4.6, col = "#0F2C3F",
                  min.segment.length = 0, box.padding = .6, seed = 3) +
  scale_x_continuous(labels = label_number(big.mark = ".", decimal.mark = ",")) +
  labs(x = "Habitantes del barrio", y = "Puntos de transporte (EMT + FGV + Valenbisi)") +
  theme_minimal(base_size = BASE + 1) + theme(panel.grid.minor = b)
guardar(p_sc, "extra_dispersion_p1.png", 8.6, 6)

ranking <- dd %>% transmute(nombre = titulo(nombre), personas, n_emt, n_metro, n_valenbisi, transporte_total,
                            por_mil = round(1000 * ratio_transporte_persona, 1)) %>% arrange(desc(por_mil))
write.csv(ranking, "datos/ranking_p1.csv", row.names = FALSE)
writeLines(sprintf("correlacion=%.3f\nn_barrios_estudio=%d\nn_barrios_total=%d\nr2=%.3f\npendiente_por_10000=%.2f",
                   correlacion, nrow(df.pob_con_bicis), nrow(df.pob_todos), summary(mod)$r.squared, coef(mod)[2] * 1e4),
           "datos/stats_p1.txt")

# ---- P2 ----------------------------------------------------------------------
p <- split(df.transporte, df.transporte$empresa); v <- p$Valenbisi
e <- dist_min(st_filter(p$EMT, dominio), v); f <- dist_min(st_filter(p$FGV, dominio), v)
dd2 <- data.frame(Transporte=rep(c("EMT","FGV"), c(length(e), length(f))), distancia_minima=c(e,f))
tt <- theme_minimal(base_size = BASE) + theme(plot.title = element_text(face = "bold"), legend.position = "top")
p5 <- ggplot(dd2, aes(distancia_minima, fill=Transporte))+geom_density(alpha=.6)+scale_fill_manual(values=COL_MODO)+
  scale_x_continuous(limits=c(0,1500), breaks=seq(0,1500,250))+labs(title="Distancia al Valenbisi más cercano", x="Distancia (m)", y="Densidad", fill = NULL)+tt +
  ggplot(dd2, aes(distancia_minima, col=Transporte))+stat_ecdf(geom="step", linewidth=1.2)+scale_color_manual(values=COL_MODO)+
  geom_vline(xintercept=250, lty=2, col="grey40")+scale_y_continuous(labels=scales::percent)+coord_cartesian(xlim=c(0,1000))+
  labs(title="Acumulado: distancia al Valenbisi", subtitle="La línea discontinua indica el codo (250 m)", x="Distancia (m)", y="Paradas acumuladas", col = NULL)+tt+
  plot_layout(ncol=2)
guardar(p5, "fig5_distancias.png", 12, 4.8)
writeLines(sprintf("emt_n=%d\nfgv_n=%d\nemt_250=%.3f\nfgv_250=%.3f\nemt_med=%.0f\nfgv_med=%.0f",
                   length(e), length(f), mean(e <= 250), mean(f <= 250), median(e), median(f)), "datos/stats_dist.txt")

rejilla <- st_make_grid(dominio, cellsize = HEX_M, square = FALSE)
dentro  <- lengths(st_within(st_centroid(rejilla), dominio)) > 0
rejilla <- rejilla[dentro]
centros <- st_centroid(rejilla)

dist_vb <- dist_min(centros, p$Valenbisi); dist_emt <- dist_min(centros, p$EMT); dist_fgv <- dist_min(centros, p$FGV)
hex <- mutate(st_sf(geometry=rejilla), V=dist_vb<=UMBRAL["Valenbisi"], E=dist_emt<=UMBRAL["EMT"], F=dist_fgv<=UMBRAL["FGV"],
              situacion=case_when(V~"Cubierto por Valenbisi", E&F~"Desierto compensado por EMT y FGV",
                                  E|F~"Desierto compensado por un modo", T~"Desierto sin compensación"))
hex$id <- st_join(st_sf(geometry = centros), df.pob["id"])$id
desierto <- sort(table(hex$id[!hex$V]), decreasing = TRUE); top <- names(head(desierto, 9))

cob <- colMeans(st_drop_geometry(hex)[, c("V", "E", "F")])
comp <- hex %>% st_drop_geometry() %>% group_by(V) %>% summarise(EMT = mean(E), FGV = mean(F))
peso9 <- sum(head(desierto, 9)) / sum(desierto)
area_hex_ha <- as.numeric(st_area(rejilla[1])) * 1e-4
writeLines(c(sprintf("n_hex=%d\narea_hex_ha=%.4f\ncob_V=%.4f\ncob_E=%.4f\ncob_F=%.4f\npeso9=%.4f", length(rejilla), area_hex_ha, cob["V"], cob["E"], cob["F"], peso9),
             sprintf("desierto_EMT=%.4f\ndesierto_FGV=%.4f\ncubierto_EMT=%.4f\ncubierto_FGV=%.4f",
                     comp$EMT[!comp$V], comp$FGV[!comp$V], comp$EMT[comp$V], comp$FGV[comp$V])),
           "datos/stats_p2.txt")
write.csv(as.data.frame(table(hex$situacion)) %>% mutate(prop = round(Freq / sum(Freq), 4), ha = round(Freq * area_hex_ha, 1)),
          "datos/situacion_p2.csv", row.names = FALSE)

COL_SIT <- c("Cubierto por Valenbisi" = "grey75", "Desierto compensado por EMT y FGV" = "#c9b6e4",
             "Desierto compensado por un modo" = "#8e5fc7", "Desierto sin compensación" = "#4a1e7a")
hex_union <- summarise(group_by(hex, situacion))
p6 <- ggplot() + geom_sf(data=hex_union, aes(fill=situacion), col=NA) +
  geom_sf(data=df.pob, fill=NA, col="white", linewidth = .35) +
  geom_label_repel(data = st_point_on_surface(filter(df.pob, id %in% top)) %>% mutate(lbl = titulo(nombre)),
                   aes(label = lbl, geometry = geometria), stat = "sf_coordinates", size = 4.2,
                   fill = alpha("white", .85), label.size = 0, col = "grey10", min.segment.length = 0,
                   box.padding = .5, seed = 7) +
  scale_fill_manual(values=COL_SIT, name=NULL) + theme_void(base_size = BASE + 1) +
  theme(legend.position = "right", legend.key.size = unit(.8, "cm"))
guardar(p6, "fig6_desiertos.png", 11, 7.4)

# Extra: top 9 barrios por superficie de desierto (ha), por tipo de compensación
top_df <- hex %>% st_drop_geometry() %>% filter(!V, id %in% as.integer(top)) %>%
  count(id, situacion) %>% mutate(ha = n * area_hex_ha) %>%
  left_join(st_drop_geometry(df.pob) %>% select(id, nombre), by = "id") %>%
  mutate(nombre = titulo(nombre)) %>% group_by(nombre) %>% mutate(tot = sum(ha)) %>% ungroup() %>%
  mutate(nombre = reorder(nombre, tot))
p_top <- ggplot(top_df, aes(ha, nombre, fill = situacion)) + geom_col(width = .72) +
  scale_fill_manual(values = COL_SIT[-1], name = NULL) +
  scale_x_continuous(expand = expansion(mult = c(0, .05))) +
  labs(x = "Superficie sin Valenbisi a ≤ 250 m (ha)", y = NULL) +
  theme_minimal(base_size = BASE + 3) + theme(panel.grid.major.y = b, panel.grid.minor = b, legend.position = "bottom", legend.direction = "vertical",
                                               axis.text.y = element_text(size = BASE + 4, colour = "grey15"))
guardar(p_top, "extra_top9_desiertos.png", 7, 6.2)
write.csv(top_df %>% group_by(nombre) %>% summarise(ha = round(sum(ha), 1)) %>% arrange(desc(ha)), "datos/top9.csv", row.names = FALSE)

# Extra: esquema del método (zoom en una zona con rejilla, paradas y radios)
centro_zoom <- st_centroid(st_union(filter(df.pob_todos, nombre %in% c("NATZARET")))) # zona sur con las 4 situaciones
zoom <- st_buffer(centro_zoom, 750)
bb <- st_bbox(zoom)
hex_z <- hex[st_intersects(hex, zoom, sparse = FALSE)[,1], ]
tr_z <- df.transporte[st_intersects(df.transporte, st_buffer(zoom, 400), sparse = FALSE)[,1], ]
vb_z <- tr_z %>% filter(empresa == "Valenbisi")
p_met <- ggplot() +
  geom_sf(data = hex_z, aes(fill = situacion), col = "white", linewidth = .25) +
  geom_sf(data = st_buffer(vb_z, 250), fill = NA, col = COL_MODO["Valenbisi"], linewidth = .7, lty = "dashed") +
  geom_sf(data = tr_z, aes(col = empresa, shape = empresa), size = 3.2, stroke = 1.1) +
  scale_fill_manual(values = COL_SIT, name = NULL, guide = guide_legend(ncol = 2, order = 2),
                    labels = c("Cubierto por Valenbisi", "Compensado por EMT y FGV", "Compensado por un modo", "Sin compensación")) +
  scale_color_manual(values = COL_MODO, name = NULL) + scale_shape_manual(values = c(EMT = 16, FGV = 17, Valenbisi = 15), name = NULL) +
  coord_sf(xlim = bb[c("xmin", "xmax")], ylim = bb[c("ymin", "ymax")], expand = FALSE) +
  theme_void(base_size = BASE + 3) + theme(legend.position = "bottom", legend.box = "vertical")
guardar(p_met, "extra_metodo_zoom.png", 7.4, 8.2)

# Extra (anexo): sensibilidad del umbral
umbrales <- seq(100, 500, 25)
sens <- bind_rows(lapply(umbrales, function(u) data.frame(umbral = u,
  Valenbisi = mean(dist_vb <= u), EMT = mean(dist_emt <= u), FGV = mean(dist_fgv <= u)))) %>%
  pivot_longer(-umbral, names_to = "modo", values_to = "cobertura")
p_sens <- ggplot(sens, aes(umbral, cobertura, col = modo)) +
  annotate("rect", xmin = 237, xmax = 263, ymin = -Inf, ymax = Inf, fill = "grey90") +
  geom_line(linewidth = 1.3) + geom_point(size = 2) +
  scale_color_manual(values = c(COL_MODO[c("Valenbisi", "EMT")], FGV = "#C9A400"), name = NULL) +
  scale_y_continuous(labels = percent, limits = c(0, 1)) + scale_x_continuous(breaks = seq(100, 500, 100)) +
  labs(x = "Umbral de distancia (m)", y = "Superficie del dominio cubierta") +
  theme_minimal(base_size = BASE + 1) + theme(legend.position = "top", panel.grid.minor = b)
guardar(p_sens, "anexo_sensibilidad_umbral.png", 8.6, 5.6)
write.csv(sens %>% filter(umbral %in% c(150, 200, 250, 300, 400)) %>% pivot_wider(names_from = modo, values_from = cobertura),
          "datos/sensibilidad.csv", row.names = FALSE)

cat("Zonas con Valenbisi:", length(zonas_con_valenbisi), "de", nrow(df.pob_todos), "\n")
cat("Población cubierta:", sum(df.pob_con_bicis$personas, na.rm = TRUE), "de", sum(df.pob_todos$personas, na.rm = TRUE), "\n")
cat("Area dominio (km2):", as.numeric(st_area(dominio)) / 1e6, "\n")
cat("Hexágonos:", length(rejilla), "\n")
print(cob); print(comp); print(peso9); print(head(desierto, 9))

# ---- Imagen decorativa para la portada (fondo transparente) ------------------
p_port <- ggplot() +
  geom_sf(data = hex_union, aes(fill = situacion), col = NA) +
  geom_sf(data = df.pob, fill = NA, col = "#0F2C3F", linewidth = .5) +
  scale_fill_manual(values = c("Cubierto por Valenbisi" = "#3D6A8C", "Desierto compensado por EMT y FGV" = "#F5A26B",
                               "Desierto compensado por un modo" = "#F28C28", "Desierto sin compensación" = "#C8442B"), guide = "none") +
  theme_void()
ggsave("figuras/portada_hex.png", p_port, width = 8, height = 6.4, dpi = 220, bg = "transparent", device = png, type = "cairo")
cat("  -> portada_hex.png\n")
