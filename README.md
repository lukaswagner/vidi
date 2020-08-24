# topicmap

## Quickstart

- Install [node.js](https://nodejs.org/)
- Install dependencies: `npm i`
- Start the dev server: `npm run start-dev`

## Available Scripts

### Modes:
- `start-*`: Starts a dev server (builds the page in memory)
- `build-*`: Builds the page to disk
- `watch-*`: Builds the page to disk ant rebuilds if changes are detected
### Configs:
- `*-dev`: Unminified, contains source map
- `*-prod`: Minified

## Used Technologies

- [TypeScript](https://www.typescriptlang.org/) for writing type-safe JS
- [webgl-operate](https://webgl-operate.org/) as wrapper for WebGL
- [Webpack](https://webpack.js.org/) as build system
- [Pug](pugjs.org) for building the page
- [Bootstrap](https://getbootstrap.com/) for styling

## Rendering Setup

- The `TopicMapRenderer`
  - Creates and manages the different render passes
  - Provides a framebuffer for the passes to render to
  - Uses an additional AccumulatePass to provide MFAA
- Each render pass
  - Prepares the geometry to render
  - Prepares a shader program
  - Can be updated by assigning to the exposed members
  - Is invoked by the Renderer using `frame()`
