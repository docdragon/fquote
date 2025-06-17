/**
 * @file auth.js
 * @description Xử lý logic xác thực người dùng (Đăng ký, Đăng nhập, Đăng xuất, Quên mật khẩu).
 */
import { auth, db } from './firebase.js';
import { showNotification } from './notifications.js';
import * as DOM from './dom.js'; // Import DOM for password toggle

export function setupUI(user, { authModal, appContainer, authStatusEl, logoutButton }) {
    if (!authModal || !appContainer || !authStatusEl || !logoutButton) {
        return;
    }

    if (user) {
        let displayName = user.displayName;
        if (!displayName && user.email) {
            displayName = user.email.split('@')[0];
        }
        if (!displayName) {
            displayName = "Người dùng"; // Fallback
        }
        authStatusEl.textContent = `Xin chào, ${displayName}`;
        
        if (!user.emailVerified) {
             authStatusEl.innerHTML += ` <small style="color:orange;">(Chưa xác thực)</small>`;
        }
        logoutButton.style.display = 'inline-block';
        
        authModal.style.display = 'none';
        appContainer.style.display = 'block';
    } else {
        authModal.style.display = 'flex';
        appContainer.style.display = 'none';
    }
}

export function initAuthForms({ loginForm, signupForm, loginErrorEl, signupErrorEl, showSignupLink, showLoginLink, logoutButton }) {
    
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const loginPasswordInput = DOM.loginForm ? DOM.loginForm['login-password'] : null;
    const toggleLoginPasswordBtn = DOM.toggleLoginPasswordButton;


    if (!loginForm || !signupForm || !showSignupLink || !showLoginLink || !logoutButton || !forgotPasswordLink) {
        return;
    }

    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = signupForm['signup-email'].value;
        const password = signupForm['signup-password'].value;
        signupErrorEl.textContent = '';
        
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                const createdUser = userCredential.user;
                const now = new Date();
                const validUntil = new Date(new Date().setDate(now.getDate() + 7)); 
                const profileData = {
                    email: createdUser.email,
                    displayName: createdUser.email.split('@')[0], // Set initial displayName
                    accountCreatedAt: firebase.firestore.Timestamp.fromDate(now),
                    validUntil: firebase.firestore.Timestamp.fromDate(validUntil),
                    status: 'active_trial'
                };
                db.collection('users').doc(createdUser.uid).collection('settings').doc('profile').set(profileData);
                return createdUser.sendEmailVerification();
            })
            .then(() => {
                auth.signOut();
                alert('Đăng ký thành công! Bạn đã nhận được 7 ngày dùng thử. Vui lòng kiểm tra hộp thư để xác thực tài khoản, sau đó quay lại trang này để đăng nhập.');
                signupForm.style.display = 'none';
                loginForm.style.display = 'block';
            })
            .catch(err => {
                if (err.code === 'auth/email-already-in-use') {
                    signupErrorEl.textContent = 'Email này đã được sử dụng.';
                } else if (err.code === 'auth/weak-password') {
                     signupErrorEl.textContent = 'Mật khẩu phải có ít nhất 6 ký tự.';
                } else {
                    signupErrorEl.textContent = 'Đã có lỗi xảy ra. Vui lòng thử lại.';
                }
            });
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginForm['login-email'].value;
        const password = loginPasswordInput ? loginPasswordInput.value : '';
        loginErrorEl.textContent = '';

        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                if (!userCredential.user.emailVerified) {
                    auth.signOut();
                    showNotification('Tài khoản chưa được xác thực. Vui lòng kiểm tra email.', 'error');
                }
            })
            .catch(err => {
                let message = 'Đã có lỗi xảy ra. Vui lòng thử lại.'; 
                switch (err.code) {
                    case 'auth/user-not-found':
                        message = 'Không tìm thấy tài khoản với email này.';
                        break;
                    case 'auth/wrong-password':
                        message = 'Mật khẩu không chính xác. Vui lòng thử lại.';
                        break;
                    case 'auth/invalid-email':
                        message = 'Địa chỉ email không hợp lệ.';
                        break;
                    case 'auth/too-many-requests':
                        message = 'Phát hiện hoạt động bất thường. Tài khoản đã bị tạm khóa, vui lòng thử lại sau.';
                        break;
                    case 'auth/invalid-credential': // More generic error for wrong email/password
                        message = 'Thông tin đăng nhập không chính xác.';
                        break;
                }
                if(loginErrorEl) loginErrorEl.textContent = message;
            });
    });

    logoutButton.addEventListener('click', () => {
        if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
            auth.signOut();
        }
    });

    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        const email = loginForm['login-email'].value;
        if (!email) {
            showNotification('Vui lòng nhập email của bạn vào ô Email để lấy lại mật khẩu.', 'error');
            loginForm['login-email'].focus();
            return;
        }

        auth.sendPasswordResetEmail(email)
            .then(() => {
                showNotification(`Đã gửi email đặt lại mật khẩu tới ${email}. Vui lòng kiểm tra hộp thư của bạn.`, 'success');
            })
            .catch((error) => {
                if (error.code === 'auth/user-not-found') {
                    showNotification('Không tìm thấy người dùng với email này.', 'error');
                } else {
                    showNotification('Lỗi khi gửi email. Vui lòng thử lại.', 'error');
                }
            });
    });

    // Password Toggle Functionality
    if (toggleLoginPasswordBtn && loginPasswordInput) {
        toggleLoginPasswordBtn.addEventListener('click', () => {
            const type = loginPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            loginPasswordInput.setAttribute('type', type);
            toggleLoginPasswordBtn.textContent = type === 'password' ? '👁️' : '🙈';
            toggleLoginPasswordBtn.setAttribute('aria-label', type === 'password' ? 'Hiện mật khẩu' : 'Ẩn mật khẩu');
        });
    }
}