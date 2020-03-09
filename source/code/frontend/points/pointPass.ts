import {
    Camera,
    ChangeLookup,
    Context,
    Framebuffer,
    Initializable,
    Program,
    Shader,
    tuples,
} from 'webgl-operate';
import GLfloat2 = tuples.GLfloat2;

import { PointCloudGeometry } from './pointCloudGeometry';

export class PointPass extends Initializable {
    protected static readonly DEFAULT_POINT_SIZE = 1.0 / 128.0;
    protected static readonly DEFAULT_AA_STEP_SCALE: GLfloat = 0.6666;

    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        positions: false,
        frameSize: false,
        pointSize: false,
        useDiscard: false,
        colorMode: false,
        colorMapping: false,
    });

    protected _context: Context;
    protected _gl: WebGLRenderingContext;

    protected _target: Framebuffer;
    protected _camera: Camera;

    protected _frameSize: GLfloat;
    protected _pointSize: GLfloat = PointPass.DEFAULT_POINT_SIZE;
    protected _useDiscard: boolean;
    protected _colorMode: number;
    protected _colorMapping: number;
    protected _ndcOffset: GLfloat2 = [0.0, 0.0];

    protected _program: Program;

    protected _uViewProjection: WebGLUniformLocation;
    protected _uNdcOffset: WebGLUniformLocation;
    protected _uFrameSize: WebGLUniformLocation;
    protected _uPointSize: WebGLUniformLocation;
    protected _uUseDiscard: WebGLUniformLocation;
    protected _uColorMode: WebGLUniformLocation;
    protected _uColorMapping: WebGLUniformLocation;

    protected _geometry: PointCloudGeometry;
    protected _positions: Float32Array;

    public constructor(context: Context) {
        super();
        this._context = context;
        this._gl = context.gl;

        this._program = new Program(this._context);
        this._geometry = new PointCloudGeometry(this._context);
    }

    @Initializable.initialize()
    public initialize(): boolean {
        this._geometry.initialize();

        this._context.enable(['OES_standard_derivatives']);

        const vert = new Shader(
            this._context, this._gl.VERTEX_SHADER, 'particle.vert');
        vert.initialize(require('./particle.vert'));
        const frag = new Shader(
            this._context, this._gl.FRAGMENT_SHADER, 'particle.frag');
        frag.initialize(require('./particle.frag'));

        this._program.initialize([vert, frag], false);

        this._program.link();

        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uNdcOffset = this._program.uniform('u_ndcOffset');
        this._uFrameSize = this._program.uniform('u_pointSize');
        this._uPointSize = this._program.uniform('u_frameSize');
        this._uUseDiscard = this._program.uniform('u_useDiscard');
        this._uColorMode = this._program.uniform('u_colorMode');
        this._uColorMapping = this._program.uniform('u_colorMapping');

        this._program.bind();
        this._gl.uniform1f(this._uPointSize, this._pointSize);
        this._program.unbind();

        return true;
    }

    @Initializable.uninitialize()
    public uninitialize(): void {
        this._geometry.uninitialize();
        this._program.uninitialize();

        this._uViewProjection = undefined;
        this._uNdcOffset = undefined;
        this._uFrameSize = undefined;
        this._uPointSize = undefined;
        this._uUseDiscard = undefined;
        this._uColorMode = undefined;
        this._uColorMapping = undefined;
    }

    @Initializable.assert_initialized()
    public update(override: boolean = false): void {
        if (override || this._altered.positions) {
            this._geometry.positions = this._positions;
        }

        this._program.bind();

        if (override || this._altered.frameSize) {
            this._gl.uniform1f(this._uFrameSize, this._frameSize);
        }

        if (override || this._altered.pointSize) {
            this._gl.uniform1f(this._uPointSize, this._pointSize);
        }

        if (override || this._altered.useDiscard) {
            this._gl.uniform1i(this._uUseDiscard, Number(this._useDiscard));
        }

        if (override || this._altered.colorMode) {
            this._gl.uniform1i(this._uColorMode, Number(this._colorMode));
        }

        if (override || this._altered.colorMapping) {
            this._gl.uniform1i(this._uColorMapping, Number(this._colorMapping));
        }

        this._program.unbind();

        this._altered.reset();
    }

    @Initializable.assert_initialized()
    public frame(): void {
        if (this._positions === undefined || this._positions.length === 0) {
            return;
        }

        const size = this._target.size;
        this._gl.viewport(0, 0, size[0], size[1]);

        // should be enabled anyway, just make sure
        this._gl.enable(this._gl.DEPTH_TEST);
        // only enable for this pass -> disable afterwards
        this._gl.depthFunc(this._gl.LESS);

        this._gl.enable(this._gl.SAMPLE_ALPHA_TO_COVERAGE);

        this._program.bind();

        this._gl.uniformMatrix4fv(
            this._uViewProjection, false, this._camera.viewProjection);
        this._gl.uniform2fv(this._uNdcOffset, this._ndcOffset);

        this._target.bind();

        this._geometry.bind();
        this._geometry.draw();
        this._geometry.unbind();

        this._program.unbind();

        this._gl.disable(this._gl.SAMPLE_ALPHA_TO_COVERAGE);
    }

    public set positions(positions: Float32Array) {
        this.assertInitialized();
        this._positions = positions;
        this._altered.alter('positions');
    }

    public set target(target: Framebuffer) {
        this.assertInitialized();
        this._target = target;
    }

    public set frameSize(size: GLfloat) {
        this.assertInitialized();
        this._frameSize = size;
        this._altered.alter('frameSize');
    }

    public set pointSize(size: GLfloat) {
        this.assertInitialized();
        this._pointSize = size;
        this._altered.alter('pointSize');
    }

    public set useDiscard(enabled: boolean) {
        this.assertInitialized();
        this._useDiscard = enabled;
        this._altered.alter('useDiscard');
    }

    public set colorMode(mode: number) {
        this.assertInitialized();
        this._colorMode = mode;
        this._altered.alter('colorMode');
    }

    public set colorMapping(mode: number) {
        this.assertInitialized();
        this._colorMapping = mode;
        this._altered.alter('colorMapping');
    }

    public set camera(camera: Camera) {
        this.assertInitialized();
        if (this._camera === camera) {
            return;
        }
        this._camera = camera;
    }

    public set ndcOffset(offset: GLfloat2) {
        this.assertInitialized();
        this._ndcOffset = offset;
    }

    public get altered(): boolean {
        return this._altered.any;
    }
}
