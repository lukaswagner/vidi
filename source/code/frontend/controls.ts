import { Button } from './ui/button';
import { File } from './ui/file';
import { InputSlider } from './ui/inputSlider';
import { Select } from './ui/select';

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
    public presets: Select;
    public presetButton: Button;
    public data: Select;
    public customData: File;
    public pointSize: InputSlider;
    public scale: InputSlider;
    public axes: Select[];
    public colorMode: Select;
    public colorMapping: Select;
    public colorColumn: Select;
    public variablePointSizeStrength: InputSlider;
    public variablePointSizeColumn: Select;

    public constructor() {
        this.presets = new Select('preset-select');
        this.presetButton = new Button('preset-button');
        this.data = new Select('data-select');
        this.customData = new File('custom-data');
        this.pointSize = new InputSlider('point-size');
        this.scale = new InputSlider('scale');
        this.axes = [
            new Select('x-axis'),
            new Select('y-axis'),
            new Select('z-axis')
        ];
        this.colorMode = new Select('color-mode');
        this.colorMapping = new Select('color-mapping');
        this.colorColumn = new Select('color-column');
        this.variablePointSizeStrength =
            new InputSlider('variable-point-size-strength');
        this.variablePointSizeColumn = new Select('variable-point-size-column');
    }

    public applyPreset(preset: Preset): void {
        this.apply(this.pointSize, preset.pointSize);
        this.apply(this.axes[0], preset.axes[0]);
        this.apply(this.axes[1], preset.axes[1]);
        this.apply(this.axes[2], preset.axes[2]);
        this.apply(this.colorMode, preset.colorMode);
        this.apply(this.colorMapping, preset.colorMapping);
        this.apply(this.colorColumn, preset.colorColumn);
        this.apply(
            this.variablePointSizeStrength, preset.variablePointSizeStrength);
        this.apply(
            this.variablePointSizeColumn, preset.variablePointSizeColumn);
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
