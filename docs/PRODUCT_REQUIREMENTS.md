# Product Requirements — Grid Pack Studio

## 1. Problema

Actualmente EmoteStudio Pro procesa múltiples archivos individuales, pero un paquete de emotes suele entregarse como una sola imagen compuesta por tarjetas o celdas. Editar, recortar, limpiar y exportar cada elemento manualmente multiplica el tiempo y produce resultados inconsistentes.

La aplicación debe transformar una imagen de grid en un conjunto editable de emotes independientes, manteniendo calidad visual y generando archivos listos para Twitch.

## 2. Objetivo principal

Permitir que una persona cargue un paquete en grid, confirme o corrija la segmentación, aplique limpieza y ajustes en lote, y descargue un ZIP válido para Twitch en pocos minutos.

## 3. Usuarios objetivo

- Streamers que reciben paquetes de emotes en una sola imagen.
- Diseñadores que preparan lotes para varios clientes.
- Editores que necesitan normalizar tamaño, fondo y nombres.
- Equipos que quieren conservar un proyecto reutilizable y reproducible.

## 4. Alcance funcional

### P0 — Imprescindible

- Cargar PNG, JPG/JPEG y WEBP estáticos.
- Detectar grids regulares automáticamente.
- Configurar manualmente filas y columnas.
- Mostrar overlay editable de celdas.
- Saltar celdas vacías.
- Convertir cada celda en un emote independiente.
- Trim de margen o tarjeta alrededor del contenido.
- Crop cuadrado sin deformar.
- Padding configurable.
- Eliminación de fondo con gotero y flood fill.
- Aplicar ajustes a uno, selección o todos.
- Previsualizar en 112, 56 y 28 px.
- Exportar PNG y ZIP para Twitch.
- Validar dimensiones, formato, transparencia y peso.
- Mantener el flujo actual de imágenes individuales.

### P1 — Alta prioridad

- Detección automática de filas, columnas, gutters y márgenes.
- Selección múltiple.
- Renombrado masivo con patrón y contador.
- Reordenamiento de celdas.
- Corrección manual de líneas divisorias.
- Detección de halos y descontaminación de bordes.
- Exportación `auto-resize` y `manual` por preset.
- Reporte de validación dentro del ZIP.
- Undo/redo real.
- Progreso y cancelación del procesamiento.
- Persistencia de sesión en IndexedDB.

### P2 — Avanzado

- Regiones libres para collages irregulares.
- Variantes editables por tamaño.
- Comparación antes/después.
- Histograma, niveles, gamma y balance de color.
- Perfil de outline y sombra por lote.
- Eliminación de fondo asistida por modelo local/WebGPU.
- Proyectos importables/exportables.
- Presets Discord, YouTube y Kick.
- GIF animado como flujo separado.

## 5. Flujo principal

### Paso 1 — Importar

La pantalla inicial ofrece:

- `Imagen individual`.
- `Paquete en grid`.
- Detección automática cuando la aplicación identifica repetición regular.

### Paso 2 — Detectar

La aplicación analiza la imagen y propone:

- Número de filas y columnas.
- Márgenes exteriores.
- Gutters.
- Celdas habilitadas.
- Confianza global y por celda.

### Paso 3 — Corregir

El usuario puede:

- Mover guías.
- Cambiar filas/columnas.
- Editar una celda individual.
- Habilitar/deshabilitar una celda.
- Marcar una celda como vacía.
- Ajustar inset global.

### Paso 4 — Generar lote

Cada celda habilitada se convierte en un `EmoteDocument` con recorte no destructivo.

### Paso 5 — Editar

El usuario selecciona:

- Un emote.
- Varios emotes.
- Todos.

Puede aplicar transparencia, ajustes, outline, padding y encuadre.

### Paso 6 — Validar

Una matriz de estado muestra:

- Aprobado.
- Warning.
- Error bloqueante.

### Paso 7 — Exportar

El usuario selecciona un preset y descarga un ZIP con archivos, manifest y reporte.

## 6. Requisitos de UX

- No ocultar el resultado de una detección automática: siempre mostrar overlay.
- Mantener disponible un botón claro de `Restablecer detección`.
- Mostrar checkerboard cuando haya transparencia.
- Proporcionar preview en fondo claro y oscuro.
- Permitir zoom, pan y ajuste a pantalla.
- Las guías deben tener handles grandes y accesibles.
- Los cambios globales deben indicar claramente cuántos emotes afectarán.
- Las operaciones destructivas deben poder deshacerse.
- El usuario debe poder volver de edición a segmentación sin perder ajustes.

## 7. Requisitos de calidad

- No deformar imágenes.
- No generar archivos desde previews CSS.
- No usar una imagen de 28 px como fuente de 56/112 px.
- Mantener alpha correcto al redimensionar.
- Evitar halos blancos después de quitar fondos claros.
- Mantener texto legible en 28 px cuando la fuente original lo permita.
- No recortar contenido visible sin warning.

## 8. Requisitos Twitch

### Auto-resize

- PNG estático.
- Cuadrado.
- Entre 112 × 112 y 4096 × 4096 px.
- Máximo 1 MB.
- Fondo totalmente transparente.

### Manual

- 112 × 112, 56 × 56 y 28 × 28 px.
- PNG estático.
- Cuadrado.
- Fondo transparente.
- Validar el límite vigente por archivo desde un preset centralizado.

Fuentes oficiales:

- https://help.twitch.tv/s/article/emote-guidelines
- https://help.twitch.tv/s/article/subscriber-emote-guide

## 9. Métricas del producto

- Tiempo medio desde carga hasta ZIP.
- Porcentaje de celdas detectadas correctamente sin corrección.
- Número medio de correcciones manuales por paquete.
- Porcentaje de exportaciones sin errores Twitch.
- Tiempo de detección para imágenes de 1K, 2K y 4K.
- Uso máximo de memoria en paquetes de 25, 50 y 100 emotes.
- Tasa de abandono antes de exportar.

## 10. Criterios de aceptación del MVP

Con la imagen de referencia 994 × 1001 px:

1. La aplicación propone 5 columnas y 5 filas.
2. Identifica 24 celdas con contenido y una vacía.
3. Permite corregir cualquier división manualmente.
4. Genera 24 emotes independientes.
5. Permite quitar el fondo blanco/gris sin destruir ojos, dientes, texto u otras zonas claras internas.
6. Genera 112, 56 y 28 px desde un maestro de alta resolución.
7. Exporta 72 PNG en modo manual, organizados y nombrados de forma estable.
8. Cada PNG es cuadrado, transparente y tiene dimensiones exactas.
9. La interfaz sigue permitiendo cargar imágenes individuales.
10. `npm run lint` y `npm run build` terminan correctamente.

## 11. Fuera de alcance del MVP

- Carga directa a una cuenta de Twitch.
- Gestión OAuth de Twitch.
- Edición vectorial.
- Generación de ilustraciones.
- Reconocimiento semántico del texto del emote.
- GIF y video animado.
- Almacenamiento remoto de imágenes.
