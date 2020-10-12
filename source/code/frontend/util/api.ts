import { Preset } from 'frontend/controls';

const userUrl = `${API_URL}/users/${API_USER}`;
const datasetsUrl = userUrl + '/datasets';
const presetsUrl = datasetsUrl + '/presets/data';
const token = '?access_token=X&token_type=Bearer';

export type Dataset = { id: string; url: string; format: string };

type ApiDataset = {
    id: string,
    user: string,
    job_id: string,
    format: string,
    args: unknown,
}

export async function fetchAvailable(): Promise<Dataset[]> {
    const res = await fetch(datasetsUrl + token);
    const datasets: ApiDataset[] = res.ok ? await res.json() : [];
    return datasets
        .filter((d) => d.format === 'csv')
        .map((d) => {
            return {
                id: d.id,
                url: `${datasetsUrl}/${d.id}/data`,
                format: d.format
            };
        });
}

export async function fetchPresets(): Promise<Preset[]> {
    const res = await fetch(presetsUrl + token);
    return res.ok ? res.json() : [];
}
