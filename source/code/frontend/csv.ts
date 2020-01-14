
/**
 * Given a CSV with comma separated (',') values and a head line containing for 'x', 'y', and 'z' identifiers, this
 * identifies the column indices of x, y, and z, ignores all empty lines, and parses floats for every component
 * respectively. Since a file list is expected and processing takes some time, a Promis on an Array of Float32Arrays
 * is created and returned when all CSV files where parsed/imported.
 * ```
 * const input = document.getElementById('input-file')! as HTMLInputElement;
 * input.addEventListener('change', () => {
 *     importPointsFromCSV(input.files!).then(result => console.log(result));
 * });
 * ```
 */
export function importPointsFromCSV(list: Array<string>, progress?: HTMLProgressElement): Promise<Array<Float32Array>> {
    if (progress) {
        progress.max = list.length;
        progress.classList.remove('active');
        progress.value = 0;
    }

    const coordinates = new Array<Float32Array>(list.length);

    const response = new Promise<Array<Float32Array>>((resolve, reject) => {

        let waiting = list.length;
        for (let i = 0; i < list.length; ++i) {
            fetch(list[i]).then((r) => {
                r.text().then((t) => {
                    let lines = t.split(/\r\n|\n/);

                    // remove empty lines
                    lines = lines.filter(
                        (value: string) => value.trim() !== '');

                    // look for x, y, z columns in first line / header
                    const columnIdentifier = lines[0].split(',');
                    const columnIndices = [
                        columnIdentifier.findIndex(
                            (identifier: string) => identifier === 'x'),
                        columnIdentifier.findIndex(
                            (identifier: string) => identifier === 'y'),
                        columnIdentifier.findIndex(
                            (identifier: string) => identifier === 'z')];

                    lines.shift();
                    const numCoordinates = lines.length;

                    coordinates[i] = new Float32Array(numCoordinates * 3);
                    for (let j = 0; j < numCoordinates; ++j) {
                        const values = lines[j].split(',');
                        coordinates[i][j * 3 + 0] =
                            Number.parseFloat(values[columnIndices[0]]);
                        coordinates[i][j * 3 + 1] =
                            Number.parseFloat(values[columnIndices[1]]);
                        coordinates[i][j * 3 + 2] =
                            Number.parseFloat(values[columnIndices[2]]);
                    }

                    /* Resolve the promise when all coordinates have been loaded. */
                    waiting = waiting - 1;

                    if (progress) {
                        ++progress.value;
                        progress.style.width =
                            `${progress.value / progress.max * 100.0}%`;
                    }

                    if (waiting === 0) {
                        resolve(coordinates);
                    }
                }).catch((e) => {
                    reject(`importing '${list[i]} failed`);
                })
            });
        }
    });

    return response;
}
