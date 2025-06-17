
/**
 * @file costing.js
 * @description Manages logic for the Product Costing tab.
 */
import * as DOM from './dom.js';
import { db, auth } from './firebase.js';
import { formatCurrency, generateUniqueId, formatDate } from './utils.js';
import { showNotification } from './notifications.js';
import * as UI from './ui.js';

let currentCostingMaterials = [];
let currentCostingLabor = [];
let savedCostingSheetsGlobal = []; // To store fetched costing sheets

// --- DIRECT MATERIALS ---
export function addMaterialToCosting() {
    const name = DOM.costingMaterialNameInput.value.trim();
    const spec = DOM.costingMaterialSpecInput.value.trim();
    const unit = DOM.costingMaterialUnitInput.value.trim();
    const dimensions = DOM.costingMaterialDimensionsInput.value.trim();
    const quantity = parseFloat(DOM.costingMaterialQuantityInput.value) || 0;
    const price = parseFloat(DOM.costingMaterialPriceInput.value) || 0;
    const waste = parseFloat(DOM.costingMaterialWasteInput.value) || 0;


    if (!name) {
        showNotification('Vui lòng nhập Tên Vật tư.', 'error');
        return;
    }
    if (quantity <= 0) {
        showNotification('Số lượng Vật tư phải lớn hơn 0.', 'error');
        return;
    }
     if (price < 0) { 
        showNotification('Đơn giá Vật tư không hợp lệ.', 'error');
        return;
    }
    if (waste < 0 || waste > 100) {
        showNotification('% Hao hụt phải từ 0 đến 100.', 'error');
        return;
    }

    const total = quantity * price * (1 + (waste / 100));

    currentCostingMaterials.push({
        id: generateUniqueId('mat'),
        name,
        spec,
        unit,
        dimensions,
        quantity,
        price,
        waste,
        total
    });

    renderMaterialsTable();
    clearMaterialInputForm();
    calculateAllCosts(); 
}

function clearMaterialInputForm() {
    DOM.costingMaterialNameInput.value = '';
    DOM.costingMaterialSpecInput.value = '';
    DOM.costingMaterialUnitInput.value = '';
    DOM.costingMaterialDimensionsInput.value = '';
    DOM.costingMaterialQuantityInput.value = '';
    DOM.costingMaterialPriceInput.value = '';
    DOM.costingMaterialWasteInput.value = '0';
    DOM.costingMaterialNameInput.focus();
}

export function removeMaterialFromCosting(materialId) {
    currentCostingMaterials = currentCostingMaterials.filter(mat => mat.id !== materialId);
    renderMaterialsTable();
    calculateAllCosts(); 
}

function renderMaterialsTable() {
    let html = '';
    currentCostingMaterials.forEach((mat, index) => {
        html += `
            <tr data-id="${mat.id}">
                <td>${index + 1}</td>
                <td>${mat.name}</td>
                <td>${mat.spec || ''}</td>
                <td>${mat.dimensions || ''}</td>
                <td>${mat.unit}</td>
                <td style="text-align:right;">${mat.quantity.toLocaleString('vi-VN')}</td>
                <td style="text-align:right;">${formatCurrency(mat.price)}</td>
                <td style="text-align:right;">${mat.waste}%</td>
                <td style="text-align:right;">${formatCurrency(mat.total)}</td>
                <td class="no-print" style="text-align:center;">
                    <button class="delete-btn small-btn costing-delete-material">Xóa</button>
                </td>
            </tr>
        `;
    });
    DOM.costingMaterialsTableBody.innerHTML = html;
}


// --- DIRECT LABOR ---
export function addLaborToCosting() {
    const description = DOM.costingLaborDescriptionInput.value.trim(); // This is "Công đoạn"
    const hours = parseFloat(DOM.costingLaborHoursInput.value) || 0;
    const rate = parseFloat(DOM.costingLaborRateInput.value) || 0;

    if (!description) {
        showNotification('Vui lòng nhập Công đoạn.', 'error');
        return;
    }
    if (hours <= 0) {
        showNotification('Số giờ nhân công phải lớn hơn 0.', 'error');
        return;
    }
    if (rate < 0) {
        showNotification('Đơn giá/giờ không hợp lệ.', 'error');
        return;
    }

    currentCostingLabor.push({
        id: generateUniqueId('lab'),
        description, // Stores "Công đoạn"
        hours,
        rate,
        total: hours * rate
    });

    renderLaborTable();
    clearLaborInputForm();
    calculateAllCosts(); 
}

function clearLaborInputForm() {
    DOM.costingLaborDescriptionInput.value = '';
    DOM.costingLaborHoursInput.value = '';
    DOM.costingLaborRateInput.value = '';
    DOM.costingLaborDescriptionInput.focus();
}

export function removeLaborFromCosting(laborId) {
    currentCostingLabor = currentCostingLabor.filter(lab => lab.id !== laborId);
    renderLaborTable();
    calculateAllCosts(); 
}

function renderLaborTable() {
    let html = '';
    currentCostingLabor.forEach((lab, index) => {
        html += `
            <tr data-id="${lab.id}">
                <td>${index + 1}</td>
                <td>${lab.description}</td> {/* This is "Công đoạn" */}
                <td style="text-align:right;">${lab.hours.toLocaleString('vi-VN')}</td>
                <td style="text-align:right;">${formatCurrency(lab.rate)}</td>
                <td style="text-align:right;">${formatCurrency(lab.total)}</td>
                <td class="no-print" style="text-align:center;">
                    <button class="delete-btn small-btn costing-delete-labor">Xóa</button>
                </td>
            </tr>
        `;
    });
    DOM.costingLaborTableBody.innerHTML = html;
}

// --- CALCULATIONS ---
export function calculateAllCosts() {
    const totalDirectMaterials = currentCostingMaterials.reduce((sum, mat) => sum + mat.total, 0);
    DOM.totalDirectMaterialsCostSpan.textContent = formatCurrency(totalDirectMaterials);

    const totalDirectLabor = currentCostingLabor.reduce((sum, lab) => sum + lab.total, 0);
    DOM.totalDirectLaborCostSpan.textContent = formatCurrency(totalDirectLabor);

    const totalOverhead = parseFloat(DOM.costingOverheadTotalInput.value) || 0;

    const totalProductionCost = totalDirectMaterials + totalDirectLabor + totalOverhead;
    DOM.totalProductionCostSpan.textContent = formatCurrency(totalProductionCost);

    const quantityProduced = parseInt(DOM.costingQuantityProducedInput.value) || 1; 
    const unitProductionCost = quantityProduced > 0 ? totalProductionCost / quantityProduced : 0;
    DOM.unitProductionCostSpan.textContent = formatCurrency(unitProductionCost);

    return {
        totalDirectMaterials,
        totalDirectLabor,
        totalOverhead,
        totalProductionCost,
        unitProductionCost,
        quantityProduced,
        productName: DOM.costingProductNameInput.value.trim()
    };
}

// --- ACTIONS ---
export function clearCostingForm() {
    DOM.costingProductNameInput.value = '';
    DOM.costingSheetIdInput.value = ''; // Clear Costing Sheet ID
    DOM.costingQuantityProducedInput.value = '1';
    
    currentCostingMaterials = [];
    currentCostingLabor = [];
    
    clearMaterialInputForm();
    clearLaborInputForm();
    renderMaterialsTable();
    renderLaborTable();
    
    DOM.costingOverheadTotalInput.value = '';
    
    DOM.totalDirectMaterialsCostSpan.textContent = '0 VNĐ';
    DOM.totalDirectLaborCostSpan.textContent = '0 VNĐ';
    DOM.totalProductionCostSpan.textContent = '0 VNĐ';
    DOM.unitProductionCostSpan.textContent = '0 VNĐ';

    DOM.costingProductNameInput.focus();
    showNotification('Đã làm mới Form Tính giá thành.', 'info');
}

export async function saveCostingHandler() {
    const userId = auth.currentUser ? auth.currentUser.uid : null;
    if (!userId) {
        showNotification('Bạn cần đăng nhập để lưu phiếu tính giá.', 'error');
        return;
    }

    const costs = calculateAllCosts();
    const productName = DOM.costingProductNameInput.value.trim();
    if (!productName) {
        showNotification('Vui lòng nhập Tên Sản phẩm.', 'error');
        DOM.costingProductNameInput.focus();
        return;
    }
    if (currentCostingMaterials.length === 0 && currentCostingLabor.length === 0 && costs.totalOverhead === 0) {
        showNotification('Không có chi phí nào để lưu. Vui lòng nhập ít nhất một loại chi phí.', 'info');
        return;
    }

    let costingSheetId = DOM.costingSheetIdInput.value.trim();
    if (!costingSheetId) {
        costingSheetId = generateUniqueId('COST');
    }

    const costingData = {
        id: costingSheetId,
        productName: productName,
        quantityProduced: costs.quantityProduced,
        directMaterials: currentCostingMaterials,
        directLabor: currentCostingLabor,
        manufacturingOverheadTotal: costs.totalOverhead,
        totalDirectMaterialsCost: costs.totalDirectMaterials,
        totalDirectLaborCost: costs.totalDirectLabor,
        totalProductionCost: costs.totalProductionCost,
        unitProductionCost: costs.unitProductionCost,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        userId: userId
    };

    try {
        UI.showLoader();
        await db.collection('users').doc(userId).collection('costings').doc(costingSheetId).set(costingData);
        DOM.costingSheetIdInput.value = costingSheetId; // Update UI with the used ID
        showNotification(`Đã lưu Phiếu tính giá thành "${costingSheetId}" cho "${productName}".`, 'success');
    } catch (error) {
        console.error("Lỗi khi lưu phiếu tính giá:", error);
        showNotification('Lưu phiếu tính giá thất bại. Vui lòng thử lại.', 'error');
    } finally {
        UI.hideLoader();
    }
}


// --- SAVED COSTING SHEETS ---
export function listenToSavedCostingSheets(userId) {
    if (!userId) return () => {};
    const query = db.collection('users').doc(userId).collection('costings').orderBy('createdAt', 'desc').limit(50);
    
    const unsubscribe = query.onSnapshot(snapshot => {
        savedCostingSheetsGlobal = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSavedCostingSheetsTable();
    }, error => {
        console.error("Lỗi lắng nghe phiếu tính giá đã lưu:", error);
        showNotification('Không thể tải danh sách phiếu tính giá đã lưu.', 'error');
    });
    return unsubscribe;
}

function renderSavedCostingSheetsTable() {
    let html = '';
    if (savedCostingSheetsGlobal.length === 0) {
        html = '<tr><td colspan="5" style="text-align:center;">Chưa có phiếu tính giá nào được lưu.</td></tr>';
    } else {
        savedCostingSheetsGlobal.forEach(sheet => {
            html += `
                <tr data-id="${sheet.id}">
                    <td>${sheet.id}</td>
                    <td>${sheet.productName}</td>
                    <td>${sheet.createdAt ? formatDate(sheet.createdAt.toDate()) : 'N/A'}</td>
                    <td style="text-align:right;">${formatCurrency(sheet.unitProductionCost || 0)}</td>
                    <td class="no-print" style="text-align:center;">
                        <button class="edit-btn small-btn load-costing-sheet" data-id="${sheet.id}">Tải</button>
                        <button class="delete-btn small-btn delete-costing-sheet" data-id="${sheet.id}">Xóa</button>
                    </td>
                </tr>
            `;
        });
    }
    DOM.savedCostingsTableBody.innerHTML = html;
}

export async function loadCostingSheet(costingSheetId, userId) {
    if (!costingSheetId || !userId) return;
    UI.showLoader();
    try {
        const docRef = db.collection('users').doc(userId).collection('costings').doc(costingSheetId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            DOM.costingProductNameInput.value = data.productName || '';
            DOM.costingSheetIdInput.value = data.id || '';
            DOM.costingQuantityProducedInput.value = data.quantityProduced || 1;
            
            currentCostingMaterials = data.directMaterials || [];
            currentCostingLabor = data.directLabor || [];
            
            renderMaterialsTable();
            renderLaborTable();
            
            DOM.costingOverheadTotalInput.value = data.manufacturingOverheadTotal || '';
            
            calculateAllCosts();
            showNotification(`Đã tải phiếu tính giá "${data.id}".`, 'success');
            DOM.costingProductNameInput.focus();
        } else {
            showNotification('Không tìm thấy phiếu tính giá này.', 'error');
        }
    } catch (error) {
        console.error("Lỗi khi tải phiếu tính giá:", error);
        showNotification('Lỗi khi tải phiếu tính giá. Vui lòng thử lại.', 'error');
    } finally {
        UI.hideLoader();
    }
}

export async function deleteCostingSheet(costingSheetId, userId) {
    if (!costingSheetId || !userId) return;
    if (confirm(`Bạn có chắc chắn muốn xóa phiếu tính giá "${costingSheetId}"?`)) {
        UI.showLoader();
        try {
            await db.collection('users').doc(userId).collection('costings').doc(costingSheetId).delete();
            showNotification(`Đã xóa phiếu tính giá "${costingSheetId}".`, 'success');
            // The listener will automatically update the table
        } catch (error) {
            console.error("Lỗi khi xóa phiếu tính giá:", error);
            showNotification('Lỗi khi xóa phiếu tính giá. Vui lòng thử lại.', 'error');
        } finally {
            UI.hideLoader();
        }
    }
}


export function initCostingTabEventListeners() {
    DOM.addCostingMaterialButton.addEventListener('click', addMaterialToCosting);
    DOM.addCostingLaborButton.addEventListener('click', addLaborToCosting);
    
    DOM.calculateCostingButton.addEventListener('click', calculateAllCosts);
    DOM.saveCostingButton.addEventListener('click', saveCostingHandler);
    DOM.clearCostingFormButton.addEventListener('click', clearCostingForm);

    DOM.costingMaterialsTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('costing-delete-material')) {
            const rowId = e.target.closest('tr').dataset.id;
            if(rowId) removeMaterialFromCosting(rowId);
        }
    });
    DOM.costingLaborTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('costing-delete-labor')) {
             const rowId = e.target.closest('tr').dataset.id;
            if(rowId) removeLaborFromCosting(rowId);
        }
    });

    DOM.costingOverheadTotalInput.addEventListener('input', calculateAllCosts);
    DOM.costingQuantityProducedInput.addEventListener('input', calculateAllCosts);

    // Event listeners for saved costing sheets table
    DOM.savedCostingsTableBody.addEventListener('click', (e) => {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) return;

        const targetButton = e.target.closest('button');
        if (!targetButton) return;
        
        const costingSheetId = targetButton.dataset.id;
        if (!costingSheetId) return;

        if (targetButton.classList.contains('load-costing-sheet')) {
            loadCostingSheet(costingSheetId, userId);
        } else if (targetButton.classList.contains('delete-costing-sheet')) {
            deleteCostingSheet(costingSheetId, userId);
        }
    });
}
