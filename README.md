# 🎨 EmoteStudio Pro (Emote Optimizer)

**EmoteStudio Pro** es una aplicación web avanzada diseñada para la optimización, edición y exportación en lote de emotes para plataformas de streaming como **Twitch** y **Discord**.

Desarrollada con **React**, permite a los creadores de contenido preparar sus recursos gráficos de manera rápida, eficiente y profesional directamente desde el navegador.

---

## 🧩 Nueva dirección: Grid Pack Studio

El siguiente objetivo principal del proyecto es procesar una sola imagen que contiene un **grid completo de emotes** y convertirla automáticamente en archivos independientes.

El flujo previsto incluye:

- Detección automática de filas, columnas, márgenes y separaciones.
- Overlay editable para corregir cada celda.
- Detección y exclusión de celdas vacías.
- Recorte cuadrado sin deformar ni cortar contenido.
- Eliminación de fondos blancos, grises o cromas conservando detalles internos.
- Edición individual, por selección o aplicada a todo el paquete.
- Previsualización real en 112, 56 y 28 px.
- Validación de dimensiones, transparencia y peso.
- Exportación Twitch en modo auto-resize o manual.

La documentación funcional y técnica para desarrollar esta mejora se encuentra en:

- [`AGENTS.md`](./AGENTS.md)
- [`docs/PRODUCT_REQUIREMENTS.md`](./docs/PRODUCT_REQUIREMENTS.md)
- [`docs/GRID_DETECTION_DESIGN.md`](./docs/GRID_DETECTION_DESIGN.md)
- [`docs/TWITCH_EXPORT_SPEC.md`](./docs/TWITCH_EXPORT_SPEC.md)
- [`docs/IMPLEMENTATION_ROADMAP.md`](./docs/IMPLEMENTATION_ROADMAP.md)

---

## 🚀 Características Principales

### 🧩 Procesamiento por Lotes
- Carga múltiples imágenes simultáneamente (PNG, JPG, WEBP).
- Soporte para selección manual o *drag & drop*.

### 🎯 Eliminación de Fondo Inteligente
- Herramienta de gotero interactiva.
- Algoritmo **Flood Fill** con tolerancia ajustable.
- Eliminación precisa de fondos o croma.

### 🖌️ Pincel de Restauración
- Recupera áreas borradas accidentalmente.
- Atajo: `Shift + Arrastrar`.

### 🎚️ Ajustes de Imagen Profesionales
- Brillo
- Contraste
- Saturación
- Enfoque (*Sharpening*)
- Procesamiento a nivel de pixel.

### ⚪ Borde Automático
- Generación de contornos blancos dinámicos.
- Mejora la legibilidad sobre fondos oscuros.

### 👀 Previsualización en Tiempo Real
- Visualización en resoluciones de Twitch:
  - 112px
  - 56px
  - 28px

### 💬 Simulador de Chat
- Simula el comportamiento del emote en chat real.
- Compatible con modo claro y oscuro.

### 📦 Exportación Empaquetada
- Redimensionamiento de alta calidad.
- Generación automática de todas las resoluciones.
- Exportación en archivo `.zip` listo para subir.

### ↩️ Historial de Cambios
- Sistema de deshacer (`Ctrl + Z`).

---

## 🏗️ Arquitectura y Tecnologías

El proyecto utiliza herramientas modernas del ecosistema frontend para garantizar alto rendimiento en procesamiento de imágenes:

- **Framework:** React 19
- **Build Tool:** Vite
- **Estilos:** Tailwind CSS v4
- **Iconos:** Lucide React
- **Manejo de archivos:** JSZip
- **Procesamiento de imágenes:** Canvas API (algoritmos personalizados)

---

## 📁 Estructura del Proyecto

```text
/src
├── components/
│   ├── UI
│   ├── Layout
│   └── Workspace
│
├── hooks/
│   ├── useCanvasInteraction
│   ├── useDragAndDrop
│   ├── useEmoteBatch
│   └── useImageProcessor
│
├── utils/
│   ├── imageProcessing/
│   │   ├── floodFill
│   │   ├── convolution
│   │   └── colorAlgorithms
│   │
│   └── exportUtils.js
```

---

## ⚙️ Instalación y Uso Local

### 📌 Requisitos
- Node.js instalado

### 🔧 Pasos

```bash
# Clonar el repositorio
git clone <url-del-repositorio>

# Entrar al proyecto
cd emote-optimizer

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

Abrir en el navegador:

```text
http://localhost:5173
```

---

## 🧪 Comandos Disponibles

```bash
npm run dev       # Ejecuta en modo desarrollo (HMR)
npm run build     # Construcción para producción
npm run preview   # Previsualiza build de producción
npm run lint      # Analiza el código con ESLint
```

---

## 🛠️ Guía de Uso

### 📤 Subir Imagen

- Arrastra archivos al lienzo o usa el botón de subida.
- Soporta múltiples imágenes.

### 🎯 Borrar Color

- Selecciona el gotero.
- Haz clic en el color de fondo.
- Ajusta la tolerancia si es necesario.

### 🖌️ Restaurar Áreas

- Mantén `Shift` y arrastra sobre zonas borradas.

### 📦 Exportar

- Haz clic en **Exportar Emotes**.
- Se generará un archivo `.zip` con todas las resoluciones.

---

## 💡 Notas Técnicas

- Procesamiento completamente en cliente (browser).
- Uso intensivo de Canvas API para manipulación a nivel de pixel.
- Algoritmos optimizados:
  - Flood Fill
  - Convolución (sharpen)
  - Reducción progresiva de imagen

---

## 📌 Futuras Mejoras

- Importación y recorte de grids de paquetes.
- Selección múltiple y ajustes masivos.
- Presets y validadores versionados.
- Persistencia local de proyectos.
- Soporte para GIF animados.
- Integración directa con APIs de Twitch/Discord.
- Presets de estilos de emotes.
- IA local para eliminación de fondo.

---

## 🧑‍💻 Autor

Juan S. Pimentel Lalangui

---

## Implementado ahora

Comandos nuevos:

```bash
npm run test
npm run test:watch
npm run test:coverage
```

Flujo manual de grid:

- Usa `Paquete en grid` para cargar una sola imagen compuesta.
- Ajusta filas, columnas, margenes, gutters e inset desde el panel lateral.
- Arrastra las guias del overlay para corregir limites antes de recortar.
- Haz clic en una celda o usa la lista de revision para activarla, omitirla o marcarla como vacia.
- `Generar recortes` crea emotes independientes desde las celdas activas sin estirar contenido rectangular.
- La exportacion Twitch manual usa un canvas cuadrado transparente con encuadre `contain` y escribe `manifest.json` y `export-report.json` dentro del ZIP.
