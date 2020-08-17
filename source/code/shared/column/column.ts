import { BaseSubColumn, NumberSubColumn } from './subColumn';
import { DataType } from './dataType';
import { GLclampf4 } from 'shared/types/tuples';

export abstract class BaseColumn<T> {
    protected _name: string;
    protected _subColumns: BaseSubColumn<T>[];
    protected _type: DataType;
    protected _length = 0;

    public constructor(name: string, type: DataType) {
        this._name = name;
        this._type = type;
    }

    public setSubColumn(index: number, subColumn: BaseSubColumn<T>): void {
        const old = this._subColumns[index];

        if(old !== undefined) {
            this._length -= old.length;
        }

        this._subColumns[index] = subColumn;
        this._length += subColumn.length;
    }

    public getSubColumn(index: number): BaseSubColumn<T> {
        return this._subColumns[index];
    }
}

export class NumberColumn extends BaseColumn<number> {
    protected _min: number;
    protected _max: number;

    public setSubColumn(index: number, subColumn: BaseSubColumn<number>): void {
        const col = subColumn as NumberSubColumn;
        const old = this._subColumns[index] as NumberSubColumn;

        if(old !== undefined) {
            if(old.min === this._min || old.max === this._max) {
                this.rebuildMinMax();
            }
        }

        super.setSubColumn(index, subColumn);

        if (col.min < this._min) this._min = col.min;
        if (col.max > this._max) this._max = col.max;
    }

    private rebuildMinMax(): void {
        this._min = Number.POSITIVE_INFINITY;
        this._max = Number.NEGATIVE_INFINITY;

        this._subColumns.forEach((c) => {
            const n = c as NumberSubColumn;
            if(n.min < this._min) this._min = n.min;
            if(n.max < this._max) this._max = n.max;
        });
    }
}

export type ColorColumn = BaseColumn<GLclampf4>;
