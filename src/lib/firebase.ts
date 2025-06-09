import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCvoKcCLr5IqAujT2cIvsRAfy4Dkvh9azo",
    authDomain: "pi20251.firebaseapp.com",
    projectId: "pi20251",
    storageBucket: "pi20251.appspot.com",
    messagingSenderId: "652437593102",
    appId: "1:652437593102:web:ec10d188783f4af0ddf05f",
    measurementId: "G-2W1HSKJY1F"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const storage = getStorage(app);


