type Format = [GLuint, GLuint, GLuint];

export class Formats {
    protected _rgb: Format;
    protected _index: Format;
    protected _depth: Format;

    protected static _instance: Formats;

    protected constructor(gl: WebGL2RenderingContext) {
        this._rgb = [
            gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE
        ];
        this._depth = [
            gl.DEPTH_COMPONENT32F, gl.DEPTH_COMPONENT, gl.FLOAT
        ];
        this._index = [
            gl.RGBA8UI, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE
        ];
    }

    public static initialize(gl: WebGL2RenderingContext): void {
        this._instance = new Formats(gl);
    }

    public static get rbg(): Format {
        return this._instance._rgb;
    }

    public static get index(): Format {
        return this._instance._index;
    }

    public static get depth(): Format {
        return this._instance._depth;
    }
}
