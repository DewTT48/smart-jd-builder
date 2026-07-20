# ระบบสร้าง JD อัจฉริยะ

Landing Page สำหรับ JD Builder V3 แยกจากตัว Google Apps Script เพื่อให้ปรับหน้าแนะนำบริการและเผยแพร่ผ่าน GitHub Pages ได้โดยไม่กระทบระบบหลัก

## โครงสร้าง

- `index.html` หน้า Landing Page และแบบฟอร์ม Lead
- `styles.css` รูปแบบ Responsive และ Animation
- `app.js` เมนู แท็บ Modal และการส่งแบบฟอร์ม
- `site-config.js` ลิงก์เข้าสู่ระบบและ Apps Script Lead API endpoint
- `privacy.html` นโยบายความเป็นส่วนตัวฉบับย่อ
- `assets/` ภาพตัวอย่างระบบที่ใช้ข้อมูลจำลอง

## ระบบ Lead

แบบฟอร์มติดต่อส่งข้อมูลผ่าน Apps Script Web App ใน `backend/` ไปยัง Google Sheet ของ Admin โดยตรง ระบบตรวจข้อมูลฝั่ง Server, ใช้ honeypot, จำกัดการส่งซ้ำ และป้องกัน Spreadsheet formula injection

ค่าที่เป็นข้อมูลภายในอยู่ใน `backend/PrivateConfig.js` ซึ่งไม่ถูก commit เข้า Public Repo อีเมลปลายทางและ Google Sheet ID จึงไม่ปรากฏในหน้าเว็บหรือ source code สาธารณะ

## ทดลองในเครื่อง

```bash
python3 -m http.server 4173
```

จากนั้นเปิด `http://localhost:4173`

## เผยแพร่

GitHub Pages เผยแพร่เว็บไซต์จาก root ของ branch `main` โดยตรง ทุกครั้งที่ push การเปลี่ยนแปลง เว็บไซต์จะอัปเดตอัตโนมัติ
