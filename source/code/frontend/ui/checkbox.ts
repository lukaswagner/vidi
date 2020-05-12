import { ControlBase } from './base';

export class Checkbox extends ControlBase<boolean> {

    public constructor(id: string) {
        super(id);
    }

    protected applyValue(): void {
        this.element.checked = this._value;
    }

    protected get element(): HTMLInputElement {
        return this._element as HTMLInputElement;
    }

    public set handler(f: (v: boolean) => void) {
        this.setHandler(f);
        this._element.addEventListener('change', () => f(this.element.checked));
    }
}
