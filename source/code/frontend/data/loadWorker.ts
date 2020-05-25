import {
    LoadWorkerMessageData,
    LoadWorkerMessageType,
    LoadFromUrlData,
    LoadFromFileData
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

function progress(amount = 1): void {
    const d: LoadWorkerMessageData = {
        type: LoadWorkerMessageType.Progress,
        data: amount
    };
    postMessage(d);
}

function load(
    data: ReadableStream<Uint8Array>,
    size: number,
    delimiter = ',',
    includesHeader = true,
): void {
    const loader = new SingleThreadedLoader();
    loader.stream = data;
    loader.size = size;
    loader.delimiter = delimiter;
    loader.includesHeader = includesHeader;
    loader.load(setProgressSteps, setProgressStepTotal, progress).then((columns) => {
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

function loadFromUrl(data: LoadFromUrlData): void {
    fetch(data.url)
        .then((response) => load(
            response.body,
            data.size,
            data.delimiter,
            data.includesHeader
        ));
}

function loadFromFile(data: LoadFromFileData): void {
    load(
        data.file.stream(),
        data.file.size,
        data.delimiter,
        data.includesHeader
    );
}

self.addEventListener('message', (m: MessageEvent) => {
    const message = m.data as LoadWorkerMessageData;
    console.log(`Received ${LoadWorkerMessageType[message.type]} message.`);

    switch (message.type) {
        case LoadWorkerMessageType.LoadFromUrl:
            loadFromUrl(message.data as LoadFromUrlData);
            break;
        case LoadWorkerMessageType.LoadFromFile:
            loadFromFile(message.data as LoadFromFileData);
            break;
        default:
            break;
    }
});
