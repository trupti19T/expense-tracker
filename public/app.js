import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs,
  deleteDoc, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const root = document.getElementById("app-root");
const nav = document.getElementById("main-nav");
const tools = document.getElementById("account-tools");
const notice = document.getElementById("notice");
const modal = document.getElementById("modal");
const CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Other"];
const MAX_AMOUNT = 9999999999.99;
let auth = null, db = null, currentUser = null, pendingDelete = null;
let expenses = [], incomes = [];

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c =>
  ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const money = value => Number(value || 0).toLocaleString("en-IN", {
  minimumFractionDigits: 2, maximumFractionDigits: 2
});
const todayISO = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
};
const dateDMY = value => {
  if (!value) return "";
  const [y,m,d] = value.split("-");
  return [d,m,y].join("-");
};
const userCollection = name => collection(db, "users", currentUser.uid, name);
const setNotice = (message, type="success") => {
  notice.innerHTML = message ? '<div class="flash '+type+'">'+escapeHtml(message)+'</div>' : "";
  if (message) window.scrollTo({top:0,behavior:"smooth"});
};
const go = path => { location.hash = path; };
const route = () => (location.hash.replace(/^#\/?/,"") || "home").split("?");

function renderNav() {
  if (currentUser) {
    nav.innerHTML = [
      ["home","Home"],["dashboard","Dashboard"],["add","Add Expense"],
      ["add-income","Add Income"],["report","Reports"]
    ].map(([p,t]) => '<a href="#/'+p+'">'+t+'</a>').join("");
    tools.innerHTML = '<span class="welcome-user">Hi, '+escapeHtml((currentUser.displayName || currentUser.email || "there").split(" ")[0])+'</span><button class="ghost small-button" id="sign-out">Sign out</button>';
    document.getElementById("sign-out").addEventListener("click", async () => {
      try { await signOut(auth); go("/"); setNotice("You have been signed out safely."); }
      catch (e) { setNotice(friendlyError(e), "error"); }
    });
  } else {
    nav.innerHTML = '<a href="#/login">Sign in</a><a href="#/register">Create account</a>';
    tools.innerHTML = "";
  }
}
function pageShell(title, content) {
  root.innerHTML = '<h1>'+title+'</h1><div class="divider">♥</div>'+content;
}
function landing() {
  const months = [
    ["January","❄️","#e4eaf1"],["February","💝","#fadcdf"],["March","🌱","#dfe9d3"],
    ["April","🌸","#f5efd9"],["May","🌷","#e9efdc"],["June","🌼","#fbe6d3"],
    ["July","🐚","#d6e6f2"],["August","🌻","#fbeab8"],["September","🍂","#f7e1cf"],
    ["October","🍁","#f6dcc0"],["November","🌾","#ecd6cc"],["December","🎄","#dbe7e4"]
  ];
  root.innerHTML = `
    <div class="hero">
      <p class="eyebrow">YOUR MONEY, YOUR LITTLE CORNER</p>
      <h1>My Expense Tracker</h1><div class="divider">♥</div>
      <p class="tagline">A calm, personal place to track your spending, see how much you save, and understand your money week by week, month by month and year by year.</p>
      ${currentUser ? '<a class="btn big" href="#/dashboard">Go to my dashboard →</a>' :
      '<div class="hero-actions"><a class="btn big" href="#/register">Create my free account →</a><a class="text-link" href="#/login">I already have an account</a></div><p class="privacy-note">Your account is private. Your financial entries are visible only after you sign in.</p>'}
    </div>
    <div class="features">
      <div class="card feature"><div class="icon">📝</div><h2>Add in seconds</h2><p>Record expenses and income with an amount, a category and a date.</p></div>
      <div class="card feature"><div class="icon">🗂️</div><h2>Category summary</h2><p>See your total spending and how it splits across your categories.</p></div>
      <div class="card feature"><div class="icon">🐷</div><h2>Savings tracker</h2><p>Find out how much you saved this week, this month and this year.</p></div>
      <div class="card feature"><div class="icon">📊</div><h2>Smart reports</h2><p>Switch between weekly, monthly and yearly reports.</p></div>
      <div class="card feature"><div class="icon">🎨</div><h2>Pick your theme</h2><p>Choose pink, green, blue, white, red or night.</p></div>
      <div class="card feature"><div class="icon">🔒</div><h2>Your own account</h2><p>Each account has its own private expenses and income.</p></div>
    </div>
    <div class="card"><h2>Every month, a fresh page</h2><div class="months">${months.map((m,i)=>'<div class="sticker" data-m="'+i+'" style="--tint:'+m[2]+'"><span>'+m[0]+'</span><i>'+m[1]+'</i></div>').join("")}</div></div>
    <div class="card"><h2>How it works</h2><ol class="steps"><li>Create your account.</li><li>Sign in to record expenses and income.</li><li>Watch your totals and savings update.</li><li>Open Reports to see weekly, monthly or yearly trends.</li><li>Delete an expense if you entered it by mistake.</li><li>Choose a theme with the colored dots above.</li></ol></div>
    <div class="cta"><a class="btn big" href="#/${currentUser ? 'dashboard' : 'register'}">${currentUser ? 'Open my dashboard' : 'Start tracking my money'}</a></div>`;
  const now = new Date();
  const currentSticker = root.querySelector('.sticker[data-m="'+now.getMonth()+'"]');
  if (currentSticker) currentSticker.classList.add("current");
}
function authForm(kind) {
  const register = kind === "register";
  pageShell(register ? "Create your account" : "Sign in", `
    <section class="card form-card auth-card">
      <p class="eyebrow">${register ? "A little more clarity, one day at a time" : "Welcome back"}</p>
      <p>${register ? "Your own private space to track income, expenses and savings." : "Your finances, right where you left them."}</p>
      <form id="auth-form" novalidate>
        ${register ? '<p><label for="name">Your name</label><input id="name" name="name" type="text" maxlength="80" autocomplete="name" required></p>' : ""}
        <p><label for="email">Email address</label><input id="email" name="email" type="email" maxlength="254" autocomplete="email" required></p>
        <p><label for="password">Password</label><input id="password" name="password" type="password" minlength="10" maxlength="128" autocomplete="${register?'new-password':'current-password'}" required>${register ? '<small>Use at least 10 characters.</small>' : ""}</p>
        ${register ? '<p><label for="confirm_password">Confirm password</label><input id="confirm_password" name="confirm_password" type="password" minlength="10" maxlength="128" autocomplete="new-password" required></p>' : ""}
        <button type="submit" id="auth-submit">${register ? "Create my account" : "Sign in"}</button>
      </form>
      <p>${register ? 'Already have an account? <a href="#/login">Sign in</a>' : 'New here? <a href="#/register">Create an account</a>'}</p>
    </section>`);
  document.getElementById("auth-form").addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.currentTarget, button = document.getElementById("auth-submit");
    const data = new FormData(form), email = String(data.get("email")||"").trim().toLowerCase();
    const password = String(data.get("password")||"");
    button.disabled = true;
    try {
      if (register) {
        const name = String(data.get("name")||"").trim();
        if (!name || name.length > 80) throw new Error("Please enter your name (up to 80 characters).");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Please enter a valid email address.");
        if (password.length < 10 || password.length > 128) throw new Error("Use a password between 10 and 128 characters.");
        if (password !== data.get("confirm_password")) throw new Error("The passwords do not match.");
        const credential = await createUserWithEmailAndPassword(auth,email,password);
        await updateProfile(credential.user,{displayName:name});
        await setDoc(doc(db,"users",credential.user.uid),{name,email,createdAt:serverTimestamp()});
        setNotice("Your account is ready. Welcome!");
      } else {
        if (!email || !password) throw new Error("Enter your email address and password.");
        await signInWithEmailAndPassword(auth,email,password);
        setNotice("You're signed in. Welcome back!");
      }
      go("/dashboard");
    } catch(err) { setNotice(friendlyError(err),"error"); }
    finally { button.disabled = false; }
  });
}
function formPage(kind) {
  const income = kind === "income";
  const title = income ? "Add Income" : "Add Expense";
  pageShell(title, `
    <div class="card form-card">
      <form id="entry-form" novalidate>
        <p><label for="description">${income ? "Income source" : "What did you spend on?"}</label><input id="description" type="text" maxlength="120" placeholder="${income ? "e.g. Salary, Pocket money" : ""}" required></p>
        <p><label for="amount">Amount (₹)</label><input id="amount" type="number" step="0.01" min="0.01" max="9999999999.99" required></p>
        ${income ? "" : '<p><label for="category">Category</label><select id="category" required>'+CATEGORIES.map(c=>'<option>'+c+'</option>').join("")+'</select></p>'}
        <p><label for="entry-date">Date</label><input id="entry-date" type="date" max="${todayISO()}" value="${todayISO()}" required></p>
        <button type="submit" id="save-entry">Save ${income ? "Income" : "Expense"}</button>
      </form>
      <p><a href="#/dashboard">← Back to dashboard</a></p>
    </div>`);
  document.getElementById("entry-form").addEventListener("submit", async e => {
    e.preventDefault();
    const button = document.getElementById("save-entry");
    const description = document.getElementById("description").value.trim();
    const amount = Number(document.getElementById("amount").value);
    const date = document.getElementById("entry-date").value;
    const category = document.getElementById("category")?.value;
    if (!description || description.length > 120) return setNotice("Please enter a description of up to 120 characters.","error");
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) return setNotice("Enter an amount greater than zero and within the allowed limit.","error");
    if (!date || date > todayISO()) return setNotice("Please choose a valid date that is not in the future.","error");
    if (!income && !CATEGORIES.includes(category)) return setNotice("Please choose a valid category.","error");
    button.disabled = true;
    try {
      const payload = income
        ? {source:description,amount,incomeDate:date,createdAt:serverTimestamp()}
        : {title:description,amount,category,expenseDate:date,createdAt:serverTimestamp()};
      await addDoc(userCollection(income ? "income" : "expenses"),payload);
      setNotice(income ? "Income saved." : "Expense saved.");
      go("/dashboard");
    } catch(err) { setNotice(friendlyError(err),"error"); }
    finally { button.disabled = false; }
  });
}
const sum = rows => rows.reduce((n,r)=>n+Number(r.amount||0),0);
function periodStart(kind) {
  const d = new Date(); d.setHours(0,0,0,0);
  if (kind==="week") d.setDate(d.getDate()-((d.getDay()+6)%7));
  if (kind==="month") d.setDate(1);
  if (kind==="year") { d.setMonth(0,1); }
  return d.toISOString().slice(0,10);
}
function savings(kind) {
  const start = periodStart(kind);
  const inc = sum(incomes.filter(r=>r.incomeDate>=start));
  const spent = sum(expenses.filter(r=>r.expenseDate>=start));
  return {income:inc,spent,saved:inc-spent};
}
function dashboard() {
  const total = sum(expenses);
  const groups = {};
  expenses.forEach(e => { groups[e.category] ||= {category:e.category,total:0,count:0}; groups[e.category].total+=Number(e.amount); groups[e.category].count++; });
  const summary = Object.values(groups).sort((a,b)=>b.total-a.total);
  const cards = ["week","month","year"].map((k,i)=>{
    const s=savings(k), label=["This week","This month","This year"][i];
    return '<div class="save-box"><div class="label">'+label+'</div><div class="amount '+(s.saved<0?'neg':'')+'">₹'+money(s.saved)+'</div><small>Income ₹'+money(s.income)+' · Spent ₹'+money(s.spent)+'</small></div>';
  }).join("");
  pageShell("Dashboard", `
    <div class="actions"><div class="sticker big"><span id="thisMonth"></span></div><a class="btn" href="#/add">+ Add Expense</a><a class="btn" href="#/add-income">+ Add Income</a><a class="btn" href="#/report">View Reports</a></div>
    <div class="card"><div>Total spent</div><p class="total">₹${money(total)}</p></div>
    <div class="card"><h2>My savings</h2><div class="savings-grid">${cards}</div><p class="hint">Savings = income − expenses for that period. Add your income to see accurate savings.</p></div>
    <div class="card"><h2>Spending by category</h2><div class="table-wrap"><table><tr><th>Category</th><th>No. of expenses</th><th>Total (₹)</th></tr>${summary.map(s=>'<tr><td>'+escapeHtml(s.category)+'</td><td>'+s.count+'</td><td>'+money(s.total)+'</td></tr>').join("") || '<tr><td colspan="3">No expenses yet.</td></tr>'}</table></div></div>
    <div class="card"><h2>All expenses</h2>${expenses.length ? '<div class="table-wrap"><table><tr><th>Date</th><th>What</th><th>Category</th><th>Amount (₹)</th><th>Action</th></tr>'+expenses.map(e=>'<tr><td>'+dateDMY(e.expenseDate)+'</td><td>'+escapeHtml(e.title)+'</td><td>'+escapeHtml(e.category)+'</td><td>'+money(e.amount)+'</td><td><button class="danger delete-expense" data-id="'+escapeHtml(e.id)+'" data-name="'+escapeHtml(e.title)+' (₹'+money(e.amount)+')">Delete</button></td></tr>').join("")+'</table></div>' : '<p class="empty-state">No expenses yet. Add your first one!</p>'}</div>`);
  document.getElementById("thisMonth").textContent = new Date().toLocaleString("en-IN",{month:"long",year:"numeric"});
  root.querySelectorAll(".delete-expense").forEach(btn=>btn.addEventListener("click",()=>{
    pendingDelete=btn.dataset.id; document.getElementById("modal-text").textContent=btn.dataset.name; modal.classList.add("show");
  }));
}
function startOfWeek(date) { const d=new Date(date+"T00:00:00"); d.setDate(d.getDate()-((d.getDay()+6)%7)); return d.toISOString().slice(0,10); }
function reportRows(view) {
  const groups = {};
  const keyFor = value => view==="week" ? startOfWeek(value) : view==="year" ? value.slice(0,4) : value.slice(0,7);
  expenses.forEach(e=>{const k=keyFor(e.expenseDate);groups[k] ||= {period:k,income:0,spent:0};groups[k].spent+=Number(e.amount);});
  incomes.forEach(e=>{const k=keyFor(e.incomeDate);groups[k] ||= {period:k,income:0,spent:0};groups[k].income+=Number(e.amount);});
  const limit={week:8,month:12,year:5}[view];
  return Object.keys(groups).sort().slice(-limit).map(k=>({...groups[k],saved:groups[k].income-groups[k].spent}));
}
function reportPage(view) {
  const rows=reportRows(view), biggest=Math.max(1,...rows.flatMap(r=>[r.income,r.spent]));
  const label=p=>view==="week"?"Week of "+dateDMY(p):view==="year"?p:new Date(p+"-01T00:00:00").toLocaleString("en-IN",{month:"short",year:"numeric"});
  pageShell("My Reports", `
    <div class="tabs"><a class="${view==="week"?"on":""}" href="#/report?view=week">Weekly</a><a class="${view==="month"?"on":""}" href="#/report?view=month">Monthly</a><a class="${view==="year"?"on":""}" href="#/report?view=year">Yearly</a></div>
    ${rows.length ? '<div class="card"><h2>Income vs spending</h2><div class="legend"><span><i class="li"></i>Income</span><span><i class="ls"></i>Spent</span></div><div class="chart">'+rows.map(r=>'<div class="bar-group"><div class="bars"><div class="bar income" style="height:'+Math.max(r.income?3:0,r.income/biggest*100)+'%" title="Income ₹'+money(r.income)+'"></div><div class="bar spent" style="height:'+Math.max(r.spent?3:0,r.spent/biggest*100)+'%" title="Spent ₹'+money(r.spent)+'"></div></div><div class="bar-label">'+escapeHtml(label(r.period))+'</div></div>').join("")+'</div></div><div class="card"><h2>Details</h2><div class="table-wrap"><table><tr><th>Period</th><th>Income (₹)</th><th>Spent (₹)</th><th>Saved (₹)</th></tr>'+[...rows].reverse().map(r=>'<tr><td>'+escapeHtml(label(r.period))+'</td><td>'+money(r.income)+'</td><td>'+money(r.spent)+'</td><td class="'+(r.saved<0?'neg':'pos')+'">'+money(r.saved)+'</td></tr>').join("")+'</table></div></div>' : '<div class="card"><p>No data yet. Add some expenses and income, and your report will appear here.</p><a class="btn" href="#/add">+ Add Expense</a></div>'}`);
}
function friendlyError(error) {
  const code=error?.code || "";
  const map={
    "auth/email-already-in-use":"An account with this email already exists. Please sign in instead.",
    "auth/invalid-email":"Please enter a valid email address.",
    "auth/invalid-credential":"Email or password is incorrect.",
    "auth/user-not-found":"Email or password is incorrect.",
    "auth/wrong-password":"Email or password is incorrect.",
    "auth/weak-password":"Choose a stronger password.",
    "auth/too-many-requests":"Too many attempts. Please wait a little and try again.",
    "permission-denied":"Your request was blocked by the database security rules. Please check the Firebase setup.",
    "unavailable":"The service is temporarily unavailable. Please try again."
  };
  return map[code] || error?.message || "Something went wrong. Please try again.";
}
async function loadRecords() {
  const [expenseSnap,incomeSnap]=await Promise.all([
    getDocs(query(userCollection("expenses"),orderBy("expenseDate","desc"))),
    getDocs(query(userCollection("income"),orderBy("incomeDate","desc")))
  ]);
  expenses=expenseSnap.docs.map(d=>({id:d.id,...d.data()}));
  incomes=incomeSnap.docs.map(d=>({id:d.id,...d.data()}));
}
async function render() {
  renderNav();
  setNotice("");
  const [path,queryString]=route();
  if (path==="home" || path==="") return landing();
  if (["login","register"].includes(path)) {
    if (currentUser) return go("/dashboard");
    return authForm(path);
  }
  if (!currentUser) { go("/login"); return; }
  root.innerHTML='<section class="card loading"><h2>One moment…</h2><p>Loading your private records.</p></section>';
  try {
    await loadRecords();
    if (path==="dashboard") dashboard();
    else if (path==="add") formPage("expense");
    else if (path==="add-income") formPage("income");
    else if (path==="report") {
      const view=new URLSearchParams(queryString||"").get("view") || "month";
      reportPage(["week","month","year"].includes(view)?view:"month");
    } else dashboard();
  } catch(e) {
    pageShell("Something went wrong",'<section class="card"><p class="error">'+escapeHtml(friendlyError(e))+'</p><p>Please refresh and try again.</p></section>');
  }
}
document.getElementById("cancel-delete").addEventListener("click",()=>{pendingDelete=null;modal.classList.remove("show");});
document.getElementById("confirm-delete").addEventListener("click",async()=>{
  if (!pendingDelete || !currentUser) return;
  const id=pendingDelete; pendingDelete=null; modal.classList.remove("show");
  try { await deleteDoc(doc(db,"users",currentUser.uid,"expenses",id)); setNotice("Expense deleted."); await render(); }
  catch(e) { setNotice(friendlyError(e),"error"); }
});
modal.addEventListener("click",e=>{if(e.target===modal){pendingDelete=null;modal.classList.remove("show");}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){pendingDelete=null;modal.classList.remove("show");}});
window.addEventListener("hashchange",render);

if (!isFirebaseConfigured) {
  renderNav();
  pageShell("Almost ready!",'<section class="card form-card"><p>Your application interface is in place. To activate sign-in and data storage, connect a Firebase project by following <a href="https://firebase.google.com/docs/web/setup">the Firebase setup guide</a> and adding its web app configuration to <code>firebase-config.js</code>.</p><p>Do not paste service-account keys or private credentials into this file.</p></section>');
} else {
  try {
    const app=initializeApp(firebaseConfig);
    auth=getAuth(app); db=getFirestore(app);
    onAuthStateChanged(auth,async user=>{
      currentUser=user;
      if (user) {
        try {
          const profile=await getDoc(doc(db,"users",user.uid));
          if (!profile.exists()) await setDoc(doc(db,"users",user.uid),{name:user.displayName||"",email:user.email||"",createdAt:serverTimestamp()});
        } catch(e) { console.error("Profile check failed",e); }
      }
      await render();
    });
  } catch(e) {
    console.error(e);
    pageShell("Firebase setup needs attention",'<section class="card"><p class="error">The Firebase configuration could not be loaded. Please verify public/firebase-config.js.</p></section>');
  }
}
