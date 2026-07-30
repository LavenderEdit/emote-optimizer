# Especificación de exportación y validación para Twitch

## 1. Propósito

Centralizar las reglas de salida para evitar que dimensiones, pesos o nombres estén dispersos por componentes y utilidades.

La aplicación debe manejar dos modos de carga de Twitch:

- Auto-resize.
- Manual.

Las reglas deben vivir en presets versionados, no como constantes sueltas dentro de `exportUtils.js`.

## 2. Fuentes oficiales consultadas

- Emote Formatting & Instant Emote Upload Requirements: https://help.twitch.tv/s/article/emote-guidelines
- Subscriber Emote Guide: https://help.twitch.tv/s/article/subscriber-emote-guide
- Twitch API Reference — escalas 1.0, 2.0 y 3.0: https://dev.twitch.tv/docs/api/reference

Fecha de revisión de esta especificación: 2026-07-30.

## 3. Preset `twitch-static-auto`

Requisitos:

- Formato PNG.
- No animado.
- Cuadrado.
- Resolución mínima: 112 × 112 px.
- Resolución máxima: 4096 × 4096 px.
- Peso máximo: 1 MB.
- Fondo totalmente transparente.

Salida recomendada por emote:

```text
masters/<safe-name>.png
```

Resolución predeterminada sugerida del maestro:

- 112 × 112 cuando se prioriza peso y simplicidad.
- 448 × 448 o superior cuando se desea conservar un maestro reutilizable, siempre que quede por debajo del límite.

No asumir que mayor resolución siempre produce mejor resultado en Twitch. El usuario debe poder elegir.

## 4. Preset `twitch-static-manual`

Requisitos:

- PNG.
- Cuadrado.
- Tres archivos de la misma ilustración:
  - 112 × 112 px.
  - 56 × 56 px.
  - 28 × 28 px.
- Fondo transparente.
- El Subscriber Emote Guide indica que cada archivo manual debe ser menor de 100 KB.

Salida recomendada:

```text
twitch-manual/<safe-name>/<safe-name>_112.png
twitch-manual/<safe-name>/<safe-name>_56.png
twitch-manual/<safe-name>/<safe-name>_28.png
```

## 5. Modelo de preset

```js
export const twitchStaticManual = {
  id: 'twitch-static-manual',
  version: '2026-07-30',
  label: 'Twitch estático — carga manual',
  format: 'image/png',
  animated: false,
  square: true,
  transparentBackground: true,
  outputs: [
    { width: 112, height: 112, maxBytes: 100_000 },
    { width: 56, height: 56, maxBytes: 100_000 },
    { width: 28, height: 28, maxBytes: 100_000 }
  ]
};
```

Usar bytes decimales en UI cuando el texto oficial hable de KB/MB, pero documentar internamente la convención para evitar inconsistencias.

## 6. Pipeline de salida

```text
Master source
  -> Apply crop and mask at source resolution
  -> Create square working master
  -> Apply global adjustments
  -> Generate each target size independently
  -> Apply optional size-specific tuning
  -> Encode PNG
  -> Inspect bytes and pixels
  -> Optimize if needed
  -> Validate
  -> Add to ZIP and manifest
```

No generar 28 desde 56 ni 56 desde 112 si existe un maestro de mayor resolución. Cada tamaño debe provenir del maestro cuadrado.

## 7. Redimensionamiento

Recomendación inicial:

1. Crear canvas cuadrado maestro.
2. Reducir progresivamente por mitades cuando la relación sea grande.
3. Finalizar con `imageSmoothingEnabled = true` y `imageSmoothingQuality = 'high'`.
4. Permitir sharpen leve específico por tamaño después del resize.
5. Verificar alpha premultiplicado y halos.

Para 28 px, no aplicar el mismo sharpen que a 112 px por defecto.

## 8. Transparencia

Validaciones:

- Debe existir al menos un píxel con alpha menor de 255, salvo que el usuario confirme una excepción.
- El fondo exterior del contenido debe ser alpha 0.
- No aceptar una imagen blanca opaca como equivalente a transparencia.
- Revisar bordes con alpha parcial para detectar halos claros.

Métricas útiles:

- `transparentPixelRatio`.
- `semiTransparentPixelRatio`.
- `opaqueBoundingBox`.
- Color medio de píxeles semitransparentes.

## 9. Encuadre

Validar:

- Bounding box visible no toca los cuatro límites sin padding.
- Ocupación mínima configurable.
- Ocupación máxima configurable.
- Centro de masa razonablemente centrado.
- El contenido no queda demasiado pequeño en 28 px.

Los warnings de encuadre no deben bloquear la exportación si el usuario los confirma.

## 10. Peso y optimización

### 10.1 Estrategia

1. Codificar PNG.
2. Medir bytes reales del Blob.
3. Si excede el límite:
   - Retirar metadata no necesaria.
   - Reducir resolución solo en auto-resize y con confirmación/preset.
   - Evaluar cuantización de paleta únicamente si conserva alpha y calidad.
   - Reducir ruido invisible en áreas transparentes.
4. Revalidar después de cada optimización.

### 10.2 Regla importante

No reducir calidad silenciosamente. Mostrar:

- Peso anterior.
- Peso final.
- Acción aplicada.
- Diferencia visual si corresponde.

## 11. Nombres de archivo

Sanitización:

- Minúsculas por defecto.
- Reemplazar espacios y caracteres incompatibles por `_`.
- Eliminar repeticiones de `_`.
- Evitar nombres vacíos.
- Garantizar unicidad con contador.
- Mantener longitud razonable.

Ejemplo:

```js
sanitizeName('Más te vale callarte') // mas_te_vale_callarte
```

La transliteración debe ser determinista.

## 12. Manifest

Cada exportación debe incluir `manifest.json`:

```json
{
  "app": "EmoteStudio Pro",
  "exportedAt": "ISO-8601",
  "preset": {
    "id": "twitch-static-manual",
    "version": "2026-07-30"
  },
  "source": {
    "width": 994,
    "height": 1001,
    "grid": { "rows": 5, "columns": 5 }
  },
  "items": [
    {
      "id": "...",
      "name": "incomodo_inesperado",
      "row": 1,
      "column": 1,
      "outputs": [
        {
          "path": "twitch-manual/incomodo_inesperado/incomodo_inesperado_112.png",
          "width": 112,
          "height": 112,
          "bytes": 12345,
          "valid": true,
          "warnings": []
        }
      ]
    }
  ]
}
```

## 13. Reporte visual

Incluir opcionalmente `report.html` con:

- Preview sobre fondo claro, oscuro y checkerboard.
- 112/56/28 al tamaño real.
- Peso por archivo.
- Estado de validación.
- Warnings.
- Nombre y posición en el grid.

El reporte debe abrirse localmente sin dependencias externas.

## 14. Errores bloqueantes

- Formato diferente a PNG para preset estático.
- Dimensión incorrecta.
- Aspect ratio diferente de 1:1.
- Archivo por encima del límite.
- Error de codificación.
- Nombre duplicado no resuelto.
- Salida vacía o completamente transparente.

## 15. Warnings

- No se detectó transparencia.
- Contenido toca el borde.
- Ocupación demasiado baja.
- Texto ilegible en 28 px.
- Halo claro probable.
- Celda marcada como posiblemente vacía.
- Contraste deficiente en fondo claro u oscuro.

## 16. UI de validación

Mostrar una tabla o cuadrícula con:

| Emote | 112 | 56 | 28 | Transparencia | Peso | Estado |
|---|---|---|---|---|---|---|

Permitir:

- Filtrar por error/warning.
- Seleccionar elementos fallidos.
- Aplicar correcciones masivas.
- Revalidar sin regenerar resultados que no cambiaron.

## 17. Pruebas

- Dimensiones exactas para los tres tamaños.
- Archivo cuadrado.
- PNG real, no solo extensión `.png`.
- Alpha conservado.
- Límite de bytes.
- Nombres únicos y deterministas.
- Manifest consistente con los archivos del ZIP.
- ZIP con 24 emotes produce 72 PNG en modo manual.
- Celda vacía deshabilitada no aparece en el ZIP.
- La misma fuente produce resultados reproducibles.

## 18. Mantenimiento

- Revisar requisitos oficiales antes de cada release importante.
- Actualizar `version` del preset cuando cambie una regla.
- No sobrescribir presets anteriores usados por proyectos guardados; migrarlos explícitamente.
