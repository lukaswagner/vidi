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
        const gi = this._gridInfo;

        const centers = gi.map((grid) =>
            grid.enabled ? (grid.offsets[0] + grid.offsets[1]) / 2 : 0
        );

        const indices = centers.map((center, i) =>
            this._camera.eye[i] > center ? 0 : 1
        );

        const changed = indices.reduce((result, newIndex, i) => 
            result || newIndex !== this._lastIndices[i], false
        );
        if(!changed && !override) return;

        this._lastIndices = indices;

        const offsets = gi.map((grid, i) =>
            grid.enabled ? grid.offsets[indices[(i + 2) % 3]] : 0
        );
        this._gridPass.gridOffsets = offsets;

        this._pointPass.cutoffPosition = [0, 1, 2].map((i) => {
            return { value: offsets[i], mask: +gi[(i + 1) % 3].enabled };
        });

        // console.log({
        //     centers, indices, offsets
        // });

        const prev = (i: number): number => (i + 2) % 3;

        const gridEnabled = gi.map((g) => g.enabled);
        const axes = gi.map((g, i) => g.firstAxis ?? gi[prev(i)].secondAxis);

        const mode = gridEnabled.reduce((prev, curr, index) =>
            prev | (+curr << index), 0);

        switch (mode) {
            case 1:
                this._gridLabelPass.labelInfo =
                    this.oneGrid(axes[0], axes[1], 0);
                break;
            case 2:
                this._gridLabelPass.labelInfo =
                    this.oneGrid(axes[1], axes[2], 2);
                break;
            case 4:
                this._gridLabelPass.labelInfo =
                    this.oneGrid(axes[2], axes[0], 1);
                break;
            case 7:
                this._gridLabelPass.labelInfo = [];
                this._gridLabelPass.labelInfo =
                    this.allGrids(axes, indices, offsets);
                break;
            default:
                this._gridLabelPass.labelInfo = [];
                break;
        }
    }

    protected oneGrid(
        a: ExtendedAxisInfo, b: ExtendedAxisInfo, shift: number
    ): LabelSet[] {
        // create vector with axis shift
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

    protected allGrids(
        axes: ExtendedAxisInfo[], indices: number[], offsets: number[]
    ): LabelSet[] {
        console.log(offsets);
        // negate vector
        function n(v: vec3): vec3 {
            return vec3.negate(vec3.create(), v);
        }

        // place x/z labels on horizontal plane

        const xN = axes[0].name;
        const zN = axes[2].name;
        const xD = axes[0].direction;
        const zD = axes[2].direction;

        // on lower-z side of zx-plane
        const xP1 = vec3.fromValues(
            0, offsets[2], axes[2].extents.min - this.labelOffset);
        // on upper-z side of zx-plane
        const xP2 = vec3.fromValues(
            0, offsets[2], axes[2].extents.max + this.labelOffset);

        // on lower-x side of zx-plane
        const zP1 = vec3.fromValues(
            axes[0].extents.min - this.labelOffset, offsets[2], 0);
        // on upper-x side of zx-plane
        const zP2 = vec3.fromValues(
            axes[0].extents.max + this.labelOffset, offsets[2], 0);

        const xU = indices[1] === 0 ? zD : n(zD);
        const zU = indices[1] === 0 ? xD : n(xD);

        // place y label on vertical planes

        const yN = axes[1].name;
        const yD = axes[1].direction;

        // on lower-x side of xy-plane
        const yP1 = vec3.fromValues(
            offsets[1], 0, axes[2].extents.min - this.labelOffset);
        // on upper-x side of xy-plane
        const yP2 = vec3.fromValues(
            offsets[1], 0, axes[2].extents.max + this.labelOffset);
        // on lower-z side of yz-plane
        const yP3 = vec3.fromValues(
            axes[0].extents.min - this.labelOffset, 0, offsets[0]);
        // on upper-z side of yz-plane
        const yP4 = vec3.fromValues(
            axes[0].extents.max + this.labelOffset, 0, offsets[0]);

        // do some cross stuff?
        const yD1 = indices[0] === 0 ? n(yD) : yD;
        const yU1 = indices[0] === 0 ? n(zD) : zD;
        // if(indices[2] === 1) {
        //     yD1 = n(yD1);
        //     yU1 = n(yU1);
        // }

        const yD2 = indices[2] === 0 ? yD : n(yD);
        const yU2 = indices[2] === 0 ? n(xD) : xD;
        // if(indices[0] === 1) {
        //     yD2 = n(yD2);
        //     yU2 = n(yU2);
        // }



        return [
            {
                labels: [
                    // choose zx-plane x label based on z index
                    indices[2] === 1 ?
                        { name: xN, dir: n(xD), pos: xP1, up: xU }:
                        { name: xN, dir: xD, pos: xP2, up: n(xU) }
                ],
                // doesn't matter, as only one option is passed
                useNearest: true
            },
            {
                labels:  [
                    // choose xy-plane option based on z index
                    indices[2] === 1 ?
                        { name: yN, dir: n(yD1), pos: yP1, up: yU1 }:
                        { name: yN, dir: yD1, pos: yP2, up: n(yU1) },
                    // choose yz-plane option based on x index
                    indices[0] === 1 ?
                        { name: yN, dir: n(yD2), pos: yP3, up: yU2 }:
                        { name: yN, dir: yD2, pos: yP4, up: n(yU2) }
                ],
                // use the one further away for better readability
                useNearest: false
            },
            {
                labels: [
                    // choose zx-plane z label based on x index
                    indices[0] === 1 ?
                        { name: zN, dir: zD, pos: zP1, up: zU }:
                        { name: zN, dir: n(zD), pos: zP2, up: n(zU) }
                ],
                // doesn't matter, as only one option is passed
                useNearest: true
            },
        ];
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

    public get altered(): boolean {
        return this._altered.any;
    }
}
