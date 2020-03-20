export class File {
    protected _id: string;
    protected _element: HTMLInputElement;

    public constructor(id: string) {
        this._id = id;
        this._element =
            document.getElementById(this._id + '-file') as HTMLInputElement;
    }

    public set handler(f: (files: FileList) => void) {
        this._element.addEventListener('change', () => f(this._element.files));
    }
}
