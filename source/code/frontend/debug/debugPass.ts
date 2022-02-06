import {
    Context,
    Framebuffer,
    Initializable,
    NdcFillingTriangle,
    Program,
    Renderbuffer,
    Shader,
    Texture2D,
    vec2,
} from 'webgl-operate';

import { drawBuffer, drawBuffers } from 'frontend/util/drawBuffer';
import { Formats } from 'frontend/globals';

export enum DebugMode {
    Off = 'Off',
    MSC = 'MS Color',
    MSD = 'MS Depth',
    SSC = 'SS Color',
    SSIH = 'SS Index High',
    SSIL = 'SS Index Low',
    SSD = 'SS Depth',
}

export class DebugPass extends Initializable {
    protected _context: Context;
    protected _gl: WebGL2RenderingContext;

    // multi sampled inputs
    protected _msFBO: Framebuffer;
    protected _msColor: Renderbuffer;
    protected _msDepth: Renderbuffer;
    // multi sampled read helpers
    protected _msFBORead: Framebuffer;
    protected _msColorRead: Texture2D;
    protected _msDepthRead: Texture2D;

    // single sampled inputs
    protected _ssFBO: Framebuffer;
    protected _ssColor: Texture2D;
    protected _ssIndexHigh: Texture2D;
    protected _ssIndexLow: Texture2D;
    protected _ssDepth: Texture2D;

    protected _outColor: Renderbuffer;
    protected _out: Framebuffer;

    protected _size: vec2;
    protected _geom: NdcFillingTriangle;
    protected _program: Program;
    protected _uTexture: WebGLUniformLocation;

    public constructor(context: Context) {
        super();
        this._context = context;
        this._gl = context.gl;
    }

    protected setupProgram(): void {
        const vert = new Shader(this._context, this._gl.VERTEX_SHADER);
        vert.initialize(require('./debug.vert'));
        const frag = new Shader(this._context, this._gl.FRAGMENT_SHADER);
        frag.initialize(require('./debug.frag'));
        this._program = new Program(this._context);
        this._program.initialize([vert, frag]);

        this._uTexture = this._program.uniform('u_texture');
        this._program.bind();
        this._gl.uniform1i(this._program.uniform('u_color'), 0);
        this._gl.uniform1i(this._program.uniform('u_index'), 1);
        this._gl.uniform1i(this._program.uniform('u_depth'), 2);
        this._gl.uniform1i(this._program.uniform('u_channel'), 0);
        this._program.unbind();
    }

    protected setupOutput(): void {
        this._outColor = new Renderbuffer(this._context);
        this._outColor.initialize(1, 1, Formats.rbg[0]);
        this._out = new Framebuffer(this._context);
        this._out.initialize([[this._gl.COLOR_ATTACHMENT0, this._outColor]]);
    }

    protected setupGeometry(): void {
        this._geom = new NdcFillingTriangle(this._context);
        this._geom.initialize();
    }

    protected setupReadHelpers(): void {
        this._msColorRead = new Texture2D(this._context);
        this._msColorRead.initialize(1, 1, ...Formats.rbg);
        this._msDepthRead = new Texture2D(this._context);
        this._msDepthRead.initialize(1, 1, ...Formats.depth);

        this._msFBORead = new Framebuffer(this._context, 'debug fbo');
        this._msFBORead.initialize([
            [this._gl.COLOR_ATTACHMENT0, this._msColorRead],
            [this._gl.DEPTH_ATTACHMENT, this._msDepthRead]
        ]);
    }

    protected blit(
        from: Framebuffer, read: GLuint,
        to: Framebuffer = this._out, write: GLuint = this._gl.COLOR_ATTACHMENT0
    ): void {
        this._gl.bindFramebuffer(this._gl.READ_FRAMEBUFFER, from.object);
        this._gl.bindFramebuffer(this._gl.DRAW_FRAMEBUFFER, to.object);
        this._gl.readBuffer(read);
        drawBuffer(this._gl, write);
        this._gl.blitFramebuffer(
            0, 0, this._size[0], this._size[1],
            0, 0, this._size[0], this._size[1],
            this._gl.COLOR_BUFFER_BIT, this._gl.NEAREST);
        this._gl.bindFramebuffer(this._gl.READ_FRAMEBUFFER, null);
        this._gl.bindFramebuffer(this._gl.DRAW_FRAMEBUFFER, null);
    }

    protected blitDepth(
        from: Framebuffer, to: Framebuffer
    ): void {
        this._gl.bindFramebuffer(this._gl.READ_FRAMEBUFFER, from.object);
        this._gl.bindFramebuffer(this._gl.DRAW_FRAMEBUFFER, to.object);
        this._gl.readBuffer(this._gl.NONE);
        drawBuffers(this._gl, 0b0);
        this._gl.blitFramebuffer(
            0, 0, this._size[0], this._size[1],
            0, 0, this._size[0], this._size[1],
            this._gl.DEPTH_BUFFER_BIT, this._gl.NEAREST);
        this._gl.bindFramebuffer(this._gl.READ_FRAMEBUFFER, null);
        this._gl.bindFramebuffer(this._gl.DRAW_FRAMEBUFFER, null);
    }

    protected drawTex(texture: Texture2D, sampler: number): void {
        this._out.clear(this._gl.COLOR_BUFFER_BIT, true, false);
        drawBuffers(this._gl, 0b1);
        this._program.bind();
        this._gl.uniform1i(this._uTexture, sampler);
        texture.bind(this._gl.TEXTURE0 + sampler);

        this._geom.bind();
        this._geom.draw();
        this._geom.unbind();

        texture.unbind(this._gl.TEXTURE0 + sampler);
        this._program.unbind();
        this._out.unbind();
    }

    @Initializable.initialize()
    public initialize(): boolean {
        this.setupProgram();
        this.setupOutput();
        this.setupGeometry();
        this.setupReadHelpers();

        return true;
    }

    @Initializable.uninitialize()
    public uninitialize(): void {
        this._program.uninitialize();
        this._geom.uninitialize();
        this._out.uninitialize();
        this._outColor.uninitialize();
        this._msColorRead.uninitialize();
        this._msDepthRead.uninitialize();
    }

    @Initializable.assert_initialized()
    public frame(mode: DebugMode): void {
        switch (mode) {
            case DebugMode.MSC:
                this.blit(this._msFBO, this._gl.COLOR_ATTACHMENT0);
                break;
            case DebugMode.MSD:
                this.blitDepth(this._msFBO, this._msFBORead);
                this.drawTex(this._msDepthRead, 2);
                break;
            case DebugMode.SSC:
                this.blit(this._ssFBO, this._gl.COLOR_ATTACHMENT0);
                break;
            case DebugMode.SSIH:
                this.drawTex(this._ssIndexHigh, 1);
                break;
            case DebugMode.SSIL:
                this.drawTex(this._ssIndexLow, 1);
                break;
            case DebugMode.SSD:
                this.drawTex(this._ssDepth, 2);
                break;
            default:
                break;
        }
    }

    public setInputs(
        ms: Framebuffer,
        msc: Renderbuffer, msd: Renderbuffer,
        ss: Framebuffer,
        ssc: Texture2D, ssih: Texture2D, ssil: Texture2D, ssd: Texture2D
    ): void {
        this._msFBO = ms;
        this._msColor = msc;
        this._msDepth = msd;
        this._ssFBO = ss;
        this._ssColor = ssc;
        this._ssIndexHigh = ssih;
        this._ssIndexLow = ssil;
        this._ssDepth = ssd;
    }

    public get output(): Framebuffer {
        return this._out;
    }

    @Initializable.assert_initialized()
    public resize(size: vec2): boolean {
        if (this._size !== undefined && vec2.equals(size, this._size)) {
            return false;
        }

        this._size = size;
        this._out.resize(size[0], size[1]);

        return true;
    }
}
