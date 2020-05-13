import { GLclampf4 } from "webgl-operate/lib/tuples";

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
