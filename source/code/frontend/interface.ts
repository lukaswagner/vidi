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

export type Message = ReadyMessage | ConfigurationMessage | ColumnsMessage;
