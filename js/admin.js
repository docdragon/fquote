/**
 * @file admin.js
 * @description Chứa các hàm dành riêng cho quản trị viên.
 */
import { db } from './firebase.js';
import { formatDate } from './utils.js';
import * as DOM from './dom.js';
import * as UI from './ui.js';

/*
 * SỬA ĐỔI: Hàm checkAdminRole đã được loại bỏ vì không an toàn.
 * Việc kiểm tra admin giờ đây sẽ được thực hiện trong file main.js
 * bằng cách đọc Custom Claims từ token xác thực của người dùng.
 */

/**
 * Lấy và hiển thị thông tin của một người dùng dựa trên Email hoặc User ID nhập vào.
 */
export async function fetchUserDetailsForAdmin() {
    const searchInput = DOM.adminSearchUserIdInput.value.trim();
    if (!searchInput) {
        alert("Vui lòng nhập Email hoặc User ID của người dùng cần tìm.");
        return;
    }

    DOM.adminUserDetailsContainer.style.display = 'block';
    DOM.adminUserDetailsDiv.innerHTML = `<p>Đang tìm kiếm người dùng: ${searchInput}...</p>`;
    DOM.adminUpdateStatusP.textContent = '';
    UI.showLoader();

    let profileRef;
    let targetUserId;

    // Kiểm tra xem chuỗi nhập vào là email hay UID
    if (searchInput.includes('@')) {
        // Tìm kiếm theo email bằng collectionGroup query
        try {
            const emailQuery = db.collectionGroup('settings').where('email', '==', searchInput);
            const querySnapshot = await emailQuery.get();

            if (querySnapshot.empty) {
                DOM.adminUserDetailsDiv.innerHTML = `<p style="color: red;">Không tìm thấy người dùng với email này.</p>`;
                UI.hideLoader();
                return;
            }
            
            // Giả sử email là duy nhất, lấy kết quả đầu tiên
            const userDoc = querySnapshot.docs[0];
            targetUserId = userDoc.ref.parent.parent.id; // Lấy User ID từ đường dẫn
            profileRef = userDoc.ref; // Đây là tham chiếu trực tiếp đến document 'profile'

        } catch (error) {
            DOM.adminUserDetailsDiv.innerHTML = `<p style="color: red;">Lỗi khi tìm kiếm bằng email. Firestore có thể yêu cầu tạo Index. Vui lòng kiểm tra Console (F12) để xem chi tiết.</p>`;
            console.error("Error fetching user by email:", error);
            UI.hideLoader();
            return;
        }
    } else {
        // Tìm kiếm theo User ID
        targetUserId = searchInput;
        profileRef = db.collection('users').doc(targetUserId).collection('settings').doc('profile');
    }

    // Lấy và hiển thị dữ liệu từ profileRef đã tìm được
    try {
        const doc = await profileRef.get();
        if (doc.exists) {
            const data = doc.data();
            DOM.adminUserDetailsDiv.innerHTML = `
                <p><strong>Email:</strong> ${data.email || 'N/A'}</p>
                <p><strong>User ID:</strong> ${targetUserId}</p>
                <p><strong>Ngày đăng ký:</strong> ${data.accountCreatedAt ? formatDate(data.accountCreatedAt.toDate()) : 'N/A'}</p>
                <p><strong>Hạn sử dụng hiện tại:</strong> ${data.validUntil ? formatDate(data.validUntil.toDate()) : 'N/A'}</p>
            `;
            DOM.adminTargetUserIdInput.value = targetUserId; // Lưu ID để cập nhật
            DOM.adminNewExpiryDateInput.value = '';
        } else {
            DOM.adminUserDetailsDiv.innerHTML = `<p style="color: red;">Không tìm thấy người dùng với ID này.</p>`;
        }
    } catch (error) {
        DOM.adminUserDetailsDiv.innerHTML = `<p style="color: red;">Lỗi khi lấy thông tin chi tiết người dùng.</p>`;
        console.error("Error fetching user details:", error);
    } finally {
        UI.hideLoader();
    }
}

/**
 * Cập nhật ngày hết hạn cho một người dùng.
 */
export async function updateUserExpiryByAdmin() {
    const targetUserId = DOM.adminTargetUserIdInput.value;
    if (!targetUserId) {
        alert("Vui lòng tìm kiếm người dùng trước khi cập nhật.");
        return;
    }
    if (!DOM.adminNewExpiryDateInput.value) {
        alert("Vui lòng chọn ngày hết hạn mới.");
        return;
    }

    const newExpiryDate = new Date(DOM.adminNewExpiryDateInput.value);
    newExpiryDate.setHours(23, 59, 59, 999);
    
    const newExpiryTimestamp = firebase.firestore.Timestamp.fromDate(newExpiryDate);
    const profileRef = db.collection('users').doc(targetUserId).collection('settings').doc('profile');
    
    UI.showLoader();
    try {
        await profileRef.update({ validUntil: newExpiryTimestamp });
        DOM.adminUpdateStatusP.textContent = `Cập nhật thành công! Hạn mới: ${formatDate(newExpiryDate)}`;
        
        // Tải lại thông tin để hiển thị ngày mới được cập nhật
        const updatedDoc = await profileRef.get();
        if(updatedDoc.exists) {
            const data = updatedDoc.data();
             DOM.adminUserDetailsDiv.innerHTML = `
                <p><strong>Email:</strong> ${data.email || 'N/A'}</p>
                <p><strong>User ID:</strong> ${targetUserId}</p>
                <p><strong>Ngày đăng ký:</strong> ${data.accountCreatedAt ? formatDate(data.accountCreatedAt.toDate()) : 'N/A'}</p>
                <p><strong>Hạn sử dụng hiện tại:</strong> ${data.validUntil ? formatDate(data.validUntil.toDate()) : 'N/A'}</p>
            `;
        }
    } catch (error) {
        DOM.adminUpdateStatusP.textContent = 'Cập nhật thất bại. Vui lòng thử lại.';
        console.error("Error updating expiry date:", error);
    } finally {
        UI.hideLoader();
    }
}
