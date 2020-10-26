import {
    AccumulatePass,
    AntiAliasingKernel,
    BlitPass,
    Camera,
    Context,
    DefaultFramebuffer,
    EventProvider,
    Framebuffer,
    Invalidate,
    Navigation,
    Renderbuffer,
    Renderer,
    Texture2D,
    Wizard,
    mat4,
    vec3,
    viewer,
} from 'webgl-operate';

import {
    Column,
    NumberColumn
} from 'shared/column/column';

import {
    ExtendedGridInfo,
    GridExtents,
    GridInfo, calculateExtendedGridInfo
} from './grid/gridInfo';

import { ClusterInfo } from 'worker/clustering/interface';
import { ClusterVisualization } from './clustering/clusterVisualization';
import { GLfloat2 } from 'shared/types/tuples' ;
import { GridHelper } from './grid/gridHelper';
import { GridLabelPass } from './grid/gridLabelPass';
import { GridOffsetHelper } from './grid/offsetHelper';
import { GridPass } from './grid/gridPass';
import { PointPass } from './points/pointPass';

export class TopicMapRenderer extends Renderer {
    // scene data
    protected _camera: Camera;
    protected _navigation: Navigation;
    protected _gridInfo: GridInfo[];
    protected _gridOffsetHelper: GridOffsetHelper;

    protected _modelMatInfo: { extents: GridExtents, columns: Column[] } = {
        extents: undefined, columns: undefined
    };
    protected _modelMat: mat4;

    // intermediate rendering for aa
    protected _depthRenderbuffer: Renderbuffer;
    protected _colorRenderTexture: Texture2D;
    protected _intermediateFBO: Framebuffer;
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
        this._clusterPass.selectData(name);
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
        const gl = context.gl as WebGLRenderingContext;
        const gl2facade = this._context.gl2facade;

        context.enable(['ANGLE_instanced_arrays']);

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
        delete this._navigation._wheelZoom;

        // set up intermediate rendering

        // usually precision is provided by canvas, but this._framePrecision is
        // defined only after initialization.
        const internalFormatAndType = Wizard.queryInternalTextureFormat(
            this._context, gl.RGB, Wizard.Precision.byte);

        this._colorRenderTexture = new Texture2D(
            this._context, 'ColorRenderTexture');
        this._colorRenderTexture.initialize(
            1, 1, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);
        this._colorRenderTexture.filter(gl.NEAREST, gl.NEAREST);

        this._depthRenderbuffer = new Renderbuffer(
            this._context, 'DepthRenderbuffer');
        this._depthRenderbuffer.initialize(1, 1, gl.DEPTH_STENCIL);

        this._intermediateFBO = new Framebuffer(
            this._context, 'IntermediateFBO');
        this._intermediateFBO.initialize([
            [gl2facade.COLOR_ATTACHMENT0, this._colorRenderTexture],
            [gl.DEPTH_ATTACHMENT, this._depthRenderbuffer]]);

        // set up actual rendering
        this._pointPass = new PointPass(context);
        this._pointPass.initialize();
        this._pointPass.camera = this._camera;
        this._pointPass.target = this._intermediateFBO;

        this._gridPass = new GridPass(context);
        this._gridPass.initialize();
        this._gridPass.camera = this._camera;
        this._gridPass.target = this._intermediateFBO;

        this._gridLabelPass = new GridLabelPass(context);
        this._gridLabelPass.initialize();
        this._gridLabelPass.camera = this._camera;
        this._gridLabelPass.target = this._intermediateFBO;
        this._gridLabelPass.depthMask = true;
        this._gridLabelPass.loadFont(
            './fonts/roboto/roboto.fnt', this.invalidate.bind(this));

        this._gridOffsetHelper = new GridOffsetHelper(
            this._gridPass, this._gridLabelPass, this._pointPass);
        this._gridOffsetHelper.camera = this._camera;
        this._gridOffsetHelper.initialize();

        // set up cluster rendering
        this._clusterPass = new ClusterVisualization(context);
        this._clusterPass.initialize();
        this._clusterPass.camera = this._camera;
        this._clusterPass.target = this._intermediateFBO;

        // set up output
        this._defaultFBO = new DefaultFramebuffer(context, 'DefaultFBO');
        this._defaultFBO.initialize();

        this._accumulatePass = new AccumulatePass(context);
        this._accumulatePass.initialize();
        this._accumulatePass.precision = this._framePrecision;
        this._accumulatePass.texture = this._colorRenderTexture;

        this._blitPass = new BlitPass(this._context);
        this._blitPass.initialize();
        this._blitPass.readBuffer = gl2facade.COLOR_ATTACHMENT0;
        this._blitPass.target = this._defaultFBO;
        this._blitPass.drawBuffer = gl.BACK;

        // connect fullscreen changes to updateUseDiscard listener
        const uud = this.updateUseDiscard.bind(this);
        document.addEventListener('fullscreenchange', uud);
        document.addEventListener('mozfullscreenchange', uud);
        document.addEventListener('webkitfullscreenchange', uud);
        document.addEventListener('msfullscreenchange', uud);
        this._pointPass.useDiscard = true;

        // enable culling
        gl.enable(gl.CULL_FACE);

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

        this._intermediateFBO.uninitialize();
        this._colorRenderTexture.uninitialize();
        this._depthRenderbuffer.uninitialize();

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
            this._intermediateFBO.resize(
                this._frameSize[0], this._frameSize[1]);
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];

            this._pointPass.aspectRatio =
                this._frameSize[1] / this._frameSize[0];
        }

        if (this._altered.canvasSize) {
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
        }

        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
            this._intermediateFBO.clearColor(this._clearColor);
        }

        if (this._altered.multiFrameNumber) {
            this._ndcOffsetKernel =
                new AntiAliasingKernel(this._multiFrameNumber);
        }

        this._gridOffsetHelper.update();
        this._pointPass.update();
        this._gridPass.update();
        this._gridLabelPass.update();
        this._clusterPass.update();
        this._accumulatePass.update();

        this._altered.reset();
        this._camera.altered = false;
    }

    protected onFrame(frameNumber: number): void {
        const gl = this._context.gl as WebGLRenderingContext;

        this._intermediateFBO.bind();
        this._intermediateFBO.clear(
            gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        const ndcOffset = this._ndcOffsetKernel.get(frameNumber) as GLfloat2;
        ndcOffset[0] = 2.0 * ndcOffset[0] / this._frameSize[0];
        ndcOffset[1] = 2.0 * ndcOffset[1] / this._frameSize[1];

        this._pointPass.ndcOffset = ndcOffset;
        this._pointPass.frame();

        this._gridLabelPass.ndcOffset = ndcOffset;
        this._gridLabelPass.frame();

        this._gridPass.ndcOffset = ndcOffset;
        this._gridPass.frame();

        this._clusterPass.frame();

        this._accumulatePass.frame(frameNumber);
    }

    protected onSwap(): void {
        const fb =
            this._accumulatePass.framebuffer ?
                this._accumulatePass.framebuffer :
                this._intermediateFBO;
        if(!fb.initialized) return;
        this._blitPass.framebuffer = fb;
        this._blitPass.frame();
    }

    protected onDiscarded(): void {
        console.warn('got discarded');
    }

    protected updateModelMat(): void {
        if(!this._modelMatInfo?.extents || !this._modelMatInfo?.columns) {
            return;
        }

        const c = this._modelMatInfo.columns.slice(0, 3) as NumberColumn[];
        const g = this._modelMatInfo.extents;
        const gridOffset = g.map((e, i) => c[i] ? e.min : 0);
        const gridScale = g.map((e, i) => c[i] ? (e.max - e.min) : 0);
        const valueScale = c.map((c) => c ? 1 / (c.max - c.min) : 0);
        const valueOffset = c.map((c) => c ? -c.min : 0);

        const model = mat4.create();
        mat4.translate(model, model, new Float32Array(gridOffset));
        mat4.scale(model, model, new Float32Array(gridScale));
        mat4.scale(model, model, new Float32Array(valueScale));
        mat4.translate(model, model, new Float32Array(valueOffset));
        this._modelMat = model;
        // console.log(g, c, gridOffset, gridScale, valueScale, valueOffset);
        // console.log(c[0].min, c[0].max, c[0].length);

        console.log(
            'cmin: ' + c.map((c) => c?.min).join(' ') +
            '\ncmax: ' + c.map((c) => c?.max).join(' ') +
            '\ngmin: ' + g.map((g) => g?.min).join(' ') +
            '\ngmax: ' + g.map((g) => g?.max).join(' ') +
            '\nmat: ' + model.join(' '));

        this._pointPass.model = model;
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
}
