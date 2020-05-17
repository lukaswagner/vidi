declare module 'worker-loader!*' {
    class FilterWorker extends Worker {
        public constructor();
    }

    export default FilterWorker;
}
