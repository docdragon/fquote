
/**
 * @file ui.js
 * @description Chứa các logic liên quan đến giao diện người dùng (UI) chung.
 * CẬP NHẬT: Sửa lỗi ReferenceError: groupedItems is not defined.
 */
import * as DOM from './dom.js';
import {
    formatDate,
    formatCurrency,
    numberToRoman,
} from './utils.js';
import {
    // calculateTotals, // Removed to avoid circular dependency, handled in quote.js
    // getCurrentQuoteItems, // Removed
    // getCompanySettings, // Removed
    // getCurrentQuoteId, // Removed
    // getQuoteInstallmentData // Removed
} from './quote.js'; // This import might need careful review for circular dependencies
import { getMainCategories } from './catalog.js';

// --- UTILITY FUNCTIONS ---
function formatNumberForTable(number) {
    if (typeof number !== 'number' || isNaN(number)) return '0';
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

// ===================================================================================
// ========================== PDF GENERATION LOGIC =========================
// ===================================================================================
async function generatePdfDoc(quoteModule, catalogModule) { // Pass necessary modules or data
    // --- Font Loading ---
    const arrayBufferToBase64 = (buffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    };

    const loadFont = async (url) => {
        const fontResponse = await fetch(url);
        if (!fontResponse.ok) throw new Error(`Network response was not ok for ${url}`);
        const fontBuffer = await fontResponse.arrayBuffer();
        return arrayBufferToBase64(fontBuffer);
    };
    
    let robotoRegularBase64, robotoBoldBase64, robotoItalicBase64, robotoBoldItalicBase64;
    try {
        [robotoRegularBase64, robotoBoldBase64, robotoItalicBase64, robotoBoldItalicBase64] = await Promise.all([
            loadFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf'),
            loadFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf'), // Using Medium for Bold
            loadFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Italic.ttf'),
            loadFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-MediumItalic.ttf') // Using MediumItalic for BoldItalic
        ]);
    } catch (fontError) {
        console.error("Lỗi tải phông chữ:", fontError);
        alert("Không thể tải phông chữ cần thiết để xuất PDF. Vui lòng kiểm tra kết nối mạng và thử lại.");
        return null;
    }

    // --- Document Setup ---
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a3'); // Set paper size to A3
    doc.addFileToVFS('Roboto-Regular.ttf', robotoRegularBase64);
    doc.addFileToVFS('Roboto-Bold.ttf', robotoBoldBase64);
    doc.addFileToVFS('Roboto-Italic.ttf', robotoItalicBase64);
    doc.addFileToVFS('Roboto-BoldItalic.ttf', robotoBoldItalicBase64);
    
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    doc.addFont('Roboto-Italic.ttf', 'Roboto', 'italic');
    doc.addFont('Roboto-BoldItalic.ttf', 'Roboto', 'bolditalic');
    
    doc.setFont('Roboto', 'normal');

    // --- Data Gathering ---
    const companySettings = quoteModule.getCompanySettings(); // Use passed module
    const totals = await quoteModule.calculateTotals(null, false); // Use passed module
    const quoteItems = quoteModule.getCurrentQuoteItems(); // Use passed module
    const mainCategoriesList = catalogModule.getMainCategories(); // Use passed module
    const printOptions = companySettings.printOptions || {};
    
    // --- Constants and Variables ---
    const primaryColor = '#1a73e8';
    const secondaryColor = '#f1f3f4';
    const textColor = '#202124';
    const lightTextColor = '#5f6368';
    const margin = 15;
    const pageContentWidth = doc.internal.pageSize.getWidth() - (margin * 2);
    let currentY = 20; 
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // --- PDF Header ---
    let logoDrawnHeight = 0;
    if (companySettings.logoDataUrl) {
        try {
            const imgProps = doc.getImageProperties(companySettings.logoDataUrl);
            let imgDisplayWidth = 40; 
            let imgDisplayHeight = (imgProps.height * imgDisplayWidth) / imgProps.width; 

            const maxLogoHeight = 30; 
            const maxLogoWidth = 50; 

            if (imgDisplayHeight > maxLogoHeight) {
                imgDisplayHeight = maxLogoHeight;
                imgDisplayWidth = (imgProps.width * imgDisplayHeight) / imgProps.height;
            }
            if (imgDisplayWidth > maxLogoWidth) {
                imgDisplayWidth = maxLogoWidth;
                imgDisplayHeight = (imgProps.height * imgDisplayWidth) / imgProps.width;
                 if (imgDisplayHeight > maxLogoHeight) { 
                    imgDisplayHeight = maxLogoHeight;
                    imgDisplayWidth = (imgProps.width * imgDisplayHeight) / imgProps.height;
                }
            }
            doc.addImage(companySettings.logoDataUrl, 'JPEG', margin, currentY - 5, imgDisplayWidth, imgDisplayHeight, undefined, 'FAST');
            logoDrawnHeight = imgDisplayHeight;
        } catch(e) { console.warn("Không thể thêm logo.", e); }
    }

    const companyInfoX = margin + (logoDrawnHeight > 0 ? 45 : 0); 
    const companyNameYPos = currentY;
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(16); 
    doc.setTextColor(textColor);
    doc.text((companySettings.name || 'TÊN CÔNG TY').toUpperCase(), companyInfoX, companyNameYPos);
    
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(10); 
    doc.setTextColor(lightTextColor);
    let companyDetailsY = companyNameYPos + 8;
    doc.text(companySettings.address || 'Địa chỉ công ty', companyInfoX, companyDetailsY);
    companyDetailsY += 6;
    doc.text(`ĐT: ${companySettings.phone || '[SĐT]'} | Email: ${companySettings.email || '[Email]'}`, companyInfoX, companyDetailsY);
    companyDetailsY += 6;
    if(companySettings.taxId) {
        doc.text(`MST: ${companySettings.taxId}`, companyInfoX, companyDetailsY);
        companyDetailsY += 6;
    }
    if(companySettings.bankAccount) { 
        const bankAccountLines = doc.splitTextToSize(`STK: ${companySettings.bankAccount}`, pageContentWidth - (companyInfoX - margin));
        doc.text(bankAccountLines, companyInfoX, companyDetailsY);
        companyDetailsY += (bankAccountLines.length * 5); 
    }
    
    const endOfTextY = companyDetailsY; 
    const endOfLogoY = (currentY - 5) + logoDrawnHeight; 
    currentY = Math.max(endOfTextY, endOfLogoY) + 7; 

    doc.setDrawColor(secondaryColor);
    doc.line(margin, currentY, pageContentWidth + margin, currentY);

    // --- PDF Title & Customer Info ---
    currentY += 14;
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(24); 
    doc.setTextColor(textColor);
    doc.text((printOptions.title || 'BÁO GIÁ').toUpperCase(), doc.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    
    currentY += 14;
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(11); 
    doc.setDrawColor(secondaryColor);
    doc.setFillColor(secondaryColor);
    
    const customerBoxStartY = currentY;
    let customerBoxHeight = 22; // Initial height
    const customerAddressText = DOM.customerAddressInput.value.trim();
    let addressLinesCount = 0;
    if (customerAddressText !== '') {
        const addressLabel = "Địa chỉ: ";
        const availableWidthForAddress = (pageContentWidth / 2) - 15 - (margin + 7) - doc.getTextWidth(addressLabel) - 1;
        const addressTextLines = doc.splitTextToSize(customerAddressText, availableWidthForAddress);
        addressLinesCount = addressTextLines.length;
        if (addressLinesCount > 1) { // If address has more than 1 line, increase box height
            customerBoxHeight += (addressLinesCount - 1) * 5; // Approx 5mm per extra line
        }
    }
    doc.roundedRect(margin, customerBoxStartY, pageContentWidth, customerBoxHeight, 3, 3, 'F');
    
    const customerTextYBase = customerBoxStartY + 8;
    doc.setTextColor(lightTextColor);
    doc.setFont('Roboto', 'bold');
    doc.text('KHÁCH HÀNG:', margin + 7, customerTextYBase);
    doc.text('SỐ BÁO GIÁ:', margin + pageContentWidth/2, customerTextYBase);
    doc.text('NGÀY:', margin + pageContentWidth/2, customerTextYBase + 8);
    
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(textColor);
    doc.text(DOM.customerNameInput.value || '[Tên Khách hàng]', margin + 35, customerTextYBase);
    
    if (customerAddressText !== '') {
        const addressLabel = "Địa chỉ: ";
        const addressX = margin + 7;
        const addressY = customerTextYBase + 8; // Line below customer name
        const availableWidthForAddressText = (pageContentWidth / 2) - 15 - (addressX - margin) - doc.getTextWidth(addressLabel) - 1;
        
        doc.setFont('Roboto', 'bold');
        doc.setTextColor(lightTextColor);
        doc.text(addressLabel, addressX, addressY);
        
        doc.setFont('Roboto', 'normal');
        doc.setTextColor(textColor);
        const addressTextX = addressX + doc.getTextWidth(addressLabel) + 1;
        const addressTextRenderLines = doc.splitTextToSize(customerAddressText, availableWidthForAddressText);
        doc.text(addressTextRenderLines, addressTextX, addressY);
    }

    const currentQuoteDisplayId = quoteModule.getCurrentQuoteId(); // Use passed module
    doc.text(currentQuoteDisplayId || `TEMP-${Date.now()}`, margin + pageContentWidth/2 + 30, customerTextYBase); // Fallback if ID is somehow not ready
    doc.text(formatDate(DOM.quoteDateInput.value), margin + pageContentWidth/2 + 30, customerTextYBase + 8);
    
    currentY = customerBoxStartY + customerBoxHeight + 13; // Adjusted spacing based on dynamic box height
    
    // --- PDF Table ---
    const head = [];
    const body = [];
    const columns = [{ key: 'stt', header: 'STT' }];
    if (!printOptions.hideImageColumn) columns.push({ key: 'image', header: 'HÌNH ẢNH' });
    columns.push(
        { key: 'name', header: 'HẠNG MỤC / MÔ TẢ' }, { key: 'unit', header: 'ĐVT' },
        { key: 'measure', header: 'K.LƯỢNG' }, { key: 'quantity', header: 'SL' },
        { key: 'price', header: 'ĐƠN GIÁ (VNĐ)' }, { key: 'total', header: 'THÀNH TIỀN (VNĐ)' }
    );
    if (printOptions.hideMeasureColumn) {
        const measureIndex = columns.findIndex(col => col.key === 'measure');
        if (measureIndex > -1) columns.splice(measureIndex, 1);
    }
    if (printOptions.hideSttColumn) {
         const sttIndex = columns.findIndex(col => col.key === 'stt');
        if (sttIndex > -1) columns.splice(sttIndex, 1);
    }
    
    head.push(columns.map(c => c.header));

    const itemsForTable = [];
    let itemCounter = 0;
    let categoryRomanNumeralCounter = 0;

    const groupedByActualCategory = new Map();
    const itemsWithoutValidOrAnyCategory = [];

    quoteItems.forEach(item => {
        const category = mainCategoriesList.find(cat => cat.id === item.mainCategoryId);
        if (category) {
            if (!groupedByActualCategory.has(item.mainCategoryId)) {
                groupedByActualCategory.set(item.mainCategoryId, { name: category.name, items: [] });
            }
            groupedByActualCategory.get(item.mainCategoryId).items.push(item);
        } else {
            itemsWithoutValidOrAnyCategory.push(item);
        }
    });

    const processCategoryItems = (itemsInCategory) => {
        itemsInCategory.forEach(item => {
            if (!printOptions.hideSttColumn) itemCounter++;
            const rowData = columns.map(col => mapItemToColumn(item, col.key, itemCounter, printOptions));
            body.push(rowData);
            itemsForTable.push(item);
        });
    };
    
    // Iterate through mainCategoriesList to maintain defined order
    mainCategoriesList.forEach(cat => {
        if (groupedByActualCategory.has(cat.id)) {
            categoryRomanNumeralCounter++;
            const categoryGroup = groupedByActualCategory.get(cat.id);
            const itemsInCategory = categoryGroup.items;
            const categoryTotal = itemsInCategory.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
            
            const categoryRow = [];
            let sttColSpanFactor = printOptions.hideSttColumn ? 0 : 1;
            const categoryRowStyle = { 
                font: 'Roboto', 
                fontStyle: 'bold', 
                fillColor: '#e0eaff', 
                textColor: '#0d47a1', 
                fontSize: 9, 
                cellPadding: {top: 0.5, bottom: 0.5, left: 2, right: 2},
                minCellHeight: 4.5, // Fit content height
                valign: 'middle'
            };

            if (!printOptions.hideSttColumn) {
                categoryRow.push({ content: numberToRoman(categoryRomanNumeralCounter), styles: {...categoryRowStyle, halign: 'center' }});
            }
            const nameColSpan = columns.length - sttColSpanFactor - 1; 
            categoryRow.push({ content: cat.name.toUpperCase(), colSpan: nameColSpan, styles: categoryRowStyle });
            categoryRow.push({ content: formatCurrency(categoryTotal), styles: {...categoryRowStyle, halign: 'right' } });

            body.push(categoryRow);
            itemsForTable.push(null); 
            processCategoryItems(itemsInCategory);
        }
    });

    // Add "Hạng mục khác" if there are items without valid or any category
    if (itemsWithoutValidOrAnyCategory.length > 0) {
        categoryRomanNumeralCounter++;
        const categoryName = "HẠNG MỤC KHÁC";
        const categoryTotal = itemsWithoutValidOrAnyCategory.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
        
        const categoryRowKhac = [];
        let sttColSpanFactor = printOptions.hideSttColumn ? 0 : 1;
        const categoryRowKhacStyle = { 
            font: 'Roboto', 
            fontStyle: 'bold', 
            fillColor: '#e0eaff', 
            textColor: '#0d47a1', 
            fontSize: 9, 
            cellPadding: {top: 0.5, bottom: 0.5, left: 2, right: 2},
            minCellHeight: 4.5, // Fit content height
            valign: 'middle'
        };

         if (!printOptions.hideSttColumn) {
            categoryRowKhac.push({ content: numberToRoman(categoryRomanNumeralCounter), styles: {...categoryRowKhacStyle, halign: 'center' }});
        }
        const nameColSpanKhac = columns.length - sttColSpanFactor - 1;
        categoryRowKhac.push({ content: categoryName, colSpan: nameColSpanKhac, styles: categoryRowKhacStyle });
        categoryRowKhac.push({ content: formatCurrency(categoryTotal), styles: {...categoryRowKhacStyle, halign: 'right' } });
        
        body.push(categoryRowKhac);
        itemsForTable.push(null);
        processCategoryItems(itemsWithoutValidOrAnyCategory);
    }
    
    const columnStylesConfig = {};
    columns.forEach((col, index) => {
        let colWidth = 'auto';
        let align = 'left';
        if (col.key === 'stt') { colWidth = 12; align = 'center';}
        else if (col.key === 'image') { colWidth = 35; align = 'center';} 
        else if (col.key === 'unit') { colWidth = 15; align = 'center';}
        else if (col.key === 'measure' && !printOptions.hideMeasureColumn) { colWidth = 22; align = 'right';}
        else if (col.key === 'quantity') { colWidth = 15; align = 'right';}
        else if (col.key === 'price') { colWidth = 35; align = 'right';} 
        else if (col.key === 'total') { colWidth = 35; align = 'right';} 
        
        columnStylesConfig[index] = { cellWidth: colWidth, halign: align };
        if (col.key === 'image') columnStylesConfig[index].minCellHeight = 28;
        if (col.key === 'price') columnStylesConfig[index].minCellHeight = 14; 
    });
    
    doc.autoTable({
        startY: currentY,
        head: [columns.map(c => c.header)],
        body: body,
        theme: 'grid',
        tableWidth: 'auto', 
        headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: primaryColor, textColor: '#ffffff', fontSize: 9.5, valign: 'middle', cellPadding: 2.5 },
        styles: { font: 'Roboto', fontSize: 9, textColor: textColor, cellPadding: 2.5, valign: 'middle', overflow: 'linebreak' },
        columnStyles: columnStylesConfig,
        didDrawCell: (data) => {
            if (data.section === 'body' && Array.isArray(data.row.raw) && data.row.raw.length === columns.length) {
                const item = itemsForTable[data.row.index]; 
                if (!item) return;

                const currentColumnKey = columns[data.column.index]?.key;

                if (currentColumnKey === 'image' && item.imageDataUrl) {
                    try {
                        const imgProps = doc.getImageProperties(item.imageDataUrl);
                        const cell = data.cell;
                        const maxW = cell.width - 2; 
                        const maxH = cell.height - 2; 
                        const ratio = imgProps.width / imgProps.height;
                        let newW = maxW;
                        let newH = newW / ratio;
                        if (newH > maxH) { newH = maxH; newW = newH * ratio; }
                        const x_img = cell.x + (cell.width - newW) / 2;
                        const y_img = cell.y + (cell.height - newH) / 2;
                        doc.addImage(item.imageDataUrl, 'JPEG', x_img, y_img, newW, newH, undefined, 'FAST');
                    } catch (e) { console.error("Could not add item image.", e); }
                }

                 if (currentColumnKey === 'name') {
                    doc.setFont('Roboto', 'normal'); 
                    const cellPadding = data.cell.padding('left');
                    let textY = data.cell.y + data.cell.padding('top') + 3; 

                    doc.setFont('Roboto', 'bold');
                    doc.setFontSize(9);
                    doc.setTextColor(textColor);
                    const nameLines = doc.splitTextToSize(item.name.toUpperCase(), data.cell.width - cellPadding * 2);
                    doc.text(nameLines, data.cell.x + cellPadding, textY);
                    textY += nameLines.length * 3.5; 

                    let dimParts = [];
                    if (item.length) dimParts.push(`D ${item.length}mm`);
                    if (item.height) dimParts.push(`C ${item.height}mm`);
                    if (item.depth) dimParts.push(`S ${item.depth}mm`);
                    const dimensionsString = dimParts.join(' x ');

                    if (dimensionsString) {
                        doc.setFont('Roboto', 'italic');
                        doc.setFontSize(8);
                        doc.setTextColor(lightTextColor);
                        const dimLines = doc.splitTextToSize(`KT: ${dimensionsString}`, data.cell.width - cellPadding * 2);
                        doc.text(dimLines, data.cell.x + cellPadding, textY);
                        textY += dimLines.length * 3.2;
                    }

                    if (item.spec) {
                        doc.setFont('Roboto', 'italic');
                        doc.setFontSize(8);
                        doc.setTextColor(lightTextColor);
                        const specLines = doc.splitTextToSize(item.spec, data.cell.width - cellPadding * 2);
                        doc.text(specLines, data.cell.x + cellPadding, textY);
                    }
                    doc.setFont('Roboto', 'normal'); 
                }


                if (currentColumnKey === 'price') {
                    doc.setFont('Roboto', 'normal');
                    const cellPaddingRight = data.cell.padding('right');
                    const textY = data.cell.y + data.cell.height / 2; 

                    if (item.itemDiscountAmount > 0 && item.originalPrice !== item.price) {
                        const originalPriceStr = formatNumberForTable(item.originalPrice);
                        doc.setFontSize(8);
                        doc.setTextColor(lightTextColor);
                        doc.setFont('Roboto', 'normal');
                        const originalWidth = doc.getTextWidth(originalPriceStr);
                        const originalX = data.cell.x + data.cell.width - originalWidth - cellPaddingRight;
                        const originalY = textY - 2; 
                        doc.text(originalPriceStr, originalX, originalY);
                        doc.setDrawColor(lightTextColor);
                        doc.line(originalX, originalY - 0.7, originalX + originalWidth, originalY - 0.7);

                        const newPriceStr = formatNumberForTable(item.price);
                        doc.setFontSize(9);
                        doc.setTextColor(textColor);
                        doc.setFont('Roboto', 'bold');
                        const newWidth = doc.getTextWidth(newPriceStr);
                        const newPriceY = textY + 3.5; 
                        doc.text(newPriceStr, data.cell.x + data.cell.width - newWidth - cellPaddingRight, newPriceY);

                        if (item.itemDiscountType === 'percent' && item.itemDiscountValue > 0) {
                            const discountPercentStr = `(-${item.itemDiscountValue}%)`;
                            doc.setFontSize(7.5);
                            doc.setTextColor('#D0021B'); 
                            doc.setFont('Roboto', 'italic');
                            const discountTextWidth = doc.getTextWidth(discountPercentStr);
                            const discountX = data.cell.x + data.cell.width - newWidth - cellPaddingRight - discountTextWidth - 1.5;
                            doc.text(discountPercentStr, discountX, newPriceY); 
                        }
                    } else { 
                        const priceStr = formatNumberForTable(item.price);
                        doc.setFontSize(9);
                        doc.setTextColor(textColor);
                        doc.setFont('Roboto', 'bold');
                        const width = doc.getTextWidth(priceStr);
                        doc.text(priceStr, data.cell.x + data.cell.width - width - cellPaddingRight, textY + 1.5); 
                    }
                    doc.setFont('Roboto', 'normal'); 
                }
            }
        }
    });

    currentY = doc.lastAutoTable.finalY + 10;
    
    // --- Totals Section ---
    const summaryMinSpaceNeeded = 70; 
    if (currentY > pageHeight - summaryMinSpaceNeeded) {
        doc.addPage();
        currentY = margin;
    }

    const summaryBody = [
        ['Tạm tính:', formatCurrency(totals.subTotal)],
    ];
    if (totals.applyDiscount && totals.discountAmount > 0) {
        summaryBody.push([`Giảm giá (${totals.discountType === 'percent' ? totals.discountValue + '%' : formatCurrency(totals.discountValue)}):`, `- ${formatCurrency(totals.discountAmount)}`]);
    }
    if (totals.subTotalAfterDiscount !== totals.subTotal && totals.applyDiscount) {
         summaryBody.push(['Thành tiền sau giảm giá:', formatCurrency(totals.subTotalAfterDiscount)]);
    }
    if (totals.applyTax && totals.taxAmount > 0) {
        summaryBody.push([`Thuế VAT (${totals.taxPercent}%):`, formatCurrency(totals.taxAmount)]);
    }
    
    doc.autoTable({
        startY: currentY,
        body: summaryBody,
        theme: 'plain',
        styles: { fontSize: 10, font: 'Roboto', cellPadding: {top: 1.5, right: 0, bottom: 1.5, left: 0} }, 
        columnStyles: { 0: { halign: 'right', fontStyle: 'normal' }, 1: { halign: 'right', fontStyle: 'bold'} },
        tableWidth: 100, 
        margin: { left: pageContentWidth + margin - 100 },
    });
    currentY = doc.lastAutoTable.finalY;
    const totalXStart = pageContentWidth + margin - 100;
    doc.setDrawColor(textColor);
    doc.line(totalXStart, currentY, pageContentWidth + margin, currentY);
    currentY += 7; 
    
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(11); 
    const tongCongLabel = 'TỔNG CỘNG:';
    doc.text(tongCongLabel, totalXStart, currentY); 

    doc.setFontSize(12); 
    doc.text(formatCurrency(totals.grandTotal), totalXStart + 100, currentY, { align: 'right' });

    currentY += 12; 
    
    // --- Notes, Installments ---
    const installments = quoteModule.getQuoteInstallmentData(); // Use passed module
    const applyInstallments = DOM.applyInstallmentsCheckbox.checked;

    const signatureBlockHeight = 55; // Increased signature block height reservation
    const spaceForPageNumAndFooter = 20;

    if (applyInstallments && totals.grandTotal > 0 && installments.some(i => i.value > 0)) {
        const sectionTitle = 'LỊCH THANH TOÁN:';
        const sectionContent = installments.filter(i => i.value > 0).map(inst => {
            const amount = (inst.type === 'percent') ? (totals.grandTotal * inst.value) / 100 : inst.value;
            return `- ${inst.name}: ${formatCurrency(amount)}`;
        });
        const sectionHeight = 6 + (sectionContent.length * 5) + 4;
        if (currentY + sectionHeight + signatureBlockHeight + spaceForPageNumAndFooter > pageHeight) { doc.addPage(); currentY = margin; }
        
        doc.setFont('Roboto', 'bold'); doc.setFontSize(10.5); doc.setTextColor(textColor);
        doc.text(sectionTitle, margin, currentY);
        currentY += 6;
        doc.setFont('Roboto', 'normal'); doc.setFontSize(9.5); doc.setTextColor(lightTextColor);
        sectionContent.forEach(line => {
             doc.text(line, margin, currentY);
             currentY += 5;
        });
        currentY += 4;
    }
    
    if (companySettings.defaultQuoteNotes) {
        const sectionTitle = 'GHI CHÚ:';
        const noteLines = doc.splitTextToSize(companySettings.defaultQuoteNotes, pageContentWidth);
        const sectionHeight = 6 + (noteLines.length * 5) + 4;
        if (currentY + sectionHeight + signatureBlockHeight + spaceForPageNumAndFooter > pageHeight) { doc.addPage(); currentY = margin; }

        doc.setFont('Roboto', 'bold'); doc.setFontSize(10.5); doc.setTextColor(textColor);
        doc.text(sectionTitle, margin, currentY);
        currentY += 6;
        doc.setFont('Roboto', 'normal'); doc.setFontSize(9.5); doc.setTextColor(lightTextColor);
        doc.text(noteLines, margin, currentY);
        currentY += (noteLines.length * 5) + 4;
    }
    
    // --- Signatures ---
    currentY += 10; // Consistent small space before signatures
    if (currentY + signatureBlockHeight + spaceForPageNumAndFooter > pageHeight) {
        doc.addPage();
        currentY = margin + 15; 
    }
    const actualSignatureStartY = currentY;

    doc.setFont('Roboto', 'bold'); doc.setFontSize(11); doc.setTextColor(textColor);
    const signatureBoxWidth = pageContentWidth / 2 - 15; 
    const customerSignX = margin + signatureBoxWidth / 2;
    const creatorSignX = margin + pageContentWidth / 2 + signatureBoxWidth / 2;

    doc.text('Khách hàng', customerSignX, actualSignatureStartY, { align: 'center'});
    doc.text('Người lập báo giá', creatorSignX, actualSignatureStartY, { align: 'center'});
    
    doc.setFont('Roboto', 'normal'); doc.setFontSize(9); doc.setTextColor(lightTextColor);
    doc.text('(Ký, ghi rõ họ tên)', customerSignX, actualSignatureStartY + 5.5, { align: 'center'});
    doc.text('(Ký, ghi rõ họ tên)', creatorSignX, actualSignatureStartY + 5.5, { align: 'center'});

    if(printOptions.creatorName) {
        doc.setFont('Roboto', 'bold'); doc.setFontSize(10.5); doc.setTextColor(textColor);
        // Increased Y offset for creator name to give more signature space above it
        doc.text(printOptions.creatorName, creatorSignX, actualSignatureStartY + 5.5 + 20 + 4, { align: 'center'});
    }

    // --- Page Number and Footer ---
    const pageCount = doc.internal.getNumberOfPages();
    const pageNumYPos = pageHeight - 8; 
    const footerYPos = pageHeight - 14; 

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(lightTextColor);
        doc.text(`Trang ${i} / ${pageCount}`, doc.internal.pageSize.getWidth() / 2, pageNumYPos, { align: 'center' });
    }

    if (printOptions.footer) { 
        for (let i = 1; i <= pageCount; i++) { 
            doc.setPage(i);
            doc.setFont('Roboto', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(lightTextColor);
            doc.text(printOptions.footer, doc.internal.pageSize.getWidth() / 2, footerYPos, { align: 'center' });
        }
    }
    
    return doc;
}

export async function exportToPdf() {
    // Dynamically import quote and catalog to pass to generatePdfDoc
    const quoteModule = await import('./quote.js');
    const catalogModule = await import('./catalog.js');
    if (quoteModule.getCurrentQuoteItems().length === 0) {
        alert("Chưa có hạng mục nào để xuất PDF.");
        return;
    }
    showLoader();
    try {
        const doc = await generatePdfDoc(quoteModule, catalogModule);
        if (doc) {
            doc.save(`BaoGia_${(DOM.customerNameInput.value || 'KhachHang').replace(/[^a-zA-Z0-9]/g,'_')}.pdf`);
        }
    } catch(e) {
        console.error("Lỗi xuất PDF:", e);
        alert("Đã xảy ra lỗi khi xuất PDF. Vui lòng thử lại. Chi tiết: " + e.message);
    } finally {
        hideLoader();
    }
}

export async function previewPdf() {
     // Dynamically import quote and catalog to pass to generatePdfDoc
    const quoteModule = await import('./quote.js');
    const catalogModule = await import('./catalog.js');
    if (quoteModule.getCurrentQuoteItems().length === 0) {
        alert("Chưa có hạng mục nào để xem trước.");
        return;
    }
    showLoader();
    try {
        const doc = await generatePdfDoc(quoteModule, catalogModule);
        if (doc) {
            doc.output('dataurlnewwindow');
        }
    } catch(e) {
        console.error("Lỗi xem trước PDF:", e);
        alert("Đã xảy ra lỗi khi xem trước PDF. Vui lòng thử lại. Chi tiết: " + e.message);
    } finally {
        hideLoader();
    }
}

function mapItemToColumn(item, columnKey, itemIndex, printOptions) {
    if (printOptions.hideSttColumn && columnKey === 'stt') return null; 
    if (printOptions.hideImageColumn && columnKey === 'image') return null;
    if (printOptions.hideMeasureColumn && columnKey === 'measure') return null;

    switch (columnKey) {
        case 'stt': return itemIndex.toString();
        case 'image': return ''; 
        case 'name': 
            return ''; 
        case 'unit': return item.unit || '';
        case 'measure':
            if (item.calculatedMeasure && typeof item.calculatedMeasure === 'number' && item.calcType !== 'unit') {
                let measureInMeters = item.calculatedMeasure;
                if (item.calcType === 'length') measureInMeters /= 1000;
                else if (item.calcType === 'area') measureInMeters /= 1000000;
                else if (item.calcType === 'volume') measureInMeters /= 1000000000;
                return parseFloat(measureInMeters.toFixed(3)).toLocaleString('vi-VN');
            }
            return '';
        case 'quantity': return (item.quantity || 0).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        case 'price': return ''; 
        case 'total': return formatNumberForTable(item.lineTotal || 0);
        default: return '';
    }
}


export function renderUserProfile(profileData, userId, targetDiv) {
    if (!profileData || !targetDiv) return;

    const validUntilDate = profileData.validUntil ? profileData.validUntil.toDate() : null;
    const remainingDaysString = validUntilDate ? formatRemainingDays(validUntilDate) : 'Chưa có thông tin';
    
    let remainingClass = 'status-ok';
    if (remainingDaysString.includes('hết hạn') || remainingDaysString.includes('hôm nay')) {
        remainingClass = 'status-expired';
    } else if (remainingDaysString.includes('Còn lại') && validUntilDate && (validUntilDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24) <= 7) {
        remainingClass = 'status-warning';
    }

    targetDiv.innerHTML = `
        <p><strong>User ID:</strong> ${userId || 'N/A'}</p>
        <p><strong>Email:</strong> ${profileData.email || 'N/A'}</p>
        <p><strong>Ngày đăng ký:</strong> ${profileData.accountCreatedAt ? formatDate(profileData.accountCreatedAt.toDate()) : 'N/A'}</p>
        <p><strong>Hạn sử dụng đến:</strong> <span class="${remainingClass}" style="font-weight:bold;">${validUntilDate ? formatDate(validUntilDate) : 'Chưa có thông tin'}</span></p>
        <p><strong>Trạng thái:</strong> ${profileData.status || 'N/A'}</p>
        <p class="remaining-days ${remainingClass}"><strong>Thời gian sử dụng còn lại:</strong> ${remainingDaysString}</p>
    `;
}

const formatRemainingDays = (validUntilDate) => { 
    if (!validUntilDate) return 'Không xác định';
    const now = new Date();
    const expiry = new Date(validUntilDate);
    now.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Đã hết hạn';
    if (diffDays === 0) return 'Hết hạn hôm nay';
    return `Còn lại ${diffDays} ngày`;
};
