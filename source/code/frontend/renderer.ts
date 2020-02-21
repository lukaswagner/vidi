import { mat4, quat, vec3, vec4 } from 'gl-matrix';

import {
    Buffer,
    Camera,
    Context,
    DefaultFramebuffer,
    Invalidate,
    MouseEventProvider,
    Navigation,
    Program,
    Renderer,
    Shader,
    viewer,
} from 'webgl-operate';
import { PointCloudGeometry } from './points/pointCloudGeometry';
import { PointCloudProgram } from './points/pointCloudProgram';
import { GridGeometry } from './grid/gridGeometry';
import { GridProgram } from './grid/gridProgram';

export class TopicMapRenderer extends Renderer {

    protected static readonly DEFAULT_POINT_SIZE = 1.0 / 128.0;

    protected _pcGeometry: PointCloudGeometry;
    protected _pcProgram: PointCloudProgram;

    protected _gridGeometry: GridGeometry;
    protected _gridProgram: GridProgram;

    protected _camera: Camera;
    protected _navigation: Navigation;

    protected _defaultFBO: DefaultFramebuffer;

    /**
     * Initializes and sets up buffer, cube geometry, camera and links shaders with program.
     * @param context - valid context to create the object for.
     * @param identifier - meaningful name for identification of this instance.
     * @param mouseEventProvider - required for mouse interaction
     * @returns - whether initialization was successful
     */
    protected onInitialize(context: Context, callback: Invalidate,
        mouseEventProvider: MouseEventProvider,
        /* keyEventProvider: KeyEventProvider, */
        /* touchEventProvider: TouchEventProvider */): boolean {
        const gl = context.gl as WebGLRenderingContext;

        context.enable(['ANGLE_instanced_arrays']);

        this._defaultFBO = new DefaultFramebuffer(context, 'DefaultFBO');
        this._defaultFBO.initialize();
        this._defaultFBO.bind();

        this._pcGeometry = new PointCloudGeometry(context);
        this._pcGeometry.initialize();
        this._pcProgram = new PointCloudProgram(context);

        this._gridGeometry = new GridGeometry(context);
        this._gridGeometry.initialize();
        this._gridProgram = new GridProgram(context);

        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(3.0, 3.0, 5.0);

        this._camera.near = 0.1;
        this._camera.far = 64.0;

        this._navigation = new Navigation(callback, mouseEventProvider);
        this._navigation.camera = this._camera;

        const model = mat4.fromRotationTranslationScale(
            mat4.create(), quat.create(), [0.0, 0.0, 0.0], [2.0, 2.0, 2.0]);

        this._pcProgram.model(model);
        this._gridProgram.model(model);

        // prepare draw binding

        this._defaultFBO.bind();
        this._defaultFBO.clear(
            gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);

        const uud = this.updateUseDiscard.bind(this);
        document.addEventListener('fullscreenchange', uud);
        document.addEventListener('mozfullscreenchange', uud);
        document.addEventListener('webkitfullscreenchange', uud);
        document.addEventListener('msfullscreenchange', uud);
        this._pcProgram.useDiscard(true);

        return true;
    }

    /**
     * Uninitializes buffers, geometry and program.
     */
    protected onUninitialize(): void {
        super.uninitialize();
        this._pcGeometry.uninitialize();
        this._pcProgram.uninitialize();
        this._gridGeometry.uninitialize();
        this._gridProgram.uninitialize();
        this._defaultFBO.uninitialize();
    }

    /**
     * This is invoked in order to check if rendering of a frame is required by means of implementation specific
     * evaluation (e.g., lazy non continuous rendering). Regardless of the return value a new frame (preparation,
     * frame, swap) might be invoked anyway, e.g., when update is forced or canvas or context properties have
     * changed or the renderer was invalidated @see{@link invalidate}.
     * @returns whether to redraw
     */
    protected onUpdate(): boolean {
        this._navigation.update();
        return true;

    }
    /**
     * This is invoked in order to prepare rendering of one or more frames, regarding multi-frame rendering and
     * camera-updates.
     */
    protected onPrepare(): void {
        if (this._altered.frameSize) {
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];

            this._pcProgram.frameSize(this._frameSize[0]);
        }

        if(this._altered.canvasSize) {
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
        }

        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
        }

        this._altered.reset();
        this._camera.altered = false;
    }

    protected onFrame(): void {

        const gl = this._context.gl;

        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        this._pcProgram.viewProjection(
            this._camera.viewProjection, true, false);

        this._pcGeometry.bind();
        this._pcGeometry.draw();
        this._pcGeometry.unbind();

        this._pcProgram.unbind();

        this._gridProgram.viewProjection(
            this._camera.viewProjection, true, false);

        this._gridGeometry.bind();
        this._gridGeometry.draw();
        this._gridGeometry.unbind();

        this._gridProgram.unbind();
    }

    protected onSwap(): void {
    }

    set positions(positions: Float32Array) {
        this._pcGeometry.positions = positions;

        if (this.initialized) {
            this.invalidate();
        }
    }

    set grid(gridInfo: { min: number, max: number, steps: number }[]) {
        this._gridGeometry.buildGrid(gridInfo);
        this.invalidate();
    }

    set model(mat: mat4) {
        this._pcProgram.model(mat);
        this._gridProgram.model(mat);
        this.invalidate();
    }

    set pointSize(size: number) {
        this._pcProgram.pointSize(size);
        this.invalidate();
    }

    updateUseDiscard() {
        this._pcProgram.useDiscard(!viewer.Fullscreen.active());
    }
}
