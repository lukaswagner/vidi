import { Column, DataSource } from '@lukaswagner/csv-parser';

export type ReadyMessage = {
    type: 'ready'
}

export interface Configuration {
    name?: string;
    csv?: DataSource;
    delimiter?: string;
    pointSize?: number;
    axes?: string[];
    colorMode?: number;
    colorMapping?: number;
    colorColumn?: string;
    variablePointSizeStrength?: number;
    variablePointSizeColumn?: string;
    keepLimits?: boolean;
}

export type ConfigurationMessage = {
    type: 'configuration',
    data: Configuration
}

export type ColumnsMessage = {
    type: 'columns',
    data: Column[]
}

export type FilterMessage = {
    type: 'filter',
    data: BitArray
}

export interface BitArray {
    get(index: number): boolean;
    set(index: number, value: boolean): void;
    get length(): number;
    clone(): BitArray;
}

export type FilteredMessage = {
    type: 'filtered',
    data: Column[]
}

export type Message = ReadyMessage | ConfigurationMessage | ColumnsMessage;
