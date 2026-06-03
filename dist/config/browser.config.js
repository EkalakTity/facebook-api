"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.browserConfig = void 0;
require("dotenv/config");
exports.browserConfig = {
    headless: process.env.HEADLESS === 'true',
    slowMo: Number(process.env.SLOW_MO) || 50,
    timeout: 30000,
    viewport: { width: 1280, height: 800 },
    profilePath: process.env.BROWSER_PROFILE_PATH || '',
};
//# sourceMappingURL=browser.config.js.map