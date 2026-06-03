export declare function askText(question: string, defaultValue?: string): Promise<string>;
export declare function askSelect<T>(question: string, choices: {
    name: string;
    value: T;
}[]): Promise<T>;
export declare function askConfirm(question: string, defaultValue?: boolean): Promise<boolean>;
export declare function askNumber(question: string, defaultValue?: number): Promise<number>;
