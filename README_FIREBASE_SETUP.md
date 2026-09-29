# Firebase setup for Clinic Queue App

The project is configured for Firebase project `clinic-queue-system-cd6d8` and Firestore in `asia-south1` (Mumbai).

## Firebase services used
- Email/Password Authentication for clinic staff/doctor
- Cloud Firestore
- Public QR patient registration
- Real-time queue listener

## Existing clinic login
Use the Email/Password account created in Firebase Authentication. Do not use the old demo PIN login.

## Important
- `js/firebase-config.js` contains the Firebase Web SDK configuration. Firebase Web config values are not service-account secrets.
- Never put a Firebase service-account JSON file, private key, or password into the web project.
- Firestore rules are in `firestore.rules`.

## Public patient flow
`patient.html` is intentionally public and does not require authentication.

## Staff flow
`staff.html` requires Firebase Authentication.

## Run locally
Because the app uses ES-style browser SDK resources and Firebase, serve the folder through a local HTTP server rather than opening files directly with `file://`.

For example with Python:

```bash
python -m http.server 5500
```

Then open:
- Staff app: `http://localhost:5500/staff.html`
- Patient page: `http://localhost:5500/patient.html`

For a real phone/QR demonstration, deploy the project to Firebase Hosting or another HTTPS host and use that public patient URL in the QR code.
