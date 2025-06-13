/**
 * @file unsavedChanges.js
 * @description Quản lý cảnh báo khi có thay đổi chưa được lưu.
 */

let isDirty = false; // Cờ để theo dõi trạng thái thay đổi

/**
 * Đặt trạng thái của trang (có thay đổi chưa lưu hay không).
 * @param {boolean} status - true nếu có thay đổi, false nếu không.
 */
export function setDirty(status) {
    isDirty = status;
}

/**
 * Khởi tạo trình lắng nghe sự kiện để cảnh báo người dùng.
 */
export function initUnsavedChangesWarning() {
    window.addEventListener('beforeunload', (event) => {
        if (isDirty) {
            // Hiển thị hộp thoại xác nhận của trình duyệt
            event.preventDefault();
            // Dòng này là bắt buộc đối với một số trình duyệt cũ
            event.returnValue = '';
        }
    });
}
