import { Program } from 'webgl-operate';

export enum AlphaMode {
    None = 0,
    Blend = 1,
    AlphaToCoverage = 2,
    Temporal = 3,
}

export class Alpha {
    protected _gl: WebGL2RenderingContext;
    protected _program: Program;
    protected _mode: AlphaMode;

    protected _uAlphaMode: WebGLUniformLocation;
    protected _uMfAlpha: WebGLUniformLocation;

    public constructor(
        gl: WebGL2RenderingContext, program: Program, mode = AlphaMode.None
    ) {
        this._gl = gl;
        this._program = program;
        this._mode = mode;

        this._uAlphaMode = this._program.uniform('u_alphaMode');
        this._uMfAlpha = this._program.uniform('u_mfAlpha');
    }

    public enable(frameNumber = 0): void {
        this._gl.uniform1i(this._uAlphaMode, this._mode);
        switch (this._mode) {
            case AlphaMode.Blend:
                this._gl.enable(this._gl.BLEND);
                this._gl.blendFunc(
                    this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA);
                break;
            case AlphaMode.AlphaToCoverage:
                this._gl.enable(this._gl.SAMPLE_ALPHA_TO_COVERAGE);
                break;
            case AlphaMode.Temporal:
                this._gl.uniform1f(this._uMfAlpha, this.mfAlpha(frameNumber));
                break;
            case AlphaMode.None:
            default:
                break;
        }
    }

    public disable(): void {
        switch (this._mode) {
            case AlphaMode.Blend:
                this._gl.disable(this._gl.BLEND);
                break;
            case AlphaMode.AlphaToCoverage:
                this._gl.disable(this._gl.SAMPLE_ALPHA_TO_COVERAGE);
                break;
            case AlphaMode.Temporal:
            case AlphaMode.None:
            default:
                break;
        }
    }

    protected mfAlpha(frameNumber: number): number {
        const strength = 1 / (frameNumber + 1);
        const signScale = -(frameNumber % 2) + 0.5; // 0 -> 0.5, 1 -> -0.5
        return 0.5 + strength * signScale;
    }
}
