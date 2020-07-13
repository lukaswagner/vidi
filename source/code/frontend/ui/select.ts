import { ControlBase } from './base';
import { Dict } from '../util/dict';

export class Select extends ControlBase<string> {
    public constructor(id: string) {
        super(id);
        this._element.addEventListener('change', () => {
            this._value = this.element.value;
        });
    }

    public setOptions(
        ids: string[], labels?: string[], invokeHandler = true
    ): void {
        if (labels === undefined || labels.length != ids.length) {
            labels = ids;
        }

        const element = this.element;
        while (element.length > 0) {
            element.remove(0);
        }

        for (let i = 0; i < ids.length; i++) {
            const o = document.createElement('option');
            o.value = ids[i];
            o.text = labels[i];
            element.options.add(o);
        }

        this.setValue(ids[0], invokeHandler);
    }

    public fromDict(
        options: Dict<unknown, unknown>, invokeHandler = true
    ): void {
        this.setOptions(
            options.map((m) => m[0].toString()),
            options.map((m) => m[1].toString()),
            invokeHandler
        );
    }

    protected applyValue(): void {
        this.element.value = this._value;
    }

    protected get element(): HTMLSelectElement {
        return this._element as HTMLSelectElement;
    }

    public set handler(f: (v: string) => void) {
        this.setHandler(f);
        this._element.addEventListener('change', () => f(this.value));
    }

    public get selectedIndex(): number {
        return (this._element as HTMLSelectElement).selectedIndex;
    }
}
