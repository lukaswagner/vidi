# topicmap

## Quickstart

- Install [node.js](https://nodejs.org/)
- Install dependencies: `npm i`
- \[optional\] Build page: `npm run build` (or `npm run watch`) - the server started with `npm start` automatically builds the page, this is only required if you want to host the page otherwise.
- \[optional\] Add data as `data/*.csv`
- \[optional\] Add `credentials.json` file to add password protection
- Start server to host page: `npm start`

Options for hosting using `npm start`:
- Statically built page: build the page first, then pass `--static-page=path`
- Dynamically built page with auto-reload: rebuilds the page automatically on source changes and reloads it
- Dynamically built page without auto-reload: pass `--disable-reload` to avoid the automatic reload when rebuilding the page

## Used Technologies

- Frontend (webpage):
  - [TypeScript](https://www.typescriptlang.org/) for writing type-safe JS
  - [webgl-operate](https://webgl-operate.org/) as wrapper for WebGL
  - [Webpack](https://webpack.js.org/) as build system
  - [Pug](pugjs.org) for building the page
  - [Bootstrap](https://getbootstrap.com/) for styling
- Server:
  - [Express](https://expressjs.com/de/) for hosting the built page and the data

## Source Dir Overview

- `code`: Any actual code (JS/TS/GLSL)
  - `frontend`: The code running in the browser
    - `grid/*`: Rendering the grid
    - `points/*`: Rendering and styling the points
    - `ui/*`: Wrapper classes for the sidebar controls
    - `util/*`: Helper code
    - `app.ts`: Entrypoint, manages everything
    - `controls.ts`: Connects to the HTML UI elements
    - `data.ts`: Represents loaded csv file, handles parsing
    - `icons.ts`: Wrapper for loading fontawesome icons
    - `renderer.ts`: Sets up and runs the different rendering passes
  - `server`: Hosting the page and data
- `css`: Custom style in addition to bootstrap
- `fonts`: Contains the fonts used for labels in WebGL
- `pages`: Pug files which are compiled to HTML

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
