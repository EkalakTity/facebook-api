export interface JobSummary {
    jobId: string;
    startedAt: string;
    endedAt: string;
    durationSec: number;
    totalFound: number;
    duplicates: number;
    queued: number;
    done: number;
    rejected: number;
    errors: number;
}
export declare function createJob(): string;
export declare function getJobId(): string;
export declare function logEvent(event: string, data?: unknown): void;
export declare function logWarn(message: string, data?: unknown): void;
export declare function logError(message: string, err?: unknown): void;
export declare function endJob(): JobSummary;
export declare function generateSummary(jobId: string): JobSummary;
