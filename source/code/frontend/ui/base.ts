export class UiBase {
    protected _id: string;
    protected _element: HTMLElement;

    constructor(id: string) {
        this._id = id;
        this._element = document.getElementById(this._id);
    }
}