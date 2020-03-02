import { ChangeLookup, Initializable, Context, Framebuffer, Camera, Program, Shader } from "webgl-operate";
import { GridGeometry } from "./gridGeometry";
import { GridInfo } from "./gridInfo";

export class GridPass extends Initializable {
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        gridInfo: false,
    });

    protected _context: Context;
    protected _gl: WebGLRenderingContext;

    protected _target: Framebuffer;
    protected _camera: Camera;

    protected _program: Program;

    protected _uViewProjection: WebGLUniformLocation;

    protected _geometry: GridGeometry;
    protected _gridInfo: GridInfo[];

    constructor(context: Context) {
        super();
        this._context = context;
        this._gl = context.gl;

        this._program = new Program(this._context);
        this._geometry = new GridGeometry(this._context);
    }

    @Initializable.initialize()
    initialize(): boolean {
        this._geometry.initialize();

        this._context.enable(['OES_standard_derivatives']);

        const vert = new Shader(this._context, this._gl.VERTEX_SHADER);
        vert.initialize(require('./grid.vert'));
        const frag = new Shader(this._context, this._gl.FRAGMENT_SHADER);
        frag.initialize(require('./grid.frag'));

        this._program.initialize([vert, frag], false);

        this._program.link();

        this._uViewProjection = this._program.uniform('u_viewProjection');

        return true;
    }

    @Initializable.uninitialize()
    uninitialize(): void {
        this._geometry.uninitialize();
        this._program.uninitialize();

        this._uViewProjection = undefined;
    }

    @Initializable.assert_initialized()
    update(override: boolean = false): void {
        if (override || this._altered.gridInfo) {
            this._geometry.buildGrid(this._gridInfo);
        }
    }

    @Initializable.assert_initialized()
    frame(): void {
        if(this._gridInfo === undefined) {
            return;
        }

        const size = this._target.size;
        this._gl.viewport(0, 0, size[0], size[1]);

        // has to be re-enabled afterwards
        this._gl.disable(this._gl.DEPTH_TEST);

        this._program.bind();

        this._gl.uniformMatrix4fv(
            this._uViewProjection, false, this._camera.viewProjection);

        this._target.bind();

        this._geometry.bind();
        this._geometry.draw();
        this._geometry.unbind();

        this._program.unbind();

        this._gl.enable(this._gl.DEPTH_TEST);
    }

    set gridInfo(gridInfo: GridInfo[]) {
        this.assertInitialized();
        this._gridInfo = gridInfo;
        this._altered.alter('gridInfo');
    }

    set target(target: Framebuffer) {
        this.assertInitialized();
        this._target = target;
    }

    set camera(camera: Camera) {
        this.assertInitialized();
        if (this._camera === camera) {
            return;
        }
        this._camera = camera;
    }
}
