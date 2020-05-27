import {
    Column,
} from '../../../frontend/data/column';

export abstract class Loader {
    protected _delimiter = ',';
    protected _includesHeader = true;
    protected _size: number;
    protected _chunks: ArrayBuffer[];

    protected _data = new Array<Column>();

    protected _setProgressStepTotal: (index: number, total: number) => void;
    protected _progress: (index: number, a: number) => void;
    protected _setProgress: (index: number, a: number) => void;

    public abstract load(): Promise<Array<Column>>;

    public set delimiter(delimiter: string) {
        this._delimiter = delimiter;
    }

    public set includesHeader(includesHeader: boolean) {
        this._includesHeader = includesHeader;
    }

    public set size(size: number) {
        this._size = size;
    }

    public set chunks(chunks: ArrayBuffer[]) {
        this._chunks = chunks;
    }

    public set setProgressStepTotal(f: (index: number, total: number) => void) {
        this._setProgressStepTotal = f;
    }

    public set progress(f: (index: number, progress: number) => void) {
        this._progress = f;
    }

    public set setProgress(f: (index: number, progress: number) => void) {
        this._setProgress = f;
    }
}
