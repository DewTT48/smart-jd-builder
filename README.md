# ระบบสร้าง JD อัจฉริยะ

Landing Page สำหรับ JD Builder V3 แยกจากตัว Google Apps Script เพื่อให้ปรับหน้าแนะนำบริการและเผยแพร่ผ่าน GitHub Pages ได้โดยไม่กระทบระบบหลัก

## โครงสร้าง

- `index.html` หน้า Landing Page และแบบฟอร์ม Lead
- `styles.css` รูปแบบ Responsive และ Animation
- `app.js` เมนู แท็บ Modal และการส่งแบบฟอร์ม
- `site-config.js` ลิงก์เข้าสู่ระบบและ Formspree endpoint
- `privacy.html` นโยบายความเป็นส่วนตัวฉบับย่อ
- `assets/` ภาพตัวอย่างระบบที่ใช้ข้อมูลจำลอง

## ตั้งค่าแบบฟอร์ม Lead

1. สร้างฟอร์มใน Formspree และตั้งอีเมลปลายทางในบัญชี Formspree
2. เปิด Spam Protection, Restrict to Domain และ Email Notifications
3. คัดลอก endpoint รูปแบบ `https://formspree.io/f/xxxxxxxx`
4. ใส่ endpoint ใน `site-config.js`

อีเมลปลายทางจะไม่ปรากฏในหน้าเว็บหรือ source code ผู้เยี่ยมชมจะเห็นเฉพาะแบบฟอร์มติดต่อ

## ทดลองในเครื่อง

```bash
python3 -m http.server 4173
```

จากนั้นเปิด `http://localhost:4173`

## เผยแพร่

GitHub Pages เผยแพร่เว็บไซต์จาก root ของ branch `main` โดยตรง ทุกครั้งที่ push การเปลี่ยนแปลง เว็บไซต์จะอัปเดตอัตโนมัติ
