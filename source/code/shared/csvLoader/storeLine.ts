import {
    Chunk,
    ColorChunk,
    NumberChunk,
} from 'shared/column/chunk';
import { DataType } from 'shared/column/dataType';
import { hex2rgba } from 'shared/helper/color';
import { splitLine } from './splitLine';

export function storeLine(
    line: string, index: number, delimiter: string, columns: Chunk[]
): void {
    const cells = splitLine(line, delimiter);
    cells.forEach((cell, ci) => {
        const column = columns[ci];
        switch (column.type) {
            case DataType.Number:
                (column as NumberChunk).set(index, Number(cell));
                break;
            case DataType.Color:
                (column as ColorChunk).set(index, hex2rgba(cell));
                break;
        }
    });
}