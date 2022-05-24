
import {
    ChangeLookup,
    Context,
    Initializable,
    Program,
    Shader,
    mat4,
} from 'webgl-operate';

import { Buffers } from 'frontend/globals/buffers';
import { MinMaxPass } from './minMaxPass';
import { Passes } from 'frontend/globals';

export class OrthoPass extends Initializable {
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        model: false
    });

    protected _context: Context;
    protected _gl: WebGL2RenderingContext;
    protected _minMaxPass: MinMaxPass;

    protected _model: mat4;

    protected _program: Program;

    protected _uModel: WebGLUniformLocation;
    protected _uViewProjection: WebGLUniformLocation;
    protected _uChannel: WebGLUniformLocation;

    protected _views: mat4[];

    protected _minMax: [number, number];

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
            this._context, this._gl.VERTEX_SHADER, 'ortho.vert');
        vert.initialize(require('./ortho.vert'));
        const frag = new Shader(
            this._context, this._gl.FRAGMENT_SHADER, 'ortho.frag');
        frag.initialize(require('./ortho.frag'));

        this._program.initialize([vert, frag], false);

        this._program.link();

        this._uModel = this._program.uniform('u_model');
        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uChannel = this._program.uniform('u_channel');

        const ortho = mat4.ortho(mat4.create(), -1, 1, -1, 1, 0, 3);
        const mats = [
            mat4.lookAt(mat4.create(), [0, 0, 1], [0, 0, 0], [0, 1, 0]),
            mat4.lookAt(mat4.create(), [1, 0, 0], [0, 0, 0], [0, 1, 0]),
            mat4.lookAt(mat4.create(), [0, 1, 0], [0, 0, 0], [0, 0, -1]),
        ];
        this._views = mats.map((m) => mat4.mul(m, ortho, m));

        this._minMaxPass = new MinMaxPass(this._context);

        return true;
    }

    @Initializable.uninitialize()
    public uninitialize(): void {
        this._program.uninitialize();
    }

    @Initializable.assert_initialized()
    public update(): void {
        this._program.bind();

        if (this._altered.model) {
            this._gl.uniformMatrix4fv(this._uModel, false, this._model);
        }

        this._program.unbind();

        this._altered.reset();
    }

    @Initializable.assert_initialized()
    public frame(): void {
        const geom = Passes.points.geometries;
        if(geom.length === 0) return;

        const target = Buffers.orthoFBO;

        const size = target.size;
        this._gl.viewport(0, 0, size[0], size[1]);

        this._gl.disable(this._gl.DEPTH_TEST);
        const prevSrc = this._gl.getParameter(this._gl.BLEND_SRC_RGB);
        const prevDst = this._gl.getParameter(this._gl.BLEND_DST_RGB);
        this._gl.enable(this._gl.BLEND);
        this._gl.blendFunc(this._gl.ONE, this._gl.ONE);

        this._program.bind();

        target.bind();
        this._gl.drawBuffers([this._gl.COLOR_ATTACHMENT0]);
        this._gl.clearBufferfv(this._gl.COLOR, 0, [0, 0, 0, 0]);
        for(let i = 0; i < 3; i++) {
            this._gl.uniformMatrix4fv(
                this._uViewProjection, false, this._views[i]);
            this._gl.uniform1ui(this._uChannel, i);

            geom.forEach((g) => {
                g.bind();
                g.drawPoints();
                g.unbind();
            });
        }

        this._program.unbind();

        this._gl.enable(this._gl.DEPTH_TEST);
        this._gl.disable(this._gl.BLEND);
        this._gl.blendFunc(prevSrc, prevDst);

        if(!this._minMaxPass.initialized) this._minMaxPass.initialize();
        this._minMax = this._minMaxPass.frame();
    }

    public set model(model: mat4) {
        this.assertInitialized();
        if (this._model === model) {
            return;
        }
        this._model = model;
        this._altered.alter('model');
    }

    public get altered(): boolean {
        return this._altered.any;
    }

    public get minMax(): MinMaxPass {
        return this._minMaxPass;
    }

    public get range(): [number, number] {
        return this._minMax;
    }

    public reset(): void {
        this._minMax = undefined;
        this._minMaxPass.reset();
    }
}
