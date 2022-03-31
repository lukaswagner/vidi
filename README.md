# topicmap

## Quickstart

- Install [node.js](https://nodejs.org/)
- Install dependencies: `npm i`
- Start the dev server: `npm run start-dev`

## Used Technologies

- [TypeScript](https://www.typescriptlang.org/) for writing type-safe JS
- [webgl-operate](https://webgl-operate.org/) as wrapper for WebGL
- [Webpack](https://webpack.js.org/) as build system
- [Pug](pugjs.org) for building the page

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

## Usage as sub-window

```ts
const configuration = {
    data: 'https://api.varg.dev/users/topicmap/datasets/topics/data',
    axes: ['first', 'second', 'third']
};
const child = window.open('http://vidi.lwgnr.dev');
child.addEventListener('message', (msg) => {
    if(msg.data.type === 'ready')
        child.postMessage({ type: 'configuration', preset });
});
```

For more details see [interface.ts](./source/code/frontend/interface.ts).
