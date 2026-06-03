"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LOG_DIR = './logs';
function ensureLogDir() {
    if (!fs_1.default.existsSync(LOG_DIR))
        fs_1.default.mkdirSync(LOG_DIR, { recursive: true });
}
function todayFile() {
    const date = new Date().toISOString().split('T')[0];
    return path_1.default.join(LOG_DIR, `${date}.log`);
}
function timestamp() {
    return new Date().toISOString().replace('T', ' ').split('.')[0];
}
const color = {
    info: chalk_1.default.cyan,
    warn: chalk_1.default.yellow,
    error: chalk_1.default.red,
    debug: chalk_1.default.gray,
};
function log(level, message, data) {
    const ts = timestamp();
    const isDebug = level === 'debug';
    const showDebug = process.env.LOG_LEVEL === 'debug';
    if (!isDebug || showDebug) {
        const dataStr = data !== undefined ? ' ' + chalk_1.default.gray(JSON.stringify(data)) : '';
        console.log(`${chalk_1.default.gray(ts)} ${color[level](level.toUpperCase().padEnd(5))} ${message}${dataStr}`);
    }
    ensureLogDir();
    const dataJson = data !== undefined ? ' ' + JSON.stringify(data) : '';
    const line = `[${ts}] ${level.toUpperCase().padEnd(5)} ${message}${dataJson}\n`;
    fs_1.default.appendFileSync(todayFile(), line, 'utf8');
}
//# sourceMappingURL=logger.util.js.map