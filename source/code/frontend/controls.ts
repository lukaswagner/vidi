import { InputSlider } from './ui/inputSlider';
import { Select } from './ui/select';

export class Controls {
    public data: Select;
    public pointSize: InputSlider;
    public scale: InputSlider;
    public axes: Select[];
    public colorMode: Select;
    public colorMapping: Select;
    public colorColumn: Select;

    public constructor() {
        this.data = new Select('data-select');
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
    }
}
