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

export enum ListenerMask {
    Points = 1 << 7,
    Limits = 1 << 6
}

type Callback = (id: number, pos: vec2) => void;
type ListenerConfig = {
    move?: Callback,
    click?: Callback,
    down?: Callback,
    up?: Callback,
    mask: number
}
type Listener = ListenerConfig & {
    move?: Callback,
    lastId: number
}

export class Interaction {
    protected _gl: WebGL2RenderingContext;
    protected _camera: Camera;
    protected _navigation: Navigation;
    protected _eventHandler: EventHandler;

    protected _listeners: Listener[] = [];
    protected _currentDownListener: Listener;
    protected _lassoActive: boolean;

    protected _limitListener: () => void;

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
        this._eventHandler.pushMouseMoveHandler(this.mouseMove.bind(this));
        this._eventHandler.pushClickHandler(this.mouseClick.bind(this));
        this._eventHandler.pushMouseDownHandler(this.mouseDown.bind(this));
        this._eventHandler.pushMouseUpHandler(this.mouseUp.bind(this));
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
        if(this._instance._lassoActive) return;
        this._instance._eventHandler.update();
        if(!this._instance._currentDownListener)
            Interaction.navigation.update();
    }

    protected getPos(events: Array<MouseEvent>): vec2 {
        const event: MouseEvent = events[events.length - 1];
        const mouse = this._eventHandler.offsets(event)[0];
        return [mouse[0], Buffers.ssFBO ? Buffers.ssFBO.height - mouse[1] : 0];
    }

    protected mouseMove(events: Array<MouseEvent>): void {
        const pos = this.getPos(events);
        const { mask, id } = this.pick(pos);

        const listeners = this._listeners
            .filter((l) => l.move);

        listeners.forEach((l) => {
            const match = (l.mask & mask) !== 0;
            const newId = match ? id : -1;
            if (newId === l.lastId &&
                newId === -1 &&
                l !== this._currentDownListener
            ) {
                return;
            }
            l.move(newId, pos);
            l.lastId = newId;
        });
    }

    protected mouseClick(events: Array<MouseEvent>): void {
        const pos = this.getPos(events);
        const { mask, id } = this.pick(pos);

        this._listeners
            .filter((l) => l.click)
            .filter((l) => l.mask & mask)
            .forEach((l) => l.click(id, pos));
    }

    protected mouseDown(events: Array<MouseEvent>): void {
        const pos = this.getPos(events);
        const { mask, id } = this.pick(pos);

        this._listeners
            .filter((l) => l.down)
            .filter((l) => l.mask & mask)
            .forEach((l) => {
                l.down(id, pos);
                this._currentDownListener = l;
            });
    }

    protected mouseUp(events: Array<MouseEvent>): void {
        const pos = this.getPos(events);
        const { id } = this.pick(pos);

        this._currentDownListener?.up?.(id, pos);
        if(this._currentDownListener?.mask === ListenerMask.Limits)
            this._limitListener?.();
        this._currentDownListener = undefined;
    }

    protected pick(mouse: vec2): { mask: number, id: number } {
        const buf = new ArrayBuffer(9);
        const byteView = new Uint8Array(buf);

        const fbo = Buffers.ssFBO;
        if(!fbo?.initialized) return { mask: 0, id: -1 };
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
        let id = new Uint32Array(buf, 4, 1)[0];
        if (id === 2 ** 32 - 1) id = -1;
        return { mask, id };
    }

    public static register(config: ListenerConfig): void {
        this._instance._listeners.push(Object.assign({lastId: -1 }, config));
    }

    public static set lassoActive(active: boolean) {
        this._instance._lassoActive = active;
    }

    public static set limitListener(cb: () => void) {
        this._instance._limitListener = cb;
    }
}
