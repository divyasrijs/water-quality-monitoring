// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDkwTChFAEpfqai8jSBZLtPr-cwuMkze-U",
  authDomain: "water-monitor-b87e5.firebaseapp.com",
  databaseURL: "https://water-monitor-b87e5-default-rtdb.firebaseio.com",
  projectId: "water-monitor-b87e5",
  storageBucket: "water-monitor-b87e5.firebasestorage.app",
  messagingSenderId: "425782313245",
  appId: "1:425782313245:web:c87bfa87211f23f014e1f4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);