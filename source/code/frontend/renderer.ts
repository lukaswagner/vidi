import {
    AntiAliasingKernel,
    ChangeLookup,
    Context,
    DefaultFramebuffer,
    EventProvider,
    Invalidate,
    Renderer,
    mat4,
    vec2,
    vec3,
    viewer,
} from 'webgl-operate';

import {
    Column,
    Float32Column,
} from '@lukaswagner/csv-parser';

import {
    ExtendedGridInfo,
    GridExtents,
    GridInfo,
    calculateExtendedGridInfo,
} from './grid/gridInfo';

import { Formats, Interaction, Passes } from './globals';
import { drawBuffer, drawBuffers } from './util/drawBuffer';
import { Buffers } from './globals/buffers';
import { ClusterInfo } from 'worker/clustering/interface';
import { DebugMode} from './debug/debugPass';
import { GridHelper } from './grid/gridHelper';
import { GridOffsetHelper } from './grid/offsetHelper';
import { PointPass } from './points/pointPass';


export class TopicMapRenderer extends Renderer {
    protected _altered = Object.assign(new ChangeLookup(), {
        any: false,
        msaa: false,
        multiFrameNumber: false,
        frameSize: false,
        canvasSize: false,
        framePrecision: false,
        clearColor: false,
        debugTexture: false,
        debugMode: false,
    });

    protected _gl: WebGL2RenderingContext;

    // scene data
    protected _gridInfo: GridInfo[];
    protected _gridOffsetHelper: GridOffsetHelper;

    protected _modelMatInfo: { extents: GridExtents, columns: Column[] } = {
        extents: undefined, columns: undefined
    };
    protected _modelMat: mat4;

    // aa control
    protected _ndcOffsetKernel: AntiAliasingKernel;
    protected _uNdcOffset: WebGLUniformLocation;

    // final output
    protected _defaultFBO: DefaultFramebuffer;

    // debugging
    protected _debugMode: DebugMode = DebugMode.Off;

    public updateUseDiscard(): void {
        Passes.points.useDiscard = !viewer.Fullscreen.active();
    }

    public updateGrid(
        columns: string[], extents: GridExtents, subdivisions: number
    ): void {
        this._gridInfo = GridHelper.buildGrid(
            columns,
            extents,
            subdivisions
        );

        const extendedGridInfo = new Array<ExtendedGridInfo>();

        this._gridInfo.forEach((grid) => {
            const extended = calculateExtendedGridInfo(grid);
            extendedGridInfo.push(extended);
        });

        Passes.grid.gridInfo = extendedGridInfo;
        this._gridOffsetHelper.gridInfo = extendedGridInfo;
        this._modelMatInfo.extents = extents;
        this.updateModelMat();
        this.invalidate();
    }

    public updateData(): void {
        this.updateModelMat();
        this.invalidate();
    }

    public setColumn(index: number, column: Column): void {
        Passes.points.setColumn(index, column);
        if (this.initialized) {
            this.invalidate();
        }
    }

    public setClusterData(name: string, data: ClusterInfo[]): void {
        Passes.clusters.setData(name, data);
    }

    public selectClusterData(name: string): void {
        const numClusters = Passes.clusters.selectData(name);
        Passes.points.numClusters = numClusters;
    }

    public invalidate(): void {
        super.invalidate();
    }

    /**
     * Initializes and sets up buffer, cube geometry, camera and links shaders
     * with program.
     * @param context - valid context to create the object for.
     * @param identifier - meaningful name for identification of this instance.
     * @param eventProvider - required for mouse interaction
     * @returns - whether initialization was successful
     */
    protected onInitialize(
        context: Context,
        callback: Invalidate,
        eventProvider: EventProvider
    ): boolean {
        this._gl = context.gl as WebGL2RenderingContext;

        Formats.initialize(this._gl);
        Interaction.initialize(this._gl, callback, eventProvider);
        Buffers.initialize(context);
        Passes.initialize(context, this.invalidate.bind(this));

        this._gridOffsetHelper = new GridOffsetHelper();
        this._gridOffsetHelper.initialize();

        // set up output
        this._defaultFBO = new DefaultFramebuffer(context, 'DefaultFBO');
        this._defaultFBO.initialize();

        // connect fullscreen changes to updateUseDiscard listener
        const uud = this.updateUseDiscard.bind(this);
        document.addEventListener('fullscreenchange', uud);
        document.addEventListener('mozfullscreenchange', uud);
        document.addEventListener('webkitfullscreenchange', uud);
        document.addEventListener('msfullscreenchange', uud);
        Passes.points.useDiscard = true;

        // enable culling
        this._gl.enable(this._gl.CULL_FACE);

        return true;
    }

    /**
     * Uninitializes buffers, geometry and program.
     */
    protected onUninitialize(): void {
        super.uninitialize();
        this._defaultFBO.uninitialize();
    }

    /**
     * This is invoked in order to check if rendering of a frame is required by
     * means of implementation specific evaluation (e.g., lazy non continuous
     * rendering). Regardless of the return value a new frame (preparation,
     * frame, swap) might be invoked anyway, e.g., when update is forced or
     * canvas or context properties have changed or the renderer was
     * invalidated @see{@link invalidate}.
     * @returns whether to redraw
     */
    protected onUpdate(): boolean {
        Interaction.update();
        return this._altered.any ||
            Interaction.altered ||
            this._gridOffsetHelper.altered ||
            Passes.altered ||
            Buffers.altered;
    }
    /**
     * This is invoked in order to prepare rendering of one or more frames,
     * regarding multi-frame rendering and camera-updates.
     */
    protected onPrepare(): void {
        if (this._altered.frameSize) {
            Buffers.resize(this._frameSize[0], this._frameSize[1]);
            Interaction.camera.viewport =
                [this._frameSize[0], this._frameSize[1]];

            Passes.points.aspectRatio =
                this._frameSize[1] / this._frameSize[0];

            Passes.debug.resize(vec2.clone(this._frameSize));
        }

        if (this._altered.canvasSize) {
            Interaction.camera.aspect =
                this._canvasSize[0] / this._canvasSize[1];
        }

        this._gridOffsetHelper.update();
        Passes.update();
        Buffers.update();

        this._altered.reset();
        Interaction.camera.altered = false;
    }

    protected msFrame(frameNumber: number): void {
        const ss = Buffers.ssFBO;
        const ms = Buffers.msFBO;

        // prepare ortho views
        if(frameNumber === 0) Passes.ortho.frame();

        // on the first frame: render indices to ss buffer
        if(frameNumber === 0) {
            ss.bind();
            drawBuffers(this._gl, 0b110);

            this._gl.clearBufferuiv(this._gl.COLOR, 1, [0, 0, 255, 0]);
            this._gl.clearBufferuiv(this._gl.COLOR, 2, [255, 255, 255, 0]);
            this._gl.clearBufferfi(this._gl.DEPTH_STENCIL, 0, 1, 0);

            Passes.points.target = Passes.limits.target = ss;
            Passes.points.frame(frameNumber);
            Passes.limits.frame();
            Passes.points.target = Passes.limits.target = ms;
        }

        // now render the colors to ms buffer
        ms.bind();
        drawBuffers(this._gl, 0b1);

        this._gl.clearBufferfv(this._gl.COLOR, 0, this._clearColor);
        this._gl.clearBufferfi(this._gl.DEPTH_STENCIL, 0, 1, 0);

        Passes.gridLabels.target =
            Passes.grid.target =
            Passes.clusters.target = ms;

        Passes.points.frame(frameNumber);
        Passes.gridLabels.frame();
        Passes.grid.frame();
        Passes.limits.frame();
        Passes.clusters.frame();
        ms.unbind();

        // trigger accumulation if necessary
        if (Buffers.mfEnabled) {
            // blit color to ss buffer
            // acc pass wants a texture, but that cant be multi sampled
            ms.bind(this._gl.READ_FRAMEBUFFER);
            ss.bind(this._gl.DRAW_FRAMEBUFFER);
            this._gl.readBuffer(this._gl.COLOR_ATTACHMENT0);
            drawBuffers(this._gl, 0b1);
            this._gl.blitFramebuffer(
                0, 0, this._frameSize[0], this._frameSize[1],
                0, 0, this._frameSize[0], this._frameSize[1],
                this._gl.COLOR_BUFFER_BIT, this._gl.NEAREST);
            this._gl.bindFramebuffer(this._gl.READ_FRAMEBUFFER, null);
            this._gl.bindFramebuffer(this._gl.DRAW_FRAMEBUFFER, null);

            Passes.accumulate.frame(frameNumber);
        }
    }

    protected ssFrame(frameNumber: number): void {
        const ss = Buffers.ssFBO;

        // prepare ortho views
        if(frameNumber === 0) Passes.ortho.frame();

        ss.bind();
        drawBuffers(this._gl, 0b111);

        this._gl.clearBufferfv(this._gl.COLOR, 0, this._clearColor);
        this._gl.clearBufferuiv(this._gl.COLOR, 1, [0, 0, 255, 0]);
        this._gl.clearBufferuiv(this._gl.COLOR, 2, [255, 255, 255, 0]);
        this._gl.clearBufferfi(this._gl.DEPTH_STENCIL, 0, 1, 0);

        Passes.points.target =
            Passes.gridLabels.target =
            Passes.grid.target =
            Passes.limits.target =
            Passes.clusters.target = ss;

        Passes.points.frame(frameNumber);
        Passes.limits.frame();

        drawBuffers(this._gl, 0b1);

        Passes.gridLabels.frame();
        Passes.grid.frame();
        Passes.clusters.frame();

        ss.unbind();

        // trigger accumulation if necessary
        if (Buffers.mfEnabled) {
            Passes.accumulate.frame(frameNumber);
        }
    }

    protected onFrame(frameNumber: number): void {
        this._gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        if(Buffers.msEnabled) {
            this.msFrame(frameNumber);
        } else {
            this.ssFrame(frameNumber);
        }
    }

    protected onSwap(): void {
        let fb = Buffers.renderFBO;
        if(this._debugMode !== DebugMode.Off) {
            fb = Passes.debug.output;
            Passes.debug.frame(this._debugMode);
        } else if(Buffers.mfEnabled) fb = Passes.accumulate.framebuffer;

        if (!fb?.initialized) {
            console.log('fbo not initialized, skip blit ');
            return;
        }

        if (
            vec2.distance(fb.size, this._defaultFBO.size) ||
            !this._defaultFBO
        ) {
            console.log('size mismatch, skip blit');
            return;
        }

        this._gl.bindFramebuffer(this._gl.READ_FRAMEBUFFER, fb.object);
        this._gl.bindFramebuffer(this._gl.DRAW_FRAMEBUFFER, null);
        this._gl.readBuffer(this._gl.COLOR_ATTACHMENT0);
        drawBuffer(this._gl, this._gl.BACK);
        this._gl.blitFramebuffer(
            0, 0, this._frameSize[0], this._frameSize[1],
            0, 0, this._frameSize[0], this._frameSize[1],
            this._gl.COLOR_BUFFER_BIT, this._gl.NEAREST);
        this._gl.bindFramebuffer(this._gl.READ_FRAMEBUFFER, null);
    }

    protected onDiscarded(): void {
        console.warn('got discarded');
    }

    protected updateModelMat(): void {
        const c = this._modelMatInfo.columns.slice(0, 3) as Float32Column[];
        const e = this._modelMatInfo.extents;

        if (!e || !c || c.some((c) =>
            c?.max === Number.NEGATIVE_INFINITY ||
            c?.min === Number.POSITIVE_INFINITY)
        ) {
            return;
        }

        const gridOffset = e.map((e, i) => c[i] ? e.min : 0);
        const gridScale = e.map((e, i) => c[i] ? (e.max - e.min) : 0);
        const valueScale = c.map((c) => c ? 1 / (c.max - c.min) : 0);
        const valueOffset = c.map((c) => c ? -c.min : 0);

        const model = mat4.create();
        mat4.translate(model, model, new Float32Array(gridOffset));
        mat4.scale(model, model, new Float32Array(gridScale));
        mat4.scale(model, model, new Float32Array(valueScale));
        mat4.translate(model, model, new Float32Array(valueOffset));
        this._modelMat = model;

        Passes.points.model = model;
        Passes.clusters.model = model;
        Passes.ortho.model = model;
    }

    public set columns(columns: Column[]) {
        Passes.points.columns = columns;
        this._modelMatInfo.columns = columns;
        this.updateModelMat();
        if (this.initialized) {
            this.invalidate();
        }
    }

    public set pointSize(size: number) {
        Passes.points.pointSize = size;
        this.invalidate();
    }

    public set scale(scale: number) {
        const temp = vec3.create();
        vec3.normalize(temp, Interaction.camera.eye);
        vec3.scale(temp, temp, 10 / scale);
        Interaction.camera.eye = temp;
        this.invalidate();
    }

    public set colorMode(mode: number) {
        Passes.points.colorMode = mode;
        this.invalidate();
    }

    public set colorMapping(mapping: number) {
        Passes.points.colorMapping = mapping;
        this.invalidate();
    }

    public set variablePointSizeStrength(strength: number) {
        Passes.points.variablePointSizeStrength = strength;
        this.invalidate();
    }

    public get points(): PointPass {
        return Passes.points;
    }

    public set msaa(value: number) {
        Buffers.msSamples = value;
        this.invalidate();
    }

    public set debugMode(mode: DebugMode) {
        this._debugMode = mode;
        this._altered.alter('debugMode');
        this.invalidate();
    }

    public get model(): mat4 {
        return this._modelMat;
    }
}
