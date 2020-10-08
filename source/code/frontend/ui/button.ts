export class Button {
    protected _id: string;
    protected _element: HTMLButtonElement;
    protected _handler: () => void;

    public constructor(id: string) {
        this._id = id;
        this._element = document.getElementById(this._id) as HTMLButtonElement;
    }

    public invoke(): void {
        this._handler();
    }

    public set handler(f: () => void) {
        this._handler = f;
        this._element.addEventListener('click', f);
    }
}
