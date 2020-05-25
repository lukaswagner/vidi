import { ControlBase } from './base';

export class ProgressStep {
    public total: number;
    public progress = 0;
    public weight: number;

    public constructor(total: number, weight: number) {
        this.total = total;
        this.weight = weight;
    }
}

export class Progress extends ControlBase<void> {
    protected _backgroundElement: HTMLDivElement;
    protected _wrapperElement: HTMLDivElement;

    protected _steps: Array<ProgressStep>;
    protected _totalWeight: number;
    protected _currentStep = 0;

    protected _printResolution = 20;
    protected _lastPrint = '';

    public constructor(id: string) {
        super(id + '-bar');

        this._backgroundElement =
            document.getElementById(id) as HTMLDivElement;
        this._wrapperElement =
            document.getElementById(id + '-wrapper') as HTMLDivElement;
    }

    public set steps(steps: Array<ProgressStep>) {
        this._steps = steps;
        this._totalWeight = this._steps
            .map((s) => s.weight)
            .reduce((prev, val) => prev + val);
        this._currentStep = 0;
    }

    public get steps(): Array<ProgressStep> {
        return this._steps;
    }

    public set visible(visible: boolean) {
        if (visible) {
            this._wrapperElement.classList.remove('d-none');
        } else {
            this._wrapperElement.classList.add('d-none');
        }
    }

    public progress(amount = 1): void {
        const current = this._steps[this._currentStep];
        current.progress += amount;
        if (current.progress >= current.total) {
            this._currentStep++;
        }
        this.applyValue();
        this.print();
    }

    public print(): void {
        const { ratio, percent } = this.percent();
        if (percent === this._lastPrint) {
            return;
        }
        this._lastPrint = percent;

        const completedChars =
            Math.round(ratio * this._printResolution);
        const completed = '#'.repeat(completedChars);
        const remaining = '.'.repeat(this._printResolution - completedChars);
        console.log(
            `[${completed}${remaining}] ${percent}%`);
    }

    protected percent(): { ratio: number; percent: string } {
        const completedRatio = this._steps
            .map((s) => s.progress / s.total * s.weight / this._totalWeight)
            .reduce((prev, val) => prev + val);
        return {
            ratio: completedRatio,
            percent: (completedRatio * 100).toFixed(0)
        };
    }

    protected applyValue(): void {
        const { percent } = this.percent();
        (this._element as HTMLDivElement).style.width = percent + '%';
    }
}
