import { Select } from "./ui/select";
import { InputSlider } from "./ui/inputSlider";

export class Controls {
    public data: Select;
    public pointSize: InputSlider;
    public scale: InputSlider;
    public xAxis: Select;
    public yAxis: Select;
    public zAxis: Select;

    constructor() {
        this.data = new Select('data-select');
        this.pointSize = new InputSlider('point-size');
        this.scale = new InputSlider('scale');
        this.xAxis = new Select('x-axis');
        this.yAxis = new Select('y-axis');
        this.zAxis = new Select('z-axis');
    }
}
