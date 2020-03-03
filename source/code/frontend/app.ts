import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import {
    Initializable,
    Canvas,
    Wizard,
    Renderer,
    viewer,
    Color
} from 'webgl-operate';

import { TopicMapRenderer } from './renderer';
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
        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber = 16;
        this._canvas.framePrecision = Wizard.Precision.half;

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
        for(let i = 0; i < this._controls.axes.length; i++) {
            this._controls.axes[i].handler = this.updatePositions.bind(this, i);
        }
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
        const ids = ['__NONE__'].concat(columnNames);
        const labels = ['None'].concat(columnNames);
        for(let i = 0; i < this._controls.axes.length; i++) {
            this._controls.axes[i].setOptions(ids, labels);
            this._controls.axes[i].element.value = this._data.selectedColumn(i);
        }
        this.updatePositions();
    }

    updatePositions(updatedAxis: number = -1) {
        if(updatedAxis > -1) {
            this._data.selectColumn(updatedAxis, this._controls.axes[updatedAxis].value);
        }
        const { positions, extents } = this._data.getCoordinates(
            [{ min: -2, max: 2 }, { min: -2, max: 2 }, { min: -2, max: 2 }]);
        this._renderer.positions = positions;
        this._renderer.grid = [
            { 
                name: this._data.selectedColumn(0),
                min: extents[0].min,
                max: extents[0].max,
                resolution: 0.25
            }, {
                name: this._data.selectedColumn(1),
                min: extents[1].min,
                max: extents[1].max,
                resolution: 0.25
            }
        ];
        this._renderer.updateGrid();
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