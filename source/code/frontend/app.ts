import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './icons.ts';

import {
    Canvas,
    Color,
    Context,
    Controller,
    Initializable,
    Wizard,
    viewer,
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
    ColumnUsage,
    Columns
} from './data/columns';

import {
    Controls,
    Preset
} from './controls';

import {
    Dataset,
    fetchAvailable,
    fetchPresets
} from './util/api';

import {
    deductSeparator,
    loadCustom,
    loadFromServer
} from './util/load';

import { Clustering } from './clustering/clustering';
import { Column } from 'shared/column/column';
import { DataType } from 'shared/column/dataType';
import { GridExtents } from './grid/gridInfo';
import { TopicMapRenderer } from './renderer';
import { NumberRangeInput, SelectInput } from '@lukaswagner/web-ui';

// for exposing canvas, controller, context, and renderer
declare global {
    interface Window {
        canvas: Canvas
        context: Context
        controller: Controller
        renderer: TopicMapRenderer
    }
}

export class TopicMapApp extends Initializable {
    private static readonly POINT_SIZE_CONTROL = {
        default: 0.01,
        min: 0.001,
        max: 0.05,
        step: 0.001
    };

    private static readonly SCALE_CONTROL = {
        value: 1.5,
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
    private _datasets: Dataset[];
    private _presets: Preset[];
    private _columns: Columns;
    private _clustering: Clustering;

    public initialize(element: HTMLCanvasElement | string): boolean {
        console.log('version:', COMMIT);

        this._canvas = new Canvas(element, { antialias: false });

        if (!this._canvas.context.isWebGL2) {
            alert('WebGL 2 is required but not supported!');
        }

        this._canvas.controller.multiFrameNumber = 32;
        this._canvas.framePrecision = Wizard.Precision.byte;

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

        this.initControls();

        // expose canvas, context, and renderer for console access
        window.canvas = this._canvas;
        window.context = this._canvas.context;
        window.controller = this._canvas.controller;
        window.renderer = this._renderer;

        return true;
    }

    public uninitialize(): void {
        this._canvas.dispose();
        this._renderer.uninitialize();
    }

    protected handleDataUpdate(): void {
        this._renderer.updateData();
    }

    protected initControls(): void {
        this._controls = new Controls();

        // presets
        const presetSelect = this._controls.presets.input.select({
            label: 'Presets'
        });

        const load = (data: Dataset): Promise<Column[]> => {
            return loadFromServer(
                data.url,
                data.format,
                dataProgress,
                this.handleDataUpdate.bind(this));
        };

        const applyPreset = (): void => {
            const preset = this._presets
                .find((p) => p.name === presetSelect.value);
            if(!preset) return;
            const data = this._datasets.find((d) => d.id === preset.data);
            if (!preset.data || !data) {
                this._controls.applyPreset(preset);
            } else {
                dataSelect.value = preset.data;
                load(data).then((d) => {
                    this.dataReady(d);
                    this._controls.applyPreset(preset);
                });
            }
        };

        this._controls.presets.input.button({
            text: 'Load',
            handler: (): void => applyPreset()
        });

        // data
        const dataSelect = this._controls.data.input.select({
            label: 'Dataset'
        });

        fetchAvailable()
            .then((datasets: Dataset[]) => {
                this._datasets = datasets;
                dataSelect.values = datasets.map((d) => d.id);
                return fetchPresets();
            })
            .then((presets: Preset[]) => {
                this._presets = presets;
                presetSelect.values = presets.map((p) => p.name);
                applyPreset();
            });

        this._controls.data.input.button({
            text: 'Load',
            handler: () => {
                const data = this._datasets[dataSelect.index];
                load(data).then((d) => this.dataReady(d));
            }
        });

        const dataProgress = this._controls.data.output.progress();

        // custom data
        // const customSource = this._controls.data.input.select({
        //     label: 'Custom dataset source',
        //     optionValues: ['File', 'URL']
        // });
        this._controls.data.input.file({
            label: 'Custom dataset',
            handler: (v) => {
                const splitName = v[0].name.split('.');
                const format = splitName[splitName.length - 1];
                const delimiter = deductSeparator(format) || 'custom';
                delimSelect.value = delimiter;
            }
        });

        const delimSelect = this._controls.data.input.select({
            label: 'Delimiter',
            optionValues: [',', '\t', 'custom'],
            optionTexts: ['Comma', 'Tab', 'Custom']
        });

        const delimInput = this._controls.data.input.text({
            label: 'Custom delimiter'
        });

        const headerCheckbox = this._controls.data.input.checkbox({
            label: 'File includes header row',
            value: true
        });

        this._controls.data.input.button({
            text: 'Load',
            handler: () => {
                loadCustom(
                    'file', // disable external url support for now
                    this._controls,
                    this.handleDataUpdate.bind(this)
                ).then((d) => this.dataReady(d));
            }
        });

        // position
        this._controls.position.input.select({
            id: 'x-axis',
            label: 'X axis',
            handler: (v) => this.updateColumn(ColumnUsage.X_AXIS, v.value)
        });
        this._controls.position.input.select({
            id: 'y-axis',
            label: 'Y axis',
            handler: (v) => this.updateColumn(ColumnUsage.Y_AXIS, v.value)
        });
        this._controls.position.input.select({
            id: 'z-axis',
            label: 'Z axis',
            handler: (v) => this.updateColumn(ColumnUsage.Z_AXIS, v.value)
        });

        // clustering
        this._controls.clusterAllButton.handler = () => {
            this._clustering.runWorkers();
            this._controls.colorMode.setValue(ColorMode[3][0].toString());
        };
        this._controls.clusterAlgSelect.addOption('__NONE__', 'None');
        this._controls.clusterAlgSelect.handler = (name) => {
            this._renderer.selectClusterData(name);
            this.updateColumn(ColumnUsage.CLUSTER_ID, name);
        };

        // scale
        const scale = this._controls.size.input.numberRange(Object.assign({
            handler: (s: number) => this._renderer.scale = s
        }, TopicMapApp.SCALE_CONTROL));

        this._canvas.element.addEventListener('wheel', (e) => {
            const base = 1.15;
            const exp = -Math.sign(e.deltaY);
            scale.value = Math.max(scale.value * (base ** exp), scale.step);
        }, { capture: true, passive: true });

        // point size
        this._controls.pointSize.handler = (v: number) => {
            this._renderer.pointSize = v;
        };

        const psc = TopicMapApp.POINT_SIZE_CONTROL;
        this._controls.pointSize.setOptions(
            psc.default, psc.min, psc.max, psc.step);

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

        this._controls.colorColumn.handler =
            this.updateColumn.bind(this, ColumnUsage.PER_POINT_COLOR);

        // variable point size
        this._controls.variablePointSizeStrength.handler = (v: number) => {
            this._renderer.variablePointSizeStrength = v;
        };

        const vsc = TopicMapApp.VARIABLE_POINT_SIZE_CONTROL;
        this._controls.variablePointSizeStrength.setOptions(
            vsc.default, vsc.min, vsc.max, vsc.step);

        this._controls.variablePointSizeColumn.handler =
            this.updateColumn.bind(this, ColumnUsage.VARIABLE_POINT_SIZE);
    }

    protected getId(column: Column): string {
        return column ?.name ?? '__NONE__';
    }

    protected dataReady(columns: Column[]): void {
        this._columns = new Columns(columns);
        this.initColumns();

        this._controls.clusterAlgSelect.reset();
        this._controls.colorMode.reset();
        this._clustering = new Clustering();
        this._clustering.initialize(this._columns);
        this._columns.addColumns(this._clustering.getOutputs());
        this._clustering.clusterInfoHandler = (name, clusters) => {
            this._renderer.setClusterData(name, clusters);
            if(!this._controls.clusterAlgSelect.hasOption(name)) {
                this._controls.clusterAlgSelect.addOption(name);
            } else {
                this._controls.clusterAlgSelect.setValue(name);
            }
        };

        // set up axis controls
        const numberColumnNames = this._columns.getColumnNames(DataType.Number);
        const numberIds = ['__NONE__'].concat(numberColumnNames);
        const numberLabels = ['None'].concat(numberColumnNames);
        for (let i = 0; i < this._controls.axes.length; i++) {
            this._controls.axes[i].setOptions(
                numberIds, numberLabels, false);
            this._controls.axes[i].setValue(
                this.getId(this._columns.selectedColumn(i)), false);
        }

        // set up vertex color controls
        const colorColumnNames = this._columns.getColumnNames(DataType.Color);
        const colorIds = ['__NONE__'].concat(colorColumnNames);
        const colorLabels = ['None'].concat(colorColumnNames);
        this._controls.colorColumn.setOptions(colorIds, colorLabels, false);

        // set up variable point size controls
        this._controls.variablePointSizeColumn.setOptions(
            numberIds, numberLabels, false);
    }

    protected updateColumn(updatedColumn: ColumnUsage, name: string): void {
        this._columns.selectColumn(updatedColumn, name);
        this._renderer.setColumn(
            updatedColumn,
            this._columns.selectedColumn(updatedColumn));
        this.updateGrid();
    }

    protected initColumns(): void {
        this._renderer.columns = this._columns.selectedColumns;
        this.updateGrid();
    }

    protected updateGrid(
        extents: GridExtents = [
            { min: -1, max: 1 },
            { min: -1, max: 1 },
            { min: -1, max: 1 }
        ],
        subdivisions = 10,
    ): void {
        this._renderer.updateGrid(
            this._columns.selectedColumns
                .slice(0, 3)
                .map((c) => this.getId(c)),
            extents,
            subdivisions);
    }
}
