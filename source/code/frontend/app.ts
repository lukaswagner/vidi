import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import { Initializable, Canvas, auxiliaries, Wizard, Renderer, mat4 } from "webgl-operate";
import { TopicMapRenderer } from "./renderer";
import { importPointsFromCSV } from "./csv";

export class TopicMapApp extends Initializable {

    private _canvas: Canvas;
    private _renderer: TopicMapRenderer;

    initialize(element: HTMLCanvasElement | string): boolean {

        const aa = auxiliaries.GETparameter('antialias');

        this._canvas = new Canvas(element, {
            antialias: aa === undefined ? true : JSON.parse(aa!),
        });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new TopicMapRenderer();
        this._canvas.renderer = this._renderer;

        this.initControls();

        return true;
    }

    initControls(): void {
        const dataSelect =
            document.getElementById('data-select') as HTMLSelectElement;
        dataSelect.addEventListener('change', () => {
            this.load(dataSelect.value);
        })

        fetch('/ls').then((res) => {
            res.json().then((j) => {
                j.forEach((s: string) => {
                    const o = document.createElement('option');
                    o.value = s;
                    o.text = s;
                    dataSelect.options.add(o);
                });
                this.load(dataSelect.value);
            });
        });

        const pointSizeInput =
            document.getElementById('point-size-input') as HTMLInputElement;
        const pointSizeRange =
            document.getElementById('point-size-range') as HTMLInputElement;
        pointSizeInput.addEventListener('input', () => {
            pointSizeRange.value = pointSizeInput.value;
            this._renderer.pointSize = Number(pointSizeInput.value);
        });
        pointSizeRange.addEventListener('input', () => {
            pointSizeInput.value = pointSizeRange.value;
            this._renderer.pointSize = Number(pointSizeRange.value);
        });

        const pointSizeDefault = '0.02';
        const pointSizeMin = '0.01';
        const pointSizeMax = '0.5';
        const pointSizeStep = '0.001';
        this._renderer.pointSize = Number(pointSizeDefault);
        pointSizeInput.value = pointSizeDefault;
        pointSizeRange.value = pointSizeDefault;
        pointSizeRange.min = pointSizeMin;
        pointSizeRange.max = pointSizeMax;
        pointSizeRange.step = pointSizeStep;

        const applyScale = (scaleString: string) => {
            const scale = Number(scaleString);
            this._renderer.model =
                mat4.fromScaling(mat4.create(), [scale, scale, scale]);
        };

        const scaleInput =
            document.getElementById('scale-input') as HTMLInputElement;
        const scaleRange =
            document.getElementById('scale-range') as HTMLInputElement;
        scaleInput.addEventListener('input', () => {
            scaleRange.value = scaleInput.value;
            applyScale(scaleInput.value);
        });
        scaleRange.addEventListener('input', () => {
            scaleInput.value = scaleRange.value;
            applyScale(scaleRange.value);
        });

        const scaleDefault = '1.0';
        const scaleMin = '0.1';
        const scaleMax = '4.0';
        const scaleStep = '0.1';
        applyScale(scaleDefault);
        scaleInput.value = scaleDefault;
        scaleRange.value = scaleDefault;
        scaleRange.min = scaleMin;
        scaleRange.max = scaleMax;
        scaleRange.step = scaleStep;
    }

    load(path: string): void {
        importPointsFromCSV(['data/' + path])
            .then(result => this._renderer.data = result);
    }

    uninitialize(): void {
        this._canvas.dispose();
        (this._renderer as Renderer).uninitialize();
    }


    get canvas(): Canvas {
        return this._canvas;
    }

    get renderer(): TopicMapRenderer {
        return this._renderer;
    }
}