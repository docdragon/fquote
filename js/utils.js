/**
 * @file utils.js
 * @description Chứa các hàm tiện ích chung cho ứng dụng.
 */

/**
 * Định dạng một số thành chuỗi tiền tệ VNĐ.
 * @param {number} number - Số cần định dạng.
 * @returns {string} - Chuỗi đã định dạng (ví dụ: "1.234.567 VNĐ").
 */
export function formatCurrency(number) {
    if (typeof number !== 'number') return '0 VNĐ';
    return number.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

/**
 * Định dạng ngày tháng.
 * @param {string | number | Date} dateInput - Dữ liệu ngày đầu vào.
 * @returns {string} - Chuỗi ngày đã định dạng (ví dụ: "10/06/2025").
 */
export function formatDate(dateInput) {
    if (!dateInput) return '';
    try {
        const date = new Date(dateInput);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        return '';
    }
}

/**
 * Tạo một ID duy nhất với tiền tố.
 * @param {string} prefix - Tiền tố cho ID.
 * @returns {string} - ID duy nhất.
 */
export function generateUniqueId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Tạo ID báo giá chuyên nghiệp.
 * @returns {string} - ID báo giá (ví dụ: "BG-20250610-A1B2").
 */
export function generateProfessionalQuoteId() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BG-${year}${month}${day}-${randomPart}`;
}

/**
 * Chuyển số sang chữ số La Mã.
 * @param {number} num - Số cần chuyển đổi.
 * @returns {string} - Chữ số La Mã.
 */
export function numberToRoman(num) {
    const roman = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
    let str = '';
    for (let i of Object.keys(roman)) {
        let q = Math.floor(num / roman[i]);
        num -= q * roman[i];
        str += i.repeat(q);
    }
    return str;
}

/**
 * Hiển thị số ngày còn lại của tài khoản.
 * @param {Date} validUntilDate - Ngày hết hạn.
 * @returns {string} - Chuỗi mô tả trạng thái (ví dụ: "Còn lại 5 ngày").
 */
export function formatRemainingDays(validUntilDate) {
    if (!validUntilDate) return 'Không xác định';
    const now = new Date();
    const expiry = new Date(validUntilDate);
    // Set hours to 0 to compare dates only
    now.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return 'Đã hết hạn';
    } else if (diffDays === 0) {
        return 'Hết hạn hôm nay';
    } else {
        return `Còn lại ${diffDays} ngày`;
    }
}

/**
 * Chuyển đổi số thành chữ tiếng Việt.
 * @param {number} n - Số cần chuyển.
 * @returns {string} - Dạng chữ của số.
 */
export function numberToWordsVi(n) {
    const defaultNumbers = ' hai ba bốn năm sáu bảy tám chín';
    const chuHangDonVi = (' không' + defaultNumbers).split(' ');
    const chuHangChuc = (' lẻ mười' + defaultNumbers).split(' ');
    const chuHangTram = (' không' + defaultNumbers).split(' ');

    function convert_block_three(number) {
        if (number == '000') return '';
        var _a = number + ''; // Convert a string
        switch (_a.length) {
            case 0: return '';
            case 1: return chuHangDonVi[_a];
            case 2: return convert_block_two(_a);
            case 3:
                var chuc_dv = '';
                if (_a.slice(1, 3) != '00') {
                    chuc_dv = convert_block_two(_a.slice(1, 3));
                }
                var tram = chuHangTram[_a[0]] + ' trăm';
                return tram + ' ' + chuc_dv;
        }
    }

    function convert_block_two(number) {
        var dv = chuHangDonVi[number[1]];
        var chuc = chuHangChuc[number[0]];
        var append = '';
        if (number[0] > 0 && number[1] == 5) {
            dv = 'lăm';
        }
        if (number[0] > 1) {
            append = ' mươi';
            if (number[1] == 1) {
                dv = ' mốt';
            }
        }
        return chuc + '' + append + ' ' + dv;
    }

    const dvBlock = '1 nghìn triệu tỷ'.split(' ');
    var str = parseInt(n) + '';
    var i = 0;
    var arr = [];
    var index = str.length;
    var result = [];
    var rsString = '';

    if (index == 0 || str == 'NaN') {
        return '';
    }

    while (index >= 0) {
        arr.push(str.substring(index, Math.max(index - 3, 0)));
        index -= 3;
    }

    for (i = arr.length - 1; i >= 0; i--) {
        if (arr[i] != '' && arr[i] != '000') {
            result.push(convert_block_three(arr[i]));
            if (dvBlock[i]) {
                result.push(dvBlock[i]);
            }
        }
    }
    rsString = result.join(' ');
    rsString = rsString.replace(/[0-9]/g, '').replace(/ /g, ' ').replace(/ $/g, '');
    return rsString.charAt(0).toUpperCase() + rsString.slice(1) + " đồng";
}