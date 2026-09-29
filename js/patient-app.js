(function(root){
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));

  let el = null;
  let registeredId = sessionStorage.getItem('patient_queue_id') || null;
  let registeredToken = sessionStorage.getItem('patient_queue_token') || null;
  let error = '';

  function init(target){
    el = target;

    // Only re-render automatically after a patient has registered.
    // This prevents the registration form from disappearing while the
    // patient is typing.
    ClinicData.subscribe(() => {
      if (registeredId) {
        render();
      }
    });

    // Refresh the live ticket every 15 seconds after registration.
    setInterval(() => {
      if (el && registeredId) {
        render();
      }
    }, 15000);

    render();
  }

  function find(){
    return (ClinicData.getState().queue || [])
      .find(p => p.id === registeredId) || null;
  }

  function slotOptions(){
    return ClinicData.getTimeSlots()
      .map(x => `<option value="${esc(x.slot)}">${esc(x.slot)}</option>`)
      .join('');
  }

  function form(){
    return `
      <main class="patient-page">

        <div class="patient-hero">
          <div class="patient-logo">🏥</div>
          <h1>Jessi's Clinic</h1>
          <p>Digital Queue Registration</p>
        </div>

        <form class="card form" onsubmit="PatientApp.submit(event)">

          <h2>Register for Consultation</h2>

          <p class="muted">
            No app or account required.
          </p>

          ${error ? `<div class="error">${esc(error)}</div>` : ''}

          <label>
            Patient Name
            <input
              id="pName"
              required
              placeholder="Full name"
            >
          </label>

          <label>
            Age
            <input
              id="pAge"
              type="text"
              inputmode="numeric"
              pattern="[0-9]{1,3}"
              maxlength="3"
              required
              placeholder="Enter age"
              oninput="this.value=this.value.replace(/[^0-9]/g,'')"
            >
          </label>

          <label>
            Mobile Number
            <input
              id="pMobile"
              required
              inputmode="numeric"
              maxlength="10"
              pattern="[0-9]{10}"
              placeholder="10-digit mobile number"
            >
          </label>

          <label>
            Gender
            <select id="pGender" required>
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <fieldset>
            <legend>Patient Type</legend>

            <div class="choices">

              <label>
                <input
                  type="radio"
                  name="pType"
                  value="New Patient"
                  checked
                >
                New
              </label>

              <label>
                <input
                  type="radio"
                  name="pType"
                  value="Follow Up"
                >
                Follow Up
              </label>

            </div>
          </fieldset>

          <label>
            Consultation Type

            <select id="pConsult">
              <option>General Consultation</option>
              <option>Follow-up</option>
              <option>Vaccination</option>
              <option>Health Checkup</option>
            </select>
          </label>

          <label>
            Time Slot

            <select id="pSlot" required>

              <option value="">
                Select an available time slot
              </option>

              ${slotOptions()}

            </select>
          </label>

          <p class="slot-note">
            Doctor available: 10:00 AM–1:00 PM and 5:00 PM–10:00 PM.
          </p>

          <button class="primary wide" type="submit">
            Get My Token
          </button>

          <p class="hint center">
            Your registration joins the clinic's shared live queue.
          </p>

        </form>

      </main>
    `;
  }

  function ticket(p){

    const q = ClinicData.getState().queue || [];

    const current = ClinicData.current();

    const ahead =
      p.status === 'WAITING'
        ? q.filter(
            x =>
              x.status === 'WAITING' &&
              x.tokenNumber < p.tokenNumber
          ).length
        : 0;

    const message =
      p.status === 'IN_CONSULTATION'
        ? 'It’s your turn. Please proceed to the consultation room.'
        : p.status === 'COMPLETED'
        ? 'Consultation completed.'
        : p.status === 'SKIPPED'
        ? 'Please contact reception.'
        : 'Please wait for your turn.';

    return `
      <main class="patient-page">

        <div class="patient-hero compact">

          <div class="patient-logo">🏥</div>

          <h1>Jessi's Clinic</h1>

          <p>Live Queue Status</p>

        </div>

        <div class="ticket card">

          <span class="pill ${p.status
            .toLowerCase()
            .replace('_','-')}">
            ${p.status.replace('_',' ')}
          </span>

          <p class="muted">
            Your Token Number
          </p>

          <div class="ticket-number">
            #${p.tokenNumber}
          </div>

          <h2>
            ${esc(p.patientName)}
          </h2>

          <p>
            ${esc(p.consultationType)}
          </p>

          <div class="metrics">

            <div>
              <span>Currently Serving</span>
              <b>
                ${current ? '#' + current.tokenNumber : '—'}
              </b>
            </div>

            <div>
              <span>Patients Ahead</span>
              <b>
                ${p.status === 'WAITING' ? ahead : '—'}
              </b>
            </div>

          </div>

          <div class="notice">
            ${message}
          </div>

          <p class="live-note">
            ● Live queue updates
          </p>

          <button
            class="secondary wide"
            type="button"
            onclick="PatientApp.newRegistration()"
          >
            Register Another Patient
          </button>

        </div>

      </main>
    `;
  }

  function render(){

    if (!el) {
      return;
    }

    const p = find();

    el.innerHTML = p
      ? ticket(p)
      : form();
  }

  root.PatientApp = {

    init,

    render,

    submit: async e => {

      e.preventDefault();

      error = '';

      try {

        const nameEl = document.getElementById('pName');
        const ageEl = document.getElementById('pAge');
        const mobileEl = document.getElementById('pMobile');
        const genderEl = document.getElementById('pGender');
        const typeEl = document.querySelector(
          'input[name=pType]:checked'
        );
        const consultEl = document.getElementById('pConsult');
        const slotEl = document.getElementById('pSlot');

        const p = await ClinicData.register({

          patientName: nameEl.value.trim(),

          age: ageEl.value.trim(),

          mobileNumber: mobileEl.value.trim(),

          gender: genderEl.value,

          patientType: typeEl
            ? typeEl.value
            : 'New Patient',

          consultationType: consultEl.value,

          timeSlot: slotEl.value,

          source: 'QR'

        });

        registeredId = p.id;

        registeredToken = p.tokenNumber;

        sessionStorage.setItem(
          'patient_queue_id',
          p.id
        );

        sessionStorage.setItem(
          'patient_queue_token',
          p.tokenNumber
        );

        render();

      } catch (err) {

        console.error(
          'Patient registration error:',
          err
        );

        error =
          err && err.message
            ? err.message
            : 'Registration failed. Please try again.';

        render();
      }
    },

    newRegistration: () => {

      registeredId = null;

      registeredToken = null;

      error = '';

      sessionStorage.removeItem(
        'patient_queue_id'
      );

      sessionStorage.removeItem(
        'patient_queue_token'
      );

      render();
    }
  };

})(window);