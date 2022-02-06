import {
    Camera,
    EventHandler,
    EventProvider,
    Invalidate,
    Navigation,
    vec3,
} from 'webgl-operate';

export class View {
    protected _camera: Camera;
    protected _navigation: Navigation;
    protected _eventHandler: EventHandler;

    protected static _instance: View;

    protected constructor(
        invalidate: Invalidate, eventProvider: EventProvider
    ) {
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
        this._eventHandler.pushMouseMoveHandler(this.onMouseMove.bind(this));
    }

    public static initialize(
        invalidate: Invalidate, eventProvider: EventProvider
    ): void {
        this._instance = new View(invalidate, eventProvider);
    }

    public static get camera(): Camera {
        return this._instance._camera;
    }

    public static get navigation(): Navigation {
        return this._instance._navigation;
    }

    public static get altered(): boolean {
        return View.camera.altered;
    }

    public static update(): void {
        View.navigation.update();
        this._instance._eventHandler.update();
    }

    protected onMouseMove(latests: Array<MouseEvent>): void {
        // const event: MouseEvent = latests[latests.length - 1];
        // const mouse = this._eventHandler.offsets(event)[0];
        // const buf = new ArrayBuffer(9);
        // const byteView = new Uint8Array(buf);
        // this._ssFBO.bind(this._gl.READ_FRAMEBUFFER);
        // this._gl.readBuffer(this._gl.COLOR_ATTACHMENT1);
        // this._gl.readPixels(
        //     mouse[0], this._frameSize[1] - mouse[1], 1, 1,
        //     this._indexFormat[1], this._indexFormat[2], byteView, 2);
        // this._gl.readBuffer(this._gl.COLOR_ATTACHMENT2);
        // this._gl.readPixels(
        //     mouse[0], this._frameSize[1] - mouse[1], 1, 1,
        //     this._indexFormat[1], this._indexFormat[2], byteView, 5);
        // this._ssFBO.unbind(this._gl.READ_FRAMEBUFFER);
        // const id = new Uint32Array(buf, 4, 1)[0];
        // Passes.points.selected = -1;
        // Passes.limits.selected = -1;
        // if (byteView[2] === 1 << 7) {
        //     Passes.points.selected = id;
        // } else if (byteView[2] === 1 << 6) {
        //     Passes.limits.selected = id;
        // }
    }

}
