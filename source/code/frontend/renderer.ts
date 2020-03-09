import {
    AccumulatePass,
    AntiAliasingKernel,
    BlitPass,
    Camera,
    Context,
    DefaultFramebuffer,
    Framebuffer,
    Invalidate,
    MouseEventProvider,
    Navigation,
    Renderbuffer,
    Renderer,
    Texture2D,
    Wizard,
    tuples,
    vec3,
    viewer
} from 'webgl-operate';

// can't use destructuring, so we have to import this manually
// see https://github.com/microsoft/TypeScript/issues/13135
import GLfloat2 = tuples.GLfloat2;

import { GridInfo } from './grid/gridInfo';
import { GridLabelPass } from './grid/gridLabelPass';
import { GridPass } from './grid/gridPass';
import { PointPass } from './points/pointPass';

export class TopicMapRenderer extends Renderer {
    // scene data
    protected _camera: Camera;
    protected _navigation: Navigation;
    protected _gridInfo: GridInfo[];

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

    // final output
    protected _defaultFBO: DefaultFramebuffer;
    // output passes
    protected _accumulatePass: AccumulatePass;
    protected _blitPass: BlitPass;

    public updateUseDiscard() {
        this._pointPass.useDiscard = !viewer.Fullscreen.active();
    }

    public updateGrid() {
        this._gridPass.gridInfo = this._gridInfo;
        const x = this._gridInfo[0];
        const y = this._gridInfo[1];
        const labelDist = 0.1;
        this._gridLabelPass.labelInfo = [
            {
                name: x.name,
                pos: [(x.min + x.max) / 2, 0, -y.min + labelDist],
                dir: [1, 0, 0],
                up: [0, 0, -1],
            }, {
                name: y.name,
                pos: [x.min - labelDist, 0, -(y.min + y.max) / 2],
                dir: [0, 0, 1],
                up: [1, 0, 0],
            }
        ];
        this.invalidate();
    }

    /**
     * Initializes and sets up buffer, cube geometry, camera and links shaders
     * with program.
     * @param context - valid context to create the object for.
     * @param identifier - meaningful name for identification of this instance.
     * @param mouseEventProvider - required for mouse interaction
     * @returns - whether initialization was successful
     */
    protected onInitialize(
        context: Context,
        callback: Invalidate,
        mouseEventProvider: MouseEventProvider
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

        this._navigation = new Navigation(callback, mouseEventProvider);
        this._navigation.camera = this._camera;

        // set up intermediate rendering
        const internalFormatAndType = Wizard.queryInternalTextureFormat(
            this._context, gl.RGBA, Wizard.Precision.half);

        this._colorRenderTexture = new Texture2D(
            this._context, 'ColorRenderTexture');
        this._colorRenderTexture.initialize(
            1, 1, internalFormatAndType[0], gl.RGBA, internalFormatAndType[1]);
        this._colorRenderTexture.filter(gl.LINEAR, gl.LINEAR);

        this._depthRenderbuffer = new Renderbuffer(
            this._context, 'DepthRenderbuffer');
        this._depthRenderbuffer.initialize(1, 1, gl.DEPTH_COMPONENT16);

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
        this._gridLabelPass.loadFont(
            './fonts/roboto/roboto.fnt', this.invalidate.bind(this));

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
            this._pointPass.altered ||
            this._gridPass.altered ||
            this._gridLabelPass.altered;
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

            this._pointPass.frameSize = this._frameSize[0];
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

        this._pointPass.update();
        this._gridPass.update();
        this._gridLabelPass.update();
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

        this._gridPass.ndcOffset = ndcOffset;
        this._gridPass.frame();

        this._gridLabelPass.ndcOffset = ndcOffset;
        this._gridLabelPass.frame();

        this._pointPass.ndcOffset = ndcOffset;
        this._pointPass.frame();

        this._accumulatePass.frame(frameNumber);
    }

    protected onSwap(): void {
        this._blitPass.framebuffer =
            this._accumulatePass.framebuffer ?
                this._accumulatePass.framebuffer :
                this._intermediateFBO;
        this._blitPass.frame();
    }

    public set positions(positions: Float32Array) {
        this._pointPass.positions = positions;

        if (this.initialized) {
            this.invalidate();
        }
    }

    public set grid(gridInfo: GridInfo[]) {
        this._gridInfo = gridInfo;
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
}
