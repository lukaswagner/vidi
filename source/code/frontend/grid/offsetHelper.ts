import {
    Camera,
    ChangeLookup,
    Initializable,
    vec3,
} from 'webgl-operate';
import { ExtendedGridInfo } from './gridInfo';
import { GridLabelPass } from './gridLabelPass';
import { GridPass } from './gridPass';

export class GridOffsetHelper extends Initializable {
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        gridInfo: false,
        camera: false
    });

    protected _gridInfo: ExtendedGridInfo[];
    protected _camera: Camera;

    protected _gridPass: GridPass;
    protected _gridLabelPass: GridLabelPass;

    protected _normals: vec3[];
    protected _offsets: [number, number][];
    protected _lastIndices: number[];

    public constructor(gridPass: GridPass, gridLabelPass: GridLabelPass) {
        super();
        this._gridPass = gridPass;
        this._gridLabelPass = gridLabelPass;
    }

    @Initializable.initialize()
    public initialize(): boolean {
        return true;
    }

    @Initializable.uninitialize()
    public uninitialize(): void {
    }

    @Initializable.assert_initialized()
    public update(override: boolean = false): void {
        if(this._gridInfo === undefined) {
            this._altered.reset();
            return;
        }

        if (override || this._altered.any) {
            this.prepareOffsets();
        }

        if (override || this._altered.any || this._camera.altered) {
            this.updateOffsets();
        }

        this._altered.reset();
    }

    protected prepareOffsets(): void {
        this._normals = this._gridInfo.map((g) => g.normal);
        this._offsets = this._gridInfo.map((g) => g.offsets);
        this._lastIndices = this._gridInfo.map(() => -1);
    }

    protected updateOffsets(): void {
        const indices = this._normals.map((n, i) => {
            const pos = this._offsets[i].map(
                (o) => vec3.scale(vec3.create(), n, o));
            const dist = pos.map((p) => vec3.dist(p, this._camera.eye));
            return dist[0] > dist[1] ? 0 : 1;
        });
        const changed = indices.reduce(
            (acc, index, i) => acc || index === this._lastIndices[i], false);
        this._lastIndices = indices;
        if(changed) {
            const offsets = indices.map((index, i) => this._offsets[i][index]);
            this._gridPass.gridOffsets = offsets;
        }
    }

    public set gridInfo(gridInfo: ExtendedGridInfo[]) {
        this._gridInfo = gridInfo;
        this._altered.alter('gridInfo');
    }

    public set camera(camera: Camera) {
        if (this._camera === camera) {
            return;
        }
        this._camera = camera;
        this._altered.alter('camera');
    }
}
