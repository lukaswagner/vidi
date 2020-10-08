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
        axes: ExtendedAxisInfo[],
        axisCenterStep: number[],
        gridOffsetValues: number[]
    ): LabelSet[] {
        console.log(gridOffsetValues);
        // negate vector
        function n(v: vec3): vec3 {
            return vec3.negate(vec3.create(), v);
        }

        // place x/z labels on horizontal plane

        const xName = axes[0].name;
        const zName = axes[2].name;
        const xDir = axes[0].direction;
        const zDir = axes[2].direction;

        // pos on lower-z side of zx-plane
        const xPos1 = vec3.fromValues(
            0, gridOffsetValues[2], axes[2].extents.min - this.labelOffset);
        // pos on upper-z side of zx-plane
        const xPos2 = vec3.fromValues(
            0, gridOffsetValues[2], axes[2].extents.max + this.labelOffset);
        // flip up vector if viewed from below
        const xUp = axisCenterStep[1] === 0 ? zDir : n(zDir);
        // choose zx-plane x label based on xy-plane position on z axis
        const xLabel = axisCenterStep[2] === 1 ?
            { name: xName, dir: n(xDir), pos: xPos1, up: xUp }:
            { name: xName, dir: xDir, pos: xPos2, up: n(xUp) };

        // pos on lower-x side of zx-plane
        const zPos1 = vec3.fromValues(
            axes[0].extents.min - this.labelOffset, gridOffsetValues[2], 0);
        // pos on upper-x side of zx-plane
        const zPos2 = vec3.fromValues(
            axes[0].extents.max + this.labelOffset, gridOffsetValues[2], 0);
        // flip up vector if viewed from below
        const zUp = axisCenterStep[1] === 0 ? xDir : n(xDir);
        // choose zx-plane z label based on yz-plane position on x axis
        const zLabel = axisCenterStep[0] === 1 ?
            { name: zName, dir: zDir, pos: zPos1, up: zUp }:
            { name: zName, dir: n(zDir), pos: zPos2, up: n(zUp) };

        // place y label on vertical planes

        const yName = axes[1].name;
        const yDir = axes[1].direction;

        // pos on lower-x side of xy-plane
        const yPosXY1 = vec3.fromValues(
            axes[0].extents.min - this.labelOffset, 0, gridOffsetValues[0]);
        // pos on upper-x side of xy-plane
        const yPosXY2 = vec3.fromValues(
            axes[0].extents.max + this.labelOffset, 0, gridOffsetValues[0]);
        // pos on lower-z side of yz-plane
        const yPosYZ1 = vec3.fromValues(
            gridOffsetValues[1], 0, axes[2].extents.min - this.labelOffset);
        // pos on upper-z side of yz-plane
        const yPosYZ2 = vec3.fromValues(
            gridOffsetValues[1], 0, axes[2].extents.max + this.labelOffset);

        // choose xy-plane y label based on yz-plane position on x axis
        const yLabelXY = axisCenterStep[0] === 1 ?
            { name: yName, dir: n(yDir), pos: yPosXY1, up: xDir }:
            { name: yName, dir: yDir, pos: yPosXY2, up: n(xDir) };
        // if higher xy-plane is used, the label isn't facing the camera
        if(axisCenterStep[2] === 1) yLabelXY.dir = n(yLabelXY.dir);
        // choose yz-plane y label based on xy-plane position on z axis
        const yLabelYZ = axisCenterStep[2] === 1 ?
            { name: yName, dir: yDir, pos: yPosYZ1, up: zDir }:
            { name: yName, dir: n(yDir), pos: yPosYZ2, up: n(zDir) };
        // if higher yz-plane is used, the label isn't facing the camera
        if(axisCenterStep[0] === 1) yLabelYZ.dir = n(yLabelYZ.dir);

        return [
            { labels: [xLabel], useNearest: true },
            { labels: [yLabelXY, yLabelYZ], useNearest: false },
            { labels: [zLabel], useNearest: true },
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
