// Firebase の設定
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase プロジェクトの設定
const firebaseConfig = {
  apiKey: "AIzaSyBmGUhnlDf1XkxamAEVVBzOkgYNcsDdkaE",
  authDomain: "kakeibo-two.firebaseapp.com",
  projectId: "kakeibo-two",
  storageBucket: "kakeibo-two.firebasestorage.app",
  messagingSenderId: "121189042664",
  appId: "1:121189042664:web:80a60f72735b70d614bc5d",
  measurementId: "G-XD1SDMQ7ZN"
};

// Firebase の初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
