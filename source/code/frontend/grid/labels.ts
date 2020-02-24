import { LabelRenderPass, Position3DLabel, FontFace, Context, Camera, DefaultFramebuffer, Label, Text } from "webgl-operate";

type LabelInfo = {
    name: string,
    pos: [number, number, number],
    dir: [number, number, number],
    up: [number, number, number]
}

export class Labels {
    protected _context: Context;

    protected _labelPass: LabelRenderPass;
    protected _fontFace: FontFace;

    protected _labelInfo: LabelInfo[];

    constructor(context: Context, camera: Camera, fbo: DefaultFramebuffer) {
        this._labelPass = new LabelRenderPass(context);
        this._labelPass.initialize();
        this._labelPass.camera = camera;
        this._labelPass.target = fbo;
        this._labelPass.depthMask = false;

        FontFace.fromFile('./fonts/roboto/roboto.fnt', context)
            .then((fontFace) => {
                for (const label of this._labelPass.labels) {
                    label.fontFace = fontFace;
                }
                this._fontFace = fontFace;
                this.setupLabels();
            });
    }

    set labels(labelInfo: LabelInfo[]) {
        this._labelInfo = labelInfo;
    }

    setupLabels(): void {
        this._labelPass.labels = [];

        this._labelInfo.forEach((i) => {
            const l = new Position3DLabel(new Text(i.name), Label.Type.Static);
            l.fontFace = this._fontFace;
            l.fontSize = 1;
            l.lineAnchor = Label.LineAnchor.Top;
            l.alignment = Label.Alignment.Center;
            l.position = i.pos;
            l.direction = i.dir;
            l.up = i.up;
            l.color.fromRGB(0, 0, 0);
            this._labelPass.labels.push(l);
        });
    }

    update(): void {
        this._labelPass.update();
    }

    frame(): void {
        this._labelPass.frame();
    }

    uninitialize(): void {
        this._labelPass.uninitialize();
    }
}
