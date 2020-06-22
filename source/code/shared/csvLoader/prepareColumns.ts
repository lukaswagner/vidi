import { splitLine } from './splitLine';
import { Column, inferType, columnFromType } from '../../frontend/data/column';


export function prepareColumns(
    header: string, firstLine: string, delimiter: string, length: number
): Column[] {
    const f = splitLine(firstLine, delimiter);

    if(header === undefined) {
        f.map((v, i) => {
            const type = inferType(v);
            return columnFromType(`Column ${i}`, type, length);
        });
    }

    const h = splitLine(header, delimiter);

    return h.map((c, i) => {
        const data = f[i];
        const type = inferType(data);
        return columnFromType(c, type, length);
    });
}
