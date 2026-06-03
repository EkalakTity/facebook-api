"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrollDown = scrollDown;
exports.waitRandom = waitRandom;
async function scrollDown(page, times, delayMs = 1500) {
    for (let i = 0; i < times; i++) {
        await page.evaluate('window.scrollBy(0, window.innerHeight * 0.8)');
        await waitRandom(delayMs, delayMs + 1500);
    }
}
function waitRandom(minMs, maxMs) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise((resolve) => setTimeout(resolve, delay));
}
//# sourceMappingURL=scroll.util.js.map