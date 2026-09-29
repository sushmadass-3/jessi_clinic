# Clinic Queue Management System
### Mobile-First | Clinic Staff App + Patient QR Registration

A mobile-first queue management system for small independent clinics.  
No patient accounts. No patient app. Patients scan a QR code, register, and get a token.

---

## Quick Start (Local — No Build Step Required)

This is a **pure static HTML/JS/CSS project**. No Node.js, no npm, no bundler.

### Option 1: Open directly in browser
```
Open index.html in any modern browser (Chrome recommended)
```

### Option 2: Serve locally (recommended for QR scanning)
```bash
# Python 3
python -m http.server 8080

# Then open: http://localhost:8080
# For QR scanning on mobile: http://<your-local-IP>:8080
```

### Option 3: VS Code Live Server
Install the **Live Server** extension in VS Code, right-click `index.html` → **Open with Live Server**.

---

## Demo Login Credentials

| Role | PIN | Demo Email (Firebase — future) |
|------|-----|-------------------------------|
| Clinic Staff | `1234` | `staff@apexclinic.com` |
| Doctor | `8888` | `doctor@apexclinic.com` |

> **Note:** Authentication is currently PIN-based (stored in sessionStorage). Firebase Auth is prepared but not yet integrated.

---

## Project Structure

```
clinic-queue-mobile/
├── index.html              ← Simulator / demo preview (open this first)
├── staff.html              ← Clinic staff & doctor mobile app
├── patient.html            ← Patient QR registration page
├── css/
│   └── styles.css          ← All app styles (mobile-first)
├── js/
│   ├── store.js            ← Core state management (localStorage + BroadcastChannel)
│   ├── staff-app.js        ← Staff/Doctor app UI and logic
│   ├── patient-app.js      ← Patient registration form + live ticket
│   ├── qr-generator.js     ← QR code SVG generator (no external lib)
│   ├── firebase-config.js  ← Firebase init scaffold (NOT YET CONNECTED)
│   └── firebase-service.js ← Firestore CRUD + Auth service (NOT YET CONNECTED)
├── firestore.rules         ← Firestore security rules (deploy when Firebase is integrated)
├── .env.example            ← Firebase config template (copy → .env, fill in values)
└── README.md               ← This file
```

---

## Current Routes / Pages

| URL | Description |
|-----|-------------|
| `index.html` | Interactive simulator with side-by-side staff + patient preview |
| `staff.html` | Full clinic staff/doctor mobile app |
| `patient.html` | Patient QR registration + live token ticket |

### Staff App Screens (navigated via `StaffApp.navigateTo()`)
| Screen | Description |
|--------|-------------|
| `login` | 4-digit PIN login with role selection (Staff / Doctor) |
| `home` | Dashboard: today's queue summary, quick actions |
| `queue` | Live queue list, call/complete/skip patients |
| `register` | Manual patient registration form |
| `qr` | QR code display for patients to scan |
| `doctor` | Doctor view: current patient, call next, complete |
| `settings` | Clinic name, doctor name, PIN change, Wi-Fi QR URL |

---

## Currently Implemented Features

### ✅ Working
- **Mobile-first UI** — Staff app, patient registration, simulator preview
- **PIN authentication** — 4-digit PIN for staff (1234) and doctor (8888), sessionStorage-based
- **Shared queue** — QR and manual registrations go to the same queue
- **Token numbering** — Auto-incrementing sequential tokens, resets daily
- **Queue management** — Call next, call specific patient, complete, skip
- **Skipped patient recovery** — Re-queue in line or call now
- **Doctor view** — Current patient display, call next, complete consultation
- **QR code generation** — SVG-based, no external library, displays `patient.html` URL
- **Custom Wi-Fi QR URL** — Staff can set local IP for LAN-based QR scanning
- **Patient live ticket** — Patient page polls queue, shows real-time token status
- **Patient alert** — Vibration + chime + speech synthesis when patient is called
- **Inline form validation** — No alert() popups; inline error banners
- **Real-time cross-tab sync** — BroadcastChannel + localStorage storage events
- **Daily queue reset** — Automatic on date change at load time
- **Settings** — Clinic name, doctor name, audio toggle, voice announce toggle

### ⚠️ Partially Working
- **Firebase config/service files** — Files exist (`firebase-config.js`, `firebase-service.js`) but are **NOT connected** to any HTML file or `store.js`. Firebase CDN scripts are not loaded. These are ready-to-integrate stubs.
- **Patient live ticket polling** — Works via localStorage but has ~1s polling delay; needs Firestore real-time for instant updates

### ❌ Not Implemented
- **Firebase Authentication** — Stub exists; actual Firebase Auth login not wired up
- **Firestore persistence** — Stub exists; all data is still localStorage only (lost on browser clear)
- **Cloud real-time sync** — Multiple devices cannot share the same queue yet (requires Firestore)
- **Push notifications** — Patient called alert only works if patient tab is open
- **Patient history / analytics** — No reporting features
- **Multi-clinic support** — Single-clinic only

---

## Firebase Integration — Next Steps

Firebase files are prepared but NOT yet active. To integrate:

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Email/Password sign-in
4. Enable **Firestore Database** → Start in production mode
5. Copy your web app config values

### Step 2: Configure the App
Edit `js/firebase-config.js` and replace the placeholder config:
```js
FirebaseConfig.setConfig({
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
});
```

### Step 3: Add Firebase CDN to HTML Files
Add these `<script>` tags to `staff.html` and `patient.html` **before** other scripts:
```html
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
<script src="js/firebase-config.js"></script>
<script src="js/firebase-service.js"></script>
```

### Step 4: Deploy Firestore Security Rules
```bash
# Install Firebase CLI
npm install -g firebase-tools
firebase login
firebase init firestore
firebase deploy --only firestore:rules
```

### Step 5: Wire Firebase Service into store.js
Replace `ClinicStore.registerPatient()` writes with `FirebaseService.registerPatient()`  
Replace `ClinicStore.subscribe()` reads with `FirebaseService.subscribeToDailyQueue()`  
Replace PIN auth with `FirebaseService.loginStaff()` using Firebase Auth

---

## Firestore Data Structure (Planned)

```
/patients/{patientId}
/queueRecords/{recordId}
  - id
  - tokenNumber
  - patientName
  - mobileNumber
  - patientType
  - consultationType
  - registrationSource   ("QR" | "MANUAL")
  - registrationTime
  - status               ("WAITING" | "IN_CONSULTATION" | "COMPLETED" | "SKIPPED")
  - queueDate
/users/{userId}
/dailyQueues/{YYYY-MM-DD}
```

---

## Current Backend / Data Storage

| Layer | Status | Details |
|-------|--------|---------|
| localStorage | ✅ Active | Key: `apex_clinic_queue_v1`. All queue data stored here |
| BroadcastChannel | ✅ Active | Cross-tab real-time sync on same device/browser |
| Firebase Auth | ❌ Not integrated | Stub ready in `firebase-config.js` |
| Firestore | ❌ Not integrated | Stub ready in `firebase-service.js` |

---

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome (mobile + desktop) | ✅ Full |
| Safari (iOS) | ✅ Most features (vibration API limited on iOS) |
| Firefox | ✅ Full |
| Edge | ✅ Full |

> Vibration API (`navigator.vibrate`) is not supported on iOS Safari — patient alert falls back to chime + speech.

---

## Known Issues / Bugs

1. **Multi-device**: Queue is not shared across devices without Firebase integration
2. **Patient tab must be open**: Patient receives alert only if `patient.html` is open in browser
3. **PIN stored in localStorage**: Staff PIN (`staffPin`, `doctorPin`) stored unencrypted in localStorage — replace with Firebase Auth for production
4. **QR URL on localhost**: QR code points to `localhost` by default; staff must configure custom IP in Settings for mobile scanning on LAN

---

## Development Notes

- No build step, no transpilation — edit files directly
- All JS uses UMD pattern (works as browser globals, no `import`/`require`)
- `ClinicStore` in `store.js` is the single source of truth
- All UI components subscribe via `ClinicStore.subscribe(callback)`
- State shape is defined in `store.js` → `getDefaultState()`
