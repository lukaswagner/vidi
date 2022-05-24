import {
    Context,
    Framebuffer,
    Initializable,
    NdcFillingTriangle,
    Program,
    Shader,
    Texture2D
} from 'webgl-operate';

import { Buffers } from 'frontend/globals/buffers';

export class MinMaxPass extends Initializable {
    protected static resStep = 4;
    protected _context: Context;
    protected _gl: WebGL2RenderingContext;

    protected _geom: NdcFillingTriangle;
    protected _textures: Texture2D[];
    protected _buffers: Framebuffer[];
    protected _program: Program;
    protected _uLevel: WebGLUniformLocation;
    protected _uRes: WebGLUniformLocation;

    public constructor(context: Context) {
        super();
        this._context = context;
        this._gl = context.gl;
    }

    protected genTextures(): void {
        let res = Buffers.orthoTex.size[0];
        this._textures = [];
        this._buffers = [];

        do {
            res /= MinMaxPass.resStep;
            const tex = new Texture2D(this._context, `mmt${res}`);
            tex.initialize(
                res, res, this._gl.RGBA16F, this._gl.RGBA, this._gl.FLOAT);
            tex.filter(this._gl.NEAREST, this._gl.NEAREST);
            this._textures.push(tex);
            const fbo = new Framebuffer(this._context, `mmb${res}`);
            fbo.initialize([[this._gl.COLOR_ATTACHMENT0, tex]]);
            this._buffers.push(fbo);
        } while (res > 1);
    }

    protected setupProgram(): void {
        const vert = new Shader(this._context, this._gl.VERTEX_SHADER);
        vert.initialize(require('./minMax.vert'));
        const frag = new Shader(this._context, this._gl.FRAGMENT_SHADER);
        frag.initialize(require('./minMax.frag'), false);
        frag.replace('RESOLUTION', MinMaxPass.resStep.toString());
        frag.compile();
        this._program = new Program(this._context);
        this._program.initialize([vert, frag]);

        this._uLevel = this._program.uniform('u_level');
        this._uRes = this._program.uniform('u_res');
        this._program.bind();
        this._gl.uniform1i(this._program.uniform('u_texture'), 0);
        this._program.unbind();
    }

    public initialize(): boolean {
        this.genTextures();
        this.setupProgram();

        this._geom = new NdcFillingTriangle(this._context);
        this._geom.initialize();

        return true;
    }

    public uninitialize(): void {
        this._program.uninitialize();
        this._buffers.forEach((b) => b.uninitialize());
        this._textures.forEach((t) => t.uninitialize());
    }

    public frame(): [number, number] {
        for (let i = 0; i < this._textures.length; i++) {
            const fbo = this._buffers[i];
            fbo.bind();
            this._gl.viewport(0, 0, ...fbo.size);
            this._gl.drawBuffers([this._gl.COLOR_ATTACHMENT0]);
            this._gl.clearBufferfv(this._gl.COLOR, 0, [0, 0, 0, 0]);

            const tex = i > 0 ? this._textures[i - 1] : Buffers.orthoTex;
            tex.bind(this._gl.TEXTURE0);
            this._program.bind();
            this._gl.uniform1i(this._uLevel, i);
            this._gl.uniform1f(this._uRes, tex.size[0]);

            this._geom.bind();
            this._geom.draw();
            this._geom.unbind();

            this._program.unbind();
            tex.unbind(this._gl.TEXTURE0);
            fbo.unbind();
        }

        const last = this._buffers[this._buffers.length - 1];
        const buf = new Float32Array(4);
        last.bind(this._gl.READ_FRAMEBUFFER);
        this._gl.readBuffer(this._gl.COLOR_ATTACHMENT0);
        this._gl.readPixels(0, 0, 1, 1, this._gl.RGBA, this._gl.FLOAT, buf, 0);
        last.unbind(this._gl.READ_FRAMEBUFFER);

        return [ buf[0], buf[1] ];
    }

    public get texture(): Texture2D {
        return this._textures[1];
    }

    public reset(): void {
        this._textures?.forEach((t) => t.resize(...t.size));
    }
}
