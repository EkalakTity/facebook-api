# fb-scroll — Facebook Feed Scroll & Chat Search

เมื่อ user รัน `/fb-scroll` ให้ทำตามขั้นตอนนี้:

## สิ่งที่ skill นี้ทำ
สร้างหรืออัพเดทโปรเจกต์ Facebook automation โดย:
1. ตั้งค่า project structure
2. สร้าง/แก้ไข code ตาม argument ที่รับมา
3. รัน dev server ถ้าขอ

## Argument ที่รับได้
- `setup` — สร้าง project structure ทั้งหมด (Streamlit + Playwright)
- `scroll` — เพิ่ม/แก้ feed scroll feature
- `chat <keyword>` — เพิ่ม/แก้ chat search feature
- `run` — รัน Streamlit dev server
- `status` — แสดงสถานะ project และ file ที่มีอยู่

## วิธีทำงานของแต่ละ argument

### setup
สร้างไฟล์เหล่านี้ถ้ายังไม่มี:
- `requirements.txt` — dependencies (playwright, streamlit, asyncio)
- `app.py` — Streamlit main app
- `fb_bot.py` — Playwright browser automation
- `.env.example` — template สำหรับ credentials

### scroll
เพิ่ม scroll logic ใน `fb_bot.py`:
- infinite scroll บน News Feed
- หยุดเมื่อครบจำนวน post ที่กำหนด
- return list ของ post text + URL

### chat <keyword>
เพิ่ม chat search logic ใน `fb_bot.py`:
- เปิด Messenger
- วนหา conversation ที่มี keyword
- return รายชื่อ chat + preview ข้อความ

### run
รัน `streamlit run app.py` และแจ้ง URL

### status
อ่านไฟล์ใน project แล้วสรุปว่า implement อะไรไปแล้ว อะไรยังขาด

## ข้อควรระวัง
- ถามหา `.env` credentials ก่อนรัน browser จริง
- แจ้ง user เสมอว่า automation ขัด Facebook ToS
- ไม่ save password ลง code โดยตรง ให้ใช้ `os.environ` เสมอ
