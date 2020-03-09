import { Dict } from '../util/dict';
export const ColorMode: Dict<number, string> = [
    [0, 'Single color'],
    [1, 'Position-based'],
    [2, 'Vertex color'],
    [3, 'Aggregation-based']
];
export const ColorModeDefault = 1;
