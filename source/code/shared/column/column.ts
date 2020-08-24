import { BaseChunk, NumberChunk, rebuildChunk } from './chunk';
import { DataType } from './dataType';
import { GLclampf4 } from 'shared/types/tuples';

export abstract class BaseColumn<T> {
    protected _name: string;
    protected _chunks: BaseChunk<T>[] = [];
    protected _type: DataType;
    protected _length = 0;
    protected _altered: boolean;

    public constructor(name: string, type: DataType) {
        this._name = name;
        this._type = type;
    }

    public push(chunk: BaseChunk<T>): void {
        this._chunks.push(chunk);
        this._length += chunk.length;
        this._altered = true;
    }

    public getChunk(index: number): BaseChunk<T> {
        return this._chunks[index];
    }

    public get name(): string {
        return this._name;
    }

    public get type(): DataType {
        return this._type;
    }

    public get chunkCount(): number {
        return this._chunks.length;
    }

    public get length(): number {
        return this._length;
    }

    public get chunks(): BaseChunk<T>[] {
        return this._chunks;
    }

    public getChunks(start: number, end: number): BaseChunk<T>[] {
        return this._chunks.slice(start, end);
    }

    public get altered(): boolean {
        return this._altered;
    }

    public set altered(altered: boolean) {
        this._altered = altered;
    }
}

export class NumberColumn extends BaseColumn<number> {
    protected _min: number;
    protected _max: number;

    public constructor(name: string) {
        super(name, DataType.Number);
        this._min = Number.POSITIVE_INFINITY;
        this._max = Number.NEGATIVE_INFINITY;
    }

    public push(chunk: BaseChunk<number>): void {
        super.push(chunk);
        const nc = chunk as NumberChunk;
        if (nc.min < this._min) this._min = nc.min;
        if (nc.max > this._max) this._max = nc.max;
    }

    public get min(): number {
        return this._min;
    }

    public get max(): number {
        return this._max;
    }
}

export class ColorColumn extends BaseColumn<GLclampf4> {
    public constructor(name: string) {
        super(name, DataType.Color);
    }
}

export class StringColumn extends BaseColumn<string> {
    public constructor(name: string) {
        super(name, DataType.String);
    }
}

export type Column = NumberColumn | ColorColumn | StringColumn;

export function buildColumn(name: string, type: DataType): Column {
    switch (type) {
        case DataType.Number:
            return new NumberColumn(name);
        case DataType.Color:
            return new ColorColumn(name);
        case DataType.String:
            return new StringColumn(name);
    }
}
