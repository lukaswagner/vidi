import {
    Buffer,
    ChangeLookup,
    Context,
    Geometry,
    Initializable,
    mat4,
    quat,
    vec3,
} from 'webgl-operate';

import { ExtendedGridInfo } from './gridInfo';

export class GridGeometry extends Geometry {
    protected static readonly FADED_GRID_WIDTH = 1.0;

    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        offsets: false,
    });

    protected _quadVertices = new Float32Array([
        +1, -1, 0,
        +1, +1, 0,
        -1, -1, 0,
        -1, +1, 0
    ]);
    protected _uvCoordinates = new Float32Array([
        1, 0,
        1, 1,
        0, 0,
        0, 1
    ]);

    protected _numGrids = 0;

    protected _id = new Int8Array([]);
    protected _transform = new Float32Array([]);
    protected _offset = new Float32Array([]);

    /**
     * gridInfo structure:
     * vec2 quadLowerBoundsUV
     * vec2 quadUpperBoundsUV
     * vec2 dataLowerBoundsUV
     * vec2 dataUpperBoundsUV
     * vec2 gridSubdivisions
     */
    protected _gridInfo = new Float32Array([]);

    protected _vertexLocation: GLuint = 0;
    protected _uvLocation: GLuint = 1;
    protected _idLocation: GLuint = 2;
    protected _transformLocation: GLuint = 3;
    protected _offsetLocation: GLuint = 7;
    protected _gridInfoLocation: GLuint = 8;

    protected _gl: WebGL2RenderingContext;

    /**
     * Object constructor, requires a context and an identifier.
     * @param context - Valid context to create the object for.
     * @param identifier - Meaningful name for identification of this instance.
     * vertices).
     */
    public constructor(context: Context, identifier?: string) {
        super(context, identifier);

        this._gl = context.gl as WebGL2RenderingContext;

        this._buffers.push(
            new Buffer(context),
            new Buffer(context),
            new Buffer(context),
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
    @Initializable.initialize()
    public initialize(
        localPosLocation: GLuint = 0,
        uvLocation: GLuint = 1,
        idLocation: GLuint = 2,
        transformLocation: GLuint = 3,
        offsetLocation: GLuint = 7,
        gridInfoLocation: GLuint = 8
    ): boolean {
        this._vertexLocation = localPosLocation;
        this._uvLocation = uvLocation;
        this._idLocation = idLocation;
        this._transformLocation = transformLocation;
        this._offsetLocation = offsetLocation;
        this._gridInfoLocation = gridInfoLocation;

        const valid = super.initialize([
            this._gl.ARRAY_BUFFER,
            this._gl.ARRAY_BUFFER,
            this._gl.ARRAY_BUFFER,
            this._gl.ARRAY_BUFFER,
            this._gl.ARRAY_BUFFER,
            this._gl.ARRAY_BUFFER,
        ], [
            this._vertexLocation,
            this._uvLocation,
            this._idLocation,
            this._transformLocation,
            this._offsetLocation,
            this._gridInfoLocation,
        ]);

        this._buffers[0].data(this._quadVertices, this._gl.STATIC_DRAW);
        this._buffers[1].data(this._uvCoordinates, this._gl.STATIC_DRAW);
        this._buffers[2].data(this._id, this._gl.STATIC_DRAW);
        this._buffers[3].data(this._transform, this._gl.STATIC_DRAW);
        this._buffers[4].data(this._offset, this._gl.STATIC_DRAW);
        this._buffers[5].data(this._gridInfo, this._gl.STATIC_DRAW);

        return valid;
    }

    @Initializable.assert_initialized()
    public update(override = false): void {
        if (override || this._altered.offsets) {
            this._buffers[4].data(this._offset, this._gl.STATIC_DRAW);
        }
        this._altered.reset();
    }

    /**
     * Draws the geometry.
     */
    public draw(): void {
        this._gl.drawArraysInstanced(
            this._gl.TRIANGLE_STRIP, 0, 4, this._numGrids);
    }

    public buildGrid(gridInfo: ExtendedGridInfo[]): void {
        const idTemp = new Int8Array(gridInfo.length);
        const transformTemp = new Float32Array(gridInfo.length * 16);
        const gridInfoTemp = new Float32Array(gridInfo.length * 10);

        gridInfo
            .map((grid, index) => {
                return { grid, index };
            })
            .filter(({grid}) => grid.enabled)
            .forEach(({grid, index}, i) => {
                const x = grid.firstAxis;
                const y = grid.secondAxis;
                const xe = x.extents;
                const ye = y.extents;

                const w = GridGeometry.FADED_GRID_WIDTH;
                const ww = w * 2;

                const center = vec3.fromValues(
                    xe.center,
                    ye.center,
                    0
                );

                const rotation = quat.rotationTo(
                    quat.create(),
                    vec3.fromValues(0, 0, 1),
                    grid.normal
                );

                const extents = vec3.fromValues(
                    (xe.max - xe.min + ww) * 0.5,
                    (ye.max - ye.min + ww) * 0.5,
                    1
                );

                const m = mat4.fromRotationTranslationScale(
                    mat4.create(),
                    rotation,
                    center,
                    extents
                );

                const gridInfo = new Float32Array([
                    xe.min - w, -ye.min + w,
                    xe.max + w, -ye.max - w,
                    xe.min, -ye.min,
                    xe.max, -ye.max,
                    x.subdivisions,
                    y.subdivisions
                ]);

                idTemp[i] = index;
                transformTemp.set(m, i * 16);
                gridInfoTemp.set(gridInfo, i * 10);
            });

        this._numGrids = gridInfo.length;
        this._id = idTemp;
        this._transform = transformTemp;
        this._gridInfo = gridInfoTemp;

        this._buffers[2].data(this._id, this._gl.STATIC_DRAW);
        this._buffers[3].data(this._transform, this._gl.STATIC_DRAW);
        this._buffers[4].data(this._offset, this._gl.STATIC_DRAW);
        this._buffers[5].data(this._gridInfo, this._gl.STATIC_DRAW);
    }

    /**
     * Binds the vertex buffer object (VBO) to an attribute binding point of a
     * given, pre-defined index.
     */
    protected bindBuffers(/*indices: Array<GLuint>*/): void {
        const b = this._buffers;
        const f = this._gl.FLOAT;
        const vl = this._vertexLocation;
        const uvl = this._uvLocation;
        const tl = this._transformLocation;
        const ol = this._offsetLocation;
        const gil = this._gridInfoLocation;

        b[0].attribEnable(vl, 3, f, false, 0, 0, true, false);
        this._gl.vertexAttribDivisor(vl, 0);

        b[1].attribEnable(uvl, 2, f, false, 0, 0, true, false);
        this._gl.vertexAttribDivisor(uvl, 0);

        b[2].bind();
        this._gl.vertexAttribPointer(
            this._idLocation, 1, this._gl.BYTE, false, 0, 0);
        this._gl.enableVertexAttribArray(this._idLocation);
        this._gl.vertexAttribDivisor(this._idLocation, 1);

        b[3].attribEnable(tl + 0, 4, f, false, 64, 0, true, false);
        b[3].attribEnable(tl + 1, 4, f, false, 64, 16, false, false);
        b[3].attribEnable(tl + 2, 4, f, false, 64, 32, false, false);
        b[3].attribEnable(tl + 3, 4, f, false, 64, 48, false, false);
        this._gl.vertexAttribDivisor(tl + 0, 1);
        this._gl.vertexAttribDivisor(tl + 1, 1);
        this._gl.vertexAttribDivisor(tl + 2, 1);
        this._gl.vertexAttribDivisor(tl + 3, 1);

        b[4].attribEnable(ol, 1, f, false, 0, 0, true, false);
        this._gl.vertexAttribDivisor(ol, 1);

        b[5].attribEnable(gil + 0, 2, f, false, 40, 0, true, false);
        b[5].attribEnable(gil + 1, 2, f, false, 40, 8, false, false);
        b[5].attribEnable(gil + 2, 2, f, false, 40, 16, false, false);
        b[5].attribEnable(gil + 3, 2, f, false, 40, 24, false, false);
        b[5].attribEnable(gil + 4, 2, f, false, 40, 32, false, false);
        this._gl.vertexAttribDivisor(gil + 0, 1);
        this._gl.vertexAttribDivisor(gil + 1, 1);
        this._gl.vertexAttribDivisor(gil + 2, 1);
        this._gl.vertexAttribDivisor(gil + 3, 1);
        this._gl.vertexAttribDivisor(gil + 4, 1);
    }

    /**
     * Unbinds the vertex buffer object (VBO) and disables the binding point.
     */
    protected unbindBuffers(): void {
        const b = this._buffers;
        const vl = this._vertexLocation;
        const uvl = this._uvLocation;
        const tl = this._transformLocation;
        const ol = this._offsetLocation;
        const gil = this._gridInfoLocation;

        b[0].attribDisable(vl, true, true);
        b[1].attribDisable(uvl, true, true);
        b[2].attribDisable(this._idLocation, true, true);
        b[3].attribDisable(tl + 0, true, false);
        b[3].attribDisable(tl + 1, false, false);
        b[3].attribDisable(tl + 2, false, false);
        b[3].attribDisable(tl + 3, false, false);
        b[3].attribDisable(tl + 4, false, true);
        b[4].attribDisable(ol, true, true);
        b[5].attribDisable(gil + 0, true, false);
        b[5].attribDisable(gil + 1, false, false);
        b[5].attribDisable(gil + 2, false, false);
        b[5].attribDisable(gil + 3, false, false);
        b[5].attribDisable(gil + 4, false, true);
    }

    public set offsets(offsets: number[]) {
        this._offset = Float32Array.from(offsets);
        this._altered.alter('offsets');
    }
}
