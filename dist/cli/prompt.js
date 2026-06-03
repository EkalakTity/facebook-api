"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.askText = askText;
exports.askSelect = askSelect;
exports.askConfirm = askConfirm;
exports.askNumber = askNumber;
const inquirer_1 = __importDefault(require("inquirer"));
async function askText(question, defaultValue = '') {
    const { answer } = await inquirer_1.default.prompt([{
            type: 'input',
            name: 'answer',
            message: question,
            default: defaultValue,
        }]);
    return answer;
}
async function askSelect(question, choices) {
    const { answer } = await inquirer_1.default.prompt([{
            type: 'list',
            name: 'answer',
            message: question,
            choices,
        }]);
    return answer;
}
async function askConfirm(question, defaultValue = false) {
    const { answer } = await inquirer_1.default.prompt([{
            type: 'confirm',
            name: 'answer',
            message: question,
            default: defaultValue,
        }]);
    return answer;
}
async function askNumber(question, defaultValue = 1) {
    const { answer } = await inquirer_1.default.prompt([{
            type: 'number',
            name: 'answer',
            message: question,
            default: defaultValue,
        }]);
    return Number(answer);
}
//# sourceMappingURL=prompt.js.map