import {
    AccumulatePass,
    AntiAliasingKernel,
    Camera,
    ChangeLookup,
    Context,
    DefaultFramebuffer,
    EventHandler,
    EventProvider,
    Framebuffer,
    Invalidate,
    Navigation,
    Renderbuffer,
    Renderer,
    Texture2D,
    mat4,
    vec2,
    vec3,
    viewer,
} from 'webgl-operate';

import {
    Column,
    Float32Column,
} from '@lukaswagner/csv-parser';

import {
    DebugMode,
    DebugPass
} from './debug/debugPass';

import {
    ExtendedGridInfo,
    GridExtents,
    GridInfo,
    calculateExtendedGridInfo,
} from './grid/gridInfo';

import { ClusterInfo } from 'worker/clustering/interface';
import { ClusterVisualization } from './clustering/clusterVisualization';
import { GridHelper } from './grid/gridHelper';
import { GridLabelPass } from './grid/gridLabelPass';
import { GridOffsetHelper } from './grid/offsetHelper';
import { GridPass } from './grid/gridPass';
import { PointPass } from './points/pointPass';

const Roboto = {
    fnt: require('../../fonts/roboto/roboto.fnt'),
    png: require('../../fonts/roboto/roboto.png')
};

export class TopicMapRenderer extends Renderer {
    protected _altered = Object.assign(new ChangeLookup(), {
        any: false,
        msaa: false,
        multiFrameNumber: false,
        frameSize: false,
        canvasSize: false,
        framePrecision: false,
        clearColor: false,
        debugTexture: false,
        debugMode: false,
    });

    protected _gl: WebGL2RenderingContext;
    protected _rgbFormat: [GLuint, GLuint, GLuint];
    protected _indexFormat: [GLuint, GLuint, GLuint];
    protected _depthFormat: [GLuint, GLuint, GLuint];

    // scene data
    protected _camera: Camera;
    protected _navigation: Navigation;
    protected _gridInfo: GridInfo[];
    protected _gridOffsetHelper: GridOffsetHelper;

    protected _modelMatInfo: { extents: GridExtents, columns: Column[] } = {
        extents: undefined, columns: undefined
    };
    protected _modelMat: mat4;

    // render settings
    protected _msaa = 1;

    // aa modes
    protected _msEnabled: boolean;
    protected _mfEnabled: boolean;

    // multi sample buffers
    protected _msColor: Renderbuffer;
    protected _msDepth: Renderbuffer;
    protected _msFBO: Framebuffer;

    // single sample buffers
    protected _ssColor: Texture2D;
    protected _ssIndexHigh: Texture2D;
    protected _ssIndexLow: Texture2D;
    protected _ssDepth: Texture2D;
    protected _ssFBO: Framebuffer;

    // fbo to render to
    protected _renderFBO: Framebuffer;

    // aa control
    protected _ndcOffsetKernel: AntiAliasingKernel;
    protected _uNdcOffset: WebGLUniformLocation;

    // actual rendering passes
    protected _pointPass: PointPass;
    protected _gridPass: GridPass;
    protected _gridLabelPass: GridLabelPass;
    protected _clusterPass: ClusterVisualization;

    // final output
    protected _defaultFBO: DefaultFramebuffer;
    // output passes
    protected _accumulatePass: AccumulatePass;

    // debugging
    protected _debugMode: DebugMode = DebugMode.Off;
    protected _debugPass: DebugPass;

    // mouse interaction
    private _eventHandler: EventHandler;

    public updateUseDiscard(): void {
        this._pointPass.useDiscard = !viewer.Fullscreen.active();
    }

    public updateGrid(
        columns: string[], extents: GridExtents, subdivisions: number
    ): void {
        this._gridInfo = GridHelper.buildGrid(
            columns,
            extents,
            subdivisions
        );

        const extendedGridInfo = new Array<ExtendedGridInfo>();

        this._gridInfo.forEach((grid) => {
            const extended = calculateExtendedGridInfo(grid);
            extendedGridInfo.push(extended);
        });

        this._gridPass.gridInfo = extendedGridInfo;
        this._gridOffsetHelper.gridInfo = extendedGridInfo;
        this._modelMatInfo.extents = extents;
        this.updateModelMat();
        this.invalidate();
    }

    public updateData(): void {
        this.updateModelMat();
        this.invalidate();
    }

    public setColumn(index: number, column: Column): void {
        this._pointPass.setColumn(index, column);
        if (this.initialized) {
            this.invalidate();
        }
    }

    public setClusterData(name: string, data: ClusterInfo[]): void {
        this._clusterPass.setData(name, data);
    }

    public selectClusterData(name: string): void {
        const numClusters = this._clusterPass.selectData(name);
        this._pointPass.numClusters = numClusters;
    }

    public invalidate(): void {
        super.invalidate();
    }

    protected createRenderbuffer(
        format: GLuint, width = 1, height = 1, multisample = 1
    ): Renderbuffer {
        const buf = new Renderbuffer(this._context);
        buf.initialize(width, height, format, multisample);
        return buf;
    }

    protected createTexture(
        format: [GLuint, GLuint, GLuint], width = 1, height = 1
    ): Texture2D {
        const buf = new Texture2D(this._context);
        buf.initialize(width, height, ...format);
        return buf;
    }

    protected setupFBOs(): void {
        this._msEnabled = this._msaa > 1;
        this._mfEnabled =
            !!this._multiFrameNumber &&
            this._multiFrameNumber > 1;

        const enabled = (v: boolean): string => v ? 'ON' : 'OFF';

        const samples = Math.min(this._msaa, this.maxSamples);
        console.log(
            `MSAA ${enabled(this._msEnabled)}, ${samples} samples (req ${this._msaa}, max ${this.maxSamples})`);
        console.log(
            `MFAA ${enabled(this._mfEnabled)}, ${this._multiFrameNumber} samples`);
        const w = this._defaultFBO?.width ?? 1;
        const h = this._defaultFBO?.height ?? 1;

        if (this._msFBO?.initialized) this._msFBO.uninitialize();
        if (this._msColor?.initialized) this._msColor.uninitialize();
        if (this._msDepth?.initialized) this._msDepth.uninitialize();

        if (this._msEnabled) {
            this._msColor =
                this.createRenderbuffer(this._rgbFormat[0], w, h, samples);
            this._msDepth =
                this.createRenderbuffer(this._depthFormat[0], w, h, samples);
            this._msFBO = new Framebuffer(this._context, 'ms fbo');
            this._msFBO.initialize([
                [this._gl.COLOR_ATTACHMENT0, this._msColor],
                [this._gl.DEPTH_ATTACHMENT, this._msDepth]
            ]);
        }

        if (this._ssFBO?.initialized) this._ssFBO.uninitialize();
        if (this._ssColor?.initialized) this._ssColor.uninitialize();
        if (this._ssIndexHigh?.initialized) this._ssIndexHigh.uninitialize();
        if (this._ssIndexLow?.initialized) this._ssIndexLow.uninitialize();
        if (this._ssDepth?.initialized) this._ssDepth.uninitialize();

        this._ssColor = this.createTexture(this._rgbFormat, w, h);
        this._ssIndexHigh = this.createTexture(this._indexFormat, w, h);
        this._ssIndexLow = this.createTexture(this._indexFormat, w, h);
        this._ssDepth = this.createTexture(this._depthFormat, w, h);
        this._ssFBO = new Framebuffer(this._context, 'ss fbo');
        this._ssFBO.initialize([
            [this._gl.COLOR_ATTACHMENT0, this._ssColor],
            [this._gl.COLOR_ATTACHMENT1, this._ssIndexHigh],
            [this._gl.COLOR_ATTACHMENT2, this._ssIndexLow],
            [this._gl.DEPTH_ATTACHMENT, this._ssDepth]
        ]);

        this._renderFBO = this._msEnabled ? this._msFBO : this._ssFBO;

        this._pointPass.target = this._renderFBO;
        this._gridPass.target = this._renderFBO;
        this._gridLabelPass.target = this._renderFBO;
        this._clusterPass.target = this._renderFBO;
        this._accumulatePass.texture = this._ssColor;

        this._debugPass.setInputs(
            this._msFBO,
            this._msColor, this._msDepth,
            this._ssFBO,
            this._ssColor, this._ssIndexHigh, this._ssIndexLow, this._ssDepth);
    }

    /**
     * Initializes and sets up buffer, cube geometry, camera and links shaders
     * with program.
     * @param context - valid context to create the object for.
     * @param identifier - meaningful name for identification of this instance.
     * @param eventProvider - required for mouse interaction
     * @returns - whether initialization was successful
     */
    protected onInitialize(
        context: Context,
        callback: Invalidate,
        eventProvider: EventProvider
    ): boolean {
        this._gl = context.gl as WebGL2RenderingContext;

        this._rgbFormat = [
            this._gl.RGBA8,
            this._gl.RGBA,
            this._gl.UNSIGNED_BYTE
        ];
        this._depthFormat = [
            this._gl.DEPTH_COMPONENT32F,
            this._gl.DEPTH_COMPONENT,
            this._gl.FLOAT
        ];
        this._indexFormat = [
            this._gl.RGBA8UI,
            this._gl.RGBA_INTEGER,
            this._gl.UNSIGNED_BYTE
        ];

        // set up view control
        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(-3.0, 3.0, 5.0);

        this._camera.near = 0.1;
        this._camera.far = 64.0;

        this._navigation = new Navigation(callback, eventProvider);
        this._navigation.camera = this._camera;
        // @ts-expect-error: webgl-operate mouse wheel zoom is broken
        this._navigation._wheelZoom = { process: () => { } };

        // set up actual rendering
        this._pointPass = new PointPass(context);
        this._pointPass.initialize();
        this._pointPass.camera = this._camera;

        this._gridPass = new GridPass(context);
        this._gridPass.initialize();
        this._gridPass.camera = this._camera;

        this._gridLabelPass = new GridLabelPass(context);
        this._gridLabelPass.initialize();
        this._gridLabelPass.camera = this._camera;
        this._gridLabelPass.depthMask = true;
        this._gridLabelPass.loadFont(
            Roboto.fnt, this.invalidate.bind(this));

        this._gridOffsetHelper = new GridOffsetHelper(
            this._gridPass, this._gridLabelPass, this._pointPass);
        this._gridOffsetHelper.camera = this._camera;
        this._gridOffsetHelper.initialize();

        // set up cluster rendering
        this._clusterPass = new ClusterVisualization(context);
        this._clusterPass.initialize();
        this._clusterPass.camera = this._camera;

        // set up output
        this._defaultFBO = new DefaultFramebuffer(context, 'DefaultFBO');
        this._defaultFBO.initialize();

        this._accumulatePass = new AccumulatePass(context);
        this._accumulatePass.initialize();
        this._accumulatePass.precision = this._framePrecision;

        this._debugPass = new DebugPass(context);
        this._debugPass.initialize(this._rgbFormat, this._depthFormat);

        // set up all render storage
        this.setupFBOs();

        // connect fullscreen changes to updateUseDiscard listener
        const uud = this.updateUseDiscard.bind(this);
        document.addEventListener('fullscreenchange', uud);
        document.addEventListener('mozfullscreenchange', uud);
        document.addEventListener('webkitfullscreenchange', uud);
        document.addEventListener('msfullscreenchange', uud);
        this._pointPass.useDiscard = true;

        // enable culling
        this._gl.enable(this._gl.CULL_FACE);

        // mouse interaction
        this._eventHandler = new EventHandler(callback, eventProvider);
        this._eventHandler.pushMouseMoveHandler(this.onMouseMove.bind(this));

        return true;
    }

    /**
     * Uninitializes buffers, geometry and program.
     */
    protected onUninitialize(): void {
        super.uninitialize();

        this._pointPass.uninitialize();
        this._gridPass.uninitialize();
        this._gridLabelPass.uninitialize();
        this._clusterPass.uninitialize();

        this._accumulatePass.uninitialize();

        if (this._msFBO?.initialized) this._msFBO.uninitialize();
        if (this._msColor?.initialized) this._msColor.uninitialize();
        if (this._msDepth?.initialized) this._msDepth.uninitialize();
        if (this._ssFBO?.initialized) this._ssFBO.uninitialize();
        if (this._ssColor?.initialized) this._ssColor.uninitialize();
        if (this._ssIndexHigh?.initialized) this._ssIndexHigh.uninitialize();
        if (this._ssIndexLow?.initialized) this._ssIndexLow.uninitialize();
        if (this._ssDepth?.initialized) this._ssDepth.uninitialize();

        this._defaultFBO.uninitialize();
    }

    /**
     * This is invoked in order to check if rendering of a frame is required by
     * means of implementation specific evaluation (e.g., lazy non continuous
     * rendering). Regardless of the return value a new frame (preparation,
     * frame, swap) might be invoked anyway, e.g., when update is forced or
     * canvas or context properties have changed or the renderer was
     * invalidated @see{@link invalidate}.
     * @returns whether to redraw
     */
    protected onUpdate(): boolean {
        this._navigation.update();
        this._eventHandler.update();
        return this._altered.any ||
            this._camera.altered ||
            this._gridOffsetHelper.altered ||
            this._pointPass.altered ||
            this._gridPass.altered ||
            this._gridLabelPass.altered ||
            this._clusterPass.altered;
    }
    /**
     * This is invoked in order to prepare rendering of one or more frames,
     * regarding multi-frame rendering and camera-updates.
     */
    protected onPrepare(): void {
        if (this._altered.frameSize) {
            if (this._msEnabled)
                this._msFBO.resize(this._frameSize[0], this._frameSize[1]);
            this._ssFBO.resize(this._frameSize[0], this._frameSize[1]);
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];

            this._pointPass.aspectRatio =
                this._frameSize[1] / this._frameSize[0];

            this._debugPass.resize(vec2.clone(this._frameSize));
        }

        if (this._altered.canvasSize) {
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
        }

        if (this._altered.msaa) {
            this.setupFBOs();
        }

        if (this._altered.multiFrameNumber) {
            this._ndcOffsetKernel =
                new AntiAliasingKernel(this._multiFrameNumber);
            if ((this._multiFrameNumber > 1) !== this._mfEnabled)
                this.setupFBOs();
        }

        this._gridOffsetHelper.update();
        this._pointPass.update();
        this._gridPass.update();
        this._gridLabelPass.update();
        this._clusterPass.update();
        if (this._mfEnabled)
            this._accumulatePass.update();

        this._altered.reset();
        this._camera.altered = false;
    }

    protected msFrame(frameNumber: number): void {
        // on the first frame: render indices to ss buffer
        if(frameNumber === 0) {
            this._ssFBO.bind();
            this._gl.drawBuffers([
                this._gl.NONE,
                this._gl.COLOR_ATTACHMENT1 ,
                this._gl.COLOR_ATTACHMENT2 ]);

            this._gl.clearBufferuiv(this._gl.COLOR, 1, [0, 0, 0, 0]);
            this._gl.clearBufferuiv(this._gl.COLOR, 2, [0, 0, 0, 0]);
            this._gl.clearBufferfi(this._gl.DEPTH_STENCIL, 0, 1, 0);

            this._pointPass.target = this._ssFBO;
            this._pointPass.frame(frameNumber);
        }

        // now render the colors to ms buffer
        this._msFBO.bind();
        this._gl.drawBuffers([
            this._gl.COLOR_ATTACHMENT0,
            this._gl.NONE,
            this._gl.NONE ]);

        this._gl.clearBufferfv(this._gl.COLOR, 0, this._clearColor);
        this._gl.clearBufferfi(this._gl.DEPTH_STENCIL, 0, 1, 0);

        this._pointPass.target = this._msFBO;
        this._pointPass.frame(frameNumber);

        this._gridLabelPass.frame();
        this._gridPass.frame();
        this._clusterPass.frame();

        // trigger accumulation if necessary
        if (this._mfEnabled) {
            // blit color to ss buffer
            // acc pass wants a texture, but that cant be multi sampled
            this._gl.bindFramebuffer(
                this._gl.READ_FRAMEBUFFER, this._msFBO.object);
            this._gl.bindFramebuffer(
                this._gl.DRAW_FRAMEBUFFER, this._ssFBO.object);
            this._gl.readBuffer(this._gl.COLOR_ATTACHMENT0);
            this._gl.drawBuffers([
                this._gl.COLOR_ATTACHMENT0,
                this._gl.NONE,
                this._gl.NONE ]);
            this._gl.blitFramebuffer(
                0, 0, this._frameSize[0], this._frameSize[1],
                0, 0, this._frameSize[0], this._frameSize[1],
                this._gl.COLOR_BUFFER_BIT, this._gl.NEAREST);
            this._gl.bindFramebuffer(this._gl.READ_FRAMEBUFFER, null);
            this._gl.bindFramebuffer(this._gl.DRAW_FRAMEBUFFER, null);

            this._accumulatePass.frame(frameNumber);
        } else {
            this._msFBO.unbind();
        }
    }

    protected ssFrame(frameNumber: number): void {
        this._ssFBO.bind();
        this._gl.drawBuffers([
            this._gl.COLOR_ATTACHMENT0,
            this._gl.COLOR_ATTACHMENT1,
            this._gl.COLOR_ATTACHMENT2 ]);

        this._gl.clearBufferfv(this._gl.COLOR, 0, this._clearColor);
        this._gl.clearBufferuiv(this._gl.COLOR, 1, [0, 0, 0, 0]);
        this._gl.clearBufferuiv(this._gl.COLOR, 2, [0, 0, 0, 0]);
        this._gl.clearBufferfi(this._gl.DEPTH_STENCIL, 0, 1, 0);

        // this._pointPass.target = this._ssFBO;
        this._pointPass.frame(frameNumber);

        this._gl.drawBuffers([
            this._gl.COLOR_ATTACHMENT0,
            this._gl.NONE,
            this._gl.NONE ]);

        this._gridLabelPass.frame();
        this._gridPass.frame();
        this._clusterPass.frame();

        this._ssFBO.unbind();

        // trigger accumulation if necessary
        if (this._mfEnabled) {
            this._accumulatePass.frame(frameNumber);
        }
    }

    protected onFrame(frameNumber: number): void {
        this._gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        if(this._msEnabled) {
            this.msFrame(frameNumber);
        } else {
            this.ssFrame(frameNumber);
        }
    }

    protected onSwap(): void {
        let fb = this._ssFBO;
        if(this._debugMode !== DebugMode.Off) {
            fb = this._debugPass.output;
            this._debugPass.frame(this._debugMode);
        } else if(this._mfEnabled) fb = this._accumulatePass.framebuffer;
        else if(this._msEnabled) fb = this._msFBO;

        if (!fb.initialized) {
            console.log('fbo not initialized, skip blit ');
            return;
        }

        if (
            vec2.distance(fb.size, this._defaultFBO.size) ||
            !this._defaultFBO
        ) {
            console.log('size mismatch, skip blit');
            return;
        }

        this._gl.bindFramebuffer(this._gl.READ_FRAMEBUFFER, fb.object);
        this._gl.bindFramebuffer(this._gl.DRAW_FRAMEBUFFER, null);
        this._gl.readBuffer(this._gl.COLOR_ATTACHMENT0);
        this._gl.drawBuffers([ this._gl.BACK ]);
        this._gl.blitFramebuffer(
            0, 0, this._frameSize[0], this._frameSize[1],
            0, 0, this._frameSize[0], this._frameSize[1],
            this._gl.COLOR_BUFFER_BIT, this._gl.NEAREST);
        this._gl.bindFramebuffer(this._gl.READ_FRAMEBUFFER, null);
    }

    protected onDiscarded(): void {
        console.warn('got discarded');
    }

    protected updateModelMat(): void {
        const c = this._modelMatInfo.columns.slice(0, 3) as Float32Column[];
        const e = this._modelMatInfo.extents;

        if (!e || !c || c.some((c) =>
            c?.max === Number.NEGATIVE_INFINITY ||
            c?.min === Number.POSITIVE_INFINITY)
        ) {
            return;
        }

        const gridOffset = e.map((e, i) => c[i] ? e.min : 0);
        const gridScale = e.map((e, i) => c[i] ? (e.max - e.min) : 0);
        const valueScale = c.map((c) => c ? 1 / (c.max - c.min) : 0);
        const valueOffset = c.map((c) => c ? -c.min : 0);

        const model = mat4.create();
        mat4.translate(model, model, new Float32Array(gridOffset));
        mat4.scale(model, model, new Float32Array(gridScale));
        mat4.scale(model, model, new Float32Array(valueScale));
        mat4.translate(model, model, new Float32Array(valueOffset));
        this._modelMat = model;

        this._pointPass.model = model;
        this._clusterPass.model = model;
    }

    protected onMouseMove(latests: Array<MouseEvent>): void {
        const event: MouseEvent = latests[latests.length - 1];
        const mouse = this._eventHandler.offsets(event)[0];
        const buf = new ArrayBuffer(9);
        const byteView = new Uint8Array(buf);
        this._ssFBO.bind(this._gl.READ_FRAMEBUFFER);
        this._gl.readBuffer(this._gl.COLOR_ATTACHMENT1);
        this._gl.readPixels(
            mouse[0], this._frameSize[1] - mouse[1], 1, 1,
            this._indexFormat[1], this._indexFormat[2], byteView, 2);
        this._gl.readBuffer(this._gl.COLOR_ATTACHMENT2);
        this._gl.readPixels(
            mouse[0], this._frameSize[1] - mouse[1], 1, 1,
            this._indexFormat[1], this._indexFormat[2], byteView, 5);
        this._ssFBO.unbind(this._gl.READ_FRAMEBUFFER);
        let id = -1;
        if (byteView[2] === 128) {
            id = new Uint32Array(buf, 4, 1)[0];
        }
        this._pointPass.selected = id;
    }

    public set columns(columns: Column[]) {
        this._pointPass.columns = columns;
        this._modelMatInfo.columns = columns;
        this.updateModelMat();
        if (this.initialized) {
            this.invalidate();
        }
    }

    public set pointSize(size: number) {
        this._pointPass.pointSize = size;
        this.invalidate();
    }

    public set scale(scale: number) {
        const temp = vec3.create();
        vec3.normalize(temp, this._camera.eye);
        vec3.scale(temp, temp, 10 / scale);
        this._camera.eye = temp;
        this.invalidate();
    }

    public set colorMode(mode: number) {
        this._pointPass.colorMode = mode;
        this.invalidate();
    }

    public set colorMapping(mapping: number) {
        this._pointPass.colorMapping = mapping;
        this.invalidate();
    }

    public set variablePointSizeStrength(strength: number) {
        this._pointPass.variablePointSizeStrength = strength;
        this.invalidate();
    }

    public get points(): PointPass {
        return this._pointPass;
    }

    public get maxSamples(): number {
        return this._gl.getParameter(this._gl.MAX_SAMPLES);
    }

    public set msaa(value: number) {
        this._msaa = value;
        this._altered.alter('msaa');
        this.invalidate();
    }

    public set debugMode(mode: DebugMode) {
        this._debugMode = mode;
        this._altered.alter('debugMode');
        this.invalidate();
    }
}
