"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJob = createJob;
exports.getJobId = getJobId;
exports.logEvent = logEvent;
exports.logWarn = logWarn;
exports.logError = logError;
exports.endJob = endJob;
exports.generateSummary = generateSummary;
const logger_util_1 = require("../utils/logger.util");
const log_repo_1 = require("../db/repositories/log.repo");
let currentJobId = null;
function createJob() {
    const ts = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 15);
    currentJobId = `job_${ts}`;
    logEvent('job_start', { jobId: currentJobId });
    return currentJobId;
}
function getJobId() {
    if (!currentJobId)
        throw new Error('ยังไม่ได้เริ่ม Job — เรียก createJob() ก่อน');
    return currentJobId;
}
function logEvent(event, data) {
    const jobId = currentJobId ?? 'no_job';
    (0, logger_util_1.log)('info', event, data);
    log_repo_1.logRepo.save(jobId, 'info', event, data);
}
function logWarn(message, data) {
    const jobId = currentJobId ?? 'no_job';
    (0, logger_util_1.log)('warn', message, data);
    log_repo_1.logRepo.save(jobId, 'warn', message, data);
}
function logError(message, err) {
    const jobId = currentJobId ?? 'no_job';
    const errData = err instanceof Error ? { message: err.message } : err;
    (0, logger_util_1.log)('error', message, errData);
    log_repo_1.logRepo.save(jobId, 'error', message, errData);
}
function endJob() {
    const jobId = getJobId();
    logEvent('job_end');
    const summary = generateSummary(jobId);
    currentJobId = null;
    return summary;
}
function generateSummary(jobId) {
    const events = log_repo_1.logRepo.countEventsByJob(jobId);
    const logs = log_repo_1.logRepo.getByJob(jobId);
    const startedAt = logs[0]?.created_at ?? new Date().toISOString();
    const endedAt = logs[logs.length - 1]?.created_at ?? startedAt;
    const durationSec = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
    // post_found นับจาก post_found + post_duplicate รวมกัน
    const found = events['post_found'] ?? 0;
    const duplicates = events['post_duplicate'] ?? 0;
    return {
        jobId,
        startedAt,
        endedAt,
        durationSec,
        totalFound: found + duplicates,
        duplicates,
        queued: events['post_queued'] ?? 0,
        done: events['post_done'] ?? 0,
        rejected: events['post_rejected'] ?? 0,
        errors: events['error'] ?? 0,
    };
}
//# sourceMappingURL=logger.agent.js.map