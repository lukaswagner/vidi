declare module 'worker-loader?inline=true!*' {
    class MyWorker extends Worker {
        public constructor();
    }

    export default MyWorker;
}
