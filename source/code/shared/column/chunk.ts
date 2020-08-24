import { DataType } from './dataType';
import { RGBA } from 'shared/types/tuples';

export abstract class BaseChunk<T> {
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

    public get data(): ArrayBuffer {
        return this._data;
    }

    public abstract get(index: number): T;
    public abstract set(index: number, value: T): void;
}

export class NumberChunk extends BaseChunk<number> {
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

export class ColorChunk extends BaseChunk<RGBA> {
    protected _view: Float32Array;

    public constructor(length: number) {
        super(DataType.Color, length);
        this._view = new Float32Array(length * 4);
        this._data = this._view.buffer;
    }

    public get(index: number): RGBA {
        return Array.from(
            this._view.subarray(index * 4, (index + 1) * 4)
        ) as RGBA;
    }

    public set(index: number, value: RGBA): void {
        this._view.set(value, index * 4);
    }
}

export class StringChunk extends BaseChunk<string> {
    public constructor(length: number) {
        super(DataType.String, length);
        this._data = new ArrayBuffer(0);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public get(index: number): string {
        return 'Not implemented';
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public set(index: number, value: string): void {
    }
}

export type Chunk = NumberChunk | ColorChunk | StringChunk;

export function buildChunk(type: DataType, length: number): Chunk {
    switch (type) {
        case DataType.Number:
            return new NumberChunk(length);
        case DataType.Color:
            return new ColorChunk(length);
        case DataType.String:
            return new StringChunk(length);
    }
}

export function rebuildChunk(chunk: unknown): Chunk {
    const c = chunk as any;
    if(c._type === undefined) return undefined;
    switch (c._type as DataType) {
        case DataType.Number:
            return Object.assign(new NumberChunk(0), chunk);
        case DataType.Color:
            return Object.assign(new ColorChunk(0), chunk);
        case DataType.String:
            return Object.assign(new StringChunk(0), chunk);
    }
}
