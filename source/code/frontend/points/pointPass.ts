import { Alpha, AlphaMode } from 'frontend/util/alpha';

import {
    Buffer,
    ChangeLookup,
    Context,
    Framebuffer,
    Initializable,
    Program,
    Shader,
    mat4,
} from 'webgl-operate';
import {
    Column,
    Float32Chunk,
    Float32Column,
    NumberColumn,
} from '@lukaswagner/csv-parser';

import { ColumnUsage } from 'frontend/data/columns';
import { GLfloat2 } from 'shared/types/tuples';
import { Interaction } from 'frontend/globals';
import { ListenerMask } from 'frontend/globals/interaction';
import { PointCloudGeometry } from './pointCloudGeometry';
import { RefLinePass } from './refLinePass';

export class PointPass extends Initializable {
    protected static readonly DEFAULT_POINT_SIZE = 1.0 / 128.0;
    protected static readonly DEFAULT_AA_STEP_SCALE: GLfloat = 0.6666;

    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        columns: false,
        aspectRatio: false,
        cutoffPosition: false,
        pointSize: false,
        useDiscard: false,
        colorMode: false,
        colorMapping: false,
        variablePointSizeStrength: false,
        variablePointSizeOutputRange: false,
        model: false,
        numClusters: false,
        selected: false,
        limits: false,
        selection: false
    });

    protected _context: Context;
    protected _gl: WebGL2RenderingContext;

    protected _target: Framebuffer;

    protected _aspectRatio: GLfloat;
    protected _cutoffPosition: number[];
    protected _cutoffPositionMask: number[];
    protected _pointSize: GLfloat = PointPass.DEFAULT_POINT_SIZE;
    protected _useDiscard: boolean;
    protected _colorMode: number;
    protected _colorMapping: number;
    protected _ndcOffset: GLfloat2 = [0.0, 0.0];
    protected _variablePointSizeStrength: GLfloat = 1;
    protected _variablePointSizeOutputRange: GLfloat2 = [0.0, 10.0];
    protected _model: mat4;
    protected _numClusters: number;
    protected _selected = -1;
    protected _limits: number[];

    protected _program: Program;
    protected _alpha: Alpha;

    protected _uModel: WebGLUniformLocation;
    protected _uViewProjection: WebGLUniformLocation;
    protected _uViewProjectionInverse: WebGLUniformLocation;
    protected _uNdcOffset: WebGLUniformLocation;
    protected _uAspectRatio: WebGLUniformLocation;
    protected _uCameraPosition: WebGLUniformLocation;
    protected _uCutoffPosition: WebGLUniformLocation;
    protected _uCutoffPositionMask: WebGLUniformLocation;
    protected _uPointSize: WebGLUniformLocation;
    protected _uUseDiscard: WebGLUniformLocation;
    protected _uColorMode: WebGLUniformLocation;
    protected _uColorMapping: WebGLUniformLocation;
    protected _uVariablePointSizeStrength: WebGLUniformLocation;
    protected _uVariablePointSizeInputRange: WebGLUniformLocation;
    protected _uVariablePointSizeOutputRange: WebGLUniformLocation;
    protected _uNumClusters: WebGLUniformLocation;
    protected _uIdOffset: WebGLUniformLocation;
    protected _uSelected: WebGLUniformLocation;
    protected _uLimits: WebGLUniformLocation;
    protected _uAnySelected: WebGLUniformLocation;

    protected _geometries: PointCloudGeometry[] = [];
    protected _columns: Column[];
    protected _selectedMap: Uint8Array;
    protected _selectedBuffer: Buffer;
    protected _selectedLocation: number;
    protected _anySelected: boolean;

    protected _refLinePass: RefLinePass;

    public constructor(context: Context) {
        super();
        this._context = context;
        this._gl = context.gl;

        this._program = new Program(this._context);
    }

    @Initializable.initialize()
    public initialize(): boolean {
        this._context.enable(['OES_standard_derivatives']);

        const vert = new Shader(
            this._context, this._gl.VERTEX_SHADER, 'particle.vert');
        vert.initialize(require('./particle.vert'));
        const frag = new Shader(
            this._context, this._gl.FRAGMENT_SHADER, 'particle.frag');
        frag.initialize(require('./particle.frag'));

        this._program.initialize([vert, frag], false);

        this._program.link();

        this._uModel = this._program.uniform('u_model');
        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uViewProjectionInverse =
            this._program.uniform('u_viewProjectionInverse');
        this._uNdcOffset = this._program.uniform('u_ndcOffset');
        this._uAspectRatio = this._program.uniform('u_aspectRatio');
        this._uCameraPosition = this._program.uniform('u_cameraPosition');
        this._uCutoffPosition = this._program.uniform('u_cutoffPosition');
        this._uCutoffPositionMask =
            this._program.uniform('u_cutoffPositionMask');
        this._uPointSize = this._program.uniform('u_pointSize');
        this._uUseDiscard = this._program.uniform('u_useDiscard');
        this._uColorMode = this._program.uniform('u_colorMode');
        this._uColorMapping = this._program.uniform('u_colorMapping');
        this._uVariablePointSizeStrength =
            this._program.uniform('u_variablePointSizeStrength');
        this._uVariablePointSizeInputRange =
            this._program.uniform('u_variablePointSizeInputRange');
        this._uVariablePointSizeOutputRange =
            this._program.uniform('u_variablePointSizeOutputRange');
        this._uNumClusters = this._program.uniform('u_numClusters');
        this._uIdOffset = this._program.uniform('u_idOffset');
        this._uSelected = this._program.uniform('u_selected');
        this._uLimits = this._program.uniform('u_limits');
        this._uAnySelected = this._program.uniform('u_anySelected');

        this._program.bind();
        this._gl.uniform1f(this._uPointSize, this._pointSize);
        this._gl.uniform1ui(this._uSelected, this._selected);
        this._program.unbind();

        this._alpha = new Alpha(
            this._gl, this._program, AlphaMode.AlphaToCoverage);

        this._refLinePass = new RefLinePass(this._context);
        this._refLinePass.initialize();

        Interaction.register({
            mask: ListenerMask.Points,
            move: (id) => {
                this._selected = id;
                this._altered.alter('selected');
            },
            click: (id) => {
                const str = (i: number): string => {
                    return (this._columns[i] as NumberColumn)
                        ?.get(id).toFixed(3) ?? '-';
                };
                console.log(
                    'clicked on point', id,
                    '(', str(0), '|', str(1), '|', str(2), ')');
            }});

        this._selectedBuffer = new Buffer(this._context);
        this._selectedBuffer.initialize(this._gl.ARRAY_BUFFER);
        this._selectedLocation = this._program.attribute('a_selected');

        return true;
    }

    @Initializable.uninitialize()
    public uninitialize(): void {
        this._geometries.forEach((g) => g.uninitialize());
        this._program.uninitialize();

        this._uViewProjection = undefined;
        this._uViewProjectionInverse = undefined;
        this._uNdcOffset = undefined;
        this._uAspectRatio = undefined;
        this._uCameraPosition = undefined;
        this._uCutoffPosition = undefined;
        this._uCutoffPositionMask = undefined;
        this._uPointSize = undefined;
        this._uUseDiscard = undefined;
        this._uColorMode = undefined;
        this._uColorMapping = undefined;
        this._uVariablePointSizeStrength = undefined;
    }

    @Initializable.assert_initialized()
    public update(override = false): void {
        const rebuildGeometries = this._altered.columns;
        if (override || rebuildGeometries) {
            this._geometries.forEach((g) => g.uninitialize());
            this._geometries = [];
        }

        this._program.bind();

        const newGeometries = this.columnsAltered;
        const geomAltered = override || rebuildGeometries || newGeometries;
        if (geomAltered) {
            this.buildGeometries();
        }

        if (this._altered.model) {
            this._gl.uniformMatrix4fv(this._uModel, false, this._model);
        }

        if (geomAltered || this._altered.variablePointSizeOutputRange) {
            const col =
                this._columns[ColumnUsage.VARIABLE_POINT_SIZE] as Float32Column;
            this._gl.uniform3fv(
                this._uVariablePointSizeInputRange,
                col ? [col.min, col.max, 1 / (col.max - col.min)] : [0, 0, 0]);
            this._gl.uniform3f(
                this._uVariablePointSizeOutputRange,
                this._variablePointSizeOutputRange[0],
                this._variablePointSizeOutputRange[1],
                this._variablePointSizeOutputRange[1] -
                this._variablePointSizeOutputRange[0]);
        }

        if (override || this._altered.aspectRatio) {
            this._gl.uniform1f(this._uAspectRatio, this._aspectRatio);
        }

        if (override || this._altered.cutoffPosition) {
            this._gl.uniform3fv(this._uCutoffPosition, this._cutoffPosition);
            this._gl.uniform3fv(
                this._uCutoffPositionMask, this._cutoffPositionMask);
        }

        if (override || this._altered.pointSize) {
            this._gl.uniform1f(this._uPointSize, this._pointSize);
        }

        if (override || this._altered.useDiscard) {
            this._gl.uniform1i(this._uUseDiscard, Number(this._useDiscard));
        }

        if (override || this._altered.colorMode) {
            this._gl.uniform1i(this._uColorMode, Number(this._colorMode));
        }

        if (override || this._altered.colorMapping) {
            this._gl.uniform1i(this._uColorMapping, Number(this._colorMapping));
        }

        if (override || this._altered.variablePointSizeStrength) {
            this._gl.uniform1f(
                this._uVariablePointSizeStrength,
                Number(this._variablePointSizeStrength)
            );
        }

        if (override || this._altered.numClusters) {
            this._gl.uniform1f(this._uNumClusters, this._numClusters);
        }

        if (override || this._altered.selected) {
            this._gl.uniform1ui(this._uSelected, this._selected);
        }

        if (override || this._altered.limits) {
            this._gl.uniform3fv(this._uLimits, this._limits);
        }

        if (this._altered.selection) {
            this._selectedBuffer.data(this._selectedMap, this._gl.STATIC_DRAW);
            this._gl.uniform1ui(this._uAnySelected, +this._anySelected);
        }

        this._program.unbind();

        this._refLinePass.update();

        this._altered.reset();
    }

    @Initializable.assert_initialized()
    public frame(frameNumber: number): void {
        if (this._columns === undefined || this._columns.length === 0) {
            return;
        }

        const size = this._target.size;
        this._gl.viewport(0, 0, size[0], size[1]);

        // should be enabled anyway, just make sure
        this._gl.enable(this._gl.DEPTH_TEST);
        // only enable for this pass -> disable afterwards
        this._gl.depthFunc(this._gl.LESS);

        this._alpha.enable(frameNumber);

        this._program.bind();

        this._gl.uniformMatrix4fv(
            this._uViewProjection, false, Interaction.camera.viewProjection);
        this._gl.uniformMatrix4fv(
            this._uViewProjectionInverse,
            false,
            Interaction.camera.viewProjectionInverse);
        this._gl.uniform2fv(this._uNdcOffset, this._ndcOffset);
        this._gl.uniform3fv(this._uCameraPosition, Interaction.camera.eye);

        this._target.bind();

        this._geometries.forEach((g, i) => {
            const offset = this.anyColumn()?.chunks[i].offset;
            this._gl.uniform1ui(this._uIdOffset, offset);

            g.bind();
            this._selectedBuffer.bind();
            this._gl.vertexAttribPointer(
                this._selectedLocation, 1, this._gl.UNSIGNED_BYTE, false, 0,
                offset);
            this._gl.enableVertexAttribArray(this._selectedLocation);
            this._gl.vertexAttribDivisor(this._selectedLocation, 1);

            g.draw();

            this._selectedBuffer.unbind();
            g.unbind();
        });

        this._program.unbind();

        this._alpha.disable();

        this._refLinePass.frame(frameNumber);

    }

    public setColumn(index: number, column: Column): void {
        this.assertInitialized();
        this._columns[index] = column;
        this._altered.alter('columns');
    }

    protected anyColumn(): Column {
        return this._columns[0] ?? this._columns[1] ?? this._columns[2];
    }

    protected buildGeometries(): void {
        const start = this._geometries.length;

        const end = Math.min(...this._columns.map((c) => {
            return c ? c.chunkCount : Number.POSITIVE_INFINITY;
        }));

        const newChunks = this._columns.map(
            (c) => c?.getChunks(start, end));

        for (let i = 0; i < end - start; i++) {
            const chunks = newChunks.map((nc) => nc?.[i]);
            const len = Math.min(...chunks.map(
                (c) => c ? c.length : Number.POSITIVE_INFINITY));
            const data = chunks.map(
                (c: Float32Chunk, i) => c ? c.data : new SharedArrayBuffer(
                    len * 4 * (i === ColumnUsage.PER_POINT_COLOR ? 4 : 1)));

            this._geometries.push(PointCloudGeometry.fromColumns(
                this._context,
                data
            ));
        }

        this._columns.forEach((c) => {
            if (c) c.altered = false;
        });

        this._refLinePass.geometries = this._geometries;

        const len = this.anyColumn()?.length;
        this._selectedBuffer.bind();
        if(
            len !== this._gl.getBufferParameter(
                this._gl.ARRAY_BUFFER, this._gl.BUFFER_SIZE)
        ) {
            this._gl.bufferData(
                this._gl.ARRAY_BUFFER,
                len,
                this._gl.STATIC_DRAW);
        }
        this._selectedBuffer.unbind();
    }

    public set columns(columns: Column[]) {
        this.assertInitialized();
        this._columns = columns;
        this._altered.alter('columns');
    }

    public set target(target: Framebuffer) {
        this.assertInitialized();
        this._target = target;
        this._refLinePass.target = target;
    }

    public set aspectRatio(aspectRation: GLfloat) {
        this.assertInitialized();
        this._aspectRatio = aspectRation;
        this._altered.alter('aspectRatio');
    }

    public set cutoffPosition(
        cutoffPosition: { value: number; mask: number }[]
    ) {
        this.assertInitialized();
        this._cutoffPosition = cutoffPosition.map((c) => c.value);
        this._cutoffPositionMask = cutoffPosition.map((c) => c.mask);
        this._altered.alter('cutoffPosition');
    }

    public set pointSize(size: GLfloat) {
        this.assertInitialized();
        this._pointSize = size;
        this._altered.alter('pointSize');
    }

    public set useDiscard(enabled: boolean) {
        this.assertInitialized();
        this._useDiscard = enabled;
        this._altered.alter('useDiscard');
    }

    public set colorMode(mode: number) {
        this.assertInitialized();
        this._colorMode = mode;
        this._altered.alter('colorMode');
    }

    public set colorMapping(mode: number) {
        this.assertInitialized();
        this._colorMapping = mode;
        this._altered.alter('colorMapping');
    }

    public set variablePointSizeStrength(strength: GLfloat) {
        this.assertInitialized();
        this._variablePointSizeStrength = strength;
        this._altered.alter('variablePointSizeStrength');
    }

    public set ndcOffset(offset: GLfloat2) {
        this.assertInitialized();
        this._ndcOffset = offset;
        this._refLinePass.ndcOffset = offset;
    }

    public set model(model: mat4) {
        this.assertInitialized();
        if (this._model === model) {
            return;
        }
        this._model = model;
        this._refLinePass.model = model;
        this._altered.alter('model');
    }

    public set numClusters(numClusters: number) {
        this._numClusters = numClusters;
        this._altered.alter('numClusters');
    }

    public get altered(): boolean {
        return this._altered.any
            || this.columnsAltered
            || this._refLinePass.altered;
    }

    protected get columnsAltered(): boolean {
        return this._columns?.some((c) => c?.altered);
    }

    public get refLines(): RefLinePass {
        return this._refLinePass;
    }

    public set limits(limits: number[]) {
        this._limits = limits;
        this._altered.alter('limits');
    }

    public set selection(sel: Uint8Array) {
        this._selectedMap = sel;
        this._anySelected = sel.some((v) => v);
        this._altered.alter('selection');
    }

    public get geometries(): PointCloudGeometry[] {
        return this._geometries;
    }
}
