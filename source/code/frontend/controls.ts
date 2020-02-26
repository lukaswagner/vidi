import { Select } from "./ui/select";
import { InputSlider } from "./ui/inputSlider";

export class Controls {
    public data: Select;
    public pointSize: InputSlider;
    public scale: InputSlider;
    public axes: Select[];

    constructor() {
        this.data = new Select('data-select');
        this.pointSize = new InputSlider('point-size');
        this.scale = new InputSlider('scale');
        this.axes = [
            new Select('x-axis'),
            new Select('y-axis'),
            new Select('z-axis')
        ];
    }
}
