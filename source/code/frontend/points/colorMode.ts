import { Dict } from 'frontend/util/dict';
export const ColorMode: Dict<number, string> = [
    [0, 'Scalar value'],
    [1, 'Color value'],
    [2, 'Position'],
    [3, 'Aggregation'],
    [4, 'Uniform color'],
];
export const ColorModeDefault = 2;
