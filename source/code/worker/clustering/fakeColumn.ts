import {
    Float32Chunk,
    Float32Column,
} from '@lukaswagner/csv-parser';

export class FakeChunk extends Float32Chunk {
    public get min(): number {
        return 0;
    }

    public get max(): number {
        return 0;
    }

    public constructor(length: number) {
        super(0, 0);
        this._length = length;
    }

    public get(): number {
        return 0;
    }

    public set(): void {
    }
}

export class FakeColumn extends Float32Column {
    public static fromActualColumn(column: Float32Column): FakeColumn {
        const result = new FakeColumn('');
        column.getChunks().forEach((c) => {
            result.push(new FakeChunk(c.length));
        });
        return result;
    }
}
