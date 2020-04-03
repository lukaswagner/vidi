import {
    Camera,
    ChangeLookup,
    Initializable,
    vec3,
} from 'webgl-operate';
import {
    GridLabelPass,
    LabelInfo
} from './gridLabelPass';
import { ExtendedGridInfo } from './gridInfo';
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
        const labels = new Array<LabelInfo>();

        const base = this._gridInfo[0];

        const firstDir = vec3.clone(base.firstAxis.direction);
        const firstPos = vec3.scaleAndAdd(
            vec3.create(),
            vec3.fromValues(0, offsets[0], 0),
            base.secondAxis.direction,
            base.secondAxis.extents.min - this.labelOffset);
        const firstPosAlternative = vec3.scaleAndAdd(
            vec3.create(),
            vec3.fromValues(0, offsets[0], 0),
            base.secondAxis.direction,
            base.secondAxis.extents.max + this.labelOffset);
        const firstUseAlternative =
            vec3.dist(this._camera.eye, firstPos) >
            vec3.dist(this._camera.eye, firstPosAlternative);
        const firstUnderPlane = this._camera.eye[1] < firstPos[1];
        const firstUp = vec3.clone(base.secondAxis.direction);
        if(firstUseAlternative) {
            vec3.copy(firstPos, firstPosAlternative);
            vec3.scale(firstDir, firstDir, -1);
            vec3.scale(firstUp, firstUp, -1);
        }
        if(firstUnderPlane) {
            vec3.scale(firstUp, firstUp, -1);
        }

        const firstAxisLabel: LabelInfo = {
            name: base.firstAxis.name,
            dir: firstDir,
            pos: firstPos,
            up: firstUp
        };

        const secondDir =
            vec3.scale(vec3.create(), base.secondAxis.direction, -1);
        const secondPos = vec3.scaleAndAdd(
            vec3.create(),
            vec3.fromValues(0, offsets[0], 0),
            base.firstAxis.direction,
            base.firstAxis.extents.min - this.labelOffset);
        const secondPosAlternative = vec3.scaleAndAdd(
            vec3.create(),
            vec3.fromValues(0, offsets[0], 0),
            base.firstAxis.direction,
            base.firstAxis.extents.max + this.labelOffset);
        const secondUseAlternative =
            vec3.dist(this._camera.eye, secondPos) >
            vec3.dist(this._camera.eye, secondPosAlternative);
        const secondUnderPlane = this._camera.eye[1] < secondPos[1];
        const secondUp = vec3.clone(base.firstAxis.direction);
        if(secondUseAlternative) {
            vec3.copy(secondPos, secondPosAlternative);
            vec3.scale(secondDir, secondDir, -1);
            vec3.scale(secondUp, secondUp, -1);
        }
        if(secondUnderPlane) {
            vec3.scale(secondUp, secondUp, -1);
        }

        const secondAxisLabel: LabelInfo = {
            name: base.secondAxis.name,
            dir: secondDir,
            pos: secondPos,
            up: secondUp
        };

        labels.push(firstAxisLabel, secondAxisLabel);

        if(offsets.length > 1) {
            const sg = this._gridInfo[1];
            const tg = this._gridInfo[2];
            const secondGridLeft = vec3.scaleAndAdd(
                vec3.create(),
                vec3.fromValues(0, 0, offsets[1]),
                sg.firstAxis.direction,
                sg.firstAxis.extents.min - this.labelOffset);
            const secondGridRight = vec3.scaleAndAdd(
                vec3.create(),
                vec3.fromValues(0, 0, offsets[1]),
                sg.firstAxis.direction,
                sg.firstAxis.extents.max + this.labelOffset);
            const thirdGridLeft = vec3.scaleAndAdd(
                vec3.create(),
                vec3.fromValues(-offsets[2], 0, 0),
                tg.firstAxis.direction,
                tg.firstAxis.extents.max + this.labelOffset);
            const thirdGridRight = vec3.scaleAndAdd(
                vec3.create(),
                vec3.fromValues(-offsets[2], 0, 0),
                tg.firstAxis.direction,
                tg.firstAxis.extents.min - this.labelOffset);

            const distSGL = vec3.dist(this._camera.eye, secondGridLeft);
            const distSGR = vec3.dist(this._camera.eye, secondGridRight);
            const distTGL = vec3.dist(this._camera.eye, thirdGridLeft);
            const distTGR = vec3.dist(this._camera.eye, thirdGridRight);

            const [ leftCloserSG, closerSG, otherSG, distSG ] =
                distSGL < distSGR ?
                    [ true, secondGridLeft, secondGridRight, distSGL ] :
                    [ false, secondGridRight, secondGridLeft, distSGR ];
            const [ leftCloserTG, closerTG, otherTG, distTG ] =
                distTGL < distTGR ?
                    [ true, thirdGridLeft, thirdGridRight, distTGL ] :
                    [ false, thirdGridRight, thirdGridLeft, distTGR ];

            const [ pos, other, leftCloser ] =
                distSG > distTG ?
                    [ closerSG, otherSG, leftCloserSG ] :
                    [ closerTG, otherTG, leftCloserTG ];

            const up = vec3.normalize(
                vec3.create(),vec3.subtract(vec3.create(), other, pos));
            const dir = vec3.fromValues(0, leftCloser ? -1 : 1, 0);

            const thirdAxisLabel: LabelInfo = {
                name: sg.secondAxis.name,
                dir: dir,
                pos: pos,
                up: up
            };

            labels.push(thirdAxisLabel);
        }

        this._gridLabelPass.labelInfo = labels;
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
