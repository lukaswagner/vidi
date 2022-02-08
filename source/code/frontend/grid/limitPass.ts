import {
    ChangeLookup,
    Context,
    Framebuffer,
    Initializable,
    Program,
    Shader,
    vec2,
    vec3,
} from 'webgl-operate';

import { Interaction, Passes } from 'frontend/globals';
import { clipToWorld, intersectLinePlane } from 'frontend/util/math';
import { GLfloat2 } from 'shared/types/tuples' ;
import { HandleGeometry } from './handleGeometry';
import { LabelInfo } from './gridLabelPass';

export class LimitPass extends Initializable {
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        selected: false,
        handlePositions: false
    });

    protected _context: Context;
    protected _gl: WebGL2RenderingContext;

    protected _target: Framebuffer;

    protected _ndcOffset: GLfloat2 = [0.0, 0.0];

    protected _program: Program;

    protected _uViewProjection: WebGLUniformLocation;
    protected _uNdcOffset: WebGLUniformLocation;
    protected _uDir: WebGLUniformLocation;
    protected _uUp: WebGLUniformLocation;
    protected _uPos: WebGLUniformLocation;
    protected _uFactor: WebGLUniformLocation;
    protected _uSelected: WebGLUniformLocation;
    protected _uHandlePositions: WebGLUniformLocation;

    protected _geometry: HandleGeometry;

    protected _hoveredHandle = -1;
    protected _grabbedHandle = -1;

    protected _handlePositions = new Float32Array([-1, 1, -1, 1, -1, 1]);

    public constructor(context: Context) {
        super();
        this._context = context;
        this._gl = context.gl;

        this._program = new Program(this._context);
        this._geometry = new HandleGeometry(this._context);
    }

    protected getGrabbedLabel(): LabelInfo {
        const dir = vec3.fromValues(
            this._grabbedHandle & 0b1,
            this._grabbedHandle >> 1 & 0b1,
            this._grabbedHandle >> 2 & 0b1);

        return Passes.gridLabels.labelPositions.filter((l) =>
            l.dir.every((v, i) => (v === 0) === (dir[i] === 0)))[0];
    }

    protected getPositionOnLabelPlane(label: LabelInfo, pos: vec2): vec3 {
        const cam = Interaction.camera;

        const clip = vec2.clone(pos);
        vec2.div(clip, clip, cam.viewport);
        vec2.scaleAndAdd(clip, [-1, -1], clip, 2);

        const start = clipToWorld([clip[0], clip[1], 0.5]);
        const end = clipToWorld([clip[0], clip[1], 1]);
        const ray = vec3.sub(vec3.create(), end, start);
        vec3.normalize(ray, ray);

        const normal = vec3.cross(vec3.create(), label.dir, label.up);

        return intersectLinePlane(cam.eye, ray, label.pos, normal);
    }

    protected updateHandlePos(pos: vec2): void {
        const label = this.getGrabbedLabel();
        const posOnPlane = this.getPositionOnLabelPlane(label, pos);

        const axis = posOnPlane.findIndex((_, i) => label.dir[i] !== 0);
        this._handlePositions[axis * 2 + (this._grabbedHandle >> 3 & 0b1)] =
            posOnPlane[axis];
        this._altered.alter('handlePositions');
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
        this._uHandlePositions = this._program.uniform('u_handlePositions');

        this._program.bind();
        this._gl.uniform1ui(this._uSelected, this._hoveredHandle);
        this._gl.uniform1fv(this._uHandlePositions, this._handlePositions);
        this._program.unbind();

        Interaction.register({
            mask: 1 << 6,
            move: (id, pos) => {
                if(id !== this._hoveredHandle) this._altered.alter('selected');
                this._hoveredHandle = id;
                if(this._grabbedHandle > -1) this.updateHandlePos(pos);
            },
            down: (id) => {
                this._grabbedHandle = id;
                this._altered.alter('selected');
            },
            up: () => {
                this._grabbedHandle = -1;
                this._altered.alter('selected');
            }});

        return true;
    }

    @Initializable.uninitialize()
    public uninitialize(): void {
        this._geometry.uninitialize();
        this._program.uninitialize();
    }

    @Initializable.assert_initialized()
    public update(override = false): void {

        if (override || this._altered.any) {
            this._program.bind();
        }

        if (override || this._altered.selected) {
            this._gl.uniform1ui(this._uSelected, this._grabbedHandle === -1 ? this._hoveredHandle : this._grabbedHandle);
        }

        if (override || this._altered.handlePositions) {
            this._gl.uniform1fv(this._uHandlePositions, this._handlePositions);
        }

        if (override || this._altered.any) {
            this._program.unbind();
        }

        this._altered.reset();
    }

    @Initializable.assert_initialized()
    public frame(): void {
        const labels = Passes.gridLabels.labelPositions;
        if(!labels) return;

        const size = this._target.size;
        this._gl.viewport(0, 0, size[0], size[1]);

        this._gl.depthMask(false);
        this._gl.depthFunc(this._gl.LESS);
        this._gl.enable(this._gl.BLEND);
        this._gl.disable(this._gl.CULL_FACE);

        this._program.bind();

        this._gl.uniformMatrix4fv(
            this._uViewProjection, false, Interaction.camera.viewProjection);
        this._gl.uniform2fv(this._uNdcOffset, this._ndcOffset);

        this._target.bind();

        this._geometry.bind();
        for(const label of labels) {
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
}
