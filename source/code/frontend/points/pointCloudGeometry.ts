import {
    Buffer,
    Context,
    Geometry,
} from 'webgl-operate';
import { GL2Facade } from 'webgl-operate/lib/gl2facade';

export class PointCloudGeometry extends Geometry {
    protected _localPositions = new Float32Array([0, 0, 0]);
    protected _globalPositions = new Float32Array([]);

    protected _localPosLocation: GLuint = 0;
    protected _globalPosLocation: GLuint = 1;

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

        const localPos = new Buffer(context);
        this._buffers.push(localPos);

        const globalPos = new Buffer(context);
        this._buffers.push(globalPos);
    }


    /**
     * Binds the vertex buffer object (VBO) to an attribute binding point of a
     * given, pre-defined index.
     */
    protected bindBuffers(/*indices: Array<GLuint>*/): void {
        this._buffers[0].attribEnable(
            this._localPosLocation, 3, this._gl.FLOAT,
            false, 0, 0, true, false);
        this._gl2facade.vertexAttribDivisor(this._localPosLocation, 0);

        this._buffers[1].attribEnable(
            this._globalPosLocation, 3, this._gl.FLOAT,
            false, 0, 0, true, false);
        this._gl2facade.vertexAttribDivisor(this._globalPosLocation, 1);
    }

    /**
     * Unbinds the vertex buffer object (VBO) and disables the binding point.
     */
    protected unbindBuffers(): void {
        this._buffers[0].attribDisable(this._localPosLocation, true, true);
        this._buffers[1].attribDisable(this._globalPosLocation, true, true);
    }

    /**
     * Creates the vertex buffer object (VBO) and creates and initializes the
     * buffer's data store.
     * @param globalPosLocation - Attribute binding point for vertices.
     * @param normalLocation - Attribute binding point for vertex normal.
     */
    initialize(
        localPosLocation: GLuint = 0,
        globalPosLocation: GLuint = 1,
    ) : boolean {
        this._localPosLocation = localPosLocation;
        this._globalPosLocation = globalPosLocation;

        const valid = super.initialize([
            this._gl.ARRAY_BUFFER,
            this._gl.ARRAY_BUFFER
        ], [
            localPosLocation,
            globalPosLocation
        ]);

        this._buffers[0].data(this._localPositions, this._gl.STATIC_DRAW);
        this._buffers[1].data(this._globalPositions, this._gl.STATIC_DRAW);

        return valid;
    }

    /**
     * Draws the geometry.
     */
    draw(): void {
        this._gl2facade.drawArraysInstanced(
            this._gl.POINTS, 0, 1, this._globalPositions.length / 3);
    }

    set positions(positions: Float32Array) {
        this._globalPositions = positions;
        this._buffers[1].data(this._globalPositions, this._gl.STATIC_DRAW);
    }
}
