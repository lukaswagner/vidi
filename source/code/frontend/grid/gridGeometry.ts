import {
    Buffer,
    Context,
    Geometry,
    mat4,
    vec4,
    vec3,
} from 'webgl-operate';
import { GL2Facade } from 'webgl-operate/lib/gl2facade';

export class GridGeometry extends Geometry {
    protected _positions = new Float32Array([]);

    protected _positionLocation: GLuint;

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

        const pos = new Buffer(context);
        this._buffers.push(pos);
    }


    /**
     * Binds the vertex buffer object (VBO) to an attribute binding point of a
     * given, pre-defined index.
     */
    protected bindBuffers(/*indices: Array<GLuint>*/): void {
        // this._buffers[0].bind();
        this._buffers[0].attribEnable(
            this._positionLocation, 3, this._gl.FLOAT,
            false, 0, 0, true, false);
    }

    /**
     * Unbinds the vertex buffer object (VBO) and disables the binding point.
     */
    protected unbindBuffers(): void {
        // this._buffers[0].unbind();
        this._buffers[0].attribDisable(this._positionLocation, true, true);
    }

    /**
     * Creates the vertex buffer object (VBO) and creates and initializes the
     * buffer's data store.
     * @param globalPosLocation - Attribute binding point for vertices.
     * @param normalLocation - Attribute binding point for vertex normal.
     */
    initialize(
        positionLocation: GLuint = 0,
    ) : boolean {
        this._positionLocation = positionLocation;

        const valid = super.initialize([
            this._gl.ARRAY_BUFFER
        ], [
            positionLocation
        ]);

        this._buffers[0].data(this._positions, this._gl.STATIC_DRAW);

        return valid;
    }

    /**
     * Draws the geometry.
     */
    draw(): void {
        this._gl.drawArrays(this._gl.LINES, 0, this._positions.length / 3);
    }

    buildGrid(gridInfo: { min: number, max: number, steps: number }[]): void {
        // only allow x and y axes for now
        const numAxes = Math.min(gridInfo.length, 2);
        const gridInfoReduced = gridInfo.slice(0, numAxes);
        const numLines =
            gridInfoReduced.map((a) => a.steps + 1).reduce((a, b) => a + b);

        this._positions = new Float32Array(numLines * 2 * 3);

        const rotations = [
            mat4.identity(mat4.create()),
            mat4.fromRotation(mat4.create(), Math.PI, [1, 0, 1])
        ];

        let index = 0;
        for(let i = 0; i < numAxes; i++) {
            const info = gridInfoReduced[i];
            const otherInfo = gridInfoReduced[1 - i];
            const step = (info.max - info.min) / info.steps;
            const rot = rotations[i];
            for(let j = 0; j < info.steps + 1; j++) {
                const x = info.min + step * j;
                const start = vec3.fromValues(x, 0, otherInfo.min);
                const end = vec3.fromValues(x, 0, otherInfo.max);
                vec3.transformMat4(start, start, rot);
                vec3.transformMat4(end, end, rot);
                this._positions[index++] = start[0];
                this._positions[index++] = start[1];
                this._positions[index++] = start[2];
                this._positions[index++] = end[0];
                this._positions[index++] = end[1];
                this._positions[index++] = end[2];
            }
        }

        this._buffers[0].data(this._positions, this._gl.STATIC_DRAW);
    }
}
