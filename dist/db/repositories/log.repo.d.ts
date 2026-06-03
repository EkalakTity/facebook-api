export interface LogEntry {
    id: number;
    job_id: string;
    level: string;
    message: string;
    data: string | null;
    created_at: string;
}
export declare const logRepo: {
    save(jobId: string, level: string, message: string, data?: unknown): void;
    getByJob(jobId: string): LogEntry[];
    getRecent(limit?: number): LogEntry[];
    countEventsByJob(jobId: string): Record<string, number>;
    getJobList(limit?: number): {
        job_id: string;
        created_at: string;
    }[];
};
