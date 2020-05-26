import {
    LoadWorkerMessageData,
    LoadWorkerMessageType,
    ProcessBufferChunksData
} from "./loadWorkerMessages"
import { SingleThreadedLoader } from "./singleThreadedLoader";
import { ProgressStep } from "../ui/progress";

function setProgressSteps(steps: Array<ProgressStep>): void {
    const d: LoadWorkerMessageData = {
        type: LoadWorkerMessageType.SetProgressSteps,
        data: steps
    };
    postMessage(d);
}

function setProgressStepTotal(index: number, total: number): void {
    const d: LoadWorkerMessageData = {
        type: LoadWorkerMessageType.SetProgressStepTotal,
        data: { index, total }
    };
    postMessage(d);
}

function progress(index: number, progress = 1): void {
    const d: LoadWorkerMessageData = {
        type: LoadWorkerMessageType.Progress,
        data: { index, progress }
    };
    postMessage(d);
}

function setProgress(index: number, progress = 1): void {
    const d: LoadWorkerMessageData = {
        type: LoadWorkerMessageType.SetProgress,
        data: { index, progress }
    };
    postMessage(d);
}

function process(data: ProcessBufferChunksData): void {
    const loader = new SingleThreadedLoader();
    loader.chunks = data.data;
    loader.size = data.size;
    loader.delimiter = data.delimiter;
    loader.includesHeader = data.includesHeader;
    loader.setProgressStepTotal = setProgressStepTotal;
    loader.progress = progress;
    loader.setProgress = setProgress;
    loader.load().then((columns) => {
        console.log(
            `loaded ${columns.length} columns / ${columns[0].length} cells`);
        const d: LoadWorkerMessageData = {
            type: LoadWorkerMessageType.Finished,
            data: columns
        };
        let transfer: Array<Transferable> = [];
        columns.forEach((c) => transfer.push(...c.transferable));
        postMessage(d, { transfer });
    });
}

self.addEventListener('message', (m: MessageEvent) => {
    const message = m.data as LoadWorkerMessageData;
    console.log(`Received ${LoadWorkerMessageType[message.type]} message.`);

    switch (message.type) {
        case LoadWorkerMessageType.ProcessBufferChunks:
            process(message.data as ProcessBufferChunksData);
            break;
        default:
            break;
    }
});
