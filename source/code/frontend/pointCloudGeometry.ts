import {
    Buffer,
    Context,
    Geometry,
} from 'webgl-operate';
import { GL2Facade } from 'webgl-operate/lib/gl2facade';

/**
 * Geometry of a half edge model with vertex normals.
 */
export class PointCloudGeometry extends Geometry {
    protected _vertices = new Float32Array([]);

    protected _vertexLocation: GLuint = 0;

    protected _gl: WebGLRenderingContext;
    protected _gl2facade: GL2Facade;

    /**
     * Object constructor, requires a context and an identifier.
     * @param context - Valid context to create the object for.
     * @param identifier - Meaningful name for identification of this instance.
     * vertices).
     */
    constructor(context: Context, identifier?: string) {
        super(context, identifier);

        this._gl = context.gl as WebGLRenderingContext;
        this._gl2facade = context.gl2facade;

        /* Generate vertex buffer. */
        const vertexVBO = new Buffer(context);
        this._buffers.push(vertexVBO);
    }


    /**
     * Binds the vertex buffer object (VBO) to an attribute binding point of a
     * given, pre-defined index.
     */
    protected bindBuffers(/*indices: Array<GLuint>*/): void {

        this._buffers[0].attribEnable(
            this._vertexLocation, 3, this._gl.FLOAT,
            false, 0, 0, true, false);
        this._gl2facade.vertexAttribDivisor(this._vertexLocation, 1);
    }

    /**
     * Unbinds the vertex buffer object (VBO) and disables the binding point.
     */
    protected unbindBuffers(): void {
        this._buffers[0].attribDisable(this._vertexLocation, true, true);
    }

    /**
     * Creates the vertex buffer object (VBO) and creates and initializes the
     * buffer's data store.
     * @param vertexLocation - Attribute binding point for vertices.
     * @param normalLocation - Attribute binding point for vertex normal.
     */
    initialize(
        vertexLocation: GLuint = 0,
    ) : boolean {
        this._vertexLocation = vertexLocation;

        const valid = super.initialize(
                [
                    this._gl.ARRAY_BUFFER
                ], [
                    vertexLocation
                ]);

        this._buffers[0].data(this._vertices, this._gl.STATIC_DRAW);

        return valid;
    }

    /**
     * Draws the geometry.
     */
    draw(): void {
        this._gl2facade.drawArraysInstanced(
            this._gl.POINTS, 0, 1, this._vertices.length);
    }

    /**
     * Attribute location to which this geometry's vertices are bound to.
     */
    get vertexLocation(): GLuint {
        return this._vertexLocation;
    }

    set positions(positions: Float32Array) {
        this._vertices = positions;
        this._buffers[0].data(this._vertices, this._gl.STATIC_DRAW);
    }
}
