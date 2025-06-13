/**
 * @file main.js
 * @description Điểm khởi đầu của ứng dụng (Entry Point).
 */

import * as DOM from './dom.js';
import { auth, db } from './firebase.js';
import { setupUI, initAuthForms } from './auth.js';
import { formatDate, formatRemainingDays } from './utils.js';
import { fetchUserDetailsForAdmin, updateUserExpiryByAdmin } from './admin.js';
import { openTab, exportToPdf, printCurrentQuote, showLoader, hideLoader } from './ui.js';
import { 
    listenToMainCategories, listenToCatalogItems, handleExcelFileGeneric, renderCatalogPreviewTable,
    exportCatalogHandler, saveCatalogEntryHandler, resetCatalogEditForm, editCatalogEntry, 
    deleteCatalogEntry, addOrUpdateMainCategoryHandler, resetMainCategoryForm, editMainCategory, 
    deleteMainCategory 
} from './catalog.js';
import { 
    listenToCompanySettings, listenToCurrentWorkingQuote, listenToSavedQuotes, handleCatalogComboboxSelection,
    itemImageFileQuoteFormHandler, addOrUpdateItemFromForm, quickSaveToCatalogFromFormHandler,
    resetQuoteItemFormEditingState, prepareNewQuoteItemHandler, editQuoteItemOnForm, deleteQuoteItem,
    saveThisQuoteItemToMasterCatalog, calculateTotals, addInstallment, handleInstallmentChange,
    removeInstallment, saveCurrentWorkingQuoteToFirestore, saveCurrentQuoteToListHandler,
    clearQuoteFormHandler, loadQuoteFromList, deleteQuoteFromList, saveCompanySettingsHandler,
    companyLogoFileHandler, updateQuoteStatus, duplicateQuote // THÊM MỚI: Import hàm duplicateQuote
} from './quote.js';


document.addEventListener('DOMContentLoaded', () => {
    let dataInitializedForUser = null; 
    let unsubscribeListeners = [];

    const authElements = {
        authModal: document.getElementById('auth-modal'),
        appContainer: document.getElementById('app-container'),
        authStatusEl: document.getElementById('auth-status'),
        logoutButton: document.getElementById('logoutButton'),
        loginForm: document.getElementById('login-form'),
        signupForm: document.getElementById('signup-form'),
        loginErrorEl: document.getElementById('login-error'),
        signupErrorEl: document.getElementById('signup-error'),
        showSignupLink: document.getElementById('show-signup'),
        showLoginLink: document.getElementById('show-login')
    };

    initAuthForms(authElements); 
    setupAppEventListeners();
    
    auth.onAuthStateChanged(async (user) => {
        setupUI(user, authElements); 
        
        const adminTab = document.getElementById('admin-tab');
        if (adminTab) {
            adminTab.style.display = 'none';
        }

        if (unsubscribeListeners.length > 0) {
            unsubscribeListeners.forEach(unsubscribe => unsubscribe());
            unsubscribeListeners = [];
        }

        if (user) {
            user.getIdTokenResult(true)
                .then((idTokenResult) => {
                    const isAdmin = idTokenResult.claims.admin === true;
                    if (adminTab) {
                        adminTab.style.display = isAdmin ? 'inline-block' : 'none';
                    }
                })
                .catch((error) => {
                    console.error("Error getting user token:", error);
                });

            const isAllowed = await checkAndSetupAccount(user);
            if (!isAllowed) {
                dataInitializedForUser = null; 
                return; 
            }
            
            await displayAccountInfo(user.uid); 
            
            if (dataInitializedForUser !== user.uid) {
                dataInitializedForUser = user.uid;
                showLoader();
                unsubscribeListeners = await initializeAppForUser(user.uid);
                hideLoader();
            }
        } else {
            dataInitializedForUser = null;
        }
    });
});

async function initializeAppForUser(userId) {
    console.log(`Initializing real-time listeners for user: ${userId}`);
    
    const listeners = [
        listenToMainCategories(userId),
        listenToCatalogItems(userId),
        listenToCompanySettings(userId),
        listenToCurrentWorkingQuote(userId),
        listenToSavedQuotes(userId)
    ];

    openTab('tabQuote');
    console.log("App real-time listeners initialized.");
    
    return listeners;
}

function setupAppEventListeners() {
    
    DOM.tabButtons.forEach(button => {
        button.addEventListener('click', (e) => openTab(e.target.dataset.tab));
    });

    const getUserId = () => auth.currentUser?.uid;

    DOM.excelFileInputManage?.addEventListener('change', (e) => {
        const userId = getUserId();
        if(userId) handleExcelFileGeneric(e, userId);
    });
    DOM.reloadExcelButton?.addEventListener('click', () => {
        DOM.excelFileInputManage.click();
    });

    DOM.catalogSearchInput?.addEventListener('input', renderCatalogPreviewTable);
    DOM.exportCatalogButton?.addEventListener('click', exportCatalogHandler);
    
    DOM.saveCatalogEntryButton?.addEventListener('click', () => {
        const userId = getUserId();
        if(userId) saveCatalogEntryHandler(userId);
    });
    DOM.cancelCatalogEntryEditButton?.addEventListener('click', resetCatalogEditForm);

    DOM.catalogPreviewList?.addEventListener('click', (e) => {
        const userId = getUserId();
        if(!userId) return;
        const id = e.target.dataset.id;
        if (!id) return;
        if (e.target.classList.contains('edit-btn')) editCatalogEntry(id);
        else if (e.target.classList.contains('delete-btn')) deleteCatalogEntry(id, userId);
    });

    DOM.addOrUpdateMainCategoryButton?.addEventListener('click', () => {
        const userId = getUserId();
        if(userId) addOrUpdateMainCategoryHandler(userId);
    });
    DOM.cancelEditMainCategoryButton?.addEventListener('click', resetMainCategoryForm);
    
    DOM.mainCategoriesTableBody?.addEventListener('click', (e) => {
        const userId = getUserId();
        if(!userId) return;
        const id = e.target.dataset.id;
        if (!id) return;
        if (e.target.classList.contains('edit-btn')) editMainCategory(id);
        else if (e.target.classList.contains('delete-btn')) deleteMainCategory(id, userId);
    });

    DOM.catalogItemCombobox?.addEventListener('input', handleCatalogComboboxSelection);
    DOM.itemImageFileQuoteForm?.addEventListener('change', itemImageFileQuoteFormHandler);

    DOM.addOrUpdateItemButtonForm?.addEventListener('click', () => {
        const userId = getUserId();
        if(userId) addOrUpdateItemFromForm(userId);
    });
    DOM.quickSaveToCatalogButtonForm?.addEventListener('click', () => {
        const userId = getUserId();
        if(userId) quickSaveToCatalogFromFormHandler(userId);
    });
    
    DOM.cancelEditQuoteItemButtonForm?.addEventListener('click', resetQuoteItemFormEditingState);
    DOM.prepareNewQuoteItemButton?.addEventListener('click', prepareNewQuoteItemHandler);

    DOM.itemListPreviewTableBody?.addEventListener('click', (e) => {
        const userId = getUserId();
        if(!userId) return;
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        if (!id) return;
        if (target.classList.contains('edit-btn')) editQuoteItemOnForm(id);
        else if (target.classList.contains('delete-btn')) deleteQuoteItem(id, userId);
        else if (target.classList.contains('quick-save-to-catalog-btn-row')) saveThisQuoteItemToMasterCatalog(id, userId);
    });
    
    const inputsToAutoRecalculate = [
        DOM.discountValueInput, DOM.discountTypeSelect, DOM.taxPercentInput,
        DOM.applyDiscountCheckbox, DOM.applyTaxCheckbox, DOM.applyInstallmentsCheckbox
    ];
    inputsToAutoRecalculate.forEach(input => {
        if(input) input.addEventListener('input', () => {
            const userId = getUserId();
            if(userId) calculateTotals(userId);
        });
    });

    DOM.addInstallmentButton?.addEventListener('click', addInstallment);
    DOM.installmentsListContainer?.addEventListener('change', handleInstallmentChange); 
    DOM.installmentsListContainer?.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-installment-btn')) {
            removeInstallment(e.target.dataset.index);
        }
    });
    DOM.installmentsContainer?.addEventListener('focusout', () => {
        const userId = getUserId();
        if(userId) saveCurrentWorkingQuoteToFirestore(userId);
    });

    DOM.saveCurrentQuoteButton?.addEventListener('click', () => {
        const userId = getUserId();
        if(userId) saveCurrentQuoteToListHandler(userId);
    });
    DOM.exportPdfButton?.addEventListener('click', exportToPdf);
    DOM.printQuoteButton?.addEventListener('click', printCurrentQuote);
    DOM.clearQuoteButton?.addEventListener('click', () => {
        const userId = getUserId();
        if(userId) clearQuoteFormHandler(userId);
    });

    DOM.savedQuotesTableBody?.addEventListener('click', (e) => {
        const userId = getUserId();
        if (!userId) return;
        const target = e.target;
        const quoteId = target.dataset.id;
        if (!quoteId) return;

        if (target.classList.contains('load-quote-btn')) {
            loadQuoteFromList(quoteId, userId);
        } else if (target.classList.contains('delete-btn')) {
            deleteQuoteFromList(quoteId, userId);
        } else if (target.classList.contains('duplicate-quote-btn')) { // THÊM MỚI
            duplicateQuote(quoteId, userId);
        }
    });

    DOM.savedQuotesTableBody?.addEventListener('change', (e) => {
        const userId = getUserId();
        if (!userId) return;
        const target = e.target;

        if (target.classList.contains('status-select-action')) {
            const quoteId = target.dataset.id;
            const newStatus = target.value;
            updateQuoteStatus(quoteId, newStatus, userId);
        }
    });
    
    DOM.saveCompanySettingsButton?.addEventListener('click', () => {
        const userId = getUserId();
        if(userId) saveCompanySettingsHandler(userId);
    });

    DOM.companyLogoFileInput?.addEventListener('change', companyLogoFileHandler);
    
    DOM.adminFetchUserButton?.addEventListener('click', fetchUserDetailsForAdmin);
    DOM.adminUpdateExpiryButton?.addEventListener('click', updateUserExpiryByAdmin);
}

async function checkAndSetupAccount(user) {
    if (user.isAnonymous) return true;

    const profileRef = db.collection('users').doc(user.uid).collection('settings').doc('profile');
    try {
        const docSnap = await profileRef.get();
        const now = new Date();
        const trialExpiry = new Date(new Date().setDate(now.getDate() + 7)); 

        if (!docSnap.exists) {
            const defaultProfileData = {
                email: user.email,
                accountCreatedAt: firebase.firestore.Timestamp.fromDate(now),
                validUntil: firebase.firestore.Timestamp.fromDate(trialExpiry),
                status: 'active_trial'
            };
            await profileRef.set(defaultProfileData);
            return true;
        }

        const profileData = docSnap.data();
        let needsUpdate = false;
        let finalProfileData = { ...profileData };

        if (!finalProfileData.validUntil) {
            finalProfileData.validUntil = firebase.firestore.Timestamp.fromDate(trialExpiry);
            needsUpdate = true;
        }

        if (needsUpdate) {
            await profileRef.update(finalProfileData);
        }

        const validUntil = finalProfileData.validUntil.toDate();
        if (new Date() > validUntil) {
            document.getElementById('expiration-modal').style.display = 'flex';
            document.getElementById('app-container').style.display = 'none';
            document.getElementById('auth-modal').style.display = 'none'; 
            document.getElementById('logout-expired-button').onclick = () => auth.signOut();
            return false; 
        }
        
        return true; 

    } catch (error) {
        console.error("Lỗi kiểm tra/tạo tài khoản:", error);
        return false;
    }
}

async function displayAccountInfo(userId) {
    const accountInfoContainer = document.getElementById('account-info-container');
    const detailsDiv = document.getElementById('account-info-details');
    if (!accountInfoContainer || !detailsDiv) return;

    accountInfoContainer.style.display = 'block';
    const profileRef = db.collection('users').doc(userId).collection('settings').doc('profile');

    try {
        const docSnap = await profileRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            const validUntilDate = data.validUntil ? data.validUntil.toDate() : null;
            const remainingDaysString = validUntilDate ? formatRemainingDays(validUntilDate) : 'Chưa có thông tin';
            
            let remainingClass = 'status-ok';
            if (remainingDaysString.includes('hết hạn') || remainingDaysString.includes('hôm nay')) {
                remainingClass = 'status-expired';
            } else if (remainingDaysString.includes('Còn lại') && parseInt(remainingDaysString.split(' ')[2]) <= 3) {
                remainingClass = 'status-warning';
            }

            detailsDiv.innerHTML = `
                <p><strong>Email:</strong> ${data.email || 'N/A'}</p>
                <p><strong>Ngày đăng ký:</strong> ${data.accountCreatedAt ? formatDate(data.accountCreatedAt.toDate()) : 'N/A'}</p>
                <p><strong>Hạn sử dụng đến:</strong> ${validUntilDate ? formatDate(validUntilDate) : 'Chưa có thông tin'}</p>
                <p class="remaining-days ${remainingClass}"><strong>Trạng thái:</strong> ${remainingDaysString}</p>
            `;
        } else {
            detailsDiv.innerHTML = `<p>Đang tạo hồ sơ mặc định...</p>`;
        }
    } catch (error) {
        console.error("Lỗi lấy thông tin hồ sơ:", error);
        detailsDiv.innerHTML = `<p>Lỗi tải thông tin tài khoản.</p>`;
    }
}