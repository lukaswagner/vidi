import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { FileInput } from './ui/file';
import { Input } from './ui/input';
import { InputSlider } from './ui/inputSlider';
import { Progress } from './ui/progress';
import { Select } from './ui/select';
import { UI } from '@lukaswagner/web-ui';

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

    public constructor() {
        const presetContainer = document.getElementById('preset-group');
        this.presets = new UI(presetContainer);
        const dataContainer = document.getElementById('data-group');
        this.data = new UI(dataContainer);
        const positionContainer = document.getElementById('position-group');
        this.position = new UI(positionContainer);
        const clusterContainer = document.getElementById('cluster-group');
        this.cluster = new UI(clusterContainer);
        const sizeContainer = document.getElementById('size-group');
        this.size = new UI(sizeContainer);
        const colorContainer = document.getElementById('color-group');
        this.color = new UI(colorContainer);
    }

    public applyPreset(preset: Preset): void {
        // this.apply(this.axes[0], preset.axes[0]);
        // this.apply(this.axes[1], preset.axes[1]);
        // this.apply(this.axes[2], preset.axes[2]);

        // this.apply(this.pointSize, preset.pointSize);
        // this.apply(
        //     this.variablePointSizeStrength, preset.variablePointSizeStrength);
        // this.apply(
        //     this.variablePointSizeColumn, preset.variablePointSizeColumn);

        // this.apply(this.colorMode, preset.colorMode);
        // this.apply(this.colorMapping, preset.colorMapping);
        // this.apply(this.colorColumn, preset.colorColumn);

        // this.clusterAlgSelect.reset();
    }

    private apply(
        control: InputSlider | Select, value: number | string
    ): void {
        if (value !== undefined) {
            if (control instanceof InputSlider) {
                control.setValue(value as number);
            } else if (control instanceof Select) {
                control.setValue(value as string);
            }
        } else {
            control.reset();
        }
    }
}
