import { DataType } from './dataType';
import { GLclampf4 } from 'shared/types/tuples';

export abstract class BaseSubColumn<T> {
    protected _data: ArrayBuffer;
    protected _type: DataType;
    protected _length: number;
    public constructor(type: DataType, length: number) {
        this._type = type;
        this._length = length;
    }

    public get type(): DataType {
        return this._type;
    }

    public get length(): number {
        return this._length;
    }

    public get transferable(): Array<Transferable> {
        return [this._data];
    }

    public abstract get(index: number): T;
    public abstract set(index: number, value: T): void;
}

export class NumberSubColumn extends BaseSubColumn<number> {
    protected _view: Float32Array;
    protected _min: number;
    protected _max: number;

    public get min(): number {
        return this._min;
    }

    public get max(): number {
        return this._max;
    }

    public constructor(length: number) {
        super(DataType.Number, length);
        this._view = new Float32Array(length);
        this._data = this._view.buffer;
        this._min = Number.POSITIVE_INFINITY;
        this._max = Number.NEGATIVE_INFINITY;
    }

    public get(index: number): number {
        return this._view[index];
    }

    public set(index: number, value: number): void {
        this._view[index] = value;
        if (value < this._min) this._min = value;
        if (value > this._max) this._max = value;
    }
}

export class ColorSubColumn extends BaseSubColumn<GLclampf4> {
    protected _view: Float32Array;

    public constructor(length: number) {
        super(DataType.Number, length);
        this._view = new Float32Array(length * 4);
        this._data = this._view.buffer;
    }

    public get(index: number): GLclampf4 {
        return Array.from(
            this._view.subarray(index * 4, (index + 1) * 4)
        ) as GLclampf4;
    }

    public set(index: number, value: GLclampf4): void {
        this._view.set(value, index * 4);
    }
}
