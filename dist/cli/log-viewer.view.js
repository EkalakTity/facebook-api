"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showLogViewer = showLogViewer;
const chalk_1 = __importDefault(require("chalk"));
const log_repo_1 = require("../db/repositories/log.repo");
const prompt_1 = require("./prompt");
const levelColor = {
    INFO: chalk_1.default.cyan,
    WARN: chalk_1.default.yellow,
    ERROR: chalk_1.default.red,
    DEBUG: chalk_1.default.gray,
};
function formatEntry(entry) {
    const ts = entry.created_at.replace('T', ' ').split('.')[0];
    const lvl = (entry.level.toUpperCase()).padEnd(5);
    const col = levelColor[entry.level.toUpperCase()] ?? chalk_1.default.white;
    const data = entry.data ? chalk_1.default.gray(' ' + entry.data.slice(0, 80)) : '';
    return `${chalk_1.default.gray(ts)} ${col(lvl)} ${entry.message}${data}`;
}
async function showLogViewer() {
    const jobs = log_repo_1.logRepo.getJobList(8);
    if (jobs.length === 0) {
        console.log(chalk_1.default.gray('\nยังไม่มี Log'));
        return;
    }
    const choices = [
        { name: '50 รายการล่าสุด (ทุก Job)', value: 'recent' },
        ...jobs.map((j) => ({
            name: `${j.job_id}  ${chalk_1.default.gray(j.created_at.split('T')[0])}`,
            value: j.job_id,
        })),
    ];
    const picked = await (0, prompt_1.askSelect)('เลือก Job ที่ต้องการดู Log:', choices);
    const entries = picked === 'recent'
        ? log_repo_1.logRepo.getRecent(50).reverse()
        : log_repo_1.logRepo.getByJob(picked);
    console.log();
    console.log(chalk_1.default.bold(`── Log: ${picked} (${entries.length} รายการ) ────`));
    console.log();
    entries.forEach((e) => console.log(formatEntry(e)));
    console.log();
}
//# sourceMappingURL=log-viewer.view.js.map