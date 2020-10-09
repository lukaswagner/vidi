import {
    Buffer,
    ChangeLookup,
    Context,
    Geometry,
    Initializable,
} from 'webgl-operate';

import { ColumnUsage } from 'frontend/data/columns';
import { GL2Facade } from 'webgl-operate/lib/gl2facade';

export class PointCloudGeometry extends Geometry {
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        positions: false,
        vertexCount: false,
        vertexColors: false,
        variablePointSize: false,
    });

    protected _uv = new Uint8Array([+1, -1, +1, +1, -1, -1, -1, +1]);

    protected _xCoord = new Float32Array([]);
    protected _yCoord = new Float32Array([]);
    protected _zCoord = new Float32Array([]);
    protected _vertexColors = new Float32Array([]);
    protected _variablePointSize = new Float32Array([]);

    protected _uvLocation: GLuint = 0;
    protected _xCoordLocation: GLuint = 1;
    protected _yCoordLocation: GLuint = 2;
    protected _zCoordLocation: GLuint = 3;
    protected _vertexColorLocation: GLuint = 4;
    protected _variablePointSizeLocation: GLuint = 5;

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
            new Buffer(context),
            new Buffer(context),
            new Buffer(context),
            new Buffer(context)
        );
    }

    public static fromColumns(
        context: Context,
        data: ArrayBuffer[]
    ): PointCloudGeometry {
        const g = new PointCloudGeometry(context);
        g._xCoord = new Float32Array(data[ColumnUsage.X_AXIS]);
        g._yCoord = new Float32Array(data[ColumnUsage.Y_AXIS]);
        g._zCoord = new Float32Array(data[ColumnUsage.Z_AXIS]);
        g._vertexColors = new Float32Array(data[ColumnUsage.PER_POINT_COLOR]);
        g._variablePointSize =
            new Float32Array(data[ColumnUsage.VARIABLE_POINT_SIZE]);
        g.initialize();
        return g;
    }

    /**
     * Creates the vertex buffer object (VBO) and creates and initializes the
     * buffer's data store.
     * @param globalPosLocation - Attribute binding point for vertices.
     * @param normalLocation - Attribute binding point for vertex normal.
     */
    @Initializable.initialize()
    public initialize(
        uvLocation: GLuint = 0,
        xCoordLocation: GLuint = 1,
        yCoordLocation: GLuint = 2,
        zCoordLocation: GLuint = 3,
        vertexColorLocation: GLuint = 4,
        variablePointSizeLocation: GLuint = 5,
    ): boolean {
        this._uvLocation = uvLocation;
        this._xCoordLocation = xCoordLocation;
        this._yCoordLocation = yCoordLocation;
        this._zCoordLocation = zCoordLocation;
        this._vertexColorLocation = vertexColorLocation;
        this._variablePointSizeLocation = variablePointSizeLocation;

        const valid = super.initialize([
            this._gl.ARRAY_BUFFER,
            this._gl.ARRAY_BUFFER,
            this._gl.ARRAY_BUFFER,
            this._gl.ARRAY_BUFFER,
            this._gl.ARRAY_BUFFER,
            this._gl.ARRAY_BUFFER
        ], [
            uvLocation,
            xCoordLocation,
            xCoordLocation,
            zCoordLocation,
            vertexColorLocation,
            variablePointSizeLocation
        ]);

        this._buffers[0].data(this._uv, this._gl.STATIC_DRAW);
        this._buffers[1].data(this._xCoord, this._gl.STATIC_DRAW);
        this._buffers[2].data(this._yCoord, this._gl.STATIC_DRAW);
        this._buffers[3].data(this._zCoord, this._gl.STATIC_DRAW);
        this._buffers[4].data(this._vertexColors, this._gl.STATIC_DRAW);
        this._buffers[5].data(this._variablePointSize, this._gl.STATIC_DRAW);

        return valid;
    }

    /**
     * Draws the geometry.
     */
    public draw(): void {
        this._gl2facade.drawArraysInstanced(
            this._gl.TRIANGLE_STRIP, 0, 4, this._xCoord.length);
    }

    /**
     * Binds the vertex buffer object (VBO) to an attribute binding point of a
     * given, pre-defined index.
     */
    protected bindBuffers(/*indices: Array<GLuint>*/): void {
        this._buffers[0].attribEnable(
            this._uvLocation, 2, this._gl.BYTE,
            false, 2, 0, true, false);
        this._gl2facade.vertexAttribDivisor(this._uvLocation, 0);

        this._buffers[1].attribEnable(
            this._xCoordLocation, 1, this._gl.FLOAT,
            false, 0, 0, true, false);
        this._gl2facade.vertexAttribDivisor(this._xCoordLocation, 1);

        this._buffers[2].attribEnable(
            this._yCoordLocation, 1, this._gl.FLOAT,
            false, 0, 0, true, false);
        this._gl2facade.vertexAttribDivisor(this._yCoordLocation, 1);

        this._buffers[3].attribEnable(
            this._zCoordLocation, 1, this._gl.FLOAT,
            false, 0, 0, true, false);
        this._gl2facade.vertexAttribDivisor(this._zCoordLocation, 1);

        this._buffers[4].attribEnable(
            this._vertexColorLocation, 4, this._gl.FLOAT,
            false, 0, 0, true, false);
        this._gl2facade.vertexAttribDivisor(this._vertexColorLocation, 1);

        this._buffers[5].attribEnable(
            this._variablePointSizeLocation, 1, this._gl.FLOAT,
            false, 0, 0, true, false);
        this._gl2facade.vertexAttribDivisor(this._variablePointSizeLocation, 1);
    }

    /**
     * Unbinds the vertex buffer object (VBO) and disables the binding point.
     */
    protected unbindBuffers(): void {
        this._buffers[0].attribDisable(this._uvLocation, true, true);
        this._buffers[1].attribDisable(this._xCoordLocation, true, true);
        this._buffers[2].attribDisable(this._yCoordLocation, true, true);
        this._buffers[3].attribDisable(this._zCoordLocation, true, true);
        this._buffers[4].attribDisable(this._vertexColorLocation, true, true);
        this._buffers[5].attribDisable(
            this._variablePointSizeLocation, true, true);
    }
}
