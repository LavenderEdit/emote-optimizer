# Diseño técnico — Detección y recorte de grids

## 1. Objetivo

Convertir una imagen compuesta en una colección de regiones editables y reproducibles. El algoritmo debe funcionar con grids regulares, tolerar márgenes y gutters, detectar celdas vacías y ofrecer corrección manual.

No se considera aceptable una solución que únicamente divida la imagen en `rows × columns` sin analizar márgenes, separación o contenido.

## 2. Imagen de referencia

Archivo analizado:

- Resolución: 994 × 1001 px.
- Modo: RGBA.
- Patrón: 5 columnas × 5 filas.
- Celdas visibles: 24.
- Celda vacía: fila 5, columna 5.

Cajas aproximadas detectadas en coordenadas de la fuente:

| Fila | Y | Alto |
|---|---:|---:|
| 1 | 28 | 164 |
| 2 | 226 | 164 |
| 3 | 424 | 164 |
| 4 | 622 | 163 |
| 5 | 819 | 164 |

| Columna | X | Ancho |
|---|---:|---:|
| 1 | 14 | 165 |
| 2 | 213 | 165 |
| 3 | 412 | 165 |
| 4 | 611–612 | 164–166 |
| 5 | 810 | 166 |

Características útiles:

- Fondo exterior blanco.
- Tarjetas internas gris muy claro.
- Las tarjetas están separadas por corredores blancos continuos.
- Hay pequeñas variaciones de 1–2 px en ancho, alto y posición.
- Las esquinas de las tarjetas son redondeadas.
- El contenido interno puede incluir blanco, gris, negro, piel y texto.

La detección no debe borrar por color global las áreas blancas internas del personaje o del texto.

## 3. Pipeline propuesto

```text
Decode
  -> Normalize orientation
  -> Analysis thumbnail
  -> Background estimation
  -> Foreground/card mask
  -> Projection profiles
  -> Candidate gutters
  -> Row/column clustering
  -> Cell generation
  -> Empty-cell scoring
  -> Confidence scoring
  -> Editable overlay
```

## 4. Decodificación y normalización

1. Validar MIME y firma cuando sea posible.
2. Rechazar dimensiones o megapíxeles fuera de límites configurables.
3. Decodificar con `createImageBitmap` cuando esté disponible.
4. Aplicar orientación EXIF antes del análisis.
5. Conservar ancho y alto originales.
6. Crear una miniatura de análisis con lado máximo de 1024–1600 px.
7. Guardar escalas `analysisToSourceX` y `analysisToSourceY`.

Toda geometría final debe mapearse a la imagen original antes de recortar.

## 5. Estimación de fondo

Tomar muestras en:

- Cuatro esquinas.
- Bordes superior, inferior, izquierdo y derecho.
- Una banda configurable de 1–3%.

Usar mediana por canal o clustering de color para evitar que una ilustración tocando el borde contamine la muestra.

Salida sugerida:

```js
{
  color: [r, g, b, a],
  variance: number,
  confidence: number,
  isTransparent: boolean
}
```

## 6. Máscaras de análisis

Generar al menos dos máscaras:

### 6.1 Máscara de diferencia al fondo

```text
foreground = colorDistance(pixel, estimatedBackground) > threshold
```

No usar únicamente distancia RGB absoluta. Preferencias:

1. Lab / Delta E aproximado.
2. RGB lineal ponderado.
3. HSV con control separado de luminancia y saturación.

### 6.2 Máscara de tarjeta

Para casos como la referencia, buscar regiones grandes con:

- Luminancia casi uniforme.
- Saturación baja.
- Tamaños similares.
- Alineación regular.
- Fondo distinto al exterior.

Una tarjeta no equivale necesariamente al contenido final; sirve para detectar la celda.

## 7. Operaciones morfológicas

Aplicar con moderación sobre la miniatura:

- `close` para unir cortes pequeños.
- `open` para retirar ruido.
- Kernel proporcional a la resolución, nunca fijo para todos los tamaños.

No modificar la imagen original; estas operaciones solo pertenecen al análisis.

## 8. Perfiles de proyección

Calcular ocupación por columna y fila:

```js
vertical[x] = sum(mask[y][x]) / height
horizontal[y] = sum(mask[y][x]) / width
```

Un gutter candidato es una secuencia donde la ocupación cae por debajo de un umbral durante un ancho mínimo.

### 8.1 Consolidación de gutters

- Unir runs separados por gaps muy pequeños.
- Ignorar runs demasiado estrechos.
- Mantener margen exterior separado de gutters internos.
- Convertir cada run a una línea central y ancho estimado.

### 8.2 Regularidad

Puntuar:

- Varianza de ancho de celda.
- Varianza de alto de celda.
- Varianza de gutter.
- Alineación de bordes.
- Número de celdas con ocupación razonable.

## 9. Componentes conectados y contornos

Como señal complementaria:

1. Obtener componentes grandes de la máscara de tarjeta/foreground.
2. Filtrar por área relativa.
3. Calcular bounding boxes.
4. Agrupar centros X y Y con tolerancia proporcional.
5. Inferir filas y columnas.

No depender exclusivamente de contornos: el contenido de varias celdas puede tocarse visualmente o la tarjeta puede no existir.

## 10. Autocorrelación y periodicidad

Cuando los gutters no sean blancos o claros, calcular autocorrelación de los perfiles para encontrar periodos repetitivos.

Esto ayuda en:

- Fondos con textura.
- Líneas divisorias finas.
- Grids sin espacio blanco continuo.

La periodicidad debe producir candidatos, no una decisión irreversible.

## 11. Generación de celdas

Cada combinación de límites X/Y produce una celda candidata.

```js
{
  id,
  row,
  column,
  sourceRect,
  contentRect,
  enabled: true,
  empty: false,
  confidence,
  diagnostics
}
```

`sourceRect` incluye la celda geométrica. `contentRect` se calcula después mediante trim/inset.

## 12. Detección de celdas vacías

Combinar:

- Ocupación de foreground.
- Varianza de luminancia.
- Entropía.
- Número de bordes.
- Área de componentes conectados.
- Diferencia con el patrón de tarjeta vacía.

Ejemplo de score:

```text
emptyScore =
  lowForegroundWeight * (1 - foregroundRatio)
  + lowEntropyWeight * (1 - normalizedEntropy)
  + lowEdgeWeight * (1 - edgeDensity)
```

No eliminar automáticamente una celda con score ambiguo. Marcarla como `posiblemente vacía` y permitir confirmación.

## 13. Confianza

### 13.1 Confianza global

Componentes:

- Regularidad geométrica.
- Cobertura de la imagen.
- Consistencia de gutters.
- Consistencia de tarjetas.
- Porcentaje de celdas válidas.

### 13.2 Confianza por celda

Componentes:

- Ajuste a la grilla.
- Ocupación.
- Distancia respecto al tamaño mediano.
- Posible solapamiento.
- Posible corte de contenido.

La interfaz debe distinguir al menos:

- Alta: verde.
- Media: amarilla.
- Baja: roja.

## 14. Modos de segmentación

### 14.1 Automático

El sistema propone todo el grid.

### 14.2 Filas y columnas

El usuario indica número de filas/columnas. El sistema estima márgenes y gutters.

### 14.3 Uniforme

Divide el área seleccionada en partes iguales. Útil como fallback.

### 14.4 Guías manuales

El usuario agrega, mueve o elimina líneas X/Y.

### 14.5 Regiones libres

El usuario dibuja rectángulos independientes para collages irregulares.

## 15. Overlay editable

El overlay debe incluir:

- Líneas divisorias.
- Área de margen.
- Handles de movimiento.
- Número de fila/columna.
- Checkbox por celda.
- Estado de vacío/confianza.
- Preview del recorte.

Operaciones:

- Drag de líneas.
- Nudge con flechas.
- Shift para movimiento fino/grueso.
- Doble clic para editar una celda.
- Context menu o toolbar para dividir/fusionar/eliminar.

## 16. Trim de tarjeta y fondo

Después de segmentar una celda:

1. Estimar el color de sus bordes.
2. Detectar la tarjeta o fondo uniforme.
3. Calcular bounding box del contenido.
4. Expandir con padding de seguridad.
5. Conservar el resultado como `contentRect` editable.

No confundir un borde blanco del texto con el fondo. El trim debe iniciar desde bordes conectados, no desde todos los píxeles similares del interior.

## 17. Crop cuadrado

Modos:

### Contain

- Mantener todo el contenido.
- Añadir espacio transparente hasta formar un cuadrado.

### Cover

- Llenar el cuadrado.
- Puede recortar; debe mostrar warning y preview.

### Manual

- Caja cuadrada movible y escalable.

El modo predeterminado para paquetes debe ser `contain` con padding moderado.

## 18. Mapeo de coordenadas

Toda coordenada de preview debe convertirse con una matriz o funciones puras:

```js
sourceX = (previewX - viewportOffsetX) / zoom
sourceY = (previewY - viewportOffsetY) / zoom
```

Añadir pruebas para:

- Zoom distinto de 1.
- Pan.
- Device pixel ratio.
- Miniatura de análisis no uniforme.
- Redondeo en bordes.

## 19. Rendimiento

- Ejecutar análisis en Web Worker.
- Transferir `ImageBitmap` cuando el navegador lo permita.
- Evitar copiar grandes `ImageData` repetidamente.
- Cancelar análisis anterior al cambiar parámetros.
- Debounce de sliders/guías.
- Calcular previews en miniatura y exportar con resolución original.

## 20. API interna sugerida

```js
analyzeGrid(imageBitmap, options) => Promise<GridAnalysis>

segmentGrid(gridAnalysis, edits) => GridCell[]

extractCell(source, cell, options) => Promise<EmoteDocument>

scoreEmptyCell(imageData, rect, backgroundModel) => EmptyCellScore

mapRect(rect, fromSpace, toSpace) => Rect
```

Todas las funciones geométricas y de scoring deben ser testeables sin React.

## 21. Fixtures de prueba

Crear fixtures sintéticos además de la imagen real:

- 2 × 2 con gutters blancos.
- 5 × 5 con una celda vacía.
- 4 × 3 sin margen exterior.
- 3 × 3 con fondo transparente.
- Grid con gutters oscuros.
- Grid con tarjetas de ancho variable.
- Collage irregular.
- Contenido blanco sobre fondo blanco conectado solo por una zona pequeña.

## 22. Criterios de aceptación técnicos

- Detecta el grid 5 × 5 de referencia con tolerancia máxima de 3 px en bordes de tarjeta.
- Marca la celda 25 como vacía o potencialmente vacía.
- Genera 24 recortes habilitados.
- Permite corregir líneas antes de extraer.
- No modifica la resolución fuente durante el análisis.
- No bloquea el hilo principal durante una detección pesada.
- Todas las transformaciones de coordenadas tienen pruebas unitarias.
