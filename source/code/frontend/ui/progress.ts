import { ControlBase } from './base';

export class ProgressStep {
    public name: string;
    public total: number;
    public progress = 0;
    public weight: number;

    public constructor(name: string, total: number, weight: number) {
        this.name = name;
        this.total = total;
        this.weight = weight;
    }
}

export class Progress extends ControlBase<void> {
    protected _backgroundElement: HTMLDivElement;
    protected _wrapperElement: HTMLDivElement;

    protected _steps: Array<ProgressStep>;
    protected _totalWeight: number;

    protected _printResolution = 20;
    protected _lastPrint = '';
    protected _frontElement: HTMLDivElement;
    protected _backTextElement: HTMLSpanElement;
    protected _frontTextElement: HTMLDivElement;

    public constructor(id: string) {
        super(id + '-bar');

        this._backgroundElement =
            document.getElementById(id) as HTMLDivElement;
        this._wrapperElement =
            document.getElementById(id + '-wrapper') as HTMLDivElement;
        this._frontElement =
            document.getElementById(id + '-bar-front') as HTMLDivElement;
        this._backTextElement =
            document.getElementById(id + '-bar-back-text') as HTMLSpanElement;
        this._frontTextElement =
            document.getElementById(id + '-bar-front-text') as HTMLDivElement;
    }

    public set steps(steps: Array<ProgressStep>) {
        this._steps = steps;
        this._totalWeight = this._steps
            .map((s) => s.weight)
            .reduce((prev, val) => prev + val);
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

    public print(ratio: number, percent: string): void {
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

    public applyValue(print = false): void {
        const { ratio, percent } = this.percent();
        (this._element as HTMLDivElement).style.width = percent + '%';
        this._frontElement.style.width = percent + '%';
        const stepName = this.currentStepName;
        this._backTextElement.innerHTML = stepName;
        this._frontTextElement.innerHTML = stepName;
        if(print) {
            this.print(ratio, percent);
        }
    }

    protected get currentStepName(): string {
        const step = this._steps.find((step) => step.progress < step.total);
        return step === undefined ? '' : step.name;
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
}
