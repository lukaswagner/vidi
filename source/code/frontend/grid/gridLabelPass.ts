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
    Text,
    vec3
} from 'webgl-operate';

export type LabelInfo = {
    name: string,
    pos: vec3,
    dir: vec3,
    up: vec3
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
        // text is actually rendered on the back face
        this._gl.cullFace(this._gl.FRONT);
        super.frame();
        this._gl.cullFace(this._gl.BACK);
        this._gl.enable(this._gl.DEPTH_TEST);
        this._gl.disable(this._gl.BLEND);
    }

    protected setupLabels(): void {
        this.labels = [];

        this._labelInfo.forEach((i) => {
            const l = new Position3DLabel(new Text(i.name), Label.Type.Static);
            l.fontFace = this._fontFace;
            l.fontSize = 0.15;
            l.lineAnchor = Label.LineAnchor.Center;
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
