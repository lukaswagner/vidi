export abstract class ControlBase<T> {
    protected _id: string;
    protected _element: HTMLElement;

    protected _value: T;
    protected _default: T;
    protected _handler: (v: T) => void;

    public constructor(id: string) {
        this._id = id;
        this._element = document.getElementById(this._id);
    }

    public setValue(v: T, invokeHandler = true): void {
        this._value = v;
        if (this._default === undefined) {
            this._default = v;
        }
        this.applyValue();
        if (invokeHandler && this._handler !== undefined) {
            this._handler(v);
        }
    }

    public setDefault(v: T): void {
        this._default = v;
    }

    public reset(invokeHandler = true): void {
        this.setValue(this._default, invokeHandler);
    }

    protected setHandler(f: (v: T) => void): void {
        this._handler = f;
    }

    public get value(): T {
        return this._value;
    }

    protected abstract applyValue(): void;
}
