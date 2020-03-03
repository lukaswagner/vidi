import { LabelRenderPass, Position3DLabel, FontFace, Context, Camera, DefaultFramebuffer, Label, Text, Initializable, ChangeLookup, Framebuffer } from "webgl-operate";

type LabelInfo = {
    name: string,
    pos: [number, number, number],
    dir: [number, number, number],
    up: [number, number, number]
}

export class GridLabelPass extends LabelRenderPass {
    protected readonly _labelsAltered = Object.assign(new ChangeLookup(), {
        any: false,
        labels: false,
    });

    protected _context: Context;
    protected _gl: WebGLRenderingContext;

    protected _fontFace: FontFace;
    protected _target: Framebuffer;
    protected _camera: Camera;

    protected _labelInfo: LabelInfo[];

    constructor(context: Context) {
        super(context);
        this._context = context;
        this._gl = context.gl;

    }

    loadFont(font: string, invalidate: (force?: boolean) => void): void {
        FontFace.fromFile(font, this._context)
            .then((fontFace) => {
                for (const label of this.labels) {
                    label.fontFace = fontFace;
                }
                this._fontFace = fontFace;
                invalidate();
            });
    }

    set labelInfo(labelInfo: LabelInfo[]) {
        this._labelInfo = labelInfo;
        this._labelsAltered.alter('labels');
    }

    protected setupLabels(): void {
        this.labels = [];

        this._labelInfo.forEach((i) => {
            const l = new Position3DLabel(new Text(i.name), Label.Type.Static);
            l.fontFace = this._fontFace;
            l.fontSize = 0.15;
            l.lineAnchor = Label.LineAnchor.Top;
            l.alignment = Label.Alignment.Center;
            l.position = i.pos;
            l.direction = i.dir;
            l.up = i.up;
            l.color.fromRGB(0, 0, 0);
            this.labels.push(l);
        });
    }

    @Initializable.assert_initialized()
    update(override: boolean = false): void {
        super.update(override);

        if (override || this._labelsAltered.labels) {
            this.setupLabels();
        }

        this._labelsAltered.reset();
    }

    @Initializable.assert_initialized()
    frame(): void {
        this._gl.disable(this._gl.CULL_FACE);
        super.frame();
        this._gl.enable(this._gl.CULL_FACE);
        this._gl.enable(this._gl.DEPTH_TEST);
        this._gl.disable(this._gl.BLEND);
    }
}
