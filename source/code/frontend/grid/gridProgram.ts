import { Context, Shader, Program, mat4, vec3 } from "webgl-operate";

export class GridProgram {
    protected static readonly DEFAULT_POINT_SIZE = 1.0 / 128.0;

    protected _gl: WebGLRenderingContext;
    protected _program: Program;

    protected _uViewProjection: WebGLUniformLocation;
    protected _uColor: WebGLUniformLocation;

    public constructor(context: Context) {
        this._gl = context.gl as WebGLRenderingContext;

        const vert = new Shader(context, this._gl.VERTEX_SHADER);
        vert.initialize(require('./grid.vert'));
        const frag = new Shader(context, this._gl.FRAGMENT_SHADER);
        frag.initialize(require('./grid.frag'));

        this._program = new Program(context);
        this._program.initialize([vert, frag], false);

        this._program.link();
        this._program.bind();

        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uColor = this._program.uniform('u_color');

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

    viewProjection(
        mat: mat4, bind: boolean = true, unbind: boolean = true
    ): void {
        if(bind) this._program.bind();
        this._gl.uniformMatrix4fv(this._uViewProjection, false, mat);
        if(unbind) this._program.bind();
    }

    color(vec: vec3, bind: boolean = true, unbind: boolean = true): void {
        if(bind) this._program.bind();
        this._gl.uniform3fv(this._uColor, vec);
        if(unbind) this._program.bind();
    }
}
