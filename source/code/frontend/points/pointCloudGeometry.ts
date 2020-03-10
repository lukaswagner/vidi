import {
    Buffer,
    ChangeLookup,
    Context,
    Geometry,
    Initializable,
} from 'webgl-operate';
import { GL2Facade } from 'webgl-operate/lib/gl2facade';

export class PointCloudGeometry extends Geometry {

    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        positions: false,
        vertexCount: false,
        vertexColors: false,
    });

    protected _localPositions = new Float32Array([0, 0, 0]);
    protected _globalPositions = new Float32Array([]);
    protected _vertexColors = new Float32Array([]);

    protected _localPosLocation: GLuint = 0;
    protected _globalPosLocation: GLuint = 1;
    protected _vertexColorLocation: GLuint = 2;

    protected _gl: WebGLRenderingContext;
    protected _gl2facade: GL2Facade;

    /**
     * Object constructor, requires a context and an identifier.
     * @param context - Valid context to create the object for.
     * @param identifier - Meaningful name for identification of this instance.
     * vertices).
     */
    public constructor(context: Context, identifier?: string) {
        super(context, identifier);

        this._gl = context.gl as WebGLRenderingContext;
        this._gl2facade = context.gl2facade;

        this._buffers.push(
            new Buffer(context),
            new Buffer(context),
            new Buffer(context)
        );
    }

    /**
     * Creates the vertex buffer object (VBO) and creates and initializes the
     * buffer's data store.
     * @param globalPosLocation - Attribute binding point for vertices.
     * @param normalLocation - Attribute binding point for vertex normal.
     */
    public initialize(
        localPosLocation: GLuint = 0,
        globalPosLocation: GLuint = 1,
        vertexColorLocation: GLuint = 2,
    ): boolean {
        this._localPosLocation = localPosLocation;
        this._globalPosLocation = globalPosLocation;
        this._vertexColorLocation = vertexColorLocation;

        const valid = super.initialize([
            this._gl.ARRAY_BUFFER,
            this._gl.ARRAY_BUFFER,
            this._gl.ARRAY_BUFFER
        ], [
            localPosLocation,
            globalPosLocation,
            vertexColorLocation
        ]);

        this._buffers[0].data(this._localPositions, this._gl.STATIC_DRAW);
        this._buffers[1].data(this._globalPositions, this._gl.STATIC_DRAW);
        this._buffers[2].data(this._vertexColors, this._gl.STATIC_DRAW);

        return valid;
    }

    @Initializable.assert_initialized()
    public update(override: boolean = false): void {
        if (override || this._altered.positions) {
            this._buffers[1].data(this._globalPositions, this._gl.STATIC_DRAW);
        }

        if (!this._altered.vertexColors && this._altered.vertexCount) {
            this._vertexColors = new Float32Array(this._globalPositions.length);
            this._altered.alter('vertexColors');
        }

        if (override || this._altered.vertexColors) {
            this._buffers[2].data(this._vertexColors, this._gl.STATIC_DRAW);
        }

        this._altered.reset();
    }

    /**
     * Draws the geometry.
     */
    public draw(): void {
        this._gl2facade.drawArraysInstanced(
            this._gl.POINTS, 0, 1, this._globalPositions.length / 3);
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

        this._buffers[2].attribEnable(
            this._vertexColorLocation, 3, this._gl.FLOAT,
            false, 0, 0, true, false);
        this._gl2facade.vertexAttribDivisor(this._vertexColorLocation, 1);
    }

    /**
     * Unbinds the vertex buffer object (VBO) and disables the binding point.
     */
    protected unbindBuffers(): void {
        this._buffers[0].attribDisable(this._localPosLocation, true, true);
        this._buffers[1].attribDisable(this._globalPosLocation, true, true);
        this._buffers[2].attribDisable(this._vertexColorLocation, true, true);
    }

    public set positions(positions: Float32Array) {
        if (positions.length !== this._globalPositions.length) {
            this._altered.alter('vertexCount');
        }
        this._globalPositions = positions;
        this._altered.alter('positions');
    }

    public set vertexColors(colors: Float32Array) {
        this._vertexColors = colors;
        this._altered.alter('vertexColors');
    }
}
