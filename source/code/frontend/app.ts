import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import { Initializable, Canvas, auxiliaries, Wizard, Renderer } from "webgl-operate";
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


        const input = document.getElementById('input-file')! as HTMLInputElement;
        // const label = document.getElementById('label-file')! as HTMLLabelElement;
        input.addEventListener('change', () => {
            const progress = document.getElementById('progress-file')! as HTMLProgressElement;
            importPointsFromCSV(input.files!, progress).then(result => this._renderer.data = result);
        });

        return true;
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