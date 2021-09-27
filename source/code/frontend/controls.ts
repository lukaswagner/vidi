import { SelectInput, UI } from '@lukaswagner/web-ui';

export interface Preset {
    name: string;
    data?: string;
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
    public position: UI;
    public cluster: UI;
    public size: UI;
    public color: UI;

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
        const positionContainer = document.getElementById('position-group');
        this.position = new UI(positionContainer, true);
        const clusterContainer = document.getElementById('cluster-group');
        this.cluster = new UI(clusterContainer, true);
        const sizeContainer = document.getElementById('size-group');
        this.size = new UI(sizeContainer, true);
        const colorContainer = document.getElementById('color-group');
        this.color = new UI(colorContainer, true);
    }

    public applyPreset(preset: Preset): void {
        const p = preset as unknown as Record<string, unknown>;

        this.data.reset();
        this.data.setFromObject(p, true);

        this.position.reset();
        this.data.setFromObject({
            'x-axis': preset.axes[0],
            'y-axis': preset.axes[1],
            'z-axis': preset.axes[2],
        }, true);

        this.cluster.reset();

        this.size.reset();
        this.size.setFromObject(p, true);

        this.color.reset();
        this.color.setFromObject(p, true);
    }
}
