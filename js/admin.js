
/**
 * @file admin.js
 * @description Chứa các hàm dành riêng cho quản trị viên.
 */
import { db } from './firebase.js';
import { formatDate } from './utils.js';
import * as DOM from './dom.js';
import * as UI from './ui.js';
import { showNotification } from './notifications.js';


/**
 * Lấy và hiển thị thông tin của một người dùng dựa trên Email hoặc User ID nhập vào.
 */
export async function fetchUserDetailsForAdmin() {
    const searchInput = DOM.adminSearchUserInput.value.trim(); // Changed ID
    if (!searchInput) {
        showNotification("Vui lòng nhập Email hoặc User ID của người dùng cần tìm.", "info");
        return;
    }

    DOM.adminUserDetailsContainer.style.display = 'block';
    DOM.adminUserDetailsDiv.innerHTML = `<p>Đang tìm kiếm người dùng: ${searchInput}...</p>`;
    DOM.adminUpdateStatusP.textContent = '';
    UI.showLoader();

    let profileRef;
    let targetUserId;
    let profileData = null;

    try {
        if (searchInput.includes('@')) {
            const emailQuery = db.collectionGroup('settings').where('email', '==', searchInput);
            const querySnapshot = await emailQuery.get();

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                targetUserId = userDoc.ref.parent.parent.id; 
                profileRef = userDoc.ref; // This is settings/profile doc ref
                profileData = userDoc.data();
            }
        } else {
            targetUserId = searchInput;
            profileRef = db.collection('users').doc(targetUserId).collection('settings').doc('profile');
            const doc = await profileRef.get();
            if (doc.exists) {
                 profileData = doc.data();
            }
        }
        
        if (profileData) {
            UI.renderUserProfile(profileData, targetUserId, DOM.adminUserDetailsDiv);
            DOM.adminTargetUserIdInput.value = targetUserId; 
            if(DOM.adminDaysToExtendInput) DOM.adminDaysToExtendInput.value = ''; // Clear previous days input
        } else {
            DOM.adminUserDetailsDiv.innerHTML = `<p style="color: red;">Không tìm thấy người dùng với thông tin đã cung cấp.</p>`;
        }

    } catch (error) {
        console.error("Error fetching user details:", error);
        let userMessage = 'Đã xảy ra lỗi khi tìm kiếm người dùng.';
        if (error.code === 'permission-denied') {
            userMessage = 'Lỗi: Bạn không có quyền thực hiện hành động này.';
        } else if (error.message && error.message.includes("requires an index")) {
            userMessage = 'Lỗi: Thao tác này yêu cầu một chỉ mục (index) trong Firestore. Vui lòng tạo chỉ mục theo link trong Console (F12).';
        }
        DOM.adminUserDetailsDiv.innerHTML = `<p style="color: red;">${userMessage}</p>`;
    } finally {
        UI.hideLoader();
    }
}


/**
 * Cập nhật ngày hết hạn cho một người dùng bằng cách thêm số ngày.
 */
export async function updateUserExpiryByAdmin() {
    const targetUserId = DOM.adminTargetUserIdInput.value;
    if (!targetUserId) {
        showNotification("Vui lòng tìm kiếm người dùng trước khi cập nhật.", 'info');
        return;
    }
    
    const daysToExtendInput = DOM.adminDaysToExtendInput;
    if (!daysToExtendInput || !daysToExtendInput.value) {
        showNotification("Vui lòng nhập số ngày muốn gia hạn.", 'info');
        return;
    }

    const daysToExtend = parseInt(daysToExtendInput.value);
    if (isNaN(daysToExtend) || daysToExtend <= 0) {
        showNotification("Vui lòng nhập một số ngày hợp lệ (lớn hơn 0) để gia hạn.", 'error');
        return;
    }

    const profileRef = db.collection('users').doc(targetUserId).collection('settings').doc('profile');
    
    UI.showLoader();
    try {
        const userProfileDoc = await profileRef.get();
        let currentExpiryDate;

        if (userProfileDoc.exists && userProfileDoc.data().validUntil) {
            currentExpiryDate = userProfileDoc.data().validUntil.toDate();
            // If current expiry is in the past, extend from today
            if (currentExpiryDate < new Date()) {
                currentExpiryDate = new Date();
                currentExpiryDate.setHours(0,0,0,0); // Start of today for calculation if expired
            }
        } else {
            currentExpiryDate = new Date(); // Default to now if no previous expiry
            currentExpiryDate.setHours(0,0,0,0); // Start of today
        }

        const newExpiryDate = new Date(currentExpiryDate);
        newExpiryDate.setDate(currentExpiryDate.getDate() + daysToExtend);
        newExpiryDate.setHours(23, 59, 59, 999); // Set to end of the new expiry day

        const newExpiryTimestamp = firebase.firestore.Timestamp.fromDate(newExpiryDate);
        
        await profileRef.update({ validUntil: newExpiryTimestamp });
        
        const successMessage = `Cập nhật thành công! Hạn mới: ${formatDate(newExpiryDate)}. Gia hạn thêm ${daysToExtend} ngày.`;
        DOM.adminUpdateStatusP.textContent = successMessage;
        showNotification('Cập nhật hạn sử dụng thành công!', 'success');
        
        // Refresh displayed user details
        const updatedDoc = await profileRef.get();
        if(updatedDoc.exists) {
            UI.renderUserProfile(updatedDoc.data(), targetUserId, DOM.adminUserDetailsDiv);
        }
        daysToExtendInput.value = ''; // Clear input after successful update

    } catch (error) {
        console.error("Error updating expiry date:", error);
        const message = error.code === 'permission-denied' 
            ? 'Cập nhật thất bại: Không có quyền.' 
            : 'Cập nhật thất bại. Vui lòng thử lại.';
        DOM.adminUpdateStatusP.textContent = message;
        showNotification(message, 'error');
    } finally {
        UI.hideLoader();
    }
}
