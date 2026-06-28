# 🎵 Progression Finder

Herramienta interactiva para construir, analizar y reproducir progresiones de acordes diatónicas en tiempo real, usando cifrado americano.

**[🚀 Ver demo en vivo →](https://estebanzen.github.io/Progression-Finder/)**

---

## Características

- 🎹 Análisis diatónico de tríadas y acordes de séptima
- 🎸 Diagramas de guitarra con posiciones hasta el traste 21
- 🎶 Modos de reproducción: **Chord** (bloque) y **Arpeggio** (secuencial)
- 🎛️ Selector de instrumento: Piano, Rhodes, Wurlitzer, Clavinet, Nylon Guitar, Jazz Guitar
- 🔊 Samples de audio locales (sin dependencias externas, funciona offline)
- 💾 Configuración persistente en `localStorage`
- 📤 Exportar diagramas de guitarra como imagen
- 📱 Diseño responsive con modo compacto

---

## Stack

| Tecnología | Uso |
|---|---|
| [React 19](https://react.dev/) | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | Tipado estático |
| [Vite](https://vite.dev/) | Bundler y dev server |
| [Tone.js](https://tonejs.github.io/) | Motor de audio |
| [Lucide React](https://lucide.dev/) | Iconos |

---

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build de producción
npm run build
```

## Publicar en GitHub Pages

```bash
npm run deploy
```

---

## Repositorio

[github.com/estebanzen/Progression-Finder](https://github.com/estebanzen/Progression-Finder)
