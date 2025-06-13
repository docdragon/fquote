/**
 * @file dom.js
 * @description Tập trung tất cả các truy vấn DOM của ứng dụng.
 */

// === GENERAL APP & UI ===
export const loader = document.getElementById('loader');
export const appContainer = document.getElementById('app-container');

// === AUTHENTICATION ===
export const authModal = document.getElementById('auth-modal');
export const authStatusEl = document.getElementById('auth-status');
export const logoutButton = document.getElementById('logoutButton');
export const loginForm = document.getElementById('login-form');
export const signupForm = document.getElementById('signup-form');
export const loginErrorEl = document.getElementById('login-error');
export const signupErrorEl = document.getElementById('signup-error');
export const showSignupLink = document.getElementById('show-signup');
export const showLoginLink = document.getElementById('show-login');
export const forgotPasswordLink = document.getElementById('forgot-password-link');


// === TABS ===
export const tabButtons = document.querySelectorAll('.tab-button');
export const tabContents = document.querySelectorAll('.tab-content');

// === QUOTE INFO ===
export const customerNameInput = document.getElementById('customerName');
export const customerAddressInput = document.getElementById('customerAddress');
export const quoteDateInput = document.getElementById('quoteDate');

// === QUOTE ITEM ENTRY FORM ===
export const quoteItemEntryFormDiv = document.getElementById('quoteItemEntryForm');
export const editingQuoteItemIdInputForm = document.getElementById('editingQuoteItemIdForm');
export const quoteItemMainCategoryInput = document.getElementById('quoteItemMainCategoryInput');
export const mainCategoryDataList = document.getElementById('mainCategoryDataList');
export const catalogItemCombobox = document.getElementById('catalogItemCombobox');
export const catalogDatalist = document.getElementById('catalogDatalist');
export const itemNameQuoteForm = document.getElementById('itemNameQuoteForm');
export const itemSpecQuoteForm = document.getElementById('itemSpecQuoteForm');
export const itemUnitQuoteForm = document.getElementById('itemUnitQuoteForm');
export const itemPriceQuoteForm = document.getElementById('itemPriceQuoteForm');
export const itemDiscountValueForm = document.getElementById('itemDiscountValueForm');
export const itemDiscountTypeForm = document.getElementById('itemDiscountTypeForm');
export const itemCalcTypeQuoteForm = document.getElementById('itemCalcTypeQuoteForm');
export const itemLengthQuoteForm = document.getElementById('itemLengthQuoteForm');
export const itemHeightQuoteForm = document.getElementById('itemHeightQuoteForm');
export const itemDepthQuoteForm = document.getElementById('itemDepthQuoteForm');
export const itemQuantityQuoteForm = document.getElementById('itemQuantityQuoteForm');
export const itemImageFileQuoteForm = document.getElementById('itemImageFileQuoteForm');
export const itemImagePreviewQuoteForm = document.getElementById('itemImagePreviewQuoteForm');
export const addOrUpdateItemButtonForm = document.getElementById('addOrUpdateItemButtonForm');
export const quickSaveToCatalogButtonForm = document.getElementById('quickSaveToCatalogButtonForm');
export const cancelEditQuoteItemButtonForm = document.getElementById('cancelEditQuoteItemButtonForm');

// === QUOTE PREVIEW & TOTALS ===
export const itemListPreviewTableBody = document.getElementById('itemListPreview');
export const prepareNewQuoteItemButton = document.getElementById('prepareNewQuoteItemButton');
export const subTotalSpan = document.getElementById('subTotal');
export const applyDiscountCheckbox = document.getElementById('applyDiscountCheckbox');
export const discountValueInput = document.getElementById('discountValueInput'); 
export const discountTypeSelect = document.getElementById('discountTypeSelect');
export const discountAmountSpan = document.getElementById('discountAmount');
export const applyTaxCheckbox = document.getElementById('applyTaxCheckbox');
export const taxPercentInput = document.getElementById('taxPercent');
export const taxAmountSpan = document.getElementById('taxAmount');
export const totalPriceSpan = document.getElementById('totalPrice');

// === INSTALLMENTS SECTION ===
export const applyInstallmentsCheckbox = document.getElementById('applyInstallmentsCheckbox');
export const installmentsContainer = document.getElementById('installmentsContainer');
export const addInstallmentButton = document.getElementById('add-installment-button');
export const installmentsListContainer = document.getElementById('installments-list');
export const installmentsSummaryDiv = document.getElementById('installments-summary');

// === MAIN ACTION BUTTONS ===
export const saveCurrentQuoteButton = document.getElementById('saveCurrentQuoteButton');
export const exportPdfButton = document.getElementById('exportPdfButton');
export const printQuoteButton = document.getElementById('printQuoteButton');
export const clearQuoteButton = document.getElementById('clearQuoteButton');

// === SAVED QUOTES TAB ===
export const savedQuotesSearchInput = document.getElementById('savedQuotesSearchInput');
export const savedQuotesTableBody = document.getElementById('savedQuotesList');
export const loadMoreQuotesButton = document.getElementById('loadMoreQuotesButton');

// === CATALOG MANAGEMENT TAB ===
export const excelFileInputManage = document.getElementById('excelFileManage');
export const reloadExcelButton = document.getElementById('reloadExcelButton');
export const catalogSearchInput = document.getElementById('catalogSearchInput');
export const catalogPreviewList = document.getElementById('catalogPreviewList');
export const catalogItemCount = document.getElementById('catalogItemCount');
export const exportCatalogButton = document.getElementById('exportCatalogButton');
export const catalogPreviewTable = document.getElementById('catalogPreviewTable'); 

// === CATALOG ENTRY EDIT FORM ===
export const editingCatalogEntryIdInput = document.getElementById('editingCatalogEntryId');
export const catalogItemMainCategorySelect = document.getElementById('catalogItemMainCategorySelect');
export const catalogEditNameInput = document.getElementById('catalogEditName');
export const catalogEditSpecInput = document.getElementById('catalogEditSpec');
export const catalogEditUnitInput = document.getElementById('catalogEditUnit');
export const catalogEditPriceInput = document.getElementById('catalogEditPrice');
export const saveCatalogEntryButton = document.getElementById('saveCatalogEntryButton');
export const cancelCatalogEntryEditButton = document.getElementById('cancelCatalogEntryEditButton');

// === MAIN CATEGORY MANAGEMENT ===
export const mainCategoryNameInput = document.getElementById('mainCategoryNameInput');
export const editingMainCategoryIdInput = document.getElementById('editingMainCategoryId');
export const addOrUpdateMainCategoryButton = document.getElementById('addOrUpdateMainCategoryButton');
export const cancelEditMainCategoryButton = document.getElementById('cancelEditMainCategoryButton');
export const mainCategoriesTableBody = document.getElementById('mainCategoriesList');
export const mainCategoryCountSpan = document.getElementById('mainCategoryCount');

// === COMPANY SETTINGS TAB ===
export const companyNameSettingInput = document.getElementById('companyNameSetting');
export const companyAddressSettingInput = document.getElementById('companyAddressSetting');
export const companyPhoneSettingInput = document.getElementById('companyPhoneSetting');
export const companyEmailSettingInput = document.getElementById('companyEmailSetting');
export const companyTaxIdSettingInput = document.getElementById('companyTaxIdSetting');
export const companyBankAccountSetting = document.getElementById('companyBankAccountSetting');
export const companyLogoFileInput = document.getElementById('companyLogoFile');
export const logoPreview = document.getElementById('logoPreview');
export const saveCompanySettingsButton = document.getElementById('saveCompanySettingsButton');
export const defaultNotesSettingInput = document.getElementById('defaultNotesSetting');

// Tùy chỉnh In ấn
export const printTitleSettingInput = document.getElementById('printTitleSetting');
export const printCreatorNameSettingInput = document.getElementById('printCreatorNameSetting'); // THÊM MỚI
export const hideSttColumnCheckbox = document.getElementById('hideSttColumn');
export const hideImageColumnCheckbox = document.getElementById('hideImageColumn');
export const hideMeasureColumnCheckbox = document.getElementById('hideMeasureColumn');
export const printFooterSettingInput = document.getElementById('printFooterSetting');

// === PRINTABLE AREA ELEMENTS ===
export const printableQuoteArea = document.getElementById('printableQuoteArea');
export const printableLogo = document.getElementById('printableLogo');
export const printableCompanyName = document.getElementById('printableCompanyName');
export const printableCompanyAddress = document.getElementById('printableCompanyAddress');
export const printableCompanyPhone = document.getElementById('printableCompanyPhone');
export const printableCompanyEmail = document.getElementById('printableCompanyEmail');
export const printableCompanyTaxId = document.getElementById('printableCompanyTaxId');
export const printQuoteDate = document.getElementById('printQuoteDate');
export const printQuoteIdEl = document.getElementById('printQuoteIdEl');
export const printCustomerName = document.getElementById('printCustomerName');
export const printCustomerAddress = document.getElementById('printCustomerAddress');
export const printItemList = document.getElementById('printItemList');
export const printCreatorNameEl = document.getElementById('printCreatorNameEl'); // THÊM MỚI
export const printSubTotal = document.getElementById('printSubTotal');
export const printSubTotalLine = document.getElementById('printSubTotalLine');
export const printDiscountAmount = document.getElementById('printDiscountAmount');
export const printDiscountLine = document.getElementById('printDiscountLine');
export const printSubTotalAfterDiscount = document.getElementById('printSubTotalAfterDiscount');
export const printSubTotalAfterDiscountLine = document.getElementById('printSubTotalAfterDiscountLine');
export const printTaxPercent = document.getElementById('printTaxPercent');
export const printTaxAmount = document.getElementById('printTaxAmount');
export const printTaxLine = document.getElementById('printTaxLine');
export const printTotalPrice = document.getElementById('printTotalPrice');
export const printTotalInWords = document.getElementById('printTotalInWords');
export const printQuoteNotes = document.getElementById('printQuoteNotes');
export const paymentInfoPrint = document.getElementById('paymentInfoPrint');
export const paymentInfoBodyPrint = document.getElementById('paymentInfoBodyPrint');
export const paymentSchedulePrint = document.getElementById('paymentSchedulePrint');
export const paymentScheduleBodyPrint = document.getElementById('paymentScheduleBodyPrint');

// === ADMIN TAB ===
export const adminSearchUserIdInput = document.getElementById('admin-search-user-id');
export const adminFetchUserButton = document.getElementById('admin-fetch-user-button');
export const adminUserDetailsContainer = document.getElementById('admin-user-details-container');
export const adminUserDetailsDiv = document.getElementById('admin-user-details');
export const adminTargetUserIdInput = document.getElementById('admin-target-user-id');
export const adminNewExpiryDateInput = document.getElementById('admin-new-expiry-date');
export const adminUpdateExpiryButton = document.getElementById('admin-update-expiry-button');
export const adminUpdateStatusP = document.getElementById('admin-update-status');