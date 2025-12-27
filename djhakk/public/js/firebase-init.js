// ========================================
// DJHAKK Firebase Initialization
// ========================================

const firebaseConfig = {
    apiKey: "AIzaSyBKj-PY2vvHC_VzxUdO2urbClDjuKuslhc",
    authDomain: "djhakk-app.firebaseapp.com",
    projectId: "djhakk-app",
    storageBucket: "djhakk-app.firebasestorage.app",
    messagingSenderId: "1084468016344",
    appId: "1:1084468016344:web:32a5bf22439912ac2b53ad",
    measurementId: "G-72CS9X84GN"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
