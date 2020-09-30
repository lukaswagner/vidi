import {
    AxisInfo,
    ExtendedAxisInfo,
    ExtendedGridInfo,
} from './gridInfo';
import {
    Camera,
    ChangeLookup,
    Initializable,
    vec3,
} from 'webgl-operate';
import {
    GridLabelPass,
    LabelInfo,
    LabelSet
} from './gridLabelPass';
import { GridPass } from './gridPass';
import { PointPass } from 'frontend/points/pointPass';

// some helper functions to keep the code short
// create vector
function v(values: number[], shift: number): vec3 {
    const l = values.length;
    return vec3.fromValues(
        values[(0 + shift) % l],
        values[(1 + shift) % l],
        values[(2 + shift) % l]
    );
}
// negate vector
function n(v: vec3): vec3 {
    return vec3.negate(vec3.create(), v);
}
// small delta to displace labels by
const d = 1e-6;

export class GridOffsetHelper extends Initializable {
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        gridInfo: false,
        camera: false
    });

    protected readonly labelOffset = 0.2;

    protected _gridInfo: ExtendedGridInfo[];
    protected _camera: Camera;

    protected _gridPass: GridPass;
    protected _gridLabelPass: GridLabelPass;
    protected _pointPass: PointPass;

    protected _lastIndices: number[];

    public constructor(
        gridPass: GridPass, gridLabelPass: GridLabelPass, pointPass: PointPass
    ) {
        super();
        this._gridPass = gridPass;
        this._gridLabelPass = gridLabelPass;
        this._pointPass = pointPass;
    }

    @Initializable.initialize()
    public initialize(): boolean {
        return true;
    }

    @Initializable.uninitialize()
    public uninitialize(): void {
    }

    @Initializable.assert_initialized()
    public update(override = false): void {
        if (this._gridInfo === undefined) {
            this._altered.reset();
            return;
        }

        if (override || this._altered.any) {
            this.prepareOffsets();
        }

        if (override || this._altered.any || this._camera.altered) {
            this.updateOffsets(this._altered.any);
        }

        this._altered.reset();
    }

    protected prepareOffsets(): void {
        this._lastIndices = this._gridInfo.map(() => -1);
    }

    protected updateOffsets(override: boolean): void {
        const centers = this._gridInfo.map((grid) =>
            grid.enabled ? (grid.offsets[0] + grid.offsets[1]) / 2 : 0
        );

        const indices = centers.map((center, i) =>
            this._camera.eye[(i + 2) % 3] > center ? 0 : 1
        );

        const changed = indices.reduce((result, newIndex, i) => 
            result || newIndex !== this._lastIndices[i], false
        );
        if(!changed && !override) return;

        this._lastIndices = indices;

        const offsets = this._gridInfo.map((grid, i) =>
            grid.enabled ? grid.offsets[indices[i]] : 0
        );
        this._gridPass.gridOffsets = offsets;

        this._pointPass.cutoffPosition = [0, 1, 2].map((i) => {
            return { value: offsets[i], mask: +this._gridInfo[i].enabled };
        });

        console.log({
            centers, indices, offsets
        });

        this.updateLabels(indices);
    }

    protected updateLabels(indices: number[]): void {
        const gi = this._gridInfo;

        const prev = (i: number): number => (i + 2) % 3;

        const gridEnabled = gi.map((g) => g.enabled);
        const axes = gi.map((g, i) => g.firstAxis ?? gi[prev(i)].secondAxis);

        const mode = gridEnabled.reduce((prev, curr, index) =>
            prev | (+curr << index), 0);

        switch (mode) {
            case 1:
                this._gridLabelPass.labelInfo =
                    this.magic(axes[0], axes[1], 0);
                break;
            case 2:
                this._gridLabelPass.labelInfo =
                    this.magic(axes[1], axes[2], 2);
                break;
            case 4:
                this._gridLabelPass.labelInfo =
                    this.magic(axes[2], axes[0], 1);
                break;
            case 7:
                this._gridLabelPass.labelInfo = [];
                // this.allGrids();
                break;
            default:
                this._gridLabelPass.labelInfo = [];
                break;
        }
    }

    protected magic(
        a: ExtendedAxisInfo, b: ExtendedAxisInfo, shift: number
    ): LabelSet[] {
        const aN = a.name;
        const aD = a.direction;
        const aE = a.extents.min - this.labelOffset;
        const bN = b.name;
        const bD = b.direction;
        const bE = b.extents.min - this.labelOffset;
        return [
            {
                labels: [
                    { name: aN, dir: aD, pos: v([0, aE, d], shift), up: bD },
                    { name: aN, dir: n(aD), pos: v([0, aE, -d], shift), up: bD }
                ],
                useNearest: true
            },
            {
                labels: [
                    { name: bN, dir: n(bD), pos: v([bE, 0, d], shift), up: aD },
                    { name: bN, dir: bD, pos: v([bE, 0, -d], shift), up: aD }
                ],
                useNearest: true
            }
        ];
    }

    // protected allGrids(): void {

    // }

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

    public get altered(): boolean {
        return this._altered.any;
    }
}
