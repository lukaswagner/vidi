import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { FileInput } from './ui/file';
import { Input } from './ui/input';
import { InputSlider } from './ui/inputSlider';
import { Progress } from './ui/progress';
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
    public dataButton: Button;
    public dataProgress: Progress;

    public customData: FileInput;
    public customDataDelimiterSelect: Select;
    public customDataDelimiterInput: Input;
    public customDataIncludesHeader: Checkbox;
    public customDataUploadButton: Button;
    public customDataProgress: Progress;

    public axes: Select[];

    public scale: InputSlider;
    public pointSize: InputSlider;
    public variablePointSizeStrength: InputSlider;
    public variablePointSizeColumn: Select;

    public colorMode: Select;
    public colorMapping: Select;
    public colorColumn: Select;

    public constructor() {
        this.presets = new Select('preset-select');
        this.presetButton = new Button('preset-button');

        this.data = new Select('data-select');
        this.dataButton = new Button('data-button');
        this.dataProgress = new Progress('data-progress');

        this.customData = new FileInput('custom-data');
        this.customDataDelimiterSelect =
            new Select('custom-data-delimiter-select');
        this.customDataDelimiterInput =
            new Input('custom-data-delimiter-input');
        this.customDataIncludesHeader =
            new Checkbox('custom-data-header-checkbox');
        this.customDataUploadButton = new Button('custom-data-upload-button');
        this.customDataProgress = new Progress('custom-data-progress');

        this.axes = [
            new Select('x-axis-select'),
            new Select('y-axis-select'),
            new Select('z-axis-select')
        ];

        this.scale = new InputSlider('scale');
        this.pointSize = new InputSlider('point-size');
        this.variablePointSizeStrength =
            new InputSlider('variable-point-size-strength');
        this.variablePointSizeColumn =
            new Select('variable-point-size-column-select');

        this.colorMode = new Select('color-mode-select');
        this.colorMapping = new Select('color-mapping-select');
        this.colorColumn = new Select('color-column-select');
    }

    public applyPreset(preset: Preset): void {
        this.apply(this.axes[0], preset.axes[0]);
        this.apply(this.axes[1], preset.axes[1]);
        this.apply(this.axes[2], preset.axes[2]);

        this.apply(this.pointSize, preset.pointSize);
        this.apply(
            this.variablePointSizeStrength, preset.variablePointSizeStrength);
        this.apply(
            this.variablePointSizeColumn, preset.variablePointSizeColumn);

        this.apply(this.colorMode, preset.colorMode);
        this.apply(this.colorMapping, preset.colorMapping);
        this.apply(this.colorColumn, preset.colorColumn);
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
