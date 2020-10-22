import {
    Camera,
    Context,
    Framebuffer,
    Initializable,
    Invalidate,
    mat4
} from 'webgl-operate';
import { ClusterInfo } from 'worker/clustering/interface';

import { SphereClusterPass } from './sphereClusterPass';

export class ClusterVisualization extends Initializable {
    protected _data: {[id: string]: ClusterInfo[]} = {};

    protected _spherePass: SphereClusterPass;

    public constructor(context: Context) {
        super();
        this._spherePass = new SphereClusterPass(context);
    }

    @Initializable.initialize()
    public initialize(): boolean {
        return this._spherePass.initialize();
    }

    @Initializable.uninitialize()
    public uninitialize(): void {
        this._spherePass.uninitialize();
    }

    @Initializable.assert_initialized()
    public update(): void {
        this._spherePass.update();
    }

    @Initializable.assert_initialized()
    public frame(): void {
        this._spherePass.frame();
    }

    public get altered(): boolean {
        return this._spherePass.altered;
    }

    public set invalidate(invalidate: Invalidate) {
        this._spherePass.invalidate = invalidate;
    }

    @Initializable.assert_initialized()
    public set target(target: Framebuffer) {
        this._spherePass.target = target;
    }

    @Initializable.assert_initialized()
    public set camera(camera: Camera) {
        this._spherePass.camera = camera;
    }

    public set modelMat(mat: mat4) {
        this._spherePass.modelMat = mat;
    }

    public setData(name: string, data: ClusterInfo[]): void {
        this._data[name] = data;
    }

    public selectData(name: string): void {
        const data = this._data[name];
        if(!data) return;
        this._spherePass.data = data;
    }
}