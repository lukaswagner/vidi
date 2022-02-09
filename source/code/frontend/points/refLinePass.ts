import { Alpha, AlphaMode } from 'frontend/util/alpha';

import {
    ChangeLookup,
    Context,
    Framebuffer,
    Initializable,
    Program,
    Shader,
    mat4,
} from 'webgl-operate';

import { GLfloat2 } from 'shared/types/tuples';
import { PointCloudGeometry } from './pointCloudGeometry';
import { Interaction } from 'frontend/globals';

export class RefLinePass extends Initializable {
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        useDiscard: false,
        model: false,
        baseAxis: false,
        baseValue: false
    });

    protected _context: Context;
    protected _gl: WebGL2RenderingContext;

    protected _target: Framebuffer;

    protected _aspectRatio: GLfloat;
    protected _useDiscard: boolean;
    protected _ndcOffset: GLfloat2 = [0.0, 0.0];
    protected _model: mat4;

    protected _program: Program;
    protected _alpha: Alpha;
    protected _baseAxis: number;
    protected _baseValue: number[];

    protected _uModel: WebGLUniformLocation;
    protected _uViewProjection: WebGLUniformLocation;
    protected _uViewProjectionInverse: WebGLUniformLocation;
    protected _uNdcOffset: WebGLUniformLocation;
    protected _uCameraPosition: WebGLUniformLocation;
    protected _uUseDiscard: WebGLUniformLocation;
    protected _uMfAlpha: WebGLUniformLocation;
    protected _uBaseAxis: WebGLUniformLocation;
    protected _uBaseValue: WebGLUniformLocation;

    protected _geometries: PointCloudGeometry[] = [];

    public constructor(context: Context) {
        super();
        this._context = context;
        this._gl = context.gl;

        this._program = new Program(this._context);
    }

    @Initializable.initialize()
    public initialize(): boolean {
        this._context.enable(['OES_standard_derivatives']);

        const vert = new Shader(
            this._context, this._gl.VERTEX_SHADER, 'refLine.vert');
        vert.initialize(require('./refLine.vert'));
        const frag = new Shader(
            this._context, this._gl.FRAGMENT_SHADER, 'refLine.frag');
        frag.initialize(require('./refLine.frag'));

        this._program.initialize([vert, frag], false);

        this._program.link();

        this._uModel = this._program.uniform('u_model');
        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uViewProjectionInverse =
            this._program.uniform('u_viewProjectionInverse');
        this._uNdcOffset = this._program.uniform('u_ndcOffset');
        this._uCameraPosition = this._program.uniform('u_cameraPosition');
        this._uUseDiscard = this._program.uniform('u_useDiscard');
        this._uBaseAxis = this._program.uniform('u_baseAxis');
        this._uBaseValue = this._program.uniform('u_baseValue');

        this._alpha = new Alpha(
            this._gl, this._program, AlphaMode.AlphaToCoverage);

        return true;
    }

    @Initializable.uninitialize()
    public uninitialize(): void {
        this._geometries.forEach((g) => g.uninitialize());
        this._program.uninitialize();

        this._uViewProjection = undefined;
        this._uViewProjectionInverse = undefined;
        this._uNdcOffset = undefined;
        this._uCameraPosition = undefined;
        this._uUseDiscard = undefined;
    }

    @Initializable.assert_initialized()
    public update(): void {
        this._program.bind();

        if (this._altered.model) {
            this._gl.uniformMatrix4fv(this._uModel, false, this._model);
        }

        if (this._altered.useDiscard) {
            this._gl.uniform1i(this._uUseDiscard, Number(this._useDiscard));
        }

        if (this._altered.baseAxis) {
            this._gl.uniform1i(this._uBaseAxis, this._baseAxis);
        }

        if (this._altered.baseAxis || this._altered.baseValue) {
            this._gl.uniform1f(
                this._uBaseValue, this._baseValue?.[this._baseAxis]);
        }

        this._program.unbind();

        this._altered.reset();
    }

    @Initializable.assert_initialized()
    public frame(frameNumber: number): void {
        if(this._baseAxis < 0) return;

        this._program.bind();

        this._gl.uniformMatrix4fv(
            this._uViewProjection, false, Interaction.camera.viewProjection);
        this._gl.uniformMatrix4fv(
            this._uViewProjectionInverse,
            false,
            Interaction.camera.viewProjectionInverse);
        this._gl.uniform2fv(this._uNdcOffset, this._ndcOffset);
        this._gl.uniform3fv(this._uCameraPosition, Interaction.camera.eye);

        this._target.bind();

        this._gl.disable(this._gl.CULL_FACE);
        this._alpha.enable(frameNumber);
        this._geometries.forEach((g) => {
            g.bind();
            g.draw();
            g.unbind();
        });
        this._alpha.disable();
        this._gl.enable(this._gl.CULL_FACE);

        this._program.unbind();
    }

    public set target(target: Framebuffer) {
        this.assertInitialized();
        this._target = target;
    }

    public set aspectRatio(aspectRation: GLfloat) {
        this.assertInitialized();
        this._aspectRatio = aspectRation;
        this._altered.alter('aspectRatio');
    }

    public set useDiscard(enabled: boolean) {
        this.assertInitialized();
        this._useDiscard = enabled;
        this._altered.alter('useDiscard');
    }

    public set ndcOffset(offset: GLfloat2) {
        this.assertInitialized();
        this._ndcOffset = offset;
    }

    public set model(model: mat4) {
        this.assertInitialized();
        if (this._model === model) {
            return;
        }
        this._model = model;
        this._altered.alter('model');
    }

    public set geometries(geom: PointCloudGeometry[]) {
        this._geometries = geom;
    }

    public get altered(): boolean {
        return this._altered.any;
    }

    public set baseAxis(axis: number) {
        this.assertInitialized();
        this._baseAxis = axis;
        this._altered.alter('baseAxis');
    }

    public set baseValue(value: number[]) {
        this.assertInitialized();
        this._baseValue = value;
        this._altered.alter('baseValue');
    }
}