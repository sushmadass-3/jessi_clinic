(function(root){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));

  let el=null;
  let screen='login';
  let loginError='';
  let modal=null;
  let authUnsub=null;
  let rescheduleId=null;

  const role=()=>ClinicData.getState().role;

  function init(target){
    el=target;

    try{
      authUnsub=ClinicData.onAuth(user=>{
        if(user){
          screen=role()==='doctor'
            ? 'doctorDashboard'
            : 'home';
        }else{
          screen='login';
        }

        render();
      });
    }catch(e){
      console.warn(e);
    }

    ClinicData.subscribe(()=>{
      if(screen!=='login'){
        render();
      }
    });

    setInterval(()=>{
      if(el && screen!=='login'){
        render();
      }
    },15000);

    render();
  }

  function nav(s){

    if(
      role() !== 'doctor' &&
      (
        s === 'doctorDashboard' ||
        s === 'doctor'
      )
    ){
      s='home';
    }

    screen=s;
    loginError='';
    modal=null;

    render();
  }

  function header(s){
    return `
      <header class="app-header">

        <div class="brand">

          <div class="brand-icon">
            🏥
          </div>

          <div>

            <strong>
              ${esc(s.clinicName)}
            </strong>

            <span>
              ${
                role()==='doctor'
                  ? 'Doctor View'
                  : esc(s.userName)
              }
            </span>

          </div>

        </div>

        <button
          class="icon-btn"
          onclick="StaffApp.nav('qr')"
        >
          ▦
        </button>

      </header>
    `;
  }

  function bottom(){

    const r=role();
    const active=x=>screen===x?'active':'';

    if(r==='doctor'){

      return `
        <nav class="bottom-nav">

          <button
            class="${active('doctorDashboard')}"
            onclick="StaffApp.nav('doctorDashboard')"
          >
            ⌂
            <span>Dashboard</span>
          </button>

          <button
            class="${active('queue')}"
            onclick="StaffApp.nav('queue')"
          >
            ☷
            <span>Queue</span>
          </button>

          <button
            class="${active('doctor')}"
            onclick="StaffApp.nav('doctor')"
          >
            ⚕
            <span>Doctor</span>
          </button>

          <button
            class="${active('more')}"
            onclick="StaffApp.nav('more')"
          >
            ⋯
            <span>More</span>
          </button>

        </nav>
      `;
    }

    return `
      <nav class="bottom-nav">

        <button
          class="${active('home')}"
          onclick="StaffApp.nav('home')"
        >
          ⌂
          <span>Home</span>
        </button>

        <button
          class="${active('queue')}"
          onclick="StaffApp.nav('queue')"
        >
          ☷
          <span>Queue</span>
        </button>

        <button
          class="${active('register')}"
          onclick="StaffApp.nav('register')"
        >
          ＋
          <span>Register</span>
        </button>

        <button
          class="${active('more')}"
          onclick="StaffApp.nav('more')"
        >
          ⋯
          <span>More</span>
        </button>

      </nav>
    `;
  }

  function login(){

    return `
      <main class="login-screen">

        <div class="login-logo">
          🏥
        </div>

        <h1>
          Jessi's Clinic
        </h1>

        <p class="muted">
          Clinic Staff & Doctor App
        </p>

        <form
          class="card form"
          onsubmit="StaffApp.login(event)"
        >

          <label>
            Email

            <input
              id="loginEmail"
              type="email"
              placeholder="clinicadmin@gmail.com"
              required
            >
          </label>

          <label>
            Password

            <input
              id="loginPassword"
              type="password"
              placeholder="Enter password"
              required
            >
          </label>

          ${
            loginError
              ? `<div class="error">${esc(loginError)}</div>`
              : ''
          }

          <button class="primary wide">
            Sign in
          </button>

          <p class="hint">
            Use the Email/Password account created in Firebase Authentication.
          </p>

        </form>

      </main>
    `;
  }

  function stats(){

    const x=ClinicData.getStats();

    return `
      <div class="stats-grid stats-centered">

        <div>
          <b>${x.total}</b>
          <span>Total</span>
        </div>

        <div>
          <b>${x.waiting}</b>
          <span>Waiting</span>
        </div>

        <div>
          <b>${x.completed}</b>
          <span>Completed</span>
        </div>

      </div>
    `;
  }

  function home(s){

    const c=ClinicData.current();
    const w=ClinicData.waiting();

    return `
      <main class="content">

        <div class="welcome">

          <div>

            <p class="eyebrow">
              ${new Date().toLocaleDateString('en-IN',{
                weekday:'long',
                day:'numeric',
                month:'short'
              })}
            </p>

            <h1>
              Good ${
                new Date().getHours()<12
                  ? 'Morning'
                  : new Date().getHours()<17
                    ? 'Afternoon'
                    : 'Evening'
              }
            </h1>

            <p>
              Manage today's clinic queue.
            </p>

          </div>

          <span class="live-dot">
            LIVE
          </span>

        </div>

        ${stats()}

        <div class="section-title">
          <h2>
            Now Serving
          </h2>
        </div>

        ${
          c
            ? currentCard(c)
            : `
              <div class="empty card">

                <div class="empty-icon">
                  🪑
                </div>

                <h3>
                  No patient in consultation
                </h3>

                <p>
                  Call the next waiting patient when ready.
                </p>

                <button
                  class="primary"
                  ${!w.length?'disabled':''}
                  onclick="StaffApp.callNext()"
                >
                  ☎ Call Next Patient
                </button>

              </div>
            `
        }

        <div class="quick-grid">

          <button
            onclick="StaffApp.nav('register')"
          >
            ＋
            <b>Register Patient</b>
            <span>Walk-in</span>
          </button>

          <button
            onclick="StaffApp.nav('manage')"
          >
            ↔
            <b>Cancel / Reschedule</b>
            <span>Manage today's patients</span>
          </button>

        </div>

      </main>
    `;
  }

  function currentCard(p){

    return `
      <div class="current-card">

        <div class="token">
          #${p.tokenNumber}
        </div>

        <div class="patient-main">

          <span class="status">
            IN CONSULTATION
          </span>

          <h2>
            ${esc(p.patientName)}
          </h2>

          <p>
            ${esc(p.consultationType)}
            ·
            ${esc(p.patientType)}

            ${
              p.timeSlot
                ? ` · ${esc(p.timeSlot)}`
                : ''
            }

          </p>

        </div>

        <button
          class="primary"
          onclick="StaffApp.complete('${p.id}')"
        >
          ✓ Complete Consultation
        </button>

      </div>
    `;
  }

  function queue(s){

    const q=s.queue||[];

    return `
      <main class="content">

        <div class="page-head">

          <div>

            <h1>
              Today's Queue
            </h1>

            <p>
              ${q.length} registered ·
              ${ClinicData.getStats().waiting} waiting
            </p>

          </div>

          <button
            class="small-icon"
            onclick="StaffApp.render()"
          >
            ↻
          </button>

        </div>

        <div class="queue-list">

          ${
            q.length
              ? q.map(patientCard).join('')

              : `
                <div class="empty card">

                  <div class="empty-icon">
                    ☷
                  </div>

                  <h3>
                    Queue is empty
                  </h3>

                  <p>
                    Register the first patient for today.
                  </p>

                </div>
              `
          }

        </div>

      </main>
    `;
  }

  function patientCard(p){

    const cls=p.status
      .toLowerCase()
      .replace('_','-');

    return `
      <article class="queue-card">

        <div class="qtop">

          <div class="token small">
            #${p.tokenNumber}
          </div>

          <div class="qname">

            <b>
              ${esc(p.patientName)}
            </b>

            <span>

              ${esc(p.consultationType)}

              ·

              ${esc(p.patientType||'')}

              ${
                p.timeSlot
                  ? ` · ${esc(p.timeSlot)}`
                  : ''
              }

            </span>

          </div>

          <span class="pill ${cls}">
            ${p.status.replace('_',' ')}
          </span>

        </div>

        <div class="qmeta">

          <span>
            📱 ••••${esc(p.mobileNumber).slice(-4)}
          </span>

          <span>
            🕒 ${esc(p.registrationTime)}
          </span>

        </div>

        <div class="actions">

          ${
            p.status==='WAITING'

              ? `

                <button
                  class="primary"
                  onclick="StaffApp.sendWhatsApp('${p.id}')"
                >
                  💬 Send WhatsApp
                </button>

                <button
                  class="secondary"
                  onclick="StaffApp.skip('${p.id}')"
                >
                  Skip
                </button>

              `

              : ''
          }

          ${
            p.status==='IN_CONSULTATION'

              ? `

                <button
                  class="primary"
                  onclick="StaffApp.complete('${p.id}')"
                >
                  ✓ Complete
                </button>

              `

              : ''
          }

          ${
            p.status==='SKIPPED'

              ? `

                <button
                  class="secondary"
                  onclick="StaffApp.requeue('${p.id}')"
                >
                  ↻ Re-queue
                </button>

              `

              : ''
          }

        </div>

      </article>
    `;
  }

  function slotOptions(){

    return ClinicData.getTimeSlots()
      .map(x=>`
        <option value="${esc(x.slot)}">
          ${esc(x.slot)}
        </option>
      `)
      .join('');
  }

  function register(){

    return `
      <main class="content">

        <div class="page-head">

          <div>

            <h1>
              Register Patient
            </h1>

            <p>
              Choose an available hourly slot.
              Each slot accepts up to 13 patients.
            </p>

          </div>

        </div>

        <form
          class="card form"
          onsubmit="StaffApp.register(event)"
        >

          <label>
            Patient Name

            <input
              id="regName"
              required
              placeholder="e.g. Priya Sharma"
            >
          </label>

          <label>
            Age

            <input
              id="regAge"
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
            Gender

            <select
              id="regGender"
              required
            >

              <option value="">
                Select Gender
              </option>

              <option value="Male">
                Male
              </option>

              <option value="Female">
                Female
              </option>

              <option value="Other">
                Other
              </option>

            </select>

          </label>

          <label>
            Mobile Number

            <input
              id="regMobile"
              required
              inputmode="numeric"
              maxlength="10"
              pattern="[0-9]{10}"
              placeholder="10-digit mobile number"
            >
          </label>

          <fieldset>

            <legend>
              Patient Type
            </legend>

            <style>

              .patient-type-options {
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:12px;
              }

              .patient-type-option {
                position:relative;
                display:flex;
                align-items:center;
                justify-content:center;
                gap:8px;
                min-height:58px;
                padding:0 14px;
                border:1px solid #dce8ea;
                border-radius:16px;
                background:#f8fbfb;
                cursor:pointer;
                font-weight:700;
                color:#31515b;
                box-sizing:border-box;
              }

              .patient-type-option input {
                position:absolute;
                opacity:0;
                pointer-events:none;
              }

              .patient-type-option:has(input:checked) {
                border-color:#62c3c6;
                background:#e8f7f7;
                color:#087b83;
              }

              .patient-type-plus {
                font-size:22px;
                font-weight:800;
                line-height:1;
              }

              @media (max-width:380px) {

                .patient-type-options {
                  grid-template-columns:1fr;
                }

              }

            </style>

            <div class="patient-type-options">

              <label class="patient-type-option">

                <input
                  type="radio"
                  name="ptype"
                  value="New Patient"
                  checked
                >

                <span class="patient-type-plus">
                  +
                </span>

                <span>
                  New Patient
                </span>

              </label>

              <label class="patient-type-option">

                <input
                  type="radio"
                  name="ptype"
                  value="Follow Up"
                >

                <span class="patient-type-plus">
                  +
                </span>

                <span>
                  Follow Up
                </span>

              </label>

            </div>

          </fieldset>

          <label>
            Consultation Type

            <select id="regConsult">

              <option>
                General Consultation
              </option>

              <option>
                Follow-up
              </option>

              <option>
                Vaccination
              </option>

              <option>
                Health Checkup
              </option>

            </select>

          </label>

          <label>
            Time Slot

            <select
              id="regSlot"
              required
            >

              <option value="">
                Select an available time slot
              </option>

              ${slotOptions()}

            </select>

          </label>

          <p class="slot-note">
            Doctor available:
            10:00 AM–1:00 PM and
            5:00 PM–10:00 PM.
          </p>

          <button class="primary wide">
            ＋ Register & Get Token
          </button>

        </form>

      </main>
    `;
  }

  function qr(){

    const url=new URL(
      'patient.html',
      location.href
    ).href;

    let svg='';

    try{

      svg=QRCodeGenerator.generateSVG(
        url,
        220
      );

    }catch(e){

      svg=
        '<div class="qr-fallback">QR unavailable</div>';

    }

    return `
      <main class="content">

        <div class="page-head">

          <div>

            <h1>
              Patient QR
            </h1>

            <p>
              Display this code at reception
              for self-registration.
            </p>

          </div>

        </div>

        <div class="qr-card card">

          <div class="qr-wrap">
            ${svg}
          </div>

          <h2>
            Scan to Register
          </h2>

          <p>
            Patients need no app or account.
            Their token enters the same live queue.
          </p>

          <button
            class="primary wide"
            onclick="
              navigator.clipboard.writeText('${esc(url)}');
              alert('Registration link copied.')
            "
          >
            Copy Registration Link
          </button>

          <button
            class="secondary wide"
            onclick="
              window.open('${esc(url)}','_blank')
            "
          >
            Open Patient Page
          </button>

          <div class="url">
            ${esc(url)}
          </div>

        </div>

      </main>
    `;
  }

  function manage(s){

    const q=(s.queue||[])
      .filter(p=>[
        'WAITING',
        'IN_CONSULTATION'
      ].includes(p.status));

    return `
      <main class="content">

        <div class="page-head">

          <div>

            <h1>
              Cancel / Reschedule
            </h1>

            <p>
              Manage today's registered patients.
            </p>

          </div>

        </div>

        <div class="queue-list">

          ${
            q.length

              ? q.map(p=>`

                <article class="queue-card">

                  <div class="qtop">

                    <div class="token small">
                      #${p.tokenNumber}
                    </div>

                    <div class="qname">

                      <b>
                        ${esc(p.patientName)}
                      </b>

                      <span>
                        ${esc(p.consultationType)}
                        ·
                        ${esc(p.patientType||'')}

                        ${
                          p.timeSlot
                            ? ` · ${esc(p.timeSlot)}`
                            : ''
                        }

                      </span>

                    </div>

                    <span
                      class="
                        pill
                        ${
                          p.status
                            .toLowerCase()
                            .replace('_','-')
                        }
                      "
                    >
                      ${p.status.replace('_',' ')}
                    </span>

                  </div>

                  <div class="qmeta">

                    <span>
                      📱 ••••${esc(p.mobileNumber).slice(-4)}
                    </span>

                    <span>
                      🕒 ${esc(p.registrationTime)}
                    </span>

                    <span>
                      🗓 ${esc(p.timeSlot||'No slot')}
                    </span>

                  </div>

                  <div class="actions">

                    <button
                      class="secondary"
                      onclick="
                        StaffApp.reschedule('${p.id}')
                      "
                    >
                      ↻ Reschedule
                    </button>

                    <button
                      class="danger"
                      onclick="
                        StaffApp.cancel('${p.id}')
                      "
                    >
                      Cancel
                    </button>

                  </div>

                </article>

              `).join('')

              : `

                <div class="empty card">

                  <div class="empty-icon">
                    ↔
                  </div>

                  <h3>
                    No active patients to manage
                  </h3>

                  <p>
                    Today's active registrations
                    will appear here.
                  </p>

                </div>

              `
          }

        </div>

      </main>
    `;
  }

  function rescheduleScreen(s){

    const p=(s.queue||[])
      .find(x=>x.id===rescheduleId);

    if(!p){

      screen='manage';

      return manage(s);
    }

    const slots=ClinicData.getTimeSlots();

    return `
      <main class="content">

        <div class="page-head">

          <div>

            <button
              class="small-icon"
              onclick="StaffApp.nav('manage')"
            >
              ‹
            </button>

            <h1>
              Reschedule Patient
            </h1>

            <p>
              ${esc(p.patientName)}
              · Current slot:
              ${esc(p.timeSlot||'Not assigned')}
            </p>

          </div>

        </div>

        <div class="card slot-picker">

          <h2>
            Select a new time slot
          </h2>

          <p>
            Each hourly slot accepts up to 13 patients.
          </p>

          <div class="slot-list">

            ${
              slots.map(x=>`

                <button
                  class="
                    slot-option
                    ${x.slot===p.timeSlot?'current':''}
                  "
                  ${x.slot===p.timeSlot?'disabled':''}
                  onclick="
                    StaffApp.confirmReschedule(
                      '${p.id}',
                      '${esc(x.slot)}'
                    )
                  "
                >

                  <span>
                    ${esc(x.slot)}
                  </span>

                </button>

              `).join('')
            }

          </div>

        </div>

      </main>
    `;
  }

  function doctorDashboard(s){

    const m=ClinicData.getDashboardMetrics();
    const c=ClinicData.current();
    const w=ClinicData.waiting();

    const metricCard=(label,value)=>`
      <div class="metric-tile">
        <b>${value}</b>
        <span>${label}</span>
      </div>
    `;

    return `
      <main class="content doctor-dashboard">

        <div class="welcome">

          <div>

            <p class="eyebrow">
              DOCTOR DASHBOARD
            </p>

            <h1>
              Jessi's Clinic
            </h1>

            <p>
              Today's clinic performance at a glance.
            </p>

          </div>

          <span class="live-dot">
            LIVE
          </span>

        </div>

        <section class="dashboard-section">

          <div class="dashboard-section-head">
            <h2>
              A. Patient volume
            </h2>
          </div>

          <div class="metric-grid four">

            ${metricCard(
              'Total patients',
              m.patientVolume.total
            )}

            ${metricCard(
              'Appointments',
              m.patientVolume.appointments
            )}

            ${metricCard(
              'Walk-ins',
              m.patientVolume.walkIns
            )}

            ${metricCard(
              'Completed',
              m.patientVolume.completed
            )}

          </div>

        </section>

        <section class="dashboard-section">

          <div class="dashboard-section-head">

            <h2>
              B. Patient demographics
            </h2>

          </div>

          <div class="metric-grid three">

            ${metricCard(
              'Adult',
              m.demographics.adult
            )}

            ${metricCard(
              'Pediatric',
              m.demographics.pediatric
            )}

            ${metricCard(
              'Geriatric',
              m.demographics.geriatric
            )}

          </div>

        </section>

        <section class="dashboard-section">

          <div class="dashboard-section-head">

            <h2>
              C. Appointment performance
            </h2>

          </div>

          <div class="metric-grid four">

            ${metricCard(
              'No-show',
              m.appointments.noShow
            )}

            ${metricCard(
              'Cancelled',
              m.appointments.cancelled
            )}

            ${metricCard(
              'Rescheduled',
              m.appointments.rescheduled
            )}

            ${metricCard(
              'Completed',
              m.appointments.completed
            )}

          </div>

        </section>

        <section class="dashboard-section">

          <div class="dashboard-section-head">

            <h2>
              D. Queue performance
            </h2>

          </div>

          <div class="metric-grid four">

            ${metricCard(
              'Current token',
              m.queue.currentToken
            )}

            ${metricCard(
              'Waiting patients',
              m.queue.waiting
            )}

            ${metricCard(
              'Average waiting time',
              m.queue.averageWaiting
            )}

            ${metricCard(
              'Peak hour',
              m.queue.peakHour
            )}

          </div>

        </section>

        <div class="section-title">

          <h2>
            Current Patient
          </h2>

        </div>

        ${
          c
            ? currentCard(c)

            : `
              <div class="empty card">

                <div class="empty-icon">
                  ⚕
                </div>

                <h3>
                  No patient in consultation
                </h3>

                <p>
                  ${
                    w.length
                      ? 'Call the next waiting patient when ready.'
                      : 'No one is waiting.'
                  }
                </p>

              </div>
            `
        }

      </main>
    `;
  }

  function doctor(s){

    const c=ClinicData.current();
    const w=ClinicData.waiting();

    return `
      <main class="content doctor-page">

        <div class="doctor-banner">

          <span>
            DOCTOR VIEW
          </span>

          <h1>
            Consultation Room 1
          </h1>

          <p>
            ${esc(s.clinicDoctor)}
          </p>

        </div>

        ${
          c
            ? currentCard(c)

            : `
              <div class="empty card">

                <div class="empty-icon">
                  ⚕
                </div>

                <h3>
                  No current patient
                </h3>

                <p>
                  ${
                    w.length
                      ? 'Call the next patient when ready.'
                      : 'No one is waiting.'
                  }
                </p>

              </div>
            `
        }

        <div class="section-title">

          <h2>
            Next Patients
          </h2>

        </div>

        <div class="queue-list">

          ${
            w.slice(0,4)
              .map(patientCard)
              .join('')

              ||

              '<div class="card empty"><p>No waiting patients.</p></div>'
          }

        </div>

      </main>
    `;
  }

  function more(s){

    return `
      <main class="content">

        <div class="page-head">

          <div>

            <h1>
              More & Settings
            </h1>

            <p>
              Clinic controls
            </p>

          </div>

        </div>

        <div class="settings card">

          <div class="setting">

            <div>

              <b>
                Account
              </b>

              <span>
                ${esc(s.userName||'Clinic User')}
              </span>

            </div>

            <span class="connection on"></span>

          </div>

          <div class="setting">

            <div>

              <b>
                Interface
              </b>

              <span>
                ${
                  role()==='doctor'
                    ? 'Doctor Interface'
                    : 'Staff Interface'
                }
              </span>

            </div>

          </div>

          <div class="setting">

            <div>

              <b>
                Reset today's queue
              </b>

              <span>
                Use only when starting a new clinic day
              </span>

            </div>

            <button
              class="danger"
              onclick="StaffApp.reset()"
            >
              Reset
            </button>

          </div>

          <div class="setting">

            <div>

              <b>
                Firebase
              </b>

              <span>
                ${
                  ClinicData.isFirebase()
                    ? 'Connected / Live'
                    : 'Local development mode'
                }
              </span>

            </div>

            <span
              class="
                connection
                ${ClinicData.isFirebase()?'on':''}
              "
            ></span>

          </div>

          <button
            class="secondary wide"
            onclick="StaffApp.logout()"
          >
            Log out
          </button>

        </div>

      </main>
    `;
  }

  function render(){

    if(!el) return;

    const s=ClinicData.getState();

    if(
      s.role !== 'doctor' &&
      (
        screen === 'doctorDashboard' ||
        screen === 'doctor'
      )
    ){
      screen='home';
    }

    if(screen==='login'){

      el.innerHTML=login();

      return;
    }

    let body;

    if(screen==='home'){
      body=home(s);
    }
    else if(screen==='doctorDashboard'){
      body=doctorDashboard(s);
    }
    else if(screen==='queue'){
      body=queue(s);
    }
    else if(screen==='register'){
      body=register();
    }
    else if(screen==='qr'){
      body=qr();
    }
    else if(screen==='manage'){
      body=manage(s);
    }
    else if(screen==='reschedule'){
      body=rescheduleScreen(s);
    }
    else if(screen==='doctor'){
      body=doctor(s);
    }
    else{
      body=more(s);
    }

    el.innerHTML=`

      ${header(s)}

      <div class="app-scroll">
        ${body}
      </div>

      ${bottom()}

      ${
        modal
          ? `

            <div class="modal-backdrop">

              <div class="modal card">

                <div class="token huge">
                  #${modal.tokenNumber}
                </div>

                <h2>
                  Registration Successful
                </h2>

                <p>
                  ${esc(modal.patientName)}
                  is in the queue.
                </p>

                <button
                  class="primary wide"
                  onclick="StaffApp.closeModal()"
                >
                  Done
                </button>

              </div>

            </div>

          `
          : ''
      }

    `;
  }

  root.StaffApp={

    init,

    render,

    nav,

    login:async e=>{

      e.preventDefault();

      try{

        const u=await ClinicData.login(
          document.getElementById('loginEmail').value,
          document.getElementById('loginPassword').value
        );

        screen=u.role==='doctor'
          ? 'doctorDashboard'
          : 'home';

        render();

      }catch(err){

        loginError=
          err.message ||
          'Unable to sign in.';

        render();
      }
    },

    logout:async()=>{

      await ClinicData.logout();

      screen='login';

      render();
    },

    register:async e=>{

      e.preventDefault();

      try{

        const p=await ClinicData.register({

          patientName:
            document.getElementById('regName').value,

          age:
            document.getElementById('regAge').value,

          mobileNumber:
            document.getElementById('regMobile').value,

          gender:
            document.getElementById('regGender').value,

          patientType:
            document.querySelector(
              'input[name=ptype]:checked'
            ).value,

          consultationType:
            document.getElementById('regConsult').value,

          timeSlot:
            document.getElementById('regSlot').value,

          source:'MANUAL'

        });

        modal=p;

        render();

      }catch(err){

        alert(err.message);

      }
    },

    sendWhatsApp:id=>{

      const patient=(ClinicData.getState().queue||[])
        .find(p=>p.id===id);

      if(!patient){

        alert(
          'Patient record not found.'
        );

        return;
      }

      const rawMobile=
        String(patient.mobileNumber||'')
          .replace(/\D/g,'');

      if(rawMobile.length!==10){

        alert(
          'This patient does not have a valid 10-digit mobile number.'
        );

        return;
      }

      const mobile=
        '91'+rawMobile;

      /*
       * EXACT WhatsApp message requested:
       *
       * Hello Priya, this is Jessi's Clinic.
       * Your token number is #12.
       * Please be ready for your consultation.
       */

      const message=
        `Hello ${patient.patientName}, this is Jessi's Clinic. ` +
        `Your token number is #${patient.tokenNumber}. ` +
        `Please be ready for your consultation.`;

      const whatsappUrl=
        'https://wa.me/' +
        mobile +
        '?text=' +
        encodeURIComponent(message);

      window.open(
        whatsappUrl,
        '_blank'
      );
    },

    callNext:async()=>{

      const p=ClinicData.waiting()[0];

      if(p){
        await ClinicData.call(p.id);
      }

      render();
    },

    complete:async id=>{

      await ClinicData.complete(id);

      render();
    },

    skip:async id=>{

      if(
        confirm(
          'Skip this patient?'
        )
      ){

        await ClinicData.skip(id);

        render();
      }
    },

    requeue:async id=>{

      await ClinicData.requeue(id);

      render();
    },

    cancel:async id=>{

      if(
        confirm(
          'Cancel this patient registration?'
        )
      ){

        await ClinicData.cancel(id);

        render();
      }
    },

    reschedule:id=>{

      rescheduleId=id;

      screen='reschedule';

      render();
    },

    confirmReschedule:async(id,slot)=>{

      try{

        await ClinicData.reschedule(
          id,
          slot
        );

        rescheduleId=null;

        screen='manage';

        render();

      }catch(err){

        alert(err.message);
      }
    },

    reset:async()=>{

      if(
        confirm(
          "Reset today's queue?"
        )
      ){

        await ClinicData.resetDay();

        render();
      }
    },

    closeModal:()=>{

      modal=null;

      screen='queue';

      render();
    }

  };

})(window);