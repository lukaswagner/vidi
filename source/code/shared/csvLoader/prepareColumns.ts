import { Column, buildColumn } from 'shared/column/column';
import { DataType } from 'shared/column/dataType';
import { hex2rgba } from 'shared/helper/color';
import { splitLine } from './splitLine';

export function prepareColumns(
    header: string, firstLine: string, delimiter: string
): Column[] {
    const f = splitLine(firstLine, delimiter);

    if(header === undefined) {
        return f.map((v, i) => {
            const type = inferType(v);
            return buildColumn(`Column ${i}`, type);
        });
    }

    const h = splitLine(header, delimiter);

    return h.map((c, i) => {
        const data = f[i];
        const type = inferType(data);
        return buildColumn(c, type);
    });
}

function inferType(input: string): DataType {
    if (!Number.isNaN(Number(input))) {
        return DataType.Number;
    }

    if (input.startsWith('#')) {
        const col = hex2rgba(input);
        if (col[0] !== 0 || col[1] !== 0 || col[2] !== 0 || col[3] !== 0) {
            return DataType.Color;
        }
    }
}
