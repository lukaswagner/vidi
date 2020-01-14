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

        const select =
            document.getElementById('input-file') as HTMLSelectElement;

        fetch('/ls').then((res) => {
            res.json().then((j) => {
                j.forEach((s: string) => {
                    const o = document.createElement('option');
                    o.value = s;
                    o.text = s;
                    select.options.add(o);
                });
                this.load(select.value);
            });
        });

        select.addEventListener('change', () => {
            this.load(select.value);
        });

        return true;
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