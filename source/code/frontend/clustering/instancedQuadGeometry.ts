import {
    Buffer,
    Context,
    Geometry,
    Initializable,
    vec3,
} from 'webgl-operate';
import { QuadGeometry } from './quadGeometry';

export class InstancedQuadGeometry extends QuadGeometry {
    protected _positions: Float32Array;
    protected _aPosition: GLuint;

    public constructor(context: Context) {
        super(context);

        // additional buffer for offsets
        this._buffers.push(new Buffer(context));
    }

    @Initializable.initialize()
    public initialize(
        aVertex: GLuint = 0, aPosition: GLuint = 1,
    ): boolean {
        this._aVertex = aVertex;
        this._aPosition = aPosition;

        const valid = Geometry.prototype.initialize.call(this, [
            this._gl.ARRAY_BUFFER,
            this._gl.ARRAY_BUFFER,
            this._gl.ELEMENT_ARRAY_BUFFER,
            this._gl.ARRAY_BUFFER,
        ]);

        return valid;
    }

    public set positions(pos: vec3[]) {
        this._positions = new Float32Array(pos.length * 3);
        pos.forEach((v, i) => {
            this._positions.set(v, i * 3);
        });
        this._buffers[3].data(this._positions, this._gl.STATIC_DRAW);
    }

    public draw(): void {
        this._gl.drawElementsInstanced(
            this._gl.TRIANGLE_STRIP, this._indices.length,
            this._gl.UNSIGNED_INT, 0, this._positions.length / 3);
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
            false, 0, 0, true, false);
        this._gl.vertexAttribDivisor(this._aPosition, 1);
    }

    protected unbindBuffers(): void {
        super.unbindBuffers();
        this._buffers[3].attribDisable(this._aPosition, false);
    }
}
