import {
    Column,
    DataType,
    FloatColumn,
    ColorColumn,
    StringColumn
} from "../../frontend/data/column";
import { splitLine } from "./splitLine";
import { Color } from "webgl-operate";

export function storeLine(
    line: string, index: number, delimiter: string, columns: Column[]
): void {
    const cells = splitLine(line, delimiter);
    cells.forEach((cell, ci) => {
        const column = columns[ci];
        switch (column.type) {
            case DataType.Float:
                (column as FloatColumn).set(index, Number(cell));
                break;
            case DataType.Color:
                (column as ColorColumn).set(index, Color.hex2rgba(cell));
                break;
            case DataType.String:
                (column as StringColumn).set(index, cell);
                break;
        }
    });
}
