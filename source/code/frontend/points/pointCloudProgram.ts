import { Context, Shader, Program, mat4, vec3 } from "webgl-operate";

export class PointCloudProgram {
    protected static readonly DEFAULT_POINT_SIZE = 1.0 / 128.0;

    protected _gl: WebGLRenderingContext;
    protected _program: Program;

    protected _model: mat4;

    protected _pointSize: GLfloat = PointCloudProgram.DEFAULT_POINT_SIZE;

    protected _uModel: WebGLUniformLocation;
    protected _uViewProjection: WebGLUniformLocation;
    protected _uFrameSize: WebGLUniformLocation;
    protected _uPointSize: WebGLUniformLocation;
    protected _uUseDiscard: WebGLUniformLocation;

    public constructor(context: Context) {
        this._gl = context.gl as WebGLRenderingContext;

        const vert = new Shader(context, this._gl.VERTEX_SHADER);
        vert.initialize(require('./particle.vert'));
        const frag = new Shader(context, this._gl.FRAGMENT_SHADER);
        frag.initialize(require('./particle.frag'));

        this._program = new Program(context);
        this._program.initialize([vert, frag], false);

        this._program.link();
        this._program.bind();

        this._uModel = this._program.uniform('u_model');
        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uFrameSize = this._program.uniform('u_pointSize');
        this._uPointSize = this._program.uniform('u_frameSize');
        this._uUseDiscard = this._program.uniform('u_useDiscard');

        this._program.unbind();
    }

    uninitialize(): void {
        this._program.uninitialize();
    }

    bind(): void {
        this._program.bind();
    }

    unbind(): void {
        this._program.unbind();
    }

    model(mat: mat4, bind: boolean = true, unbind: boolean = true): void {
        if(bind) this._program.bind();
        this._gl.uniformMatrix4fv(this._uModel, false, mat);
        if(unbind) this._program.bind();
    }

    viewProjection(
        mat: mat4, bind: boolean = true, unbind: boolean = true
    ): void {
        if(bind) this._program.bind();
        this._gl.uniformMatrix4fv(this._uViewProjection, false, mat);
        if(unbind) this._program.bind();
    }

    frameSize(
        size: number, bind: boolean = true, unbind: boolean = true
    ): void {
        if(bind) this._program.bind();
        this._gl.uniform1f(this._uFrameSize, size);
        if(unbind) this._program.bind();
    }

    pointSize(
        size: number, bind: boolean = true, unbind: boolean = true
    ): void {
        if(bind) this._program.bind();
        this._gl.uniform1f(this._uPointSize, size);
        if(unbind) this._program.bind();
    }

    useDiscard(
        enable: boolean, bind: boolean = true, unbind: boolean = true
    ): void {
        if(bind) this._program.bind();
        this._gl.uniform1i(this._uUseDiscard, Number(enable));
        if(unbind) this._program.bind();
    }
}
