import { SelectInput, UI } from '@lukaswagner/web-ui';
import { DataSource } from '@lukaswagner/csv-parser/lib/types/types/dataSource';

export interface Preset {
    name: string;
    data?: DataSource;
    delimiter?: string;
    pointSize?: number;
    axes?: string[];
    colorMode?: number;
    colorMapping?: number;
    colorColumn?: string;
    variablePointSizeStrength?: number;
    variablePointSizeColumn?: string;
}

export class Controls {
    public presets: UI;
    public data: UI;
    public customData: UI;
    public position: UI;
    public cluster: UI;
    public size: UI;
    public color: UI;
    public rendering: UI;

    public axes: [SelectInput, SelectInput, SelectInput];
    public clusterAlg: SelectInput;
    public colorMode: SelectInput;
    public colorColumn: SelectInput;
    public variablePointSizeColumn: SelectInput;
    public constructor() {
        const presetContainer = document.getElementById('preset-group');
        this.presets = new UI(presetContainer, true);
        const dataContainer = document.getElementById('data-group');
        this.data = new UI(dataContainer, true);
        const customDataContainer =
            document.getElementById('custom-data-group');
        this.customData = new UI(customDataContainer, true);
        const positionContainer = document.getElementById('position-group');
        this.position = new UI(positionContainer, true);
        const clusterContainer = document.getElementById('cluster-group');
        this.cluster = new UI(clusterContainer, true);
        const sizeContainer = document.getElementById('size-group');
        this.size = new UI(sizeContainer, true);
        const colorContainer = document.getElementById('color-group');
        this.color = new UI(colorContainer, true);
        const renderingContainer = document.getElementById('rendering-group');
        this.rendering = new UI(renderingContainer, true);
    }

    public applyPreset(preset: Preset): void {
        const p = preset as unknown as Record<string, unknown>;

        this.data.reset();
        this.data.setFromObject(p, true);

        this.position.reset();
        this.position.setFromObject({
            'axes.x': preset.axes[0] ?? '__NONE__',
            'axes.y': preset.axes[1] ?? '__NONE__',
            'axes.z': preset.axes[2] ?? '__NONE__',
        }, true);

        this.customData.reset();

        this.cluster.reset();

        this.size.reset();
        this.size.setFromObject(p, true);

        this.color.reset();
        this.color.setFromObject(p, true);
    }
}
