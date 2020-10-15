declare module 'worker-loader!*' {
    class MyWorker extends Worker {
        public constructor();
    }

    export default MyWorker;
}
