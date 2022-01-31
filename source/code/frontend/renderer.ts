import {
    AccumulatePass,
    AntiAliasingKernel,
    BlitPass,
    Camera,
    ChangeLookup,
    Context,
    DefaultFramebuffer,
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
    ExtendedGridInfo,
    GridExtents,
    GridInfo,
    calculateExtendedGridInfo,
} from './grid/gridInfo';

import { ClusterInfo } from 'worker/clustering/interface';
import { ClusterVisualization } from './clustering/clusterVisualization';
import { GLfloat2 } from 'shared/types/tuples';
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
    });

    protected _gl: WebGL2RenderingContext;
    protected _rgbFormat: [GLuint, GLuint, GLuint];
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
    protected _msaa = 8;

    // multisample buffer
    protected _msEnabled: boolean;
    protected _msColor: Renderbuffer;
    protected _msDepth: Renderbuffer;
    protected _msFBO: Framebuffer;

    // multi frame buffer
    protected _mfEnabled: boolean;
    protected _mfColor: Texture2D;
    protected _mfDepth: Renderbuffer;
    protected _mfFBO: Framebuffer;

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
    protected _blitPass: BlitPass;

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
            this._msFBO = new Framebuffer(this._context);
            this._msFBO.initialize([
                [this._gl.COLOR_ATTACHMENT0, this._msColor],
                [this._gl.DEPTH_ATTACHMENT, this._msDepth]
            ]);
        }

        if (this._mfFBO?.initialized) this._mfFBO.uninitialize();
        if (this._mfColor?.initialized) this._mfColor.uninitialize();
        if (this._mfDepth?.initialized) this._mfDepth.uninitialize();

        if (this._mfEnabled) {
            this._mfColor =
                this.createTexture(this._rgbFormat, w, h);
            this._mfDepth =
                this.createRenderbuffer(this._depthFormat[0], w, h);
            this._mfFBO = new Framebuffer(this._context);
            this._mfFBO.initialize([
                [this._gl.COLOR_ATTACHMENT0, this._mfColor],
                [this._gl.DEPTH_ATTACHMENT, this._mfDepth]
            ]);
        }

        this._renderFBO = this._msEnabled ? this._msFBO : (
            this._mfEnabled ? this._mfFBO : this._defaultFBO
        );

        this._pointPass.target = this._renderFBO;
        this._gridPass.target = this._renderFBO;
        this._gridLabelPass.target = this._renderFBO;
        this._clusterPass.target = this._renderFBO;
        this._accumulatePass.texture = this._mfColor;
        this._blitPass.framebuffer = this._renderFBO;

        if (this._msEnabled) this._msFBO.clearColor(this._clearColor);
        if (this._mfEnabled) this._mfFBO.clearColor(this._clearColor);
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

        this._blitPass = new BlitPass(this._context);
        this._blitPass.initialize();

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

        this._blitPass.uninitialize();
        this._accumulatePass.uninitialize();

        if (this._msFBO?.initialized) this._msFBO.uninitialize();
        if (this._msColor?.initialized) this._msColor.uninitialize();
        if (this._msDepth?.initialized) this._msDepth.uninitialize();
        if (this._mfFBO?.initialized) this._mfFBO.uninitialize();
        if (this._mfColor?.initialized) this._mfColor.uninitialize();
        if (this._mfDepth?.initialized) this._mfDepth.uninitialize();

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
            if (this._mfEnabled)
                this._mfFBO.resize(this._frameSize[0], this._frameSize[1]);
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];

            this._pointPass.aspectRatio =
                this._frameSize[1] / this._frameSize[0];
        }

        if (this._altered.canvasSize) {
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
        }

        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
            if (this._msEnabled)
                this._msFBO.clearColor(this._clearColor);
            if (this._mfEnabled)
                this._mfFBO.clearColor(this._clearColor);
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

    protected onFrame(frameNumber: number): void {
        const gl = this._context.gl as WebGL2RenderingContext;

        this._renderFBO.clear(
            gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        const ndcOffset = this._ndcOffsetKernel.get(frameNumber) as GLfloat2;
        ndcOffset[0] = 2.0 * ndcOffset[0] / this._frameSize[0];
        ndcOffset[1] = 2.0 * ndcOffset[1] / this._frameSize[1];

        this._pointPass.ndcOffset = ndcOffset;
        this._pointPass.frame(frameNumber);

        this._gridLabelPass.ndcOffset = ndcOffset;
        this._gridLabelPass.frame();

        this._gridPass.ndcOffset = ndcOffset;
        this._gridPass.frame();

        this._clusterPass.frame();

        if (this._msEnabled && this._mfEnabled) {
            this._blitPass.framebuffer = this._msFBO;
            this._blitPass.readBuffer = this._gl.COLOR_ATTACHMENT0;
            this._blitPass.target = this._mfFBO;
            this._blitPass.drawBuffer = this._gl.COLOR_ATTACHMENT0;
            this._blitPass.frame();
        }

        if (this._mfEnabled) {
            this._accumulatePass.frame(frameNumber);
        }

    }

    protected onSwap(): void {
        if (!this._msEnabled && !this._mfEnabled) return;

        const fb = this._mfEnabled ?
            (this._accumulatePass.framebuffer ?? this._mfFBO) :
            this._msFBO;
        if (!fb.initialized) return;

        if (
            vec2.distance(fb.size, this._defaultFBO.size) ||
            !this._defaultFBO
        ) {
            console.log('noblit');
            return;
        }

        this._blitPass.framebuffer = fb;
        this._blitPass.readBuffer = this._gl.COLOR_ATTACHMENT0;
        this._blitPass.target = this._defaultFBO;
        this._blitPass.drawBuffer = this._gl.BACK;
        this._blitPass.frame();
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
}
