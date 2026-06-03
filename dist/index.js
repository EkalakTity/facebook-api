"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const menu_1 = require("./cli/menu");
async function main() {
    await (0, menu_1.showMainMenu)();
}
main().catch((err) => {
    console.error('เกิดข้อผิดพลาด:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map