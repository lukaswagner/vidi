export class ProgressStep {
    public total: number;
    public progress = 0;
    public weight: number;

    public constructor(total: number, weight: number) {
        this.total = total;
        this.weight = weight;
    }
}

export class Progress {
    protected _steps: Array<ProgressStep>;
    protected _totalWeight: number;
    protected _printResolution = 20;
    protected _currentStep = 0;
    protected _lastPrint = '';

    public constructor(steps: Array<ProgressStep>) {
        this._steps = steps;
        this._totalWeight = this._steps
            .map((s) => s.weight)
            .reduce((prev, val) => prev + val);
    }

    public progress(amount = 1, print = false): void {
        const current = this._steps[this._currentStep];
        current.progress += amount;
        if(current.progress >= current.total) {
            this._currentStep++;
        }
        if(print) {
            this.print();
        }
    }

    public print(): void {
        const completedRatio = this._steps
            .map((s) => s.progress / s.total * s.weight / this._totalWeight)
            .reduce((prev, val) => prev + val);

        const percent = (completedRatio * 100).toFixed(1);
        if(percent === this._lastPrint) {
            return;
        }
        this._lastPrint = percent;

        const completedChars =
            Math.round(completedRatio * this._printResolution);
        const completed = '#'.repeat(completedChars);
        const remaining = '.'.repeat(this._printResolution - completedChars);
        console.log(
            `[${completed}${remaining}] ${percent}%`);
    }
}
