"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const database_1 = require("./database");
const schema_1 = require("./schema");
function migrate() {
    console.log('กำลังสร้างตาราง...');
    // รัน schema ทีละ statement
    database_1.db.exec(schema_1.schema);
    console.log('✓ สร้างตาราง 7 ตารางเรียบร้อย');
    // Seed message templates
    database_1.db.exec(schema_1.seedTemplates);
    console.log('✓ Seed message_templates เรียบร้อย');
    // ตรวจสอบตารางที่สร้างได้
    const tables = database_1.db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
        .all();
    console.log('\nตารางที่มีใน Database:');
    tables.forEach((t) => console.log(`  - ${t.name}`));
    console.log('\n✓ Migration เสร็จสมบูรณ์');
}
migrate();
//# sourceMappingURL=migrate.js.map