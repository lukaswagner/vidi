import { AnyChunk, NumberChunk, buildChunk } from 'shared/column/chunk';
import { Column, buildColumn } from 'shared/column/column';
import { DataType } from 'shared/column/dataType';
import { Timestamp } from './timestamp';

export class PerfMon {
    protected _zero = Date.now();
    protected _samples: Timestamp[] = [];

    public sample(id: number, label?: string): Timestamp {
        return this._samples[this._samples.push({
            id,
            time: Date.now() - this._zero,
            label,
        }) - 1];
    }

    public toColumns(): Column[] {
        const n = this._samples.length;

        const chunks = [
            buildChunk(DataType.Number, n) as NumberChunk,
            buildChunk(DataType.Number, n) as NumberChunk,
        ];

        this._samples.forEach((s, i) => {
            chunks[0].set(i, s.time);
            chunks[1].set(i, s.id);
        });

        const headers = ['time', 'id'];
        return chunks.map((chunk, index) => {
            const col = buildColumn(headers[index], chunk.type);
            col.push(chunks[index] as AnyChunk);
            return col;
        });
    }

    public toCsv(): string {
        let result = 'id,time,label\n';
        this._samples.forEach((s) => {
            result += `${s.id},${s.time},${s.label}\n`;
        });
        return result;
    }
}
