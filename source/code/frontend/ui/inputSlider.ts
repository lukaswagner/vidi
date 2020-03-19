import { ControlBase } from './base';

export class InputSlider extends ControlBase<number> {
    protected _sliderElement: HTMLInputElement;
    protected _min: number;
    protected _max: number;
    protected _step: number;

    public constructor(id: string) {
        super(id + '-input');
        this._sliderElement =
            document.getElementById(id + '-range') as HTMLInputElement;

        this._element.addEventListener('change', () => {
            this._sliderElement.value = this.element.value;
            this._value = Number(this.element.value);
        });
        this._sliderElement.addEventListener('input', () => {
            this.element.value = this._sliderElement.value;
            this._value = Number(this._sliderElement.value);
        });
    }

    public setOptions(
        value: number, min: number, max: number, step: number,
        invokeHandler = true
    ): void {
        this.element.value = value.toString();
        this._sliderElement.min = min.toString();
        this._sliderElement.max = max.toString();
        this._sliderElement.step = step.toString();
        this._sliderElement.value = value.toString();
        this._min = min;
        this._max = max;
        this._step = step;
        this.setValue(value, invokeHandler);
    }

    protected applyValue(): void {
        const asString = this.formatValue(this._value);
        this.element.value = asString;
        this._sliderElement.value = asString;
    }

    private formatValue(v: number): string {
        v = Math.max(Math.min(v, this._max), this._min);
        const remainder = v % this._step;
        const rounded = (remainder > this._step / 2) ?
            v - remainder + this._step :
            v - remainder;
        const magnitude = -Math.log10(this._step);
        return rounded.toFixed(magnitude);
    }

    protected get element(): HTMLInputElement {
        return this._element as HTMLInputElement;
    }

    public set handler(f: (v: number) => void) {
        this.setHandler(f);
        this._element.addEventListener('change', () => f(this.value));
        this._sliderElement.addEventListener('input', () => f(this.value));
    }

    public get step(): number {
        return this._step;
    }
}
