# AGENTS.md

## 1. Objetivo del proyecto

**EmoteStudio Pro / Emote Optimizer** debe convertirse en una herramienta web local-first para preparar paquetes completos de emotes sin editar cada imagen por separado.

El caso principal es cargar una sola imagen que contiene un **grid de emotes**, detectar sus celdas, recortarlas en lote, limpiar fondos, ajustar cada recorte y exportar archivos compatibles con Twitch.

La aplicación debe seguir funcionando para imágenes individuales. El flujo de grids es una capacidad adicional, no un reemplazo del flujo actual.

## 2. Stack y restricciones actuales

- React 19.
- Vite 8.
- Tailwind CSS 4.
- JavaScript con módulos ES.
- Canvas API para procesamiento de píxeles.
- JSZip para exportación.
- Procesamiento en el navegador; no enviar imágenes a servidores por defecto.
- Los formatos de entrada actuales son PNG, JPG/JPEG y WEBP estáticos.

Antes de agregar una dependencia, justificar por qué Canvas API, Web Workers o utilidades propias no son suficientes.

## 3. Principios no negociables

1. **Procesamiento no destructivo**: conservar siempre la imagen fuente y parámetros editables. No encadenar pérdidas de calidad sobre un resultado ya redimensionado.
2. **Calidad de salida**: generar cada tamaño desde el recorte maestro de mayor resolución.
3. **Transparencia real**: una zona eliminada debe terminar con alpha 0, no pintada de blanco.
4. **Control del usuario**: toda detección automática debe poder corregirse manualmente.
5. **Trabajo por lotes**: permitir aplicar ajustes a un emote, a una selección o a todo el paquete.
6. **Vista previa pequeña**: validar legibilidad en 112, 56 y 28 px antes de exportar.
7. **Sin deformación**: jamás estirar una imagen rectangular para volverla cuadrada. Usar crop o padding configurable.
8. **Exportación verificable**: cada archivo debe pasar validaciones de formato, dimensiones, transparencia y peso.
9. **Accesibilidad**: controles con etiquetas, navegación por teclado, foco visible y contraste suficiente.
10. **Rendimiento**: operaciones costosas deben poder moverse a Web Workers y no bloquear la interfaz.

## 4. Caso de referencia

La imagen de referencia analizada mide aproximadamente **994 × 1001 px** y contiene:

- Grid lógico: 5 columnas × 5 filas.
- Celdas con contenido: 24.
- Última celda: vacía.
- Tarjetas aproximadas: 164–166 px de ancho × 163–164 px de alto.
- Separación horizontal aproximada: 33–35 px.
- Separación vertical aproximada: 34–35 px.
- Fondo exterior blanco y tarjetas gris muy claro con esquinas redondeadas.

El detector debe reconocer este patrón sin exigir que el usuario escriba manualmente 5 × 5, pero también debe ofrecer modo manual.

## 5. Flujos de usuario requeridos

### 5.1 Imagen individual

1. Cargar una o varias imágenes.
2. Editar transparencia, encuadre y ajustes.
3. Previsualizar tamaños.
4. Exportar ZIP o PNG individual.

### 5.2 Paquete en grid

1. Cargar una imagen de paquete.
2. Elegir `Detectar automáticamente` o `Configurar grid`.
3. Visualizar overlays de filas, columnas y celdas.
4. Corregir líneas, márgenes, gutters e insets.
5. Marcar/desmarcar celdas vacías.
6. Generar recortes independientes.
7. Ajustar un recorte, varios o todos.
8. Validar compatibilidad Twitch.
9. Exportar el paquete.

### 5.3 Corrección manual

El usuario debe poder:

- Mover cada línea divisoria.
- Cambiar filas y columnas.
- Definir margen exterior.
- Definir gutter horizontal/vertical.
- Aplicar inset interno a todas las celdas.
- Dibujar o redimensionar una región libre.
- Dividir, fusionar, duplicar o eliminar celdas.
- Reordenar celdas por drag and drop.
- Nombrar cada emote.
- Saltar celdas vacías o decorativas.

## 6. Arquitectura objetivo

No concentrar la lógica nueva en `App.jsx` ni en un único hook.

Estructura recomendada:

```text
src/
  features/
    grid-import/
      components/
      hooks/
      workers/
      gridDetection/
      gridSegmentation/
      gridValidation/
      types/
    editor/
      components/
      hooks/
      imagePipeline/
    export/
      presets/
      validators/
      encoders/
  shared/
    canvas/
    files/
    math/
    ui/
```

La migración puede ser gradual. No es obligatorio mover todo el código existente en una sola entrega.

### 6.1 Entidades mínimas

```js
/** @typedef {{ x:number, y:number, width:number, height:number }} Rect */

/**
 * @typedef {Object} GridCell
 * @property {string} id
 * @property {number} row
 * @property {number} column
 * @property {Rect} sourceRect
 * @property {Rect} contentRect
 * @property {boolean} enabled
 * @property {boolean} empty
 * @property {number} confidence
 * @property {string} name
 */

/**
 * @typedef {Object} EmoteDocument
 * @property {string} id
 * @property {string} name
 * @property {string} sourceId
 * @property {Rect} cropRect
 * @property {'contain'|'cover'|'manual'} fitMode
 * @property {number} padding
 * @property {Object} backgroundRemoval
 * @property {Object} adjustments
 * @property {Object} outline
 */
```

Los objetos deben guardar parámetros, no solo data URLs finales.

## 7. Detección de grid

Implementar por etapas y combinar señales. No depender de una sola heurística.

### 7.1 Estrategia base

1. Crear una miniatura de análisis conservando aspect ratio.
2. Estimar el color de fondo desde bordes y esquinas.
3. Calcular diferencia de color usando RGB lineal o CIE Lab cuando sea viable.
4. Construir máscara de foreground/background.
5. Aplicar operaciones morfológicas moderadas.
6. Obtener proyecciones horizontales y verticales.
7. Detectar corredores de whitespace que formen gutters.
8. Generar candidatos de filas/columnas.
9. Puntuar regularidad de tamaños y espaciado.
10. Detectar celdas vacías por ocupación y entropía.
11. Devolver confianza global y por celda.

### 7.2 Métodos complementarios

- Componentes conectados para tarjetas separadas.
- Contornos rectangulares y rectángulos redondeados.
- Clustering de centros X/Y.
- Detección de líneas por perfiles de luminancia.
- Estimación de periodicidad mediante autocorrelación.
- Modo `filas × columnas` para grids sin gutters claros.
- Modo regiones libres para collages irregulares.

### 7.3 Fallback obligatorio

Si la confianza es baja, no crear recortes silenciosamente. Mostrar:

- Propuesta de filas/columnas.
- Motivo de baja confianza.
- Controles manuales inicializados con la mejor estimación.

## 8. Recorte y encuadre

Cada celda debe pasar por dos cajas:

- `sourceRect`: área geométrica de la celda.
- `contentRect`: área útil después de retirar tarjeta, margen o fondo.

Funciones requeridas:

- Trim automático de bordes uniformes.
- Padding positivo/negativo.
- Centrado por bounding box del contenido visible.
- Centrado por centro de masa alfa.
- Escala uniforme.
- Rotación opcional.
- Flip horizontal/vertical.
- Safe area visible en 28 px.
- Fondo de preview claro, oscuro y checkerboard.

No recortar texto, manos, efectos o accesorios por usar únicamente el rostro como referencia.

## 9. Eliminación de fondo

Mantener el gotero/flood fill existente, pero ampliar el modelo.

### 9.1 Modos mínimos

- Fondo desde bordes/esquinas.
- Gotero con tolerancia.
- Multi-muestra: varios colores de fondo.
- Flood fill conectado.
- Eliminación global por rango de color.
- Pincel borrar/restaurar.
- Descontaminación de bordes blancos o del color eliminado.
- Feather controlado de 0–3 px.
- Despill para halos.

### 9.2 Protección de contenido

- Vista de máscara.
- Undo/redo por operación.
- Aplicar máscara a selección o todo el paquete.
- Comparación antes/después.
- Warning cuando se elimina un porcentaje anormalmente alto.

## 10. Calidad y redimensionamiento

- Generar 112, 56 y 28 desde el recorte maestro.
- Usar reducción progresiva para factores grandes.
- Usar `imageSmoothingQuality = 'high'`.
- Evitar sharpen agresivo en el maestro; permitir un sharpen específico por tamaño.
- Previsualizar al 100% de píxeles, no solo escalado CSS.
- Permitir una variante manual por tamaño cuando el texto o el detalle requiera ajustes distintos.
- Considerar `createImageBitmap`, `OffscreenCanvas` y Web Workers para procesamiento en lote.

## 11. Preset Twitch

Para emotes estáticos:

- PNG.
- Fondo totalmente transparente.
- Imagen cuadrada.
- Auto-resize: una imagen entre 112 × 112 y 4096 × 4096, máximo 1 MB.
- Manual: 28 × 28, 56 × 56 y 112 × 112; cada archivo debe cumplir el límite mostrado por el preset oficial vigente.

La implementación no debe hardcodear reglas sin centralizarlas. Crear presets versionables en `src/features/export/presets`.

Fuentes oficiales:

- https://help.twitch.tv/s/article/emote-guidelines
- https://help.twitch.tv/s/article/subscriber-emote-guide

## 12. Exportación

Modos requeridos:

1. `Twitch auto-resize`: un PNG maestro por emote.
2. `Twitch manual`: 112/56/28 por emote.
3. `PNG recortados`: tamaño maestro sin preset.
4. `Hoja de contacto`: preview de todos los resultados.
5. `Proyecto`: JSON con parámetros y referencias locales cuando sea posible.

Estructura ZIP sugerida:

```text
nombre-paquete/
  manifest.json
  report.html
  masters/
    emote_001.png
  twitch-manual/
    emote_001/
      emote_001_112.png
      emote_001_56.png
      emote_001_28.png
```

`manifest.json` debe registrar dimensiones, bytes, transparencia, origen de celda, warnings y versión del preset.

## 13. Validaciones

Antes de exportar, mostrar por emote:

- Dimensiones.
- Formato.
- Peso estimado/final.
- Aspect ratio.
- Presencia de transparencia.
- Bounding box visible.
- Porcentaje de ocupación.
- Legibilidad en 28 px.
- Nombre de archivo válido y único.
- Warning por celdas aparentemente vacías.
- Warning por contenido tocando los bordes.

Errores bloqueantes y warnings deben ser diferentes.

## 14. Estado, historial y persistencia

- Implementar undo/redo real con acciones o snapshots limitados.
- No guardar copias completas de píxeles en cada movimiento de slider.
- Debounce para ajustes continuos.
- Persistencia opcional en IndexedDB.
- Recuperación de sesión después de refresh/crash.
- Revocar Object URLs que ya no se usen.

## 15. Rendimiento

Objetivos iniciales en un equipo de gama media:

- Preview interactivo de sliders: objetivo de 30 FPS o más.
- Detección del grid de una imagen de 4096 px: menos de 2 s cuando sea posible.
- Grid de 100 celdas: interfaz utilizable sin congelamientos prolongados.
- Procesamiento por lotes con progreso y cancelación.
- No duplicar innecesariamente data URLs grandes en estado React.

Preferir `Blob`, `ImageBitmap`, Object URLs e IndexedDB sobre cadenas base64 persistentes.

## 16. Seguridad y privacidad

- Procesamiento local por defecto.
- No subir imágenes sin consentimiento explícito.
- Validar tipo real del archivo, dimensiones y tamaño antes de decodificar.
- Limitar megapíxeles y cantidad de celdas para evitar agotamiento de memoria.
- Manejar errores de decodificación y canvas tainted.
- No renderizar nombres de archivo como HTML.

## 17. Pruebas obligatorias

### Unitarias

- Detección de gutters.
- Clustering de líneas.
- Conversión de rectángulos entre preview y resolución original.
- Detección de celda vacía.
- Crop cuadrado y padding.
- Sanitización de nombres.
- Validadores Twitch.

### Integración

- Imagen de referencia 5 × 5 con 24 celdas.
- Grid con fondo transparente.
- Grid sin gutters.
- Grid con tamaños irregulares.
- Fondo blanco dentro del emote que no debe borrarse.
- Texto pegado al borde.
- Imágenes grandes y paquetes de 50–100 emotes.

### E2E

1. Subir grid.
2. Confirmar/corregir detección.
3. Desactivar celda vacía.
4. Aplicar eliminación de fondo.
5. Exportar ZIP.
6. Verificar cantidad, dimensiones y nombres.

## 18. Reglas de implementación para agentes

- Leer este archivo y los documentos en `docs/` antes de modificar código.
- Realizar cambios pequeños y verificables.
- No reescribir toda la aplicación sin necesidad.
- No romper el flujo actual de imágenes individuales.
- Separar cálculo puro de UI.
- Evitar mutaciones de arrays y objetos de estado.
- Añadir pruebas para algoritmos de geometría y exportación.
- Documentar decisiones no obvias.
- No afirmar que una característica está terminada sin demostrar sus criterios de aceptación.
- Ejecutar al menos `npm run lint` y `npm run build` antes de cerrar una entrega.

## 19. Orden recomendado de ejecución

1. Modelo de datos no destructivo.
2. Importación y análisis de una imagen grid.
3. Overlay editable de filas/columnas.
4. Generación de recortes.
5. Selección múltiple y aplicación por lote.
6. Validadores y presets Twitch.
7. Exportación con manifest.
8. Web Workers y optimizaciones.
9. Persistencia de proyectos.
10. Herramientas avanzadas de máscara.

## 20. Definición de terminado

Una entrega relacionada con grids está terminada únicamente cuando:

- Funciona con la imagen de referencia.
- El usuario puede corregir una detección incorrecta.
- La celda vacía no se exporta.
- Los recortes no se deforman.
- La transparencia se conserva.
- Se generan salidas Twitch válidas.
- La app no bloquea el flujo existente.
- Hay pruebas del algoritmo nuevo.
- Lint y build pasan.
- La documentación se actualiza.
