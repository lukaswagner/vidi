import {
    ChangeLookup,
    Context,
    Framebuffer,
    Initializable,
    Program,
    Shader,
} from 'webgl-operate';

import { Interaction, Passes } from 'frontend/globals';
import { Buffers } from 'frontend/globals/buffers';
import { ExtendedGridInfo } from './gridInfo';
import { GLfloat2 } from 'shared/types/tuples' ;
import { GridGeometry } from './gridGeometry';

export class GridPass extends Initializable {
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        gridInfo: false,
        orthoFactor: false
    });

    protected _context: Context;
    protected _gl: WebGL2RenderingContext;

    protected _target: Framebuffer;

    protected _ndcOffset: GLfloat2 = [0.0, 0.0];

    protected _program: Program;

    protected _uViewProjection: WebGLUniformLocation;
    protected _uNdcOffset: WebGLUniformLocation;
    protected _uOrthoRange: WebGLUniformLocation;
    protected _uOrthoFactor: WebGLUniformLocation;

    protected _geometry: GridGeometry;
    protected _gridInfo: ExtendedGridInfo[];
    protected _orthoFactor = 1;

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

        this._program.bind();
        this._gl.uniform1i(this._program.uniform('u_orthoViews'), 0);
        this._program.unbind();

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

        if(override || this._altered.orthoFactor) {
            this._program.bind();
            this._gl.uniform1f(this._uOrthoFactor, this._orthoFactor);
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

        this._gl.depthMask(false);
        this._gl.depthFunc(this._gl.LESS);
        this._gl.enable(this._gl.BLEND);
        this._gl.disable(this._gl.CULL_FACE);

        Buffers.orthoTex.bind(this._gl.TEXTURE0);

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

    public get altered(): boolean {
        return this._altered.any;
    }
}
