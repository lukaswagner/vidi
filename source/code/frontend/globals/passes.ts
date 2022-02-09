import {
    AccumulatePass,
    Context,
    Framebuffer,
    Invalidate,
    Wizard
} from 'webgl-operate';

import { ClusterVisualization } from '../clustering/clusterVisualization';
import { DebugPass } from '../debug/debugPass';
import { GridLabelPass } from '../grid/gridLabelPass';
import { GridPass } from '../grid/gridPass';
import { LimitPass } from '../grid/limitPass';
import { PointPass } from '../points/pointPass';

const fontApi = 'https://fonts.varg.dev/api/fonts/';
const font = 'roboto-regular.ttf/61cc7e5a56a3775a3f27899a658881e1';
const Roboto = {
    fnt: fontApi + font +'/fontdescription',
    png: fontApi + font +'/distancefield'
};

export class Passes {
    protected _points: PointPass;
    protected _grid: GridPass;
    protected _gridLabels: GridLabelPass;
    protected _limits: LimitPass;
    protected _clusters: ClusterVisualization;
    protected _accumulate: AccumulatePass;
    protected _debug: DebugPass;

    protected static _instance: Passes;

    protected constructor(
        context: Context, invalidate: Invalidate
    ) {
        this._points = new PointPass(context);
        this._points.initialize();

        this._grid = new GridPass(context);
        this._grid.initialize();

        this._gridLabels = new GridLabelPass(context);
        this._gridLabels.initialize();
        this._gridLabels.depthMask = true;
        this._gridLabels.loadFont(Roboto.fnt, Roboto.png, invalidate);

        this._limits = new LimitPass(context);
        this._limits.initialize();

        // set up cluster rendering
        this._clusters = new ClusterVisualization(context);
        this._clusters.initialize();

        this._accumulate = new AccumulatePass(context);
        this._accumulate.initialize();
        this._accumulate.precision = Wizard.Precision.byte;

        this._debug = new DebugPass(context);
        this._debug.initialize();
    }

    public static initialize(
        context: Context, invalidate: Invalidate
    ): void {
        this._instance = new Passes(context, invalidate);
    }

    public static get points(): PointPass {
        return this._instance._points;
    }

    public static get grid(): GridPass {
        return this._instance._grid;
    }

    public static get gridLabels(): GridLabelPass {
        return this._instance._gridLabels;
    }

    public static get limits(): LimitPass {
        return this._instance._limits;
    }

    public static get clusters(): ClusterVisualization {
        return this._instance._clusters;
    }

    public static get accumulate(): AccumulatePass {
        return this._instance._accumulate;
    }

    public static get debug(): DebugPass {
        return this._instance._debug;
    }

    public static set renderFBO(fbo: Framebuffer) {
        Passes.points.target = fbo;
        Passes.grid.target = fbo;
        Passes.gridLabels.target = fbo;
        Passes.limits.target = fbo;
        Passes.clusters.target = fbo;
    }

    public static get altered(): boolean {
        return Passes.points.altered ||
            Passes.grid.altered ||
            Passes.gridLabels.altered ||
            Passes.limits.altered ||
            Passes.clusters.altered;
    }

    public static update(): void {
        Passes.grid.update();
        Passes.gridLabels.update();
        Passes.limits.update();
        Passes.points.update();
        Passes.clusters.update();
        Passes.accumulate.update();
    }
}
