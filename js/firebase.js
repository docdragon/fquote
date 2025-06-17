/**
 * @file firebase.js
 * @description Khởi tạo và cấu hình Firebase, xuất các service cần thiết.
 */

const firebaseConfig = {
  apiKey: "AIzaSyCfu18ZUpTeB_GTRItHvXgCWKmAtBNkjgc",
  authDomain: "quote-5e207.firebaseapp.com",
  projectId: "quote-5e207",
  storageBucket: "quote-5e207.appspot.com",
  messagingSenderId: "705040561307",
  appId: "1:705040561307:web:4204634087c57db9d9023e",
  measurementId: "G-PK86VZZ2F4"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);

// [PHẦN CẦN THAY THẾ]
// Xuất các service của Firebase để sử dụng trong các module khác
const auth = firebase.auth();
const db = firebase.firestore();

export { db, auth }; // Quay về phiên bản cũ
// [HẾT PHẦN THAY THẾ]
