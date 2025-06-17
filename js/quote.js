
/**
 * @file quote.js
 * @description Quản lý logic báo giá với listeners thời gian thực, trạng thái, và các tùy chỉnh.
 */

import * as DOM from './dom.js';
// import * as UI from './ui.js'; // ĐÃ XÓA: Phá vỡ phụ thuộc vòng
import { db, auth } from './firebase.js';
import { formatDate, formatCurrency, generateSimpleQuoteId, generateUniqueId, numberToRoman } from './utils.js';
import { getLoadedCatalog, getMainCategories, findOrCreateMainCategory, saveItemToMasterCatalog } from './catalog.js';
import { showNotification } from './notifications.js';
import * as UI from './ui.js'; // Import UI for openTab

// --- STATE & CONSTANTS ---
const QUOTE_STATUSES = {
    draft: 'Soạn thảo',
    sent: 'Đã gửi',
    accepted: 'Đã chấp nhận',
    rejected: 'Đã từ chối',
    expired: 'Đã hết hạn'
};
let currentQuoteItems = [];
let savedQuotes = [];
let companySettings = { bankAccount: '', logoDataUrl: null, defaultQuoteNotes: '' };
let currentQuoteIdInternal = null;
let itemImageDataBase64QuoteForm = null;
let quoteInstallmentData = [];

// === GETTERS ===
export const getCompanySettings = () => ({ ...companySettings });
export const getCurrentQuoteItems = () => [...currentQuoteItems];
export const getCurrentQuoteId = () => currentQuoteIdInternal;
export const getQuoteInstallmentData = () => [...quoteInstallmentData];

// === REAL-TIME LISTENERS ===

export function listenToCompanySettings(userId) {
    if (!userId) return () => {};
    const docRef = db.collection('users').doc(userId).collection('settings').doc('company');
    const unsubscribe = docRef.onSnapshot(doc => {
        if (doc.exists) {
            companySettings = doc.data();
            DOM.companyNameSettingInput.value = companySettings.name || '';
            DOM.companyAddressSettingInput.value = companySettings.address || '';
            DOM.companyPhoneSettingInput.value = companySettings.phone || '';
            DOM.companyEmailSettingInput.value = companySettings.email || '';
            DOM.companyTaxIdSettingInput.value = companySettings.taxId || '';
            DOM.companyBankAccountSetting.value = companySettings.bankAccount || '';
            DOM.defaultNotesSettingInput.value = companySettings.defaultQuoteNotes || '';
            if (companySettings.logoDataUrl) {
                DOM.logoPreview.src = companySettings.logoDataUrl;
                DOM.logoPreview.style.display = 'block';
            } else {
                 DOM.logoPreview.style.display = 'none';
            }

            const printOptions = companySettings.printOptions || {};
            DOM.printTitleSettingInput.value = printOptions.title || 'BÁO GIÁ';
            DOM.printCreatorNameSettingInput.value = printOptions.creatorName || '';
            DOM.hideSttColumnCheckbox.checked = printOptions.hideSttColumn || false;
            DOM.hideImageColumnCheckbox.checked = printOptions.hideImageColumn || false;
            DOM.hideMeasureColumnCheckbox.checked = printOptions.hideMeasureColumn || false;
            DOM.printFooterSettingInput.value = printOptions.footer || '';

        } else {
            companySettings = {};
        }
    }, error => console.error("Lỗi lắng nghe cài đặt công ty:", error));
    return unsubscribe;
}

export function listenToCurrentWorkingQuote(userId) {
    if (!userId) return () => {};
    const docRef = db.collection('users').doc(userId).collection('ux').doc('currentQuote');
    const unsubscribe = docRef.onSnapshot(doc => {
        if (doc.exists) {
            const quoteData = doc.data();
            currentQuoteIdInternal = quoteData.id || generateSimpleQuoteId(quoteData.customerName, quoteData.quoteDate);
            DOM.customerNameInput.value = quoteData.customerName || '';
            DOM.customerAddressInput.value = quoteData.customerAddress || '';
            DOM.quoteDateInput.value = quoteData.quoteDate || new Date().toISOString().split('T')[0];
            currentQuoteItems = quoteData.items || [];
            DOM.applyDiscountCheckbox.checked = typeof quoteData.applyDiscount === 'boolean' ? quoteData.applyDiscount : true;
            DOM.discountValueInput.value = quoteData.discountValue || '0';
            DOM.discountTypeSelect.value = quoteData.discountType || 'percent';
            DOM.applyTaxCheckbox.checked = typeof quoteData.applyTax === 'boolean' ? quoteData.applyTax : true;
            DOM.taxPercentInput.value = quoteData.taxPercent || '0';
            DOM.applyInstallmentsCheckbox.checked = quoteData.applyInstallments || false;
            quoteInstallmentData = Array.isArray(quoteData.installments) ? quoteData.installments : [];
            renderQuoteItemsPreview();
            calculateTotals(userId, false);
        } else {
            startNewQuote(userId);
        }
    }, error => console.error("Lỗi lắng nghe báo giá nháp:", error));
    return unsubscribe;
}

export function listenToSavedQuotes(userId) {
    if (!userId) return () => {};
    const query = db.collection('users').doc(userId).collection('quotes').orderBy('timestamp', 'desc').limit(50);
    const unsubscribe = query.onSnapshot(snapshot => {
        savedQuotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSavedQuotesList();
        if (DOM.loadMoreQuotesButton) DOM.loadMoreQuotesButton.style.display = 'none';
    }, error => {
        console.error("Lỗi lắng nghe báo giá đã lưu:", error);
        const message = error.code === 'permission-denied'
            ? 'Tải danh sách báo giá thất bại: Không có quyền.'
            : 'Tải danh sách báo giá thất bại. Vui lòng kiểm tra kết nối mạng.';
        showNotification(message, 'error');
    });
    return unsubscribe;
}

// === IMAGE HANDLING (Base64) ===

export function itemImageFileQuoteFormHandler(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.size > 500 * 1024) {
            showNotification('Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 500KB.', 'error');
            DOM.itemImageFileQuoteForm.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            DOM.itemImagePreviewQuoteForm.src = e.target.result;
            DOM.itemImagePreviewQuoteForm.style.display = 'block';
            itemImageDataBase64QuoteForm = e.target.result;
        }
        reader.readAsDataURL(file);
    }
}

export function companyLogoFileHandler(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.size > 1 * 1024 * 1024) {
            showNotification('Logo quá lớn (tối đa 1MB).', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            DOM.logoPreview.src = e.target.result;
            DOM.logoPreview.style.display = 'block';
            companySettings.logoDataUrl = e.target.result;
        }
        reader.readAsDataURL(file);
    }
}

// === QUOTE STATUS MANAGEMENT ===
export async function updateQuoteStatus(quoteId, newStatus, userId) {
    if (!quoteId || !newStatus || !userId) {
        showNotification("Dữ liệu không hợp lệ để cập nhật trạng thái.", 'error');
        return;
    }
    const quoteRef = db.collection('users').doc(userId).collection('quotes').doc(quoteId);
    try {
        await quoteRef.update({ status: newStatus });
        showNotification(`Đã cập nhật trạng thái thành "${QUOTE_STATUSES[newStatus]}".`, 'success');
    } catch (error) {
        console.error("Lỗi cập nhật trạng thái:", error);
        const message = error.code === 'permission-denied'
            ? 'Cập nhật thất bại: Không có quyền.'
            : 'Lỗi khi cập nhật trạng thái.';
        showNotification(message, 'error');
    }
}


// === QUOTE & ITEM LOGIC ===

export function startNewQuote(userId) {
    const custName = DOM.customerNameInput.value;
    const qDate = DOM.quoteDateInput.value || new Date().toISOString().split('T')[0];
    currentQuoteIdInternal = generateSimpleQuoteId(custName, qDate);

    DOM.customerNameInput.value = '';
    DOM.customerAddressInput.value = '';
    DOM.quoteDateInput.value = new Date().toISOString().split('T')[0];
    currentQuoteItems = [];
    quoteInstallmentData = [];
    resetQuoteItemFormEditingState();
    renderQuoteItemsPreview();
    calculateTotals(userId);
}

export async function saveCompanySettingsHandler(userId) {
    if (!userId) return;
    const printOptions = {
        title: DOM.printTitleSettingInput.value.trim(),
        creatorName: DOM.printCreatorNameSettingInput.value.trim(),
        hideSttColumn: DOM.hideSttColumnCheckbox.checked,
        hideImageColumn: DOM.hideImageColumnCheckbox.checked,
        hideMeasureColumn: DOM.hideMeasureColumnCheckbox.checked,
        footer: DOM.printFooterSettingInput.value.trim()
    };

    const settingsData = {
        name: DOM.companyNameSettingInput.value.trim(),
        address: DOM.companyAddressSettingInput.value.trim(),
        phone: DOM.companyPhoneSettingInput.value.trim(),
        email: DOM.companyEmailSettingInput.value.trim(),
        taxId: DOM.companyTaxIdSettingInput.value.trim(),
        bankAccount: DOM.companyBankAccountSetting.value.trim(),
        logoDataUrl: companySettings.logoDataUrl || null,
        defaultQuoteNotes: DOM.defaultNotesSettingInput.value.trim(),
        printOptions: printOptions
    };
    try {
        await db.collection('users').doc(userId).collection('settings').doc('company').set(settingsData, { merge: true });
        showNotification('Đã lưu cài đặt!', 'success');
    } catch (e) {
        console.error("Lỗi lưu cài đặt:", e);
        const message = e.code === 'permission-denied'
            ? 'Lưu cài đặt thất bại: Không có quyền.'
            : 'Lỗi khi lưu cài đặt.';
        showNotification(message, 'error');
    }
}

export async function addOrUpdateItemFromForm(userId) {
    const name = DOM.itemNameQuoteForm.value.trim();
    if (!name) {
        showNotification('Tên hạng mục không được để trống.', 'error');
        return;
    }

    const mainCategoryName = DOM.quoteItemMainCategoryInput.value.trim();
    const mainCategoryId = await findOrCreateMainCategory(mainCategoryName, userId);

    const originalPrice = parseFloat(DOM.itemPriceQuoteForm.value) || 0;
    const itemDiscountValue = parseFloat(DOM.itemDiscountValueForm.value) || 0;
    const itemDiscountType = DOM.itemDiscountTypeForm.value;
    const quantity = parseFloat(String(DOM.itemQuantityQuoteForm.value).replace(',', '.')) || 0;

    let itemDiscountAmount = (itemDiscountType === 'percent')
        ? (originalPrice * itemDiscountValue) / 100
        : itemDiscountValue;
    const price = originalPrice - itemDiscountAmount;

    let calculatedMeasure = 0;
    let baseMeasureForPricing = 1;
     if (DOM.itemCalcTypeQuoteForm.value === 'length' && DOM.itemLengthQuoteForm.value) {
        const length = parseFloat(DOM.itemLengthQuoteForm.value);
        calculatedMeasure = length;
        baseMeasureForPricing = length / 1000;
    } else if (DOM.itemCalcTypeQuoteForm.value === 'area' && DOM.itemLengthQuoteForm.value && DOM.itemHeightQuoteForm.value) {
        const length = parseFloat(DOM.itemLengthQuoteForm.value);
        const height = parseFloat(DOM.itemHeightQuoteForm.value);
        calculatedMeasure = length * height;
        baseMeasureForPricing = (length * height) / 1000000;
    } else if (DOM.itemCalcTypeQuoteForm.value === 'volume' && DOM.itemLengthQuoteForm.value && DOM.itemHeightQuoteForm.value && DOM.itemDepthQuoteForm.value) {
        const length = parseFloat(DOM.itemLengthQuoteForm.value);
        const height = parseFloat(DOM.itemHeightQuoteForm.value);
        const depth = parseFloat(DOM.itemDepthQuoteForm.value);
        calculatedMeasure = length * height * depth;
        baseMeasureForPricing = (length * height * depth) / 1000000000;
    }
    const lineTotal = price * baseMeasureForPricing * quantity;

    const newItemData = {
        name,
        spec: DOM.itemSpecQuoteForm.value.trim(),
        unit: DOM.itemUnitQuoteForm.value.trim(),
        price, originalPrice, itemDiscountValue, itemDiscountType, itemDiscountAmount,
        quantity, lineTotal,
        calcType: DOM.itemCalcTypeQuoteForm.value,
        length: parseFloat(DOM.itemLengthQuoteForm.value) || null,
        height: parseFloat(DOM.itemHeightQuoteForm.value) || null,
        depth: parseFloat(DOM.itemDepthQuoteForm.value) || null,
        calculatedMeasure,
        imageDataUrl: itemImageDataBase64QuoteForm,
        mainCategoryId,
    };

    const itemIdToEdit = DOM.editingQuoteItemIdInputForm.value;
    if (itemIdToEdit) {
        const itemIndex = currentQuoteItems.findIndex(i => i.id === itemIdToEdit);
        if(itemIndex > -1) {
            if (!newItemData.imageDataUrl) {
                newItemData.imageDataUrl = currentQuoteItems[itemIndex].imageDataUrl;
            }
            currentQuoteItems[itemIndex] = { ...currentQuoteItems[itemIndex], ...newItemData };
        }
        resetQuoteItemFormEditingState();
    } else {
        currentQuoteItems.push({ id: generateUniqueId('qitem'), ...newItemData });
    }

    renderQuoteItemsPreview();
    clearQuoteItemFormInputs();
    await calculateTotals(userId);
}

export function editQuoteItemOnForm(itemId) {
    const item = currentQuoteItems.find(i => i.id === itemId);
    if (item) {
        DOM.editingQuoteItemIdInputForm.value = item.id;
        DOM.itemNameQuoteForm.value = item.name;
        DOM.itemSpecQuoteForm.value = item.spec || '';
        DOM.itemUnitQuoteForm.value = item.unit;
        DOM.itemPriceQuoteForm.value = item.originalPrice;
        DOM.itemDiscountValueForm.value = item.itemDiscountValue || 0;
        DOM.itemDiscountTypeForm.value = item.itemDiscountType || 'percent';
        DOM.itemCalcTypeQuoteForm.value = item.calcType || 'unit';
        DOM.itemLengthQuoteForm.value = item.length || '';
        DOM.itemHeightQuoteForm.value = item.height || '';
        DOM.itemDepthQuoteForm.value = item.depth || '';
        const category = getMainCategories().find(cat => cat.id === item.mainCategoryId);
        DOM.quoteItemMainCategoryInput.value = category ? category.name : '';
        DOM.itemQuantityQuoteForm.value = item.quantity;
        itemImageDataBase64QuoteForm = item.imageDataUrl || null;
        DOM.itemImagePreviewQuoteForm.src = item.imageDataUrl || '#';
        DOM.itemImagePreviewQuoteForm.style.display = item.imageDataUrl ? 'block' : 'none';
        DOM.itemImageFileQuoteForm.value = '';
        DOM.addOrUpdateItemButtonForm.textContent = 'Cập nhật Hạng mục';
        DOM.cancelEditQuoteItemButtonForm.style.display = 'inline-block';
        DOM.itemNameQuoteForm.focus();
        DOM.quoteItemEntryFormDiv.scrollIntoView({ behavior: 'smooth' });
    }
}

export async function saveCurrentWorkingQuoteToFirestore(userId) {
    if (!userId) return;
    // Update currentQuoteIdInternal if customerName or quoteDate changed since last save/start
    const currentCustName = DOM.customerNameInput.value;
    const currentQDate = DOM.quoteDateInput.value;
    const potentialNewId = generateSimpleQuoteId(currentCustName, currentQDate);
    // Only update if it's different and not the default "X-" ID (meaning user hasn't typed name yet)
    if (currentQuoteIdInternal !== potentialNewId && !potentialNewId.startsWith('X-')) {
         // currentQuoteIdInternal = potentialNewId; // This might be too aggressive for UX draft
    }

    const quoteData = {
        id: currentQuoteIdInternal, // Use the potentially updated ID
        customerName: currentCustName,
        customerAddress: DOM.customerAddressInput.value,
        quoteDate: currentQDate,
        items: currentQuoteItems,
        applyDiscount: DOM.applyDiscountCheckbox.checked,
        discountValue: DOM.discountValueInput.value,
        discountType: DOM.discountTypeSelect.value,
        applyTax: DOM.applyTaxCheckbox.checked,
        taxPercent: DOM.taxPercentInput.value,
        applyInstallments: DOM.applyInstallmentsCheckbox.checked,
        installments: quoteInstallmentData,
        timestamp: Date.now()
    };
    try {
        await db.collection('users').doc(userId).collection('ux').doc('currentQuote').set(quoteData);
    } catch (e) {
        console.error("Lỗi lưu báo giá nháp:", e);
    }
};

function createItemRowHTML(item, itemIndex) {
    let displayNameCellContent = `<strong class="item-name-display">${item.name.toUpperCase()}</strong>`;

    let dimParts = [];
    if (item.length) dimParts.push(`D ${item.length}mm`);
    if (item.height) dimParts.push(`C ${item.height}mm`);
    if (item.depth) dimParts.push(`S ${item.depth}mm`);
    const dimensionsString = dimParts.join(' x ');

    if (dimensionsString) {
        displayNameCellContent += `<em class="item-dimensions-display">KT: ${dimensionsString}</em>`;
    }

    if (item.spec) {
        const specLines = item.spec.split('\n').filter(line => line.trim() !== '');
        if (specLines.length > 0) {
            displayNameCellContent += `<em class="item-spec-display">${specLines.map(line => line.trim()).join('<br>')}</em>`;
        }
    }

    const imgSrc = item.imageDataUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    let displayedMeasureText = '';
    if (item.calculatedMeasure && typeof item.calculatedMeasure === 'number' && item.calcType !== 'unit') {
        let measureInMeters = item.calculatedMeasure;
        if (item.calcType === 'length') measureInMeters /= 1000;
        else if (item.calcType === 'area') measureInMeters /= 1000000;
        else if (item.calcType === 'volume') measureInMeters /= 1000000000;
        displayedMeasureText = `${parseFloat(measureInMeters.toFixed(4)).toLocaleString('vi-VN')}`;
    }
    let priceCellContent = `<strong>${item.price.toLocaleString('vi-VN')}</strong>`;
    if (item.itemDiscountAmount > 0) {
        let discountText = '';
        if (item.itemDiscountType === 'percent' && item.itemDiscountValue > 0) {
            discountText = `<span class="item-discount-percent" style="font-size: 0.8em; color: #D0021B; font-style: italic;"> (-${item.itemDiscountValue}%)</span>`;
        }
        priceCellContent = `
            <span class="strikethrough-price">${item.originalPrice.toLocaleString('vi-VN')}</span><br>
            <strong>${item.price.toLocaleString('vi-VN')}</strong>${discountText}
        `;
    }
    return `
        <tr id="qitem-display-${item.id}">
            <td style="text-align: center;">${itemIndex}</td>
            <td><img src="${imgSrc}" alt="Ảnh" class="item-image-preview-table" style="display:${item.imageDataUrl ? 'block' : 'none'};"></td>
            <td class="item-name-spec-cell">${displayNameCellContent}</td>
            <td style="text-align: center;">${item.unit}</td>
            <td style="text-align: right;">${displayedMeasureText}</td>
            <td style="text-align: right;">${(item.quantity).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
            <td style="text-align: right;">${priceCellContent}</td>
            <td style="text-align: right;">${item.lineTotal.toLocaleString('vi-VN')}</td>
            <td class="no-print">
                <button class="edit-btn small-btn" data-id="${item.id}">Sửa</button>
                <button class="delete-btn small-btn" data-id="${item.id}">Xóa</button>
                <button class="quick-save-to-catalog-btn-row small-btn" data-id="${item.id}" title="Lưu mục này vào DM chính">Lưu vào DM</button>
            </td>
        </tr>`;
}

function clearQuoteItemFormInputs(focusOnName = true) {
    DOM.itemNameQuoteForm.value = '';
    DOM.itemSpecQuoteForm.value = '';
    DOM.itemUnitQuoteForm.value = '';
    DOM.itemPriceQuoteForm.value = '';
    DOM.itemDiscountValueForm.value = '0';
    DOM.itemDiscountTypeForm.value = 'percent';
    DOM.itemCalcTypeQuoteForm.value = 'unit';
    DOM.itemLengthQuoteForm.value = '';
    DOM.itemHeightQuoteForm.value = '';
    DOM.itemDepthQuoteForm.value = '';
    DOM.itemQuantityQuoteForm.value = '1';
    DOM.itemImageFileQuoteForm.value = '';
    DOM.itemImagePreviewQuoteForm.style.display = 'none';
    DOM.itemImagePreviewQuoteForm.src = '#';
    itemImageDataBase64QuoteForm = null;
    DOM.catalogItemCombobox.value = "";
    DOM.quoteItemMainCategoryInput.value = "";
    if (focusOnName) DOM.itemNameQuoteForm.focus();
}

export async function deleteQuoteItem(itemId, userId) {
    if (confirm('Xóa hạng mục này khỏi báo giá?')) {
        if (DOM.editingQuoteItemIdInputForm.value === itemId) resetQuoteItemFormEditingState();
        currentQuoteItems = currentQuoteItems.filter(item => item.id !== itemId);
        renderQuoteItemsPreview();
        await calculateTotals(userId);
    }
}
export async function saveCurrentQuoteToListHandler(userId) {
    if (!userId || currentQuoteItems.length === 0) {
        showNotification("Chưa có hạng mục nào trong báo giá.", "error");
        return;
    }

    const customerName = DOM.customerNameInput.value;
    const quoteDate = DOM.quoteDateInput.value;
    const newSuggestedId = generateSimpleQuoteId(customerName, quoteDate);

    const quoteIdToSave = prompt("Nhập ID để lưu báo giá này:", newSuggestedId);
    if (!quoteIdToSave) return;

    const totals = await calculateTotals(userId, false); // Don't save current working quote yet

    const quoteDataToSave = {
        id: quoteIdToSave, // Use the user-confirmed ID
        customerName: customerName,
        customerAddress: DOM.customerAddressInput.value,
        quoteDate: quoteDate,
        items: currentQuoteItems,
        applyDiscount: totals.applyDiscount,
        discountValue: totals.discountValue,
        discountType: totals.discountType,
        applyTax: totals.applyTax,
        taxPercent: totals.taxPercent,
        applyInstallments: DOM.applyInstallmentsCheckbox.checked,
        installments: quoteInstallmentData,
        status: 'draft',
        timestamp: Date.now()
    };
    try {
        UI.showLoader();
        await db.collection('users').doc(userId).collection('quotes').doc(quoteIdToSave).set(quoteDataToSave);

        // Update the current working quote to reflect this newly saved ID and data
        currentQuoteIdInternal = quoteIdToSave; // Update internal ID
        await db.collection('users').doc(userId).collection('ux').doc('currentQuote').set(quoteDataToSave);

        showNotification(`Báo giá "${quoteIdToSave}" đã được lưu.`, 'success');
    } catch (e) {
        console.error("Lỗi lưu báo giá:", e);
        const message = e.code === 'permission-denied'
            ? 'Lưu thất bại: Không có quyền.'
            : 'Lỗi khi lưu báo giá.';
        showNotification(message, 'error');
    } finally {
        UI.hideLoader();
    }
}
export async function deleteQuoteFromList(quoteIdToDelete, userId) {
    if (!userId) return;
    if (confirm(`Xóa vĩnh viễn báo giá "${quoteIdToDelete}"?`)) {
        try {
            await db.collection('users').doc(userId).collection('quotes').doc(quoteIdToDelete).delete();
            showNotification('Đã xóa báo giá.', 'success');
        } catch (e) {
            console.error("Lỗi xóa báo giá:", e);
            const message = e.code === 'permission-denied'
                ? 'Xóa thất bại: Không có quyền.'
                : 'Lỗi khi xóa báo giá.';
            showNotification(message, 'error');
        }
    }
}
export async function loadQuoteFromList(quoteIdToLoad, userId) {
    UI.showLoader();
    try {
        const docRef = db.collection('users').doc(userId).collection('quotes').doc(quoteIdToLoad);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            await db.collection('users').doc(userId).collection('ux').doc('currentQuote').set(docSnap.data());
            UI.openTab('tabQuote');
            showNotification(`Đã tải báo giá "${quoteIdToLoad}" vào trang soạn thảo.`, 'info');
        } else {
            showNotification("Không tìm thấy báo giá này.", 'error');
        }
    } catch (error) {
        console.error("Lỗi khi tải báo giá:", error);
        let message = 'Lỗi khi tải báo giá.';
        if(error.code === 'permission-denied') {
            message = 'Bạn không có quyền truy cập báo giá này.';
        } else if (error.code === 'not-found') {
            message = 'Không tìm thấy báo giá này trong cơ sở dữ liệu.';
        }
        showNotification(message, 'error');
    } finally {
        UI.hideLoader();
    }
}
export async function duplicateQuote(originalQuoteId, userId) {
    if (!originalQuoteId || !userId) {
        showNotification("Không thể tìm thấy báo giá gốc.", 'error');
        return;
    }
    const originalQuote = savedQuotes.find(q => q.id === originalQuoteId);
    if (!originalQuote) {
        showNotification("Không tìm thấy dữ liệu báo giá gốc.", 'error');
        return;
    }
    UI.showLoader();
    const newQuote = { ...originalQuote };

    // Generate new ID for the duplicated quote
    const customerNameForNewId = newQuote.customerName || '';
    const dateForNewId = new Date().toISOString().split('T')[0];
    newQuote.id = generateSimpleQuoteId(customerNameForNewId, dateForNewId);

    newQuote.status = 'draft';
    newQuote.timestamp = Date.now();
    newQuote.quoteDate = dateForNewId;

    try {
        await db.collection('users').doc(userId).collection('quotes').doc(newQuote.id).set(newQuote);
        await db.collection('users').doc(userId).collection('ux').doc('currentQuote').set(newQuote);
        UI.openTab('tabQuote');
        showNotification(`Đã nhân bản báo giá "${originalQuote.id}" thành "${newQuote.id}".`, 'success');
    } catch (error) {
        console.error("Lỗi nhân bản báo giá:", error);
        showNotification("Không thể nhân bản báo giá.", 'error');
    } finally {
        UI.hideLoader();
    }
}
function renderQuoteItemsPreview() {
    const mainCategoriesList = getMainCategories(); // Ensure this is consistently named
    const groupedItems = new Map();
    const itemsWithoutCategory = [];
    let tableHTML = '';
    currentQuoteItems.forEach(item => {
        const category = mainCategoriesList.find(cat => cat.id === item.mainCategoryId);
        if (category) {
            if (!groupedItems.has(item.mainCategoryId)) {
                groupedItems.set(item.mainCategoryId, []);
            }
            groupedItems.get(item.mainCategoryId).push(item);
        } else {
            itemsWithoutCategory.push(item);
        }
    });
    let itemCounter = 0;
    let categoryCounter = 0;
    mainCategoriesList.forEach(category => {
        if (groupedItems.has(category.id)) {
            categoryCounter++;
            const itemsInCategory = groupedItems.get(category.id);
            const categoryTotal = itemsInCategory.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
            tableHTML += `
                <tr class="main-category-row">
                    <td class="main-category-roman-numeral">${numberToRoman(categoryCounter)}</td>
                    <td colspan="6" class="main-category-name">${category.name}</td>
                    <td class="main-category-total" style="text-align: right;">${categoryTotal.toLocaleString('vi-VN')}</td>
                    <td class="no-print"></td>
                </tr>
            `;
            itemsInCategory.forEach(item => {
                itemCounter++;
                tableHTML += createItemRowHTML(item, itemCounter);
            });
        }
    });
    if (itemsWithoutCategory.length > 0) {
         if (mainCategoriesList.length > 0 || itemsWithoutCategory.length > 0) { // Add "Other Items" header if there were categories or if these are the only items
            categoryCounter++;
            tableHTML += `
                <tr class="main-category-row">
                    <td class="main-category-roman-numeral">${numberToRoman(categoryCounter)}</td>
                    <td colspan="6" class="main-category-name">Hạng mục khác</td>
                    <td class="main-category-total" style="text-align: right;">${itemsWithoutCategory.reduce((sum, item) => sum + (item.lineTotal || 0), 0).toLocaleString('vi-VN')}</td>
                    <td class="no-print"></td>
                </tr>
            `;
        }
        itemsWithoutCategory.forEach(item => {
            itemCounter++;
            tableHTML += createItemRowHTML(item, itemCounter);
        });
    }
    DOM.itemListPreviewTableBody.innerHTML = tableHTML;
}
function renderSavedQuotesList() {
    const searchTerm = DOM.savedQuotesSearchInput.value.toLowerCase();
    let tableHTML = '';
    const filteredQuotes = savedQuotes.filter(quote => {
        if (!searchTerm) return true;
        const quoteId = quote.id ? quote.id.toLowerCase() : '';
        const customerName = quote.customerName ? quote.customerName.toLowerCase() : '';
        return quoteId.includes(searchTerm) || customerName.includes(searchTerm);
    });
    if (filteredQuotes.length === 0) {
        const message = savedQuotes.length > 0 ? 'Không tìm thấy báo giá phù hợp.' : 'Chưa có báo giá nào được lưu.';
        tableHTML = `<tr><td colspan="6" style="text-align:center;">${message}</td></tr>`;
    } else {
        filteredQuotes.forEach(quote => {
            const total = calculateQuoteTotal(quote);
            const currentStatus = quote.status || 'draft';
            const statusText = QUOTE_STATUSES[currentStatus] || 'Không xác định';
            const statusBadgeClass = `status-${currentStatus}`;
            let statusOptions = '';
            Object.keys(QUOTE_STATUSES).forEach(key => {
                statusOptions += `<option value="${key}" ${key === currentStatus ? 'selected' : ''}>${QUOTE_STATUSES[key]}</option>`;
            });
            tableHTML += `
                <tr>
                    <td>${quote.id}</td>
                    <td>${quote.customerName || ''}</td>
                    <td>${formatDate(quote.quoteDate || quote.timestamp)}</td>
                    <td>${formatCurrency(total)}</td>
                    <td class="status-cell">
                        <span class="status-badge ${statusBadgeClass}">${statusText}</span>
                        <select class="status-select-action small-btn" data-id="${quote.id}">
                            ${statusOptions}
                        </select>
                    </td>
                    <td class="no-print">
                        <button class="load-quote-btn small-btn" data-id="${quote.id}">Tải</button>
                        <button class="duplicate-quote-btn small-btn" data-id="${quote.id}" style="background-color: #17a2b8;">Nhân bản</button>
                        <button class="delete-btn small-btn" data-id="${quote.id}">Xóa</button>
                    </td>
                </tr>`;
        });
    }
    DOM.savedQuotesTableBody.innerHTML = tableHTML;
}
function calculateQuoteTotal(quoteData) {
    if (!quoteData || !quoteData.items) return 0;
    const subTotal = quoteData.items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
    const useDiscount = typeof quoteData.applyDiscount === 'boolean' ? quoteData.applyDiscount : true;
    let discountAmount = 0;
    if (useDiscount && quoteData.discountValue > 0) {
        discountAmount = quoteData.discountType === 'percent'
            ? (subTotal * parseFloat(quoteData.discountValue)) / 100
            : parseFloat(quoteData.discountValue);
    }
    const subTotalAfterDiscount = subTotal - discountAmount;
    const useTax = typeof quoteData.applyTax === 'boolean' ? quoteData.applyTax : true;
    const taxAmount = useTax
        ? (subTotalAfterDiscount * (parseFloat(quoteData.taxPercent) || 0)) / 100
        : 0;
    return subTotalAfterDiscount + taxAmount;
}
export async function calculateTotals(userId, shouldSave = true) {
    const quoteDataForCalculation = {
        items: currentQuoteItems,
        applyDiscount: DOM.applyDiscountCheckbox.checked,
        discountValue: parseFloat(DOM.discountValueInput.value) || 0,
        discountType: DOM.discountTypeSelect.value,
        applyTax: DOM.applyTaxCheckbox.checked,
        taxPercent: parseFloat(DOM.taxPercentInput.value) || 0,
    };
    const subTotal = quoteDataForCalculation.items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
    const useDiscount = quoteDataForCalculation.applyDiscount;
    const discountValue = quoteDataForCalculation.discountValue;
    const discountType = quoteDataForCalculation.discountType;
    const useTax = quoteDataForCalculation.applyTax;
    const taxPercent = quoteDataForCalculation.taxPercent;
    let discountAmount = 0;
    if (useDiscount && discountValue > 0) {
        discountAmount = discountType === 'percent' ? (subTotal * discountValue) / 100 : discountValue;
    }
    const subTotalAfterDiscount = subTotal - discountAmount;
    const taxAmount = useTax ? (subTotalAfterDiscount * taxPercent) / 100 : 0;
    const grandTotal = subTotalAfterDiscount + taxAmount;
    DOM.subTotalSpan.textContent = formatCurrency(subTotal);
    DOM.discountAmountSpan.textContent = `(${formatCurrency(discountAmount)})`;
    DOM.taxAmountSpan.textContent = `(${formatCurrency(taxAmount)})`;
    DOM.totalPriceSpan.textContent = formatCurrency(grandTotal);
    renderInstallments(grandTotal);
    if (userId && shouldSave) {
        await saveCurrentWorkingQuoteToFirestore(userId);
    }
    return {
        subTotal, discountAmount, subTotalAfterDiscount, taxAmount, grandTotal,
        taxPercent, applyDiscount: useDiscount, applyTax: useTax,
        discountValue, discountType
    };
}
function renderInstallments(grandTotal) {
    const isEnabled = DOM.applyInstallmentsCheckbox.checked;
    DOM.installmentsContainer.style.display = isEnabled ? 'flex' : 'none';
    DOM.addInstallmentButton.style.display = isEnabled ? 'inline-block' : 'none';
    if (!isEnabled) return;
    DOM.installmentsListContainer.innerHTML = '';
    let totalPercent = 0;
    let totalAmount = 0;
    quoteInstallmentData.forEach((inst, index) => {
        const row = document.createElement('div');
        row.className = 'installment-row';
        const amount = inst.value > 0
            ? (inst.type === 'percent' ? (grandTotal * inst.value) / 100 : inst.value)
            : 0;
        totalAmount += amount;
        if (inst.type === 'percent') {
            totalPercent += inst.value;
        }
        row.innerHTML = `
            <input type="text" value="${inst.name}" data-index="${index}" data-field="name" placeholder="Nội dung đợt ${index + 1}">
            <input type="number" value="${inst.value}" data-index="${index}" data-field="value" placeholder="Giá trị" min="0">
            <select data-index="${index}" data-field="type">
                <option value="percent" ${inst.type === 'percent' ? 'selected' : ''}>%</option>
                <option value="amount" ${inst.type === 'amount' ? 'selected' : ''}>VNĐ</option>
            </select>
            <span class="installment-amount-display">${formatCurrency(amount)}</span>
            <button class="remove-installment-btn" data-index="${index}" title="Xóa đợt này">&times;</button>
        `;
        DOM.installmentsListContainer.appendChild(row);
    });
    const remainingAmount = grandTotal - totalAmount;
    DOM.installmentsSummaryDiv.innerHTML = `
        <span>Tổng %: <strong>${totalPercent}%</strong></span>
        <span>Tổng cộng các đợt: <strong id="installmentsTotalAmount">${formatCurrency(totalAmount)}</strong></span>
        <span>Còn lại: <strong id="installmentsRemainingAmount" style="color:${remainingAmount === 0 ? 'green' : (remainingAmount < 0 ? 'red': '#E67E22')};">${formatCurrency(remainingAmount)}</strong></span>
    `;
}
export function addInstallment() {
    quoteInstallmentData.push({
        name: `Đợt ${quoteInstallmentData.length + 1}`,
        value: 0,
        type: 'percent'
    });
    calculateTotals(auth.currentUser?.uid);
}
export function removeInstallment(index) {
    quoteInstallmentData.splice(index, 1);
    calculateTotals(auth.currentUser?.uid);
}
export function handleInstallmentChange(event) {
    const target = event.target;
    const index = target.dataset.index;
    const field = target.dataset.field;
    if (index === undefined || field === undefined) return;
    const value = target.type === 'number' ? parseFloat(target.value) || 0 : target.value;
    quoteInstallmentData[index][field] = value;
    calculateTotals(auth.currentUser?.uid);
}
export function resetQuoteItemFormEditingState() {
    DOM.editingQuoteItemIdInputForm.value = '';
    DOM.addOrUpdateItemButtonForm.textContent = 'Thêm vào Báo giá';
    DOM.cancelEditQuoteItemButtonForm.style.display = 'none';
    clearQuoteItemFormInputs(false);
}
export function prepareNewQuoteItemHandler() {
    resetQuoteItemFormEditingState();
    DOM.quoteItemEntryFormDiv.scrollIntoView({ behavior: 'smooth' });
}
export function clearQuoteFormHandler(userId) {
    if (confirm('Làm mới Form? Dữ liệu nháp chưa lưu sẽ bị mất.')) {
        startNewQuote(userId);
    }
}
export async function quickSaveToCatalogFromFormHandler(userId) {
    const itemData = {
        name: DOM.itemNameQuoteForm.value.trim(),
        spec: DOM.itemSpecQuoteForm.value.trim(),
        unit: DOM.itemUnitQuoteForm.value.trim(),
        price: parseFloat(DOM.itemPriceQuoteForm.value) || 0,
    };
    if (!itemData.name) {
        showNotification("Cần có tên hạng mục để lưu.", "error");
        return;
    }
    await saveItemToMasterCatalog(itemData, userId);
}
export async function saveThisQuoteItemToMasterCatalog(quoteItemId, userId) {
    const item = currentQuoteItems.find(i => i.id === quoteItemId);
    if (item) {
        const { name, spec, unit, originalPrice, mainCategoryId } = item;
        await saveItemToMasterCatalog({ name, spec, unit, price: originalPrice, mainCategoryId }, userId);
    }
}
export const handleCatalogComboboxSelection = (event) => {
    const inputValue = event.target.value;
    const selectedOption = Array.from(DOM.catalogDatalist.options).find(opt => opt.value === inputValue);
    if (selectedOption) {
        const itemId = selectedOption.dataset.itemId;
        const selectedItem = getLoadedCatalog().find(item => item.id === itemId);
        if (selectedItem) {
            DOM.itemNameQuoteForm.value = selectedItem.name;
            DOM.itemSpecQuoteForm.value = selectedItem.spec || '';
            DOM.itemUnitQuoteForm.value = selectedItem.unit;
            DOM.itemPriceQuoteForm.value = selectedItem.price;
            event.target.value = ''; // Clear combobox after selection
            DOM.itemQuantityQuoteForm.focus();
        }
    }
};
