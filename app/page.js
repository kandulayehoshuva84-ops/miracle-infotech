'use client';

import {useEffect,useMemo,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {
 Search,LogOut,Clock3,ShieldCheck,Plus,FileEdit,Inbox,
 LoaderCircle,CheckCircle2,Hourglass,IdCard,Landmark,Vote,Car,
 ExternalLink,ChevronRight,LayoutDashboard,Users,Activity
} from 'lucide-react';

const supabase=createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL,
 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const services=[
 {
  id:'aadhaar',
  name:'Aadhaar',
  icon:IdCard,
  sub:['Aadhaar Update','Address Update','Mobile Update','Name Correction','DOB Correction','Download Aadhaar'],
  urls:[
   'https://myaadhaar.uidai.gov.in/','https://myaadhaar.uidai.gov.in/',
   'https://myaadhaar.uidai.gov.in/','https://myaadhaar.uidai.gov.in/',
   'https://myaadhaar.uidai.gov.in/','https://myaadhaar.uidai.gov.in/'
  ],
  fee:50,
  image:'/services/aadhaar.png'
 },
 {
  id:'pan',
  name:'PAN Card',
  icon:Landmark,
  sub:['New PAN Application','PAN Correction','PAN Download'],
  urls:[
   'https://www.pan.utiitsl.com/',
   'https://www.pan.utiitsl.com/',
   'https://www.incometax.gov.in/'
  ],
  fee:100,
  image:'/services/pan.webp'
 },
 {
  id:'voter',
  name:'Voter Card',
  icon:Vote,
  sub:['New Voter Registration','Voter Correction','Download e-EPIC'],
  urls:[
   'https://voters.eci.gov.in/',
   'https://voters.eci.gov.in/',
   'https://voters.eci.gov.in/'
  ],
  fee:50,
  image:'/services/voter.png'
 },
 {
  id:'dl',
  name:'Driving Licence',
  icon:Car,
  sub:['Learner Licence','DL Renewal','DL Services'],
  urls:[
   'https://sarathi.parivahan.gov.in/',
   'https://sarathi.parivahan.gov.in/',
   'https://sarathi.parivahan.gov.in/'
  ],
  fee:150,
  image:'/services/driving-licence.png'
 }
];

const roleLabel=r=>{
 const x=String(r||'').toUpperCase();
 if(x==='MASTER')return 'Master';
 if(x==='ADMIN')return 'Admin';
 return 'Employee';
};

export default function Home(){

 const [user,setUser]=useState(null);
 const [allUsers,setAllUsers]=useState([]);
 const [login,setLogin]=useState('');
 const [pw,setPw]=useState('');
 const [apps,setApps]=useState([]);
 const [authMode,setAuthMode]=useState('login');
 const [newPw,setNewPw]=useState('');
 const [confirmPw,setConfirmPw]=useState('');
 const [section,setSection]=useState('dashboard');
 const [service,setService]=useState(null);
 const [search,setSearch]=useState('');
 const [now,setNow]=useState(new Date());
 const [idle,setIdle]=useState(0);
 const [form,setForm]=useState({
  customer:'',
  mobile:'',
  work:'',
  sub:'',
  fee:''
 });
 const [msg,setMsg]=useState('');
 const [userForm,setUserForm]=useState({
  username:'',
  name:'',
  role:'Admin',
  mobile:'',
  email:'',
  password:''
 });
 const [loading,setLoading]=useState(true);

 async function loadData(currentUser){
  if(!currentUser)return;

  const {data:profile,error:profileError}=await supabase
   .from('profiles')
   .select('*')
   .eq('id',currentUser.id)
   .single();

  if(profileError||!profile){
   await supabase.auth.signOut();
   setUser(null);
   setMsg('User profile not found.');
   return;
  }

  const u={
   ...profile,
   role:roleLabel(profile.role)
  };

  setUser(u);

  const {data:applications,error}=await supabase
   .from('applications')
   .select('*')
   .order('created_at',{ascending:false});

  if(!error)setApps(applications||[]);

  if(String(profile.role).toUpperCase()==='MASTER'){
   const {data:users}=await supabase
    .from('profiles')
    .select('*')
    .order('username');

   setAllUsers(users||[]);
  }else{
   setAllUsers([profile]);
  }
 }

 useEffect(()=>{
  let mounted=true;

  (async()=>{
   const {data:{session}}=await supabase.auth.getSession();

   if(mounted&&session){
    await loadData(session.user);
   }

   if(mounted)setLoading(false);
  })();

  const {data:listener}=supabase.auth.onAuthStateChange(
   async(_event,session)=>{
    if(session){
     await loadData(session.user);
    }else{
     setUser(null);
    }
   }
  );

  const t=setInterval(
   ()=>setNow(new Date()),
   1000
  );

  return()=>{
   mounted=false;
   listener.subscription.unsubscribe();
   clearInterval(t);
  };
 },[]);

 useEffect(()=>{
  if(!user)return;

  const events=[
   'mousemove',
   'keydown',
   'click',
   'scroll',
   'touchstart'
  ];

  const reset=()=>setIdle(0);

  events.forEach(e=>
   window.addEventListener(e,reset)
  );

  const t=setInterval(
   ()=>setIdle(x=>x+1),
   1000
  );

  return()=>{
   clearInterval(t);
   events.forEach(e=>
    window.removeEventListener(e,reset)
   );
  };
 },[user]);

 useEffect(()=>{
  if(user&&idle>=1200){
   logout();
  }
 },[idle,user]);

 const stats=useMemo(()=>({
  total:apps.length,
  received:apps.filter(
   a=>String(a.status).toUpperCase()==='RECEIVED'
  ).length,
  processed:apps.filter(
   a=>String(a.status).toUpperCase()==='PROCESSED'
  ).length,
  pending:apps.filter(
   a=>String(a.status).toUpperCase()==='PENDING'
  ).length,
  completed:apps.filter(
   a=>String(a.status).toUpperCase()==='COMPLETED'
  ).length
 }),[apps]);

 async function doLogin(e){
  e.preventDefault();
  setMsg('');

  if(!login||!pw){
   setMsg('Enter username and password.');
   return;
  }

  setLoading(true);

  const {
   data:emailData,
   error:emailError
  }=await supabase.rpc(
   'get_auth_email_by_username',
   {p_username:login.trim()}
  );

  if(emailError||!emailData){
   setLoading(false);
   setMsg('Username not found.');
   return;
  }

  const email=
   typeof emailData==='string'
    ?emailData
    :emailData?.email;

  const {data,error}=await supabase.auth.signInWithPassword({
   email,
   password:pw
  });

  setLoading(false);

  if(error){
   setMsg('Incorrect username or password.');
   return;
  }

  if(data.session){
   setLogin('');
   setPw('');
   setMsg('');
   await loadData(data.user);
  }
 }

 async function sendReset(){
  setMsg('');

  if(!login){
   setMsg('Enter your username first.');
   return;
  }

  const {
   data:emailData,
   error:emailError
  }=await supabase.rpc(
   'get_auth_email_by_username',
   {p_username:login.trim()}
  );

  if(emailError||!emailData){
   setMsg('Username not found.');
   return;
  }

  const email=
   typeof emailData==='string'
    ?emailData
    :emailData?.email;

  const {error}=await supabase.auth.resetPasswordForEmail(
   email,
   {redirectTo:window.location.origin}
  );

  if(error){
   setMsg(error.message);
  }else{
   setMsg(
    'Password reset link sent to the registered email address.'
   );
  }
 }

 async function logout(){
  await supabase.auth.signOut();
  setUser(null);
  setIdle(0);
  setSection('dashboard');
  setService(null);
 }

 function openService(s){
  setService(s);
  setSection('service');
 }  async function createApp(e){
  e.preventDefault();
  setMsg('');

  if(!form.customer||!form.mobile||!form.work||!form.sub)
   return setMsg('Please fill all application fields.');

  const {data,error}=await supabase
   .from('applications')
   .insert({
    customer_name:form.customer.trim(),
    mobile_number:form.mobile.trim(),
    work_name:form.work,
    subwork_name:form.sub,
    service_fee:Number(form.fee||0),
    status:'RECEIVED',
    created_by:user.id
   })
   .select()
   .single();

  if(error){
   setMsg(error.message);
   return;
  }

  setApps(prev=>[data,...prev]);

  setForm({
   customer:'',
   mobile:'',
   work:'',
   sub:'',
   fee:''
  });

  setMsg('Application created successfully.');
  setSection('dashboard');
 }

 async function saveUser(e){
  e.preventDefault();
  setMsg('');

  if(user?.role!=='Master')return;

  if(
   !userForm.username||
   !userForm.name||
   !userForm.email||
   !userForm.password
  ){
   return setMsg(
    'Username, name, email and password are required.'
   );
  }

  const role=String(userForm.role).toUpperCase();

  if(!['ADMIN','EMPLOYEE'].includes(role)){
   return setMsg(
    'Only Admin or Employee accounts can be created.'
   );
  }

  const body={
   action:'create',
   profile:{
    username:userForm.username.toUpperCase().trim(),
    full_name:userForm.name.trim(),
    role,
    mobile:userForm.mobile.trim(),
    email:userForm.email.trim()
   },
   password:userForm.password
  };

  const {data,error}=await supabase.functions.invoke(
   'admin-users',
   {body}
  );

  if(error){
   setMsg(
    error.message||
    'User management request failed.'
   );
   return;
  }

  if(data?.error){
   setMsg(data.error);
   return;
  }

  setMsg('User added successfully.');

  setUserForm({
   username:'',
   name:'',
   role:'Admin',
   mobile:'',
   email:'',
   password:''
  });

  const {
   data:{session}
  }=await supabase.auth.getSession();

  if(session){
   await loadData(session.user);
  }
 }

 async function editUser(u){
  setUserForm({
   id:u.id,
   username:u.username||'',
   name:u.full_name||'',
   role:roleLabel(u.role),
   mobile:u.mobile||'',
   email:u.email||'',
   password:''
  });

  setSection('users');
  setMsg('');
 }

 async function updateUser(e){
  e.preventDefault();
  setMsg('');

  if(user?.role!=='Master')return;

  if(
   !userForm.id||
   !userForm.username||
   !userForm.name||
   !userForm.email
  ){
   return setMsg(
    'Username, name and email are required.'
   );
  }

  const role=String(userForm.role).toUpperCase();

  if(!['ADMIN','EMPLOYEE'].includes(role)){
   return setMsg(
    'Only Admin or Employee roles are allowed.'
   );
  }

  const profile={
   username:userForm.username.toUpperCase().trim(),
   full_name:userForm.name.trim(),
   role,
   mobile:userForm.mobile.trim(),
   email:userForm.email.trim()
  };

  const body={
   action:'update',
   id:userForm.id,
   profile
  };

  if(userForm.password){
   if(userForm.password.length<6){
    return setMsg(
     'Password must be at least 6 characters.'
    );
   }

   body.password=userForm.password;
  }

  const {data,error}=await supabase.functions.invoke(
   'admin-users',
   {body}
  );

  if(error){
   setMsg(
    error.message||
    'Unable to update user.'
   );
   return;
  }

  if(data?.error){
   setMsg(data.error);
   return;
  }

  setMsg('User updated successfully.');

  setUserForm({
   username:'',
   name:'',
   role:'Admin',
   mobile:'',
   email:'',
   password:''
  });

  const {
   data:{session}
  }=await supabase.auth.getSession();

  if(session){
   await loadData(session.user);
  }
 }

 async function removeUser(id,username){
  if(
   user?.role!=='Master'||
   username==='MASTER'
  )return;

  if(!window.confirm(`Remove ${username}?`))return;

  const {data,error}=await supabase.functions.invoke(
   'admin-users',
   {
    body:{
     action:'delete',
     id
    }
   }
  );

  if(error){
   setMsg(
    error.message||
    'Unable to remove user.'
   );
   return;
  }

  if(data?.error){
   setMsg(data.error);
   return;
  }

  setMsg('User removed successfully.');

  const {
   data:{session}
  }=await supabase.auth.getSession();

  if(session){
   await loadData(session.user);
  }
 }

 if(loading&&!user){
  return (
   <div className="login">
    <div className="loginCard">
     <div className="brandMark">MI</div>
     <h1>MIRACLE INFOTECH</h1>
     <p>Checking secure login…</p>
    </div>
   </div>
  );
 }

 if(!user){
  return (
   <div className="login">
    <div className="loginCard">
     <div className="brandMark">MI</div>
     <h1>MIRACLE INFOTECH</h1>
     <p>Internet Center Management Portal</p>

     {authMode==='login'&&(
      <>
       <form onSubmit={doLogin}>
        <input
         placeholder="Username"
         autoComplete="username"
         value={login}
         onChange={e=>setLogin(e.target.value)}
        />

        <input
         placeholder="Password"
         autoComplete="current-password"
         type="password"
         value={pw}
         onChange={e=>setPw(e.target.value)}
        />

        <button disabled={loading}>
         {loading?'Signing in…':'Sign In'}
        </button>
       </form>

       <div className="authLinks">
        <button
         type="button"
         onClick={()=>{
          setAuthMode('forgot');
          setMsg('');
         }}
        >
         Forgot Password?
        </button>
       </div>

       <small>
        Secure login powered by Supabase Authentication.
       </small>
      </>
     )}

     {authMode==='forgot'&&(
      <form
       onSubmit={e=>{
        e.preventDefault();
        sendReset();
       }}
      >
       <input
        placeholder="Username"
        autoComplete="username"
        value={login}
        onChange={e=>setLogin(e.target.value)}
       />

       <button type="submit">
        Send Reset Link
       </button>

       <button
        type="button"
        className="secondaryBtn"
        onClick={()=>{
         setAuthMode('login');
         setMsg('');
        }}
       >
        Back to Sign In
       </button>
      </form>
     )}

     {msg&&(
      <div className="error">
       {msg}
      </div>
     )}
    </div>
   </div>
  );
 }

 const filtered=apps.filter(a=>
  (
   a.customer_name+
   a.mobile_number+
   a.work_name+
   (a.subwork_name||'')+
  (a.status||'')
   .toLowerCase()
   .includes(search.toLowerCase())
 );

 const selected=service;
 const subs=selected?.sub||[];  return (
  <div className="app">

   <header>
    <div>
     <div className="logo">
      MIRACLE <span>INFOTECH</span>
     </div>
     <div className="tag">INTERNET CENTER</div>
    </div>

    <div className="topRight">

     <div className="userChip">
      <div className="avatar">
       {user.full_name?.[0]||'U'}
      </div>

      <div>
       <b>{user.full_name}</b>
       <small>
        {user.role} · Secure session
       </small>
      </div>
     </div>

     <div className="clock">
      <Clock3 size={17}/>
      <span>
       {now.toLocaleDateString('en-IN')}
       <br/>
       <b>{now.toLocaleTimeString('en-IN')}</b>
      </span>
     </div>

     <button
      className="logout"
      onClick={logout}
     >
      <LogOut size={17}/>
      Logout
     </button>

    </div>
   </header>

   <main>

    <aside>

     <button
      className={
       section==='dashboard'
        ?'nav active'
        :'nav'
      }
      onClick={()=>{
       setSection('dashboard');
       setService(null);
      }}
     >
      <LayoutDashboard/>
      Dashboard
     </button>

     <button
      className={
       section==='create'
        ?'nav active'
        :'nav'
      }
      onClick={()=>setSection('create')}
     >
      <Plus/>
      Create Application
     </button>

     <button
      className={
       section==='applications'
        ?'nav active'
        :'nav'
      }
      onClick={()=>setSection('applications')}
     >
      <FileEdit/>
      Application Modification
     </button>

     {user.role==='Master'&&(
      <button
       className={
        section==='users'
         ?'nav active'
         :'nav'
       }
       onClick={()=>setSection('users')}
      >
       <Users/>
       User Management
      </button>
     )}

     <div className="sideTitle">
      SERVICES
     </div>

     {services.map(s=>(
      <button
       className="nav"
       key={s.id}
       onClick={()=>openService(s)}
      >
       <s.icon/>
       {s.name}
       <ChevronRight
        size={14}
        className="push"
       />
      </button>
     ))}

    </aside>

    <section className="content">

     <div className="searchBar">
      <Search size={18}/>
      <input
       placeholder="Search applications, customer, mobile, work..."
       value={search}
       onChange={e=>setSearch(e.target.value)}
      />
     </div>

     {section==='dashboard'&&(
      <>
       <div className="welcome">

        <div>
         <div className="eyebrow">
          WORKSPACE
         </div>

         <h2>
          Welcome, {user.full_name}
         </h2>

         <p>
          Manage your internet center applications from one place.
         </p>
        </div>

        <button
         onClick={()=>setSection('create')}
        >
         <Plus size={18}/>
         New Application
        </button>

       </div>

       <div className="stats">

        {[
         ['Total Applications',stats.total,Activity],
         ['Received',stats.received,Inbox],
         ['Processed',stats.processed,LoaderCircle],
         ['Pending',stats.pending,Hourglass],
         ['Completed',stats.completed,CheckCircle2]
        ].map(([n,v,I])=>(
         <div
  className="stat"
  key={n}
  onClick={()=>{
    if(n==='Pending'){
      setSection('applications');
      setSearch('PENDING');
    }
  }}
  style={
    n==='Pending'
      ?{cursor:'pointer'}
      :undefined
  }
>
          <div className="statIcon">
           <I/>
          </div>

          <div>
           <span>{n}</span>
           <strong>{v}</strong>
          </div>
         </div>
        ))}

       </div>

       <h3>Services</h3>

       <div className="serviceGrid">

        {services.map(s=>(
         <button
          className="serviceCard"
          key={s.id}
          onClick={()=>openService(s)}
         >

          <div className="serviceImageWrap">
           <img
            className="serviceImage"
            src={s.image}
            alt={s.name}
           />

           <div className="serviceImageIcon">
            <s.icon/>
           </div>
          </div>

          <b>{s.name}</b>

          <span>
           {s.sub.length} sub-services
          </span>

          <ChevronRight/>

         </button>
        ))}

       </div>

       <h3>Recent Applications</h3>

       <AppsTable
        data={filtered.slice(0,8)}
       />

      </>
     )}

     {section==='service'&&selected&&(
      <>
       <div className="pageHead">

        <div>
         <div className="eyebrow">
          SERVICE
         </div>

         <h2>
          {selected.name}
         </h2>

         <p>
          Select a sub-work to enter its configured URL.
         </p>
        </div>

        <button
         className="back"
         onClick={()=>setSection('dashboard')}
        >
         Back to Dashboard
        </button>

       </div>

       <div className="subGrid">

        {subs.map((x,i)=>(
         <button
          className="subCard"
          key={x}
          onClick={()=>
           window.open(
            selected.urls[i],
            '_blank',
            'noopener,noreferrer'
           )
          }
         >

          <div className="smallIcon">
           <selected.icon/>
          </div>

          <div>
           <b>{x}</b>
           <span>Open service URL</span>
          </div>

          <ExternalLink/>

         </button>
        ))}

       </div>
      </>
     )}

     {section==='create'&&(
      <>
       <div className="pageHead">
        <div>
         <div className="eyebrow">
          APPLICATIONS
         </div>

         <h2>
          Create Application
         </h2>

         <p>
          Enter customer and service details.
         </p>
        </div>
       </div>

       <form
        className="formCard"
        onSubmit={createApp}
       >

        <label>
         Customer Name
         <input
          value={form.customer}
          onChange={e=>
           setForm({
            ...form,
            customer:e.target.value
           })
          }
         />
        </label>

        <label>
         Mobile Number
         <input
          inputMode="numeric"
          maxLength="10"
          value={form.mobile}
          onChange={e=>
           setForm({
            ...form,
            mobile:e.target.value
           })
          }
         />
        </label>

        <label>
         Work

         <select
          value={form.work}
          onChange={e=>{
           const s=services.find(
            x=>x.name===e.target.value
           );

           setForm({
            ...form,
            work:e.target.value,
            sub:'',
            fee:s?.fee||''
           });
          }}
         >

          <option value="">
           Select work
          </option>

          {services.map(s=>(
           <option key={s.name}>
            {s.name}
           </option>
          ))}

         </select>
        </label>

        <label>
         Sub-work

         <select
          value={form.sub}
          disabled={!form.work}
          onChange={e=>
           setForm({
            ...form,
            sub:e.target.value
           })
          }
         >

          <option value="">
           Select sub-work
          </option>

          {services
           .find(s=>s.name===form.work)
           ?.sub.map(x=>(
            <option key={x}>
             {x}
            </option>
           ))
          }

         </select>
        </label>

        <label>
         Default / Service Fee

         <input
          type="number"
          min="0"
          value={form.fee}
          onChange={e=>
           setForm({
            ...form,
            fee:e.target.value
           })
          }
         />
        </label>

        <div className="formActions">

         <button type="submit">
          <Plus/>
          Create Application
         </button>

         <button
          type="button"
          className="secondary"
          onClick={()=>
           setSection('dashboard')
          }
         >
          Cancel
         </button>

        </div>

        {msg&&(
         <div className="success">
          {msg}
         </div>
        )}

       </form>
      </>
     )}

     {section==='users'&&user.role==='Master'&&(
      <>
       <div className="pageHead">

        <div>
         <div className="eyebrow">
          MASTER CONTROL
         </div>

         <h2>
          User Management
         </h2>

         <p>
          Add, edit and manage Admin and Employee accounts.
         </p>
        </div>

       </div>

       <form
        className="formCard"
        onSubmit={
         userForm.id
          ?updateUser
          :saveUser
        }
       >

        <label>
         Username
         <input
          value={userForm.username}
          onChange={e=>
           setUserForm({
            ...userForm,
            username:e.target.value
           })
          }
          placeholder="ADMIN / EMPLOYEE"
         />
        </label>

        <label>
         Name
         <input
          value={userForm.name}
          onChange={e=>
           setUserForm({
            ...userForm,
            name:e.target.value
           })
          }
         />
        </label>

        <label>
         Role

         <select
          value={userForm.role}
          onChange={e=>
           setUserForm({
            ...userForm,
            role:e.target.value
           })
          }
         >
          <option>Admin</option>
          <option>Employee</option>
         </select>
        </label>

        <label>
         Mobile Number
         <input
          value={userForm.mobile}
          onChange={e=>
           setUserForm({
            ...userForm,
            mobile:e.target.value
           })
          }
         />
        </label>

        <label>
         Email
         <input
          type="email"
          value={userForm.email}
          onChange={e=>
           setUserForm({
            ...userForm,
            email:e.target.value
           })
          }
         />
        </label>

        <label>
         Password
         <input
          type="password"
          value={userForm.password}
          onChange={e=>
           setUserForm({
            ...userForm,
            password:e.target.value
           })
          }
          placeholder={
           userForm.id
            ?'Leave blank to keep current'
            :'6+ characters'
          }
         />
        </label>

        <div className="formActions">

         <button type="submit">
          <Plus/>
          {userForm.id
           ?'Update User'
           :'Save User'}
         </button>

         {userForm.id&&(
          <button
           type="button"
           className="secondary"
           onClick={()=>
            setUserForm({
             username:'',
             name:'',
             role:'Admin',
             mobile:'',
             email:'',
             password:''
            })
           }
          >
           Cancel Edit
          </button>
         )}

        </div>

        {msg&&(
         <div className="success">
          {msg}
         </div>
        )}

       </form>

       <h3>Accounts</h3>

       <div className="tableCard">

        <div className="tableHead">
         <span>Username / Name</span>
         <span>Role</span>
         <span>Mobile</span>
         <span>Email</span>
         <span>Action</span>
        </div>

        {allUsers.map(u=>(
         <div
          className="row"
          key={u.id}
         >

          <div>
           <b>{u.username}</b>
           <small>{u.full_name}</small>
          </div>

          <div>
           {roleLabel(u.role)}
          </div>

          <div>
           {u.mobile||'—'}
          </div>

          <div>
           {u.email||'—'}
          </div>

          <div>

           {u.username==='MASTER'
            ?<span>Protected</span>
            :<>
             <button
              className="secondaryBtn"
              onClick={()=>editUser(u)}
             >
              Edit
             </button>

             {' '}

             <button
              className="dangerBtn"
              onClick={()=>
               removeUser(
                u.id,
                u.username
               )
              }
             >
              Remove
             </button>
            </>
           }

          </div>

         </div>
        ))}

       </div>
      </>
     )}

     {section==='applications'&&(
      <>
       <div className="pageHead">

        <div>
         <div className="eyebrow">
          APPLICATIONS
         </div>

         <h2>
          Application Modification
         </h2>

         <p>
          Search and update application status.
         </p>
        </div>

       </div>

       <AppsTable
        data={filtered}
        editable={
         user.role==='Master'||
         user.role==='Admin'
        }
        setApps={setApps}
       />

      </>
     )}

    </section>
   </main>

   <footer>
    <span>
     <ShieldCheck size={15}/>
     Secure workspace
    </span>

    <span>
     Auto logout after 20 minutes of inactivity
    </span>
   </footer>

  </div>
 );
}

function AppsTable({
 data,
 editable,
 setApps
}){

 return (
  <div className="tableCard">

   <div className="tableHead">
    <span>Customer</span>
    <span>Work / Sub-work</span>
    <span>Fee</span>
    <span>Status</span>
    <span>Created</span>
   </div>

   {data.length
    ?data.map(a=>(
     <div
      className="row"
      key={a.id}
     >

      <div>
       <b>{a.customer_name}</b>
<a
  href={`https://web.whatsapp.com/send?phone=91${String(a.mobile_number).replace(/\D/g,'')}`}
  target="_blank"
  rel="noopener noreferrer"
  style={{
    color:'#16803a',
    cursor:'pointer',
    textDecoration:'none',
    fontWeight:600
  }}
>
  {a.mobile_number}
</a>      </div>

      <div>
       <b>{a.work_name}</b>
       <small>{a.subwork_name}</small>
      </div>

      <div>
       ₹{a.service_fee}
      </div>

      <div>

       {editable
        ?<select
          value={a.status}
          onChange={async e=>{
           const status=e.target.value;

           const {error}=
            await supabase
             .from('applications')
             .update({status})
             .eq('id',a.id);

           if(error){
            return;
           }

           setApps(prev=>
            prev.map(x=>
             x.id===a.id
              ?{...x,status}
              :x
            )
           );
alert(`Status updated successfully!\n\nCustomer: ${a.customer_name}\nNew Status: ${status}`);
          }}
         >
          <option>RECEIVED</option>
          <option>PROCESSING</option>
          <option>PENDING</option>
          <option>COMPLETED</option>
          <option>CANCELLED</option>
         </select>

        :<span
          className={
           'pill '+
           String(a.status).toLowerCase()
          }
         >
          {a.status}
         </span>
       }

      </div>

      <small>
       {a.created_at
        ?new Date(
          a.created_at
         ).toLocaleString('en-IN')
        :'—'
       }
      </small>

     </div>
    ))
    :<div className="empty">
      No applications yet.
     </div>
   }

  </div>
 );
}
