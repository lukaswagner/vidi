import {
    ChangeLookup,
    Color,
    ColorScale,
    Context,
    Framebuffer,
    Initializable,
    Program,
    Shader,
    Texture2D,
} from 'webgl-operate';

import { Interaction, Passes } from 'frontend/globals';
import { Buffers } from 'frontend/globals/buffers';
import { ExtendedGridInfo } from './gridInfo';
import { GLfloat2 } from 'shared/types/tuples' ;
import { GridGeometry } from './gridGeometry';
import { ListenerMask } from 'frontend/globals/interaction';

type ColorScheme = {
    source: string,
    preset: string
}

type PickInfo = {
    inside: boolean,
    grid: number,
    x: number,
    y: number
};

export class GridPass extends Initializable {
    public static ColorSchemes = new Map<string, ColorScheme>([
        ['Red', {
            source: require('data/colorbrewer.json'),
            preset: 'OrRd'
        }],
        ['Spectral', {
            source: require('data/colorbrewer.json'),
            preset: 'Spectral'
        }],
        ['Viridis', {
            source: require('data/smithwalt.json'),
            preset: 'viridis'
        }],
        ['Inferno', {
            source: require('data/smithwalt.json'),
            preset: 'inferno'
        }],
    ]);

    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        gridInfo: false,
        orthoFactor: false,
        orthoGamma: false,
        heatmap: false,
        colorScheme: false
    });

    protected _context: Context;
    protected _gl: WebGL2RenderingContext;

    protected _target: Framebuffer;
    protected _invalidate: (force: boolean) => void;

    protected _ndcOffset: GLfloat2 = [0.0, 0.0];

    protected _program: Program;

    protected _uViewProjection: WebGLUniformLocation;
    protected _uNdcOffset: WebGLUniformLocation;
    protected _uOrthoRange: WebGLUniformLocation;
    protected _uOrthoFactor: WebGLUniformLocation;
    protected _uOrthoGamma: WebGLUniformLocation;
    protected _uHeatmap: WebGLUniformLocation;

    protected _geometry: GridGeometry;
    protected _gridInfo: ExtendedGridInfo[];
    protected _orthoFactor = 1;
    protected _orthoGamma = 1;
    protected _heatmap = false;
    protected _colorScheme = GridPass.ColorSchemes.get('Spectral');
    protected _colorSchemeSteps = 7;
    protected _colorSchemeTex: Texture2D;
    protected _fixedPick: PickInfo;

    public constructor(context: Context) {
        super();
        this._context = context;
        this._gl = context.gl;

        this._program = new Program(this._context);
        this._geometry = new GridGeometry(this._context);
    }

    @Initializable.initialize()
    public initialize(): boolean {
        this._geometry.initialize();

        this._context.enable(['OES_standard_derivatives']);

        const vert = new Shader(
            this._context, this._gl.VERTEX_SHADER, 'grid.vert');
        vert.initialize(require('./grid.vert'));
        const frag = new Shader(
            this._context, this._gl.FRAGMENT_SHADER, 'grid.frag');
        frag.initialize(require('./grid.frag'));

        this._program.initialize([vert, frag], false);

        this._program.link();

        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uNdcOffset = this._program.uniform('u_ndcOffset');
        this._uOrthoRange = this._program.uniform('u_orthoRange');
        this._uOrthoFactor = this._program.uniform('u_orthoFactor');
        this._uOrthoGamma = this._program.uniform('u_orthoGamma');
        this._uHeatmap = this._program.uniform('u_orthoHeatmap');

        this._program.bind();
        this._gl.uniform1i(this._program.uniform('u_orthoViews'), 0);
        this._gl.uniform1i(this._program.uniform('u_colorScheme'), 1);
        this._program.unbind();

        this._colorSchemeTex = new Texture2D(this._context);
        this._colorSchemeTex.initialize(
            1, 1, this._gl.RGB, this._gl.RGB, this._gl.UNSIGNED_BYTE);



        const getPickInfo = (id: number): PickInfo  => {
            // note: byte order inverse to fragment shader
            const byte = (i: number): number => id >> i * 8 & 255;
            const inside = (id & (1 << 7)) > 0;
            const grid = id & 3;
            const xLower = byte(1);
            const yLower = byte(2);
            const upper = byte(3);
            const xUpper = upper >> 4;
            const yUpper = upper & 15;
            const x = (xUpper << 8 | xLower) / 4095;
            const y = (yUpper << 8 | yLower) / 4095;
            return { inside, grid, x, y };
        };

        const setSel = (i: PickInfo): void => {
            Passes.points.refLines.gridSelected =
                (i ? { pos: [i.x, i.y], id: i.grid } : undefined);
        };

        Interaction.register({
            mask: ListenerMask.Grids,
            move: (id) => {
                const info = getPickInfo(id);
                const valid = id !== -1 && info.inside;
                setSel(this._fixedPick ?? (valid ? info : undefined));
            },
            click: (id) => {
                if(id === -1) return;
                const bin = id.toString(2).padStart(32, '0');
                const info = getPickInfo(id);

                console.log(
                    'clicked on grid\n' +
                    bin + '\n' +
                    'grid ' + info.grid + '\n' +
                    'pos (' + info.x.toFixed(4) + '|' +
                    info.y.toFixed(4) + ')\n' +
                    (info.inside ? 'inside' : 'not inside'));

                const valid = id !== -1 && info.inside;
                if(valid) {
                    this._fixedPick = info;
                    setSel(this._fixedPick);
                }
            }});

        return true;
    }

    @Initializable.uninitialize()
    public uninitialize(): void {
        this._geometry.uninitialize();
        this._program.uninitialize();

        this._uViewProjection = undefined;
        this._uNdcOffset = undefined;
    }

    @Initializable.assert_initialized()
    public update(override = false): void {
        if (override || this._altered.gridInfo) {
            this._geometry.buildGrid(this._gridInfo);
        }

        this._geometry.update();

        if(override || this._altered.any) {
            this._program.bind();
        }

        if(override || this._altered.orthoFactor) {
            this._gl.uniform1f(this._uOrthoFactor, this._orthoFactor);
        }

        if(override || this._altered.orthoGamma) {
            this._gl.uniform1f(this._uOrthoGamma, this._orthoGamma);
        }

        if(override || this._altered.heatmap) {
            this._gl.uniform1i(this._uHeatmap, +this._heatmap);
        }

        if(override || this._altered.any) {
            this._program.unbind();
        }

        this._altered.reset();
    }

    @Initializable.assert_initialized()
    public frame(): void {
        if (this._gridInfo === undefined) {
            return;
        }

        const size = this._target.size;
        this._gl.viewport(0, 0, size[0], size[1]);

        this._gl.depthMask(true);
        this._gl.depthFunc(this._gl.LESS);
        this._gl.enable(this._gl.BLEND);
        this._gl.disable(this._gl.CULL_FACE);

        Buffers.orthoTex.bind(this._gl.TEXTURE0);
        this._colorSchemeTex.bind(this._gl.TEXTURE1);

        this._program.bind();

        this._gl.uniformMatrix4fv(
            this._uViewProjection, false, Interaction.camera.viewProjection);
        this._gl.uniform2fv(this._uNdcOffset, this._ndcOffset);
        const range = Passes.ortho.range;
        if(range) this._gl.uniform2fv(this._uOrthoRange, range);

        this._target.bind();

        this._geometry.bind();
        this._geometry.draw();
        this._geometry.unbind();

        this._program.unbind();

        Buffers.orthoTex.unbind(this._gl.TEXTURE0);

        this._gl.depthMask(true);
        this._gl.disable(this._gl.BLEND);
        this._gl.enable(this._gl.CULL_FACE);
    }

    public set invalidate(invalidate: (force: boolean) => void) {
        this._invalidate = invalidate;
    }

    public set gridInfo(gridInfo: ExtendedGridInfo[]) {
        this.assertInitialized();
        this._gridInfo = gridInfo;
        this._altered.alter('gridInfo');
    }

    public set gridOffsets(offsets: number[]) {
        this.assertInitialized();
        this._geometry.offsets = offsets;
    }

    public set target(target: Framebuffer) {
        this.assertInitialized();
        this._target = target;
    }

    public set ndcOffset(offset: GLfloat2) {
        this.assertInitialized();
        this._ndcOffset = offset;
    }

    public set orthoFactor(factor: number) {
        this._orthoFactor = factor;
        this._altered.alter('orthoFactor');
    }

    public set orthoGamma(factor: number) {
        this._orthoGamma = factor;
        this._altered.alter('orthoGamma');
    }

    public set heatmap(factor: boolean) {
        this._heatmap = factor;
        this._altered.alter('heatmap');
    }

    public set colorScheme(scheme: string) {
        this._colorScheme = GridPass.ColorSchemes.get(scheme);
        this.updateColorScheme();
    }

    public set colorSchemeSteps(steps: number) {
        this._colorSchemeSteps = steps;
        this.updateColorScheme();
    }

    protected updateColorScheme(): void {
        ColorScale.fromPreset(
            this._colorScheme.source,
            this._colorScheme.preset,
            this._colorSchemeSteps
        ).then((scale: ColorScale) => {
            const data = scale.bitsUI8(Color.Space.RGB, false);
            this._colorSchemeTex.resize(this._colorSchemeSteps, 1);
            this._colorSchemeTex.data(data);
            this._altered.alter('colorScheme');
            this._invalidate(false);
        });
    }

    public get altered(): boolean {
        return this._altered.any;
    }
}
