import { GLclampf4 } from "shared/types/tuples";
import { hex2rgba } from "shared/helper/color";

export enum DataType {
    Float,
    Color,
    String
}

export abstract class BaseColumn<T> {
    protected _name: string;
    protected _type: DataType;
    protected _length: number;
    protected _min: T;
    protected _max: T;

    constructor(name: string, type: DataType, length: number) {
        this._name = name;
        this._type = type;
        this._length = length;
    }

    public get name(): string {
        return this._name;
    }

    public get type(): DataType {
        return this._type;
    }

    public get length(): number {
        return this._length;
    }

    public set min(min: T) {
        this._min = min;
    }

    public get min(): T {
        return this._min;
    }

    public get max(): T {
        return this._max;
    }

    public set max(max: T) {
        this._max = max;
    }

    public abstract get(index: number): T;
    public abstract set(index: number, value: T): void;
    public abstract copy(other: BaseColumn<T>, offset: number): void;

    public abstract get transferable(): Array<Transferable>;
}

export class FloatColumn extends BaseColumn<number> {
    protected _data: Float32Array;

    constructor(name: string, length: number) {
        super(name, DataType.Float, length);
        this._data = new Float32Array(length);
    }

    public calcMinMax(): void {
        const result = this._data.reduce(
            ({ min, max }, val) => {
                return {
                    min: val < min ? val : min,
                    max: val > max ? val : max
                };
            }, {
            min: Number.POSITIVE_INFINITY,
            max: Number.NEGATIVE_INFINITY
        });
        this._min = result.min;
        this._max = result.max;
    }

    public get(index: number): number {
        return this._data[index];
    }

    public set(index: number, value: number): void {
        this._data[index] = value;
    }

    public copy(other: FloatColumn, offset = 0): void {
        this._data.set(other._data, offset);
    }

    public get transferable(): Array<Transferable> {
        return [this._data.buffer];
    }
}

export class ColorColumn extends BaseColumn<GLclampf4> {
    protected _data: Float32Array;

    constructor(name: string, length: number) {
        super(name, DataType.Color, length);
        this._data = new Float32Array(length * 4);
    }

    public get(index: number): GLclampf4 {
        return Array.from(
            this._data.subarray(index * 4, (index + 1) * 4)
        ) as GLclampf4;
    }

    public set(index: number, value: GLclampf4): void {
        this._data.set(value, index * 4);
    }

    public copy(other: ColorColumn, offset = 0): void {
        this._data.set(other._data, offset);
    }

    public get transferable(): Array<Transferable> {
        return [this._data.buffer];
    }
}

export class StringColumn extends BaseColumn<string> {
    constructor(name: string, length: number) {
        super(name, DataType.String, length);
    }

    public get(index: number): string {
        return '';
    }

    public set(index: number, value: string): void {
    }

    public copy(other: StringColumn, offset = 0): void {
    }

    public get transferable(): Array<Transferable> {
        return [];
    }
}

export type Column = FloatColumn | ColorColumn | StringColumn;

export function columnFromType(
    name: string, type: DataType, length: number
): Column {
    switch (type) {
        case DataType.Float:
            return new FloatColumn(name, length);
        case DataType.Color:
            return new ColorColumn(name, length);
        case DataType.String:
        default:
            return new StringColumn(name, length);
    }
}

export function inferType(input: string): DataType {
    if (!Number.isNaN(Number(input))) {
        return DataType.Float;
    }

    if (input.startsWith('#')) {
        const col = hex2rgba(input);
        if (col[0] !== 0 || col[1] !== 0 || col[2] !== 0 || col[3] !== 0) {
            return DataType.Color;
        }
    }

    return DataType.String;
}

export function rebuildColumn(value: any): Column {
    switch (value._type) {
        case DataType.Float:
            return Object.assign(new FloatColumn('', 0), value);
        case DataType.Color:
            return Object.assign(new ColorColumn('', 0), value);
        case DataType.String:
        default:
            return Object.assign(new StringColumn('', 0), value);
    }
}