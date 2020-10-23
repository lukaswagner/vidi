import {
    Buffer,
    Context,
    Geometry,
    Initializable,
} from 'webgl-operate';

export class ClusterGeometry extends Geometry {
    protected _gl: WebGL2RenderingContext;

    protected _vertices: Float32Array;
    protected _indices: Uint32Array;

    protected _aVertex: GLuint;

    public constructor(context: Context) {
        super(context);
        this._gl = this.context.gl as WebGL2RenderingContext;

        this._buffers.push(new Buffer(context), new Buffer(context));
    }

    @Initializable.initialize()
    public initialize(aVertex: GLuint = 0): boolean {
        this._aVertex = aVertex;

        const valid = super.initialize([
            this._gl.ARRAY_BUFFER,
            this._gl.ELEMENT_ARRAY_BUFFER,
        ]);

        return valid;
    }

    // placeholder function to allow instantiation of this class
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public build(resolution: number): void {
        throw new Error('not implemented');
    }

    public draw(): void {
        this._gl.drawElements(
            this._gl.TRIANGLE_STRIP, this._indices.length,
            this._gl.UNSIGNED_INT, 0);
    }

    public get aVertex(): GLuint {
        return this._aVertex;
    }

    public set aVertex(location: GLuint) {
        this._aVertex = location;
    }

    protected bindBuffers(): void {
        this._buffers[0].attribEnable(
            this._aVertex, 2, this._gl.FLOAT,
            false, 0, 0, true, false);
        this._buffers[1].bind();
    }

    protected unbindBuffers(): void {
        this._buffers[0].attribDisable(this._aVertex, false);
        this._buffers[1].unbind();
    }

    protected uploadBuffers(): void {
        this._buffers[0].data(this._vertices, this._gl.STATIC_DRAW);
        this._buffers[1].data(this._indices, this._gl.STATIC_DRAW);
    }
}
