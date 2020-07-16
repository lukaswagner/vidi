import {
    Column,
    DataType,
    FloatColumn,
    StringColumn,
    columnFromType
} from 'frontend/data/column';
import { Timestamp } from './timestamp';
import { calcMinMax } from 'shared/csvLoader/calcMinMax';

export class PerfMon {
    protected _zero = Date.now();
    protected _samples: Timestamp[] = [];

    public sample(id: number, label?: string): void {
        this._samples.push({
            id,
            time: Date.now() - this._zero,
            label,
        });
    }

    public toColumns(): Column[] {
        const n = this._samples.length;

        const c = [
            columnFromType('time', DataType.Float, n),
            columnFromType('id', DataType.Float, n),
            columnFromType('label', DataType.String, n),
        ];

        this._samples.forEach((s, i) => {
            (c[0] as FloatColumn).set(i, s.time);
            (c[1] as FloatColumn).set(i, s.id);
            (c[2] as StringColumn).set(i, s.label);
        });

        calcMinMax(c, () => {});

        return c;
    }
}
