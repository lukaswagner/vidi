declare module 'worker-loader?inline=fallback!*' {
    class WebpackWorker extends Worker {
        public constructor();
    }

    export default WebpackWorker;
}
