import { Column, DataType, FloatColumn } from 'frontend/data/column';

export function calcMinMax(
    columns: Column[], progress: (index: number, progress: number) => void
): void {
    const progressThreshold = columns.length / 2;
    let prog = 0;
    columns.forEach((c) => {
        if (c.type === DataType.Float) {
            (c as FloatColumn).calcMinMax();
        }
        prog++;
        if(prog >= progressThreshold) {
            progress(2, prog);
            prog = 0;
        }
    });
    if(prog > 0) {
        progress(2, prog);
    }
}
