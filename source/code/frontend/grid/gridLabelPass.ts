import {
    Camera,
    ChangeLookup,
    Context,
    FontFace,
    Framebuffer,
    Initializable,
    Label,
    LabelRenderPass,
    Position3DLabel,
    Text
} from 'webgl-operate';

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
        fontFace: false,
    });

    protected _context: Context;
    protected _gl: WebGLRenderingContext;

    protected _fontFace: FontFace;
    protected _target: Framebuffer;
    protected _camera: Camera;

    protected _labelInfo: LabelInfo[];

    public constructor(context: Context) {
        super(context);
        this._context = context;
        this._gl = context.gl;

    }

    public loadFont(font: string, invalidate: (force?: boolean) => void): void {
        FontFace.fromFile(font, this._context)
            .then((fontFace) => {
                this._fontFace = fontFace;
                this._labelsAltered.alter('fontFace');
                invalidate();
            });
    }

    public set labelInfo(labelInfo: LabelInfo[]) {
        this._labelInfo = labelInfo;
        this._labelsAltered.alter('labels');
    }

    @Initializable.assert_initialized()
    public update(override: boolean = false): void {
        if (override || this._labelsAltered.labels) {
            this.setupLabels();
        }

        if (override || this._labelsAltered.fontFace) {
            for (const label of this.labels) {
                label.fontFace = this._fontFace;
            }
        }

        // update after own updates to catch changes to labels
        super.update(override);

        this._labelsAltered.reset();
    }

    @Initializable.assert_initialized()
    public frame(): void {
        this._gl.disable(this._gl.CULL_FACE);
        super.frame();
        this._gl.enable(this._gl.CULL_FACE);
        this._gl.enable(this._gl.DEPTH_TEST);
        this._gl.disable(this._gl.BLEND);
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

    public get altered(): boolean {
        return this._altered.any || this._labelsAltered.any;
    }
}
