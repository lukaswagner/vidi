import { mat4, quat, vec3, vec4 } from 'gl-matrix';

import {
    Camera,
    Context,
    DefaultFramebuffer,
    Invalidate,
    MouseEventProvider,
    Navigation,
    Renderer,
    viewer,
} from 'webgl-operate';
import { GridGeometry } from './grid/gridGeometry';
import { GridProgram } from './grid/gridProgram';
import { Labels } from './grid/labels';
import { GridInfo } from './grid/gridInfo';
import { PointPass } from './points/pointPass';

export class TopicMapRenderer extends Renderer {

    protected static readonly DEFAULT_POINT_SIZE = 1.0 / 128.0;

    protected _pointPass: PointPass;

    protected _gridInfo: GridInfo[];
    protected _gridGeometry: GridGeometry;
    protected _gridProgram: GridProgram;

    protected _camera: Camera;
    protected _navigation: Navigation;

    protected _labels: Labels;

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

        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(-3.0, 3.0, 5.0);

        this._camera.near = 0.1;
        this._camera.far = 64.0;

        this._navigation = new Navigation(callback, mouseEventProvider);
        this._navigation.camera = this._camera;

        this._pointPass = new PointPass(context);
        this._pointPass.initialize();
        this._pointPass.camera = this._camera;
        this._pointPass.target = this._defaultFBO;

        this._gridGeometry = new GridGeometry(context);
        this._gridGeometry.initialize();
        this._gridProgram = new GridProgram(context);

        this._labels = new Labels(
            context,
            this._camera,
            this._defaultFBO,
            this.invalidate.bind(this));

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
        this._pointPass.useDiscard = true;

        return true;
    }

    /**
     * Uninitializes buffers, geometry and program.
     */
    protected onUninitialize(): void {
        super.uninitialize();
        this._pointPass.uninitialize();
        this._gridGeometry.uninitialize();
        this._gridProgram.uninitialize();
        this._defaultFBO.uninitialize();
        this._labels.uninitialize();
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

            this._pointPass.frameSize = this._frameSize[0];
        }

        if(this._altered.canvasSize) {
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
        }

        this._pointPass.update();
        this._labels.update();

        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
        }

        this._altered.reset();
        this._camera.altered = false;
    }

    protected onFrame(): void {

        const gl = this._context.gl as WebGLRenderingContext;

        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        // grid
        this._gridProgram.viewProjection(
            this._camera.viewProjection, true, false);
        gl.disable(gl.DEPTH_TEST);
        this._gridGeometry.bind();
        this._gridGeometry.draw();
        this._gridGeometry.unbind();
        gl.enable(gl.DEPTH_TEST);
        this._gridProgram.unbind();

        // labels
        gl.disable(gl.CULL_FACE);
        this._labels.frame();
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);

        // points
        this._pointPass.frame();
    }

    protected onSwap(): void {
    }

    set positions(positions: Float32Array) {
        this._pointPass.positions = positions;

        if (this.initialized) {
            this.invalidate();
        }
    }

    set grid(gridInfo: GridInfo[]) {
        this._gridInfo = gridInfo;
    }

    updateGrid() {
        this._gridGeometry.buildGrid(this._gridInfo);
        const x = this._gridInfo[0];
        const y = this._gridInfo[1];
        const labelDist = 0.1;
        this._labels.labels = [
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
        this._labels.setupLabels();
        this.invalidate();
    }

    set pointSize(size: number) {
        this._pointPass.pointSize = size;
        this.invalidate();
    }

    updateUseDiscard() {
        this._pointPass.useDiscard = !viewer.Fullscreen.active();
    }

    set scale(scale: number) {
        const temp = vec3.create();
        vec3.normalize(temp, this._camera.eye);
        vec3.scale(temp, temp, 10 / scale);
        this._camera.eye = temp;
        this.invalidate(true);
    }
}
