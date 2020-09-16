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
            return { value: offsets[i], mask: 1 };
        });

        console.log({
            centers, indices, offsets
        });

        this.updateLabels2(indices);
    }

    protected updateLabels2(indices: number[]): void {
        const gi = this._gridInfo;

        const next = (i: number): number => (i + 1) % 3;
        const prev = (i: number): number => (i + 2) % 3;

        const gEn = gi.map((g) => g.enabled);
        const aEn = gEn.map((e, i) => e || gEn[prev(i)]);
        const a = gi.map((g, i) => g.firstAxis ?? gi[prev(i)].secondAxis);

        const o = a.map((a, i) => !aEn[i] ? 0 :
            indices[next(i)] === 0 ? a.extents.min : a.extents.max);

        const labels: LabelSet[] = [];

        const slightOffset = 1e-6;
        if(aEn[0]) {
            const me = a[0];
            const c = me.extents.center;
            const name = me.name;
            const offset = o[1] + Math.sign(o[1]) * this.labelOffset;
            const up = vec3.fromValues(0, 1, 0);
            const p1 = vec3.fromValues(
                c, offset, aEn[2] ? a[2].extents.min : slightOffset);
            const d1 = vec3.cross(vec3.create(), p1, up);
            const p2 = vec3.fromValues(
                c, offset, aEn[2] ? a[2].extents.max : -slightOffset);
            const d2 = vec3.cross(vec3.create(), p2, up);
            labels.push({
                labels: [
                    {name, dir: d1, pos: p1, up },
                    {name, dir: d2, pos: p2, up}],
                useNearest: false
            });
        }

        if(aEn[1]) {
            const me = a[1];
            const c = me.extents.center;
            const name = me.name;
            const offset = o[0] + Math.sign(o[0]) * this.labelOffset;
            const up = vec3.fromValues(-o[0], 0, 0);
            const p1 = vec3.fromValues(
                offset, c, aEn[2] ? a[2].extents.min : slightOffset);
            const d1 = vec3.cross(vec3.create(), p1, up);
            const p2 = vec3.fromValues(
                offset, c, aEn[2] ? a[2].extents.max : -slightOffset);
            const d2 = vec3.cross(vec3.create(), p2, up);
            labels.push({
                labels: [
                    {name, dir: d1, pos: p1, up },
                    {name, dir: d2, pos: p2, up}],
                useNearest: false
            });
        }

        console.log(labels);
        this._gridLabelPass.labelInfo = labels;
    }

    protected updateLabels(offsets: number[]): void {
        const labels = new Array<LabelSet>();

        const base = this._gridInfo[0];

        const firstOptionA = this.buildLabelInfo(
            base.firstAxis, base.secondAxis, 1, [0, offsets[0], 0], true, 1
        );

        const firstOptionB = this.buildLabelInfo(
            base.firstAxis, base.secondAxis, -1, [0, offsets[0], 0], false, -1
        );

        const secondOptionA = this.buildLabelInfo(
            base.secondAxis, base.firstAxis, -1, [0, offsets[0], 0], true, 1
        );

        const secondOptionB = this.buildLabelInfo(
            base.secondAxis, base.firstAxis, 1, [0, offsets[0], 0], false, -1
        );

        const firstGridBackface = offsets[0] > this._camera.eye[1];
        if (firstGridBackface) {
            vec3.scale(firstOptionA.up, firstOptionA.up, -1);
            vec3.scale(firstOptionB.up, firstOptionB.up, -1);
            vec3.scale(secondOptionA.up, secondOptionA.up, -1);
            vec3.scale(secondOptionB.up, secondOptionB.up, -1);
        }

        labels.push({
            labels: [firstOptionA, firstOptionB],
            useNearest: true,
        }, {
            labels: [secondOptionA, secondOptionB],
            useNearest: true,
        });

        if (offsets.length > 1) {
            const sg = this._gridInfo[1];
            const tg = this._gridInfo[2];

            const secondGridLeft = this.buildLabelInfo(
                sg.secondAxis, sg.firstAxis, -1, [0, 0, offsets[1]], true, 1
            );

            const secondGridRight = this.buildLabelInfo(
                sg.secondAxis, sg.firstAxis, 1, [0, 0, offsets[1]], false, -1
            );

            const secondGridBackface = offsets[1] > this._camera.eye[2];
            if (secondGridBackface) {
                vec3.scale(secondGridLeft.dir, secondGridLeft.dir, -1);
                vec3.scale(secondGridRight.dir, secondGridRight.dir, -1);
            }

            const thirdGridLeft = this.buildLabelInfo(
                tg.secondAxis, tg.firstAxis, -1, [-offsets[2], 0, 0], false, -1
            );

            const thirdGridRight = this.buildLabelInfo(
                tg.secondAxis, tg.firstAxis, 1, [-offsets[2], 0, 0], true, 1
            );

            const thirdGridBackface = -offsets[2] < this._camera.eye[0];
            if (thirdGridBackface) {
                vec3.scale(thirdGridLeft.dir, thirdGridLeft.dir, -1);
                vec3.scale(thirdGridRight.dir, thirdGridRight.dir, -1);
            }

            const thirdOptionA = (
                vec3.dist(secondGridLeft.pos, this._camera.eye) <
                    vec3.dist(secondGridRight.pos, this._camera.eye) ?
                    secondGridLeft : secondGridRight
            );

            const thirdOptionB = (
                vec3.dist(thirdGridLeft.pos, this._camera.eye) <
                    vec3.dist(thirdGridRight.pos, this._camera.eye) ?
                    thirdGridLeft : thirdGridRight
            );

            labels.push({
                labels: [thirdOptionA, thirdOptionB],
                useNearest: false,
            });
        }

        this._gridLabelPass.labelInfo = labels;
    }

    protected buildLabelInfo(
        firstAxis: AxisInfo,
        secondAxis: AxisInfo,
        dirFactor: number,
        offset: [number, number, number],
        min: boolean,
        upFactor: number,
    ): LabelInfo {
        return {
            name: firstAxis.name,
            dir: vec3.scale(vec3.create(), firstAxis.direction, dirFactor),
            pos: vec3.scaleAndAdd(
                vec3.create(),
                vec3.clone(offset),
                secondAxis.direction,
                min ?
                    (secondAxis.extents.min - this.labelOffset) :
                    (secondAxis.extents.max + this.labelOffset)),
            up: vec3.scale(vec3.create(), secondAxis.direction, upFactor),
        };
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
