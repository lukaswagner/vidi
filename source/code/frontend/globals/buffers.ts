import {
    Context,
    Framebuffer,
    Renderbuffer,
    Texture2D,
} from 'webgl-operate';

import { Formats } from './formats';
// @ts-expect-error: @types/pngjs does not provide typings for /browser
import { PNG } from 'pngjs/browser';
import { Passes } from './passes';

export class Buffers {
    protected static _instance: Buffers;
    protected _context: Context;
    protected _gl: WebGL2RenderingContext;
    protected _maxSamples: number;
    protected _needRebuild = true;

    // render settings
    protected _msaa = 1;
    protected _mfaa = 1;
    protected _width = 1;
    protected _height = 1;

    // aa modes
    protected _msEnabled: boolean;
    protected _mfEnabled: boolean;

    // multi sample buffers
    protected _msColor: Renderbuffer;
    protected _msDepth: Renderbuffer;
    protected _msFBO: Framebuffer;

    // single sample buffers
    protected _ssColor: Texture2D;
    protected _ssIndexHigh: Texture2D;
    protected _ssIndexLow: Texture2D;
    protected _ssDepth: Texture2D;
    protected _ssFBO: Framebuffer;

    // ortho buffers
    protected static _orthoRes = 256;
    protected _orthoTex: Texture2D;
    protected _orthoFBO: Framebuffer;

    protected constructor(context: Context) {
        this._context = context;
        this._gl = context.gl;
        this._maxSamples = this._gl.getParameter(this._gl.MAX_SAMPLES);
    }

    protected setupFBOs(): void {
        this._msEnabled = this._msaa > 1;
        this._mfEnabled = this._mfaa > 1;

        const enabled = (v: boolean): string => v ? 'ON' : 'OFF';

        const samples = Math.min(this._msaa, this._maxSamples);
        console.log(
            `MSAA ${enabled(this._msEnabled)}, ${samples} samples (req ${this._msaa}, max ${this._maxSamples})`);
        console.log(
            `MFAA ${enabled(this._mfEnabled)}, ${this._mfaa} samples`);
        const w = this._width;
        const h = this._height;

        if (this._msFBO?.initialized) this._msFBO.uninitialize();
        if (this._msColor?.initialized) this._msColor.uninitialize();
        if (this._msDepth?.initialized) this._msDepth.uninitialize();
        if (this._msEnabled) {
            this._msColor =
                this.createRenderbuffer(Formats.rbg[0], w, h, samples);
            this._msDepth =
                this.createRenderbuffer(Formats.depth[0], w, h, samples);
            this._msFBO = new Framebuffer(this._context, 'ms fbo');
            this._msFBO.initialize([
                [this._gl.COLOR_ATTACHMENT0, this._msColor],
                [this._gl.DEPTH_ATTACHMENT, this._msDepth]
            ]);
        }

        if (this._ssFBO?.initialized) this._ssFBO.uninitialize();
        if (this._ssColor?.initialized) this._ssColor.uninitialize();
        if (this._ssIndexHigh?.initialized) this._ssIndexHigh.uninitialize();
        if (this._ssIndexLow?.initialized) this._ssIndexLow.uninitialize();
        if (this._ssDepth?.initialized) this._ssDepth.uninitialize();

        this._ssColor = this.createTexture(Formats.rbg, w, h);
        this._ssIndexHigh = this.createTexture(Formats.index, w, h);
        this._ssIndexLow = this.createTexture(Formats.index, w, h);
        this._ssDepth = this.createTexture(Formats.depth, w, h);
        this._ssFBO = new Framebuffer(this._context, 'ss fbo');
        this._ssFBO.initialize([
            [this._gl.COLOR_ATTACHMENT0, this._ssColor],
            [this._gl.COLOR_ATTACHMENT1, this._ssIndexHigh],
            [this._gl.COLOR_ATTACHMENT2, this._ssIndexLow],
            [this._gl.DEPTH_ATTACHMENT, this._ssDepth]
        ]);

        Passes.accumulate.texture = this._ssColor;

        if(!this._orthoFBO || !this._orthoTex)
            [this._orthoTex, this._orthoFBO] = this.createOrthoBuffer();

        Passes.debug.setInputs(
            this._msFBO,
            this._msColor, this._msDepth,
            this._ssFBO,
            this._ssColor, this._ssIndexHigh, this._ssIndexLow, this._ssDepth,
            this._orthoTex);

        this._needRebuild = false;
    }

    protected createRenderbuffer(
        format: GLuint, width = 1, height = 1, multisample = 1
    ): Renderbuffer {
        const buf = new Renderbuffer(this._context);
        buf.initialize(width, height, format, multisample);
        return buf;
    }

    protected createTexture(
        format: [GLuint, GLuint, GLuint], width = 1, height = 1
    ): Texture2D {
        const buf = new Texture2D(this._context);
        buf.initialize(width, height, ...format);
        return buf;
    }

    protected createOrthoBuffer(): [Texture2D, Framebuffer] {
        const buf = new Texture2D(this._context);
        // use either 32 bit and no filtering or 16 bit and linear filtering
        buf.initialize(Buffers._orthoRes, Buffers._orthoRes,
            this._gl.RGBA16F, this._gl.RGBA, this._gl.FLOAT);
        buf.filter(this._gl.LINEAR, this._gl.LINEAR);
        const fbo = new Framebuffer(this._context);
        fbo.initialize([[this._gl.COLOR_ATTACHMENT0, buf]]);
        return [buf, fbo];
    }

    public static initialize(context: Context): void {
        this._instance = new Buffers(context);
    }

    public static get msEnabled(): boolean {
        return this._instance._msEnabled;
    }

    public static set msSamples(value: number) {
        this._instance._msaa = value;
        const ms = value !== 1;
        if(ms !== this._instance._msEnabled) this._instance._needRebuild = true;
        this._instance._msEnabled = ms;
    }

    public static get mfEnabled(): boolean {
        return this._instance._mfEnabled;
    }

    public static set mfSamples(value: number) {
        this._instance._mfaa = value;
        this._instance._mfEnabled = value !== 1;
    }

    public static get msFBO(): Framebuffer {
        return this._instance._msFBO;
    }

    public static get ssFBO(): Framebuffer {
        return this._instance._ssFBO;
    }

    public static get renderFBO(): Framebuffer {
        return Buffers.msEnabled ?
            this._instance._msFBO :
            this._instance._ssFBO;
    }

    public static get indexFBO(): Framebuffer {
        return this._instance._ssFBO;
    }

    public static get orthoFBO(): Framebuffer {
        return this._instance._orthoFBO;
    }

    public static get orthoTex(): Texture2D {
        return this._instance._orthoTex;
    }

    public static get maxSamples(): number {
        return this._instance._maxSamples;
    }

    public static resize(width: number, height: number): void {
        this._instance._width = width;
        this._instance._height = height;
        if(this.msEnabled) this._instance._msFBO?.resize(width, height);
        this._instance._ssFBO?.resize(width, height);
    }

    public static get altered(): boolean {
        return this._instance._needRebuild;
    }

    public static update(): void {
        if(this._instance._needRebuild) this._instance.setupFBOs();
    }

    public static exportPng(): void {
        let fb = Buffers.renderFBO;
        if(Buffers.mfEnabled) fb = Passes.accumulate.framebuffer;

        const gl = this._instance._gl;

        let obj = fb.object;
        let tex: WebGLTexture;
        // can't call readPixels on multi sampled FB, have to blit first
        if(Buffers.msEnabled) {
            tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8,
                fb.width, fb.height, 0,
                gl.RGBA, gl.UNSIGNED_BYTE, undefined);
            obj = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, obj);
            gl.framebufferTexture2D(
                gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
            gl.bindFramebuffer(gl.FRAMEBUFFER, undefined);

            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fb.object);
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, obj);
            gl.readBuffer(gl.COLOR_ATTACHMENT0);
            gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
            gl.blitFramebuffer(
                0, 0, fb.width, fb.height,
                0, 0, fb.width, fb.height,
                gl.COLOR_BUFFER_BIT, gl.LINEAR);
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, undefined);
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, undefined);
        }

        const buf = new Uint8Array(fb.width * fb.height * 4);

        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, obj);
        gl.readBuffer(gl.COLOR_ATTACHMENT0);
        gl.readPixels(
            0, 0, fb.width, fb.height, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);

        if(Buffers.msEnabled) {
            gl.deleteFramebuffer(obj);
            gl.deleteTexture(tex);
        }

        const png = new PNG({
            width: fb.width, height: fb.height,
            bgColor:{ red: 238, green: 238, blue: 238 },
            colorType: 2
        });
        const bytesPerRow = 4 * fb.width;
        buf.forEach((v, i) => {
            const row = Math.floor(i / bytesPerRow);
            const newRow = fb.height - 1 - row;
            const byteInRow = i - row * bytesPerRow;
            if(byteInRow % 4 === 3) v = 255;
            png.data[newRow * bytesPerRow + byteInRow] = v;
        });
        const out: Buffer = PNG.sync.write(png);
        const blob = new Blob([out]);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'screenshot.png';
        link.click();
        link.remove();
    }
}
