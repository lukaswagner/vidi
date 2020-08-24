declare module 'worker-loader?inline=fallback!*' {
    class MyWorker extends Worker {
        public constructor();
    }

    export default MyWorker;
}
