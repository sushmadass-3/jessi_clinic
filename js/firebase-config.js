/**
 * Firebase configuration for Clinic Queue App.
 * Firebase Authentication + Realtime Database.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.FirebaseConfig = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const firebaseConfig = {
    apiKey: "AIzaSyBp4L9mhFwkz9ggb7VDs1Uw0D8VVbOacgk",
    authDomain: "clinic-queue-system-cd6d8.firebaseapp.com",
    databaseURL: "https://clinic-queue-system-cd6d8-default-rtdb.firebaseio.com",
    projectId: "clinic-queue-system-cd6d8",
    storageBucket: "clinic-queue-system-cd6d8.firebasestorage.app",
    messagingSenderId: "657425272932",
    appId: "1:657425272932:web:6874ff4e34549d9376cf71",
    measurementId: "G-RJX812B5WP"
  };

  let isFirebaseReady = false;
  let firebaseApp = null;
  let authInstance = null;
  let databaseInstance = null;

  function initFirebase() {
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK is not loaded.');
      return false;
    }

    try {
      firebaseApp = firebase.apps.length
        ? firebase.app()
        : firebase.initializeApp(firebaseConfig);

      authInstance = firebase.auth();
      databaseInstance = firebase.database();

      isFirebaseReady = true;

      console.log('Firebase initialized successfully.');
      console.log('Project:', firebaseConfig.projectId);
      console.log('Database:', firebaseConfig.databaseURL);

      return true;

    } catch (err) {
      console.error('Firebase initialization failed:', err);
      isFirebaseReady = false;
      return false;
    }
  }

  initFirebase();

  return {
    getConfig: () => ({ ...firebaseConfig }),
    setConfig: () => initFirebase(),
    isReady: () => isFirebaseReady,
    getApp: () => firebaseApp,
    getAuth: () => authInstance,
    getDatabase: () => databaseInstance
  };

}));