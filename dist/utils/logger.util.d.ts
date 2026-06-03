export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export declare function log(level: LogLevel, message: string, data?: unknown): void;
