import { Controls, Preset } from "frontend/controls";

export type Dataset = { id: string; url: string; format: string };

export function fetchAvailable(
    datasetsUrl: string, controls: Controls
): Promise<Dataset[]> {
    type ApiDataset = {
        id: string,
        user: string,
        job_id: string,
        format: string,
        args: unknown,
    }
    return new Promise<Dataset[]>((resolve) => {
        fetch(datasetsUrl + '?access_token=X&token_type=Bearer')
            .then((res) => res.ok ? res.json() : [])
            .then((j: ApiDataset[]) => {
                const csv = j
                    .filter((d: ApiDataset) => d.format === 'csv')
                    .map((d: ApiDataset) => {
                        return {
                            id: d.id,
                            url: `${datasetsUrl}/${d.id}/data`,
                            format: d.format
                        };
                    });
                controls.data.setOptions(csv.map((d) => d.id));
                resolve(csv);
            });
    });
}

export function fetchPresets(
    datasetsUrl: string, controls: Controls, datasets: Dataset[]
): void {
    fetch(datasetsUrl + '/presets/data', { 
        body: '{"token_type": "Bearer","access_token": "X"}'
    }).then((res) => {
        res.json().then((presets: Preset[]) => {
            const handler = (): void => {
                const selected = controls.presets.value;
                const preset = presets.find((p) => p.name === selected);
                const data = datasets.find((d) => d.id === preset.data);
                if (preset.data !== undefined && data !== undefined) {
                    controls.data.setValue(preset.data, false);
                    this.load(data.url, data.format).then(() => {
                        controls.applyPreset(preset);
                    });
                } else {
                    controls.applyPreset(preset);
                }
            };

            controls.presetButton.handler = handler;
            controls.presets.setOptions(presets.map((p) => p.name));
            handler();
        });
    });
}