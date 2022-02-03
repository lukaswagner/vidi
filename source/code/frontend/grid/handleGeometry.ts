import {
    Buffer,
    Context,
    Geometry,
} from 'webgl-operate';

export class HandleGeometry extends Geometry {

    protected _vertices = new Float32Array([
        -1.5, 0.5,
        -1.5, -0.5,
        -0.5, 0.5,
        -0.5, -0.5,
        0.0, 0.0,
    ]);

    protected _indices = new Uint8Array([0, 1, 2, 3, 4]);

    protected _vertexLocation: GLuint = 0;

    /**
     * Object constructor, requires a context and an identifier.
     * @param context - Valid context to create the object for.
     * @param identifier - Meaningful name for identification of this instance.
     */
    public constructor(context: Context) {
        super(context);

        this._buffers.push(
            new Buffer(context),
            new Buffer(context));
    }

    /**
     * Binds the vertex buffer object (VBO) to an attribute binding point of a
     * given, pre-defined index.
     */
    protected bindBuffers(): void {
        /* Please note the implicit bind in attribEnable */
        this._buffers[0].attribEnable(
            this._vertexLocation, 2, this.context.gl.FLOAT,
            false, 0, 0, true, false);
        this._buffers[1].bind();
    }

    /**
     * Unbinds the vertex buffer object (VBO) and disables the binding point.
     */
    protected unbindBuffers(): void {
        /* Please note the implicit unbind in attribEnable is skipped */
        this._buffers[0].attribDisable(this._vertexLocation, true, true);
        this._buffers[1].unbind();
    }

    /**
     * Creates the vertex buffer object (VBO) and creates and initializes the
     * buffer's data store.
     * @param vertexLocation - Attribute binding point for vertices.
     * @param uvLocation - Attribute binding point for texture coordinates.
     */
    public initialize(vertexLocation: GLuint = 0): boolean {
        const gl = this.context.gl;

        this._vertexLocation = vertexLocation;

        const valid = super.initialize(
            [gl.ARRAY_BUFFER, gl.ELEMENT_ARRAY_BUFFER]);

        this._buffers[0].data(this._vertices, gl.STATIC_DRAW);
        this._buffers[1].data(this._indices, gl.STATIC_DRAW);

        return valid;
    }

    /**
     * Specifies/invokes the draw of this plane.
     */
    public draw(): void {
        const gl = this.context.gl as WebGLRenderingContext;
        gl.drawElements(
            gl.TRIANGLE_STRIP, this._indices.length, gl.UNSIGNED_BYTE, 0);
    }

    /**
     * Attribute location to which the vertices are bound to.
     */
    public get vertexLocation(): GLuint {
        return this._vertexLocation;
    }
}
