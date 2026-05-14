# ระบบวัสดุสิ้นเปลือง (Consumable Items Management)

เวอร์ชัน static frontend สำหรับ deploy บน GitHub Pages โดยไม่ต้องใช้ Google Apps Script backend

## โครงสร้างไฟล์

| ไฟล์ | บทบาท |
|------|-------|
| `index.html` | หน้าเว็บหลัก (login + app shell) |
| `styles.css` | สไตล์ CSS custom |
| `api.js` | Mock API ใช้ localStorage แทน Google Sheets |
| `app.js` | Frontend logic ทั้งหมด (รวมจาก js.js js2.js js3.js js4.js) |

## วิธี deploy บน GitHub Pages

1. Push โค้ดทั้งหมดขึ้น GitHub repository
2. ไปที่ Settings > Pages
3. เลือก Branch `main` (หรือ `master`) และ folder `/ (root)`
4. GitHub จะสร้าง URL `https://<username>.github.io/<repo-name>/`

## ข้อควรระวัง

- **รูปภาพ**: อัปโหลดรูปจะเก็บเป็น base64 ใน localStorage ซึ่งมีข้อจำกัดเรื่องขนาด (~5MB) และความจุ localStorage (~5-10MB)
- **QR Scanner**: ต้องใช้ผ่าน HTTPS เท่านั้น (GitHub Pages รองรับ HTTPS อยู่แล้ว)
- **ข้อมูล**: ข้อมูลทั้งหมดจัดเก็บใน localStorage ของเบราว์เซอร์ หากล้าง cache ข้อมูลจะหาย
- **บัญชีเริ่มต้น** (จาก `api.js`):
  - admin / 123456
  - staff / 123456
  - employee / 123456

## ฟีเจอร์ที่รองรับ

- [x] Login / Logout / Forgot password
- [x] Dashboard สถิติ + กราฟ Chart.js
- [x] รายการวัสดุ (CRUD + รูปภาพ)
- [x] สต็อกคงเหลือ (Card / Table view)
- [x] รับวัสดุเข้าคลัง
- [x] เบิกวัสดุ + อนุมัติ (Workflow)
- [x] QR Code สำหรับเบิกวัสดุ (Generate + Print)
- [x] QR Scanner ด้วยกล้อง (html5-qrcode)
- [x] ประวัติเคลื่อนไหว + รายงาน
- [x] รายงานรายเดือน (Matrix)
- [x] จัดการผู้ใช้งาน
- [x] โปรไฟล์ + เปลี่ยนรหัสผ่าน
- [x] ตั้งค่าระบบ

## ไลบรารีภายนอก (CDN)

- Tailwind CSS
- Chart.js
- SweetAlert2
- QRCode.js
- html5-qrcode
- Flaticon Uicons

## License

MIT
