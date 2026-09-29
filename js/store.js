/**
 * Centralized Clinic Queue Store
 * Handles:
 * - Shared reactive queue state between Staff App and Patient Webpage
 * - Atomic sequential token allocation starting from #1 daily
 * - Real-time synchronization via BroadcastChannel & localStorage
 * - Web Audio API pleasant hospital announcement chime
 * - Sample realistic clinic data initialization
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.ClinicStore = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const STORAGE_KEY = 'apex_clinic_queue_v1';
  const CHANNEL_NAME = 'apex_clinic_sync_channel';
  let firebaseUnsubscribe = null;
  let firebaseLive = false;

  // Broadcast channel for real-time inter-tab/iframe sync
  let broadcastChannel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    }
  } catch (e) {
    console.warn('BroadcastChannel not supported:', e);
  }

  // Audio Context for Hospital Chime
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx && typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Play pleasant two-tone clinic chime
  function playClinicChime() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Tone 1 (High bell)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Tone 2 (Harmonic bell chime)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.2); // A5
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0.35, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.2);
      osc2.stop(now + 1.2);
    } catch (e) {
      console.warn('Audio chime failed:', e);
    }
  }

  // Speak token announcement (optional voice)
  function announceToken(tokenNum) {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(`Token number ${tokenNum}, please proceed to consultation.`);
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        // Fallback silently if speech blocked
      }
    }
  }

  // Format today as YYYY-MM-DD
  function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Format current time as HH:MM AM/PM
  function getCurrentTimeString() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // Initial realistic sample data
  function generateDefaultState() {
    const today = getTodayDateString();
    // Connect the existing store to the Firebase backend when available.
  function startFirebaseSync() {
    if (typeof FirebaseService === 'undefined' || !FirebaseService || !FirebaseService.subscribeToDailyQueue) return;
    try {
      if (typeof FirebaseConfig !== 'undefined' && FirebaseConfig.isReady()) {
        firebaseLive = true;
        if (firebaseUnsubscribe) firebaseUnsubscribe();
        firebaseUnsubscribe = FirebaseService.subscribeToDailyQueue(getTodayDateString(), (payload) => {
          state.date = payload.date || getTodayDateString();
          state.queue = payload.records || [];
          state.lastTokenNumber = state.queue.reduce((m, p) => Math.max(m, Number(p.tokenNumber) || 0), 0);
          notifySubscribers();
        });
      }
    } catch (e) {
      console.warn('Firebase queue sync unavailable; using local storage:', e);
      firebaseLive = false;
    }
  }

  startFirebaseSync();

  return {
      clinicName: "Jessi's Clinic",
      clinicDoctor: "Dr. Sarah Chen, MD",
      date: today,
      lastTokenNumber: 19,
      audioEnabled: true,
      voiceAnnounceEnabled: true,
      staffPin: "1234",
      doctorPin: "8888",
      customQrBaseUrl: "",
      currentRole: "staff", // "staff" or "doctor"
      currentUser: {
        name: "Nurse Maya",
        role: "CLINIC STAFF"
      },
      queue: [
        {
          id: "pat_sample_1",
          tokenNumber: 14,
          patientName: "Anil Sharma",
          mobileNumber: "9876543210",
          patientType: "Follow Up",
          consultationType: "General Consultation",
          registrationSource: "MANUAL",
          registrationTime: "09:15 AM",
          status: "COMPLETED",
          date: today
        },
        {
          id: "pat_sample_2",
          tokenNumber: 15,
          patientName: "Meera Nair",
          mobileNumber: "9812345678",
          patientType: "New Patient",
          consultationType: "Vaccination",
          registrationSource: "QR",
          registrationTime: "09:35 AM",
          status: "COMPLETED",
          date: today
        },
        {
          id: "pat_sample_3",
          tokenNumber: 16,
          patientName: "Sunil Verma",
          mobileNumber: "9723456789",
          patientType: "Follow Up",
          consultationType: "Follow-up",
          registrationSource: "MANUAL",
          registrationTime: "10:10 AM",
          status: "IN_CONSULTATION",
          date: today
        },
        {
          id: "pat_sample_4",
          tokenNumber: 17,
          patientName: "Rahul Kumar",
          mobileNumber: "9834567890",
          patientType: "Follow Up",
          consultationType: "General Consultation",
          registrationSource: "QR",
          registrationTime: "10:42 AM",
          status: "WAITING",
          date: today
        },
        {
          id: "pat_sample_5",
          tokenNumber: 18,
          patientName: "Priya Sharma",
          mobileNumber: "9945678901",
          patientType: "New Patient",
          consultationType: "General Consultation",
          registrationSource: "MANUAL",
          registrationTime: "10:55 AM",
          status: "WAITING",
          date: today
        },
        {
          id: "pat_sample_6",
          tokenNumber: 19,
          patientName: "Amit Patel",
          mobileNumber: "9856789012",
          patientType: "Follow Up",
          consultationType: "Health Checkup",
          registrationSource: "QR",
          registrationTime: "11:05 AM",
          status: "WAITING",
          date: today
        }
      ],
      history: []
    };
  }

  // Load state from localStorage or initialize
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const today = getTodayDateString();
        // If state is from previous day, archive past queue to history and start new day
        if (parsed.date !== today) {
          if (parsed.queue && parsed.queue.length > 0) {
            parsed.history = parsed.history || [];
            parsed.history.push({
              date: parsed.date,
              total: parsed.queue.length,
              completed: parsed.queue.filter(p => p.status === 'COMPLETED').length,
              records: parsed.queue
            });
          }
          parsed.date = today;
          parsed.lastTokenNumber = 0;
          parsed.queue = [];
          saveState(parsed, false);
        }
        parsed.staffPin = parsed.staffPin || "1234";
        parsed.doctorPin = parsed.doctorPin || "8888";
        if (parsed.customQrBaseUrl === undefined) parsed.customQrBaseUrl = "";
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load state from localStorage:', e);
    }
    const def = generateDefaultState();
    saveState(def, false);
    return def;
  }

  let state = loadState();
  const subscribers = new Set();

  function saveState(newState, broadcast = true) {
    state = newState;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }
    if (broadcast && broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: 'STATE_UPDATED', timestamp: Date.now() });
      } catch (e) {
        console.warn('Broadcast postMessage failed:', e);
      }
    }
    notifySubscribers();
  }

  function notifySubscribers() {
    subscribers.forEach(cb => {
      try {
        cb(state);
      } catch (err) {
        console.error('Subscriber error:', err);
      }
    });
  }

  // Listen for sync from other tabs / frames
  if (broadcastChannel) {
    broadcastChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'STATE_UPDATED') {
        state = loadState();
        notifySubscribers();
      }
    };
  }

  // Fallback to window storage events
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      state = loadState();
      notifySubscribers();
    }
  });

  return {
    // Subscribe to state changes
    subscribe: function (callback) {
      subscribers.add(callback);
      callback(state);
      return () => subscribers.delete(callback);
    },

    // Get current snapshot
    getState: function () {
      return state;
    },

    // Get Statistics 2x2
    getStats: function () {
      const q = state.queue || [];
      const total = q.length;
      const waiting = q.filter(p => p.status === 'WAITING').length;
      const consulting = q.filter(p => p.status === 'IN_CONSULTATION').length;
      const completed = q.filter(p => p.status === 'COMPLETED').length;
      const skipped = q.filter(p => p.status === 'SKIPPED').length;
      return { total, waiting, consulting, completed, skipped };
    },

    // Get Current Patient In Consultation
    getCurrentPatient: function () {
      const q = state.queue || [];
      return q.find(p => p.status === 'IN_CONSULTATION') || null;
    },

    // Get Next Patients in Queue (Waiting)
    getWaitingPatients: function () {
      const q = state.queue || [];
      return q.filter(p => p.status === 'WAITING');
    },

    // Register a patient (Atomic Sequential Token)
    registerPatient: function (params) {
      const cleanName = (params.patientName || '').trim();
      const cleanMobile = (params.mobileNumber || '').trim().replace(/\D/g, '');
      if (!cleanName) throw new Error('Patient name is required.');
      if (cleanMobile.length < 10) throw new Error('Please enter a valid 10-digit mobile number.');

      if (firebaseLive && typeof FirebaseService !== 'undefined') {
        return FirebaseService.registerPatient(params);
      }

      const patientType = params.patientType || 'New Patient';
      const consultationType = params.consultationType || 'General Consultation';
      const registrationSource = params.source === 'QR' ? 'QR' : 'MANUAL';
      const fresh = loadState();
      const nextToken = (fresh.lastTokenNumber || 0) + 1;
      const newPatient = {
        id: `pat_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        tokenNumber: nextToken, patientName: cleanName, mobileNumber: cleanMobile,
        patientType, consultationType, registrationSource,
        registrationTime: getCurrentTimeString(), status: 'WAITING', date: getTodayDateString()
      };
      fresh.lastTokenNumber = nextToken; fresh.queue.push(newPatient); saveState(fresh);
      return newPatient;
    },

    // Call Next Patient
    callNextPatient: function () {
      const fresh = loadState();
      const waiting = (fresh.queue || []).filter(p => p.status === 'WAITING').sort((a,b) => a.tokenNumber-b.tokenNumber);
      if (!waiting.length) return null;
      const nextP = waiting[0];
      if (firebaseLive && typeof FirebaseService !== 'undefined') {
        return FirebaseService.callPatient(nextP.id, getTodayDateString()).then(() => nextP);
      }
      fresh.queue.forEach(p => { if (p.status === 'IN_CONSULTATION') p.status = 'COMPLETED'; });
      nextP.status = 'IN_CONSULTATION'; saveState(fresh);
      return nextP;
    },

    callPatient: function (patientId) {
      if (firebaseLive && typeof FirebaseService !== 'undefined') {
        return FirebaseService.callPatient(patientId, getTodayDateString()).then(() => state.queue.find(p => p.id === patientId) || null);
      }
      const fresh = loadState(); const patient = fresh.queue.find(p => p.id === patientId); if (!patient) return null;
      fresh.queue.forEach(p => { if (p.status === 'IN_CONSULTATION' && p.id !== patientId) p.status = 'COMPLETED'; });
      patient.status='IN_CONSULTATION'; saveState(fresh); return patient;
    },

    completeConsultation: function (patientId) {
      const id = patientId || ((state.queue || []).find(p => p.status === 'IN_CONSULTATION') || {}).id;
      if (!id) return null;
      if (firebaseLive && typeof FirebaseService !== 'undefined') {
        return FirebaseService.completeConsultation(id, getTodayDateString()).then(() => state.queue.find(p => p.id === id) || null);
      }
      const fresh=loadState(); const target=fresh.queue.find(p=>p.id===id); if(target){target.status='COMPLETED';saveState(fresh);} return target;
    },

    skipPatient: function (patientId) {
      if (firebaseLive && typeof FirebaseService !== 'undefined') {
        return FirebaseService.skipPatient(patientId).then(() => state.queue.find(p => p.id === patientId) || null);
      }
      const fresh=loadState(); const target=fresh.queue.find(p=>p.id===patientId); if(target){target.status='SKIPPED';saveState(fresh);} return target;
    },

    requeuePatient: function (patientId) {
      if (firebaseLive && typeof FirebaseService !== 'undefined') {
        return FirebaseService.requeuePatient(patientId).then(() => state.queue.find(p => p.id === patientId) || null);
      }
      const fresh=loadState(); const target=fresh.queue.find(p=>p.id===patientId); if(target){target.status='WAITING';saveState(fresh);} return target;
    },

    // Verify Staff or Doctor PIN
    verifyPin: function (role, pin) {
      const fresh = loadState();
      const expected = role === 'doctor' ? (fresh.doctorPin || '8888') : (fresh.staffPin || '1234');
      return (pin || '').trim() === expected;
    },

    // Update Custom QR Base URL (for local Wi-Fi or custom domain)
    setCustomQrBaseUrl: function (url) {
      const fresh = loadState();
      fresh.customQrBaseUrl = (url || '').trim();
      saveState(fresh);
      return fresh.customQrBaseUrl;
    },

    // Reset Day Queue / Start Fresh Day
    resetDayQueue: function () {
      const fresh = loadState();
      if (fresh.queue.length > 0) {
        fresh.history = fresh.history || [];
        fresh.history.push({
          date: fresh.date,
          total: fresh.queue.length,
          completed: fresh.queue.filter(p => p.status === 'COMPLETED').length,
          records: [...fresh.queue]
        });
      }
      fresh.queue = [];
      fresh.lastTokenNumber = 0;
      saveState(fresh);
    },

    // Toggle Audio Chime
    toggleAudio: function () {
      const fresh = loadState();
      fresh.audioEnabled = !fresh.audioEnabled;
      saveState(fresh);
      return fresh.audioEnabled;
    },

    // Toggle Voice Announcement
    toggleVoice: function () {
      const fresh = loadState();
      fresh.voiceAnnounceEnabled = !fresh.voiceAnnounceEnabled;
      saveState(fresh);
      return fresh.voiceAnnounceEnabled;
    },

    // Switch Role between Staff and Doctor
    setRole: function (role) {
      const fresh = loadState();
      fresh.currentRole = role;
      if (role === 'doctor') {
        fresh.currentUser = { name: "Dr. Sarah Chen", role: "DOCTOR" };
      } else {
        fresh.currentUser = { name: "Nurse Maya", role: "CLINIC STAFF" };
      }
      saveState(fresh);
    },

    // Play chime manually
    playChime: playClinicChime,

    // Find Patient by token number or ID
    findPatient: function (identifier) {
      const q = state.queue || [];
      return q.find(p => p.id === identifier || p.tokenNumber === Number(identifier));
    }
  };
}));
