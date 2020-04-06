import { 
    AxisInfo,
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
import { PointPass } from '../points/pointPass';

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

    protected _normals: vec3[];
    protected _offsets: [number, number][];
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
    public update(override: boolean = false): void {
        if(this._gridInfo === undefined) {
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
        this._normals = this._gridInfo.map((g) => g.normal);
        this._offsets = this._gridInfo.map((g) => g.offsets);
        this._lastIndices = this._gridInfo.map(() => -1);
    }

    protected updateOffsets(override: boolean): void {
        const indices = this._normals.length === 1 ? [
            (this._camera.eye[1] >
                (this._offsets[0][0] + this._offsets[0][1]) / 2) ? 0 : 1,
            this._camera.eye[2] > 0 ? 0 : 1,
            this._camera.eye[0] < 0 ? 0 : 1
        ]: [
            (this._camera.eye[1] >
                (this._offsets[0][0] + this._offsets[0][1]) / 2) ? 0 : 1,
            (this._camera.eye[2] >
                (this._offsets[1][0] + this._offsets[1][1]) / 2) ? 0 : 1,
            (this._camera.eye[0] <
                (this._offsets[2][0] + this._offsets[2][1]) / 2) ? 0 : 1
        ];
        const changed = indices.reduce(
            (acc, index, i) => acc || index !== this._lastIndices[i], false);
        this._lastIndices = indices;
        if(changed || override) {
            const offsets = indices
                .slice(0, this._normals.length)
                .map((index, i) => this._offsets[i][index]);
            this._gridPass.gridOffsets = offsets;
            if(offsets.length === 1) {
                this._pointPass.cutoffPosition = [
                    { value: 0, mask : 0 },
                    { value: offsets[0], mask : 1 },
                    { value: 0, mask : 0 },
                ];
            } else {
                this._pointPass.cutoffPosition = [
                    { value: -offsets[2], mask: 1 },
                    { value: offsets[0], mask: 1 },
                    { value: offsets[1], mask: 1 },
                ];
            }
            this.updateLabels(offsets);
        }
    }

    protected updateLabels(offsets: number[]): void {
        console.log('ul');
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
        if(firstGridBackface) {
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

        if(offsets.length > 1) {
            const sg = this._gridInfo[1];
            const tg = this._gridInfo[2];

            const secondGridLeft = this.buildLabelInfo(
                sg.secondAxis, sg.firstAxis, -1, [0, 0, offsets[1]], true, 1
            );

            const secondGridRight = this.buildLabelInfo(
                sg.secondAxis, sg.firstAxis, 1, [0, 0, offsets[1]], false, -1
            );

            const secondGridBackface = offsets[1] > this._camera.eye[2];
            if(secondGridBackface) {
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
            if(thirdGridBackface) {
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
