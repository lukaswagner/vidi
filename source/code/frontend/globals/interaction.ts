import {
    Camera,
    EventHandler,
    EventProvider,
    Invalidate,
    Navigation,
    vec2,
    vec3,
} from 'webgl-operate';
import { Buffers } from './buffers';
import { Formats } from './formats';

type Callback = (id: number, pos: vec2) => void;
type Listener = {
    move: Callback,
    click: Callback,
    mask: number,
    lastId: number
}

export class Interaction {
    protected _gl: WebGL2RenderingContext;
    protected _camera: Camera;
    protected _navigation: Navigation;
    protected _eventHandler: EventHandler;
    protected _listeners: Listener[] = [];

    protected static _instance: Interaction;

    protected constructor(
        gl: WebGL2RenderingContext,
        invalidate: Invalidate,
        eventProvider: EventProvider
    ) {
        this._gl = gl;

        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(-3.0, 3.0, 5.0);
        this._camera.near = 0.1;
        this._camera.far = 64.0;

        this._navigation = new Navigation(invalidate, eventProvider);
        this._navigation.camera = this._camera;
        // @ts-expect-error: webgl-operate mouse wheel zoom is broken
        this._navigation._wheelZoom = { process: () => { } };

        this._eventHandler = new EventHandler(invalidate, eventProvider);
        this._eventHandler.pushMouseMoveHandler(this.move.bind(this));
        this._eventHandler.pushClickHandler(this.click.bind(this));
    }

    public static initialize(
        gl: WebGL2RenderingContext,
        invalidate: Invalidate,
        eventProvider: EventProvider
    ): void {
        this._instance = new Interaction(gl, invalidate, eventProvider);
    }

    public static get camera(): Camera {
        return this._instance._camera;
    }

    public static get navigation(): Navigation {
        return this._instance._navigation;
    }

    public static get altered(): boolean {
        return Interaction.camera.altered;
    }

    public static update(): void {
        Interaction.navigation.update();
        this._instance._eventHandler.update();
    }

    protected move(latests: Array<MouseEvent>): void {
        const event: MouseEvent = latests[latests.length - 1];
        const mouse = this._eventHandler.offsets(event)[0];
        const pos = [mouse[0], Buffers.ssFBO.height - mouse[1]];
        const { mask, id } = this.pick(pos);

        this._listeners
            .filter((l) => l.move)
            .forEach((l) => {
                const match = (l.mask & mask) !== 0;
                const newId = match ? id : -1;
                if(newId === l.lastId) return;
                l.move(newId, pos);
                l.lastId = newId;
            });
    }

    protected click(latests: Array<MouseEvent>): void {
        const event: MouseEvent = latests[latests.length - 1];
        const mouse = this._eventHandler.offsets(event)[0];
        const pos = [mouse[0], Buffers.ssFBO.height - mouse[1]];
        const { mask, id } = this.pick(pos);

        this._listeners
            .filter((l) => l.click)
            .filter((l) => l.mask & mask)
            .forEach((l) => l.click(id, pos));
    }

    protected pick(mouse: vec2): { mask: number, id: number } {
        const buf = new ArrayBuffer(9);
        const byteView = new Uint8Array(buf);

        const fbo = Buffers.ssFBO;
        fbo.bind(this._gl.READ_FRAMEBUFFER);
        this._gl.readBuffer(this._gl.COLOR_ATTACHMENT1);
        this._gl.readPixels(
            mouse[0], mouse[1], 1, 1,
            Formats.index[1], Formats.index[2], byteView, 2);
        this._gl.readBuffer(this._gl.COLOR_ATTACHMENT2);
        this._gl.readPixels(
            mouse[0], mouse[1], 1, 1,
            Formats.index[1], Formats.index[2], byteView, 5);
        fbo.unbind(this._gl.READ_FRAMEBUFFER);

        const mask = byteView[2];
        const id = new Uint32Array(buf, 4, 1)[0];
        return { mask, id };
    }

    public static register(
        { mask, move, click }:
        { mask: number, move?: Callback, click?: Callback }
    ): void {
        this._instance._listeners.push({ mask, move, click, lastId: -1 });
    }
}
