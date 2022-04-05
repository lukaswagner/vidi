import {
    AnyChunk,
    Column,
    DataType,
    buildChunk,
    buildColumn,
    rebuildColumn
} from '@lukaswagner/csv-parser';
import { BitArray, Lasso, ResultType } from '@lukaswagner/lasso';
import { Button, SelectInput } from '@lukaswagner/web-ui';
import {
    Canvas,
    Color,
    Context,
    Controller,
    Initializable,
    Wizard,
    mat4,
    vec3,
    vec4,
    viewer,
} from 'webgl-operate';
import { ColorMapping, ColorMappingDefault } from './points/colorMapping';
import { ColorMode, ColorModeDefault } from './points/colorMode';
import { ColumnUsage, Columns } from './data/columns';
import {
    Configuration,
    FilterMessage,
    FilteredMessage,
    Message
} from './interface';
import { Dataset, fetchAvailable, fetchPresets } from './util/api';
import { Interaction, Passes } from './globals';
import { deductSeparator, load } from './util/load';

import { Buffers } from './globals/buffers';
import { Clustering } from './clustering/clustering';
import { Controls } from './controls';
import { DataSource } from '@lukaswagner/csv-parser/lib/types/types/dataSource';
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
        value: 0.025,
        min: 0.001,
        max: 0.05,
        step: 0.001
    };

    private static readonly SCALE_CONTROL = {
        value: 2.0,
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

    private _isChildProcess: boolean;
    private _canvas: Canvas;
    private _renderer: TopicMapRenderer;
    private _controls: Controls;
    private _datasets: Dataset[];
    private _presets: Configuration[];
    private _columns: Columns;
    private _clustering: Clustering;
    private _lasso: Lasso;
    private _selection: BitArray;

    private _keepLimitsOnDataUpdate = false;

    public initialize(element: HTMLCanvasElement): boolean {
        console.log('window.opener', window.opener ? 'set' : 'not set');
        this._isChildProcess = !!window.opener;

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

        // add support for external configuration
        if(this._isChildProcess) {
            window.addEventListener('message', (msg) => {
                const message = msg.data as Message;
                switch (message.type) {
                    case 'configuration':
                        console.log('received preset', message.data);
                        this.applyPreset(message.data as Configuration);
                        break;
                    case 'columns':
                        this.dataReady(
                            message.data.map((c) => rebuildColumn(c)));
                        break;
                    case 'ready':
                        // ignore
                        break;
                    default:
                        // ignore silently
                        // console.log('received invalid msg:', msg);
                        break;
                }
            });
        }

        this._lasso = new Lasso({
            target: element,
            resultType: ResultType.BitArray
        });

        return true;
    }

    public uninitialize(): void {
        this._canvas.dispose();
        this._renderer.uninitialize();
    }

    protected handleDataUpdate(): void {
        this._renderer.updateData();
        this._lasso.reset();
    }

    protected async applyPreset(preset: Configuration): Promise<void> {
        let data: DataSource = preset.csv;

        if(typeof preset.csv === 'string') {
            const found = this._datasets.find((d) => d.id === preset.csv);
            if (found) {
                (this._controls.data.elements.get('data') as SelectInput)
                    .value = found.url;
                data = found.url;
            }
        }

        this._keepLimitsOnDataUpdate = preset.keepLimits ?? false;

        if(data) {
            await load(
                {
                    dataSources: { data },
                    delimiter: preset.delimiter ?? ','
                },
                (c) => {
                    this.dataReady(c);
                    this._controls.applyPreset(preset);
                },
                this.handleDataUpdate.bind(this)
            );
        } else {
            this._controls.applyPreset(preset);
        }
    }

    protected initControls(): void {
        this._controls = new Controls();

        // presets
        const presetSelect = this._controls.presets.input.select({
            label: 'Presets',
            id: 'presets'
        });

        const presetInput = this._controls.presets.input.button({
            text: 'Load',
            handler: () =>
                this.applyPreset(this._presets
                    .find((p) => p.name === presetSelect.value))
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
            .then((presets: Configuration[]) => {
                this._presets = presets;
                presetSelect.values = presets.map((p) => p.name);
                presetSelect.value = presetSelect.values[0];
                if(this._isChildProcess)
                    window.postMessage({ type: 'ready' });
                else
                    presetInput.invokeHandler();
            });

        this._controls.data.input.button({
            text: 'Load',
            handler: () => {
                const data = this._datasets[dataSelect.index];
                load(
                    {
                        dataSources: { data: data.url },
                        delimiter: ',',
                        includesHeader: true,
                    },
                    this.dataReady.bind(this),
                    this.handleDataUpdate.bind(this)
                );
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
                load(
                    {
                        dataSources: { data: customFile.value[0] },
                        delimiter: delimSelect.value === 'custom' ?
                            customDelim.value :
                            delimSelect.value,
                        includesHeader: header.value,
                    },
                    this.dataReady.bind(this),
                    this.handleDataUpdate.bind(this)
                );
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

        this._controls.position.input.numberRange({
            label: 'Grid offset',
            id: 'offsetScale',
            min: 0.1, max: 3, step: 0.1, value: 1,
            triggerHandlerOnMove: true,
            handler: (v: number) => this._renderer.gridOffsetScale = v,
        });

        this._controls.position.input.select({
            label: 'Axis for 2.5D',
            optionTexts: ['None', 'x', 'y', 'z'],
            handler: (v) => {
                this._renderer.points.refLines.baseAxis = v.index - 1;
                this._renderer.invalidate();
            }
        });

        this._controls.position.input.button({
            label: 'Reset position limits',
            text: 'Reset',
            handler: () => {
                Passes.limits.reset();
                this._renderer.invalidate();
            }
        });

        // selection
        const selectHandler = (b: Button): void => {
            Interaction.lassoActive = true;
            const m = this._renderer.model;
            const vp = Interaction.camera.viewProjection;
            this._lasso.matrix = mat4.mul(mat4.create(), vp, m);
            this._lasso.callback = (s) => {
                b.elements[0].click();
                this.updateSelection(s as BitArray);
            };
            this._lasso.enable();
            b.elements[0].textContent = 'Cancel';
            b.handler = cancelHandler.bind(this, b);
        };

        const cancelHandler = (b: Button): void => {
            this._lasso.disable();
            this._lasso.callback = undefined;
            Interaction.lassoActive = false;
            b.elements[0].textContent = b === add ? 'Add' : 'Remove';
            b.handler = selectHandler.bind(this, b);
        };

        const add = this._controls.selection.input.button({
            text: 'Add',
        });
        add.handler = selectHandler.bind(this, add);

        const sub = this._controls.selection.input.button({
            text: 'Remove'
        });
        sub.handler = selectHandler.bind(this, sub);

        this._controls.selection.input.button({
            text: 'Reset',
            handler: () => {
                this._lasso.reset();
                this.updateSelection(this._lasso.selection as BitArray);
                this._renderer.invalidate();
            }
        });

        Interaction.limitListener = this.updateSelection.bind(this);

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

        // debug
        this._controls.debug.input.button({
            text: 'Spawn child',
            handler: () => {
                const child = window.open(window.location.href);
                child.addEventListener('message', (msg) => {
                    if(msg.data.type === 'ready') child.postMessage({
                        type: 'columns',
                        data: this._columns.columns.filter((c) => c?.length > 0)
                    });
                });
            }
        });
    }

    protected getId(column: Column): string {
        return column?.name ?? '__NONE__';
    }

    protected dataReady(columns: Column[]): void {
        this._columns = new Columns(columns);
        this.initColumns();
        this._lasso.points = this._columns.positionSource;

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
        if (!this._keepLimitsOnDataUpdate) Passes.limits.reset();

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

    protected filterLimits(sel: BitArray): boolean {
        let changed = false;
        const m = this._renderer.model;
        const limits = Passes.limits.limits;
        const source = this._columns.positionSource;
        for (let i = 0; i < source.length; i++) {
            let p3 = source.at(i);
            const p4 = vec4.fromValues(p3[0], p3[1], p3[2], 1);
            vec4.transformMat4(p4, p4, m);
            p3 = vec3.fromValues(p4[0] / p4[3], p4[1] / p4[3], p4[2] / p4[3]);
            for(let j = 0; j < 3; j++) {
                if (p3[j] < limits[j] || p3[j] > limits[j+3]) {
                    changed ||= sel.get(i);
                    sel.set(i, false);
                }
            }
        }
        return changed;
    }

    protected updateSelection(sel: BitArray = this._selection): void {
        if(!sel) return;
        this._selection = sel;
        const changed = this.filterLimits(sel);
        if(changed) this._lasso.setSelection(sel);
        const filter = new Uint8Array(sel.length);
        for(let i = 0; i < sel.length; i++)
            filter[i] = +sel.get(i);
        Passes.points.selection = filter;

        if(this._isChildProcess) {
            let num = 0;
            for(let i = 0; i < sel.length; i++) {
                if(sel.get(i)) num++;
            }
            const orig = this._columns.columns;
            const chunks = orig.map((c) => {
                return buildChunk(c.type, num, 0) as AnyChunk;
            });
            num = 0;
            for(let i = 0; i < sel.length; i++) {
                if(sel.get(i)) {
                    chunks.forEach((c, ci) => {
                        c.set(num, orig[ci].get(i) as never);
                    });
                    num++;
                }
            }
            const columns = orig.map((c, ci) => {
                const col = buildColumn(c.name, c.type);
                col.push(chunks[ci]);
                return col;
            });

            const fM: FilterMessage = {
                type: 'filter',
                data: filter
            };
            window.postMessage(fM);

            const fdM: FilteredMessage = {
                type: 'filtered',
                data: columns
            };
            window.postMessage(fdM);
        }
    }
}
