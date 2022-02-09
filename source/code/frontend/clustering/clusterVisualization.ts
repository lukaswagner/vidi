import {
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
    protected _currentData: ClusterInfo[];

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
        if(!this._currentData) return;
        this._spherePass.frame();
    }

    public get altered(): boolean {
        return this._spherePass.altered;
    }

    public set invalidate(invalidate: Invalidate) {
        this._spherePass.invalidate = invalidate;
    }

    public set target(target: Framebuffer) {
        this.assertInitialized();
        this._spherePass.target = target;
    }

    public set model(mat: mat4) {
        this._spherePass.model = mat;
    }

    public setData(name: string, data: ClusterInfo[]): void {
        this._data[name] = data;
    }

    public selectData(name: string): number {
        if(name === '__NONE__') {
            this._currentData = undefined;
            this._spherePass.data = undefined;
            return 0;
        }
        const data = this._data[name];
        if(!data || this._currentData === data) return this._currentData.length;
        this._currentData = data;
        this._spherePass.data = data;
        return data.length;
    }
}
