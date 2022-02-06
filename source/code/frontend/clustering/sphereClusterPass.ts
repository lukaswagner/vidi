import {
    ChangeLookup,
    Context,
    Framebuffer,
    Initializable,
    Invalidate,
    Program,
    Shader,
    mat4,
} from 'webgl-operate';

import { ClusterInfo } from 'worker/clustering/interface';
import { SphereGeometry } from './sphereGeometry';
import { View } from 'frontend/globals';

export class SphereClusterPass extends Initializable {
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        modelMat: false,
        data: false,
    });

    protected _context: Context;
    protected _gl: WebGL2RenderingContext;
    protected _invalidate: Invalidate;

    protected _target: Framebuffer;

    protected _program: Program;
    protected _geometry: SphereGeometry;

    protected _modelMat = mat4.create();
    protected _data: ClusterInfo[];

    protected _uModel: WebGLUniformLocation;
    protected _uViewProjection: WebGLUniformLocation;
    protected _uNumClusters: WebGLUniformLocation;

    public constructor(context: Context) {
        super();
        this._context = context;
        this._gl = context.gl as WebGL2RenderingContext;
    }

    @Initializable.initialize()
    public initialize(): boolean {
        this.initProgram();
        this.initUniforms();
        this.initGeometry();

        return true;
    }

    @Initializable.uninitialize()
    public uninitialize(): void {
        this._program.uninitialize();
        this._geometry.uninitialize();
    }

    @Initializable.assert_initialized()
    public update(): void {
        this._program.bind();
        if (this._altered.data && this._data !== undefined) {
            this._geometry.data = this._data;
            this._gl.uniform1f(this._uNumClusters, this._data.length);
        }
        if (this._altered.modelMat) {
            this._gl.uniformMatrix4fv(this._uModel, false, this._modelMat);
        }
        this._program.unbind();
        this._altered.reset();
    }

    @Initializable.assert_initialized()
    public frame(): void {
        if(this._data === undefined) return;

        this._target.bind();

        this._gl.enable(this._gl.CULL_FACE);
        this._gl.enable(this._gl.DEPTH_TEST);
        this._gl.enable(this._gl.BLEND);

        this._program.bind();

        this._gl.uniformMatrix4fv(
            this._uViewProjection, false, View.camera.viewProjection);

        this._geometry.bind();
        this._geometry.draw();
        this._geometry.unbind();

        this._program.unbind();

        this._gl.disable(this._gl.BLEND);
        this._gl.disable(this._gl.DEPTH_TEST);
        this._gl.disable(this._gl.CULL_FACE);
    }

    public get altered(): boolean {
        return this._altered.any;
    }

    public set invalidate(invalidate: Invalidate) {
        this._invalidate = invalidate;
    }

    public set target(target: Framebuffer) {
        this.assertInitialized();
        this._target = target;
    }

    public set model(mat: mat4) {
        this._modelMat = mat;
        this._altered.alter('modelMat');
    }

    public set data(data: ClusterInfo[]) {
        this._data = data;
        this._altered.alter('data');
    }

    protected initProgram(): void {
        const vert = new Shader(
            this._context, this._gl.VERTEX_SHADER, 'sphere.vert');
        vert.initialize(require('./sphere.vert'));
        const frag = new Shader(
            this._context, this._gl.FRAGMENT_SHADER, 'cluster.frag');
        frag.initialize(require('./cluster.frag'));
        this._program = new Program(this._context);
        this._program.initialize([vert, frag]);
    }

    protected initUniforms(): void {
        this._uModel = this._program.uniform('u_model');
        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uNumClusters = this._program.uniform('u_numClusters');

        this._altered.alter('modelMat');
    }

    protected initGeometry(): void {
        this._geometry = new SphereGeometry(this._context);
        this._geometry.initialize(
            this._program.attribute('a_vertex'),
            this._program.attribute('a_id'),
            this._program.attribute('a_position'),
            this._program.attribute('a_size'));
        this._geometry.build(10);
    }
}
