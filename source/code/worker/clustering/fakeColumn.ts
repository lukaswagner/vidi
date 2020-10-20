import { NumberChunk } from 'shared/column/chunk';
import { NumberColumn } from 'shared/column/column';

export class FakeChunk extends NumberChunk {
    public get min(): number {
        return 0;
    }

    public get max(): number {
        return 0;
    }

    public constructor(length: number) {
        super(0);
        this._length = length;
    }

    public get(): number {
        return 0;
    }

    public set(): void {
    }
}

export class FakeColumn extends NumberColumn {
    public static fromActualColumn(column: NumberColumn): FakeColumn {
        const result = new FakeColumn('');
        column.getChunks().forEach((c) => {
            result.push(new FakeChunk(c.length));
        });
        return result;
    }
}