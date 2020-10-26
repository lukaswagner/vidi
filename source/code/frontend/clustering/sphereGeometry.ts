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
    protected _aId: GLuint;
    protected _aPosition: GLuint;
    protected _aSize: GLuint;

    public constructor(context: Context) {
        super(context);

        // additional buffer for center and size
        this._buffers.push(new Buffer(context));
    }

    @Initializable.initialize()
    public initialize(
        aVertex: GLuint = 0,
        aId: GLuint = 1,
        aPosition: GLuint = 2,
        aSize: GLuint = 3,
    ): boolean {
        this._aVertex = aVertex;
        this._aId = aId;
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
        const length = 1 + 3 + 3;
        this._clusterInfo = new Float32Array(clusterInfo.length * length);
        clusterInfo.forEach((c, i) => {
            const offset = i * length;
            this._clusterInfo[offset] = i;
            this._clusterInfo.set(c.center, offset + 1);
            this._clusterInfo.set(
                c.extents.map((e) => e[1] - e[0]), offset + 4);
        });
        this._buffers[2].data(this._clusterInfo, this._gl.STATIC_DRAW);
    }

    public draw(): void {
        this._gl.drawElementsInstanced(
            this._gl.TRIANGLE_STRIP, this._indices.length,
            this._gl.UNSIGNED_INT, 0, this._clusterInfo.length / 7);
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
        const length = 1 + 3 + 3;
        const bytes = 4;
        const stride = length * bytes;
        this._buffers[2].attribEnable(
            this._aId, 1, this._gl.FLOAT,
            false, stride, 0, true, false);
        this._gl.vertexAttribDivisor(this._aId, 1);
        this._buffers[2].attribEnable(
            this._aPosition, 3, this._gl.FLOAT,
            false, stride, bytes, true, false);
        this._gl.vertexAttribDivisor(this._aPosition, 1);
        this._buffers[2].attribEnable(
            this._aSize, 3, this._gl.FLOAT,
            false, stride, 4 * bytes, true, false);
        this._gl.vertexAttribDivisor(this._aSize, 1);
    }

    protected unbindBuffers(): void {
        super.unbindBuffers();
        this._buffers[2].attribDisable(this._aId, false);
        this._buffers[2].attribDisable(this._aPosition, false);
        this._buffers[2].attribDisable(this._aSize, false);
    }
}
