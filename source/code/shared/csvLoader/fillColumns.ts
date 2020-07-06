import { Column } from '../../frontend/data/column';
import { storeLine } from './storeLine';

// i can feel it coming in the air tonight, oh lord
export function fillColumns(
    lines: string[], delimiter: string, columns: Column[],
    progress: (index: number, progress: number) => void
): void {
    const progressThreshold = lines.length / 10;
    let prog = 0;
    for (let i = 0; i < lines.length - 1; i++) {
        storeLine(lines[i + 1], i, delimiter, columns);
        prog++;
        if(prog >= progressThreshold) {
            progress(2, prog);
            prog = 0;
        }
    }
    if(prog > 0) {
        progress(2, prog);
    }
}
