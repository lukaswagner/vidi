import { Alpha, AlphaMode } from 'frontend/util/alpha';

import {
    ChangeLookup,
    Context,
    Framebuffer,
    Initializable,
    Program,
    Shader,
    mat4,
} from 'webgl-operate';

import { Interaction, Passes } from 'frontend/globals';
import { GLfloat2 } from 'shared/types/tuples';
import { PointCloudGeometry } from './pointCloudGeometry';

export class RefLinePass extends Initializable {
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        useDiscard: false,
        model: false,
        baseAxis: false,
        baseValue: false,
        selected: false,
        drawAll: false
    });

    protected _context: Context;
    protected _gl: WebGL2RenderingContext;

    protected _target: Framebuffer;

    protected _aspectRatio: GLfloat;
    protected _useDiscard: boolean;
    protected _ndcOffset: GLfloat2 = [0.0, 0.0];
    protected _model: mat4;
    protected _selected = -1;
    protected _drawAll: boolean;

    protected _program: Program;
    protected _alpha: Alpha;
    protected _baseAxis: number;
    protected _baseValue: number[];

    protected _uModel: WebGLUniformLocation;
    protected _uViewProjection: WebGLUniformLocation;
    protected _uViewProjectionInverse: WebGLUniformLocation;
    protected _uNdcOffset: WebGLUniformLocation;
    protected _uCameraPosition: WebGLUniformLocation;
    protected _uUseDiscard: WebGLUniformLocation;
    protected _uMfAlpha: WebGLUniformLocation;
    protected _uBaseAxis: WebGLUniformLocation;
    protected _uBaseValue: WebGLUniformLocation;
    protected _uMaxAlpha: WebGLUniformLocation;
    protected _uAspect: WebGLUniformLocation;

    protected _geometries: PointCloudGeometry[] = [];
    protected _selectedLocation = 4;

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
            this._context, this._gl.VERTEX_SHADER, 'refLine.vert');
        vert.initialize(require('./refLine.vert'));
        const frag = new Shader(
            this._context, this._gl.FRAGMENT_SHADER, 'refLine.frag');
        frag.initialize(require('./refLine.frag'));

        this._program.initialize([vert, frag], false);

        this._program.link();

        this._uModel = this._program.uniform('u_model');
        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uViewProjectionInverse =
            this._program.uniform('u_viewProjectionInverse');
        this._uNdcOffset = this._program.uniform('u_ndcOffset');
        this._uCameraPosition = this._program.uniform('u_cameraPosition');
        this._uUseDiscard = this._program.uniform('u_useDiscard');
        this._uBaseAxis = this._program.uniform('u_baseAxis');
        this._uBaseValue = this._program.uniform('u_baseValue');
        this._uMaxAlpha = this._program.uniform('u_maxAlpha');
        this._uAspect = this._program.uniform('u_aspect');

        this._alpha = new Alpha(
            this._gl, this._program, AlphaMode.AlphaToCoverage);

        return true;
    }

    @Initializable.uninitialize()
    public uninitialize(): void {
        this._geometries.forEach((g) => g.uninitialize());
        this._program.uninitialize();

        this._uViewProjection = undefined;
        this._uViewProjectionInverse = undefined;
        this._uNdcOffset = undefined;
        this._uCameraPosition = undefined;
        this._uUseDiscard = undefined;
    }

    @Initializable.assert_initialized()
    public update(): void {
        this._program.bind();

        if (this._altered.model) {
            this._gl.uniformMatrix4fv(this._uModel, false, this._model);
        }

        if (this._altered.useDiscard) {
            this._gl.uniform1i(this._uUseDiscard, Number(this._useDiscard));
        }

        if (this._altered.baseAxis) {
            this._gl.uniform1i(this._uBaseAxis, this._baseAxis);
        }

        if (this._altered.baseAxis || this._altered.baseValue) {
            this._gl.uniform1f(
                this._uBaseValue, this._baseValue?.[this._baseAxis]);
        }

        this._program.unbind();

        this._altered.reset();
    }

    @Initializable.assert_initialized()
    public frame(frameNumber: number): void {
        if(this._geometries.length === 0) return;

        if(this._baseAxis < 0) return;

        this._program.bind();

        this._gl.uniformMatrix4fv(
            this._uViewProjection, false, Interaction.camera.viewProjection);
        this._gl.uniformMatrix4fv(
            this._uViewProjectionInverse,
            false,
            Interaction.camera.viewProjectionInverse);
        this._gl.uniform2fv(this._uNdcOffset, this._ndcOffset);
        this._gl.uniform3fv(this._uCameraPosition, Interaction.camera.eye);
        this._gl.uniform1f(
            this._uAspect, this._target.height / this._target.width);

        this._target.bind();
        this._gl.drawBuffers([this._gl.COLOR_ATTACHMENT0]);

        this._gl.disable(this._gl.CULL_FACE);
        this._alpha.enable(frameNumber);

        const draw = (): void => {
            if(this._drawAll) {
                this._geometries.forEach((g, i) => {
                    this._gl.uniform1f(this._uMaxAlpha, 0.6);
                    g.bind();
                    const offset = Passes.points.anyColumn()?.chunks[i].offset;
                    Passes.points.bindSelection(this._selectedLocation, offset);
                    g.draw();
                    Passes.points.unbindSelection();
                    g.unbind();
                });
            } else if(this._selected > -1) {
                this._gl.uniform1f(this._uMaxAlpha, 0.9);
                let i = this._geometries
                    .findIndex((v) => v.offset > this._selected);
                if(i === -1) i = this._geometries.length - 1;
                else i--;
                const g = this._geometries[i];
                const chunkOffset = g.offset;
                const instanceOffset = this._selected - chunkOffset;

                g.instanceOffset = instanceOffset;
                g.bind();
                Passes.points.bindSelection(
                    this._selectedLocation, instanceOffset);
                g.draw(1);
                Passes.points.unbindSelection();
                g.unbind();
                g.instanceOffset = 0;
            }
        };

        if(this._baseAxis < 3) {
            draw();
        } else {
            for(let i = 0; i < 3; i++) {
                this._gl.uniform1i(this._uBaseAxis, i);
                this._gl.uniform1f(this._uBaseValue, this._baseValue?.[i]);
                draw();
            }
        }

        this._alpha.disable();
        this._gl.enable(this._gl.CULL_FACE);

        this._program.unbind();
    }

    public set target(target: Framebuffer) {
        this.assertInitialized();
        this._target = target;
    }

    public set aspectRatio(aspectRation: GLfloat) {
        this.assertInitialized();
        this._aspectRatio = aspectRation;
        this._altered.alter('aspectRatio');
    }

    public set useDiscard(enabled: boolean) {
        this.assertInitialized();
        this._useDiscard = enabled;
        this._altered.alter('useDiscard');
    }

    public set ndcOffset(offset: GLfloat2) {
        this.assertInitialized();
        this._ndcOffset = offset;
    }

    public set model(model: mat4) {
        this.assertInitialized();
        if (this._model === model) {
            return;
        }
        this._model = model;
        this._altered.alter('model');
    }

    public set geometries(geom: PointCloudGeometry[]) {
        this._geometries = geom;
    }

    public get altered(): boolean {
        return this._altered.any;
    }

    public set baseAxis(axis: number) {
        this.assertInitialized();
        this._baseAxis = axis;
        this._altered.alter('baseAxis');
    }

    public set baseValue(value: number[]) {
        this.assertInitialized();
        this._baseValue = value;
        this._altered.alter('baseValue');
    }

    public set selected(selected: number) {
        this._selected = selected;
        this._altered.alter('selected');
    }

    public set drawAll(drawAll: boolean) {
        this._drawAll = drawAll;
        this._altered.alter('drawAll');
    }
}
