import 'dotenv/config'
import { db } from './database'
import { schema, seedTemplates } from './schema'

function migrate() {
  console.log('กำลังสร้างตาราง...')

  // รัน schema ทีละ statement
  db.exec(schema)
  console.log('✓ สร้างตาราง 7 ตารางเรียบร้อย')

  // Seed message templates
  db.exec(seedTemplates)
  console.log('✓ Seed message_templates เรียบร้อย')

  // ตรวจสอบตารางที่สร้างได้
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
    .all() as { name: string }[]

  console.log('\nตารางที่มีใน Database:')
  tables.forEach((t) => console.log(`  - ${t.name}`))

  console.log('\n✓ Migration เสร็จสมบูรณ์')
}

migrate()
