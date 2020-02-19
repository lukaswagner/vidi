import { Context, Shader, Program, mat4, vec3 } from "webgl-operate";

export class PointCloudProgram {
    protected static readonly DEFAULT_POINT_SIZE = 1.0 / 128.0;

    protected _gl: WebGLRenderingContext;
    protected _program: Program;

    protected _model: mat4;

    protected readonly _positionLocation: GLuint = 0;
    protected readonly _colorLocation: GLuint = 1;

    protected _pointSize: GLfloat = PointCloudProgram.DEFAULT_POINT_SIZE;

    protected _uModel: WebGLUniformLocation;
    protected _uView: WebGLUniformLocation;
    protected _uViewProjection: WebGLUniformLocation;
    protected _uLight: WebGLUniformLocation;
    protected _uFrameSize: WebGLUniformLocation;
    protected _uPointSize: WebGLUniformLocation;

    public constructor(context: Context) {
        this._gl = context.gl as WebGLRenderingContext;

        const vert = new Shader(context, this._gl.VERTEX_SHADER);
        vert.initialize(require('./particle.vert'));
        const frag = new Shader(context, this._gl.FRAGMENT_SHADER);
        frag.initialize(require('./particle.frag'));

        this._program = new Program(context, 'ParticleProgram');
        this._program.initialize([vert, frag], false);

        this._program.attribute('a_position', this._positionLocation);
        this._program.link();
        this._program.bind();

        this._uModel = this._program.uniform('u_model');
        this._uView = this._program.uniform('u_view');
        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uLight = this._program.uniform('u_light');
        this._uFrameSize = this._program.uniform('u_pointSize');
        this._uPointSize = this._program.uniform('u_frameSize');
    }

    uninitialize(): void {
        this._program.uninitialize();
    }

    set model(mat: mat4) {
        this._gl.uniformMatrix4fv(this._uModel, false, mat);
    }

    set view(mat: mat4) {
        this._gl.uniformMatrix4fv(this._uView, false, mat);
    }

    set viewProjection(mat: mat4) {
        this._gl.uniformMatrix4fv(this._uViewProjection, false, mat);
    }

    set lightDir(dir: vec3) {
        this._gl.uniform3fv(this._uLight, dir);
    }

    set frameSize(size: number) {
        this._gl.uniform1f(this._uFrameSize, size);
    }

    set pointSize(size: number) {
        this._gl.uniform1f(this._uPointSize, size);
    }
}