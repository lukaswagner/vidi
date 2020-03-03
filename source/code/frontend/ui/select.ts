import { UiBase } from './base';

export class Select extends UiBase {
    get element(): HTMLSelectElement {
        return this._element as HTMLSelectElement;
    }

    get value(): string {
        return this.element.value;
    }

    set handler(f: (v: string) => void) {
        this._element.addEventListener('change', () => f(this.value));
    }

    public setOptions(ids: string[], labels?: string[]) {
        if(labels === undefined || labels.length != ids.length) {
            labels = ids;
        }

        const element = this.element;
        while(element.length > 0) {
            element.remove(0);
        }

        for(let i = 0; i < ids.length; i++) {
            const o = document.createElement('option');
            o.value = ids[i];
            o.text = labels[i];
            element.options.add(o);
        }
    }
}
