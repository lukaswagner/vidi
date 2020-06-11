import {
    FinishedData,
    MtLoadSubWorkerMessageData,
    MtLoadSubWorkerMessageType,
    ProcessBufferChunksData,
} from './mtLoadSubWorkerMessages';
import { SubLoader } from './subLoader';

function process(data: ProcessBufferChunksData): void {
    const loader = new SubLoader();
    loader.chunks = data.data;
    loader.types = data.types;
    loader.delimiter = data.delimiter;
    loader.includesHeader = data.includesHeader;
    loader.size = data.size;
    loader.load().then((columns) => {
        const msg: MtLoadSubWorkerMessageData = {
            type: MtLoadSubWorkerMessageType.Finished,
            data: {
                data: columns,
                startRemainder: loader.startRemainder,
                endRemainder: loader.endRemainder,
            } as FinishedData
        };
        const transfer: Array<Transferable> = [];
        columns.forEach((c) => transfer.push(...c.transferable));
        postMessage(msg, { transfer });
    });
}

self.addEventListener('message', (m: MessageEvent) => {
    const message = m.data as MtLoadSubWorkerMessageData;
    console.log(
        `Received ${MtLoadSubWorkerMessageType[message.type]} message.`);

    switch (message.type) {
        case MtLoadSubWorkerMessageType.ProcessBufferChunks:
            process(message.data as ProcessBufferChunksData);
            break;
        default:
            break;
    }
});