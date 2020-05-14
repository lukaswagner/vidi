import { GLclampf4 } from "webgl-operate/lib/tuples";
import { Color } from "webgl-operate";

export type ColumnContent = Number | GLclampf4 | String;

export enum DataType {
    Number,
    Color,
    String
}

export type Column<T> = {
    name: string;
    type: DataType;
    data: Array<T>;
    min: T;
    max: T;
}

function emptyContent(t: DataType): ColumnContent {
    switch (t) {
        case DataType.Number:
            return 0;
        case DataType.Color:
            return [0, 0, 0, 0];
        case DataType.String:
        default:
            return '';
    }
}

export function emptyColumn<T extends ColumnContent>(
    name: string, type: DataType, length: number
): Column<T> {
    const data = new Array<T>(length);
    const min = emptyContent(type) as T;
    const max = emptyContent(type) as T;
    return {
        name, type, data, min, max
    }
}

export function inferType(input: string): DataType {
    if (!Number.isNaN(Number(input))) {
        return DataType.Number;
    }

    if (input.startsWith('#')) {
        const col = Color.hex2rgba(input);
        if (col[0] !== 0 || col[1] !== 0 || col[2] !== 0 || col[3] !== 0) {
            return DataType.Color;
        }
    }

    return DataType.String;
}
