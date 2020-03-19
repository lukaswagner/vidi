export class Button {
    protected _id: string;
    protected _element: HTMLButtonElement;

    public constructor(id: string) {
        this._id = id;
        this._element = document.getElementById(this._id) as HTMLButtonElement;
    }

    public set handler(f: () => void) {
        this._element.addEventListener('click', f);
    }
}
