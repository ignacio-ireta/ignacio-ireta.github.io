# Investigación Revolucionaria en IA - Sitio Web de Presentación del Proyecto

Un sitio web limpio y enfocado en el rendimiento construido desde cero para mostrar resultados de proyectos. **Sin frameworks, sin complicaciones, solo HTML, CSS y JavaScript puro** que funciona perfectamente.

## 🎯 Lo Que Aprendimos y Aplicamos

Esta reconstrucción incorpora todas las lecciones aprendidas de nuestras iteraciones anteriores:

- ✅ **Centrado Perfecto**: El contenido hero está correctamente centrado sin problemas de diseño
- ✅ **Rendimiento Primero**: Sin frameworks pesados, imágenes optimizadas, carga perezosa
- ✅ **Arquitectura Limpia**: Estructura de código simple y mantenible
- ✅ **Diseño Responsivo**: Funciona hermosamente en todos los dispositivos
- ✅ **Integración de Assets**: Manejo adecuado de imágenes, videos y modelos 3D

## 🚀 Inicio Rápido

1. **Clona o descarga** este repositorio
2. **Abre `index.html`** en tu navegador - ¡eso es todo!
3. **Para desarrollo local** con un servidor:
   ```bash
   python -m http.server 8000
   # o
   npm start
   ```

## 📁 Estructura del Proyecto

```
ss-website/
├── index.html          # Archivo principal del sitio web
├── style.css           # Todo el estilo (¡no se necesitan frameworks!)
├── script.js           # Funcionalidad interactiva
├── package.json        # Configuración simple del proyecto
├── PLAN.md            # Hoja de ruta técnica (preservado)
├── requirements.md    # Requerimientos del proyecto (preservado)
└── assets/            # Todos los assets multimedia (preservados)
    ├── images/        # Imágenes y favicon
    ├── videos/        # Demostraciones en video
    ├── models/        # Modelos 3D (archivos .glb)
    └── data/          # Datos de gráficos (JSON)
```

## 🎨 Características

### Características Principales
- **Sección Hero**: Perfectamente centrada con tarjetas KPI y animaciones suaves
- **Navegación Responsiva**: Encabezado fijo con desplazamiento suave a secciones
- **Galería de Imágenes**: Imágenes WebP de alta resolución con carga perezosa
- **Gráficos Interactivos**: Comparaciones de rendimiento usando Chart.js
- **Visor de Modelos 3D**: Visualización interactiva de redes neuronales
- **Demostraciones en Video**: Reproducción de video local con controles adecuados
- **Perfiles del Equipo**: Presentación limpia de miembros del equipo
- **Sistema de Citación**: Funcionalidad de copia con un clic

### Optimizaciones de Rendimiento
- **Carga Perezosa**: Las imágenes se cargan solo cuando son visibles
- **Formato WebP**: Formato de imagen moderno para tamaños de archivo más pequeños
- **Precarga**: Recursos críticos cargados primero
- **CSS Eficiente**: Sin código de framework no utilizado
- **Animaciones Suaves**: Transiciones aceleradas por hardware

## 🛠️ Personalización con Tus Datos

### 📸 **Imágenes**
Actualmente usa marcadores de posición de Lorem Picsum. Reemplaza con tu contenido:

#### **Imagen de Fondo del Hero**
- **Ubicación**: `index.html` línea ~46
- **Actual**: `https://picsum.photos/2560/1440.webp`
- **Reemplazar con**: Imagen hero de tu proyecto (2560x1440 recomendado)
- **Formato**: WebP preferido, JPG/PNG compatible

#### **Imágenes de Contenido**
Reemplaza las URLs de Lorem Picsum en todo `index.html`:
- **Imagen de Resumen**: Línea ~82 - `https://picsum.photos/1920/1080.webp`
- **Diagrama de Innovación**: Línea ~92 - `https://picsum.photos/1920/1080.webp`
- **Imágenes Antes/Después**: Líneas ~118, 123 - `https://picsum.photos/1920/1080.webp`
- **Ejemplos de Galería**: Líneas ~138, 142, 146 - `https://picsum.photos/1920/1080.webp`
- **Fotos del Equipo**: Líneas ~225, 231, 237 - `person1.webp`, `person2.webp`, `person3.webp`

#### **Favicon**
- **Archivo**: `assets/images/favicon.ico`
- **Reemplazar**: Con el ícono de tu proyecto (32x32 o 64x64 píxeles)
- **Formatos**: ICO, PNG compatible

### 🎬 **Videos**
Agrega tus videos de demostración:

#### **Video Actual**
- **Archivo**: `assets/videos/hero-background.mp4` (19MB)
- **Usado en**: `index.html` línea ~175
- **Reemplazar con**: Tu video de demostración (formato MP4 recomendado)
- **Optimización**: Mantener bajo 20MB para carga rápida

#### **Póster del Video**
- **Ubicación**: `index.html` línea ~175
- **Actual**: `https://picsum.photos/1200/675.webp`
- **Reemplazar con**: Imagen miniatura para tu video

### 🤖 **Modelos 3D**
Actualmente usa un modelo demo público:

#### **Para el Futuro:**
Cuando tengas un archivo GLB funcional, simplemente reemplaza la URL `src` en `index.html` línea 190 con la ruta de tu archivo local:
```html
<!-- Cambiar esto: -->
src="https://modelviewer.dev/shared-assets/models/Astronaut.glb"

<!-- Por esto: -->
src="assets/models/tu-modelo.glb"
```

#### **Requerimientos del Modelo 3D**
- **Formato**: glTF binario (.glb) para mejor rendimiento
- **Tamaño**: Mantener bajo 10MB para optimización web
- **Optimización**: Usar Blender o glTF-Pipeline para comprimir
- **Características**: Compatible con animaciones, materiales, texturas

### 📊 **Datos de Gráficos**
Actualiza las métricas de rendimiento en `assets/data/chart-data.json`:

```json
{
  "labels": ["Precisión", "Velocidad", "Memoria", "Escalabilidad", "Robustez", "Interpretabilidad"],
  "ourModel": [98.7, 95, 88, 92, 89, 85],
  "baseline": [85, 60, 70, 75, 72, 68]
}
```

**Personalización:**
- **Labels**: Cambiar nombres de métricas (6 recomendado para mejor balance visual)
- **ourModel**: Tus resultados como porcentajes (0-100)
- **baseline**: Valores de línea base de comparación (0-100)

### ✏️ **Text Content**
Update project information throughout `index.html`:

#### **Hero Section** (Lines 69-73)
- **Title**: "Revolutionary AI Research"
- **Subtitle**: Project description
- **KPI Numbers**: 98.7%, 50x, 3.2M metrics

#### **Project Details** (Lines 102-250)
- **Overview**: Lines 107-117 - Project description
- **Innovation**: Lines 128-138 - Technical details
- **Results**: Lines 145-155 - Outcome descriptions
- **Team**: Lines 222-244 - Team member information

#### **Citation** (Lines 250-265)
Actualizar información bibliográfica:
- **Autores**: Nombres de tu equipo
- **Título**: Título de tu paper
- **Revista**: Venue de publicación
- **DOI**: DOI de tu paper

### 🎨 **Styling & Branding**
Customize colors and branding in `style.css`:

#### **Brand Colors**
- **Primary Blue**: `#007bff` (buttons, links)
- **Success Green**: `#28a745` (positive metrics)
- **Purple Accent**: `#6f42c1` (highlights)
- **Hero Gradient**: Lines 62-63 - Background colors

#### **Typography**
- **Font Family**: Line 7 - System font stack
- **Heading Sizes**: Lines 86-87 - Title sizing
- **Body Text**: Line 8 - Default text styling

### 🚀 **Lista de Verificación de Inicio Rápido**
1. ✅ Reemplazar imagen de fondo del hero
2. ✅ Actualizar datos de gráficos con tus métricas  
3. ✅ Agregar tu video demo a `/assets/videos/`
4. ✅ Reemplazar URLs de Lorem Picsum con tus imágenes
5. ✅ Actualizar contenido de texto e información del equipo
6. ✅ Personalizar colores y branding
7. ✅ Agregar tu modelo 3D (opcional)
8. ✅ Actualizar información de citación
9. ✅ Probar en móvil y escritorio
10. ✅ Desplegar en GitHub Pages

### 💡 **Consejos Pro**
- **Optimización de Imágenes**: Usar formato WebP para tamaños de archivo más pequeños
- **Rendimiento**: Optimizar imágenes antes de agregar (comprimir a ~80% de calidad)
- **Responsivo**: Probar en diferentes tamaños de pantalla
- **Carga**: Mantener assets totales bajo 50MB para carga rápida
- **SEO**: Actualizar meta tags en la sección `<head>` para mejor visibilidad en buscadores

## 🎯 Filosofía de Diseño

1. **Simplicidad Sobre Complejidad**: HTML/CSS/JS puro en lugar de frameworks pesados
2. **Rendimiento Primero**: Todas las optimizaciones aplicadas desde el día uno
3. **Experiencia de Usuario**: Interacciones suaves y carga rápida
4. **Mantenibilidad**: Código limpio y legible que es fácil de modificar
5. **Accesibilidad**: HTML semántico y etiquetas ARIA apropiadas

## 🌐 Despliegue

### GitHub Pages
1. Subir al repositorio de GitHub
2. Ir a Settings → Pages
3. Seleccionar rama fuente (usualmente `main`)
4. Tu sitio estará en vivo en `https://nombredeusuario.github.io/nombre-repositorio`

### Otras Plataformas
- **Netlify**: Arrastra y suelta la carpeta
- **Vercel**: Conecta el repositorio de GitHub
- **Cualquier Servidor Web**: Sube archivos al directorio público

## 🔧 Compatibilidad de Navegadores

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

## 📝 Licencia

Licencia MIT - ¡Siéntete libre de usar y modificar para tus proyectos!

---

**Construido con ❤️ y lecciones aprendidas de la experiencia**