import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import { Initializable, Canvas, auxiliaries, Wizard, Renderer, mat4, viewer, Color } from "webgl-operate";
import { TopicMapRenderer } from "./renderer";
import { Data } from './data';
import { Controls } from './controls';

export class TopicMapApp extends Initializable {

    private _canvas: Canvas;
    private _renderer: TopicMapRenderer;
    private _controls: Controls;
    private _data: Data;

    private static readonly POINT_SIZE_CONTROL = {
        default: 0.01,
        min: 0.001,
        max: 0.05,
        step: 0.001
    };

    private static readonly SCALE_CONTROL = {
        default: 2.0,
        min: 0.2,
        max: 10.0,
        step: 0.01
    };

    initialize(element: HTMLCanvasElement | string): boolean {
        this._canvas = new Canvas(element, {
            antialias: true,
            alpha: true,
        });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        const bgColor = window.getComputedStyle(document.body).backgroundColor;
        var bgComponents = /^rgb\((\d+), (\d+), (\d+)\)$/i.exec(bgColor);
        this._canvas.clearColor = new Color([
            Number(bgComponents[1]) / 255,
            Number(bgComponents[2]) / 255,
            Number(bgComponents[3]) / 255,
            1.0
        ]);

        this._renderer = new TopicMapRenderer();
        this._canvas.renderer = this._renderer;

        this._canvas.element.addEventListener('dblclick', () => {
            viewer.Fullscreen.toggle(this._canvas.element);
        });

        this._canvas.element.addEventListener('wheel', (e) => {
            const base = 1.15;
            const exp = -Math.sign(e.deltaY);
            this._controls.scale.value = Math.max(
                this._controls.scale.value * (base ** exp),
                this._controls.scale.step);
            this._renderer.scale = this._controls.scale.value;
            e.preventDefault();
        }, { capture: true });

        this.initControls();
        this.fetchAvailable();

        this._renderer.grid = [
            { min: -1, max: 1, steps: 10 },
            { min: -1, max: 1, steps: 10 }
        ];

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

        const psc = TopicMapApp.POINT_SIZE_CONTROL;
        this._renderer.pointSize = Number(psc.default);
        this._controls.pointSize.setOptions(
            psc.default, psc.min, psc.max, psc.step);

        // scale
        this._controls.scale.handler = (s) => {
            this._renderer.scale = s;
        };

        const sc = TopicMapApp.SCALE_CONTROL;
        this._renderer.scale = sc.default;
        this._controls.scale.setOptions(
            sc.default, sc.min, sc.max, sc.step);

        // axes
        this._controls.xAxis.handler = this.updatePositions.bind(this);
        this._controls.yAxis.handler = this.updatePositions.bind(this);
        this._controls.zAxis.handler = this.updatePositions.bind(this);
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
        const ids = ['__NOCOLUMN__'].concat(columnNames);
        const labels = ['None'].concat(columnNames);
        this._controls.xAxis.setOptions(ids, labels);
        this._controls.yAxis.setOptions(ids, labels);
        this._controls.zAxis.setOptions(ids, labels);
        this._controls.xAxis.element.selectedIndex = 1;
        this._controls.yAxis.element.selectedIndex = 2;
        this._controls.zAxis.element.selectedIndex = 0;
        this.updatePositions();
    }

    updatePositions() {
        const positions = this._data.getCoordinates(
            this._controls.xAxis.value,
            this._controls.yAxis.value,
            this._controls.zAxis.value,
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