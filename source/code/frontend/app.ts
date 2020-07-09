import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './icons.ts';

import {
    Canvas,
    Color,
    Initializable,
    Wizard,
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
    Controls,
    Preset
} from './controls';

import {
    CsvLoadOptions,
    LoadInfo
} from './loader/csvLoadOptions';

import {
    DataType,
    rebuildColumn,
} from './data/column';

import { CsvMultiThreadedLoader } from './loader/csvMultiThreadedLoader';
import { Data } from './data/data';
import { GridHelper } from './grid/gridHelper';
import { TopicMapRenderer } from './renderer';

export class TopicMapApp extends Initializable {
    private static readonly POINT_SIZE_CONTROL = {
        default: 0.01,
        min: 0.001,
        max: 0.05,
        step: 0.001
    };

    private static readonly SCALE_CONTROL = {
        default: 1.5,
        min: 0.2,
        max: 10.0,
        step: 0.01
    };

    private static readonly VARIABLE_POINT_SIZE_CONTROL = {
        default: 0,
        min: 0,
        max: 1,
        step: 0.01
    };

    private _canvas: Canvas;
    private _renderer: TopicMapRenderer;
    private _controls: Controls;
    private _datasets: { name: string; path: string; size: number }[];
    private _data: Data;

    public initialize(element: HTMLCanvasElement | string): boolean {
        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber = 8;
        this._canvas.framePrecision = Wizard.Precision.half;

        const bgColor = window.getComputedStyle(document.body).backgroundColor;
        const bgComponents = /^rgb\((\d+), (\d+), (\d+)\)$/i.exec(bgColor);
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
            this._controls.scale.setValue(
                Math.max(
                    this._controls.scale.value * (base ** exp),
                    this._controls.scale.step
                )
            );
        }, { capture: true, passive: true });

        this.initControls();
        this.fetchAvailable();
        this.fetchPresets();

        return true;
    }

    public uninitialize(): void {
        this._canvas.dispose();
        this._renderer.uninitialize();
    }

    protected initControls(): void {
        this._controls = new Controls();

        // data
        this._controls.dataButton.handler = () => {
            this.load(this._controls.data.value);
        };

        // custom data
        this._controls.customDataSourceSelect.setOptions(['File', 'URL']);
        this._controls.customDataSourceSelect.handler = (v: string) => {
            switch (v) {
                case 'File':
                    document.getElementById('custom-data-file-wrapper')
                        .classList.remove('d-none');
                    document.getElementById('custom-data-url-wrapper')
                        .classList.add('d-none');
                    break;
                case 'URL':
                    document.getElementById('custom-data-file-wrapper')
                        .classList.add('d-none');
                    document.getElementById('custom-data-url-wrapper')
                        .classList.remove('d-none');
                    break;
                default:
                    break;
            }
        };

        this._controls.customDataDelimiterSelect.setOptions(
            [',', '\t', 'custom'], ['Comma', 'Tab', 'Custom']);
        this._controls.customDataIncludesHeader.setValue(true);
        this._controls.customDataIncludesHeader.setDefault(true);
        this._controls.customDataUploadButton.handler =
            this.loadCustom.bind(this);

        // point size
        this._controls.pointSize.handler = (v: number) => {
            this._renderer.pointSize = v;
        };

        const psc = TopicMapApp.POINT_SIZE_CONTROL;
        this._controls.pointSize.setOptions(
            psc.default, psc.min, psc.max, psc.step);

        // scale
        this._controls.scale.handler = (s) => {
            this._renderer.scale = s;
        };

        const sc = TopicMapApp.SCALE_CONTROL;
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
        this._controls.colorMode.setValue(ColorModeDefault.toString());
        this._controls.colorMode.setDefault(ColorModeDefault.toString());

        this._controls.colorMapping.handler = (m) => {
            this._renderer.colorMapping = Number(m);
        };

        this._controls.colorMapping.fromDict(ColorMapping);
        this._controls.colorMapping.setDefault(ColorMappingDefault.toString());
        this._controls.colorMapping.setValue(ColorMappingDefault.toString());

        this._controls.colorColumn.handler = this.updateColors.bind(this);

        // variable point size
        this._controls.variablePointSizeStrength.handler = (v: number) => {
            this._renderer.variablePointSizeStrength = v;
        };

        const vsc = TopicMapApp.VARIABLE_POINT_SIZE_CONTROL;
        this._controls.variablePointSizeStrength.setOptions(
            vsc.default, vsc.min, vsc.max, vsc.step);

        this._controls.variablePointSizeColumn.handler =
            this.updateVariablePointSize.bind(this);
    }

    protected fetchAvailable(): void {
        fetch('/ls').then((res) => {
            res.json().then((j) => {
                this._datasets = j;
                this._controls.data.setOptions(
                    this._datasets.map((d) => d.name));
                this.load(this._controls.data.value);
            });
        });
    }

    protected fetchPresets(): void {
        fetch('/data/presets.json').then((res) => {
            res.json().then((presets: Preset[]) => {
                this._controls.presetButton.handler = () => {
                    const selected = this._controls.presets.value;
                    const preset = presets.find((p) => p.name === selected);
                    if (preset.data !== undefined) {
                        this._controls.data.setValue(preset.data, false);
                        this.load(preset.data).then(() => {
                            this._controls.applyPreset(preset);
                        });
                    } else {
                        this._controls.applyPreset(preset);
                    }
                };

                this._controls.presets.setOptions(presets.map((p) => p.name));
            });
        });
    }

    protected load(name: string): Promise<void> {
        const file = this._datasets.find((d) => d.name === name);
        if (file === undefined) {
            console.log('can\'t load', name, '- file unknown');
            return;
        }
        console.log('loading', name, 'from', file.path);

        fetch(file.path).then((res) => {
            this.loadCsv({
                stream: res.body,
                size: file.size,
                options: {
                    delimiter: ',',
                    includesHeader: true
                },
                progress: this._controls.dataProgress
            });
        });
    }

    protected loadCustom(): void {
        switch (this._controls.customDataSourceSelect.value) {
            case 'File':
                this. loadCustomFromFile();
                break;
            case 'URL':
                this. loadCustomFromUrl();
                break;
            default:
                break;
        }
    }

    protected loadCustomFromFile(): void {
        const file = this._controls.customDataFile.files[0];
        let delimiter = this._controls.customDataDelimiterSelect.value;
        if (delimiter === 'custom') {
            delimiter = this._controls.customDataDelimiterInput.value;
        }
        const includesHeader = this._controls.customDataIncludesHeader.value;
        console.log('loading custom file', file.name);

        this.loadCsv({
            stream: file.stream(),
            size: file.size,
            options: {
                delimiter,
                includesHeader
            },
            progress: this._controls.customDataProgress
        });
    }
    protected loadCustomFromUrl(): void {
        const url = this._controls.customDataUrlInput.value;
        const user = this._controls.customDataUrlUserInput.value;
        const pass = this._controls.customDataUrlPassInput.value;

        const headers = new Headers();
        if(user !== '' && pass !== '') {
            headers.set(
                'Authorization',
                'Basic ' + btoa(user + ':' + pass));
        }

        let delimiter = this._controls.customDataDelimiterSelect.value;
        if (delimiter === 'custom') {
            delimiter = this._controls.customDataDelimiterInput.value;
        }
        const includesHeader = this._controls.customDataIncludesHeader.value;

        console.log('loading from url', url);

        fetch(url, { headers }).then((res) => {
            this.loadCsv({
                stream: res.body,
                options: {
                    delimiter,
                    includesHeader
                },
                progress: this._controls.customDataProgress
            });
        });
    }

    protected loadCsv(info: LoadInfo<CsvLoadOptions>): void {
        const start = Date.now();
        // const loader = new CsvSingleThreadedLoader(info);
        const loader = new CsvMultiThreadedLoader(info);
        loader.load().then((res) => {
            const end = Date.now();
            console.log(`loaded ${res.length} columns with ${rebuildColumn(res[0]).length} rows in ${end - start} ms`);
            this.dataReady(res);
        });
    }

    protected dataReady(passedData: Array<unknown>): void {
        // functions are removed during message serialization
        // this means the objects have to be rebuild
        const columns = passedData.map((c) => rebuildColumn(c));

        this._data = new Data(columns);

        // set up axis controls
        const numberColumnNames = this._data.getColumnNames(DataType.Float);
        const numberIds = ['__NONE__'].concat(numberColumnNames);
        const numberLabels = ['None'].concat(numberColumnNames);
        for (let i = 0; i < this._controls.axes.length; i++) {
            this._controls.axes[i].setOptions(
                numberIds, numberLabels, false);
            this._controls.axes[i].setValue(
                this._data.selectedColumn(i), false);
        }
        this.updatePositions();

        // set up vertex color controls
        const colorColumnNames = this._data.getColumnNames(DataType.Color);
        const colorIds = ['__NONE__'].concat(colorColumnNames);
        const colorLabels = ['None'].concat(colorColumnNames);
        this._controls.colorColumn.setOptions(colorIds, colorLabels);

        // set up variable point size controls
        this._controls.variablePointSizeColumn.setOptions(
            numberIds, numberLabels);
    }

    protected updatePositions(updatedAxis = -1): void {
        if (updatedAxis > -1) {
            this._data.selectColumn(
                updatedAxis, this._controls.axes[updatedAxis].value);
        }
        const { positions, extents } = this._data.getCoordinates(
            [{ min: -1, max: 1 }, { min: -1, max: 1 }, { min: -1, max: 1 }]);
        this._renderer.positions = positions;
        const subdivisions = 12;
        this._renderer.grid = GridHelper.buildGrid(
            [0, 1, 2].map((i) => this._data.selectedColumn(i)),
            extents,
            subdivisions,
            false
        );
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

const m = module as any;
if(m.hot !== undefined) {
    m.hot.decline();
}
