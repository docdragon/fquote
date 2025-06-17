
/**
 * @file catalog.js
 * @description Quản lý danh mục sản phẩm/dịch vụ với Firestore, sử dụng listeners thời gian thực.
 */
import * as DOM from './dom.js';
import { db } from './firebase.js';
import { formatCurrency, generateUniqueId } from './utils.js';
import { showNotification } from './notifications.js';

let loadedCatalog = [];
let mainCategories = [];

export const getLoadedCatalog = () => [...loadedCatalog];
export const getMainCategories = () => [...mainCategories];

// === MAIN CATEGORY MANAGEMENT (REAL-TIME) ===

export function listenToMainCategories(userId) {
    if (!userId) return () => {};
    const query = db.collection('users').doc(userId).collection('mainCategories').orderBy('name');
    
    const unsubscribe = query.onSnapshot(snapshot => {
        mainCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderMainCategoriesTable();
        populateMainCategoryUIs();
        populateMainCategoriesSelect(DOM.catalogEditMainCategorySelect, null); // Populate for catalog edit form
    }, error => {
        console.error("Lỗi lắng nghe danh mục chính:", error);
        const message = error.code === 'permission-denied'
            ? 'Không thể tải danh mục chính: Không có quyền truy cập.'
            : 'Không thể tải danh mục chính. Vui lòng kiểm tra kết nối mạng.';
        showNotification(message, 'error');
    });

    return unsubscribe;
}

function renderMainCategoriesTable() {
    if (!DOM.mainCategoriesTableBody || !DOM.mainCategoryCountSpan) return;
    let tableHTML = '';
    if (mainCategories.length === 0) {
        tableHTML = '<tr><td colspan="3" style="text-align:center;">Chưa có danh mục chính nào.</td></tr>';
    } else {
        mainCategories.forEach((category, index) => {
            tableHTML += `
                <tr>
                    <td style="text-align:center;">${index + 1}</td>
                    <td>${category.name}</td>
                    <td class="no-print" style="text-align:center;">
                        <button class="edit-btn small-btn" data-id="${category.id}">Sửa</button>
                        <button class="delete-btn small-btn" data-id="${category.id}">Xóa</button>
                    </td>
                </tr>
            `;
        });
    }
    DOM.mainCategoriesTableBody.innerHTML = tableHTML;
    DOM.mainCategoryCountSpan.textContent = mainCategories.length;
}

function populateMainCategoryUIs() {
    if (DOM.mainCategoryDataList) {
        DOM.mainCategoryDataList.innerHTML = '';
        mainCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name; // Used for quote item main category input datalist
            option.dataset.id = category.id; // Store ID if needed elsewhere
            DOM.mainCategoryDataList.appendChild(option);
        });
    }
}

export function populateMainCategoriesSelect(selectElement, selectedCategoryId) {
    if (!selectElement) return;
    const currentVal = selectElement.value; // Preserve current selection if possible (though usually for editing, selectedCategoryId is better)
    selectElement.innerHTML = '<option value="">-- Chọn Danh mục chính --</option>'; // Default empty option
    mainCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        if (selectedCategoryId && category.id === selectedCategoryId) {
            option.selected = true;
        } else if (!selectedCategoryId && category.id === currentVal) {
             option.selected = true; // Fallback to current value if no specific ID to select
        }
        selectElement.appendChild(option);
    });
}


export async function addOrUpdateMainCategoryHandler(userId) {
    if (!userId) return;
    const name = DOM.mainCategoryNameInput.value.trim();
    const editingId = DOM.editingMainCategoryIdInput.value;

    if (!name) {
        showNotification('Tên danh mục chính không được để trống.', 'error');
        return;
    }
    if (mainCategories.some(cat => cat.name.toLowerCase() === name.toLowerCase() && cat.id !== editingId)) {
        showNotification('Tên danh mục chính này đã tồn tại.', 'error');
        return;
    }

    try {
        const docRef = editingId 
            ? db.collection('users').doc(userId).collection('mainCategories').doc(editingId)
            : db.collection('users').doc(userId).collection('mainCategories').doc();
        
        await docRef.set({ name }, { merge: !!editingId });
        resetMainCategoryForm();
        showNotification(editingId ? "Đã cập nhật danh mục." : "Đã thêm danh mục mới.", 'success');
    } catch (e) {
        console.error("Lỗi lưu danh mục chính:", e);
        const message = e.code === 'permission-denied'
            ? 'Lưu thất bại: Không có quyền.'
            : 'Đã có lỗi xảy ra khi lưu.';
        showNotification(message, 'error');
    }
}

export function editMainCategory(id) {
    const category = mainCategories.find(cat => cat.id === id);
    if (category) {
        DOM.mainCategoryNameInput.value = category.name;
        DOM.editingMainCategoryIdInput.value = category.id;
        DOM.addOrUpdateMainCategoryButton.textContent = 'Sửa';
        DOM.cancelEditMainCategoryButton.style.display = 'inline-block';
        DOM.mainCategoryNameInput.focus();
    }
}

export async function deleteMainCategory(id, userId) {
    if (!userId) return;
    const category = mainCategories.find(cat => cat.id === id);
    if (!category) return;
    if (confirm(`Bạn chắc chắn muốn xóa danh mục "${category.name}"? Thao tác này KHÔNG xóa các hạng mục sản phẩm thuộc danh mục này.`)) {
        try {
            await db.collection('users').doc(userId).collection('mainCategories').doc(id).delete();
            // Update catalog items that might have used this mainCategoryId to null or a default
            // This is a more complex operation and might be better handled by user manually or a background function
            // For now, just deleting the category.
            showNotification(`Đã xóa danh mục "${category.name}".`, 'success');
        } catch(e) {
            console.error("Lỗi xóa danh mục:", e);
            const message = e.code === 'permission-denied'
                ? 'Xóa thất bại: Không có quyền.'
                : 'Lỗi khi xóa danh mục.';
            showNotification(message, 'error');
        }
    }
}

export function resetMainCategoryForm() {
    DOM.mainCategoryNameInput.value = '';
    DOM.editingMainCategoryIdInput.value = '';
    DOM.addOrUpdateMainCategoryButton.textContent = 'Thêm/Cập nhật DM Chính';
    DOM.cancelEditMainCategoryButton.style.display = 'none';
}

export async function findOrCreateMainCategory(name, userId) {
    if (!name || !userId) return null;
    const trimmedName = name.trim();
    // Try to find by name first from the input which might not be an ID
    let existingCategory = mainCategories.find(cat => cat.name.toLowerCase() === trimmedName.toLowerCase());
    
    if (existingCategory) {
        return existingCategory.id;
    }
    // If not found by name, and if `name` could be an ID (e.g. from a select.value), try finding by ID
    // This part is less likely if `name` comes from a text input `quoteItemMainCategoryInput`
    // but good to be aware of if `name` could represent an ID.
    // existingCategory = mainCategories.find(cat => cat.id === trimmedName);
    // if (existingCategory) {
    //     return existingCategory.id;
    // }

    // If still not found, create a new one
    try {
        const newDocRef = db.collection('users').doc(userId).collection('mainCategories').doc();
        await newDocRef.set({ name: trimmedName });
        // The listener for mainCategories should pick this up and update `mainCategories` array and UIs.
        // We return the new ID directly.
        return newDocRef.id;
    } catch (e) {
        console.error("Lỗi tạo DM chính mới:", e);
        return null;
    }
}


// === CATALOG ITEM MANAGEMENT (REAL-TIME) ===

export function listenToCatalogItems(userId) {
    if (!userId) return () => {};
    const query = db.collection('users').doc(userId).collection('catalog');

    const unsubscribe = query.onSnapshot(snapshot => {
        loadedCatalog = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        populateCatalogDatalist();
        renderCatalogPreviewTable();
    }, error => {
        console.error("Lỗi lắng nghe danh mục sản phẩm:", error);
        const message = error.code === 'permission-denied'
            ? 'Không thể tải danh mục: Không có quyền truy cập.'
            : 'Không thể tải danh mục. Vui lòng kiểm tra kết nối mạng.';
        showNotification(message, 'error');
    });

    return unsubscribe;
}

export function handleExcelFileGeneric(event, userId) {
    const file = event.target.files[0];
    if (!file || !userId) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        try {
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });
            
            if(jsonData.length === 0) {
                showNotification("File Excel không có dữ liệu.", 'error');
                return;
            }

            const catalogBatch = db.batch();
            const collectionRef = db.collection('users').doc(userId).collection('catalog');
            let importedCount = 0;
            const mainCatCache = {}; // Cache for newly created main categories during this import

            for (const row of jsonData) { // Use for...of for async/await inside loop if needed, though batching is sync here
                 const name = String(row['TenHangMuc'] || row['tenhangmuc'] || '').trim();
                 if(name) {
                     const newId = generateUniqueId('cat');
                     const docRef = collectionRef.doc(newId);
                     
                     let mainCategoryId = null;
                     const mainCategoryName = String(row['DanhMucChinh'] || row['danhmucchinh'] || '').trim();
                     if (mainCategoryName) {
                        if (mainCatCache[mainCategoryName.toLowerCase()]) {
                            mainCategoryId = mainCatCache[mainCategoryName.toLowerCase()];
                        } else {
                            mainCategoryId = await findOrCreateMainCategory(mainCategoryName, userId);
                            if(mainCategoryId) mainCatCache[mainCategoryName.toLowerCase()] = mainCategoryId;
                        }
                     }

                     const mappedData = {
                        name: name,
                        spec: String(row['QuyCach'] || row['quycach'] || '').trim(),
                        unit: String(row['DonViTinh'] || row['donvitinh'] || '').trim(),
                        price: parseFloat(String(row['DonGia'] || row['dongia']).replace(/[^0-9.-]+/g, "")) || 0,
                        mainCategoryId: mainCategoryId || null
                     };
                     catalogBatch.set(docRef, mappedData);
                     importedCount++;
                 }
            }

            if (importedCount > 0) {
                await catalogBatch.commit();
                showNotification(`Đã nhập thành công ${importedCount} hạng mục.`, 'success');
            } else {
                showNotification(`Không có hạng mục hợp lệ nào để nhập. Vui lòng kiểm tra cột 'TenHangMuc' trong file.`, 'info');
            }
        } catch (error) {
            console.error("Lỗi đọc Excel hoặc ghi Firestore:", error);
            let message = 'Lỗi xử lý file Excel.';
            if (error.message && error.message.includes("is not a ZIP file")) {
                message = 'File không đúng định dạng. Vui lòng sử dụng file .xlsx hợp lệ.';
            } else {
                message = 'Không thể đọc file. Vui lòng kiểm tra định dạng file (cần là .xlsx, .xls) và đảm bảo các cột `TenHangMuc`, `DonViTinh`, `DonGia` (và tùy chọn `DanhMucChinh`) tồn tại.';
            }
            showNotification(message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

export function populateCatalogDatalist() {
    if (!DOM.catalogDatalist) return;
    DOM.catalogDatalist.innerHTML = '';
    loadedCatalog.forEach((item) => {
        const option = document.createElement('option');
        option.value = `${item.name} (${formatCurrency(item.price)}/${item.unit})`;
        option.dataset.itemId = item.id;
        DOM.catalogDatalist.appendChild(option);
    });
}

export function renderCatalogPreviewTable() {
    if (!DOM.catalogPreviewList || !DOM.catalogItemCount) return;
    const searchTerm = DOM.catalogSearchInput ? DOM.catalogSearchInput.value.toLowerCase() : '';
    let tableHTML = '';
    
    const filteredCatalog = loadedCatalog.filter(item => 
        !searchTerm || 
        (item.name && item.name.toLowerCase().includes(searchTerm)) || 
        (item.spec && item.spec.toLowerCase().includes(searchTerm))
    );

    if (filteredCatalog.length > 0) {
        filteredCatalog.forEach((item, index) => {
            const mainCat = mainCategories.find(mc => mc.id === item.mainCategoryId);
            tableHTML += `
                <tr>
                    <td>${index + 1}</td> 
                    <td style="white-space: pre-wrap; max-width: 250px;">
                        ${item.name}
                        ${mainCat ? `<br><small style='color: var(--primary-color);'><em>(${mainCat.name})</em></small>` : ''}
                    </td>
                    <td style="white-space: pre-wrap; max-width: 200px;">${item.spec || ''}</td> 
                    <td>${item.unit}</td> <td>${formatCurrency(item.price)}</td>
                    <td class="no-print">
                        <button class="edit-btn small-btn" data-id="${item.id}">Sửa</button>
                        <button class="delete-btn small-btn" data-id="${item.id}">Xóa</button>
                    </td>
                </tr>
            `;
        });
    } else {
        tableHTML = '<tr><td colspan="6" style="text-align:center;">Không tìm thấy hạng mục hoặc danh mục trống.</td></tr>';
    }

    DOM.catalogPreviewList.innerHTML = tableHTML;
    DOM.catalogItemCount.textContent = filteredCatalog.length;
}

export function editCatalogEntry(entryId) {
    const item = loadedCatalog.find(i => i.id === entryId);
    if (item) {
        DOM.editingCatalogEntryIdInput.value = item.id;
        DOM.catalogEditNameInput.value = item.name;
        DOM.catalogEditSpecInput.value = item.spec || '';
        DOM.catalogEditUnitInput.value = item.unit;
        DOM.catalogEditPriceInput.value = item.price;
        populateMainCategoriesSelect(DOM.catalogEditMainCategorySelect, item.mainCategoryId);
        DOM.saveCatalogEntryButton.textContent = 'Sửa';
        DOM.cancelCatalogEntryEditButton.style.display = 'inline-block';
        DOM.catalogEditNameInput.focus();
    }
};

export async function deleteCatalogEntry(entryId, userId) {
    if (!userId) return;
    if (confirm(`Xóa hạng mục này khỏi danh mục trên đám mây?`)) {
        try {
            await db.collection('users').doc(userId).collection('catalog').doc(entryId).delete();
            showNotification('Đã xóa hạng mục.', 'success');
        } catch (e) {
            console.error("Lỗi xóa hạng mục DM:", e);
            const message = e.code === 'permission-denied'
                ? 'Xóa thất bại: Không có quyền.'
                : 'Đã có lỗi xảy ra.';
            showNotification(message, 'error');
        }
    }
};

export async function saveCatalogEntryHandler(userId) {
    if (!userId) return;
    const name = DOM.catalogEditNameInput.value.trim();
    if (!name) {
        showNotification('Tên hạng mục không được để trống.', 'error');
        return;
    }
    const id = DOM.editingCatalogEntryIdInput.value;
    const mainCategoryId = DOM.catalogEditMainCategorySelect.value || null;

    const itemData = {
        name,
        spec: DOM.catalogEditSpecInput.value.trim(),
        unit: DOM.catalogEditUnitInput.value.trim(),
        price: parseFloat(DOM.catalogEditPriceInput.value) || 0,
        mainCategoryId: mainCategoryId,
    };
    try {
        const docRef = id 
            ? db.collection('users').doc(userId).collection('catalog').doc(id)
            : db.collection('users').doc(userId).collection('catalog').doc(); // For new items, Firestore generates ID automatically
        
        await docRef.set(itemData, { merge: !!id }); // Use merge:true if updating, set otherwise
        resetCatalogEditForm();
        showNotification(id ? 'Đã cập nhật hạng mục.' : 'Đã thêm hạng mục mới.', 'success');
    } catch (e) {
        console.error("Lỗi lưu hạng mục DM:", e);
        const message = e.code === 'permission-denied'
            ? 'Lưu thất bại: Không có quyền.'
            : 'Đã có lỗi xảy ra khi lưu.';
        showNotification(message, 'error');
    }
};

export function resetCatalogEditForm() {
    DOM.editingCatalogEntryIdInput.value = '';
    DOM.catalogEditNameInput.value = '';
    DOM.catalogEditSpecInput.value = '';
    DOM.catalogEditUnitInput.value = '';
    DOM.catalogEditPriceInput.value = '';
    if (DOM.catalogEditMainCategorySelect) DOM.catalogEditMainCategorySelect.value = '';
    DOM.saveCatalogEntryButton.textContent = 'Thêm/Cập nhật vào Danh mục';
    DOM.cancelCatalogEntryEditButton.style.display = 'none';
}

export function exportCatalogHandler() {
    if (loadedCatalog.length === 0) {
        showNotification('Không có dữ liệu danh mục để xuất.', 'info');
        return;
    }
    const workbook = XLSX.utils.book_new();
    const catalogItemsData = loadedCatalog.map(item => {
        const mainCat = mainCategories.find(mc => mc.id === item.mainCategoryId);
        return {
            TenHangMuc: item.name,
            QuyCach: item.spec || '',
            DonViTinh: item.unit,
            DonGia: item.price,
            DanhMucChinh: mainCat ? mainCat.name : ''
        };
    });
    const ws = XLSX.utils.json_to_sheet(catalogItemsData);
    // Set column headers explicitly
    XLSX.utils.sheet_add_aoa(ws, [["TenHangMuc", "QuyCach", "DonViTinh", "DonGia", "DanhMucChinh"]], { origin: "A1" });
    XLSX.utils.book_append_sheet(workbook, ws, "Danh muc san pham");
    XLSX.writeFile(workbook, `DanhMuc_${new Date().toISOString().slice(0,10)}.xlsx`);
}

export async function saveItemToMasterCatalog(itemData, userId) {
    if (!userId || !itemData || !itemData.name) {
         showNotification("Lỗi: Dữ liệu hạng mục không hợp lệ.", 'error');
         return;
    }
    // Ensure price is a number
    itemData.price = parseFloat(itemData.price) || 0;
    
    // If mainCategoryId is a name, try to resolve it to an ID or create it
    if (itemData.mainCategoryId && !mainCategories.find(cat => cat.id === itemData.mainCategoryId)) {
        const categoryName = itemData.mainCategoryId; // Assuming it might be a name
        const resolvedId = await findOrCreateMainCategory(categoryName, userId);
        itemData.mainCategoryId = resolvedId; // Update to ID
    } else if (!itemData.mainCategoryId) {
        itemData.mainCategoryId = null; // Ensure it's null if not provided
    }


    try {
        const docRef = db.collection('users').doc(userId).collection('catalog').doc(); // Firestore generates ID
        await docRef.set({
            ...itemData, // Spread the item data
            id: docRef.id // Store the generated ID within the document itself if needed later, though not standard for query
        });
        showNotification(`"${itemData.name}" đã được lưu vào danh mục.`, 'success');
    } catch (e) {
        console.error("Lỗi lưu nhanh vào DM:", e);
        const message = e.code === 'permission-denied'
            ? 'Lưu vào danh mục thất bại: Không có quyền.'
            : 'Đã có lỗi khi lưu vào danh mục.';
        showNotification(message, 'error');
    }
}
