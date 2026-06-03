import 'dotenv/config'
import { showMainMenu } from './cli/menu'

async function main() {
  await showMainMenu()
}

main().catch((err) => {
  console.error('เกิดข้อผิดพลาด:', err)
  process.exit(1)
})
