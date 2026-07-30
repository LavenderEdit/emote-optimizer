# Roadmap de implementación — Grid Pack Studio

## 1. Estado actual observado

La aplicación ya cuenta con:

- Importación múltiple de PNG/JPG/WEBP.
- Estado de lote en `useEmoteBatch`.
- Canvas y procesamiento por píxel.
- Flood fill para eliminación de fondo.
- Pincel de restauración.
- Brillo, contraste, saturación y sharpen.
- Outline automático.
- Preview 112/56/28.
- Exportación ZIP con JSZip.

Limitaciones relevantes:

- La entrada se trata como archivos individuales; no existe un documento de tipo grid.
- El estado guarda data URLs completas en React.
- El pipeline genera `processedSrc` como una imagen final, no como operaciones no destructivas.
- La exportación centra y recorta al cuadrado usando la dimensión menor, lo que puede cortar contenido rectangular.
- No hay validación real de bytes, transparencia o requisitos Twitch.
- No hay selección múltiple ni aplicación por lote.
- No hay Web Workers.
- No hay pruebas automatizadas ni scripts de test en `package.json`.

## 2. Estrategia general

Implementar en entregas pequeñas. Cada fase debe dejar una capacidad utilizable y mantener la aplicación compilable.

No comenzar con IA de eliminación de fondo. El mayor ahorro de tiempo proviene primero de segmentar, corregir y exportar grids de forma estable.

---

## Fase 0 — Base de calidad y pruebas

### Objetivo

Preparar el proyecto para modificar algoritmos sin regresiones.

### Tareas

- Añadir Vitest.
- Añadir Testing Library para componentes críticos.
- Crear scripts `test`, `test:watch` y `test:coverage`.
- Añadir fixtures sintéticos de grids.
- Añadir utilidades puras para geometría.
- Configurar límites de archivo y megapíxeles.
- Documentar convenciones de nombres y carpetas.

### Archivos sugeridos

```text
src/shared/math/rect.js
src/shared/files/imageValidation.js
src/test/fixtures/
vitest.config.js
```

### Criterios de salida

- Lint, test y build pasan.
- Hay pruebas para `sanitizeName`, crop cuadrado y mapeo de rectángulos.

---

## Fase 1 — Modelo no destructivo

### Objetivo

Separar fuente, operaciones y salida renderizada.

### Tareas

- Reemplazar el modelo basado principalmente en `originalSrc`/`processedSrc` por documentos con parámetros.
- Guardar fuentes como Blob/Object URL o asset registry.
- Añadir `cropRect`, `fitMode`, `padding`, máscara y ajustes.
- Crear selector de render derivado.
- Revocar Object URLs al eliminar documentos.
- Mantener adaptador temporal para el UI existente.

### Archivos sugeridos

```text
src/features/editor/model/createEmoteDocument.js
src/features/editor/model/emoteReducer.js
src/features/editor/imagePipeline/renderEmote.js
src/shared/files/assetRegistry.js
```

### Criterios de salida

- Editar un slider no sobrescribe la fuente.
- Exportar siempre vuelve al maestro.
- El flujo individual continúa funcionando.

---

## Fase 2 — Importador de grid manual

### Objetivo

Entregar valor sin depender todavía de detección automática compleja.

### Tareas

- Añadir selector `Imagen individual / Paquete en grid`.
- Añadir formulario de filas y columnas.
- Añadir margen exterior y gutters.
- Dibujar overlay de celdas.
- Permitir habilitar/deshabilitar celdas.
- Generar documentos desde las celdas activas.
- Conservar la fuente de grid como un único asset.

### Componentes sugeridos

```text
src/features/grid-import/components/GridImportDialog.jsx
src/features/grid-import/components/GridOverlay.jsx
src/features/grid-import/components/GridControls.jsx
src/features/grid-import/hooks/useGridDraft.js
src/features/grid-import/gridSegmentation/createUniformGrid.js
```

### Criterios de salida

- El usuario configura 5 × 5 y obtiene 24 recortes al desactivar la última celda.
- Las líneas pueden corregirse antes de generar el lote.

---

## Fase 3 — Detección automática v1

### Objetivo

Detectar grids con fondo y gutters uniformes como la imagen de referencia.

### Tareas

- Estimar fondo desde bordes.
- Crear máscara de diferencia.
- Calcular perfiles de proyección.
- Detectar runs de whitespace.
- Inferir filas/columnas.
- Puntuar regularidad.
- Detectar celdas vacías.
- Mostrar confianza.
- Ejecutar análisis en Web Worker.

### Archivos sugeridos

```text
src/features/grid-import/workers/gridAnalysis.worker.js
src/features/grid-import/gridDetection/estimateBackground.js
src/features/grid-import/gridDetection/buildAnalysisMask.js
src/features/grid-import/gridDetection/projectionProfiles.js
src/features/grid-import/gridDetection/findGutters.js
src/features/grid-import/gridDetection/scoreGrid.js
src/features/grid-import/gridDetection/scoreEmptyCell.js
```

### Criterios de salida

- Propone 5 × 5 para la referencia.
- Marca la celda 25 como vacía o dudosa.
- Error geométrico máximo aproximado de 3 px en la fuente.
- La interfaz no se congela durante el análisis.

---

## Fase 4 — Corrección avanzada de segmentación

### Objetivo

Hacer confiable el flujo cuando la detección no sea perfecta.

### Tareas

- Drag de guías.
- Agregar/eliminar guías.
- Nudge por teclado.
- Editar región individual.
- Dividir/fusionar celdas.
- Modo regiones libres.
- Reordenar y renombrar.
- Historial de cambios de segmentación.

### Criterios de salida

- Se puede corregir cualquier falso positivo/negativo sin volver a Photoshop.

---

## Fase 5 — Trim, encuadre y edición por lote

### Objetivo

Normalizar los 24+ recortes rápidamente.

### Tareas

- Trim conectado desde bordes.
- `sourceRect` y `contentRect` separados.
- Crop cuadrado `contain`, `cover` y manual.
- Padding global y por emote.
- Selección múltiple.
- Aplicar fondo, ajustes y outline a selección/todos.
- Comparación antes/después.
- Copiar/pegar ajustes.

### Criterios de salida

- Ningún recorte se deforma.
- El usuario puede aplicar un ajuste a 24 emotes con una sola acción.
- El contenido que toca bordes produce warning.

---

## Fase 6 — Eliminación de fondo v2

### Objetivo

Mejorar fondos blancos/grises sin destruir blancos internos.

### Tareas

- Auto-sample desde bordes y esquinas.
- Multi-muestra.
- Modo conectado vs global.
- Vista de máscara.
- Feather.
- Despill/defringe.
- Warning por porcentaje borrado.
- Máscara aplicada a selección.

### Criterios de salida

- El fondo exterior del paquete de referencia queda transparente.
- Texto blanco y detalles internos se conservan cuando no están conectados al borde.

---

## Fase 7 — Presets, validadores y exportación profesional

### Objetivo

Garantizar archivos listos para Twitch.

### Tareas

- Crear presets versionados.
- Sustituir constantes de `exportUtils.js`.
- Exportar auto-resize y manual.
- Medir bytes reales.
- Validar PNG, dimensiones, alpha y peso.
- Generar manifest.
- Generar reporte HTML.
- Mostrar progreso y permitir cancelación.
- Evitar crop central destructivo actual.

### Archivos sugeridos

```text
src/features/export/presets/twitchStaticAuto.js
src/features/export/presets/twitchStaticManual.js
src/features/export/validators/validateOutput.js
src/features/export/encoders/encodePng.js
src/features/export/buildExportPackage.js
```

### Criterios de salida

- 24 emotes producen 72 PNG válidos en modo manual.
- Ningún archivo excede el límite del preset.
- Manifest y ZIP coinciden.

---

## Fase 8 — Rendimiento y persistencia

### Objetivo

Manejar grids grandes y recuperar sesiones.

### Tareas

- Mover render pesado a OffscreenCanvas/Web Worker cuando sea viable.
- Cachear previews por hash de parámetros.
- IndexedDB para assets y proyecto.
- Autosave local.
- Recuperación después de refresh.
- Liberación explícita de memoria.
- Virtualización de lista para 100+ emotes.

### Criterios de salida

- Grid de 100 celdas sigue siendo utilizable.
- Refresh recupera un proyecto local.

---

## Fase 9 — Herramientas avanzadas

- Variantes por tamaño.
- Histograma y niveles.
- Outline/sombra avanzados.
- Presets adicionales.
- Detección de collages irregulares mejorada.
- Eliminación de fondo local asistida por ML/WebGPU.
- Soporte GIF en módulo separado.

---

## 3. Backlog técnico priorizado

### Bugs/riesgos actuales

1. `resizeImageHQ` usa crop central cuadrado y puede cortar texto o extremidades.
2. `processFiles` acepta cualquier `image/*`, aunque el input enumera formatos específicos.
3. Data URLs grandes aumentan memoria y copias en estado.
4. `processedSrc` se recalcula como PNG completo ante múltiples cambios.
5. El historial solo guarda puntos de borrar/restaurar.
6. No se manejan errores de carga de `Image` dentro de exportación.
7. No se mide el peso de PNG antes de añadirlo al ZIP.
8. No existe validación de transparencia.
9. El botón de formato es un radio visual sin opciones reales.
10. No hay progreso por item ni cancelación.

### Quick wins

- Añadir validación explícita de dimensiones y tipo.
- Sustituir alertas por mensajes de UI.
- Añadir `img.onerror` y manejo de promesas rechazadas.
- Añadir preview checkerboard.
- Añadir modo de encuadre `contain` para evitar cortes.
- Añadir nombres editables.
- Añadir indicador de peso final.

## 4. Estrategia de PRs

No agrupar todo en una sola PR. Sugerencia:

1. `test: add geometry and export foundations`
2. `refactor: introduce non-destructive emote documents`
3. `feat: add manual grid importer`
4. `feat: add automatic grid detection worker`
5. `feat: add editable grid overlay`
6. `feat: add batch selection and trim controls`
7. `feat: add Twitch presets and validators`
8. `perf: move heavy image work off main thread`
9. `feat: persist local projects`

Cada PR debe incluir:

- Resumen.
- Capturas o video.
- Riesgos.
- Pruebas añadidas.
- Resultado de lint/test/build.
- Checklist de aceptación.

## 5. Primera entrega recomendada

La primera implementación debe ser **importador manual de grid + overlay + celdas habilitables**. Es la ruta más segura para obtener valor real y crea la infraestructura visual necesaria para mostrar posteriormente la detección automática.
