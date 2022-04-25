import {
    Buffer,
    ChangeLookup,
    Context,
    Initializable,
} from 'webgl-operate';

import { ColumnUsage } from 'frontend/data/columns';

export class PointCloudGeometry extends Initializable {
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        positions: false,
        vertexCount: false,
        vertexColors: false,
        variablePointSize: false,
        clusterId: false,
    });

    protected _uv = new Uint8Array([+1, -1, +1, +1, -1, -1, -1, +1]);

    protected _xCoord = new Float32Array([]);
    protected _yCoord = new Float32Array([]);
    protected _zCoord = new Float32Array([]);
    protected _vertexColors = new Float32Array([]);
    protected _variablePointSize = new Float32Array([]);
    protected _clusterId = new Float32Array([]);

    protected _uvLocation: GLuint = 0;
    protected _xCoordLocation: GLuint = 1;
    protected _yCoordLocation: GLuint = 2;
    protected _zCoordLocation: GLuint = 3;
    protected _vertexColorLocation: GLuint = 4;
    protected _variablePointSizeLocation: GLuint = 5;
    protected _clusterIdLocation: GLuint = 6;

    protected _gl: WebGL2RenderingContext;
    protected _object: WebGLVertexArrayObject;
    protected _buffers = new Array<Buffer>();
    protected _offset = 0;
    protected _instanceOffset = 0;

    /**
     * Object constructor, requires a context and an identifier.
     * @param context - Valid context to create the object for.
     * @param identifier - Meaningful name for identification of this instance.
     * vertices).
     */
    public constructor(context: Context) {
        super();

        this._gl = context.gl as WebGL2RenderingContext;
        this._object = this._gl.createVertexArray();

        this._buffers.push(
            new Buffer(context),
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
        data: SharedArrayBuffer[]
    ): PointCloudGeometry {
        const g = new PointCloudGeometry(context);
        g._xCoord = new Float32Array(data[ColumnUsage.X_AXIS]);
        g._yCoord = new Float32Array(data[ColumnUsage.Y_AXIS]);
        g._zCoord = new Float32Array(data[ColumnUsage.Z_AXIS]);
        g._vertexColors = new Float32Array(data[ColumnUsage.COLOR_COLOR]);
        g._variablePointSize =
            new Float32Array(data[ColumnUsage.VARIABLE_POINT_SIZE]);
        g._clusterId = new Float32Array(data[ColumnUsage.CLUSTER_ID]);
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
        clusterIdLocation: GLuint = 6,
    ): boolean {
        this._uvLocation = uvLocation;
        this._xCoordLocation = xCoordLocation;
        this._yCoordLocation = yCoordLocation;
        this._zCoordLocation = zCoordLocation;
        this._vertexColorLocation = vertexColorLocation;
        this._variablePointSizeLocation = variablePointSizeLocation;
        this._clusterIdLocation = clusterIdLocation;

        let valid = true;
        this._buffers.forEach((b) =>
            valid = b.initialize(this._gl.ARRAY_BUFFER) && valid);

        this._buffers[0].data(this._uv, this._gl.STATIC_DRAW);
        this._buffers[1].data(this._xCoord, this._gl.STATIC_DRAW);
        this._buffers[2].data(this._yCoord, this._gl.STATIC_DRAW);
        this._buffers[3].data(this._zCoord, this._gl.STATIC_DRAW);
        this._buffers[4].data(this._vertexColors, this._gl.STATIC_DRAW);
        this._buffers[5].data(this._variablePointSize, this._gl.STATIC_DRAW);
        this._buffers[6].data(this._clusterId, this._gl.STATIC_DRAW);

        return valid;
    }

    public uninitialize(): void {
    }

    /**
     * Draws the geometry.
     */
    public draw(numInstances?: number): void {
        this._gl.drawArraysInstanced(
            this._gl.TRIANGLE_STRIP, 0, 4, numInstances ?? this._xCoord.length);
    }

    /**
     * Draws the geometry.
     */
    public drawPoints(numInstances?: number): void {
        this._gl.drawArraysInstanced(
            this._gl.POINTS, 0, 1, numInstances ?? this._xCoord.length);
    }

    /**
     * Binds the vertex buffer object (VBO) to an attribute binding point of a
     * given, pre-defined index.
     */
    public bind(): void {
        this._gl.bindVertexArray(this._object);
        this._buffers[0].attribEnable(
            this._uvLocation, 2, this._gl.BYTE,
            false, 0, 0, true, false);
        this._gl.vertexAttribDivisor(this._uvLocation, 0);

        if(this._xCoord?.length > 0) {
            this._buffers[1].attribEnable(
                this._xCoordLocation, 1, this._gl.FLOAT,
                false, 0, 4 * this._instanceOffset, true, false);
            this._gl.vertexAttribDivisor(this._xCoordLocation, 1);
        }

        if(this._yCoord?.length > 0) {
            this._buffers[2].attribEnable(
                this._yCoordLocation, 1, this._gl.FLOAT,
                false, 0, 4 * this._instanceOffset, true, false);
            this._gl.vertexAttribDivisor(this._yCoordLocation, 1);
        }

        if(this._zCoord?.length > 0) {
            this._buffers[3].attribEnable(
                this._zCoordLocation, 1, this._gl.FLOAT,
                false, 0, 4 * this._instanceOffset, true, false);
            this._gl.vertexAttribDivisor(this._zCoordLocation, 1);
        }

        if(this._vertexColors?.length > 0) {
            this._buffers[4].attribEnable(
                this._vertexColorLocation, 4, this._gl.FLOAT,
                false, 0, 4 * this._instanceOffset, true, false);
            this._gl.vertexAttribDivisor(this._vertexColorLocation, 1);
        }

        if(this._variablePointSize?.length > 0) {
            this._buffers[5].attribEnable(
                this._variablePointSizeLocation, 1, this._gl.FLOAT,
                false, 0, 4 * this._instanceOffset, true, false);
            this._gl.vertexAttribDivisor(this._variablePointSizeLocation, 1);
        }

        if(this._clusterId?.length > 0) {
            this._buffers[6].attribEnable(
                this._clusterIdLocation, 1, this._gl.FLOAT,
                false, 0, 4 * this._instanceOffset, true, false);
            this._gl.vertexAttribDivisor(this._clusterIdLocation, 1);
        }
    }

    /**
     * Unbinds the vertex buffer object (VBO) and disables the binding point.
     */
    public unbind(): void {
        this._buffers[0].attribDisable(this._uvLocation, true, true);
        this._buffers[1].attribDisable(this._xCoordLocation, true, true);
        this._buffers[2].attribDisable(this._yCoordLocation, true, true);
        this._buffers[3].attribDisable(this._zCoordLocation, true, true);
        this._buffers[4].attribDisable(this._vertexColorLocation, true, true);
        this._buffers[5].attribDisable(
            this._variablePointSizeLocation, true, true);
        this._buffers[6].attribDisable(this._clusterIdLocation, true, true);
        this._gl.bindVertexArray(undefined);
    }

    public set instanceOffset(offset: number) {
        this._instanceOffset = offset;
    }

    public set offset(offset: number) {
        this._offset = offset;
    }

    public get offset(): number {
        return this._offset;
    }
}
