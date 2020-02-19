import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import { Initializable, Canvas, auxiliaries, Wizard, Renderer, mat4 } from "webgl-operate";
import { TopicMapRenderer } from "./renderer";
import { Data } from './data';
import { Controls } from './controls';

export class TopicMapApp extends Initializable {

    private _canvas: Canvas;
    private _renderer: TopicMapRenderer;
    private _controls: Controls;
    private _data: Data;

    initialize(element: HTMLCanvasElement | string): boolean {
        this._canvas = new Canvas(element,);
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new TopicMapRenderer();
        this._canvas.renderer = this._renderer;

        this.initControls();
        this.fetchAvailable();

        return true;
    }

    initControls(): void {
        this._controls = new Controls();

        // data
        this._controls.data.handler = this.load.bind(this);

        // point size
        this._controls.pointSize.handler = (v: number) => {
            this._renderer.pointSize = v;
        };

        const pointSizeDefault = 0.02;
        const pointSizeMin = 0.01;
        const pointSizeMax = 0.5;
        const pointSizeStep = 0.001;

        this._renderer.pointSize = Number(pointSizeDefault);
        this._controls.pointSize.setOptions(
            pointSizeDefault, pointSizeMin, pointSizeMax, pointSizeStep);

        // scale
        const applyScale = (scale: number) => {
            this._renderer.model =
                mat4.fromScaling(mat4.create(), [scale, scale, scale]);
        };

        this._controls.scale.handler = applyScale.bind(this);

        const scaleDefault = 1.0;
        const scaleMin = 0.1;
        const scaleMax = 4.0;
        const scaleStep = 0.1;

        applyScale(scaleDefault);
        this._controls.scale.setOptions(
            scaleDefault, scaleMin, scaleMax, scaleStep);

        // x axis
        this._controls.xAxis.handler = this.updatePositions.bind(this);

        // y axis
        this._controls.yAxis.handler = this.updatePositions.bind(this);
    }

    fetchAvailable(): void {
        fetch('/ls').then((res) => {
            res.json().then((j) => {
                this._controls.data.setOptions(j as string[]);
                this.load(this._controls.data.value);
            });
        });
    }

    load(path: string): void {
        console.log('loading', path);
        fetch('data/' + path).then((r) => {
            r.text().then((csv) => {
                this.prepareData(csv);
            });
        });
    }

    prepareData(csv: string): void {
        this._data = new Data(csv);
        const columnNames = this._data.columnNames;
        this._controls.xAxis.setOptions(columnNames);
        this._controls.yAxis.setOptions(columnNames);
        this._controls.yAxis.element.selectedIndex = 1;
        this.updatePositions();
    }

    updatePositions() {
        const positions = this._data.getCoordinates(
            this._controls.xAxis.value,
            this._controls.yAxis.value,
            { min: -1, max: 1 });
        this._renderer.positions = positions;
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