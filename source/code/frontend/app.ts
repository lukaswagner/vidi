import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import {
    Canvas,
    Color,
    Initializable,
    Wizard,
    vec3,
    viewer
} from 'webgl-operate';

import {
    ColorMapping,
    ColorMappingDefault
} from './points/colorMapping';

import {
    ColorMode,
    ColorModeDefault
} from './points/colorMode';

import {
    Data,
    DataType
} from './data';

import { Controls } from './controls';
import { TopicMapRenderer } from './renderer';

export class TopicMapApp extends Initializable {
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

    private static readonly VARIABLE_POINT_SIZE_CONTROL = {
        default: 0,
        min: 0,
        max: 2,
        step: 0.01
    };

    private _canvas: Canvas;
    private _renderer: TopicMapRenderer;
    private _controls: Controls;
    private _data: Data;

    public initialize(element: HTMLCanvasElement | string): boolean {
        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber = 8;
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

    public uninitialize(): void {
        this._canvas.dispose();
        this._renderer.uninitialize();
    }

    protected initControls(): void {
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
        for (let i = 0; i < this._controls.axes.length; i++) {
            this._controls.axes[i].handler = this.updatePositions.bind(this, i);
        }

        // colors
        this._controls.colorMode.handler = (m) => {
            this._renderer.colorMode = Number(m);
        };

        this._controls.colorMode.fromDict(ColorMode);
        this._renderer.colorMode = ColorModeDefault;
        this._controls.colorMode.value = ColorModeDefault.toString();

        this._controls.colorMapping.handler = (m) => {
            this._renderer.colorMapping = Number(m);
        };

        this._controls.colorMapping.fromDict(ColorMapping);
        this._renderer.colorMapping = ColorMappingDefault;
        this._controls.colorMapping.value = ColorMappingDefault.toString();

        this._controls.colorColumn.handler = this.updateColors.bind(this);

        // variable point size
        this._controls.variablePointSizeStrength.handler = (v: number) => {
            this._renderer.variablePointSizeStrength = v;
        };

        const vsc = TopicMapApp.VARIABLE_POINT_SIZE_CONTROL;
        this._renderer.variablePointSizeStrength = Number(vsc.default);
        this._controls.variablePointSizeStrength.setOptions(
            vsc.default, vsc.min, vsc.max, vsc.step);

        this._controls.variablePointSizeColumn.handler =
            this.updateVariablePointSize.bind(this);
    }

    protected fetchAvailable(): void {
        fetch('/ls').then((res) => {
            res.json().then((j) => {
                this._controls.data.setOptions(j as string[]);
                this.load(this._controls.data.value);
            });
        });
    }

    protected load(path: string): void {
        console.log('loading', path);
        fetch('data/' + path).then((r) => {
            r.text().then((csv) => {
                this.prepareData(csv);
            });
        });
    }

    protected prepareData(csv: string): void {
        this._data = new Data(csv);

        // set up axis controls
        const numberColumnNames = this._data.getColumnNames(DataType.Number);
        const numberIds = ['__NONE__'].concat(numberColumnNames);
        const numberLabels = ['None'].concat(numberColumnNames);
        for (let i = 0; i < this._controls.axes.length; i++) {
            this._controls.axes[i].setOptions(numberIds, numberLabels);
            this._controls.axes[i].element.value = this._data.selectedColumn(i);
        }
        this.updatePositions();

        // set up vertex color controls
        const colorColumnNames = this._data.getColumnNames(DataType.Color);
        const colorIds = ['__NONE__'].concat(colorColumnNames);
        const colorLabels = ['None'].concat(colorColumnNames);
        this._controls.colorColumn.setOptions(colorIds, colorLabels);
        this._controls.colorColumn.element.value = colorIds[0];
        this.updateColors(colorIds[0]);

        // set up variable point size controls
        this._controls.variablePointSizeColumn.setOptions(
            numberIds, numberLabels);
        this._controls.variablePointSizeColumn.element.value = numberIds[0];
        this.updateVariablePointSize(numberIds[0]);
    }

    protected updatePositions(updatedAxis: number = -1): void {
        if (updatedAxis > -1) {
            this._data.selectColumn(
                updatedAxis, this._controls.axes[updatedAxis].value);
        }
        const { positions, extents } = this._data.getCoordinates(
            [{ min: -2, max: 2 }, { min: -2, max: 2 }, { min: -2, max: 2 }]);
        this._renderer.positions = positions;
        this._renderer.grid = [
            {
                firstAxis: {
                    name: this._data.selectedColumn(0),
                    direction: vec3.fromValues(1, 0, 0),
                    extents: extents[0],
                    subdivisions: 20
                },
                secondAxis: {
                    name: this._data.selectedColumn(1),
                    direction: vec3.fromValues(0, 0, 1),
                    extents: extents[1],
                    subdivisions: 20
                },
                normal: vec3.fromValues(0, 1, 0),
                position: 0
            }
        ];
        this._renderer.updateGrid();
    }

    protected updateColors(colorAxis: string): void {
        this._renderer.vertexColors = this._data.getColors(colorAxis);
    }

    protected updateVariablePointSize(sizeAxis: string): void {
        this._renderer.variablePointSize =
            this._data.getVariablePointSize(sizeAxis);
    }
}