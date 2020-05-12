import { ControlBase } from './base';

export class Input extends ControlBase<string> {

    public constructor(id: string) {
        super(id);
    }

    protected applyValue(): void {
        const asString = this._value.toString();
        this.element.value = asString;
    }

    protected get element(): HTMLInputElement {
        return this._element as HTMLInputElement;
    }

    public set handler(f: (v: string) => void) {
        this.setHandler(f);
        this._element.addEventListener('change', () => f(this.value));
    }
}
