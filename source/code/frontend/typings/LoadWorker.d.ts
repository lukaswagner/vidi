declare module 'worker-loader!*' {
    class LoadWorker extends Worker {
        public constructor();
    }

    export default LoadWorker;
}
