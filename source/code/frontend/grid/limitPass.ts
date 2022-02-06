import {
    Camera,
    ChangeLookup,
    Context,
    Framebuffer,
    Initializable,
    Program,
    Shader,
} from 'webgl-operate';

import { GLfloat2 } from 'shared/types/tuples' ;
import { HandleGeometry } from './handleGeometry';
import { LabelInfo } from './gridLabelPass';
import { View } from 'frontend/globals';

export class LimitPass extends Initializable {
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        selected: false
    });

    protected _context: Context;
    protected _gl: WebGL2RenderingContext;

    protected _target: Framebuffer;

    protected _ndcOffset: GLfloat2 = [0.0, 0.0];

    protected _program: Program;

    protected _selected = -1;

    protected _uViewProjection: WebGLUniformLocation;
    protected _uNdcOffset: WebGLUniformLocation;
    protected _uDir: WebGLUniformLocation;
    protected _uUp: WebGLUniformLocation;
    protected _uPos: WebGLUniformLocation;
    protected _uFactor: WebGLUniformLocation;
    protected _uSelected: WebGLUniformLocation;

    protected _geometry: HandleGeometry;

    protected _labels: LabelInfo[];

    public constructor(context: Context) {
        super();
        this._context = context;
        this._gl = context.gl;

        this._program = new Program(this._context);
        this._geometry = new HandleGeometry(this._context);
    }

    @Initializable.initialize()
    public initialize(): boolean {
        this._geometry.initialize();

        const vert = new Shader(
            this._context, this._gl.VERTEX_SHADER, 'limit.vert');
        vert.initialize(require('./limit.vert'));
        const frag = new Shader(
            this._context, this._gl.FRAGMENT_SHADER, 'limit.frag');
        frag.initialize(require('./limit.frag'));

        this._program.initialize([vert, frag], false);

        this._program.link();

        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uNdcOffset = this._program.uniform('u_ndcOffset');
        this._uDir = this._program.uniform('u_dir');
        this._uUp = this._program.uniform('u_up');
        this._uPos = this._program.uniform('u_pos');
        this._uFactor = this._program.uniform('u_factor');
        this._uSelected = this._program.uniform('u_selected');

        this._program.bind();
        this._gl.uniform1ui(this._uSelected, this._selected);
        this._program.unbind();

        return true;
    }

    @Initializable.uninitialize()
    public uninitialize(): void {
        this._geometry.uninitialize();
        this._program.uninitialize();
    }

    @Initializable.assert_initialized()
    public update(override = false): void {
        if (override || this._altered.selected) {
            this._program.bind();
            this._gl.uniform1ui(this._uSelected, this._selected);
            this._program.unbind();
        }

        this._altered.reset();
    }

    @Initializable.assert_initialized()
    public frame(): void {
        if(!this._labels) return;

        const size = this._target.size;
        this._gl.viewport(0, 0, size[0], size[1]);

        this._gl.depthMask(false);
        this._gl.depthFunc(this._gl.LESS);
        this._gl.enable(this._gl.BLEND);
        this._gl.disable(this._gl.CULL_FACE);

        this._program.bind();

        this._gl.uniformMatrix4fv(
            this._uViewProjection, false, View.camera.viewProjection);
        this._gl.uniform2fv(this._uNdcOffset, this._ndcOffset);

        this._target.bind();

        this._geometry.bind();
        for(const label of this._labels) {
            this._gl.uniform3fv(this._uDir, label.dir);
            this._gl.uniform3fv(this._uUp, label.up);
            this._gl.uniform3fv(this._uPos, label.pos);
            this._gl.uniform1f(this._uFactor, 0);
            this._geometry.draw();
            this._gl.uniform1f(this._uFactor, 1);
            this._geometry.draw();
        }
        this._geometry.unbind();

        this._program.unbind();

        this._gl.depthMask(true);
        this._gl.disable(this._gl.BLEND);
        this._gl.enable(this._gl.CULL_FACE);
    }

    public set labelInfo(info: LabelInfo[]) {
        this._labels = info;
    }

    public set target(target: Framebuffer) {
        this.assertInitialized();
        this._target = target;
    }

    public set ndcOffset(offset: GLfloat2) {
        this.assertInitialized();
        this._ndcOffset = offset;
    }

    public get altered(): boolean {
        return this._altered.any;
    }

    public set selected(selected: number) {
        this._selected = selected;
        this._altered.alter('selected');
    }
}
