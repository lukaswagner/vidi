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
