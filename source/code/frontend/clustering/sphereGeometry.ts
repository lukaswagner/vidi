import {
    Buffer,
    Context,
    Geometry,
    Initializable
} from 'webgl-operate';
import { ClusterInfo } from 'worker/clustering/interface';
import { QuadGeometry } from './quadGeometry';

export class SphereGeometry extends QuadGeometry {
    protected _clusterInfo: Float32Array;
    protected _aPosition: GLuint;
    protected _aSize: GLuint;

    public constructor(context: Context) {
        super(context);

        // additional buffer for center and size
        this._buffers.push(new Buffer(context));
    }

    @Initializable.initialize()
    public initialize(
        aVertex: GLuint = 0, aPosition: GLuint = 1, aSize: GLuint = 2,
    ): boolean {
        this._aVertex = aVertex;
        this._aPosition = aPosition;
        this._aSize = aSize;

        const valid = Geometry.prototype.initialize.call(this, [
            this._gl.ARRAY_BUFFER,
            this._gl.ELEMENT_ARRAY_BUFFER,
            this._gl.ARRAY_BUFFER
        ]);

        return valid;
    }

    public set data(clusterInfo: ClusterInfo[]) {
        this._clusterInfo = new Float32Array(clusterInfo.length * 6);
        clusterInfo.forEach((c, i) => {
            this._clusterInfo.set(c.center, i * 6);
            this._clusterInfo.set(c.extents.map((e) => e[1] - e[0]), i * 6 + 3);
        });
        this._buffers[2].data(this._clusterInfo, this._gl.STATIC_DRAW);
    }

    public draw(): void {
        this._gl.drawElementsInstanced(
            this._gl.TRIANGLE_STRIP, this._indices.length,
            this._gl.UNSIGNED_INT, 0, this._clusterInfo.length / 6);
    }

    public get aPosition(): GLuint {
        return this._aPosition;
    }

    public set aPosition(location: GLuint) {
        this._aPosition = location;
    }

    protected bindBuffers(): void {
        super.bindBuffers();
        this._gl.vertexAttribDivisor(this._aVertex, 0);
        this._buffers[2].attribEnable(
            this._aPosition, 3, this._gl.FLOAT,
            false, 6 * 4, 0, true, false);
        this._gl.vertexAttribDivisor(this._aPosition, 1);
        this._buffers[2].attribEnable(
            this._aSize, 3, this._gl.FLOAT,
            false, 6 * 4, 3 * 4, true, false);
        this._gl.vertexAttribDivisor(this._aSize, 1);
    }

    protected unbindBuffers(): void {
        super.unbindBuffers();
        this._buffers[2].attribDisable(this._aPosition, false);
        this._buffers[2].attribDisable(this._aSize, false);
    }
}
