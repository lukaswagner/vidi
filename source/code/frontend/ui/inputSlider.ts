import { UiBase } from "./base";

export class InputSlider extends UiBase {
    protected _sliderElement: HTMLInputElement;

    constructor(id: string) {
        super(id + '-input');
        this._sliderElement =
            document.getElementById(id + '-range') as HTMLInputElement;

        this._element.addEventListener('change',
            () => this._sliderElement.value = this.element.value);
        this._sliderElement.addEventListener('input',
            () => this.element.value = this._sliderElement.value);
    }

    get element(): HTMLInputElement {
        return this._element as HTMLInputElement;
    }

    get value(): number {
        return Number(this.element.value);
    }

    set handler(f: (v: number) => void) {
        this._element.addEventListener('change', () => f(this.value));
        this._sliderElement.addEventListener('input', () => f(this.value));
    }

    public setOptions(value: number, min: number, max: number, step: number) {
        this.element.value = value.toString();
        this._sliderElement.min = min.toString();
        this._sliderElement.max = max.toString();
        this._sliderElement.step = step.toString();
        this._sliderElement.value = value.toString();
    }
}
