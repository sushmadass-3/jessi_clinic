/* Clinic Queue data layer - Firebase Realtime Database. */
(function (root) {
  const KEY = 'clinic_queue_local_v3';

  const today = () => {
    const d = new Date();

    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const time = () =>
    new Date().toLocaleTimeString([], {
      hour:'2-digit',
      minute:'2-digit',
      hour12:true
    });

  const SLOT_CAPACITY = 13;

  const isActiveRegistration=p=>
    ['WAITING','IN_CONSULTATION'].includes(p.status);

  const TIME_SLOTS = [
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '12:00 PM - 1:00 PM',
    '5:00 PM - 6:00 PM',
    '6:00 PM - 7:00 PM',
    '7:00 PM - 8:00 PM',
    '8:00 PM - 9:00 PM',
    '9:00 PM - 10:00 PM'
  ];

  const slotKey = slot =>
    String(slot || '')
      .replace(/[^A-Za-z0-9]+/g,'_')
      .replace(/^_|_$/g,'');

  function slotEndMinutes(slot){

    const m=String(slot||'')
      .match(/^(\d{1,2}):00 (AM|PM) - (\d{1,2}):00 (AM|PM)$/);

    if(!m) return null;

    let h=Number(m[3]);

    if(m[4]==='AM'){
      if(h===12) h=0;
    }else if(h!==12){
      h+=12;
    }

    return h*60;
  }

  function isSlotCurrentlyBookable(slot){

    const end=slotEndMinutes(slot);

    if(end===null) return false;

    const now=new Date();

    const minutes=
      now.getHours()*60+
      now.getMinutes();

    return minutes<end;
  }

  function slotCount(slot){

    return (state.queue||[]).filter(p =>
      p.timeSlot===slot &&
      isActiveRegistration(p)
    ).length;
  }

  function getTimeSlots(){

    return TIME_SLOTS
      .map(slot=>({
        slot,
        count:slotCount(slot),
        capacity:SLOT_CAPACITY,
        remaining:Math.max(
          0,
          SLOT_CAPACITY-slotCount(slot)
        )
      }))
      .filter(x =>
        x.count<SLOT_CAPACITY &&
        isSlotCurrentlyBookable(x.slot)
      );
  }

  function validateSlot(slot){

    if(!TIME_SLOTS.includes(slot)){
      throw new Error(
        'Please select a valid consultation time slot.'
      );
    }

    if(!isSlotCurrentlyBookable(slot)){
      throw new Error(
        `${slot} is no longer available for registration.`
      );
    }

    if(slotCount(slot)>=SLOT_CAPACITY){
      throw new Error(
        `${slot} is full. Please select another time slot.`
      );
    }
  }

  const emptyState = () => ({
    date:today(),
    queue:[],
    lastTokenNumber:0,
    clinicName:"Jessi's Clinic",
    clinicDoctor:'Dr. Sarah Chen',
    role:
      sessionStorage.getItem('clinic_role') ||
      'staff',
    userName:
      sessionStorage.getItem('clinic_user_name') ||
      'Clinic Staff'
  });

  let state=emptyState();

  let listeners=new Set();

  let unsubscribe=null;

  let firebaseLive=false;

  function emit(){

    listeners.forEach(fn=>{
      try{
        fn(state);
      }catch(e){
        console.error(e);
      }
    });
  }

  function saveLocal(){

    localStorage.setItem(
      KEY,
      JSON.stringify(state)
    );
  }

  function loadLocal(){

    try{

      const x=
        JSON.parse(
          localStorage.getItem(KEY)||'null'
        );

      if(
        x &&
        x.date===today()
      ){
        state={
          ...emptyState(),
          ...x
        };
      }else{

        state=emptyState();

        saveLocal();
      }

    }catch(e){

      state=emptyState();
    }
  }

  loadLocal();

  state.clinicName="Jessi's Clinic";

  function fbReady(){

    return root.FirebaseConfig &&
      root.FirebaseConfig.isReady &&
      root.FirebaseConfig.isReady();
  }

  function db(){

    return root.FirebaseConfig.getDatabase();
  }

  function serverTimestamp(){

    return firebase.database.ServerValue.TIMESTAMP;
  }

  function normalizeRecord(id,data){

    if(!data) return null;

    return {
      id,
      ...data
    };
  }

  function subscribe(){

    if(!fbReady()) return;

    try{

      if(unsubscribe){
        unsubscribe();
      }

      const ref=
        db()
          .ref('queueRecords')
          .orderByChild('queueDate')
          .equalTo(today());

      const handler=snap=>{

        const value=snap.val()||{};

        state.queue=
          Object.entries(value)
            .map(([id,data]) =>
              normalizeRecord(id,data)
            )
            .filter(Boolean)
            .sort(
              (a,b)=>
                (Number(a.tokenNumber)||0)-
                (Number(b.tokenNumber)||0)
            );

        state.lastTokenNumber=
          state.queue.reduce(
            (m,p)=>
              Math.max(
                m,
                Number(p.tokenNumber)||0
              ),
            0
          );

        firebaseLive=true;

        emit();
      };

      ref.on('value',handler);

      unsubscribe=() =>
        ref.off('value',handler);

    }catch(e){

      console.warn(
        'Realtime Database queue listener:',
        e.message
      );

      firebaseLive=false;

      emit();
    }
  }

  subscribe();

  async function login(email,password){

    if(!fbReady()){
      throw new Error(
        'Firebase is not available. Check your internet connection.'
      );
    }

    const cred=
      await root.FirebaseConfig
        .getAuth()
        .signInWithEmailAndPassword(
          email.trim().toLowerCase(),
          password
        );

    const uid=cred.user.uid;

    let role='STAFF';

    let displayName=
      cred.user.displayName ||
      'Clinic Staff';

    try{

      const ref=
        db().ref(`users/${uid}`);

      const snap=
        await ref.once('value');

      if(snap.exists()){

        const data=snap.val()||{};

        role=
          data.role ||
          role;

        displayName=
          data.displayName ||
          displayName;

      }else{

        await ref.set({

          email:cred.user.email,

          displayName,

          role,

          createdAt:serverTimestamp()

        });
      }

    }catch(e){

      console.warn(
        'Profile read/write:',
        e.message
      );
    }

    state.role=
      role.toLowerCase()==='doctor'
        ? 'doctor'
        : 'staff';

    state.userName=
      displayName;

    sessionStorage.setItem(
      'clinic_role',
      state.role
    );

    sessionStorage.setItem(
      'clinic_user_name',
      displayName
    );

    emit();

    subscribe();

    return {
      uid,
      email:cred.user.email,
      role:state.role,
      displayName
    };
  }

  async function logout(){

    if(fbReady()){

      await root.FirebaseConfig
        .getAuth()
        .signOut();
    }

    sessionStorage.removeItem(
      'clinic_role'
    );

    sessionStorage.removeItem(
      'clinic_user_name'
    );

    state.role='staff';

    state.userName=
      'Clinic Staff';

    emit();
  }

  function onAuth(cb){

    if(!fbReady()){

      cb(null);

      return ()=>{};
    }

    return root.FirebaseConfig
      .getAuth()
      .onAuthStateChanged(
        async user=>{

          if(!user){

            cb(null);

            return;
          }

          let role='staff';

          let displayName=
            user.displayName ||
            'Clinic Staff';

          try{

            const snap=
              await db()
                .ref(`users/${user.uid}`)
                .once('value');

            if(snap.exists()){

              const data=
                snap.val()||{};

              role=
                (data.role||'STAFF')
                  .toLowerCase();

              displayName=
                data.displayName ||
                displayName;
            }

          }catch(e){}

          state.role=
            role==='doctor'
              ? 'doctor'
              : 'staff';

          state.userName=
            displayName;

          sessionStorage.setItem(
            'clinic_role',
            state.role
          );

          sessionStorage.setItem(
            'clinic_user_name',
            displayName
          );

          subscribe();

          emit();

          cb({

            uid:user.uid,

            email:user.email,

            role:state.role,

            displayName

          });
        }
      );
  }

  async function register(p){

    const name=
      (p.patientName||'').trim();

    const mobile=
      (p.mobileNumber||'')
        .replace(/\D/g,'');

    const age=
      Number(p.age);

    /*
     * GENDER
     *
     * Gender is now part of the registration
     * data saved to Firebase Realtime Database.
     */
    const gender=
      String(p.gender||'').trim();

    const allowedGenders=[
      'Male',
      'Female',
      'Other'
    ];

    if(name.length<2){

      throw new Error(
        'Please enter the patient name.'
      );
    }

    if(
      !Number.isInteger(age) ||
      age<0 ||
      age>120
    ){

      throw new Error(
        'Please enter a valid patient age (0-120).'
      );
    }

    /*
     * Gender is required for new registrations.
     */
    if(!allowedGenders.includes(gender)){

      throw new Error(
        'Please select a valid gender.'
      );
    }

    if(mobile.length!==10){

      throw new Error(
        'Please enter a valid 10-digit mobile number.'
      );
    }

    const timeSlot=
      String(p.timeSlot||'');

    validateSlot(timeSlot);

    /*
     * Common patient record.
     *
     * Gender is deliberately included here so
     * both MANUAL and QR registrations can store it.
     */
    const base={

      patientName:name,

      age,

      gender,

      mobileNumber:mobile,

      patientType:
        p.patientType ||
        'New Patient',

      consultationType:
        p.consultationType ||
        'General Consultation',

      registrationSource:
        p.source==='QR'
          ? 'QR'
          : 'MANUAL',

      timeSlot

    };

    if(fbReady()){

      const date=today();

      const recordRef=
        db()
          .ref('queueRecords')
          .push();

      const allocatorRef=
        db()
          .ref(`dailyQueues/${date}`);

      /*
       * One transaction controls both the daily
       * token sequence and per-slot capacity.
       *
       * This prevents duplicate tokens when
       * two registrations happen at nearly
       * the same time.
       */
      const tx=
        await allocatorRef.transaction(
          current=>{

            current=
              current||{

                date,

                lastTokenNumber:0,

                totalRegistered:0,

                completedCount:0,

                currentServingId:null,

                slotCounts:{}

              };

            current.slotCounts=
              current.slotCounts||{};

            const count=
              Number(
                current.slotCounts[
                  slotKey(timeSlot)
                ]||0
              );

            if(count>=SLOT_CAPACITY){

              return;
            }

            current.lastTokenNumber=
              Number(
                current.lastTokenNumber||0
              )+1;

            current.totalRegistered=
              Number(
                current.totalRegistered||0
              )+1;

            current.slotCounts[
              slotKey(timeSlot)
            ]=
              count+1;

            current.date=date;

            current.updatedAt=
              serverTimestamp();

            return current;
          }
        );

      if(!tx.committed){

        throw new Error(
          `${timeSlot} is full or registration could not be completed. Please try again.`
        );
      }

      const data={

        ...base,

        id:recordRef.key,

        tokenNumber:
          Number(
            tx.snapshot.val()
              .lastTokenNumber
          ),

        status:'WAITING',

        queueDate:date,

        registrationTime:time(),

        createdAt:
          serverTimestamp(),

        registrationAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()

      };

      try{

        await recordRef.set(data);

      }catch(err){

        /*
         * Keep the allocator safe if
         * the record write fails.
         *
         * This rollback is best-effort.
         */
        await allocatorRef.transaction(
          current=>{

            if(!current)
              return current;

            current.slotCounts=
              current.slotCounts||{};

            const key=
              slotKey(timeSlot);

            current.slotCounts[key]=
              Math.max(
                0,
                Number(
                  current.slotCounts[key]||0
                )-1
              );

            current.lastTokenNumber=
              Math.max(
                0,
                Number(
                  current.lastTokenNumber||0
                )-1
              );

            current.totalRegistered=
              Math.max(
                0,
                Number(
                  current.totalRegistered||0
                )-1
              );

            current.updatedAt=
              serverTimestamp();

            return current;
          }
        );

        throw err;
      }

      return data;
    }

    /*
     * Local development fallback.
     */
    const next=
      (state.lastTokenNumber||0)+1;

    const patient={

      ...base,

      id:
        'local_'+Date.now(),

      tokenNumber:next,

      status:'WAITING',

      queueDate:today(),

      registrationTime:time(),

      registrationAt:
        new Date().toISOString()

    };

    state.lastTokenNumber=
      next;

    state.queue=[
      ...state.queue,
      patient
    ];

    saveLocal();

    emit();

    return patient;
  }

  async function updateStatus(
    id,
    status
  ){

    if(fbReady()){

      let capacityDate=today();
      let capacitySlot='';
      let capacityDelta=0;

      const ref=
        db()
          .ref(`queueRecords/${id}`);

      if(
        status==='SKIPPED' ||
        status==='WAITING' ||
        status==='COMPLETED'
      ){

        const patientSnap=
          await ref.once('value');

        if(!patientSnap.exists()){

          throw new Error(
            'Patient registration not found.'
          );
        }

        const patient=
          patientSnap.val()||{};

        const queueDate=
          patient.queueDate||today();

        capacityDate=queueDate;
        capacitySlot=patient.timeSlot||'';

        await reconcileSlotCounts(queueDate);

        const wasCounted=
          isActiveRegistration(patient);

        const willCount=
          isActiveRegistration({
            ...patient,
            status
          });

        capacityDelta=
          Number(willCount)-Number(wasCounted);

        if(
          patient.timeSlot &&
          capacityDelta!==0
        ){

          const allocatorRef=
            db()
              .ref(`dailyQueues/${queueDate}`);

          let slotFull=false;

          const tx=
            await allocatorRef.transaction(
              current=>{

                if(!current)
                  return;

                current.slotCounts=
                  current.slotCounts||{};

                const key=
                  slotKey(patient.timeSlot);

                const count=
                  Number(
                    current.slotCounts[key]||0
                  );

                if(
                  capacityDelta>0 &&
                  count>=SLOT_CAPACITY
                ){

                  slotFull=true;
                  return;
                }

                current.slotCounts[key]=
                  Math.max(0,count+capacityDelta);

                current.updatedAt=
                  serverTimestamp();

                return current;
              }
            );

          if(!tx.committed){

            throw new Error(
              slotFull
                ? `${patient.timeSlot} is full. Please select another time slot.`
                : 'Unable to update the slot capacity. Please try again.'
            );
          }
        }
      }

      if(status==='IN_CONSULTATION'){

        const snap=
          await db()
            .ref('queueRecords')
            .orderByChild('queueDate')
            .equalTo(today())
            .once('value');

        const updates={};
        const completedSlotCounts={};

        const value=
          snap.val()||{};

        Object.entries(value)
          .forEach(
            ([rid,p])=>{

              if(
                rid!==id &&
                p.status==='IN_CONSULTATION'
              ){

                if(p.timeSlot && isActiveRegistration(p)){
                  const key=slotKey(p.timeSlot);

                  completedSlotCounts[key]=
                    (completedSlotCounts[key]||0)+1;
                }

                updates[
                  `queueRecords/${rid}/status`
                ]='COMPLETED';

                updates[
                  `queueRecords/${rid}/completedAt`
                ]=serverTimestamp();

                updates[
                  `queueRecords/${rid}/updatedAt`
                ]=serverTimestamp();
              }
            }
          );

        updates[
          `queueRecords/${id}/status`
        ]=status;

        updates[
          `queueRecords/${id}/calledAt`
        ]=serverTimestamp();

        updates[
          `queueRecords/${id}/updatedAt`
        ]=serverTimestamp();

        await db()
          .ref()
          .update(updates);

        if(Object.keys(completedSlotCounts).length){

          await db()
            .ref(`dailyQueues/${today()}`)
            .transaction(
              current=>{

                if(!current)
                  return current;

                current.slotCounts=
                  current.slotCounts||{};

                Object.entries(completedSlotCounts)
                  .forEach(([key,count])=>{

                    current.slotCounts[key]=
                      Math.max(
                        0,
                        Number(current.slotCounts[key]||0)-count
                      );
                  });

                current.updatedAt=serverTimestamp();

                return current;
              }
            );
        }

      }else{

        const updates={

          status,

          updatedAt:
            serverTimestamp()

        };

        if(status==='COMPLETED'){

          updates.completedAt=
            serverTimestamp();
        }

        if(status==='SKIPPED'){

          updates.skippedAt=
            serverTimestamp();
        }

        if(status==='WAITING'){

          updates.requeuedAt=
            serverTimestamp();

          updates.slotCapacityReleased=false;
        }

        if(status==='SKIPPED'){

          updates.slotCapacityReleased=true;
        }

        try{

          await ref.update(updates);

        }catch(err){

          if(capacityDelta!==0 && capacitySlot){

            await db()
              .ref(`dailyQueues/${capacityDate}`)
              .transaction(
                current=>{

                  if(!current)
                    return current;

                  current.slotCounts=
                    current.slotCounts||{};

                  const key=slotKey(capacitySlot);

                  current.slotCounts[key]=
                    Math.max(
                      0,
                      Number(current.slotCounts[key]||0)-capacityDelta
                    );

                  current.updatedAt=serverTimestamp();

                  return current;
                }
              );
          }

          throw err;
        }
      }

      return;
    }

    const q=
      state.queue.map(p=>
        p.id===id
          ? {
              ...p,
              status
            }
          :
            (
              status==='IN_CONSULTATION' &&
              p.status==='IN_CONSULTATION'
            )
              ? {
                  ...p,
                  status:'COMPLETED'
                }
              : p
      );

    state.queue=q;

    saveLocal();

    emit();
  }

  async function setPatientStatus(
    id,
    status,
    extra={}
  ){

    if(fbReady()){

      await db()
        .ref(`queueRecords/${id}`)
        .update({

          status,

          ...extra,

          updatedAt:
            serverTimestamp()

        });

      return;
    }

    state.queue=
      state.queue.map(p=>
        p.id===id
          ? {
              ...p,
              status,
              ...extra
            }
          : p
      );

    saveLocal();

    emit();
  }

  async function cancel(id){

    const p=
      state.queue.find(
        x=>x.id===id
      );

    if(fbReady()){

      const updates={

        status:'CANCELLED',

        cancelledAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()

      };

      await db()
        .ref(`queueRecords/${id}`)
        .update(updates);

      if(
        p &&
        p.timeSlot &&
        isActiveRegistration(p)
      ){

        const allocatorRef=
          db()
            .ref(`dailyQueues/${today()}`);

        await allocatorRef.transaction(
          current=>{

            if(!current)
              return current;

            current.slotCounts=
              current.slotCounts||{};

            const key=
              slotKey(p.timeSlot);

            current.slotCounts[key]=
              Math.max(
                0,
                Number(
                  current.slotCounts[key]||0
                )-1
              );

            current.updatedAt=
              serverTimestamp();

            return current;
          }
        );
      }

      return;
    }

    return setPatientStatus(
      id,
      'CANCELLED',
      {
        cancelledAt:
          new Date().toISOString()
      }
    );
  }

  async function reschedule(
    id,
    newSlot
  ){

    if(!TIME_SLOTS.includes(newSlot)){

      throw new Error(
        'Please select a valid consultation time slot.'
      );
    }

    if(!isSlotCurrentlyBookable(newSlot)){

      throw new Error(
        `${newSlot} is no longer available.`
      );
    }

    const p=
      state.queue.find(
        x=>x.id===id
      );

    if(fbReady()){

      const ref=
        db()
          .ref(`queueRecords/${id}`);

      const snap=
        await ref.once('value');

      if(!snap.exists()){

        throw new Error(
          'Patient registration not found.'
        );
      }

      const patient=
        snap.val()||{};

      const queueDate=
        patient.queueDate||today();

      await reconcileSlotCounts(queueDate);

      const oldSlot=
        patient.timeSlot||'';

      if(oldSlot===newSlot){

        throw new Error(
          'Please choose a different time slot.'
        );
      }

      const allocatorRef=
        db()
          .ref(`dailyQueues/${queueDate}`);

      const newKey=
        slotKey(newSlot);

      const oldKey=
        slotKey(oldSlot);

      let slotFull=false;

      const tx=
        await allocatorRef.transaction(
          current=>{

            if(!current)
              return;

            current.slotCounts=
              current.slotCounts||{};

            const newCount=
              Number(
                current.slotCounts[newKey]||0
              );

            if(newCount>=SLOT_CAPACITY){

              slotFull=true;
              return;
            }

            current.slotCounts[newKey]=
              newCount+1;

            current.updatedAt=
              serverTimestamp();

            return current;
          }
        );

      if(!tx.committed){

        throw new Error(
          slotFull
            ? 'This time slot is full.'
            : 'Unable to reserve the time slot. Please refresh and try again.'
        );
      }

      try{

        await ref.update({

          status:'WAITING',

          timeSlot:newSlot,

          rescheduledFrom:
            oldSlot,

          rescheduledTo:
            newSlot,

          rescheduleCount:
            Number(
              patient.rescheduleCount||0
            )+1,

          rescheduledAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()

        });

      }catch(err){

        await allocatorRef.transaction(
          current=>{

            if(!current)
              return current;

            current.slotCounts=
              current.slotCounts||{};

            current.slotCounts[newKey]=
              Math.max(
                0,
                Number(current.slotCounts[newKey]||0)-1
              );

            current.updatedAt=serverTimestamp();

            return current;
          }
        );

        throw err;
      }

      if(oldSlot){

        await allocatorRef.transaction(
          current=>{

            if(!current)
              return current;

            current.slotCounts=
              current.slotCounts||{};

            current.slotCounts[oldKey]=
              Math.max(
                0,
                Number(current.slotCounts[oldKey]||0)-1
              );

            current.updatedAt=serverTimestamp();

            return current;
          }
        );
      }

      return;
    }

    if(!p){

      throw new Error(
        'Patient registration not found.'
      );
    }

    if(p.timeSlot===newSlot){

      throw new Error(
        'Please choose a different time slot.'
      );
    }

    validateSlot(newSlot);

    p.status='WAITING';

    p.rescheduledFrom=
      p.timeSlot||'';

    p.rescheduledTo=
      newSlot;

    p.timeSlot=
      newSlot;

    p.rescheduleCount=
      (p.rescheduleCount||0)+1;

    p.rescheduledAt=
      new Date().toISOString();

    saveLocal();

    emit();
  }

  async function reconcileSlotCounts(date=today()){

    const allocatorRef=
      db()
        .ref(`dailyQueues/${date}`);

    const allocatorSnap=
      await allocatorRef.once('value');

    const allocator=allocatorSnap.val();

    if(
      allocator &&
      Number(allocator.slotCountsVersion||0)>=4
    ){
      return;
    }

    const recordsSnap=
      await db()
        .ref('queueRecords')
        .orderByChild('queueDate')
        .equalTo(date)
        .once('value');

    const slotCounts={};
    const releasedUpdates={};

    Object.entries(recordsSnap.val()||{})
      .forEach(([id,patient])=>{

        if(
          patient.timeSlot &&
          isActiveRegistration(patient)
        ){
          const key=slotKey(patient.timeSlot);

          slotCounts[key]=
            (slotCounts[key]||0)+1;
        }

        if(
          patient.status==='SKIPPED' &&
          patient.timeSlot &&
          patient.slotCapacityReleased!==true
        ){
          const key=slotKey(patient.timeSlot);

          releasedUpdates[
            `queueRecords/${id}/slotCapacityReleased`
          ]=true;
        }
      });

    const tx=
      await allocatorRef.transaction(
        current=>{

          if(
            current &&
            Number(current.slotCountsVersion||0)>=4
          ){
            return;
          }

          current=current||{
            date,
            lastTokenNumber:
              Number(state.lastTokenNumber||0),
            totalRegistered:
              state.queue.length,
            completedCount:
              state.queue.filter(
                x=>x.status==='COMPLETED'
              ).length,
            currentServingId:null,
            slotCounts:{}
          };

          current.slotCounts=slotCounts;
          current.slotCountsVersion=4;
          current.updatedAt=serverTimestamp();

          return current;
        }
      );

    if(
      tx.committed &&
      Object.keys(releasedUpdates).length
    ){
      await db()
        .ref()
        .update(releasedUpdates);
    }
  }

  async function resetDay(){

    if(fbReady()){

      await db()
        .ref(`dailyQueues/${today()}`)
        .set({

          date:today(),

          lastTokenNumber:0,

          totalRegistered:0,

          completedCount:0,

          currentServingId:null,

          slotCounts:{},

          slotCountsVersion:4,

          updatedAt:
            serverTimestamp()

        });

      return;
    }

    state.queue=[];

    state.lastTokenNumber=0;

    saveLocal();

    emit();
  }

  function setRole(role){

    state.role=role;

    sessionStorage.setItem(
      'clinic_role',
      role
    );

    emit();
  }

  function getStats(){

    return {

      total:
        state.queue.length,

      waiting:
        state.queue.filter(
          p=>p.status==='WAITING'
        ).length,

      consulting:
        state.queue.filter(
          p=>p.status==='IN_CONSULTATION'
        ).length,

      completed:
        state.queue.filter(
          p=>p.status==='COMPLETED'
        ).length,

      skipped:
        state.queue.filter(
          p=>p.status==='SKIPPED'
        ).length

    };
  }

  function current(){

    return state.queue.find(
      p=>p.status==='IN_CONSULTATION'
    )||null;
  }

  function waiting(){

    return state.queue
      .filter(
        p=>p.status==='WAITING'
      )
      .sort(
        (a,b)=>
          a.tokenNumber-b.tokenNumber
      );
  }

  function dashboardMetrics(){

    const q=
      state.queue||[];

    const active=
      q.filter(
        p=>
          ![
            'CANCELLED',
            'RESCHEDULED'
          ].includes(p.status)
      );

    const completed=
      q.filter(
        p=>p.status==='COMPLETED'
      );

    const appointments=
      q.filter(
        p=>
          p.registrationSource===
          'APPOINTMENT'
      );

    const walkIns=
      q.filter(
        p=>
          p.registrationSource===
            'MANUAL' ||
          p.registrationSource===
            'QR'
      );

    const noShow=
      q.filter(
        p=>p.status==='NO_SHOW'
      );

    const cancelled=
      q.filter(
        p=>p.status==='CANCELLED'
      );

    const rescheduled=
      q.filter(
        p=>
          Number(
            p.rescheduleCount||0
          )>0
      );

    const ages=
      q.map(
        p=>Number(p.age)
      )
      .filter(
        Number.isFinite
      );

    const adult=
      ages.filter(
        a=>a>=18&&a<60
      ).length;

    const pediatric=
      ages.filter(
        a=>a<18
      ).length;

    const geriatric=
      ages.filter(
        a=>a>=60
      ).length;

    const current=
      state.queue.find(
        p=>p.status==='IN_CONSULTATION'
      );

    const waits=
      q.filter(
        p=>
          p.calledAt &&
          p.registrationAt
      );

    let avg=0;

    if(waits.length){

      const total=
        waits.reduce(
          (sum,p)=>{

            const r=
              p.registrationAt?.toDate
                ? p.registrationAt.toDate()
                : new Date(
                    p.registrationAt
                  );

            const c=
              p.calledAt?.toDate
                ? p.calledAt.toDate()
                : new Date(
                    p.calledAt
                  );

            const diff=
              (c-r)/60000;

            return sum+
              (
                Number.isFinite(diff) &&
                diff>=0
                  ? diff
                  : 0
              );
          },
          0
        );

      avg=
        Math.round(
          total/waits.length
        );
    }

    const hours={};

    q.forEach(p=>{

      const raw=
        p.createdAt?.toDate
          ? p.createdAt.toDate()
          :
            (
              p.createdAt
                ? new Date(p.createdAt)
                : null
            );

      if(
        raw &&
        !isNaN(raw)
      ){

        hours[
          raw.getHours()
        ]=
          (
            hours[raw.getHours()]||0
          )+1;
      }
    });

    let peak='—';

    let max=0;

    Object.entries(hours)
      .forEach(
        ([h,n])=>{

          if(n>max){

            max=n;

            peak=
              `${String(
                Number(h)
              ).padStart(2,'0')}:00`;
          }
        }
      );

    return {

      patientVolume:{

        total:
          active.length,

        appointments:
          appointments.length,

        walkIns:
          walkIns.length,

        completed:
          completed.length

      },

      demographics:{

        adult,

        pediatric,

        geriatric

      },

      appointments:{

        noShow:
          noShow.length,

        cancelled:
          cancelled.length,

        rescheduled:
          rescheduled.length,

        completed:
          completed.length

      },

      queue:{

        currentToken:
          current
            ? `#${current.tokenNumber}`
            : '—',

        waiting:
          q.filter(
            p=>p.status==='WAITING'
          ).length,

        averageWaiting:
          avg
            ? `${avg} min`
            : '—',

        peakHour:
          peak

      }
    };
  }

  root.ClinicData={

    getState:
      ()=>state,

    subscribe(fn){

      listeners.add(fn);

      fn(state);

      return()=>
        listeners.delete(fn);
    },

    isFirebase:
      ()=>firebaseLive||fbReady(),

    login,

    logout,

    onAuth,

    register,

    call:
      id=>
        updateStatus(
          id,
          'IN_CONSULTATION'
        ),

    complete:
      id=>
        updateStatus(
          id,
          'COMPLETED'
        ),

    skip:
      id=>
        updateStatus(
          id,
          'SKIPPED'
        ),

    requeue:
      id=>
        updateStatus(
          id,
          'WAITING'
        ),

    cancel,

    reschedule,

    resetDay,

    setRole,

    getStats,

    current,

    waiting,

    getDashboardMetrics:
      dashboardMetrics,

    today,

    getTimeSlots,

    SLOT_CAPACITY,

    TIME_SLOTS

  };

})(window);