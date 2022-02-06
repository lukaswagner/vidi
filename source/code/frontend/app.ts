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
    ColorMappingDefault,
} from './points/colorMapping';
import {
    ColorMode,
    ColorModeDefault,
} from './points/colorMode';
import {
    Column,
    DataType,
} from '@lukaswagner/csv-parser';
import {
    ColumnUsage,
    Columns,
} from './data/columns';
import {
    Controls,
    Preset,
} from './controls';
import {
    Dataset,
    fetchAvailable,
    fetchPresets,
} from './util/api';
import {
    deductSeparator,
    loadCustom,
    loadFromServer,
} from './util/load';

import { Buffers } from './globals/buffers';
import { Clustering } from './clustering/clustering';
import { DebugMode } from './debug/debugPass';
import { GridExtents } from './grid/gridInfo';
import { TopicMapRenderer } from './renderer';

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
        value: 0.01,
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
        value: 0,
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
            label: 'Presets',
            id: 'presets'
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
            if (!preset) return;
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
            label: 'Dataset',
            id: 'data'
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
                presetSelect.value = presetSelect.values[0];
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
        dataProgress.container.classList.add('d-none');

        // custom data
        // const customSource = this._controls.data.input.select({
        //     label: 'Custom dataset source',
        //     optionValues: ['File', 'URL']
        // });
        const customFile = this._controls.customData.input.file({
            label: 'Custom dataset',
            handler: (v) => {
                const splitName = v[0].name.split('.');
                const format = splitName[splitName.length - 1];
                const delimiter = deductSeparator(format) || 'custom';
                delimSelect.value = delimiter;
            }
        });

        const delimSelect = this._controls.customData.input.select({
            label: 'Delimiter',
            optionValues: [',', '\t', 'custom'],
            optionTexts: ['Comma', 'Tab', 'Custom']
        });

        const customDelim = this._controls.customData.input.text({
            label: 'Custom delimiter',
            handler: (v) => {
                if (v) delimSelect.value = 'custom';
            }
        });

        const header = this._controls.customData.input.checkbox({
            label: 'File has header row',
            value: true
        });

        this._controls.customData.input.button({
            text: 'Load',
            handler: () => {
                loadCustom(
                    'File', // disable external url support for now
                    customFile.value[0],
                    '',
                    delimSelect.value,
                    customDelim.value,
                    header.value,
                    customProgress,
                    this.handleDataUpdate.bind(this)
                ).then((d) => this.dataReady(d));
            }
        });

        const customProgress = this._controls.data.output.progress();
        customProgress.container.classList.add('d-none');

        // position
        const xAxis = this._controls.position.input.select({
            label: 'X axis',
            id: 'axes.x',
            optionTexts: ['None'],
            optionValues: ['__NONE__'],
            handler: (v) => this.updateColumn(ColumnUsage.X_AXIS, v.value)
        });
        const yAxis = this._controls.position.input.select({
            label: 'Y axis',
            id: 'axes.y',
            optionTexts: ['None'],
            optionValues: ['__NONE__'],
            handler: (v) => this.updateColumn(ColumnUsage.Y_AXIS, v.value)
        });
        const zAxis = this._controls.position.input.select({
            label: 'Z axis',
            id: 'axes.z',
            optionTexts: ['None'],
            optionValues: ['__NONE__'],
            handler: (v) => this.updateColumn(ColumnUsage.Z_AXIS, v.value)
        });
        this._controls.axes = [xAxis, yAxis, zAxis];

        this._controls.position.input.select({
            label: 'Axis for 2.5D',
            optionTexts: ['None', 'x', 'y', 'z'],
            handler: (v) => {
                this._renderer.points.refLines.baseAxis = v.index - 1;
                this._renderer.invalidate();
            }
        });

        // clustering
        this._controls.cluster.input.button({
            label: 'Calculate clusters',
            text: 'Start',
            handler: () => {
                this._clustering.runWorkers();
                this._controls.colorMode.value = ColorMode[3][0].toString();
                this._controls.colorMode.invokeHandler();
            }
        });

        this._controls.clusterAlg = this._controls.cluster.input.select({
            label: 'Algorithm',
            optionTexts: ['None'],
            optionValues: ['__NONE__'],
            handler: (v) => {
                this._renderer.selectClusterData(v.value);
                this.updateColumn(ColumnUsage.CLUSTER_ID, v.value);
            }
        });

        // scale
        const scale = this._controls.size.input.numberRange(Object.assign({
            label: 'Scale',
            id: 'scale',
            triggerHandlerOnMove: true,
            handler: (v: number) => this._renderer.scale = v,
        }, TopicMapApp.SCALE_CONTROL));

        this._canvas.element.addEventListener('wheel', (e) => {
            const base = 1.15;
            const exp = -Math.sign(e.deltaY);
            scale.value = Math.max(scale.value * (base ** exp), scale.step);
            scale.invokeHandler();
        }, { capture: true, passive: true });

        // point size
        this._controls.size.input.numberRange(Object.assign({
            label: 'Point Size',
            id: 'pointSize',
            triggerHandlerOnMove: true,
            handler: (v: number) => this._renderer.pointSize = v,
        }, TopicMapApp.POINT_SIZE_CONTROL));

        // variable point size
        this._controls.size.input.numberRange(Object.assign({
            label: 'Variable size factor',
            id: 'variablePointSizeStrength',
            triggerHandlerOnMove: true,
            handler: (v: number) => this._renderer.variablePointSizeStrength = v
        }, TopicMapApp.VARIABLE_POINT_SIZE_CONTROL));

        this._controls.variablePointSizeColumn =
            this._controls.size.input.select({
                label: 'Variable size column',
                id: 'variablePointSizeColumn',
                optionTexts: ['None'],
                optionValues: ['__NONE__'],
                handler: (v) =>
                    this.updateColumn(ColumnUsage.VARIABLE_POINT_SIZE, v.value)
            });

        // colors
        this._controls.colorMode = this._controls.color.input.select({
            label: 'Color mode',
            id: 'colorMode',
            optionTexts: [...ColorMode.values()].map((e) => e[1]),
            optionValues: [...ColorMode.keys()].map((k) => k.toString()),
            handler: (v) => this._renderer.colorMode = Number(v.value),
            value: ColorModeDefault.toString()
        });

        this._controls.color.input.select({
            label: 'Position-based mapping',
            id: 'colorMapping',
            optionTexts: [...ColorMapping.values()].map((e) => e[1]),
            optionValues: [...ColorMapping.keys()].map((k) => k.toString()),
            handler: (v) => this._renderer.colorMapping = Number(v.value),
            value: ColorMappingDefault.toString()
        });

        this._controls.colorColumn = this._controls.color.input.select({
            label: 'Per-point column',
            id: 'colorColumn',
            optionTexts: ['None'],
            optionValues: ['__NONE__'],
            handler: (v) =>
                this.updateColumn(ColumnUsage.PER_POINT_COLOR, v.value)
        });

        // rendering
        const maxSamples = Buffers.maxSamples;
        this._controls.rendering.input.numberRange({
            label: 'MSAA',
            value: maxSamples, min: 1, max: maxSamples, step: 1,
            handler: (v) => this._renderer.msaa = v
        });

        this._controls.rendering.input.numberRange({
            label: 'MFAA',
            value: 32, min: 1, max: 64, step: 1,
            handler: (v) => this._canvas.controller.multiFrameNumber = v
        });

        this._controls.rendering.input.select({
            label: 'Debug',
            optionTexts: Object.values(DebugMode),
            handler: (v) => this._renderer.debugMode = v.value as DebugMode
        });
    }

    protected getId(column: Column): string {
        return column?.name ?? '__NONE__';
    }

    protected dataReady(columns: Column[]): void {
        this._columns = new Columns(columns);
        this.initColumns();

        this._controls.clusterAlg.reset();
        this._controls.colorMode.reset();
        this._clustering = new Clustering();
        this._clustering.initialize(this._columns);
        this._columns.addColumns(this._clustering.getOutputs());
        this._clustering.clusterInfoHandler = (name, clusters) => {
            this._renderer.setClusterData(name, clusters);
            if (!this._controls.clusterAlg.values.includes(name)) {
                this._controls.clusterAlg.addOption(name);
            }
            this._controls.clusterAlg.value = name;
            this._controls.clusterAlg.invokeHandler();
        };

        // set up axis controls
        const numberColumnNames = this._columns.getColumnNames(DataType.Number);
        const numberIds = ['__NONE__'].concat(numberColumnNames);
        const numberLabels = ['None'].concat(numberColumnNames);
        for (let i = 0; i < this._controls.axes.length; i++) {
            this._controls.axes[i].values = numberIds;
            this._controls.axes[i].texts = numberLabels;
            this._controls.axes[i].value =
                this.getId(this._columns.selectedColumn(i));
            this._controls.axes[i].invokeHandler();
        }

        // set up vertex color controls
        const colorColumnNames = this._columns.getColumnNames(DataType.Color);
        const colorIds = ['__NONE__'].concat(colorColumnNames);
        const colorLabels = ['None'].concat(colorColumnNames);
        this._controls.colorColumn.values = colorIds;
        this._controls.colorColumn.texts = colorLabels;
        this._controls.colorColumn.value = '__NONE__';
        this._controls.colorColumn.invokeHandler();

        // set up variable point size controls
        this._controls.variablePointSizeColumn.values = numberIds;
        this._controls.variablePointSizeColumn.texts = numberLabels;
        this._controls.variablePointSizeColumn.value = '__NONE__';
        this._controls.variablePointSizeColumn.invokeHandler();
    }

    protected updateColumn(updatedColumn: ColumnUsage, name: string): void {
        if (!this._columns) return;
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
