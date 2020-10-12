export function parseChunk(
    chunk: string, lines: string[], rem: string
): string {
    let start = 0;
    let newLine: number; 

    while ((newLine = chunk.indexOf('\n', start)) !== -1) {
        const hasReturn = chunk.charAt(newLine - 1) === '\r';
        const str = chunk.substring(start, newLine - (hasReturn ? 1 : 0));
        if(start === 0) {
            lines.push(rem + str);
        } else {
            lines.push(str);
        }
        start = newLine + 1;
    }

    return chunk.substring(start);
}
