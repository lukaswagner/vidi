import { Dict } from '../util/dict';
import { UiBase } from './base';

export class Select extends UiBase {
    public setOptions(ids: string[], labels?: string[]) {
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
    }

    public fromDict(options: Dict<any, any>) {
        this.setOptions(
            options.map((m) => m[0].toString()),
            options.map((m) => m[1].toString()),
        );
    }

    public get element(): HTMLSelectElement {
        return this._element as HTMLSelectElement;
    }

    public get value(): string {
        return this.element.value;
    }

    public set value(v: string) {
        this.element.value = v;
    }

    public set handler(f: (v: string) => void) {
        this._element.addEventListener('change', () => f(this.value));
    }
}
