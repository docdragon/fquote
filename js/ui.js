/**
 * @file ui.js
 * @description Chứa các logic liên quan đến giao diện người dùng (UI) chung.
 */
import * as DOM from './dom.js';
import {
    formatDate,
    formatCurrency,
    numberToRoman,
} from './utils.js';
import {
    calculateTotals,
    getCurrentQuoteItems,
    getCompanySettings,
    getCurrentQuoteId,
    getQuoteInstallmentData
} from './quote.js';
import {
    getMainCategories
} from './catalog.js';

function formatNumberForTable(number) {
    if (typeof number !== 'number') return '0';
    return number.toLocaleString('vi-VN');
}

export function showLoader() {
    if (DOM.loader) DOM.loader.style.display = 'flex';
}

export function hideLoader() {
    if (DOM.loader) DOM.loader.style.display = 'none';
}

export function openTab(tabName) {
    if (!tabName) {
        console.error("openTab: Tên tab không được cung cấp.");
        return;
    }
    DOM.tabContents.forEach(content => {
        if (content) content.classList.remove('active');
    });
    DOM.tabButtons.forEach(button => {
        if (button) button.classList.remove('active');
    });
    const activeTabContent = document.getElementById(tabName);
    if (activeTabContent) {
        activeTabContent.classList.add('active');
    }
    const activeButton = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

async function populatePrintableArea() {
    const totals = await calculateTotals();
    const companySettings = getCompanySettings();
    const currentQuoteItems = getCurrentQuoteItems();
    const quoteId = getCurrentQuoteId();
    const mainCategories = getMainCategories();
    
    const printOptions = companySettings.printOptions || {
        title: 'BÁO GIÁ',
        creatorName: 'NGƯỜI LẬP BÁO GIÁ',
        hideSttColumn: false,
        hideImageColumn: false,
        hideMeasureColumn: false,
        footer: ''
    };

    // --- Header ---
    DOM.printableLogo.src = companySettings.logoDataUrl || '#';
    DOM.printableLogo.style.display = companySettings.logoDataUrl ? 'block' : 'none';
    DOM.printableCompanyName.textContent = (companySettings.name || '[Tên Công Ty/Cá Nhân]').toUpperCase();
    DOM.printableCompanyAddress.textContent = `Địa chỉ: ${companySettings.address || '[Địa chỉ]'}`;
    DOM.printableCompanyPhone.textContent = `Điện thoại: ${companySettings.phone || '[SĐT]'}`;
    DOM.printableCompanyEmail.textContent = `Email: ${companySettings.email || '[Email]'}`;
    DOM.printableCompanyTaxId.textContent = `MST: ${companySettings.taxId || '[MST]'}`;
    
    const mainTitleEl = DOM.printableQuoteArea.querySelector('h2');
    mainTitleEl.textContent = printOptions.title.toUpperCase() || 'BÁO GIÁ';
    
    // --- Thông tin chính ---
    DOM.printQuoteDate.textContent = formatDate(DOM.quoteDateInput.value);
    DOM.printQuoteIdEl.textContent = quoteId;
    DOM.printCustomerName.textContent = DOM.customerNameInput.value || '[Tên Khách hàng]';
    DOM.printCustomerAddress.textContent = DOM.customerAddressInput.value || '[Địa chỉ Khách hàng]';

    // --- Bảng chi tiết ---
    if (DOM.printItemList) {
        DOM.printItemList.innerHTML = '';
        
        const tableHeader = DOM.printItemList.parentElement.querySelector('thead');
        let headerHTML = '<tr>';
        if (!printOptions.hideSttColumn) headerHTML += `<th style="width:4%;">STT</th>`;
        if (!printOptions.hideImageColumn) headerHTML += `<th style="width:10%;">Hình ảnh</th>`;
        headerHTML += `<th style="width:36%;">Hạng Mục / Mô tả</th>`;
        headerHTML += `<th style="width:7%;">ĐVT</th>`;
        if (!printOptions.hideMeasureColumn) headerHTML += `<th style="width:8%;">Khối lượng</th>`;
        headerHTML += `<th style="width:5%;">SL</th><th style="width:10%;">Đơn giá</th><th style="width:10%;">Thành tiền</th></tr>`;
        tableHeader.innerHTML = headerHTML;
        
        tableHeader.querySelectorAll('th').forEach(th => {
            th.style.backgroundColor = '';
            th.style.color = '';
        });

        const groupedItems = new Map();
        const itemsWithoutCategory = [];
        currentQuoteItems.forEach(item => {
            if (item.mainCategoryId && mainCategories.some(cat => cat.id === item.mainCategoryId)) {
                if (!groupedItems.has(item.mainCategoryId)) groupedItems.set(item.mainCategoryId, []);
                groupedItems.get(item.mainCategoryId).push(item);
            } else {
                itemsWithoutCategory.push(item);
            }
        });
        let itemCounter = 0;
        let categoryCounter = 0;
        mainCategories.forEach(category => {
            if (groupedItems.has(category.id)) {
                categoryCounter++;
                const itemsInCategory = groupedItems.get(category.id);
                const categoryTotal = itemsInCategory.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
                const headerRow = DOM.printItemList.insertRow();
                headerRow.className = 'main-category-row print';
                const colspan = 2 + (!printOptions.hideSttColumn) + (!printOptions.hideImageColumn) + (!printOptions.hideMeasureColumn);
                headerRow.innerHTML = `
                    <td class="cell-align-center">${numberToRoman(categoryCounter)}</td>
                    <td colspan="${colspan}" class="main-category-name">${category.name}</td>
                    <td class="cell-align-right">${formatNumberForTable(categoryTotal)}</td>
                `;
                itemsInCategory.forEach(item => {
                    itemCounter++;
                    DOM.printItemList.appendChild(createPrintableItemRow(item, itemCounter, printOptions));
                });
            }
        });
        if (itemsWithoutCategory.length > 0) {
            itemsWithoutCategory.forEach(item => {
                itemCounter++;
                DOM.printItemList.appendChild(createPrintableItemRow(item, itemCounter, printOptions));
            });
        }
    }

    // --- Phần Ghi chú, Lịch thanh toán ---
    DOM.printableQuoteArea.querySelectorAll('.print-section-box h3').forEach(h3 => {
        h3.style.color = '';
    });
    
    if(DOM.printQuoteNotes) {
        const notesText = companySettings.defaultQuoteNotes || "Không có ghi chú.";
        DOM.printQuoteNotes.innerHTML = notesText.replace(/\n/g, '<br>');
    }

    const installments = getQuoteInstallmentData();
    const applyInstallments = DOM.applyInstallmentsCheckbox.checked;
    const hasValue = installments && installments.some(inst => inst.value > 0);
    if (applyInstallments && totals.grandTotal > 0 && hasValue) {
        if(DOM.paymentSchedulePrint) DOM.paymentSchedulePrint.style.display = 'block';
        let scheduleContent = '';
        installments.forEach((inst) => {
            if (!inst.name && !(inst.value > 0)) return;
            const amount = (inst.type === 'percent') ? (totals.grandTotal * inst.value) / 100 : inst.value;
            if (amount > 0) {
                scheduleContent += `<li><strong>${inst.name}:</strong> ${formatCurrency(amount)}</li>`;
            }
        });
        if(DOM.paymentScheduleBodyPrint) DOM.paymentScheduleBodyPrint.innerHTML = `<ul>${scheduleContent}</ul>`;
    } else {
        if(DOM.paymentSchedulePrint) DOM.paymentSchedulePrint.style.display = 'none';
    }
    if (companySettings.bankAccount) {
        if(DOM.paymentInfoPrint) DOM.paymentInfoPrint.style.display = 'block';
        if(DOM.paymentInfoBodyPrint) DOM.paymentInfoBodyPrint.innerHTML = companySettings.bankAccount.replace(/\n/g, '<br>');
    } else {
        if(DOM.paymentInfoPrint) DOM.paymentInfoPrint.style.display = 'none';
    }


    // --- Phần tổng kết ---
    DOM.printSubTotal.textContent = formatCurrency(totals.subTotal);
    if (totals.applyDiscount && totals.discountAmount > 0) {
        DOM.printDiscountLine.style.display = 'flex';
        const discountLabel = DOM.printDiscountLine.querySelector('span:first-child');
        if (totals.discountType === 'percent' && totals.discountValue > 0) {
            discountLabel.textContent = `Giảm giá (${totals.discountValue}%):`;
        } else {
            discountLabel.textContent = 'Giảm giá:';
        }
        DOM.printDiscountAmount.textContent = `- ${formatCurrency(totals.discountAmount)}`;
    } else {
        DOM.printDiscountLine.style.display = 'none';
    }
    DOM.printSubTotalAfterDiscountLine.style.display = (totals.applyDiscount && totals.discountAmount > 0) ? 'flex' : 'none';
    DOM.printSubTotalAfterDiscount.textContent = formatCurrency(totals.subTotalAfterDiscount);
    DOM.printTaxLine.style.display = totals.applyTax && totals.taxAmount > 0 ? 'flex' : 'none';
    if(DOM.printTaxPercent) DOM.printTaxPercent.textContent = totals.taxPercent;
    DOM.printTaxAmount.textContent = formatCurrency(totals.taxAmount);
    DOM.printTotalPrice.textContent = formatCurrency(totals.grandTotal);
    if (DOM.printTotalInWords) {
        DOM.printTotalInWords.parentElement.style.display = 'none';
    }

    // --- Phần chữ ký và chân trang ---
    if(DOM.printCreatorNameSignature) {
        DOM.printCreatorNameSignature.textContent = printOptions.creatorName || '';
    }
    
    let footerEl = document.getElementById('printableFooter');
    if (!footerEl) {
        footerEl = document.createElement('div');
        footerEl.id = 'printableFooter';
        footerEl.className = 'print-footer';
        DOM.printableQuoteArea.appendChild(footerEl);
    }
    if (printOptions.footer) {
        footerEl.innerHTML = `<hr><p style="text-align:center; font-style:italic; font-size:9pt;">${printOptions.footer.replace(/\n/g, '<br>')}</p>`;
        footerEl.style.display = 'block';
    } else {
        footerEl.style.display = 'none';
    }
}

function createPrintableItemRow(item, itemIndex, printOptions) {
    const row = document.createElement('tr');
    
    let rowHTML = '';
    if (!printOptions.hideSttColumn) rowHTML += `<td class="cell-align-center">${itemIndex}</td>`;
    if (!printOptions.hideImageColumn) {
        const imgSrcPrint = item.imageDataUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        rowHTML += `<td><img src="${imgSrcPrint}" alt="" class="item-image-print" style="display:${item.imageDataUrl ? 'block':'none'};"></td>`;
    }

    let displayNameInPrint = `<span class="item-name-display">${item.name.toUpperCase()}</span>`;
    if (item.spec) displayNameInPrint += `<br><span class="item-spec-display">${item.spec}</span>`;
    rowHTML += `<td class="item-name-spec-cell-print">${displayNameInPrint}</td>`;
    rowHTML += `<td class="cell-align-center">${item.unit}</td>`;
    
    if (!printOptions.hideMeasureColumn) {
        let displayedMeasureTextPrint = '';
        if (item.calculatedMeasure && typeof item.calculatedMeasure === 'number' && item.calcType !== 'unit') {
             let measureInMeters = item.calculatedMeasure;
             if (item.calcType === 'length') measureInMeters /= 1000;
             else if (item.calcType === 'area') measureInMeters /= 1000000;
             else if (item.calcType === 'volume') measureInMeters /= 1000000000;
             displayedMeasureTextPrint = `${parseFloat(measureInMeters.toFixed(4)).toLocaleString('vi-VN')}`;
        }
        rowHTML += `<td class="cell-align-right">${displayedMeasureTextPrint}</td>`;
    }

    rowHTML += `<td class="cell-align-right">${(item.quantity).toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>`;

    let priceCellContent = `<strong>${formatNumberForTable(item.price)}</strong>`;
    if (item.itemDiscountAmount > 0) {
        let discountText = '';
        if (item.itemDiscountType === 'percent' && item.itemDiscountValue > 0) {
            discountText = `<span class="item-discount-percent"> (-${item.itemDiscountValue}%)</span>`;
        }
        priceCellContent = `
            <span class="strikethrough-price">${formatNumberForTable(item.originalPrice)}</span><br>
            <strong>${formatNumberForTable(item.price)}</strong>${discountText}
        `;
    }
    rowHTML += `<td class="cell-align-right">${priceCellContent}</td>`;
    rowHTML += `<td class="cell-align-right">${formatNumberForTable(item.lineTotal)}</td>`;
    
    row.innerHTML = rowHTML;
    return row;
}


export async function exportToPdf() {
    if (getCurrentQuoteItems().length === 0) {
        alert("Chưa có hạng mục để xuất PDF.");
        return;
    }
    
    showLoader();
    await populatePrintableArea();
    const elementToCapture = DOM.printableQuoteArea;
    elementToCapture.style.display = 'block';
    
    try {
        const { jsPDF } = window.jspdf;
        // THAY ĐỔI: Điều chỉnh tùy chọn để tránh chữ bị thu nhỏ
        const canvas = await html2canvas(elementToCapture, {
            scale: 2, // Giữ scale hợp lý
            useCORS: true,
            logging: false,
            width: elementToCapture.scrollWidth, // Chụp theo chiều rộng thực tế
            windowWidth: elementToCapture.scrollWidth
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save(`BaoGia_${(DOM.customerNameInput.value || 'KhachHang').replace(/[^a-zA-Z0-9]/g,'_')}.pdf`);
    } catch (e) {
        console.error("Lỗi PDF:", e);
        alert("Lỗi xuất PDF: " + e.message);
    } finally {
        elementToCapture.style.display = 'none';
        hideLoader();
    }
};

export function printCurrentQuote() {
    if (getCurrentQuoteItems().length === 0) {
        alert("Chưa có hạng mục để in.");
        return;
    }
    
    showLoader();
    
    setTimeout(async () => {
        await populatePrintableArea();
        DOM.printableQuoteArea.style.display = 'block';

        let isPrinting = true;

        const cleanup = () => {
            if (isPrinting) {
                isPrinting = false;
                DOM.printableQuoteArea.style.display = 'none';
                hideLoader();
                window.removeEventListener('afterprint', cleanup);
            }
        };

        window.addEventListener('afterprint', cleanup, { once: true });

        try {
            document.execCommand('print', false, null);
        } catch (e) {
            window.print();
        }
    }, 100);
};