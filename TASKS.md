# TASKS.md — MVP 1: Facebook Personal Agent

> อ่าน PROJECT_MEMORY.md ก่อนเสมอก่อนเริ่มทำงานใด ๆ
> ทำทีละ Step เรียงลำดับ ห้ามข้าม Step

---

## Step 1: Setup Project

**เป้าหมาย:**
สร้างโครงสร้างโปรเจกต์พื้นฐาน ติดตั้ง Dependencies ที่จำเป็น และตั้งค่า TypeScript

**ไฟล์ที่เกี่ยวข้อง:**
- `package.json`
- `tsconfig.json`
- `.env.example`
- `.gitignore`
- `src/` (โฟลเดอร์หลัก)
- `src/index.ts` (entry point)

**สิ่งที่ต้องทำ:**
- [ ] สร้างโฟลเดอร์โครงสร้างโปรเจกต์
  ```
  src/
    agents/
    db/
    cli/
    types/
    utils/
    config/
  data/
  logs/
  ```
- [ ] รัน `npm init` และตั้งค่า `package.json`
- [ ] ติดตั้ง TypeScript และ `ts-node`
- [ ] สร้าง `tsconfig.json` ที่เหมาะสม
- [ ] ติดตั้ง package พื้นฐาน: `dotenv`, `zod`
- [ ] สร้าง `.env.example` ว่างไว้สำหรับ config
- [ ] สร้าง `src/index.ts` เป็น entry point เปล่า ๆ
- [ ] ตรวจสอบว่า `ts-node src/index.ts` รันได้โดยไม่ Error

**เงื่อนไขว่าทำเสร็จแล้ว:**
- รัน `ts-node src/index.ts` แล้วไม่มี Error
- โฟลเดอร์ทุกตัวถูกสร้างแล้ว
- `package.json` มี script `start` และ `dev`

---

## Step 2: Setup Playwright

**เป้าหมาย:**
ติดตั้งและตั้งค่า Playwright ให้พร้อมเปิด Browser ได้

**ไฟล์ที่เกี่ยวข้อง:**
- `package.json`
- `src/agents/session.agent.ts`
- `src/config/browser.config.ts`

**สิ่งที่ต้องทำ:**
- [ ] ติดตั้ง `playwright` และ `@playwright/test`
- [ ] รัน `playwright install chromium` เพื่อดาวน์โหลด Browser
- [ ] สร้าง `src/config/browser.config.ts` สำหรับเก็บ config ของ Browser
  - headless mode (default: false เพราะต้องให้คนเห็น)
  - slowMo (delay ระหว่าง action)
  - timeout
  - viewport
- [ ] สร้าง `src/agents/session.agent.ts` โครงสร้างเปล่า ๆ
  - ฟังก์ชัน `launchBrowser()`
  - ฟังก์ชัน `closeBrowser()`
  - ฟังก์ชัน `checkSession()`
- [ ] ทดสอบเปิด Browser ไปที่ `https://www.facebook.com` แล้วปิดได้

**เงื่อนไขว่าทำเสร็จแล้ว:**
- Playwright เปิด Chromium ขึ้นมาได้
- Browser ไปที่ Facebook ได้โดยไม่ Error
- ปิด Browser ได้ปกติ

---

## Step 3: Setup SQLite

**เป้าหมาย:**
สร้าง Database และตาราง 7 ตาราง ตาม Schema ใน PROJECT_MEMORY.md

**ไฟล์ที่เกี่ยวข้อง:**
- `src/db/database.ts`
- `src/db/schema.ts`
- `src/db/migrate.ts`
- `data/agent.db` (ถูกสร้างอัตโนมัติ)

**สิ่งที่ต้องทำ:**
- [ ] ติดตั้ง `better-sqlite3` และ `@types/better-sqlite3`
- [ ] สร้าง `src/db/database.ts` สำหรับ connect และ initialize DB
- [ ] สร้าง `src/db/schema.ts` เก็บ SQL สร้างตาราง 7 ตาราง:
  - `accounts`
  - `targets`
  - `message_templates`
  - `scanned_posts`
  - `review_queue`
  - `processed_posts`
  - `logs`
- [ ] สร้าง `src/db/migrate.ts` สำหรับรัน migration ครั้งแรก
- [ ] ทดสอบรัน migration แล้วไฟล์ `data/agent.db` ถูกสร้าง
- [ ] ตรวจสอบตารางทุกตัวถูกสร้างด้วย column ที่ถูกต้อง

**เงื่อนไขว่าทำเสร็จแล้ว:**
- ไฟล์ `data/agent.db` ถูกสร้างแล้ว
- ตาราง 7 ตารางมีอยู่ครบ
- Insert ข้อมูลทดสอบเข้าแต่ละตารางได้โดยไม่ Error

---

## Step 4: Create CLI

**เป้าหมาย:**
สร้าง CLI พื้นฐานสำหรับรับ Input จากผู้ใช้และแสดง Menu

**ไฟล์ที่เกี่ยวข้อง:**
- `src/cli/menu.ts`
- `src/cli/prompt.ts`
- `src/index.ts`

**สิ่งที่ต้องทำ:**
- [ ] ติดตั้ง `inquirer` และ `@types/inquirer` สำหรับ Interactive CLI
- [ ] ติดตั้ง `chalk` สำหรับ Color Output
- [ ] สร้าง `src/cli/prompt.ts` ฟังก์ชัน Helper สำหรับรับ Input ต่าง ๆ
  - `askText(question)` — รับข้อความ
  - `askSelect(question, choices)` — เลือกจากตัวเลือก
  - `askConfirm(question)` — ถาม yes/no
  - `askNumber(question)` — รับตัวเลข
- [ ] สร้าง `src/cli/menu.ts` เมนูหลัก:
  - 1. เริ่มงานใหม่
  - 2. ดู Review Queue
  - 3. ดู Log ล่าสุด
  - 4. ออกจากโปรแกรม
- [ ] เชื่อม `src/index.ts` เข้ากับ `menu.ts`
- [ ] ทดสอบ Menu แสดงได้และรับ Input ได้

**เงื่อนไขว่าทำเสร็จแล้ว:**
- รัน `ts-node src/index.ts` แล้ว Menu ขึ้น
- เลือก Option ได้
- กด 4 แล้วโปรแกรมออกได้

---

## Step 5: Open Browser Profile

**เป้าหมาย:**
ให้ผู้ใช้ระบุ Browser Profile Path และเปิด Browser ด้วย Profile ที่ Login Facebook ไว้แล้ว

**ไฟล์ที่เกี่ยวข้อง:**
- `src/agents/session.agent.ts`
- `src/config/browser.config.ts`
- `src/cli/prompt.ts`
- `.env` / `.env.example`

**สิ่งที่ต้องทำ:**
- [ ] เพิ่ม `BROWSER_PROFILE_PATH` ใน `.env.example`
- [ ] แก้ `src/config/browser.config.ts` ให้อ่าน `BROWSER_PROFILE_PATH` จาก env
- [ ] แก้ `src/agents/session.agent.ts` ฟังก์ชัน `launchBrowser()`:
  - รับ `userDataDir` (path ของ Browser Profile)
  - เปิด Browser ด้วย `chromium.launchPersistentContext(userDataDir, options)`
- [ ] ถ้า Profile Path ไม่ได้ตั้งใน env ให้ถามผู้ใช้ผ่าน CLI
- [ ] เพิ่มฟังก์ชัน `checkSession(page)`:
  - เปิด `https://www.facebook.com`
  - ตรวจสอบว่า Login แล้วหรือยัง (เช็ก URL หรือ Element)
  - ถ้ายังไม่ Login ให้แสดงข้อความแจ้งผู้ใช้และหยุดทำงาน
- [ ] ทดสอบเปิด Browser ด้วย Profile จริงแล้ว Facebook Login อยู่

**เงื่อนไขว่าทำเสร็จแล้ว:**
- Browser เปิดด้วย Profile ที่กำหนดได้
- ระบบเช็ก Login Status ได้
- ถ้าไม่ได้ Login ระบบหยุดและแจ้ง Error อย่างชัดเจน

---

## Step 6: Input Target URL

**เป้าหมาย:**
ให้ผู้ใช้ใส่ Target URL ที่ต้องการ Scan และบันทึกลง Database

**ไฟล์ที่เกี่ยวข้อง:**
- `src/agents/target.agent.ts`
- `src/db/repositories/target.repo.ts`
- `src/cli/prompt.ts`
- `src/types/target.types.ts`

**สิ่งที่ต้องทำ:**
- [ ] สร้าง `src/types/target.types.ts` กำหนด Type:
  - `TargetType`: `'feed' | 'group' | 'post' | 'profile'`
  - `Target` interface
- [ ] สร้าง `src/db/repositories/target.repo.ts`:
  - `createTarget(data)`
  - `getTargetById(id)`
  - `getAllTargets()`
- [ ] สร้าง `src/agents/target.agent.ts`:
  - ถามผู้ใช้ว่าต้องการใส่ URL ใหม่หรือเลือกจาก History
  - ตรวจสอบว่า URL เป็น Facebook URL หรือไม่ (validation เบื้องต้น)
  - ตรวจจับ target_type จาก URL อัตโนมัติ:
    - `facebook.com/groups/` → group
    - `facebook.com/` + ชื่อ → profile
    - URL มี `posts` → post
    - ไม่ match → feed
  - บันทึก Target ลง Database
  - คืนค่า Target ที่เลือก
- [ ] ทดสอบใส่ URL และบันทึกลง SQLite ได้

**เงื่อนไขว่าทำเสร็จแล้ว:**
- ผู้ใช้ใส่ URL ได้
- ระบบ detect target_type ได้ถูกต้อง
- Target ถูก insert ลง `targets` table
- เลือก Target จาก History ได้

---

## Step 7: Scan Visible Posts

**เป้าหมาย:**
เปิด Target URL ด้วย Playwright และอ่านโพสต์ที่มองเห็นในหน้าจอ

**ไฟล์ที่เกี่ยวข้อง:**
- `src/agents/scanner.agent.ts`
- `src/types/post.types.ts`
- `src/utils/scroll.util.ts`

**สิ่งที่ต้องทำ:**
- [ ] สร้าง `src/types/post.types.ts` กำหนด Type:
  - `RawPost` interface (ข้อมูลดิบก่อน save)
  - `ScannedPost` interface (ข้อมูลหลัง save ลง DB)
- [ ] สร้าง `src/utils/scroll.util.ts`:
  - ฟังก์ชัน `scrollDown(page, times, delayMs)` — เลื่อนหน้าลงตามจำนวนครั้ง
  - ฟังก์ชัน `waitRandom(minMs, maxMs)` — รอเวลาแบบ random เพื่อความเป็นธรรมชาติ
- [ ] สร้าง `src/agents/scanner.agent.ts`:
  - ฟังก์ชัน `navigateToTarget(page, url)` — เปิด URL ใน Browser
  - ฟังก์ชัน `scanVisiblePosts(page)` — อ่านโพสต์ที่มองเห็น
    - ใช้ Playwright selector เพื่อหา Post Element
    - ดึง post_url, post_text, author_name ออกมา
    - คืนค่าเป็น Array ของ `RawPost`
  - ฟังก์ชัน `runScanRound(page, config)` — รันการ Scan ครบ 1 รอบ
    - navigate → scan → scroll → รอ cooldown
- [ ] ทดสอบ Scan โพสต์จาก Facebook Feed และได้ข้อมูลกลับมา

**เงื่อนไขว่าทำเสร็จแล้ว:**
- `scanVisiblePosts()` คืน Array ของโพสต์ที่มองเห็น
- แต่ละโพสต์มี post_url หรือข้อมูลเพียงพอสำหรับ Step ถัดไป
- Scroll หน้าได้ตามจำนวนที่กำหนด

---

## Step 8: Extract Post URL

**เป้าหมาย:**
ดึง Post URL และ Post ID ที่แม่นยำจาก Element ที่ Scan ได้ และ Normalize ให้อยู่ในรูปแบบมาตรฐาน

**ไฟล์ที่เกี่ยวข้อง:**
- `src/utils/url.util.ts`
- `src/agents/scanner.agent.ts`
- `src/db/repositories/scanned-post.repo.ts`

**สิ่งที่ต้องทำ:**
- [ ] สร้าง `src/utils/url.util.ts`:
  - ฟังก์ชัน `extractPostUrl(element)` — ดึง URL จาก Post Element
  - ฟังก์ชัน `extractPostId(url)` — ดึง Post ID จาก URL
    - รองรับรูปแบบ: `/posts/`, `/permalink/`, `story_fbid=`, `?p=`
  - ฟังก์ชัน `normalizePostUrl(url)` — ทำให้ URL อยู่ในรูปแบบมาตรฐาน
    - ตัด query string ที่ไม่จำเป็นออก
    - ทำให้ URL สั้นที่สุดเท่าที่จะยังระบุโพสต์ได้
- [ ] แก้ `src/agents/scanner.agent.ts` ใช้ `url.util.ts` ในการดึง URL
- [ ] สร้าง `src/db/repositories/scanned-post.repo.ts`:
  - `saveScannedPost(data)` — บันทึกโพสต์ที่ Scan ได้
  - `getScannedPostByUrl(url)` — เช็กว่า URL นี้เคย Scan แล้วหรือยัง
  - `getScannedPostById(post_id)` — เช็กด้วย Post ID
- [ ] บันทึกโพสต์ที่ Scan ได้ลง `scanned_posts` table
- [ ] ทดสอบดึง Post URL ที่ถูกต้องจากโพสต์ต่าง ๆ

**เงื่อนไขว่าทำเสร็จแล้ว:**
- ดึง Post URL ได้จาก Element
- Extract Post ID ได้จาก URL
- URL ถูก Normalize แล้ว
- บันทึกลง `scanned_posts` table ได้

---

## Step 9: Duplicate Check

**เป้าหมาย:**
ตรวจสอบว่าโพสต์ที่ Scan ได้เคยทำแล้วหรือยัง ก่อนส่งเข้า Review Queue

**ไฟล์ที่เกี่ยวข้อง:**
- `src/agents/duplicate.agent.ts`
- `src/db/repositories/scanned-post.repo.ts`
- `src/db/repositories/processed-post.repo.ts`

**สิ่งที่ต้องทำ:**
- [ ] สร้าง `src/db/repositories/processed-post.repo.ts`:
  - `isPostProcessed(accountId, postUrl)` — เช็กว่าโพสต์นี้ทำแล้วหรือยัง
  - `isPostProcessedById(accountId, postId)` — เช็กด้วย Post ID
  - `getProcessedPost(accountId, postUrl)` — ดึงข้อมูลที่ทำแล้ว
- [ ] สร้าง `src/agents/duplicate.agent.ts`:
  - ฟังก์ชัน `checkDuplicate(accountId, targetId, post)`:
    - เช็กใน `scanned_posts` — เคย Scan แล้วหรือยัง
    - เช็กใน `processed_posts` — เคยทำแล้วหรือยัง
    - เช็กใน `review_queue` — อยู่ใน Queue อยู่แล้วหรือยัง
    - คืนค่า: `{ isDuplicate: boolean, reason?: string }`
  - ฟังก์ชัน `filterNewPosts(accountId, targetId, posts)`:
    - รับ Array ของโพสต์
    - คืนเฉพาะโพสต์ที่ยังไม่เคยทำ
- [ ] เพิ่ม Index ใน SQLite สำหรับ `post_url` และ `post_id` เพื่อความเร็ว
- [ ] ทดสอบ: โพสต์เดิมถูก Skip, โพสต์ใหม่ผ่านไปได้

**เงื่อนไขว่าทำเสร็จแล้ว:**
- โพสต์ที่เคยทำแล้วถูก Skip พร้อมบอก reason
- โพสต์ใหม่ผ่านไปยัง Review Queue
- Log บันทึกว่า Skip กี่โพสต์

---

## Step 10: Review Queue

**เป้าหมาย:**
แสดงรายการโพสต์ที่รอ Review และให้ผู้ใช้ดูข้อมูลก่อนตัดสินใจ

**ไฟล์ที่เกี่ยวข้อง:**
- `src/agents/review.agent.ts`
- `src/db/repositories/review-queue.repo.ts`
- `src/cli/review-queue.view.ts`

**สิ่งที่ต้องทำ:**
- [ ] สร้าง `src/db/repositories/review-queue.repo.ts`:
  - `addToQueue(scannedPostId, messageText)` — เพิ่มโพสต์เข้า Queue
  - `getPendingQueue()` — ดึงรายการที่ยังรอ Review
  - `updateQueueStatus(id, status)` — อัปเดต status (pending/approved/rejected/done)
  - `getQueueCount()` — นับจำนวนที่รอ
- [ ] สร้าง `src/agents/review.agent.ts`:
  - ฟังก์ชัน `enqueuePost(post, messageText)` — เพิ่มโพสต์เข้า Queue
  - ฟังก์ชัน `getQueueSummary()` — สรุปจำนวนใน Queue
- [ ] สร้าง `src/cli/review-queue.view.ts` แสดงรายการใน Queue:
  - แสดงหมายเลข, Post URL (ย่อ), เนื้อหาบางส่วน, ข้อความที่เตรียมไว้
  - Option: เปิด URL ใน Browser, Copy Message (แสดงในหน้าจอ), Approve, Reject, Skip
- [ ] ทดสอบเพิ่มโพสต์เข้า Queue และแสดงได้ใน CLI

**เงื่อนไขว่าทำเสร็จแล้ว:**
- โพสต์ใหม่ถูก insert ลง `review_queue` table
- CLI แสดง Queue รายการได้
- ผู้ใช้เห็น Post URL และข้อความที่เตรียมไว้

---

## Step 11: Mark as Done

**เป้าหมาย:**
ให้ผู้ใช้ยืนยันหลังทำงานเสร็จ และระบบบันทึกว่าโพสต์นั้นทำแล้ว

**ไฟล์ที่เกี่ยวข้อง:**
- `src/agents/review.agent.ts`
- `src/db/repositories/review-queue.repo.ts`
- `src/db/repositories/processed-post.repo.ts`
- `src/cli/review-queue.view.ts`

**สิ่งที่ต้องทำ:**
- [ ] เพิ่มปุ่ม/option ใน `review-queue.view.ts`:
  - **Mark as Done** — ยืนยันว่าทำโพสต์นี้เสร็จแล้ว
  - **Reject** — ไม่ต้องการทำโพสต์นี้
  - **Skip** — ข้ามไปก่อน ยังไม่ตัดสินใจ
- [ ] เพิ่มฟังก์ชันใน `review.agent.ts`:
  - `markAsDone(queueId)`:
    - อัปเดต `review_queue.status` = `'done'`
    - Insert ลง `processed_posts` พร้อม `action_type`, `status = 'done'`
  - `rejectPost(queueId, reason?)`:
    - อัปเดต `review_queue.status` = `'rejected'`
    - Insert ลง `processed_posts` พร้อม `status = 'rejected'`
- [ ] เพิ่ม `saveProcessedPost(data)` ใน `processed-post.repo.ts`
- [ ] หลัง Mark as Done แสดงข้อความยืนยัน และขึ้นรายการถัดไป
- [ ] ทดสอบ: Mark as Done แล้วโพสต์นั้นไม่ขึ้นมาใน Queue อีก

**เงื่อนไขว่าทำเสร็จแล้ว:**
- กด Mark as Done แล้ว `review_queue.status` เปลี่ยนเป็น `done`
- มีข้อมูลใน `processed_posts` table
- โพสต์ที่ Done แล้วไม่ผ่าน Duplicate Check อีก
- กด Reject แล้วโพสต์ถูก mark เป็น rejected

---

## Step 12: Logging

**เป้าหมาย:**
บันทึก Log ทุก Action ที่สำคัญลงทั้ง Database และไฟล์

**ไฟล์ที่เกี่ยวข้อง:**
- `src/agents/logger.agent.ts`
- `src/db/repositories/log.repo.ts`
- `src/utils/logger.util.ts`
- `logs/` (โฟลเดอร์เก็บ log file)

**สิ่งที่ต้องทำ:**
- [ ] สร้าง `src/utils/logger.util.ts`:
  - ฟังก์ชัน `log(level, message, data?)` — Log ทั่วไป
  - Level ที่รองรับ: `info`, `warn`, `error`, `debug`
  - บันทึกลงไฟล์ `logs/YYYY-MM-DD.log` (แบ่งตามวัน)
  - แสดงสีใน Console ด้วย `chalk`
- [ ] สร้าง `src/db/repositories/log.repo.ts`:
  - `saveLog(jobId, level, message, data?)` — บันทึก Log ลง DB
  - `getLogsByJob(jobId)` — ดึง Log ตาม Job
- [ ] สร้าง `src/agents/logger.agent.ts`:
  - สร้าง `job_id` ใหม่ทุกครั้งที่เริ่มงาน
  - บันทึก Event สำคัญ:
    - `job_start` — เริ่มงาน
    - `scan_complete` — Scan รอบเสร็จ
    - `post_found` — พบโพสต์ใหม่
    - `post_duplicate` — โพสต์ซ้ำ
    - `post_queued` — เข้า Queue
    - `post_done` — Mark as Done
    - `post_rejected` — Reject
    - `job_end` — จบงาน
    - `error` — Error ใด ๆ
- [ ] เชื่อม Logger เข้ากับทุก Agent

**เงื่อนไขว่าทำเสร็จแล้ว:**
- ทุก Action สำคัญถูก Log ลง DB และไฟล์
- ไฟล์ Log ถูกสร้างใน `logs/` โฟลเดอร์
- ดู Log ใน CLI ได้ผ่านเมนู "ดู Log ล่าสุด"

---

## Step 13: Summary Report

**เป้าหมาย:**
แสดงสรุปผลการทำงานเมื่อจบแต่ละ Session

**ไฟล์ที่เกี่ยวข้อง:**
- `src/agents/logger.agent.ts`
- `src/cli/summary.view.ts`
- `src/db/repositories/log.repo.ts`

**สิ่งที่ต้องทำ:**
- [ ] สร้าง `src/cli/summary.view.ts`:
  - รับ `job_id` และแสดงสรุป:
    - เวลาเริ่มต้น — เวลาสิ้นสุด — ระยะเวลารวม
    - บัญชีที่ใช้
    - Target ที่ทำงาน
    - จำนวนโพสต์ที่เจอทั้งหมด
    - จำนวนโพสต์ซ้ำ (Skip)
    - จำนวนโพสต์ใหม่ที่เข้า Queue
    - จำนวนโพสต์ที่ Mark as Done
    - จำนวนโพสต์ที่ Reject
    - จำนวน Error (ถ้ามี)
- [ ] เพิ่มฟังก์ชัน `generateSummary(jobId)` ใน `logger.agent.ts`
  - Query ข้อมูลจาก `logs` table ตาม `job_id`
  - รวมตัวเลขและคืนเป็น Summary Object
- [ ] แสดง Summary Report ทุกครั้งที่:
  - งานจบตามรอบที่ตั้งไว้
  - ผู้ใช้กด Stop
  - เกิด Error ที่ต้องหยุดทำงาน
- [ ] ทดสอบ: รันจนจบแล้วดู Summary ที่ถูกต้อง

**เงื่อนไขว่าทำเสร็จแล้ว:**
- Summary แสดงตัวเลขครบทุกรายการ
- ตัวเลขถูกต้องตรงกับ Log ที่บันทึกไว้
- Summary แสดงทั้งใน Console และบันทึกลง Log file

---

## สถานะรวม

| Step | ชื่อ | สถานะ |
|------|------|--------|
| 1 | Setup Project | เสร็จแล้ว ✓ |
| 2 | Setup Playwright | เสร็จแล้ว ✓ |
| 3 | Setup SQLite | เสร็จแล้ว ✓ |
| 4 | Create CLI | เสร็จแล้ว ✓ |
| 5 | Open Browser Profile | เสร็จแล้ว ✓ |
| 6 | Input Target URL | เสร็จแล้ว ✓ |
| 7 | Scan Visible Posts | เสร็จแล้ว ✓ |
| 8 | Extract Post URL | เสร็จแล้ว ✓ |
| 9 | Duplicate Check | เสร็จแล้ว ✓ |
| 10 | Review Queue | เสร็จแล้ว ✓ |
| 11 | Mark as Done | เสร็จแล้ว ✓ |
| 12 | Logging | เสร็จแล้ว ✓ |
| 13 | Summary Report | เสร็จแล้ว ✓ |
| 14 | Request Join Facebook Group | เสร็จแล้ว ✓ |

---

## Step 14: Request Join Facebook Group

**เป้าหมาย:**
ให้ผู้ใช้สามารถขอเข้ากลุ่ม Facebook ได้ โดยพิมพ์ชื่อกลุ่มเองหรือเลือกจากรายการที่ค้นหาได้

**ไฟล์ที่เกี่ยวข้อง:**
- `src/agents/group-join.agent.ts`
- `src/db/repositories/group.repo.ts`
- `src/cli/group-join.view.ts`
- `src/types/group.types.ts`

**สิ่งที่ต้องทำ:**
- [ ] สร้าง `src/types/group.types.ts` กำหนด Type:
  - `GroupSearchResult` interface (ชื่อกลุ่ม, URL, จำนวนสมาชิก, สถานะ)
  - `GroupJoinStatus`: `'pending' | 'joined' | 'rejected' | 'already_member'`
  - `GroupJoinRecord` interface (สำหรับบันทึก history)
- [ ] สร้าง `src/db/repositories/group.repo.ts`:
  - `saveGroupJoinRecord(data)` — บันทึกประวัติการขอเข้ากลุ่ม
  - `getGroupJoinHistory()` — ดึงประวัติทั้งหมด
  - `isGroupAlreadyRequested(groupUrl)` — เช็กว่าเคยขอเข้าแล้วหรือยัง
- [ ] สร้าง `src/agents/group-join.agent.ts`:
  - ฟังก์ชัน `searchGroupByName(page, groupName)`:
    - เปิด `https://www.facebook.com/search/groups/?q=<groupName>`
    - ดึงรายการกลุ่มที่ปรากฏ (ชื่อ, URL, จำนวนสมาชิก)
    - คืนค่าเป็น Array ของ `GroupSearchResult`
  - ฟังก์ชัน `requestJoinGroup(page, groupUrl)`:
    - เปิดหน้ากลุ่ม
    - ตรวจสอบสถานะปัจจุบัน (สมาชิกอยู่แล้ว / รอ Approve / ยังไม่ได้ขอ)
    - คลิกปุ่ม "Join Group" หรือ "ขอเข้าร่วม"
    - รอ Confirm และอ่านผลลัพธ์
    - คืนค่า `GroupJoinStatus`
  - ฟังก์ชัน `runGroupJoinFlow(page)`:
    - ถามผู้ใช้ว่าจะป้อนชื่อกลุ่มเอง หรือค้นหาแล้วเลือก
    - ถ้าป้อนชื่อ: เรียก `searchGroupByName()` แล้วแสดงรายการให้เลือก
    - ถ้าเลือกจากรายการ: แสดง list พร้อม pagination
    - เรียก `requestJoinGroup()` กับกลุ่มที่เลือก
    - บันทึกผลลัพธ์ลง DB ผ่าน `group.repo.ts`
- [ ] สร้าง `src/cli/group-join.view.ts`:
  - แสดงรายการผลค้นหาแบบ numbered list
  - แสดงชื่อกลุ่ม, จำนวนสมาชิก, ประเภทกลุ่ม (Public/Private)
  - Option: เลือกกลุ่มเพื่อ Join, ค้นหาใหม่, กลับเมนูหลัก
  - แสดงผลลัพธ์หลัง Join (สำเร็จ / รอ Approve / เป็นสมาชิกอยู่แล้ว)
- [ ] เพิ่ม Option ใน `src/cli/menu.ts`:
  - เพิ่ม "ขอเข้ากลุ่ม Facebook" ในเมนูหลัก
- [ ] รองรับการขอเข้าหลายกลุ่มต่อเนื่อง (loop จนกว่าผู้ใช้จะเลือกออก)
- [ ] ทดสอบค้นหากลุ่ม, เลือก, และกดขอเข้าร่วมได้

**เงื่อนไขว่าทำเสร็จแล้ว:**
- ผู้ใช้พิมพ์ชื่อกลุ่มแล้วเห็นรายการผลการค้นหา
- เลือกกลุ่มจากรายการและขอเข้าร่วมได้
- ระบบตรวจสอบว่าเป็นสมาชิกหรือรอ Approve อยู่แล้วก่อนกด Join
- บันทึกประวัติการขอเข้ากลุ่มลง Database
- กลุ่มที่เคยขอแล้วถูก flag ใน history

---

> อัปเดตไฟล์นี้ทุกครั้งหลัง Step เสร็จ โดยเปลี่ยนสถานะจาก "ยังไม่เริ่ม" → "กำลังทำ" → "เสร็จแล้ว"
