import { ClusterGeometry } from './clusterGeometry';
import { Initializable } from 'webgl-operate';

export class SphereGeometry extends ClusterGeometry {
    @Initializable.initialize()
    public initialize(aVertex: GLuint = 0): boolean {
        const valid = super.initialize(aVertex);

        this._vertices = new Float32Array([
            0.0, 0.0,
            0.0, 1.0,
            1.0, 0.0,
            1.0, 1.0,
        ]);

        this._indices = new Uint32Array([
            0, 1, 2, 3,
        ]);

        this.uploadBuffers();

        return valid;
    }

    public build(resolution: number): void {
        const vertices = new Float32Array(resolution * resolution * 2);
        const stripLength = 2 * resolution + 2;
        const indices = new Uint32Array(stripLength * (resolution - 1) - 2);

        for (let y = 0; y < resolution; y++) {
            for (let x = 0; x < resolution; x++) {
                const index = (x + y * resolution) * 2;
                vertices[index] = x / (resolution - 1);
                vertices[index + 1] = y / (resolution - 1);
            }
        }

        let index = 0;
        const setIndex = (x: number, y: number, offset: number): void => {
            const baseIndex = x + y * resolution;
            const offsetIndex = offset * resolution;
            indices[index++] = baseIndex + offsetIndex;
        };

        for (let y = 0; y < resolution - 1; y++) {
            if (y > 0) {
                setIndex(0, y, 0);
            }
            for (let x = 0; x < resolution; x++) {
                setIndex(x, y, 0);
                setIndex(x, y, 1);
            }
            if (y < resolution - 2) {
                setIndex(resolution - 1, y, 1);
            }
        }

        this._vertices = vertices;
        this._indices = indices;

        this.uploadBuffers();
    }
}
