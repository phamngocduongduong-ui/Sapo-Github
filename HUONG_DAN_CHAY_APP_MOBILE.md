# HƯỚNG DẪN GIẢ LẬP & TẠO APP MOBILE NỘI BỘ (CÁ NHÂN & PHÊ DUYỆT)

Giao diện App Mobile dành riêng cho **Phân hệ Cá nhân** và **Phân hệ Phê duyệt** đã được tích hợp trực tiếp vào dự án Sapo EMS hiện tại.

---

## 📱 1. TRUY CẬP GIAO DIỆN MOBILE TRÊN LOCALHOST (MÁY TÍNH)

Bạn có thể chạy và trải nghiệm ngay giao diện App Mobile trên máy tính của mình mà **KHÔNG ẢNH HƯỞNG TỚI VPS**:

1. Chạy hệ thống EMS trên máy tính của bạn:
   ```cmd
   npm run dev
   ```
2. Mở trình duyệt và truy cập vào đường dẫn:
   **`http://localhost:3000/mobile`** (hoặc chọn menu **📱 Giao diện App Mobile** ở thanh Sidebar bên trái).
3. Bấm **`F12`** -> chọn biểu tượng **Điện thoại (`Ctrl + Shift + M`)** trên Chrome để xem giao diện dưới dạng điện thoại thông minh (iPhone/Android).

---

## 🤖 2. CÁCH CHẠY GIẢ LẬP TRÊN PHẦN MỀM GIẢ LẬP (LDPlayer / BlueStacks / Android Studio)

Để chạy giả lập ứng dụng trên phần mềm giả lập điện thoạiAndroid:

* **Trên máy ảo Android Studio:**  
  Địa chỉ API kết nối về máy tính Localhost: **`http://10.0.2.2:3000/mobile`**
* **Trên LDPlayer / BlueStacks hoặc Điện thoại thật cùng Wi-Fi:**  
  1. Mở `cmd` gõ `ipconfig` để lấy IP LAN máy tính của bạn (Ví dụ: `192.168.1.15`).
  2. Truy cập trình duyệt trong máy ảo: **`http://192.168.1.15:3000/mobile`**

---

## 📦 3. QUY TRÌNH ĐÓNG GÓI THÀNH FILE .APK CHẠY TRÊN ĐIỆN THOẠI

Khi bạn đã sẵn sàng xuất thành ứng dụng `.apk` độc lập cài vào điện thoại:

1. Cài đặt Capacitor (chỉ cần chạy 1 lần):
   ```cmd
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init "Sapo Approval App" "com.sapodaklak.approval"
   ```
2. Cấu hình file `capacitor.config.json` kết nối về Localhost máy tính:
   ```json
   {
     "appId": "com.sapodaklak.approval",
     "appName": "Sapo Approval",
     "webDir": "out",
     "server": {
       "url": "http://10.0.2.2:3000/mobile",
       "cleartext": true
     }
   }
   ```
3. Tạo ứng dụng Android:
   ```cmd
   npx cap add android
   npx cap open android
   ```
4. Bấm **Build > Build APK** trong Android Studio để xuất file `.apk` cài lên điện thoại!

---

## ⚡ CHUYỂN TỪ LOCALHOST SANG VPS ĐỂ ĐĂNG CH PLAY

Khi bạn chạy thử nghiệm thành công trên Localhost và muốn chuyển sang dữ liệu thật để đăng CH Play:
* Chỉ cần đổi `url` từ `http://10.0.2.2:3000/mobile` thành `https://ems.sapodaklak.com/mobile`.

---

## 🔔 4. CƠ CHẾ THÔNG BÁO KHI TẮT / KHÓA MÀN HÌNH ĐIỆN THOẠI (GIỐNG ZALO)

Để ứng dụng nhận được thông báo khi **tắt màn hình** hoặc **khóa điện thoại** giống Zalo:

1. **Trên trình duyệt Web / PWA:**
   * Dự án đã được tích hợp **Service Worker (`public/sw.js`)**.
   * Khi mở App Mobile tại `/mobile`, bấm **`Bật ngay`** trên dải băng thông báo.
   * Khi điện thoại tắt màn hình hoặc trình duyệt chạy ẩn, hệ thống sẽ đẩy thông báo khóa màn hình kèm chuông báo.

2. **Khi đóng gói thành ứng dụng Android Native (.apk):**
   * Sử dụng plugin Capacitor Push Notification:
     ```cmd
     npm install @capacitor/push-notifications
     npx cap sync
     ```
   * Khi tạo file `.apk`, Android Service sẽ chạy ngầm 24/7. Mỗi khi có đề nghị phê duyệt mới từ hệ thống, điện thoại sẽ tự động **sáng màn hình, phát âm thanh và hiển thị thông báo Zalo-style trên màn hình khóa** ngay cả khi đã tắt app!

