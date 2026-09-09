
'use strict';

/* perf: load the Excel library only when an export actually needs it */
function ensureXlsx(cb){
  if(window.XLSX){ cb(); return; }
  if(ensureXlsx._p){ ensureXlsx._p.then(cb,function(){}); return; }
  if(typeof toastN==='function') toastN('Preparing Excel\u2026');
  ensureXlsx._p=new Promise(function(res,rej){
    var sc=document.createElement('script'); sc.src='xlsx.min.js'; sc.async=true;
    sc.onload=function(){res();}; sc.onerror=function(){ensureXlsx._p=null;rej(new Error('xlsx-load-failed'));};
    document.head.appendChild(sc);
  });
  ensureXlsx._p.then(cb,function(){ if(typeof toastN==='function') toastN('Excel module failed to load'); });
}

/* ================= constants ================= */
var KEY = 'habits_v2';
var OLDKEY = 'habits_v1';
var EMOJIS = ['💪','🏃','📚','💧','🧘','🛏️','🥗','✍️','🎯','🎸','🚭','💊','🦷','🌅','🧹','💻','🗣️','🚴','🙏','🍎','💤','📵','🎨','💰'];
var COLORS = ['#FFAE1F','#FF6B5E','#F06BB3','#9B7BFF','#4EA8FF','#2FC6A0','#7ED957','#8B93A7'];
var MILES = [7,14,21,30,50,66,100,150,200,365,500,1000];
var QUOTES = [
 'Small steps, taken daily, quietly become who you are.',
 'You don\'t need a perfect day. You need a linked one.',
 'The chain doesn\'t care how you feel. Just add today\'s link.',
 'Discipline is choosing the chain over the mood.',
 'A two-minute version still counts. Keep the link.',
 'Missing once is an accident. Missing twice is a decision.',
 'You are one small win away from momentum.',
 'Consistency beats intensity, every single week.',
 'Today\'s link is the only one you can forge.',
 'Habits are votes for the person you\'re becoming.',
 'Do it badly if you must \u2014 just do it today.',
 'The streak isn\'t the goal. The person it builds is.',
 'Show up small today so you can show up big later.',
 'Your future self is watching today\'s link.',
 'Every unbroken week is a promise kept to yourself.',
 'Motivation starts the chain. Identity keeps it.',
 'One day at a time is how every long chain was built.',
 'Protect the streak on hard days \u2014 those links count double.',
 'What you repeat, you become. Choose the repeat.',
 'The best time to add a link is right now.'
];
var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5L19.5 7"/></svg>';
var TEMPLATES = [
 {n:'Drink water', e:'\uD83D\uDCA7', ty:'count', t:8, u:'cups'},
 {n:'Read', e:'\uD83D\uDCDA', ty:'count', t:10, u:'pages', cat:'Study'},
 {n:'Gym', e:'\uD83D\uDCAA', ty:'check', sk:'wquota', q:3, cat:'Fitness'},
 {n:'Meditate', e:'\uD83E\uDDD8', ty:'time', t:10, sec:'morning', cat:'Mind'},
 {n:'Walk', e:'\uD83C\uDFC3', ty:'time', t:30, cat:'Fitness'},
 {n:'Sleep by 11', e:'\uD83D\uDCA4', ty:'check', sec:'evening'},
 {n:'No smoking', e:'\uD83D\uDEAD', ty:'neg'},
 {n:'No junk food', e:'\uD83C\uDF4E', ty:'neg'},
 {n:'Save money', e:'\uD83D\uDCB0', ty:'money', t:100, cat:'Finance'},
 {n:'Journal', e:'\u270D\uFE0F', ty:'check', sec:'evening', cat:'Mind'}
];
var MOODS = [
 {l:'Excellent', e:'\uD83E\uDD29', c:'#FFAE1F', s:7},
 {l:'Happy',     e:'\uD83D\uDE04', c:'#7ED957', s:6},
 {l:'Calm',      e:'\uD83D\uDE0C', c:'#2FC6A0', s:5},
 {l:'Neutral',   e:'\uD83D\uDE10', c:'#8B93A7', s:4},
 {l:'Tired',     e:'\uD83D\uDE34', c:'#9B7BFF', s:3},
 {l:'Sad',       e:'\uD83D\uDE22', c:'#4EA8FF', s:2},
 {l:'Stressed',  e:'\uD83D\uDE16', c:'#FF6B5E', s:1}
];
var nat = (typeof Bridge !== 'undefined') ? Bridge : null;

/* ================= helpers ================= */
function $(id){ return document.getElementById(id); }
function esc(t){ return String(t).replace(/[&<>"']/g, function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function pad(n){ return n < 10 ? '0' + n : '' + n; }
function fmt(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
function today(){ return fmt(new Date()); }
function toDate(s){ var p = s.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
function addDays(d, n){ var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
function dayDiff(a, b){ return Math.round((toDate(b) - toDate(a)) / 86400000); }
function monKey(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1); }
function weekStart(d){ var x = new Date(d.getTime()); var off = (x.getDay()+6)%7; x.setDate(x.getDate()-off); return x; }
function hexRgba(hex, a){
  var h = hex.replace('#','');
  var r = parseInt(h.substr(0,2),16), g = parseInt(h.substr(2,2),16), b = parseInt(h.substr(4,2),16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}
function buzz(ms){ if(navigator.vibrate){ try{ navigator.vibrate(ms); }catch(e){} } }
function intHash(s){ var h = 5381; for(var i=0;i<s.length;i++){ h = ((h<<5)+h+s.charCodeAt(i))|0; } return (h>>>0)%2000000000; }
function timeFmt(hm){ var p = hm.split(':'); var d = new Date(); d.setHours(+p[0], +p[1]);
  return d.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'}); }
function niceDate(iso){ return toDate(iso).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}); }
function toastN(m){ if(nat){ try{ nat.toast(m); return; }catch(e){} } }

/* ================= state ================= */
function normHabit(h){
  h.id = h.id || (Date.now().toString(36) + Math.random().toString(36).slice(2,7));
  h.name = h.name || 'Habit';
  h.emoji = h.emoji || '\u2B50'; h.color = h.color || COLORS[0];
  h.cat = h.cat || 'Other'; h.notes = h.notes || ''; h.quote = h.quote || '';
  h.type = h.type || 'check';
  h.target = Math.max(1, +h.target || 1);
  h.unit = h.unit || '';
  h.sched = h.sched || {kind:'daily'};
  h.sched.kind = h.sched.kind || 'daily';
  if(!h.sched.dows || !h.sched.dows.length) h.sched.dows = [1,2,3,4,5];
  h.sched.x = Math.max(2, +h.sched.x || 2);
  h.sched.quota = Math.max(1, +h.sched.quota || 3);
  h.section = h.section || 'any';
  h.rem = h.rem || {times:[], repeat:false, missed:false};
  h.rem.times = h.rem.times || [];
  h.created = h.created || today();
  h.start = h.start || h.created;
  h.end = h.end || '';
  h.done = h.done || {}; h.frozen = h.frozen || {};
  h.arch = !!h.arch; h.archAt = h.archAt || '';
  h.dnotes = h.dnotes || {};
  if(typeof h.fz !== 'number') h.fz = 1;
  return h;
}
function defaultCats(){
  return {
    'Food': ['Groceries','Restaurants','Food Delivery','Snacks','Coffee'],
    'Transport': ['Fuel','Taxi','Public Transport','Parking','Toll'],
    'Shopping': ['Clothing','Electronics','Household','Personal Care'],
    'Bills & Utilities': ['Electricity','Internet','Mobile','Gas','Water'],
    'Entertainment': ['Movies','Games','Events','Subscriptions'],
    'Health': ['Medicine','Doctor','Fitness'],
    'Other': []
  };
}
function inr(n){
  var neg = n < 0; n = Math.abs(Math.round(n));
  var s2 = String(n), out;
  if(s2.length <= 3) out = s2;
  else { var last3 = s2.slice(-3), rest = s2.slice(0, -3);
    out = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3; }
  return (neg ? '-' : '') + (state.set.curr || '\u20B9') + out;
}

function normTask(t){
  t=t||{};
  t.id=t.id||('k'+Date.now().toString(36)+Math.random().toString(36).slice(2,8));
  t.title=String(t.title||'Task').trim().slice(0,100)||'Task';
  t.description=String(t.description||'').slice(0,1000);
  if(['open','inprogress','completed'].indexOf(t.status)<0)t.status='open';
  if(['high','medium','low'].indexOf(t.priority)<0)t.priority='medium';
  t.dueDate=/^\d{4}-\d{2}-\d{2}$/.test(t.dueDate||'')?t.dueDate:'';
  t.dueTime=/^([01]\d|2[0-3]):[0-5]\d$/.test(t.dueTime||'')?t.dueTime:'';
  t.reminders=Array.isArray(t.reminders)?t.reminders.filter(function(n){return n===1||n===2;}):[];
  t.reminders=[].concat(t.reminders).filter(function(v,i,a){return a.indexOf(v)===i;}).sort(function(a,b){return a-b;});
  t.recurrence=t.recurrence&&typeof t.recurrence==='object'?t.recurrence:{};
  if(['none','daily','weekdays','weekly','monthly','custom'].indexOf(t.recurrence.freq)<0)t.recurrence.freq='none';
  t.recurrence.interval=Math.max(1,Math.min(365,Number(t.recurrence.interval)||1));
  if(t.recurrence.freq==='monthly')t.recurrence.dayOfMonth=Math.max(1,Math.min(31,Number(t.recurrence.dayOfMonth)||(+String(t.dueDate||'').slice(-2)||1)));
  t.recurrence.endDate=/^\d{4}-\d{2}-\d{2}$/.test(t.recurrence.endDate||'')?t.recurrence.endDate:'';
  if(!Array.isArray(t.subtasks))t.subtasks=[];
  t.subtasks=t.subtasks.map(function(st){st=st||{};return{id:String(st.id||('s'+Math.random().toString(36).slice(2,8))),title:String(st.title||'').trim().slice(0,120),done:!!st.done};}).filter(function(st){return !!st.title;});
  if(!Array.isArray(t.comments))t.comments=[];
  t.comments=t.comments.map(function(c){c=c||{};return{id:String(c.id||('c'+Math.random().toString(36).slice(2,8))),text:String(c.text||'').trim().slice(0,1000),createdAt:Number(c.createdAt)||Date.now(),updatedAt:Number(c.updatedAt)||Number(c.createdAt)||Date.now()};}).filter(function(c){return !!c.text;});
  t.linkedHabitId=String(t.linkedHabitId||'');
  t.linkedHabitOccurrenceDate=/^\d{4}-\d{2}-\d{2}$/.test(t.linkedHabitOccurrenceDate||'')?t.linkedHabitOccurrenceDate:'';
  t.seriesId=String(t.seriesId||'');
  t.occurrenceKey=String(t.occurrenceKey||'');
  t.createdAt=Number(t.createdAt)||Date.now(); t.updatedAt=Number(t.updatedAt)||t.createdAt; t.completedAt=Number(t.completedAt)||0;
  return t;
}
function taskEffectiveStatus(t){if(!t)return 'open';if(t.status==='completed')return 'completed';if(t.dueDate){var due=new Date(t.dueDate+'T'+(t.dueTime||'23:59'));if(due.getTime()<Date.now())return 'overdue';}return t.status||'open';}
function taskDueMs(t){if(!t||!t.dueDate)return Infinity;var tm=t.dueTime||'23:59';return new Date(t.dueDate+'T'+tm).getTime();}
function taskIsOverdue(t){return taskEffectiveStatus(t)==='overdue';}
function taskNextDate(t){if(!t||!t.dueDate)return '';var d=toDate(t.dueDate),f=t.recurrence&&t.recurrence.freq||'none';if(f==='daily')return fmt(addDays(d,1));if(f==='weekdays'){var n=addDays(d,1);while(n.getDay()===0||n.getDay()===6)n=addDays(n,1);return fmt(n);}if(f==='weekly')return fmt(addDays(d,7));if(f==='monthly'){var day=Number(t.recurrence&&t.recurrence.dayOfMonth)||d.getDate(),n=new Date(d.getFullYear(),d.getMonth()+1,1),last=new Date(n.getFullYear(),n.getMonth()+1,0).getDate();return fmt(new Date(n.getFullYear(),n.getMonth(),Math.min(day,last)));}if(f==='custom')return fmt(addDays(d,Math.max(1,Number(t.recurrence.interval)||1)));return '';}
function taskOccurrenceExists(seriesId,dueDate){return !!state.tasks.find(function(x){return x.seriesId===seriesId&&x.dueDate===dueDate;});}
function taskCreateNextOccurrence(t){var f=t&&t.recurrence&&t.recurrence.freq||'none';if(!t||f==='none'||!t.dueDate)return null;var nd=taskNextDate(t),guard=0;while(nd&&nd<=today()&&guard++<100) {var probe=JSON.parse(JSON.stringify(t));probe.dueDate=nd;nd=taskNextDate(probe);}if(!nd)return null;if(t.recurrence.endDate&&nd>t.recurrence.endDate)return null;if(taskOccurrenceExists(t.seriesId||t.id,nd))return null;var nt=JSON.parse(JSON.stringify(t));nt.id='k'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);nt.seriesId=t.seriesId||t.id;nt.occurrenceKey=nt.seriesId+'|'+nd;nt.dueDate=nd;nt.status='open';nt.completedAt=0;nt.createdAt=Date.now();nt.updatedAt=nt.createdAt;nt.subtasks=(nt.subtasks||[]).map(function(st){st.done=false;st.id='s'+Math.random().toString(36).slice(2,8);return st;});state.tasks.push(normTask(nt));return nt;}
function taskMatches(t,q){if(!q)return true;q=String(q).toLowerCase();if(String(t.title).toLowerCase().indexOf(q)>=0||String(t.description).toLowerCase().indexOf(q)>=0)return true;return (t.subtasks||[]).some(function(s){return String(s.title).toLowerCase().indexOf(q)>=0;});}
function taskFindByQuery(q){var all=state.tasks.filter(function(t){return taskMatches(t,q);});if(all.length===1)return all[0];var ex=all.filter(function(t){return t.title.toLowerCase()===String(q||'').toLowerCase();});if(ex.length===1)return ex[0];return null;}
function taskDateLabel(t){if(!t.dueDate)return 'No due date';var ds=t.dueDate===today()?'Today':niceDate(t.dueDate);return ds+(t.dueTime?' · '+timeFmt(t.dueTime):'');}
function taskSubProgress(t){var a=t.subtasks||[],done=a.filter(function(s){return s.done;}).length;return{done:done,total:a.length};}
function taskRelevantHabitToday(h){if(!h||h.arch)return false;var d=new Date(),ds=today();if(!dueOn(h,d)||isFroz(h,ds))return false;return true;}
function taskHabitVirtuals(){var out=[];for(var i=0;i<state.habits.length;i++){var h=state.habits[i];if(taskRelevantHabitToday(h)){var done=isDone(h,today());out.push({id:'habit:'+h.id+':'+today(),title:h.name,description:'Habit occurrence for today',status:done?'completed':'open',priority:'medium',dueDate:today(),dueTime:'',reminders:[],recurrence:{freq:'none'},subtasks:[],linkedHabitId:h.id,linkedHabitOccurrenceDate:today(),createdAt:0,updatedAt:0,virtualHabit:true});}}return out;}
function taskAllVisible(){return state.tasks.concat(taskHabitVirtuals());}
function taskRangeBounds(mode){var now=new Date(),ts=today(),from=ts,to=ts;if(mode==='week'){var w=weekStart(now);from=fmt(w);to=fmt(addDays(w,6));}else if(mode==='next7'){from=ts;to=fmt(addDays(now,6));}else if(mode==='month'){from=ts.slice(0,8)+'01';to=fmt(new Date(now.getFullYear(),now.getMonth()+1,0));}return{from:from,to:to};}

function normState(s){
  s = s || {};
  s.v = 2;
  s.habits = (s.habits || []).map(normHabit);
  var unnamed={};
  var nameByEmoji={'💪':'Pushups','🏃':'Walk','📚':'Reading','💧':'Hydration','🧘':'Meditation','🛏️':'Sleep routine','🥗':'Eat healthy','✍️':'Journaling','🎯':'Daily focus','🎸':'Practice music','🚭':'No smoking','💊':'Medicine','🦷':'Dental care','🌅':'Morning routine','🧹':'Clean up','💻':'Deep work','🗣️':'Speaking practice','🚴':'Cycling','🙏':'Gratitude','🍎':'Fruit','💤':'Sleep','📵':'Screen-free time','🎨':'Creative time','💰':'Save money'};
  for(var ni=0;ni<s.habits.length;ni++){var nh=s.habits[ni];if(nh.name==='Habit'){var base=nameByEmoji[nh.emoji]||'Personal habit';unnamed[base]=(unnamed[base]||0)+1;nh.name=unnamed[base]>1?base+' '+unnamed[base]:base;}}

  s.stack = s.stack || [];
  s.closed = s.closed || {};
  s.hlog = s.hlog || {};
  s.timers = s.timers || {};
  s.mood = s.mood || {};
  s.moodNotes = s.moodNotes || {};
  if(!(s.tasks instanceof Array)) s.tasks=[];
  s.tasks=s.tasks.map(normTask);
  if(!(s.jr instanceof Array)) s.jr = [];
  for(var ji=0; ji<s.jr.length; ji++){
    var je = s.jr[ji] || {};
    je.id = je.id || (Date.now().toString(36) + Math.random().toString(36).slice(2,7));
    if(!/^\d{4}-\d{2}-\d{2}$/.test(je.d || '')) je.d = today();
    je.t = String(je.t || '').slice(0,80);
    je.b = String(je.b || '').slice(0,6000);
    if(!(je.ph instanceof Array)) je.ph = [];
    je.ph = je.ph.filter(function(pn){ return typeof pn === 'string' && /^[A-Za-z0-9_.-]+$/.test(pn); });
    je.created = +je.created || 0;
    s.jr[ji] = je;
  }
  // ===== expense tracker =====
  if(!(s.accts instanceof Array)) s.accts = [];
  for(var ai=0; ai<s.accts.length; ai++){
    var ac = s.accts[ai] || {};
    ac.id = ac.id || ('a'+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
    ac.name = String(ac.name || 'Account').slice(0,40);
    if(['bank','cash','credit','debit','upi','wallet','other'].indexOf(ac.type) < 0) ac.type = 'other';
    ac.open = +ac.open || 0;
    ac.active = ac.active !== false;
    s.accts[ai] = ac;
  }
  if(!(s.tx instanceof Array)) s.tx = [];
  for(var ti=0; ti<s.tx.length; ti++){
    var x = s.tx[ti] || {};
    x.id = x.id || ('t'+Date.now().toString(36)+Math.random().toString(36).slice(2,7));
    if(!/^\d{4}-\d{2}-\d{2}$/.test(x.d||'')) x.d = today();
    if(['exp','inc','xfer'].indexOf(x.kind) < 0) x.kind = 'exp';
    x.amt = Math.max(0, +x.amt || 0);
    x.acct = String(x.acct || ''); x.to = String(x.to || '');
    x.cat = String(x.cat || '').slice(0,40); x.sub = String(x.sub || '').slice(0,40);
    x.payee = String(x.payee || '').slice(0,60); x.method = String(x.method || '').slice(0,24);
    x.note = String(x.note || '').slice(0,200); x.tags = String(x.tags || '').slice(0,80);
    x.receipt = '';
    x.receiptData = '';
    x.recurId = String(x.recurId || '');
    x.recurDate = /^\d{4}-\d{2}-\d{2}$/.test(x.recurDate||'') ? x.recurDate : '';
    x.created = +x.created || 0;
    s.tx[ti] = x;
  }
  if(!s.cats || typeof s.cats !== 'object' || s.cats instanceof Array) s.cats = null;
  if(!s.cats) s.cats = defaultCats();
  if(!(s.incCats instanceof Array) || !s.incCats.length) s.incCats = ['Salary','Bonus','Freelance','Interest','Refund','Other'];
  if(!(s.recur instanceof Array)) s.recur = [];
  for(var ri=0; ri<s.recur.length; ri++){
    var rc = s.recur[ri] || {};
    rc.id = rc.id || ('r'+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
    rc.name = String(rc.name||'Recurring').slice(0,40);
    rc.amt = Math.max(0,+rc.amt||0);
    if(['exp','inc'].indexOf(rc.kind)<0) rc.kind='exp';
    if(['monthly','weekly','yearly'].indexOf(rc.freq)<0) rc.freq='monthly';
    rc.day = Math.min(31, Math.max(1, +rc.day||1));
    rc.weekday = Math.min(6, Math.max(0, +rc.weekday || 0));
    rc.month = Math.min(12, Math.max(1, +rc.month || 1));
    rc.yearDay = Math.min(31, Math.max(1, +rc.yearDay || rc.day || 1));
    rc.acct = String(rc.acct||''); rc.cat = String(rc.cat||'').slice(0,40);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(rc.start||'')) rc.start = today();
    rc.end = /^\d{4}-\d{2}-\d{2}$/.test(rc.end||'') ? rc.end : '';
    rc.last = /^\d{4}-\d{2}-\d{2}$/.test(rc.last||'') ? rc.last : '';
    rc.active = rc.active !== false;
    rc.skipNext = !!rc.skipNext;
    s.recur[ri] = rc;
  }
  if(!s.budg || typeof s.budg !== 'object' || s.budg instanceof Array) s.budg = {};

  // ===== workout tracker =====
  if(!(s.exs instanceof Array)) s.exs = [];
  for(var ei=0; ei<s.exs.length; ei++){
    var ex = s.exs[ei] || {};
    ex.id = ex.id || ('e'+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
    ex.name = String(ex.name || 'Exercise').slice(0,40);
    if(['reps','weight','time','distance','count'].indexOf(ex.mtype) < 0) ex.mtype = 'reps';
    ex.unit = String(ex.unit || '').slice(0,12);
    ex.sets = !!ex.sets;
    ex.goal = Math.max(0, +ex.goal || 0);
    ex.active = ex.active !== false;
    ex.created = +ex.created || Date.now();
    s.exs[ei] = ex;
  }
  // workout log: array of {id, exId, d, sets:[num,...], created}
  if(!(s.wlog instanceof Array)) s.wlog = [];
  for(var wi=0; wi<s.wlog.length; wi++){
    var wl = s.wlog[wi] || {};
    wl.id = wl.id || ('w'+Date.now().toString(36)+Math.random().toString(36).slice(2,7));
    wl.exId = String(wl.exId || '');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(wl.d || '')) wl.d = today();
    if(!(wl.sets instanceof Array)) wl.sets = [];
    wl.sets = wl.sets.map(function(n){ return Math.max(0, +n || 0); });
    wl.created = +wl.created || 0;
    s.wlog[wi] = wl;
  }

  // ===== sleep tracker =====
  // s.sleep: array of {d, bed:'HH:MM', wake:'HH:MM', mins:int, note}
  // 'd' is the date you WOKE UP on
  if(!(s.sleep instanceof Array)) s.sleep = [];
  for(var si=0; si<s.sleep.length; si++){
    var sl = s.sleep[si] || {};
    if(!/^\d{4}-\d{2}-\d{2}$/.test(sl.d || '')) sl.d = today();
    sl.bed = /^\d{2}:\d{2}$/.test(sl.bed||'') ? sl.bed : '';
    sl.wake = /^\d{2}:\d{2}$/.test(sl.wake||'') ? sl.wake : '';
    sl.mins = Math.max(0, Math.min(1440, +sl.mins || 0));
    sl.note = String(sl.note || '').slice(0,160);
    s.sleep[si] = sl;
  }

  s.set = s.set || {};
  var d = s.set;
  if(typeof d.pin !== 'string') d.pin = '';
  d.bio = !!d.bio; d.grey = !!d.grey;
  if(['light','auto','amoled','dark'].indexOf(d.theme) < 0) d.theme = 'dark';
  if(['ember','lagoon','frost','sakura','violet','mono'].indexOf(d.pal) < 0) d.pal = 'ember';
  if(['nothing','apple','google','space','bricolage','serif','system'].indexOf(d.font) < 0) d.font = 'nothing';
  d.vacFrom = d.vacFrom || ''; d.vacUntil = d.vacUntil || '';
  if(!(d.vacPeriods instanceof Array)) d.vacPeriods=[];
  if(d.vacFrom && d.vacUntil && !d.vacPeriods.some(function(v){return v.from===d.vacFrom&&v.until===d.vacUntil;})) d.vacPeriods.push({from:d.vacFrom,until:d.vacUntil});
  d.jrRem = (typeof d.jrRem === 'string' && /^\d{2}:\d{2}$/.test(d.jrRem)) ? d.jrRem : '';
  d.uname = typeof d.uname === 'string' ? d.uname.slice(0,24) : '';
  d.curr = d.curr || '\u20B9';
  d.lastAutoBk = d.lastAutoBk || ''; d.lastGrant = d.lastGrant || ''; d.lastBkPath = d.lastBkPath || '';
  d.smartExpRem = false;
  d.smartExpRemTime = '09:00';
  s.mtime = s.mtime || 0;
  return s;
}
function load(){
  try{
    var r = localStorage.getItem(KEY);
    if(r) return normState(JSON.parse(r));
    var o = localStorage.getItem(OLDKEY);
    if(o){ var v1 = JSON.parse(o); return normState({habits:(v1.habits||[])}); }
  }catch(e){}
  return normState({});
}
var state = load();
var lastAlarmsJson = '';
function stateForStorage(){
  var out; try{out=JSON.parse(JSON.stringify(state));}catch(e){out=state;}
  if(out&&out.tx instanceof Array)out.tx.forEach(function(x){if(x)x.receiptData='';});
  return out;
}
/* perf: one serialization pass per save (was: deep-clone + 2x stringify).
   The replacer blanks tx receipt payloads exactly like stateForStorage(). */
function stateJson(){
  try{ return JSON.stringify(state, function(k,v){ return k==='receiptData' ? '' : v; }); }
  catch(e){ try{ return JSON.stringify(stateForStorage()); }catch(e2){ return null; } }
}
function persist(){
  state.mtime=Date.now(); var json=stateJson();
  if(json){
    try{localStorage.setItem(KEY,json);}catch(e){}
    if(nat){try{nat.saveState(json);}catch(e){}}
    /* Widget quick-action sessions: the first save after a widget deep link IS the
       action completing, so hand control back to the home screen (spec v5.3). */
    if(window._widgetFlowArmed){window._widgetFlowArmed=false;setTimeout(function(){try{nat&&nat.widgetDone&&nat.widgetDone();}catch(e){}},300);}
  }
  pushAlarms(); if(typeof queueChangedSyncRecords==='function'){try{queueChangedSyncRecords();}catch(e){}} if(typeof scheduleSyncPush==='function')scheduleSyncPush();
}
function hasMeaningfulData(s){
  s=s||{};
  return !!((s.habits&&s.habits.length)||(s.tx&&s.tx.length)||(s.accts&&s.accts.length)||(s.exs&&s.exs.length)||(s.wlog&&s.wlog.length)||(s.sleep&&s.sleep.length)||(s.jr&&s.jr.length)||(s.tasks&&s.tasks.length)||(s.goals&&s.goals.length)||(s.mood&&Object.keys(s.mood).length)||(s.hlog&&Object.keys(s.hlog).length)||(s.closed&&Object.keys(s.closed).length));
}
function findHabit(id){
  for(var i=0;i<state.habits.length;i++) if(state.habits[i].id === id) return state.habits[i];
  return null;
}
function onVacation(ds){
  var st = state.set;
  if(st.vacPeriods&&st.vacPeriods.some(function(v){return v&&ds>=v.from&&ds<=v.until;})) return true;
  return !!(st.vacFrom && st.vacUntil && ds >= st.vacFrom && ds <= st.vacUntil);
}

/* ================= schedule engine ================= */
function dueOn(h, d){
  var ds = fmt(d);
  if(h.start && ds < h.start) return false;
  if(h.end && ds > h.end) return false;
  if(h.arch && (!h.archAt || ds >= h.archAt)) return false;
  if(onVacation(ds)) return false;
  var k = h.sched.kind, dow = d.getDay(), dom = d.getDate();
  if(k === 'daily') return true;
  if(k === 'wquota' || k === 'mquota'){
    if(isDone(h, ds)) return true;
    return quotaCountExcl(h, d) < h.sched.quota;
  }
  if(k === 'weekend') return dow === 0 || dow === 6;
  if(k === 'odd') return dom % 2 === 1;
  if(k === 'even') return dom % 2 === 0;
  if(k === 'dow') return h.sched.dows.indexOf(dow) >= 0;
  if(k === 'everyx'){
    var diff = dayDiff(h.start || h.created, ds);
    return diff >= 0 && diff % h.sched.x === 0;
  }
  return true;
}
function targ(h){ return (h.type==='count'||h.type==='time'||h.type==='money') ? Math.max(1,h.target) : 1; }
function val(h, ds){ return +h.done[ds] || 0; }
function isDone(h, ds){ return val(h, ds) >= targ(h); }
function isFroz(h, ds){ return !!h.frozen[ds]; }
function stepOf(h){ return h.type === 'time' ? 5 : 1; }
function quotaProgress(h){
  var now = new Date(), from;
  if(h.sched.kind === 'wquota') from = weekStart(now);
  else from = new Date(now.getFullYear(), now.getMonth(), 1);
  var n = 0, d = new Date(from.getTime());
  while(fmt(d) <= today()){ if(isDone(h, fmt(d))) n++; d = addDays(d,1); }
  return {n:n, q:h.sched.quota};
}
function quotaCountExcl(h,d){
  /* Only completions strictly before d affect whether d was due. */
  var from,span;if(h.sched.kind==='wquota'){from=weekStart(d);span=7;}else{from=new Date(d.getFullYear(),d.getMonth(),1);span=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();}
  var n=0,ds=fmt(d),x=new Date(from.getTime());
  for(var i=0;i<span;i++){var xs=fmt(x);if(xs<ds&&isDone(h,xs))n++;x=addDays(x,1);}return n;
}
function notDueMsg(h, d){
  var k = h.sched.kind;
  if(k==='wquota' && quotaCountExcl(h,d) >= h.sched.quota)
    return 'Weekly quota already met ('+h.sched.quota+'/'+h.sched.quota+') \uD83C\uDF89';
  if(k==='mquota' && quotaCountExcl(h,d) >= h.sched.quota)
    return 'Monthly quota already met ('+h.sched.quota+'/'+h.sched.quota+') \uD83C\uDF89';
  if(k==='dow') return 'Only due on its selected weekdays';
  if(k==='weekend') return 'Weekend-only habit';
  if(k==='everyx') return 'Due every '+h.sched.x+' days \u2014 not this day';
  if(k==='odd') return 'Odd dates only';
  if(k==='even') return 'Even dates only';
  return 'Not scheduled on this day';
}

/* ================= streaks ================= */
function streak(h){
  var d = new Date(), guard = 0;
  var ds = fmt(d);
  if(dueOn(h,d) && !isDone(h,ds) && !isFroz(h,ds)) d = addDays(d,-1);
  var s = 0;
  while(guard++ < 3000){
    ds = fmt(d);
    if(ds < h.created && ds < h.start) break;
    if(!dueOn(h,d)){ d = addDays(d,-1); continue; }
    if(isDone(h,ds) || isFroz(h,ds)){ s++; d = addDays(d,-1); }
    else break;
  }
  return s;
}
function streakAsOf(h, endDate){
  var d = new Date(endDate.getTime()), s = 0, guard = 0;
  while(guard++ < 3000){
    var ds = fmt(d);
    if(ds < h.created && ds < h.start) break;
    if(!dueOn(h,d)){ d = addDays(d,-1); continue; }
    if(isDone(h,ds) || isFroz(h,ds)){ s++; d = addDays(d,-1); }
    else break;
  }
  return s;
}
function bestStreak(h){
  var d = toDate(h.start < h.created ? h.start : h.created);
  var end = today(), best = 0, run = 0, guard = 0;
  while(fmt(d) <= end && guard++ < 3000){
    if(dueOn(h,d)){
      var ds = fmt(d);
      if(isDone(h,ds) || isFroz(h,ds)){ run++; if(run>best) best = run; }
      else run = 0;
    }
    d = addDays(d,1);
  }
  return best;
}
function totalDone(h){ var n=0; for(var k in h.done){ if(isDone(h,k)) n++; } return n; }

/* ================= aggregates ================= */
function dayAgg(d){
  var s=0, dn=0, ds=fmt(d);
  for(var i=0;i<state.habits.length;i++){
    var h = state.habits[i];
    if(!dueOn(h,d)) continue;
    if(isFroz(h,ds)) continue;
    s++;
    if(isDone(h,ds)) dn++;
  }
  return {s:s, d:dn};
}
function rateOn(d){ var a = dayAgg(d); return a.s ? a.d/a.s : null; }
function periodStats(d0, d1){
  var t = today(), res = {sched:0, done:0, missed:0, perfect:0, days:0};
  var d = new Date(d0.getTime()), guard = 0;
  while(fmt(d) <= fmt(d1) && fmt(d) <= t && guard++ < 800){
    var a = dayAgg(d);
    if(a.s > 0){
      res.sched += a.s; res.done += a.d; res.days++;
      if(a.d >= a.s) res.perfect++;
      else if(fmt(d) < t) res.missed += (a.s - a.d);
    }
    d = addDays(d,1);
  }
  res.rate = res.sched ? res.done/res.sched : 0;
  return res;
}
function habitRate(h, d0, d1){
  var t = today(), s=0, dn=0, miss=0;
  var d = new Date(d0.getTime()), guard=0;
  while(fmt(d) <= fmt(d1) && fmt(d) <= t && guard++ < 400){
    var ds = fmt(d);
    if(dueOn(h,d) && !isFroz(h,ds)){
      s++;
      if(isDone(h,ds)) dn++;
      else if(ds < t) miss++;
    }
    d = addDays(d,1);
  }
  return {s:s, d:dn, miss:miss, rate: s ? dn/s : 0};
}
function perfectWeeks(nBack){
  var cnt = 0, ws = weekStart(new Date());
  for(var i=1;i<=nBack;i++){
    var w0 = addDays(ws, -7*i), w1 = addDays(w0, 6);
    var p = periodStats(w0, w1);
    if(p.sched > 0 && p.done >= p.sched) cnt++;
  }
  return cnt;
}
function perfectMonths(nBack){
  var cnt = 0, now = new Date();
  for(var i=1;i<=nBack;i++){
    var m0 = new Date(now.getFullYear(), now.getMonth()-i, 1);
    var m1 = new Date(now.getFullYear(), now.getMonth()-i+1, 0);
    var p = periodStats(m0, m1);
    if(p.sched > 0 && p.done >= p.sched) cnt++;
  }
  return cnt;
}
function weeklyConsistency(){
  var ws = weekStart(new Date()), rates = [];
  for(var i=1;i<=4;i++){
    var w0 = addDays(ws,-7*i), p = periodStats(w0, addDays(w0,6));
    if(p.sched>0) rates.push(p.rate);
  }
  if(!rates.length) return 0;
  var sum = 0; for(var j=0;j<rates.length;j++) sum += rates[j];
  return sum/rates.length;
}
function monthlyConsistency(){
  var now = new Date();
  return periodStats(new Date(now.getFullYear(), now.getMonth(), 1), now).rate;
}
function prodScore(){
  var now = new Date();
  var r30 = periodStats(addDays(now,-29), now).rate;
  var wc = weeklyConsistency();
  var mx = 0;
  for(var i=0;i<state.habits.length;i++){ var s = streak(state.habits[i]); if(s>mx) mx=s; }
  return Math.round(100*(0.55*r30 + 0.25*wc + 0.2*Math.min(1, mx/30)));
}
function usualHour(h){
  var a = state.hlog[h.id];
  if(!a || a.length < 3) return -1;
  var b = a.slice().sort(function(x,y){return x-y;});
  return b[Math.floor(b.length/2)];
}

/* ================= mutation & celebration ================= */
function setVal(hid, ds, v){
  var h = findHabit(hid); if(!h) return;
  var was = isDone(h, ds);
  if(v <= 0) delete h.done[ds]; else h.done[ds] = v;
  var now = isDone(h, ds);
  if(!was && now){
    buzz(16);
    if(ds === today()){
      var a = state.hlog[hid] || [];
      a.push(new Date().getHours());
      if(a.length > 40) a = a.slice(-40);
      state.hlog[hid] = a;
      var s = streak(h);
      if(MILES.indexOf(s) >= 0) celebrate(s, h);
      stackNext(hid);
    }
  }
  persist();
  renderToday();
  if(sheetOpen === 'detailSheet' && detailId === hid) renderDetail();
}
function tapMain(hid){
  var h = findHabit(hid); if(!h) return;
  var ds = today(), t = targ(h), v = val(h, ds);
  if(v >= t){ setVal(hid, ds, 0); return; }
  if(!dueOn(h, new Date())){ toastN(notDueMsg(h, new Date())); return; }
  setVal(hid, ds, Math.min(t, v + stepOf(h)));
}
function toggleDay(hid, ds){
  if(ds > today()) return;
  var h = findHabit(hid); if(!h) return;
  if(isFroz(h, ds)) return;
  if(isDone(h, ds)){ setVal(hid, ds, 0); return; }
  var dd = toDate(ds);
  if(!dueOn(h, dd)){ toastN(notDueMsg(h, dd)); buzz(24); return; }
  setVal(hid, ds, targ(h));
}
function stackNext(hid){
  var st = state.stack;
  if(st.indexOf(hid) < 0) return;
  for(var i=0;i<st.length;i++){
    var h = findHabit(st[i]);
    if(h && dueOn(h, new Date()) && !isDone(h, today())){
      toastN('Next: ' + h.emoji + ' ' + h.name);
      return;
    }
  }
  if(st.length) toastN('Routine complete \uD83C\uDF89');
}
function celebrate(n, h){
  $('mNum').textContent = n;
  $('mHab').textContent = h.emoji + ' ' + h.name;
  $('miles').classList.add('on');
  buzz([30,60,30]);
  confetti();
  setTimeout(function(){ $('miles').classList.remove('on'); }, 4200);
}
$('miles') && $('miles').addEventListener('click', function(){ this.classList.remove('on'); });
function confetti(){
  var cv = $('confetti'), ctx = cv.getContext('2d');
  cv.width = innerWidth; cv.height = innerHeight;
  cv.style.display = 'block';
  var ps = [], cols = COLORS;
  for(var i=0;i<130;i++){
    ps.push({x: Math.random()*cv.width, y: -20 - Math.random()*cv.height*0.5,
      vx:(Math.random()-0.5)*2.4, vy: 2+Math.random()*3.2, r: Math.random()*Math.PI,
      vr:(Math.random()-0.5)*0.25, w: 6+Math.random()*6, h: 8+Math.random()*8,
      c: cols[Math.floor(Math.random()*cols.length)]});
  }
  var t0 = Date.now();
  (function frame(){
    ctx.clearRect(0,0,cv.width,cv.height);
    for(var i=0;i<ps.length;i++){
      var p = ps[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.r += p.vr;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
    }
    if(Date.now()-t0 < 3600) requestAnimationFrame(frame);
    else { cv.style.display='none'; ctx.clearRect(0,0,cv.width,cv.height); }
  })();
}

/* ================= streak freeze / recovery ================= */
function grantMonthly(){
  var mk = monKey(new Date());
  if(state.set.lastGrant !== mk){
    for(var i=0;i<state.habits.length;i++){
      var h = state.habits[i];
      h.fz = Math.min(3, (h.fz||0) + 1);
    }
    state.set.lastGrant = mk;
  }
}
function recoverList(){
  var y = addDays(new Date(), -1), ys = fmt(y), out = [];
  for(var i=0;i<state.habits.length;i++){
    var h = state.habits[i];
    if(h.fz > 0 && dueOn(h,y) && !isDone(h,ys) && !isFroz(h,ys)){
      if(streakAsOf(h, addDays(y,-1)) >= 2) out.push(h);
    }
  }
  return out;
}
function applyRecover(hid){
  var h = findHabit(hid); if(!h || h.fz<=0) return;
  h.frozen[fmt(addDays(new Date(),-1))] = 1;
  h.fz--;
  toastN('Chain recovered \u2744\uFE0F');
  persist(); renderToday();
}
function applyFreeze(hid, ds){
  var h = findHabit(hid); if(!h || h.fz<=0) return;
  h.frozen[ds] = 1; h.fz--;
  persist(); renderToday(); renderDetail();
}
function unfreeze(hid, ds){
  var h = findHabit(hid); if(!h) return;
  delete h.frozen[ds];
  h.fz = Math.min(3, h.fz+1);
  persist(); renderToday(); renderDetail();
}

/* ================= hero chain ring ================= */
function ringArc(cx, cy, r, a0, a1, col, sw, op){
  var ra0 = a0*Math.PI/180, ra1 = a1*Math.PI/180;
  var x1 = cx + r*Math.cos(ra0), y1 = cy + r*Math.sin(ra0);
  var x2 = cx + r*Math.cos(ra1), y2 = cy + r*Math.sin(ra1);
  var large = (a1-a0) > 180 ? 1 : 0;
  return '<path d="M'+x1.toFixed(2)+' '+y1.toFixed(2)+' A'+r+' '+r+' 0 '+large+' 1 '
    +x2.toFixed(2)+' '+y2.toFixed(2)+'" fill="none" style="stroke:'+col+'" stroke-width="'+sw
    +'" stroke-linecap="round" opacity="'+op+'"/>';
}
function heroRing(due, doneN){
  var r = 80, sw = 13, n = due.length, ts = today();
  var svg = '<svg class="ringSvg" viewBox="0 0 200 200">';
  svg += '<circle cx="100" cy="100" r="'+r+'" fill="none" style="stroke:var(--card2)" stroke-width="'+sw+'"/>';
  if(n === 1){
    var h1 = due[0], dn1 = isDone(h1,ts)||isFroz(h1,ts);
    var c1 = isFroz(h1,ts) ? 'var(--ice)' : h1.color;
    svg += '<circle cx="100" cy="100" r="'+r+'" fill="none" style="stroke:'+c1+'" stroke-width="'+sw
      +'" opacity="'+(dn1?1:0.22)+'"/>';
  } else if(n > 1){
    var gap = n > 8 ? 4 : 7;
    var seg = (360 - gap*n) / n;
    for(var i=0;i<n;i++){
      var a0 = -90 + i*(seg+gap), a1 = a0 + seg;
      var h = due[i];
      var froz = isFroz(h, ts);
      var dn = isDone(h, ts) || froz;
      svg += ringArc(100, 100, r, a0, a1, froz ? 'var(--ice)' : h.color, sw, dn ? 1 : 0.22);
    }
  }
  svg += '<text x="100" y="99" text-anchor="middle" class="ringN" style="fill:var(--ink)">'+doneN
    + '<tspan class="ringT" style="fill:var(--mut)"> /'+n+'</tspan></text>';
  svg += '<text x="100" y="122" text-anchor="middle" class="ringL" style="fill:var(--mut)">'
    + (n ? (doneN + ' of ' + n + ' completed') : 'no habits due') + '</text>';
  svg += '</svg>';
  var mx = 0;
  for(var j=0;j<state.habits.length;j++){ if(state.habits[j].arch) continue; var s = streak(state.habits[j]); if(s>mx) mx = s; }
  var flame = mx >= 3 ? '<div class="heroFlame on">\uD83D\uDD25 Best chain: '+mx+' days</div>' : '';
  return svg + flame;
}

/* ================= chain ribbon ================= */
function ribbon(h){
  var letters = ['S','M','T','W','T','F','S'];
  var t = new Date(), links = '', cells = '', hits = '';
  var prevMark = false;
  for(var i=6;i>=0;i--){
    var d = addDays(t,-i), ds = fmt(d), idx = 6-i, cx = idx*100+50;
    var due = dueOn(h,d), done = isDone(h,ds), froz = isFroz(h,ds);
    var mark = done || froz;
    if(idx>0 && mark && prevMark)
      links += '<rect x="'+(cx-100)+'" y="47" width="100" height="9" rx="4.5" fill="'+h.color+'" opacity="0.3"/>';
    cells += '<text x="'+cx+'" y="18" text-anchor="middle" font-size="14" font-weight="'+(i===0?'700':'500')
      +'" style="fill:var(--'+(i===0?'ink':'mut')+')">'+letters[d.getDay()]+'</text>';
    if(froz){
      cells += '<circle cx="'+cx+'" cy="52" r="15" style="fill:var(--ice)"/>'
        + '<text x="'+cx+'" y="57" text-anchor="middle" font-size="13">\u2744</text>';
    } else if(done){
      cells += '<circle cx="'+cx+'" cy="52" r="15" fill="'+h.color+'"/>'
        + '<path d="M'+(cx-6)+' 52 l4.5 4.5 L'+(cx+7)+' 45.5" style="stroke:var(--onAccent)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    } else if(val(h, ds) > 0){
      cells += '<circle cx="'+cx+'" cy="52" r="14" fill="'+hexRgba(h.color,.28)+'" stroke="'+h.color+'" stroke-width="2.5"/>'
        + '<circle cx="'+cx+'" cy="52" r="4.5" fill="'+h.color+'"/>';
    } else if(due){
      cells += '<circle cx="'+cx+'" cy="52" r="14" fill="none" stroke="'+hexRgba(h.color,.5)+'" stroke-width="2.2"/>';
    } else {
      cells += '<circle cx="'+cx+'" cy="52" r="14" fill="none" stroke="'+hexRgba(h.color,.22)+'" stroke-width="2" stroke-dasharray="4 3"/>';
    }
    hits += '<rect x="'+(idx*100)+'" y="0" width="100" height="76" fill="transparent" data-act="day" data-date="'+ds+'"/>';
    prevMark = mark;
  }
  return '<svg class="ribbon" viewBox="0 0 700 76" xmlns="http://www.w3.org/2000/svg">'+links+cells+hits+'</svg>';
}

/* ================= today render ================= */
var SECTIONS = [['morning','Morning'],['afternoon','Afternoon'],['evening','Night'],['any','Anytime']];
var srchQ = '', srchCat = 'all';
function miniCard(hh, lbl){
  return '<div class="card" data-id="'+hh.id+'" style="opacity:.45;--spine:'+hexRgba(hh.color,.4)+'"><div class="crow">'
    + '<div class="emo" style="background:'+hexRgba(hh.color,.1)+'">'+hh.emoji+'</div>'
    + '<div class="cinfo"><div class="cname">'+esc(hh.name)+'</div>'
    + '<div class="cstreak" style="color:var(--mut)">'+lbl+'</div></div></div></div>';
}
function restLabel(hh){
  var lbl = 'Rests today';
  if(hh.sched.kind==='wquota' || hh.sched.kind==='mquota'){
    var qp2 = quotaProgress(hh);
    if(qp2.n >= qp2.q) lbl = 'Quota met \u00B7 '+qp2.n+'/'+qp2.q+(hh.sched.kind==='wquota'?' this week \uD83C\uDF89':' this month \uD83C\uDF89');
  }
  return lbl;
}
function cardHTML(h){
  var ds = today(), t = targ(h), v = val(h, ds), done = v >= t, froz = isFroz(h, ds);
  var s = streak(h);
  var sLabel, sColor = s>0 ? h.color : 'var(--mut)';
  if(froz) { sLabel = 'Frozen today \u2744\uFE0F'; sColor = 'var(--ice)'; }
  else if(s >= 3) sLabel = s + '-day chain \uD83D\uDD25';
  else if(s > 0) sLabel = s + '-day chain';
  else sLabel = h.type==='neg' ? 'Stay clean today' : 'Start the chain';
  if(h.sched.kind==='wquota' || h.sched.kind==='mquota'){
    var qp = quotaProgress(h);
    sLabel += ' \u00B7 ' + qp.n + '/' + qp.q + (h.sched.kind==='wquota'?' this week':' this month');
  }
  var inner;
  if(t > 1){
    inner = done
      ? (v > t ? CHECK_SVG + '<span class="cv" style="font-size:8.5px">+'+fmtV(v-t)+'</span>' : CHECK_SVG)
      : '<span class="cv">'+fmtV(v)+'</span><span class="cv" style="font-size:9px;opacity:.7">/'+t+(h.unit?(' '+esc(h.unit)):'')+'</span>';
  } else {
    inner = done ? CHECK_SVG : (h.type==='neg' ? '<span class="cv" style="font-size:16px">\uD83D\uDEAB</span>' : CHECK_SVG);
  }
  var chkCls = 'chk' + (done?' on':(t>1&&v>0?' part':''));
  var remHtml = '';
  if(h.rem.times.length > 0){
    remHtml = '<div class="crem">';
    for(var ri=0; ri<h.rem.times.length; ri++){
      remHtml += '<span class="pill"><span class="pi">\u23F0</span>' + timeFmt(h.rem.times[ri]) + '</span>';
    }
    if(h.rem.repeat) remHtml += '<span class="pill"><span class="pi">\uD83D\uDD01</span>repeat</span>';
    remHtml += '</div>';
  }
  return '<div class="card" data-id="'+h.id+'" style="--spine:'+h.color+'">'
    + '<div class="cwrap">'
    +   '<div class="crow">'
    +     '<div class="emo" style="background:'+hexRgba(h.color,.14)+'">'+h.emoji+'</div>'
    +     '<div class="cinfo"><div class="cname">'+esc(h.name)+'</div>'
    +     '<div class="cstreak" style="color:'+sColor+'">'+sLabel+'</div>'
    +     remHtml + '</div>'
    +   '</div>' + ribbon(h)
    + '</div>'
    + '<button class="'+chkCls+'" data-act="chk" aria-label="toggle" style="--c:'+h.color+';--cs:'+hexRgba(h.color,.35)+';--cg:'+hexRgba(h.color,.35)+'">'+inner+'</button>'
    + '</div>';
}
function nextReminderStr(){
  var now = new Date(), best = null, bh = null, ts = today();
  for(var i=0;i<state.habits.length;i++){
    var h = state.habits[i];
    if(!dueOn(h, now) || isDone(h, ts)) continue;
    for(var j=0;j<h.rem.times.length;j++){
      var p = h.rem.times[j].split(':');
      var d = new Date(); d.setHours(+p[0], +p[1], 0, 0);
      if(d > now && (!best || d < best)){ best = d; bh = h; }
    }
  }
  if(!best) return '';
  return '<svg class="remIcon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 2M5 4L3 6M19 4l2 2"/></svg>'
    + 'Next: <b>' + bh.emoji + ' ' + esc(bh.name) + '</b>\u2002\u00B7\u2002'
    + best.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
}
function nextDueLabel(){
  var d = new Date();
  for(var k=1; k<=14; k++){
    var nd = addDays(d, k), ds = fmt(nd);
    if(onVacation(ds)) continue;
    for(var i=0; i<state.habits.length; i++){
      var h = state.habits[i];
      if(h.arch) continue;
      if(dueOn(h, nd)) return k === 1 ? 'tomorrow'
        : 'on ' + nd.toLocaleDateString(undefined, {weekday:'long'});
    }
  }
  return 'soon';
}
function fmtV(v){ return v === Math.round(v) ? String(Math.round(v)) : String(v); }
function slippedYesterday(){
  var y = addDays(new Date(), -1), ys = fmt(y);
  if(onVacation(ys)) return false;
  for(var i=0;i<state.habits.length;i++){
    var h = state.habits[i];
    if(h.arch && (!h.archAt || ys >= h.archAt)) continue;
    if(dueOn(h, y) && !isDone(h, ys) && !isFroz(h, ys)) return true;
  }
  return false;
}
function dayMessage(){
  var t=today();if(state.closed[t]!==undefined)return '';var now=new Date(),due=[],done=0;
  for(var i=0;i<state.habits.length;i++){var h=state.habits[i];if(!h.arch&&dueOn(h,now)){due.push(h);if(isDone(h,t)||isFroz(h,t))done++;}}
  var pct=due.length?Math.round(done/due.length*100):0;if(pct>=100)return 'Day complete. Protect the momentum.';if(pct>=75)return 'One more push.';if(pct>=50)return 'Halfway there. Keep going.';if(pct>=25)return 'You’re moving. Keep going.';return 'Start with one small win.';
}
var focusId = '';
function pickFocus(due){
  var incomplete = due.filter(function(h){ return !isDone(h, today()); });
  if(!incomplete.length) return null;
  for(var i=0;i<state.stack.length;i++){
    for(var j=0;j<incomplete.length;j++)
      if(incomplete[j].id === state.stack[i]) return incomplete[j];
  }
  var withRem = incomplete.filter(function(h){ return h.rem.times.length > 0; });
  if(withRem.length){
    withRem.sort(function(a,b){ return a.rem.times[0] < b.rem.times[0] ? -1 : 1; });
    return withRem[0];
  }
  return incomplete[0];
}
function renderFocus(due){
  var fc = $('focusCard');
  if(!due.length){ fc.style.display = 'none'; return; }
  var h = pickFocus(due);
  fc.style.display = '';
  if(!h){
    fc.style.setProperty('--fc', 'var(--sGreen)');
    fc.innerHTML = '<div class="fMini"><span class="fEmo">\uD83C\uDF89</span>'
      + '<div class="fName">All done for today</div></div>';
    focusId = '';
    return;
  }
  focusId = h.id;
  var t = targ(h), v = val(h, today());
  fc.style.setProperty('--fc', h.color);
  var right = t > 1
    ? '<span class="fVal" id="fVal">' + fmtV(v) + '/' + t + '</span>'
    : '';
  fc.innerHTML = '<div class="fMini">'
    + '<span class="fEmo">' + h.emoji + '</span>'
    + '<div class="fTxt"><div class="fLbl">Next up</div>'
    + '<div class="fName" data-fopen="1">' + esc(h.name) + '</div></div>'
    + right
    + '<button class="fBtn" id="fBtn">' + (t > 1 ? '+1' : '\u2713') + '</button>'
    + '</div>';
}
function focusTap(){
  var h = findHabit(focusId); if(!h) return;
  var t = targ(h), v = val(h, today());
  if(t > 1){
    setVal(focusId, today(), Math.min(100000, v + 1));
    var nv = val(h, today());
    renderToday();
    var fv = $('fVal');
    if(fv){ fv.classList.add('pop'); }
    if(nv >= t){ toastN('Nice. One small win done.'); materialSnack('Habit completed', null); }
  } else {
    tapMain(focusId);
    renderToday();
    toastN('Nice. One small win done.'); materialSnack('Habit completed', null);
  }
  buzz(14);
}
function dayScore(due, doneN){
  var hr = due.length ? doneN / due.length : 1;
  var moodSet = moodOf(today()) >= 0 ? 1 : 0;
  return Math.round(80 * hr + 20 * moodSet);
}
function renderCloseCard(due, doneN){
  var cc = $('closeCard'), t = today();
  var evening = new Date().getHours() >= 20 || state._testEve;
  var allDone = due.length > 0 && doneN >= due.length;
  if(state.closed[t] !== undefined){
    cc.style.display = '';
    cc.innerHTML = '<div class="ccDone">\uD83C\uDF19 Day closed \u00B7 ' + (typeof state.closed[t]==='object'?state.closed[t].score:state.closed[t]) + '% \u2014 see you tomorrow.</div>';
    return;
  }
  if(!evening && !allDone){ cc.style.display = 'none'; return; }
  var mi = moodOf(t);
  var mxs2 = 0;
  for(var q=0;q<state.habits.length;q++){
    if(state.habits[q].arch) continue;
    var sq = streak(state.habits[q]);
    if(sq > mxs2) mxs2 = sq;
  }
  cc.style.display = '';
  cc.innerHTML = '<div class="ccT">Your day</div>'
    + '<div class="ccLine">\u2713 ' + doneN + ' of ' + due.length + ' habits completed</div>'
    + '<div class="ccLine">' + (mi >= 0 ? MOODS[mi].e + ' Mood: ' + MOODS[mi].l : '\uD83D\uDE36 Mood: not logged') + '</div>'
    + '<div class="ccLine">\uD83D\uDD25 Chain: ' + mxs2 + ' day' + (mxs2 === 1 ? '' : 's') + '</div>'
    + '<div class="ccScore">' + dayScore(due, doneN) + '%</div>'
    + '<div class="ccQ">\u201CAnother day linked.\u201D</div>'
    + '<button class="ccBtn" id="ccBtn">Close day</button>';
}
function greetTxt(){
  var h = new Date().getHours();
  var g = h < 12 ? 'Good morning' : (h < 17 ? 'Good afternoon' : 'Good evening');
  return g + (state.set.uname ? ', ' + state.set.uname : '');
}

/* ============ PATTERN RECOGNITION ENGINE ============ */
function patternStats(nums){
  if(!nums.length)return {n:0,avg:0,cv:999};
  var sum=0,i;for(i=0;i<nums.length;i++)sum+=nums[i];var avg=sum/nums.length,ss=0;
  for(i=0;i<nums.length;i++)ss+=Math.pow(nums[i]-avg,2);
  return {n:nums.length,avg:avg,cv:avg?Math.sqrt(ss/nums.length)/avg:999};
}
function medianNum(a){if(!a.length)return 0;var b=a.slice().sort(function(x,y){return x-y;}),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2;}
function detectedPatterns(){
  var out=[],now=new Date(),ts=today(),tx=state.tx.filter(function(x){return x.d<=ts;}),groups={},i,j;
  /* category spike */
  var recentStart=fmt(addDays(now,-6)),priorStart=fmt(addDays(now,-27)),recent={},prior={};
  tx.forEach(function(x){if(x.kind!=='exp')return;var c=x.cat||'Other';if(x.d>=recentStart)recent[c]=(recent[c]||0)+(x.amt||0);else if(x.d>=priorStart)prior[c]=(prior[c]||0)+(x.amt||0);});
  Object.keys(recent).forEach(function(c){var r=recent[c],p=(prior[c]||0)/3;if(r>=500&&p>0&&r>p*1.6)out.push({type:'spike',score:80,title:'Spending spike',text:'<b>'+esc(c)+'</b> is '+Math.round(r/p)+'× your recent weekly pace.',detail:'7-day spend '+inr(r)+' vs about '+inr(p)+' previously',tag:'watch'});});
  /* weekday spending */
  var dw=[0,0,0,0,0,0,0],dn=[0,0,0,0,0,0,0];tx.forEach(function(x){if(x.kind!=='exp')return;var d=new Date(x.d);if(isNaN(d))return;var w=d.getDay();dw[w]+=x.amt||0;dn[w]++;});
  var best=-1,bavg=0,total=0,n=0;for(i=0;i<7;i++){if(dn[i]>=3){var av=dw[i]/dn[i];if(av>bavg){bavg=av;best=i;}}total+=dw[i];n+=dn[i];}
  var overall=n?total/n:0;
  if(best>=0&&bavg>overall*1.6&&bavg>300)out.push({type:'weekday',score:55,title:'Spending day pattern',text:'<b>'+['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][best]+'</b> is your highest average spending day.',detail:inr(bavg)+' average per transaction vs '+inr(overall)+' overall',tag:'pattern'});
  /* habit weak weekday */
  state.habits.filter(function(h){return !h.arch;}).forEach(function(h){
    var miss=[0,0,0,0,0,0,0],due=[0,0,0,0,0,0,0];
    for(var d=1;d<=42;d++){var dt=addDays(now,-d),ds=fmt(dt);if(dueOn(h,dt)&&ds>=h.created){var w=dt.getDay();due[w]++;if(!isDone(h,ds))miss[w]++;}}
    var weak=-1,rate=0;for(i=0;i<7;i++)if(due[i]>=3&&miss[i]/due[i]>rate){rate=miss[i]/due[i];weak=i;}
    if(weak>=0&&rate>=.5)out.push({type:'habit',score:70,title:h.name+' has a weak day',text:'You miss this habit most often on <b>'+['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][weak]+'</b>.',detail:Math.round(rate*100)+'% missed across '+due[weak]+' scheduled occurrences',tag:'watch'});
  });
  /* mood weekday */
  var md=[0,0,0,0,0,0,0],mn=[0,0,0,0,0,0,0];for(var key in state.mood){var mi=state.mood[key],dtm=new Date(key);if(typeof mi==='number'&&!isNaN(dtm)){var mw=dtm.getDay();md[mw]+=MOODS[mi].s;mn[mw]++;}}
  var hi=-1,lo=-1,hia=-1,loa=99;for(i=0;i<7;i++)if(mn[i]>=3){var ma=md[i]/mn[i];if(ma>hia){hia=ma;hi=i;}if(ma<loa){loa=ma;lo=i;}}
  if(hi>=0&&lo>=0&&hi!==lo&&hia-loa>=1.2)out.push({type:'mood',score:45,title:'Mood weekday pattern',text:'Mood is highest on <b>'+['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][hi]+'</b> and lowest on <b>'+['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][lo]+'</b>.',detail:hia.toFixed(1)+' vs '+loa.toFixed(1)+' average mood score',tag:'pattern'});
  /* sleep consistency */
  var sv=state.sleep.filter(function(x){return x.mins>0&&x.d<=ts;}).slice(-21).map(function(x){return x.mins;});if(sv.length>=7){var sp=patternStats(sv);if(sp.cv>=.18)out.push({type:'sleep',score:50,title:'Sleep duration varies',text:'Your recent sleep duration is inconsistent.',detail:'Average '+fmtDur(Math.round(sp.avg))+' · '+Math.round(sp.cv*100)+'% variation',tag:'watch'});}
  /* workout weekday pattern */
  if(state.wlog&&state.wlog.length>=5){var ww=[0,0,0,0,0,0,0];state.wlog.forEach(function(wl){var d=new Date(wl.d);if(!isNaN(d))ww[d.getDay()]++;});var wm=0,wi=-1;for(i=0;i<7;i++)if(ww[i]>wm){wm=ww[i];wi=i;}if(wi>=0&&wm>=3)out.push({type:'workout',score:40,title:'Workout day pattern',text:'You log workouts most often on <b>'+['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][wi]+'</b>.',detail:wm+' sessions on that weekday in your history',tag:'pattern'});}
  out.sort(function(a,b){return b.score-a.score;});var seen={};return out.filter(function(p){var k=p.type+'|'+p.title;if(seen[k])return false;seen[k]=1;return true;}).slice(0,8);
}
function renderPatternCard(id,limit){
  var box=$(id);if(!box)return;var ps=detectedPatterns().slice(0,limit||3);if(!ps.length){box.innerHTML='';return;}
  var h='<div class="lbl"><i class="lic" style="--lc:var(--sPurple)"></i>Patterns detected</div><div class="setCard" style="padding:6px 16px">';
  ps.forEach(function(p){h+='<div class="featureRow" style="align-items:flex-start"><div class="grow"><b>'+p.text+'</b><br><small>'+p.detail+'</small></div><span class="featureTag">'+p.tag+'</span></div>';});
  h+='</div>';box.innerHTML=h;
}

/* ============ AI INSIGHTS ENGINE (Tier 1: offline heuristics) ============ */
function generateInsights(){
  var ins = [], now = new Date(), ts = today(), h, i, d;
  var pNow=detectedPatterns(); for(var pi=0;pi<Math.min(2,pNow.length);pi++){var pp=pNow[pi];ins.push({ico:pp.type==='spike'?'📈':pp.type==='habit'?'📅':pp.type==='mood'?'🙂':pp.type==='sleep'?'😴':'🏋️',title:pp.title,text:pp.text+' '+pp.detail,tag:pp.tag==='watch'?'info':'neutral',tagText:'pattern'});}
  var active = state.habits.filter(function(h){ return !h.arch; });
  if(!active.length && !state.tx.length && !state.sleep.length) return ins;

  // ---- 1. WEEKLY SUMMARY ----
  var ws = weekStart(now), wDue=0, wDone=0, wMoodSum=0, wMoodN=0, wExp=0, wInc=0;
  for(d=0;d<7;d++){
    var wd = fmt(addDays(ws,d)); if(wd>ts) break;
    for(i=0;i<active.length;i++){ h=active[i]; if(dueOn(h,addDays(ws,d))){wDue++;if(isDone(h,wd))wDone++;} }
    var mi=moodOf(wd); if(mi>=0){wMoodSum+=MOODS[mi].s;wMoodN++;}
  }
  for(i=0;i<state.tx.length;i++){
    var tx=state.tx[i]; if(tx.d>=fmt(ws)&&tx.d<=ts){
      if(tx.kind==='exp')wExp+=tx.amt||0; else if(tx.kind==='inc')wInc+=tx.amt||0;
    }
  }
  if(wDue>=3){
    var wr=Math.round(wDone/wDue*100);
    var parts=[wr+'% habits'];
    if(wMoodN>=2){var avg=wMoodSum/wMoodN;parts.push('mood '+(avg>=5.5?'trending up':avg>=3.5?'steady':'dipping'));}
    if(wExp>0) parts.push(inr(wExp)+' spent');
    ins.push({ico:'📊',title:'This week',text:parts.join(' · '),tag:wr>=70?'pos':wr>=40?'info':'neg',
      tagText:wr>=70?'on track':wr>=40?'building':'needs focus'});
  }

  // ---- 2. HABIT RISK DETECTION ----
  for(i=0;i<active.length;i++){
    h=active[i]; var st=streak(h);
    // streak at risk: had a good streak, missed yesterday
    var yds=fmt(addDays(now,-1));
    if(st===0 && dueOn(h,addDays(now,-1)) && !isDone(h,yds)){
      var prevStr=streakAsOf(h,addDays(now,-2));
      if(prevStr>=5) ins.push({ico:'⚠️',title:h.name,text:'Your <b>'+prevStr+'-day streak</b> broke yesterday. One check-in brings it back.',tag:'neg',tagText:'streak lost'});
    }
    // repeated miss on same weekday
    var dayName=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][now.getDay()];
    var missCount=0;
    for(d=0;d<21;d+=7){
      var cd=addDays(now,-d),cds=fmt(cd);
      if(dueOn(h,cd)&&!isDone(h,cds)&&cds>=h.created) missCount++;
    }
    if(missCount>=3) ins.push({ico:'📅',title:h.name,text:'Missed <b>3 '+dayName+'s in a row</b>. Reschedule or plan ahead?',tag:'info',tagText:'pattern'});
  }

  // ---- 3. MOOD-HABIT CORRELATION ----
  if(active.length>=1){
    var moodDoneScores=[],moodMissScores=[];
    for(d=0;d<30;d++){
      var dd=fmt(addDays(now,-d)),mi2=moodOf(dd);
      if(mi2<0) continue;
      var anyDone=false;
      for(i=0;i<active.length;i++){if(isDone(active[i],dd)){anyDone=true;break;}}
      if(anyDone) moodDoneScores.push(MOODS[mi2].s); else moodMissScores.push(MOODS[mi2].s);
    }
    if(moodDoneScores.length>=5&&moodMissScores.length>=3){
      var avgD=moodDoneScores.reduce(function(a,b){return a+b;},0)/moodDoneScores.length;
      var avgM=moodMissScores.reduce(function(a,b){return a+b;},0)/moodMissScores.length;
      if(avgD-avgM>=1.2){
        var bestMood=MOODS[Math.min(6,Math.round(7-avgD))];
        ins.push({ico:'😊',title:'Mood + habits',text:'You feel <b>better on days you do habits</b> (avg '+bestMood.l+' vs days off).',tag:'pos',tagText:'correlation'});
      }
    }
  }

  // ---- 4. SLEEP-MOOD INSIGHT ----
  var goodSleepMood=[],badSleepMood=[];
  for(d=0;d<30;d++){
    var sd=fmt(addDays(now,-d)),sl=sleepOn(sd),smi=moodOf(sd);
    if(!sl||sl.mins<=0||smi<0) continue;
    if(sl.mins>=420) goodSleepMood.push(MOODS[smi].s); else if(sl.mins<360) badSleepMood.push(MOODS[smi].s);
  }
  if(goodSleepMood.length>=3&&badSleepMood.length>=3){
    var avgGood=goodSleepMood.reduce(function(a,b){return a+b;},0)/goodSleepMood.length;
    var avgBad=badSleepMood.reduce(function(a,b){return a+b;},0)/badSleepMood.length;
    if(avgGood-avgBad>=1){
      ins.push({ico:'😴',title:'Sleep & mood',text:'When you sleep <b>7+ hours</b>, mood averages '+MOODS[Math.min(6,Math.round(7-avgGood))].l+'. Under 6h, it drops to '+MOODS[Math.min(6,Math.round(7-avgBad))].l+'.',tag:'info',tagText:'insight'});
    }
  }

  // ---- 5. SPENDING PATTERN ALERTS ----
  if(state.tx.length>=3){
    var monthStart=ts.slice(0,8)+'01',mExp=0,catSpend={};
    var daysLeft=new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-now.getDate();
    for(i=0;i<state.tx.length;i++){
      var t2=state.tx[i]; if(t2.kind==='exp'&&t2.d>=monthStart&&t2.d<=ts){
        mExp+=t2.amt||0; var ck=t2.cat||'Other'; catSpend[ck]=(catSpend[ck]||0)+(t2.amt||0);
      }
    }
    // top category as % of total
    if(mExp>500){
      var topCat='',topAmt=0;
      for(var k in catSpend) if(catSpend[k]>topAmt){topAmt=catSpend[k];topCat=k;}
      var pct=Math.round(topAmt/mExp*100);
      if(pct>=35) ins.push({ico:'💰',title:'Top spending',text:'<b>'+topCat+'</b> is '+pct+'% of spending ('+inr(topAmt)+') with '+daysLeft+' days left.',tag:pct>=50?'neg':'info',tagText:pct>=50?'high':'watch'});
    }
    // weekend vs weekday pattern
    var wkdayExp=0,wkdayDays=0,wkendExp=0,wkendDays=0;
    for(d=0;d<30;d++){
      var pd=addDays(now,-d),pds=fmt(pd),dow=pd.getDay();
      var dayExp=0;
      for(i=0;i<state.tx.length;i++){var tx3=state.tx[i];if(tx3.kind==='exp'&&tx3.d===pds)dayExp+=tx3.amt||0;}
      if(dow===0||dow===6){wkendExp+=dayExp;wkendDays++;}else{wkdayExp+=dayExp;wkdayDays++;}
    }
    if(wkdayDays>=5&&wkendDays>=3){
      var avgWkday=Math.round(wkdayExp/wkdayDays),avgWkend=Math.round(wkendExp/wkendDays);
      if(avgWkend>avgWkday*1.5&&avgWkend>200) ins.push({ico:'📈',title:'Weekend spending',text:'Weekends average <b>'+inr(avgWkend)+'/day</b> vs weekdays '+inr(avgWkday)+'/day.',tag:'info',tagText:'pattern'});
    }

    // budget alert
    if(state.budgets&&state.budgets.length){
      for(i=0;i<state.budgets.length;i++){
        var b=state.budgets[i]; if(!b.lim||b.lim<=0) continue;
        var bSpent=0;
        for(var j=0;j<state.tx.length;j++){
          var bt=state.tx[j];
          if(bt.kind==='exp'&&bt.d>=monthStart&&bt.d<=ts&&(b.cat==='all'||bt.cat===b.cat)) bSpent+=bt.amt||0;
        }
        var bPct=Math.round(bSpent/b.lim*100);
        if(bPct>=80) ins.push({ico:'🔔',title:(b.cat==='all'?'Total':b.cat)+' budget',text:'<b>'+bPct+'%</b> used ('+inr(bSpent)+' of '+inr(b.lim)+') with '+daysLeft+' days left.',tag:bPct>=100?'neg':'info',tagText:bPct>=100?'over budget':'almost there'});
      }
    }
  }

  // ---- 6. MILESTONE APPROACHING ----
  var MILES=[7,14,21,30,50,66,100];
  for(i=0;i<active.length;i++){
    h=active[i]; var cs=streak(h);
    for(var mi3=0;mi3<MILES.length;mi3++){
      if(cs>=MILES[mi3]-2&&cs<MILES[mi3]){
        ins.push({ico:'🏆',title:h.name,text:'<b>'+(MILES[mi3]-cs)+' day'+(MILES[mi3]-cs>1?'s':'')+' away</b> from a '+MILES[mi3]+'-day milestone!',tag:'pos',tagText:MILES[mi3]+' days'});
        break;
      }
    }
  }

  // Limit to top 4 most relevant
  return ins.slice(0,4);
}

function renderInsights(){
  var ins=generateInsights();
  if(!ins.length){$('aiInsights').innerHTML='';return;}
  var html='<div class="secH">Insights</div>';
  for(var i=0;i<ins.length;i++){
    var c=ins[i];
    html+='<div class="aiCard"><div class="aiIco">'+c.ico+'</div><div class="aiBody">'
      +'<div class="aiTitle">'+c.title+'</div>'
      +'<div class="aiText">'+c.text+'</div>'
      +(c.tag?'<span class="aiTag '+c.tag+'">'+c.tagText+'</span>':'')
      +'</div></div>';
  }
  $('aiInsights').innerHTML=html;
}

/* ---- renderAI: populate the AI page ---- */
function renderAI(){
  var provSel=$('aiProvider'),curProv=getAiProvider();for(var i=0;i<provSel.options.length;i++){if(provSel.options[i].value===curProv){provSel.selectedIndex=i;break;}}populateModels(curProv);var key=getAiKey(),configured=!!key;$('aiStatus').innerHTML='<span class="aiStatusDot '+(configured?'':'off')+'"></span><span>'+(configured?'Connected · '+AI_PROVIDERS[curProv].name+' · '+getAiModel():'Not configured · add an API key')+'</span>';$('aiCfgSummary').textContent=configured?(AI_PROVIDERS[curProv].name+' · '+getAiModel()):'Not configured · add an API key';$('aiKeyHint').textContent='Get key at '+AI_PROVIDERS[curProv].url;
}
function populateModels(provId){
  var prov=AI_PROVIDERS[provId]; if(!prov) return;
  var sel=$('aiModel'), saved=getAiModel();
  sel.innerHTML='';
  prov.models.forEach(function(m){
    var opt=document.createElement('option'); opt.value=m.id; opt.textContent=m.label;
    if(m.id===saved) opt.selected=true;
    sel.appendChild(opt);
  });
  $('aiModelHint').textContent=prov.models.length+' models · '+prov.name;
}

/* ============ TIER 2: MULTI-PROVIDER AI ENGINE ============ */
var AI_PROVIDERS = {
  gemini: {
    name: 'Google Gemini', url: 'https://aistudio.google.com/apikey',
    models: [
      {id:'gemini-2.5-flash',label:'Gemini 2.5 Flash · free'},
      {id:'gemini-2.5-flash-lite',label:'Gemini 2.5 Flash-Lite · free'},
      {id:'gemini-2.5-pro',label:'Gemini 2.5 Pro · limited free'}
    ],
    call: function(key, model, prompt, max){
      var url='https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent';
      return fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
        body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:max||300}})
      }).then(function(r){if(!r.ok) throw new Error('API '+r.status);return r.json();})
        .then(function(d){try{return d.candidates[0].content.parts[0].text;}catch(e){throw new Error('Empty response');}});
    },
    listModels: function(key){
      return fetch('https://generativelanguage.googleapis.com/v1beta/models?key='+key)
        .then(function(r){return r.json();})
        .then(function(d){return (d.models||[]).filter(function(m){return m.name && m.name.indexOf('generateContent')!==-1 || m.supportedGenerationMethods && m.supportedGenerationMethods.indexOf('generateContent')>=0;}).map(function(m){var id=m.name.replace('models/','');return{id:id,label:id+(m.displayName?' · '+m.displayName:'')};});});
    }
  },
  groq: {
    name: 'Groq', url: 'https://console.groq.com/keys',
    models: [
      {id:'openai/gpt-oss-120b',label:'GPT-OSS 120B · flagship'},
      {id:'openai/gpt-oss-20b',label:'GPT-OSS 20B · fast'},
      {id:'meta-llama/llama-4-scout-17b-16e-instruct',label:'Llama 4 Scout 17B'},
      {id:'qwen/qwen3-32b',label:'Qwen3 32B'}
    ],
    call: function(key,model,prompt,max){return openAICall('https://api.groq.com/openai/v1/chat/completions',key,model,prompt,max);},
    listModels: function(key){return openAIListModels('https://api.groq.com/openai/v1/models',key);}
  },
  openrouter: {
    name: 'OpenRouter', url: 'https://openrouter.ai/keys',
    models: [
      {id:'deepseek/deepseek-r1:free',label:'DeepSeek R1 · free'},
      {id:'google/gemma-3-27b-it:free',label:'Gemma 3 27B · free'},
      {id:'meta-llama/llama-4-maverick:free',label:'Llama 4 Maverick · free'},
      {id:'qwen/qwen3-235b-a22b:free',label:'Qwen3 235B · free'}
    ],
    call: function(key,model,prompt,max){return openAICall('https://openrouter.ai/api/v1/chat/completions',key,model,prompt,max);},
    listModels: function(key){
      return fetch('https://openrouter.ai/api/v1/models',{headers:{'Authorization':'Bearer '+key}})
        .then(function(r){return r.json();})
        .then(function(d){return (d.data||[]).filter(function(m){return m.id && m.id.indexOf(':free')>=0;}).slice(0,20).map(function(m){return{id:m.id,label:m.id.replace(':free','')+' · free'};});});
    }
  },
  mistral: {
    name: 'Mistral', url: 'https://console.mistral.ai/api-keys',
    models: [
      {id:'mistral-small-latest',label:'Mistral Small · fast'},
      {id:'mistral-medium-latest',label:'Mistral Medium'},
      {id:'mistral-large-latest',label:'Mistral Large · best'},
      {id:'open-mistral-nemo',label:'Mistral Nemo · open'},
      {id:'codestral-latest',label:'Codestral · code'}
    ],
    call: function(key,model,prompt,max){return openAICall('https://api.mistral.ai/v1/chat/completions',key,model,prompt,max);},
    listModels: function(key){return openAIListModels('https://api.mistral.ai/v1/models',key);}
  },
  cerebras: {
    name: 'Cerebras', url: 'https://cloud.cerebras.ai',
    models: [
      {id:'llama-4-scout-17b-16e-instruct',label:'Llama 4 Scout 17B'},
      {id:'llama3.1-8b',label:'Llama 3.1 8B · fast'},
      {id:'qwen-3-32b',label:'Qwen3 32B'}
    ],
    call: function(key,model,prompt,max){return openAICall('https://api.cerebras.ai/v1/chat/completions',key,model,prompt,max);},
    listModels: function(key){return openAIListModels('https://api.cerebras.ai/v1/models',key);}
  },
  grok: {
    name: 'xAI Grok', url: 'https://console.x.ai',
    models: [
      {id:'grok-3-mini-fast',label:'Grok 3 Mini Fast · free'},
      {id:'grok-3-mini',label:'Grok 3 Mini'},
      {id:'grok-3-fast',label:'Grok 3 Fast'},
      {id:'grok-3',label:'Grok 3 · best'}
    ],
    call: function(key,model,prompt,max){return openAICall('https://api.x.ai/v1/chat/completions',key,model,prompt,max);},
    listModels: function(key){return openAIListModels('https://api.x.ai/v1/models',key);}
  }
};

// OpenAI-compatible call (used by Groq, OpenRouter, Mistral, Cerebras, Grok)
function openAICall(url, key, model, prompt, max){
  return fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body:JSON.stringify({model:model,messages:[{role:'user',content:prompt}],max_tokens:max||300})
  }).then(function(r){if(!r.ok) throw new Error('API '+r.status);return r.json();})
    .then(function(d){try{return d.choices[0].message.content;}catch(e){throw new Error('Empty response');}});
}
function openAIListModels(url, key){
  return fetch(url,{headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'}})
    .then(function(r){return r.json();})
    .then(function(d){return (d.data||[]).map(function(m){return{id:m.id,label:m.id};}).slice(0,30);});
}

function getAiProvider(){ return localStorage.getItem('ai_provider')||'gemini'; }
function getAiModel(){ return localStorage.getItem('ai_model')||AI_PROVIDERS[getAiProvider()].models[0].id; }
function getAiKey(){ return localStorage.getItem('ai_key')||''; }
/* Widget AI parity: mirror the AI config into native prefs so the home-screen
   AI widget can call the exact same provider/model with the same key. */
function syncAiCfgToNative(){
  if(!nat||!nat.setAiConfig) return;
  try{ nat.setAiConfig(JSON.stringify({provider:getAiProvider(),model:getAiModel(),key:getAiKey()})); }catch(e){}
}
// backward compat: migrate old gem_api_key
if(!localStorage.getItem('ai_key')&&localStorage.getItem('gem_api_key')){
  localStorage.setItem('ai_key',localStorage.getItem('gem_api_key'));
  localStorage.setItem('ai_provider','gemini');
  localStorage.setItem('ai_model',localStorage.getItem('gem_model')||'gemini-2.5-flash');
}

function getGemKey(){ return getAiKey(); }

function gemCall(prompt, maxTokens){
  var key=getAiKey(); if(!key) return Promise.reject(new Error('No API key'));
  var prov=AI_PROVIDERS[getAiProvider()];
  if(!prov) return Promise.reject(new Error('Unknown provider'));
  var model=getAiModel();
  return prov.call(key, model, prompt, maxTokens);
}

/* ============ UNIVERSAL AI ACTION ENGINE ============ */
function buildDataContext(){
  var now=new Date(), ts=today(), lines=[];
  var active=state.habits.filter(function(h){return !h.arch;});
  lines.push('TODAY: '+ts+' ('+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][now.getDay()]+')');

  // Habits with 7-day history
  lines.push('HABITS ('+active.length+'):');
  active.forEach(function(h){
    var done7=0,due7=0,hist=[];
    for(var d=0;d<7;d++){var ds=fmt(addDays(now,-d));if(dueOn(h,addDays(now,-d))){due7++;if(isDone(h,ds)){done7++;hist.push(ds+':done');}else hist.push(ds+':miss');}};
    var rate=due7?Math.round(done7/due7*100):0;
    lines.push('- "'+h.name+'" id='+h.id+' streak='+streak(h)+' done_today='+isDone(h,ts)+' 7d_rate='+rate+'% last7=['+hist.join(',')+']');
  });

  lines.push('TASKS:');
  taskAllVisible().filter(function(t){return !t.virtualHabit;}).slice().sort(function(a,b){return taskDueMs(a)-taskDueMs(b);}).slice(0,30).forEach(function(t){var sp=taskSubProgress(t);lines.push('- \"'+t.title.replace(/\"/g,'')+'\" id='+t.id+' status='+taskEffectiveStatus(t)+' priority='+t.priority+' due='+ (t.dueDate||'none') +' '+(t.dueTime||'')+' subtasks='+sp.done+'/'+sp.total+' comments='+(t.comments||[]).length);});

  // Mood last 7 days
  lines.push('MOOD (last 7):');
  for(var dm=0;dm<7;dm++){var dsm=fmt(addDays(now,-dm)),mi=moodOf(dsm);if(mi>=0)lines.push('  '+dsm+': '+MOODS[mi].l+' ('+mi+')');}

  // Sleep last 7
  lines.push('SLEEP (last 7):');
  for(var ds2=0;ds2<7;ds2++){var dss=fmt(addDays(now,-ds2)),sl=sleepOn(dss);if(sl&&sl.mins>0)lines.push('  '+dss+': '+Math.floor(sl.mins/60)+'h'+sl.mins%60+'m bed='+sl.bed+' wake='+sl.wake);}

  // Workout exercises + recent logs + personal bests
  if(state.exs&&state.exs.length){
    var activeEx=state.exs.filter(function(e){return e.active;});
    lines.push('EXERCISES ('+activeEx.length+'):');
    activeEx.forEach(function(ex){
      var mt=MTYPES[ex.mtype]||MTYPES.reps;
      var logs=state.wlog.filter(function(w){return w.exId===ex.id;}).sort(function(a,b){return a.d>b.d?-1:1;});
      var pb=0,pbDate='',last7=[];
      for(var i=0;i<logs.length;i++){
        var v=setsTotal(ex,logs[i].sets);
        if(v>pb){pb=v;pbDate=logs[i].d;}
        if(i<7&&v>0) last7.push(logs[i].d+':'+v+mt.unit);
      }
      var totalSessions=logs.filter(function(w){return setsTotal(ex,w.sets)>0;}).length;
      lines.push('- "'+ex.name+'" type='+ex.mtype+' unit='+mt.unit+' personal_best='+pb+mt.unit+(pbDate?' ('+pbDate+')':'')+' sessions='+totalSessions);
      if(last7.length) lines.push('  recent: '+last7.join(', '));
    });
  }

  // Expenses this month
  var ms=ts.slice(0,8)+'01',mExp=0,mInc=0,cats=[];
  state.tx.forEach(function(t){if(t.d>=ms&&t.d<=ts){if(t.kind==='exp')mExp+=t.amt||0;else if(t.kind==='inc')mInc+=t.amt||0;}});
  lines.push('MONEY this month: income='+mInc+' expenses='+mExp+' net='+(mInc-mExp));
  if(state.cats)for(var ck in state.cats)cats.push(ck);
  if(cats.length)lines.push('CATEGORIES: '+cats.join(', '));
  if(state.accts)state.accts.forEach(function(a){if(a.active!==false)lines.push('ACCOUNT: "'+a.name+'" id='+a.id+' bal='+acctBalance(a.id));});
  return lines.join('\n');
}
function uaiPrompt(text){
  return 'You are the universal AI assistant for Personal Tracker. You can READ/CREATE/UPDATE/DELETE across: Habits, Tasks, Expenses, Mood, Sleep, Settings.\n\n'
  +'APP DATA:\n'+buildDataContext()+'\n\n'
  +'RESPOND WITH ONLY ONE JSON OBJECT (no markdown, no backticks, no extra text):\n'
  +'{"action":"TYPE","params":{...},"message":"short confirmation"}\n\n'
  +'ACTIONS:\n'
  +'add_expense: {amt,cat,sub,note,kind("exp"/"inc"),date("YYYY-MM-DD"),acct}\n'
  +'delete_expense: {date,cat,amt} if ambiguous set confirm:true\n'
  +'add_habit: {name,goal(default 1)}\n'
  +'complete_habit: {name,date}\n'
  +'uncomplete_habit: {name,date}\n'
  +'delete_habit: {name} always confirm:true\n'
  +'set_mood: {mood(0=Excellent,1=Happy,2=Calm,3=Neutral,4=Tired,5=Sad,6=Stressed),date,note}\n'
  +'delete_mood: {date}\n'
  +'set_sleep: {date,bed("HH:MM" 24h),wake("HH:MM" 24h),mins(total)}\n'
  +'delete_sleep: {date}\n'
  +'add_task: {title,description,dueDate,dueTime,priority(high/medium/low),reminders([1,2]),recurrence({freq(none/daily/weekdays/weekly/monthly/custom),interval,endDate}),subtasks([titles])}\n'
  +'complete_task: {id,title}\n'
  +'reopen_task: {id,title}\n'
  +'update_task: {id,match,newTitle,description,dueDate,dueTime,priority,status,reminders,recurrence}\n'
  +'change_setting: {key,value} (theme:dark/light, curr:symbol)\n'
  +'query: {} message=answer the question from app data\n'
  +'clarify: {} message=ask for missing info\n\n'
  +'For update_task, use match for the existing task title and id when available; title is the new title only when renaming. Task due dates may be in the future.\nRULES: yesterday='+fmt(addDays(new Date(),-1))+' today='+today()+'. "slept at 11"=23:00. Map mood words: happy=1,calm=2,tired=4,sad=5,stressed=6,great=0,neutral=3. Match habits by name. Keep message under 2 lines.\n'
  +'For QUERIES: answer with specific numbers from the data. For workout questions, use exercise logs/personal bests. For "best workout" questions, reference the personal_best and recent sessions. For "how to improve" questions, analyze patterns (consistency, progression, frequency) and give actionable advice. For summaries, cover the requested timeframe with real data points.\n\n'
  +'User: '+text;
}
function executeAction(r){
  try{
    var a=r.action,p=r.params||{},msg=r.message||'Done',d=p.date||today();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d) || (d>today() && ['add_task','update_task'].indexOf(a)<0)) return {ok:0,msg:'Use a valid date today or earlier.'};
    if(a==='add_task'){
      var title=String(p.title||'').trim();if(!title)return{ok:0,msg:'Enter a task name.'};
      var td=String(p.dueDate||'');if(td&&!/^\d{4}-\d{2}-\d{2}$/.test(td))return{ok:0,msg:'Use a valid task due date.'};
      var nt=normTask({title:title,description:String(p.description||''),dueDate:td,dueTime:String(p.dueTime||''),priority:['high','medium','low'].indexOf(p.priority)>=0?p.priority:'medium',reminders:Array.isArray(p.reminders)?p.reminders:[],recurrence:p.recurrence||{freq:'none'},subtasks:Array.isArray(p.subtasks)?p.subtasks.map(function(x){return typeof x==='string'?{title:x}:x;}):[],createdAt:Date.now(),updatedAt:Date.now()});
      state.tasks.push(nt);persist();taskReminderPermissionNotice(nt);if($('pgTasks').classList.contains('on'))renderTasks();return{ok:1,msg:msg,detail:'Task created · '+(td||'no due date'),undo:function(){state.tasks=state.tasks.filter(function(x){return x.id!==nt.id;});persist();}};
    }
    if(a==='complete_task'||a==='reopen_task'){
      var q=String(p.title||'').trim(),tt=p.id?state.tasks.find(function(x){return x.id===p.id;}):taskFindByQuery(q);if(!tt){var cands=state.tasks.filter(function(x){return q&&x.title.toLowerCase().indexOf(q.toLowerCase())>=0;});if(cands.length>1)return{ok:0,msg:'I found multiple matching tasks. Specify the task name more clearly.'};tt=cands[0];}
      if(!tt)return{ok:0,msg:'Task not found.'};
      var before=JSON.parse(JSON.stringify(tt));tt.status=a==='complete_task'?'completed':'open';tt.completedAt=a==='complete_task'?Date.now():0;tt.updatedAt=Date.now();var next=null;if(a==='complete_task')next=taskCreateNextOccurrence(tt);persist();if($('pgTasks').classList.contains('on'))renderTasks();return{ok:1,msg:msg,detail:tt.title+(next?' · next '+taskDateLabel(next):''),undo:function(){var ix=state.tasks.findIndex(function(x){return x.id===tt.id;});if(ix>=0)state.tasks[ix]=before;if(next)state.tasks=state.tasks.filter(function(x){return x.id!==next.id;});persist();}};
    }
    if(a==='update_task'){
      var ut=p.id?state.tasks.find(function(x){return x.id===p.id;}):taskFindByQuery(String(p.match||p.title||''));if(!ut)return{ok:0,msg:'Task not found.'};var old=JSON.parse(JSON.stringify(ut));var wasCompleted=ut.status==='completed';if(p.newTitle!==undefined)ut.title=String(p.newTitle).trim().slice(0,100)||ut.title;if(p.description!==undefined)ut.description=String(p.description).slice(0,1000);if(p.dueDate!==undefined)ut.dueDate=/^\d{4}-\d{2}-\d{2}$/.test(String(p.dueDate))?String(p.dueDate):'';if(p.dueTime!==undefined)ut.dueTime=String(p.dueTime||'');if(['high','medium','low'].indexOf(p.priority)>=0)ut.priority=p.priority;if(['open','inprogress','completed'].indexOf(p.status)>=0){ut.status=p.status;ut.completedAt=p.status==='completed'?Date.now():0;}if(Array.isArray(p.reminders))ut.reminders=p.reminders;if(p.recurrence)ut.recurrence=p.recurrence;var nextUpdate=null;if(!wasCompleted&&ut.status==='completed'){ut.completedAt=Date.now();nextUpdate=taskCreateNextOccurrence(ut);}ut.updatedAt=Date.now();persist();if($('pgTasks').classList.contains('on'))renderTasks();return{ok:1,msg:msg,detail:ut.title+(nextUpdate?' · next '+taskDateLabel(nextUpdate):''),undo:function(){var ix=state.tasks.findIndex(function(x){return x.id===ut.id;});if(ix>=0)state.tasks[ix]=old;if(nextUpdate)state.tasks=state.tasks.filter(function(x){return x.id!==nextUpdate.id;});persist();}};
    }
    if(a==='add_expense'){
      var kind=p.kind==='inc'?'inc':'exp', amt=Number(p.amt), acct=String(p.acct||'');
      if(!isFinite(amt)||amt<=0)return{ok:0,msg:'Enter an amount greater than zero.'};
      var accts=activeAccts(); if(!acct && accts.length===1)acct=accts[0].id;
      if(!acct || !acctById(acct) || (acctById(acct).active===false))return{ok:0,msg:'Choose a valid active account.'};
      var cat=String(p.cat||'Other').slice(0,40), known=kind==='inc'?(state.incCats||[]):Object.keys(state.cats||{});
      if(known.length && known.indexOf(cat)<0)cat='Other';
      var tx=normTx({d:d,kind:kind,amt:amt,acct:acct,cat:cat,sub:String(p.sub||'').slice(0,40),payee:String(p.payee||'').slice(0,60),note:String(p.note||'').slice(0,200),created:Date.now()});
      state.tx.push(tx);persist();
      return{ok:1,msg:msg,detail:(kind==='inc'?'+':'−')+inr(amt)+' · '+cat+' · '+d,undo:function(){state.tx=state.tx.filter(function(t){return t.id!==tx.id;});persist();}};
    }
    if(a==='delete_expense'){var f=state.tx.filter(function(t){return t.kind==='exp'&&t.d===d&&(!p.cat||t.cat===p.cat)&&(!p.amt||Math.abs(Number(t.amt)-Number(p.amt))<0.01);});if(!f.length)return{ok:0,msg:'No matching expense for '+d};if(f.length>1&&!p.id)return{ok:0,msg:'I found multiple matching expenses. Specify the merchant or amount.'};var del=p.id?state.tx.find(function(t){return t.id===p.id;}):f[0];if(!del)return{ok:0,msg:'That transaction is no longer available.'};if(!r.confirm)return{ok:0,msg:'Please confirm deleting '+inr(del.amt)+' · '+(del.payee||del.cat||'expense')+'.',needConfirm:1,pending:{action:'delete_expense',params:{date:del.d,cat:del.cat,amt:del.amt,id:del.id},confirm:true}};state.tx=state.tx.filter(function(t){return t.id!==del.id;});persist();return{ok:1,msg:msg,detail:'Removed '+inr(del.amt)+' · '+del.cat,undo:function(){state.tx.push(del);persist();}};}
    if(a==='add_habit'){
      if(!String(p.name||'').trim())return{ok:0,msg:'Enter a habit name.'};
      openEdit(null);$('fName').value=String(p.name).slice(0,40);if(p.goal>1)$('fGoal').value=p.goal;saveHabit();if(sheetOpen)closeSheet();persist();
      return{ok:1,msg:msg,detail:'"'+p.name+'" created'};
    }
    if(a==='complete_habit'||a==='uncomplete_habit'){
      var h=state.habits.find(function(hh){return !hh.arch&&hh.name.toLowerCase()===String(p.name||'').toLowerCase();}) || state.habits.find(function(hh){return !hh.arch&&hh.name.toLowerCase().indexOf(String(p.name||'').toLowerCase())>=0;});
      if(!h)return{ok:0,msg:'Habit "'+p.name+'" not found'};
      setVal(h.id,d,a==='complete_habit'?(h.goal||1):0);persist();return{ok:1,msg:msg,detail:h.name+' · '+d};
    }
    if(a==='delete_habit'){var hd=state.habits.find(function(hh){return !hh.arch&&hh.name.toLowerCase()===String(p.name||'').toLowerCase();})||state.habits.find(function(hh){return !hh.arch&&hh.name.toLowerCase().indexOf(String(p.name||'').toLowerCase())>=0;});if(!hd)return{ok:0,msg:'Habit not found'};if(!r.confirm)return{ok:0,msg:'Please confirm deleting habit “'+hd.name+'”.',needConfirm:1,pending:{action:'delete_habit',params:{id:hd.id,name:hd.name},confirm:true}};var oldHabit=JSON.parse(JSON.stringify(hd));state.habits=state.habits.filter(function(x){return x.id!==hd.id;});delete state.hlog[hd.id];persist();return{ok:1,msg:msg,detail:'Deleted “'+hd.name+'”',undo:function(){state.habits.push(oldHabit);persist();}};}
    if(a==='set_mood'){
      var mi=typeof p.mood==='number'?p.mood:3;if(mi<0||mi>6)return{ok:0,msg:'Mood must be between 0 and 6.'};state.mood[d]=mi;
      if(p.note){if(!state.moodNotes)state.moodNotes={};state.moodNotes[d]=String(p.note).slice(0,160);} persist();return{ok:1,msg:msg,detail:MOODS[mi].e+' '+MOODS[mi].l+' · '+d};
    }
    if(a==='delete_mood'){var prev=state.mood[d];delete state.mood[d];if(state.moodNotes)delete state.moodNotes[d];persist();return{ok:1,msg:msg,undo:function(){if(prev!==undefined)state.mood[d]=prev;persist();}};}
    if(a==='set_sleep'){
      var bed=String(p.bed||'23:00'),wake=String(p.wake||'06:00'); if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(bed)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(wake))return{ok:0,msg:'Use valid 24-hour bed and wake times.'};
      var mins=sleepMins(bed,wake); if(mins<=0)return{ok:0,msg:'Sleep duration must be greater than zero.'};
      var si=state.sleep.findIndex(function(s){return s.d===d;}),entry={d:d,bed:bed,wake:wake,mins:mins,note:String(p.note||'').slice(0,160)};
      if(si>=0)state.sleep[si]=entry;else state.sleep.push(entry);persist();return{ok:1,msg:msg,detail:'Bed '+entry.bed+' · Wake '+entry.wake+' · '+Math.floor(entry.mins/60)+'h'+entry.mins%60+'m'};
    }
    if(a==='delete_sleep'){var oldSleep=state.sleep.find(function(s){return s.d===d;});state.sleep=state.sleep.filter(function(s){return s.d!==d;});persist();return{ok:1,msg:msg,undo:function(){if(oldSleep)state.sleep.push(oldSleep);persist();}};}
    if(a==='change_setting'){if(p.key==='theme'&&['dark','light','auto','amoled'].indexOf(p.value)<0)return{ok:0,msg:'Unsupported theme.'};if(p.key==='theme'){state.set.theme=p.value;applyTheme();}else if(p.key==='curr'){var c=String(p.value||'');if(!c)return{ok:0,msg:'Currency cannot be empty.'};state.set.curr=c.slice(0,4);}else return{ok:0,msg:'Unsupported setting.'};persist();return{ok:1,msg:msg};}
    if(a==='query')return{ok:1,msg:msg,isQuery:1};
    if(a==='clarify')return{ok:0,msg:msg,isClarify:1};
    return{ok:0,msg:'Unsupported AI action.'};
  }catch(e){return{ok:0,msg:'Could not complete that action: '+e.message};}
}
try{localStorage.removeItem('ai_recent');}catch(e){} // Recent feature removed (v5.4)
function uaiSend(text){
  if(!text||!text.trim())return;
  var log=$('uaiLog');
  log.innerHTML+='<div class="uaiMsg user">'+text.replace(/</g,'&lt;')+'</div>';
  log.innerHTML+='<div class="uaiMsg bot" id="uaiTyping" style="opacity:.5">Thinking\u2026</div>';
  log.scrollTop=log.scrollHeight;
  gemCall(uaiPrompt(text),500).then(function(raw){
    var el=$('uaiTyping');if(el)el.remove();
    var clean=raw.replace(/```json|```/g,'').trim(),result;
    try{result=JSON.parse(clean);}catch(e){log.innerHTML+='<div class="uaiMsg bot">'+raw.replace(/</g,'&lt;').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>')+'</div>';log.scrollTop=log.scrollHeight;return;}
    var res=executeAction(result),html='<div class="uaiMsg bot">';
    if(res.ok){
      html+='<div class="uaiAction"><div class="uaiCheck">\u2713 '+res.msg+'</div>';
      if(res.detail)html+='<div class="uaiDetail">'+res.detail+'</div>';
      html+='</div>';
      if(res.undo){var uid='_u'+Date.now();window[uid]=res.undo;html+='<div class="uaiBtns"><button onclick="'+uid+'();this.closest(\'.uaiMsg\').remove();reRenderCurrent();toastN(\'Undone\')">Undo</button></div>';}
    }else if(res.needConfirm&&res.pending){var pid='aiConfirm_'+Date.now();window[pid]=function(){var rr=executeAction(res.pending);var lg=$('uaiLog');if(lg){lg.innerHTML+='<div class="uaiMsg bot"><div class="uaiAction"><div class="uaiCheck">'+(rr.ok?'✓ ':'')+esc(rr.msg||'Done')+'</div>'+(rr.detail?'<div class="uaiDetail">'+esc(rr.detail)+'</div>':'')+'</div></div>';lg.scrollTop=lg.scrollHeight;}reRenderCurrent();};html+='<div class="uaiAction"><div class="uaiCheck">'+esc(res.msg)+'</div><div class="uaiBtns"><button class="primary" onclick="'+pid+'();this.disabled=true">Confirm</button><button class="sbtn" onclick="this.closest(\'.uaiMsg\').remove()">Cancel</button></div></div>';
    }else if(res.isQuery){html+=res.msg.replace(/</g,'&lt;').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>');}
    else{html+=res.msg.replace(/</g,'&lt;');}
    html+='</div>';log.innerHTML+=html;log.scrollTop=log.scrollHeight;reRenderCurrent();
  }).catch(function(e){var el=$('uaiTyping');if(el)el.remove();log.innerHTML+='<div class="uaiMsg err">'+e.message+'</div>';log.scrollTop=log.scrollHeight;});
}
function reRenderCurrent(){try{if($('pgToday').classList.contains('on'))renderToday();if($('pgMood').classList.contains('on'))renderMood();if($('pgExp').classList.contains('on'))renderExp();if($('pgStats').classList.contains('on'))renderStats();if($('pgTasks').classList.contains('on'))renderTasks();}catch(e){}}
function periodRate(h,days){var now=new Date(),due=0,done=0;for(var i=0;i<days;i++){var d=addDays(now,-i),ds=fmt(d);if(ds<h.created)continue;if(dueOn(h,d)){due++;if(isDone(h,ds))done++;}}return due?done/due:0;}

// ---- AI weekly narrative ----
function genWeeklyNarrative(){
  var ctx=buildDataContext();
  var prompt='You are a supportive personal tracker AI. Write a 2-3 sentence weekly summary for the user based on this data. Be specific, mention actual habit names and numbers. Be encouraging but honest. No generic advice.\n\nDATA:\n'+ctx;
  gemCall(prompt,200).then(function(r){
    localStorage.setItem('ai_weekly_narr',r.replace(/</g,'&lt;').replace(/>/g,'&gt;'));
    localStorage.setItem('ai_weekly_narr_day',today());
    renderInsights();
  }).catch(function(){ localStorage.removeItem('ai_weekly_narr'); renderInsights(); });
}

// ---- Habit coaching (on streak break) ----
function getHabitCoaching(h){
  var ctx='Habit: '+h.name+'\nPrevious streak before break: '+streakAsOf(h,addDays(new Date(),-2))+' days\n30-day rate: '+Math.round(periodRate(h,30)*100)+'%\nSchedule: '+(h.days?h.days.join(','):'daily');
  var prompt='You are a habit coach. The user just broke their streak on "'+h.name+'". Give ONE specific, actionable recovery tip in 1-2 sentences. Be warm but practical. Reference the actual data.\n\n'+ctx;
  return gemCall(prompt,120);
}

function renderTaskDashboard(){var b=$('taskDashSummary');if(!b)return;var all=taskAllVisible(),over=all.filter(function(t){return taskEffectiveStatus(t)==='overdue';}).length,todayN=all.filter(function(t){return t.dueDate===today()&&taskEffectiveStatus(t)!=='completed';}).length,up=all.filter(function(t){return t.dueDate&&t.dueDate>today()&&taskEffectiveStatus(t)!=='completed';}).length,done=state.tasks.filter(function(t){return t.status==='completed';}).length;b.innerHTML='<div class="taskDashHead"><b>Tasks</b><button id="taskDashView">View Tasks</button></div><div class="taskDashLine"><span class="red">🔴 <b>'+over+'</b> overdue</span><span class="orange">🟠 <b>'+todayN+'</b> due today</span><span class="blue">🔵 <b>'+up+'</b> upcoming</span><span class="green">✅ <b>'+done+'</b> completed</span></div>';}

function renderToday(){
  renderTaskDashboard();
  var now = new Date();
  $('dateLine').textContent = now.toLocaleDateString(undefined, {weekday:'long', day:'numeric', month:'long'});
  $('greet').textContent = greetTxt();
  var dmsg = dayMessage();
  $('qod').textContent = dmsg;
  $('qod').className = 'dayMsg';
  $('qod').style.display = dmsg ? '' : 'none';
  $('nextRem').innerHTML = nextReminderStr();

  var ts = today(), due = [], doneN = 0, liveCnt = 0;
  for(var i=0;i<state.habits.length;i++){
    var h = state.habits[i];
    if(!h.arch) liveCnt++;
    if(dueOn(h, now)){ due.push(h); if(isDone(h,ts) || isFroz(h,ts)) doneN++; }
  }
  $('empty').hidden = liveCnt > 0;
  var restDay = liveCnt > 0 && due.length === 0;
  $('hero').style.display = (liveCnt && !restDay) ? '' : 'none';
  if(!restDay) $('hero').innerHTML = heroRing(due, doneN);
  var rb = $('restBox');
  if(restDay){
    rb.style.display = '';
    rb.innerHTML = '<div class="re">\uD83C\uDF3F</div><div class="rt">Rest day</div>'
      + '<div class="rs">Nothing scheduled \u2014 your habits return ' + nextDueLabel() + '.</div>';
  } else rb.style.display = 'none';
  var mxs = 0;
  for(var qi=0; qi<state.habits.length; qi++){
    if(state.habits[qi].arch) continue;
    var qs2 = streak(state.habits[qi]);
    if(qs2 > mxs) mxs = qs2;
  }
  var wk = periodStats(weekStart(now), now);
  var momTxt = due.length ? Math.round(doneN / due.length * 100) : Math.round(wk.rate * 100);
  $('momPct').innerHTML = liveCnt ? momTxt + '<small>%</small>' : '\u2013';
  $('chainLine').textContent = mxs > 0 ? '\uD83D\uDD25 ' + mxs + '-day chain' : 'Forge your first link today';
  var wd = '', wdN = new Date();
  for(var wi=6; wi>=0; wi--){
    var wDay = addDays(wdN, -wi), wDs = fmt(wDay);
    var wDue = 0, wDone = 0;
    for(var wh=0; wh<state.habits.length; wh++){
      var whh = state.habits[wh];
      if(whh.arch && (!whh.archAt || wDs >= whh.archAt)) continue;
      if(onVacation(wDs) || !dueOn(whh, wDay)) continue;
      wDue++;
      if(isDone(whh, wDs) || isFroz(whh, wDs)) wDone++;
    }
    var cls = wDue === 0 ? 'n' : '';
    var dot = wDue === 0 ? '' : (wDone >= wDue ? 'p' : (wDone > 0 ? 'h' : 'z'));
    wd += '<div class="wkC ' + cls + '">' + 'MTWTFSS'[(wDay.getDay()+6)%7]
      + '<i class="' + dot + '"></i></div>';
  }
  $('wkdots').style.display = liveCnt ? '' : 'none';
  $('wkdots').innerHTML = wd;
  renderWkCard();
  renderDailyInsightToday();

  var rb = '';
  if(onVacation(ts)){
    rb += '<div class="banner ice"><div class="bt">Vacation mode until <b>'+niceDate(state.set.vacUntil)
      + '</b> \u2014 nothing is due and every chain stays safe.</div>'
      + '<button class="bbtn ice" data-act="vacEnd">End</button></div>';
  }
  var rec = onVacation(ts) ? [] : recoverList();
  for(var r=0;r<rec.length;r++){
    rb += '<div class="banner"><div class="bt">Chain broken yesterday for <b>'+esc(rec[r].name)
      + '</b>. Use a freeze to recover it?</div>'
      + '<button class="bbtn" data-act="recover" data-id="'+rec[r].id+'">Recover \u2744\uFE0F</button></div>';
  }
  $('recoverBox').innerHTML = rb;

  var filterOn = srchQ.length > 0 || srchCat !== 'all';

  var sb = '';
  var stIds = filterOn ? [] : state.stack.filter(function(id){ var h=findHabit(id); return h && dueOn(h, now); });
  if(stIds.length){
    var curFound = false;
    sb = '<div class="stackCard"><div class="stackT">Routine stack</div>';
    for(var k=0;k<stIds.length;k++){
      var sh = findHabit(stIds[k]);
      var dn = isDone(sh, ts);
      var cur = !dn && !curFound; if(cur) curFound = true;
      sb += '<div class="sRow'+(dn?' dn':'')+(cur?' cur':'')+'" data-act="stk" data-id="'+sh.id+'">'
        + (k < stIds.length-1 ? '<div class="sLine'+(dn?' onL':'')+'"></div>' : '')
        + '<div class="sDot">'+sh.emoji+'</div>'
        + '<div class="sName">'+esc(sh.name)+'</div>'
        + '<div class="sChk">'+(dn?'\u2713':'\u25CB')+'</div></div>';
    }
    sb += '</div>';
  }
  $('stackBox').innerHTML = sb;

  var html = '';
  if(filterOn){
    var found = 0;
    for(var f=0; f<state.habits.length; f++){
      var fh = state.habits[f];
      if(srchCat !== 'all' && fh.cat !== srchCat) continue;
      if(srchQ && fh.name.toLowerCase().indexOf(srchQ) < 0) continue;
      found++;
      if(fh.arch) html += miniCard(fh, 'Archived \u00B7 tap to view');
      else if(dueOn(fh, now)) html += cardHTML(fh);
      else html += miniCard(fh, restLabel(fh));
    }
    if(!found) html = '<div class="setS" style="text-align:center;padding:24px 0">No habits match.</div>';
  } else {
    for(var s2=0;s2<SECTIONS.length;s2++){
      var sec = SECTIONS[s2][0], items = [];
      for(var q=0;q<due.length;q++) if((due[q].section||'any') === sec) items.push(due[q]);
      if(!items.length) continue;
      html += '<div class="secH">'+SECTIONS[s2][1]+'</div>';
      for(var w=0;w<items.length;w++) html += cardHTML(items[w]);
    }
    var rest = [];
    if(!onVacation(ts)){
      for(var z=0;z<state.habits.length;z++){
        var hz = state.habits[z];
        if(hz.arch) continue;
        if(!dueOn(hz, now)) rest.push(hz);
      }
    }
    if(rest.length){
      html += '<div class="secH">Not today</div>';
      for(var y=0;y<rest.length;y++) html += miniCard(rest[y], restLabel(rest[y]));
    }
  }
  $('list').innerHTML = html;
  renderInsights();
}

/* ================= sheets infra ================= */
var sheetOpen = null, popGuard = false, delTimer = null;
function openSheet(id){
  if(sheetOpen) return;
  sheetOpen = id;
  $(id).classList.add('open');
  $('scrim').classList.add('on');
  try{ history.pushState({s:1},''); }catch(e){}
}
function closeSheet(fromPop){
  if(!sheetOpen) return;
  $(sheetOpen).classList.remove('open');
  $('scrim').classList.remove('on');
  sheetOpen = null;
  resetDelBtn(); resetJrDel(); selMiss = null;
  if(!fromPop){ popGuard = true; try{ history.back(); }catch(e){ popGuard=false; } }
}
window.addEventListener('popstate', function(){
  if(popGuard){ popGuard = false; return; }
  if(sheetOpen) closeSheet(true);
});

/* ================= native picker plumbing ================= */
var pendingTimeIdx = -1, pendingDateField = '';
function openTimePicker(i){
  pendingTimeIdx = i;
  var cur = (ed && ed.rem.times[i]) || '07:30';
  var p = cur.split(':');
  if(nat && nat.pickTime){ try{ nat.pickTime(+p[0], +p[1]); return; }catch(e){} }
  var v = prompt('Reminder time (HH:MM, 24h)', cur);
  if(v && /^\d{1,2}:\d{2}$/.test(v)){
    var pp = v.split(':');
    window.timeResult(pad(Math.min(23,+pp[0])) + ':' + pad(Math.min(59,+pp[1])));
  } else pendingTimeIdx = -1;
}
window.timeResult = function(hm){
  if(sleepTimeActive){ applySleepTime(hm); return; }
  if(jrTimePick){
    jrTimePick = false;
    state.set.jrRem = hm;
    persist(); renderSet();
    toastN('Journal reminder at ' + timeFmt(hm));
    maybeAskFullscreen();
    return;
  }
  if(pendingTimeIdx >= 0 && ed && ed.rem.times[pendingTimeIdx] !== undefined){
    ed.rem.times[pendingTimeIdx] = hm;
  }
  pendingTimeIdx = -1;
  if(ed) renderRemList();
};
function openDatePicker(field){
  pendingDateField = field;
  var cur = (ed && ed[field]) || today();
  var p = cur.split('-');
  if(nat && nat.pickDate){ try{ nat.pickDate(+p[0], +p[1]-1, +p[2]); return; }catch(e){} }
  var v = prompt('Date (YYYY-MM-DD)', cur);
  if(v && /^\d{4}-\d{2}-\d{2}$/.test(v)) window.dateResult(v);
  else pendingDateField = '';
}
window.dateResult = function(iso){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)){ pendingDateField = ''; return; }
  if(pendingDateField === 'expDate'){
    pendingDateField='';
    if(expEd){ expEd.d = iso > today() ? today() : iso; $('expDateTxt').textContent = expEd.d===today()?'Today':niceDate(expEd.d); }
    return;
  }
  if(pendingDateField === 'jrDate'){
    pendingDateField = '';
    if(jrEd){
      jrEd.d = iso > today() ? today() : iso;
      $('jrDateTxt').textContent = jrEd.d === today() ? 'Today' : niceDate(jrEd.d);
    }
    return;
  }
  if(pendingDateField === 'vacUntil'){
    pendingDateField = '';
    if(iso < today()){ toastN('Pick today or a future date'); return; }
    state.set.vacFrom = today(); state.set.vacUntil = iso;
    persist(); renderToday(); renderSet();
    toastN('On vacation until ' + niceDate(iso) + ' \uD83C\uDFDD\uFE0F');
    return;
  }
  if(pendingDateField && ed){
    ed[pendingDateField] = iso;
  }
  pendingDateField = '';
  if(ed) refreshDateBtns();
};
function refreshDateBtns(){
  $('startTxt').textContent = ed.start === today() ? 'Today' : niceDate(ed.start);
  $('endTxt').textContent = ed.end ? niceDate(ed.end) : 'None';
  $('btnEndClr').style.display = ed.end ? '' : 'none';
}

/* ================= add / edit sheet ================= */
var ed = null;
function blankHabit(){
  var used={}; for(var i=0;i<state.habits.length;i++) used[state.habits[i].color]=1;
  var col=null;
  for(var c=0;c<COLORS.length;c++){ if(!used[COLORS[c]]){ col=COLORS[c]; break; } }
  if(!col) col=COLORS[state.habits.length % COLORS.length];
  return normHabit({name:'', emoji:EMOJIS[0], color:col, type:'check', target:8,
    sched:{kind:'daily', dows:[1,2,3,4,5], x:2, quota:3}, rem:{times:[], repeat:false, missed:false},
    section:'any', cat:'Health', start: today()});
}
function selChip(rowId, attr, value){
  var row = $(rowId), btns = row.querySelectorAll('.chip');
  for(var i=0;i<btns.length;i++)
    btns[i].classList.toggle('sel', btns[i].getAttribute(attr) === value);
}
function selGrid(gridId, attr, value){
  var g = $(gridId), btns = g.children;
  for(var i=0;i<btns.length;i++)
    btns[i].classList.toggle('sel', btns[i].getAttribute(attr) === value);
}
function refreshTypeRows(){
  var t = ed.type;
  $('tRow').style.display = (t==='count'||t==='time'||t==='money') ? 'flex' : 'none';
  $('fUnit').style.display = t==='count' ? '' : 'none';
  $('tLbl').textContent = t==='time' ? 'minutes / day' : (t==='money' ? '\u20B9 / day' : 'per day');
  if(t==='time' && (!ed.target || ed.target===8)) { ed.target = 20; $('fTarget').value = 20; }
  if(t==='money' && (!ed.target || ed.target===8)) { ed.target = 100; $('fTarget').value = 100; }
}
function refreshSchedRows(){
  var k = ed.sched.kind;
  $('dowRow').style.display = k==='dow' ? 'flex' : 'none';
  $('xRow').style.display = k==='everyx' ? 'flex' : 'none';
  $('qRow').style.display = (k==='wquota'||k==='mquota') ? 'flex' : 'none';
  $('qLbl').textContent = k==='mquota' ? 'times per month' : 'times per week';
  var dws = $('dowRow').children;
  for(var i=0;i<dws.length;i++)
    dws[i].classList.toggle('sel', ed.sched.dows.indexOf(+dws[i].getAttribute('data-dw')) >= 0);
}
function renderRemList(){
  var html = '';
  for(var i=0;i<ed.rem.times.length;i++){
    html += '<div class="remRow">'
      + '<button class="remTime" data-ri="'+i+'"><span class="ri">\u23F0</span>' + timeFmt(ed.rem.times[i]) + '</button>'
      + '<button class="remDel" data-rd="'+i+'">\u00D7</button></div>';
  }
  $('remList').innerHTML = html;
}
function syncForm(){
  $('fName').value = ed.name;
  $('fTarget').value = ed.target; $('fUnit').value = ed.unit;
  $('fX').value = ed.sched.x; $('fQ').value = ed.sched.quota;
  $('fNotes').value = ed.notes; $('fQuote').value = ed.quote;
  $('swRepeat').classList.toggle('on', !!ed.rem.repeat);
  $('swMissed').classList.toggle('on', !!ed.rem.missed);
  selChip('typeRow','data-ty',ed.type);
  selChip('catRow','data-cat',ed.cat);
  selChip('secRow','data-sec',ed.section);
  selChip('schRow','data-sk',ed.sched.kind);
  selGrid('egrid','data-e',ed.emoji);
  selGrid('cgrid','data-c',ed.color);
  refreshTypeRows(); refreshSchedRows(); renderRemList(); refreshDateBtns();
}
function openEdit(id){
  ed = id ? JSON.parse(JSON.stringify(findHabit(id))) : blankHabit();
  ed._edit = id || '';
  $('shTitle').textContent = id ? 'Edit habit' : 'Add habit';
  $('saveBtn').textContent = id ? 'Save changes' : 'Add habit';
  syncForm();
  openSheet('addSheet');
}
function saveHabit(){
  var name = $('fName').value.replace(/^\s+|\s+$/g,'');
  if(!name){ $('fName').focus(); return; }
  ed.name = name;
  ed.target = Math.max(1, +$('fTarget').value || 1);
  ed.unit = $('fUnit').value.slice(0,12);
  ed.sched.x = Math.max(2, +$('fX').value || 2);
  ed.sched.quota = Math.max(1, +$('fQ').value || 1);
  if(!ed.start) ed.start = today();
  if(ed.end && ed.end < ed.start) ed.end = '';
  ed.notes = $('fNotes').value; ed.quote = $('fQuote').value;
  ed.rem.repeat = $('swRepeat').classList.contains('on');
  ed.rem.missed = $('swMissed').classList.contains('on');
  ed.rem.times.sort();
  if(ed._edit){
    var h = findHabit(ed._edit);
    var keep = {id:h.id, created:h.created, done:h.done, frozen:h.frozen, fz:h.fz};
    var idx = state.habits.indexOf(h);
    delete ed._edit;
    ed.id = keep.id; ed.created = keep.created; ed.done = keep.done; ed.frozen = keep.frozen; ed.fz = keep.fz;
    state.habits[idx] = normHabit(ed);
  } else {
    delete ed._edit;
    state.habits.push(normHabit(ed));
  }
  persist(); if(ed && ed.rem && ed.rem.times.length) maybeAskFullscreen();
  closeSheet(); renderToday(); buzz(14);
}

/* ================= detail sheet ================= */
var detailId = null, detailY = 0, detailM = 0, selMiss = null;
function openDetail(id){
  var h = findHabit(id); if(!h) return;
  detailId = id; selMiss = null;
  var now = new Date();
  detailY = now.getFullYear(); detailM = now.getMonth();
  renderDetail();
  openSheet('detailSheet');
}
var TYPELBL = {check:'Yes / No', count:'Count', time:'Time', neg:'Negative', money:'Money saving'};
function renderDetail(){
  var h = findHabit(detailId); if(!h) return;
  $('dEmo').textContent = h.emoji;
  $('dEmo').style.background = hexRgba(h.color,.14);
  $('dName').textContent = h.name;
  var bits = [TYPELBL[h.type]||'Habit', h.cat];
  if(targ(h)>1) bits.push(h.target + (h.unit? ' '+h.unit : (h.type==='time'?' min':h.type==='money'?' \u20B9':'')) + '/day');
  if(h.rem.times.length) bits.push('\u23F0 ' + h.rem.times.map(timeFmt).join(', '));
  bits.push('since ' + niceDate(h.created));
  $('dSub').textContent = bits.join(' \u00B7 ');
  $('dQuote').textContent = h.quote ? '\u201C'+h.quote+'\u201D' : '';
  $('dNotes').textContent = h.notes || '';
  $('sStreak').textContent = streak(h);
  $('sBest').textContent = bestStreak(h);
  $('sTotal').textContent = totalDone(h);
  var now = new Date();
  var hr = habitRate(h, addDays(now,-29), now);
  $('sRate').textContent = Math.round(hr.rate*100) + '%';
  $('fzN').textContent = h.fz;
  var vTgt = targ(h), vShow = vTgt > 1;
  $('valLbl').style.display = vShow ? '' : 'none';
  $('valRow').style.display = vShow ? '' : 'none';
  $('valState').style.display = vShow ? '' : 'none';
  if(vShow){
    var vNow = val(h, today());
    $('valIn').value = vNow > 0 ? fmtV(vNow) : '';
    $('valIn').placeholder = '0 / ' + vTgt + (h.unit ? ' ' + h.unit : '');
    $('valState').innerHTML = vNow <= 0
      ? 'Not started'
      : vNow < vTgt ? '<span style="color:var(--sOrange)">\u2713 Work done \u00B7 ' + fmtV(vNow) + ' / ' + vTgt + ' \u2014 target not reached</span>'
      : vNow == vTgt ? '<span style="color:var(--sGreen)">\u2713 Target achieved!</span>'
      : '<span style="color:var(--sGreen)">\u2713 Target achieved \u00B7 +' + fmtV(vNow - vTgt) + ' extra</span>';
  }
  renderHeatHabit(h);
  $('hmHab').style.display = totalDone(h) >= 7 ? '' : 'none';
  $('tmrBox').style.display = h.type==='time' ? '' : 'none';
  if(h.type==='time') tmrRender();
  $('archBtn').textContent = h.arch ? 'Unarchive habit' : 'Archive habit';
  $('jrTxt').value = h.dnotes[today()] || '';
  var jk = [];
  for(var jK in h.dnotes) jk.push(jK);
  jk.sort(); jk.reverse();
  var jl = '';
  for(var ji=0; ji<Math.min(8, jk.length); ji++)
    jl += '<div class="jrRow"><b>'+toDate(jk[ji]).toLocaleDateString(undefined,{day:'numeric',month:'short'})+'</b>'+esc(h.dnotes[jk[ji]])+'</div>';
  $('habitJrList').innerHTML = jl || '<div class="setS" style="padding:0 0 4px">No notes yet.</div>';

  var monthStart = new Date(detailY, detailM, 1);
  $('mTitle').textContent = monthStart.toLocaleDateString(undefined,{month:'long',year:'numeric'});
  $('mNext').disabled = (detailY > now.getFullYear()) || (detailY===now.getFullYear() && detailM >= now.getMonth());
  var offset = (monthStart.getDay()+6)%7;
  var dim = new Date(detailY, detailM+1, 0).getDate();
  var ts = today(), g = '';
  for(var b=0;b<offset;b++) g += '<div class="mday blank"></div>';
  for(var d=1; d<=dim; d++){
    var ds = detailY + '-' + pad(detailM+1) + '-' + pad(d);
    var dd = toDate(ds);
    var cls = 'mday', style = '';
    if(isFroz(h,ds)) cls += ' froz';
    else if(isDone(h,ds)){ cls += ' done'; style = ' style="background:'+h.color+'"'; }
    else if(val(h,ds) > 0){ cls += ' part'; style = ' style="background:'+hexRgba(h.color,.25)+';box-shadow:inset 0 0 0 1.5px '+h.color+'"'; }
    else if(ds < ts && ds >= h.created && dueOn(h,dd)) cls += ' miss';
    if(ds === ts) cls += ' today';
    if(ds > ts) cls += ' future';
    g += '<div class="'+cls+'"'+style+' data-md="'+ds+'">'+d+(h.dnotes[ds]?'<span class="nd"></span>':'')+'</div>';
  }
  $('mgrid').innerHTML = g;

  var fb = $('fzBar');
  if(selMiss){
    fb.classList.add('on');
    var nice = toDate(selMiss).toLocaleDateString(undefined,{day:'numeric',month:'short'});
    $('fzTxt').textContent = 'Missed ' + nice + ' \u2014 freeze it to keep the chain ('+h.fz+' left), or mark it done.';
    $('btnFz').style.display = h.fz>0 ? '' : 'none';
  } else fb.classList.remove('on');
}
function resetDelBtn(){
  if(delTimer){ clearTimeout(delTimer); delTimer = null; }
  var b = $('delBtn');
  b.classList.remove('armed'); b.textContent = 'Delete habit';
}
function onDelete(){
  var b = $('delBtn');
  if(!b.classList.contains('armed')){
    b.classList.add('armed'); b.textContent = 'Tap again to delete';
    delTimer = setTimeout(resetDelBtn, 2600);
    return;
  }
  for(var i=0;i<state.habits.length;i++)
    if(state.habits[i].id === detailId){ state.habits.splice(i,1); break; }
  var si = state.stack.indexOf(detailId);
  if(si>=0) state.stack.splice(si,1);
  delete state.hlog[detailId];
  detailId = null;
  persist(); closeSheet(); renderToday();
}

/* ================= stack sheet ================= */
function renderStackSheet(){
  var html = '';
  for(var i=0;i<state.habits.length;i++){
    var h = state.habits[i];
    if(h.arch) continue;
    var pos = state.stack.indexOf(h.id);
    html += '<div class="setRow" data-stk="'+h.id+'">'
      + '<div class="emo" style="width:36px;height:36px;font-size:18px;background:'+hexRgba(h.color,.14)+'">'+h.emoji+'</div>'
      + '<div class="setInfo"><div class="setT">'+esc(h.name)+'</div></div>'
      + '<div class="sbtn '+(pos>=0?'acc':'')+'">'+(pos>=0 ? (pos+1)+'' : '+')+'</div></div>';
  }
  $('stackList').innerHTML = html || '<div class="setS">Add some habits first.</div>';
}

/* ================= archived sheet ================= */
function renderArchSheet(){
  var html = '';
  for(var i=0;i<state.habits.length;i++){
    var h = state.habits[i];
    if(!h.arch) continue;
    html += '<div class="setRow">'
      + '<div class="emo" style="width:36px;height:36px;font-size:18px;background:'+hexRgba(h.color,.14)+'">'+h.emoji+'</div>'
      + '<div class="setInfo"><div class="setT">'+esc(h.name)+'</div><div class="setS">archived '+niceDate(h.archAt || h.created)+'</div></div>'
      + '<button class="sbtn acc" data-ra="'+h.id+'">Restore</button></div>';
  }
  $('archList').innerHTML = html || '<div class="setS" style="padding:6px 0 10px">Nothing archived.</div>';
}

/* ================= heatmaps ================= */
function heatStyle(r){
  if(r === null) return 'background:var(--card2);opacity:.45';
  if(r <= 0) return 'background:var(--card2)';
  var op = r < 0.34 ? '.3' : (r < 0.67 ? '.6' : '1');
  return 'background:var(--amber);opacity:'+op;
}
function renderHeatHabit(h){
  var el = $('hmHab'); if(!el) return;
  var ws = weekStart(new Date()), html = '';
  for(var w=19; w>=0; w--){
    var w0 = addDays(ws, -7*w);
    for(var d=0; d<7; d++){
      var day = addDays(w0, d), ds = fmt(day), st;
      if(ds > today() || ds < h.created) st = 'background:var(--card2);opacity:.12';
      else if(isFroz(h, ds)) st = 'background:var(--ice)';
      else if(isDone(h, ds)) st = 'background:'+h.color;
      else if(val(h, ds) > 0) st = 'background:'+hexRgba(h.color,.38);
      else if(dueOn(h, day)) st = 'background:var(--card2)';
      else st = 'background:var(--card2);opacity:.3';
      html += '<i style="'+st+'"></i>';
    }
  }
  el.innerHTML = html;
}

/* ================= focus timer (time habits) ================= */
function tmrState(hid){
  var t = state.timers[hid];
  if(!t){ t = {acc:0, start:0}; state.timers[hid] = t; }
  return t;
}
function tmrSecs(t){ return t.acc + (t.start ? Math.floor((Date.now()-t.start)/1000) : 0); }
function tmrFmt(s){ var m = Math.floor(s/60); return pad(Math.min(99,m)) + ':' + pad(s%60); }
function tmrRender(){
  if(!detailId) return;
  var h = findHabit(detailId);
  if(!h || h.type !== 'time') return;
  var t = tmrState(detailId);
  $('tmrVal').textContent = tmrFmt(tmrSecs(t));
  $('tmrGo').textContent = t.start ? 'Pause' : (t.acc > 0 ? 'Resume' : 'Start');
  $('tmrGo').classList.toggle('go', !!t.start);
}
setInterval(function(){
  if(sheetOpen === 'detailSheet' && detailId){
    var t = state.timers[detailId];
    if(t && t.start) tmrRender();
  }
}, 1000);

/* ================= charts (theme-aware SVG) ================= */

/* ================= stats page ================= */
var chartSel='line', repSel='w';
function tile(v, l, sub){
  return '<div class="tile"><div class="tv">'+v+'</div><div class="tl">'+l+'</div>'+(sub?'<div class="tsub">'+sub+'</div>':'')+'</div>';
}
var statTrend = 30, fitTrend = 30;

function habitsForStats(){ return state.habits.filter(function(h){ return !h.arch; }); }
function hasHistory(){
  for(var i=0;i<state.habits.length;i++){ for(var k in state.habits[i].done) return true; }
  if(state.tx && state.tx.length) return true;
  if(state.mood){ for(var mk in state.mood) return true; }
  if(state.sleep && state.sleep.length) return true;
  if(state.wlog && state.wlog.length) return true;
  if(state.jr && state.jr.length) return true;
  return false;
}

function renderStats(){
  var hs = habitsForStats();
  var histOk = hasHistory();
  $('stEmpty').hidden = histOk;
  $('stMain').style.display = histOk ? '' : 'none';
  if(!histOk){ renderFitStats(); return; }

  var now = new Date();
  // ----- Section 1: progress (2x2) -----
  var curMax = 0, longest = 0;
  for(var i=0;i<hs.length;i++){ var cs = streak(hs[i]), bs = bestStreak(hs[i]); if(cs>curMax) curMax=cs; if(bs>longest) longest=bs; }
  var p30 = periodStats(addDays(now,-29), now);
  var comp = Math.round(p30.rate*100);
  $('stProg').innerHTML =
    sc(curMax, curMax===1?'day':'days', 'Current streak', 'var(--sOrange)')
    + sc(longest, longest===1?'day':'days', 'Longest streak', 'var(--amber)')
    + sc(comp, '%', '30-day completion', 'var(--sGreen)')
    + sc(p30.missed, p30.missed===1?'day':'days', 'Missed days', 'var(--coral)');

  // ----- Section 2: trend -----
  drawStatTrend();

  // ----- Section 3: habit performance (>=2 habits) -----
  if(hs.length >= 2){
    var best=null, att=null;
    for(var j=0;j<hs.length;j++){ var r=habitRate(hs[j], addDays(now,-29), now); if(r.s<1) continue;
      if(!best || r.rate>best.r) best={h:hs[j], r:r.rate};
      if(!att || r.rate<att.r) att={h:hs[j], r:r.rate}; }
    if(best && att && best.h !== att.h){
      $('stPerf').style.display='';
      $('stPerfGrid').innerHTML =
        '<div class="perfCard best"><div class="pl">Best habit</div><div class="pe">'+best.h.emoji+'</div>'
          +'<div class="pn">'+esc(best.h.name)+'</div><div class="pp">'+Math.round(best.r*100)+'% completion</div></div>'
        +'<div class="perfCard att"><div class="pl">Needs attention</div><div class="pe">'+att.h.emoji+'</div>'
          +'<div class="pn">'+esc(att.h.name)+'</div><div class="pp">'+Math.round(att.r*100)+'% completion</div></div>';
    } else $('stPerf').style.display='none';
  } else $('stPerf').style.display='none';

  // ----- Section: fitness -----
  renderFitStats();

  // ----- Section 4: achievements (compact) -----
  var best4 = longest;
  var won = 0; for(var m=0;m<MILES.length;m++) if(best4>=MILES[m]) won++;
  var firstFour = MILES.slice(0,4);
  var row = '';
  for(var f=0;f<firstFour.length;f++){ var ok = best4>=firstFour[f];
    row += '<div class="achvB'+(ok?' won':'')+'"><div class="abn">'+firstFour[f]+'</div><div class="abd">days</div>'+(ok?'':'<span class="lock">\uD83D\uDD12</span>')+'</div>'; }
  $('stAchv').innerHTML =
    '<div class="ah"><div class="at">\uD83C\uDFC6 '+won+' of '+MILES.length+' unlocked</div><div class="av" id="achvViewAll">View all</div></div>'
    + '<div class="achvRow">'+row+'</div>';

  // ----- Section 5: one smart insight -----
  $('stInsight').innerHTML = smartInsight();
  renderCalendar();
}

function sc(val, unit, label, color){
  return '<div class="sc"><b style="color:'+color+'">'+val+(unit && unit!=='%'?' <small>'+unit+'</small>':(unit==='%'?'<small>%</small>':''))+'</b><span>'+label+'</span></div>';
}

function trendData(days){
  var now=new Date(), out=[];
  for(var i=days-1;i>=0;i--){ var d=addDays(now,-i); var r=rateOn(d); out.push({d:fmt(d), v:r}); }
  return out;
}
function drawStatTrend(){
  var days = statTrend;
  var data;
  if(days===365){
    // weekly buckets for a year (52 points)
    data=[]; var now=new Date();
    for(var w=51;w>=0;w--){ var w1=addDays(now,-7*w), w0=addDays(w1,-6); var ps=periodStats(w0,w1); data.push({d:fmt(w1), v:ps.sched?ps.rate:null}); }
  } else data = trendData(days);
  $('stTrend').innerHTML = '<div class="chartT">'+(days===7?'7-day':days===30?'30-day':'1-year')+' completion trend</div>'+lineChart(data, 'var(--sBlue)', 'var(--iceSoft)');
}

function lineChart(data, stroke, fill){
  var vals = data.filter(function(d){ return d.v!==null && d.v!==undefined; });
  if(vals.length < 2) return '<div class="setS" style="text-align:center;padding:26px 0">Not enough history yet \u2014 keep logging.</div>';
  var W=320,H=120,pad=8;
  var step=(W-pad*2)/(data.length-1);
  var pts=[], lastY=H-pad;
  for(var i=0;i<data.length;i++){ var v=data[i].v; var x=pad+i*step;
    var y = (v===null||v===undefined) ? null : H-pad-v*(H-pad*2); pts.push([x,y]); }
  // build path skipping nulls
  var dstr='', started=false;
  for(var j=0;j<pts.length;j++){ if(pts[j][1]===null) continue; dstr += (started?'L':'M')+pts[j][0].toFixed(1)+' '+pts[j][1].toFixed(1)+' '; started=true; }
  // area under (only if continuous enough) — use first/last non-null
  var firstNN=pts.find(function(p){return p[1]!==null;}), lastNN=null;
  for(var k=pts.length-1;k>=0;k--) if(pts[k][1]!==null){ lastNN=pts[k]; break; }
  var area = dstr + 'L'+lastNN[0].toFixed(1)+' '+(H-pad)+' L'+firstNN[0].toFixed(1)+' '+(H-pad)+' Z';
  var dots=''; if(data.length<=31){ for(var m=0;m<pts.length;m++) if(pts[m][1]!==null) dots+='<circle cx="'+pts[m][0].toFixed(1)+'" cy="'+pts[m][1].toFixed(1)+'" r="2.4" fill="'+stroke+'"/>'; }
  return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="width:100%;height:120px">'
    +'<path d="'+area+'" fill="'+fill+'"/><path d="'+dstr+'" fill="none" stroke="'+stroke+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'+dots+'</svg>';
}

function renderAchvModal(){
  var longest=0; for(var i=0;i<state.habits.length;i++){ var bs=bestStreak(state.habits[i]); if(bs>longest) longest=bs; }
  var won=0; for(var m=0;m<MILES.length;m++) if(longest>=MILES[m]) won++;
  $('achvModalSub').textContent = won+' of '+MILES.length+' unlocked \u00B7 best streak '+longest+' days';
  var g='';
  for(var k=0;k<MILES.length;k++){ var ok=longest>=MILES[k];
    g += '<div class="achvB'+(ok?' won':'')+'"><div class="abn">'+MILES[k]+'</div><div class="abd">days</div>'+(ok?'':'<span class="lock">\uD83D\uDD12</span>')+'</div>'; }
  $('achvFullGrid').innerHTML=g;
}

function smartInsight(){
  var now=new Date();
  // 1) 30d vs previous 30d
  var cur=periodStats(addDays(now,-29), now), prev=periodStats(addDays(now,-59), addDays(now,-30));
  if(cur.sched>=10 && prev.sched>=10){
    var diff=Math.round((cur.rate-prev.rate)*100);
    if(diff>=8) return '\uD83D\uDCC8 Your completion improved by <b>'+diff+'%</b> compared with the previous 30 days.';
    if(diff<=-8) return '\uD83D\uDCC9 Your completion dropped <b>'+Math.abs(diff)+'%</b> vs the previous 30 days \u2014 a small reset can turn it around.';
  }
  // 2) longest streak in 3 months
  var hs=habitsForStats(), curMax=0, mh=null;
  for(var i=0;i<hs.length;i++){ var cs=streak(hs[i]); if(cs>curMax){ curMax=cs; mh=hs[i]; } }
  if(curMax>=7){
    // is current >= best over last 90d? approximate: current == bestStreak
    var isBest=true; for(var j=0;j<hs.length;j++){ if(bestStreak(hs[j])>curMax){ isBest=false; break; } }
    if(isBest) return '\uD83D\uDD25 You\u2019re on your longest streak in months \u2014 <b>'+curMax+' days</b>. Keep it alive.';
  }
  // 3) lowest habit this month (>=2 habits)
  if(hs.length>=2){
    var lo=null; for(var k=0;k<hs.length;k++){ var r=habitRate(hs[k], addDays(now,-29), now); if(r.s<5) continue; if(!lo||r.rate<lo.r) lo={h:hs[k],r:r.rate}; }
    if(lo && lo.r<0.6) return '\uD83D\uDCDA Your <b>'+esc(lo.h.name)+'</b> habit has the lowest completion this month ('+Math.round(lo.r*100)+'%). A tiny nudge could help.';
  }
  // 4) near a milestone
  if(curMax>0){ var nm=-1; for(var n=0;n<MILES.length;n++) if(MILES[n]>curMax){ nm=MILES[n]; break; }
    if(nm>0 && nm-curMax<=7) return '\uD83D\uDD2E You\u2019re <b>'+(nm-curMax)+' day'+((nm-curMax)>1?'s':'')+'</b> from the '+nm+'-day milestone.'; }
  // fallback
  var totalDone=0; for(var t=0;t<hs.length;t++) for(var dk in hs[t].done) if(isDone(hs[t],dk)) totalDone++;
  if(totalDone<10) return '\uD83C\uDF31 Keep logging \u2014 insights become more useful as you build history.';
  return '\u2705 Steady progress \u2014 '+Math.round(cur.rate*100)+'% completion over the last 30 days.';
}

function fitnessInsight(){
  var actives=state.exs.filter(function(e){return e.active;});
  if(!actives.length) return '\uD83D\uDCAA Add an exercise to start tracking workouts.';
  // 1) a new PR in the last 7 days
  var now=new Date(), prEx=null;
  for(var i=0;i<actives.length;i++){ var ex=actives[i], best=exBest(ex.id); if(best<=0) continue;
    for(var d=0;d<7;d++){ var ds=fmt(addDays(now,-d)); if(exDayValue(ex.id,ds)===best && best>0){ prEx=ex; break; } }
    if(prEx) break; }
  if(prEx) return '\uD83C\uDFC6 New personal best on <b>'+esc(prEx.name)+'</b> \u2014 '+fmtExVal(prEx,exBest(prEx.id))+'. Keep pushing!';
  // 2) goal progress today
  var gp=goalProgress();
  if(gp!==null && gp>=100) return '\u2705 All workout goals hit today \u2014 '+gp+'%. Strong finish.';
  if(gp!==null && gp>0) return '\uD83C\uDFAF You\u2019re at <b>'+gp+'%</b> of today\u2019s workout goals. Keep going.';
  // 3) streak
  var ws=workoutStreak();
  if(ws>=3) return '\uD83D\uDD25 '+ws+'-day workout streak \u2014 consistency is building.';
  // 4) count
  var wc=workoutsCompleted();
  if(wc>0) return '\uD83D\uDCAA '+wc+' workout session'+(wc===1?'':'s')+' logged so far. Log today to keep momentum.';
  return '\uD83D\uDCAA Log your first session to see fitness insights.';
}
function renderFitStats(){
  var sec=$('fitSection');
  var actives=state.exs.filter(function(e){return e.active;});
  if(!state.exs.length){ sec.style.display='none'; return; }
  sec.style.display='';
  $('fitInsight').innerHTML = fitnessInsight(); renderPatternCard('fitPatternInsights',2);
  var streakN=workoutStreak(), completed=workoutsCompleted(), pbs=personalBests(), gp=goalProgress();
  var rows =
    sc(streakN, streakN===1?'day':'days', 'Workout streak', 'var(--sOrange)')
    + sc(completed, '', 'Workouts completed', 'var(--sBlue)')
    + sc(pbs, '', 'Personal bests', 'var(--amber)')
    + (gp!==null ? sc(gp, '%', 'Goal progress', 'var(--sGreen)') : sc('\u2013','','Goal progress','var(--mut)'));
  $('fitStats').innerHTML = rows;
  drawFitTrend();
  var prs='';
  for(var k=0;k<actives.length;k++){ var ex=actives[k], best=exBest(ex.id); if(best<=0) continue;
    prs += '<div class="txRow"><div class="txIco">'+(EX_ICON[ex.mtype]||'\uD83D\uDCAA')+'</div>'
      +'<div class="txMid"><div class="tn">'+esc(ex.name)+'</div><div class="ts">'+(MTYPES[ex.mtype]||MTYPES.reps).label+(ex.goal>0?' \u00B7 goal '+fmtExVal(ex,ex.goal):'')+'</div></div>'
      +'<div class="txAmt inc">'+fmtExVal(ex,best)+'</div></div>'; }
  $('fitPRs').innerHTML = prs ? '<div class="lbl" style="margin-top:14px"><i class="lic" style="--lc:var(--sYellow)"></i>Personal records</div><div class="setCard" style="padding:4px 16px">'+prs+'</div>' : '';
}
function drawFitTrend(){
  var days=fitTrend, now=new Date(), series=[];
  if(days===365){
    for(var w=51;w>=0;w--){ var w1=addDays(now,-7*w), w0=addDays(w1,-6); var cnt=0;
      for(var i=0;i<state.wlog.length;i++){ var wd=state.wlog[i].d; if(wd>=fmt(w0)&&wd<=fmt(w1)&&setsTotal(exById(state.wlog[i].exId)||{mtype:'reps'},state.wlog[i].sets)>0) cnt++; }
      series.push({d:fmt(w1), v:cnt>0?Math.min(1,cnt/7):0}); }
  } else {
    for(var d=days-1;d>=0;d--){ var ds=fmt(addDays(now,-d)); var any=0;
      for(var j=0;j<state.wlog.length;j++) if(state.wlog[j].d===ds && setsTotal(exById(state.wlog[j].exId)||{mtype:'reps'},state.wlog[j].sets)>0) any++;
      series.push({d:ds, v:any>0?Math.min(1,any/3):0}); }
  }
  $('fitTrend').innerHTML='<div class="chartT">Workout activity \u2014 '+(days===7?'last 7 days':days===30?'last 30 days':'last year')+'</div>'+lineChart(series,'var(--sOrange)','var(--sOrangeSoft)');
}

/* ================= mood tracker ================= */
var _mn0 = new Date();
var moY = _mn0.getFullYear(), moM = _mn0.getMonth(), moSel = 'w', moEdit = '';
function moodOf(ds){
  var m = state.mood[ds];
  return (typeof m === 'number' && m >= 0 && m < MOODS.length) ? m : -1;
}
function setMood(ds, i){
  if(ds > today()) return;
  if(i < 0 || i >= MOODS.length){ delete state.mood[ds]; delete state.moodNotes[ds]; }
  else state.mood[ds] = i;
  persist(); buzz(12);
}
function renderMoodToday(){
  var t = today(), cur = moodOf(t), g = '';
  for(var i=0;i<MOODS.length;i++){
    var m = MOODS[i], sel = (i === cur);
    g += '<button class="moBtn" data-mi="'+i+'"'
      + (sel ? ' style="border-color:'+m.c+';background:'+hexRgba(m.c,.16)+'"' : '')
      + '><span class="me">'+m.e+'</span><span class="ml"'+(sel?' style="color:var(--ink)"':'')+'>'+m.l+'</span></button>';
  }
  $('moGrid').innerHTML = g;
  $('moSub').textContent = cur >= 0
    ? 'Logged: ' + MOODS[cur].e + ' ' + MOODS[cur].l + ' \u2014 tap another to change, same to clear'
    : 'One tap \u2014 you can change it any time today';
  $('moRemRow').style.display = cur >= 0 ? '' : 'none';
  if(cur >= 0) $('moRem').value = state.moodNotes[t] || '';
  var lowMood = cur >= 4;
  $('moWhy').style.display = (lowMood && !state.moodNotes[t]) ? '' : 'none';
}
function renderMoodWeek(){
  var ws = weekStart(new Date()), g = '';
  for(var i=0;i<7;i++){
    var ds = fmt(addDays(ws, i)), mi = moodOf(ds);
    if(mi >= 0) g += '<i style="background:'+hexRgba(MOODS[mi].c,.85)+'">'+MOODS[mi].e+'</i>';
    else g += '<i style="opacity:'+(ds > today() ? '.25' : '.6')+'">\u00B7</i>';
  }
  $('moWeek').innerHTML = g;
}
function renderMoodCal(){
  renderMoodWeek();
  var now = new Date(), t = today();
  var monthStart = new Date(moY, moM, 1);
  $('moTitle').textContent = monthStart.toLocaleDateString(undefined,{month:'long',year:'numeric'});
  $('moNext').disabled = (moY > now.getFullYear()) || (moY===now.getFullYear() && moM >= now.getMonth());
  var offset = (monthStart.getDay()+6)%7;
  var dim = new Date(moY, moM+1, 0).getDate();
  var g = '';
  for(var b=0;b<offset;b++) g += '<div class="mday blank"></div>';
  for(var d=1; d<=dim; d++){
    var ds = moY + '-' + pad(moM+1) + '-' + pad(d);
    var mi = moodOf(ds);
    var cls = 'mday', style = '', content = d;
    if(mi >= 0){ cls += ' mood'; style = ' style="background:'+hexRgba(MOODS[mi].c,.85)+'"'; content = MOODS[mi].e + (state.moodNotes[ds] ? '<span class="nd" style="background:rgba(0,0,0,.5)"></span>' : ''); }
    if(ds === t) cls += ' today';
    if(ds > t) cls += ' future';
    g += '<div class="'+cls+'"'+style+' data-mo="'+ds+'">'+content+'</div>';
  }
  $('mogrid').innerHTML = g;
  var bar = $('moBar');
  if(moEdit){
    bar.classList.add('on');
    var cur = moodOf(moEdit);
    $('moBarT').textContent = toDate(moEdit).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'})
      + (cur>=0 ? ' \u00B7 ' + MOODS[cur].e + ' ' + MOODS[cur].l : ' \u00B7 no entry') + ' \u2014 set mood:';
    var bg = '';
    for(var i2=0;i2<MOODS.length;i2++)
      bg += '<button class="moBtn" data-mbi="'+i2+'"'+(i2===cur?' style="border-color:'+MOODS[i2].c+';background:'+hexRgba(MOODS[i2].c,.16)+'"':'')+'><span class="me">'+MOODS[i2].e+'</span></button>';
    bg += '<button class="moBtn" data-mbi="-1"><span class="me" style="font-size:15px;color:var(--coral)">\u00D7</span></button>';
    $('moBarGrid').innerHTML = bg;
    var hasM = cur >= 0;
    $('moBarRemRow').style.display = hasM ? '' : 'none';
    if(hasM) $('moBarRem').value = state.moodNotes[moEdit] || '';
  } else bar.classList.remove('on');
  renderMoodLog();
}
function renderMoodLog(){
  var keys = [];
  for(var k in state.mood) keys.push(k);
  keys.sort(); keys.reverse();
  var html = '';
  for(var i=0; i<Math.min(7, keys.length); i++){
    var ds = keys[i], mi = moodOf(ds);
    if(mi < 0) continue;
    var note = state.moodNotes[ds];
    html += '<div class="jrRow"><b>'+toDate(ds).toLocaleDateString(undefined,{day:'numeric',month:'short'})+'</b>'
      + MOODS[mi].e + ' ' + MOODS[mi].l
      + (note ? ' <span style="color:var(--mut)">\u2014 '+esc(note)+'</span>' : '')
      + '</div>';
  }
  $('moLog').innerHTML = html || '<div class="setS" style="padding:6px 0 10px">No entries yet \u2014 log a mood above.</div>';
}
function moodPeriod(){
  var now = new Date(), from, lblP;
  if(moSel === 'w'){ from = weekStart(now); lblP = 'this week'; }
  else if(moSel === 'm'){ from = new Date(now.getFullYear(), now.getMonth(), 1); lblP = 'this month'; }
  else { from = new Date(now.getFullYear(), 0, 1); lblP = 'this year'; }
  var cnt = [0,0,0,0,0,0,0], n=0, sum=0, pos=0, totalDays=0;
  var d = new Date(from.getTime()), guard=0;
  while(fmt(d) <= today() && guard++ < 400){
    totalDays++;
    var mi = moodOf(fmt(d));
    if(mi >= 0){ n++; sum += MOODS[mi].s; cnt[mi]++; if(MOODS[mi].s >= 5) pos++; }
    d = addDays(d, 1);
  }
  return {cnt:cnt, n:n, sum:sum, pos:pos, total:totalDays, lbl:lblP};
}
function nearestMood(avg){
  var best = 3, bd = 99;
  for(var i=0;i<MOODS.length;i++){
    var dd = Math.abs(MOODS[i].s - avg);
    if(dd < bd){ bd = dd; best = i; }
  }
  return best;
}
function svgMoodTrend(){
  var W=640,H=200,PL=36,PR=10,PT=12,PB=24;
  var now = new Date();
  var out = '<svg viewBox="0 0 '+W+' '+H+'">';
  var axis = ['\uD83E\uDD29','\uD83D\uDE10','\uD83D\uDE16'];
  for(var g=0; g<3; g++){
    var yv = PT+(H-PT-PB)*g/2;
    out += '<line x1="'+PL+'" y1="'+yv+'" x2="'+(W-PR)+'" y2="'+yv+'" style="stroke:var(--gline)"/>'
      + '<text x="'+(PL-8)+'" y="'+(yv+5)+'" text-anchor="end" font-size="13">'+axis[g]+'</text>';
  }
  var iw=(W-PL-PR)/29, path='', seg=false, dots='', any=false;
  for(var j=0;j<30;j++){
    var ds = fmt(addDays(now, -(29-j)));
    var mi = moodOf(ds);
    if(mi < 0){ seg=false; continue; }
    any = true;
    var s = MOODS[mi].s;
    var x = PL+iw*j, y = PT+(H-PT-PB)*(1-(s-1)/6);
    path += (seg?' L':' M')+x.toFixed(1)+' '+y.toFixed(1);
    seg = true;
    dots += '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="3.6" fill="'+MOODS[mi].c+'"/>';
  }
  out += '<path d="'+path+'" pathLength="600" class="animLine" fill="none" style="stroke:var(--amber)" stroke-width="2" opacity=".45" stroke-linejoin="round" stroke-linecap="round"/>'+dots;
  out += '<text x="'+PL+'" y="'+(H-6)+'" font-size="10" style="fill:var(--mut)">30 days ago</text>'
    + '<text x="'+(W-PR)+'" y="'+(H-6)+'" text-anchor="end" font-size="10" style="fill:var(--mut)">today</text></svg>';
  if(!any) return '<div class="chartT">Mood trend \u2014 last 30 days</div><div class="setS" style="padding:20px 0">Log a few days to see your trend line.</div>';
  return '<div class="chartT">Mood trend \u2014 last 30 days</div>'+out;
}
function renderMoodStats(){
  var p = moodPeriod();
  var g = '';
  if(p.n){
    var avg = p.sum/p.n, ni = nearestMood(avg);
    g += tile(MOODS[ni].e, 'Average mood', MOODS[ni].l + ' \u00B7 ' + avg.toFixed(1) + ' / 7');
    var mfi = 0;
    for(var i=1;i<7;i++) if(p.cnt[i] > p.cnt[mfi]) mfi = i;
    g += tile(MOODS[mfi].e, 'Most frequent', MOODS[mfi].l + ' \u00B7 ' + p.cnt[mfi] + 'x ' + p.lbl);
    g += tile(p.n + '<small>/' + p.total + '</small>', 'Days logged', p.lbl);
    g += tile(Math.round(p.pos/p.n*100) + '<small>%</small>', 'Positive days', 'Calm or better');
  } else {
    g = tile('\u2014','No entries yet', 'log your first mood above')
      + tile('0<small>/'+p.total+'</small>','Days logged', p.lbl);
  }
  $('moTiles').innerHTML = g;
  $('moChart').innerHTML = svgMoodTrend();
  var mx = 1;
  for(var m2=0;m2<7;m2++) if(p.cnt[m2] > mx) mx = p.cnt[m2];
  var dh = '';
  for(var i3=0;i3<7;i3++){
    var w = p.cnt[i3] ? Math.max(6, Math.round(p.cnt[i3]/mx*100)) : 0;
    dh += '<div class="mdRow"'+(p.cnt[i3]?'':' style="opacity:.4"')+'><span class="mde">'+MOODS[i3].e+'</span>'
      + '<span class="mdl">'+MOODS[i3].l+'</span>'
      + '<span class="bar"><i style="width:'+w+'%;background:'+MOODS[i3].c+'"></i></span>'
      + '<span class="mdc">'+p.cnt[i3]+'</span></div>';
  }
  $('moDist').innerHTML = dh;
  /* insights */
  var out = [], now = new Date();
  var st = 0, d = new Date();
  if(moodOf(fmt(d)) < 0) d = addDays(d,-1);
  while(moodOf(fmt(d)) >= 0 && st < 999){ st++; d = addDays(d,-1); }
  if(st >= 2) out.push(['\uD83D\uDD25','<b>'+st+'-day</b> check-in streak \u2014 keep it going.']);
  var a=0,an=0,b=0,bn=0;
  for(var k=0;k<30;k++){
    var mi2 = moodOf(fmt(addDays(now,-k)));
    if(mi2 < 0) continue;
    if(k < 15){ a += MOODS[mi2].s; an++; } else { b += MOODS[mi2].s; bn++; }
  }
  if(an >= 4 && bn >= 4){
    var diff = a/an - b/bn;
    if(diff >= 0.6) out.push(['\uD83D\uDCC8','Your mood is trending <b>up</b> (+'+diff.toFixed(1)+' vs the two weeks before).']);
    else if(diff <= -0.6) out.push(['\uD83D\uDCC9','Your mood has dipped <b>'+Math.abs(diff).toFixed(1)+'</b> vs the two weeks before \u2014 be kind to yourself.']);
    else out.push(['\u2696\uFE0F','Your mood has been <b>steady</b> over the last month.']);
  }
  var wds=[0,0,0,0,0,0,0], wdn=[0,0,0,0,0,0,0];
  for(var q=0;q<90;q++){
    var dq = addDays(now,-q), miq = moodOf(fmt(dq));
    if(miq < 0) continue;
    var wi = (dq.getDay()+6)%7;
    wds[wi] += MOODS[miq].s; wdn[wi]++;
  }
  var names=['Mondays','Tuesdays','Wednesdays','Thursdays','Fridays','Saturdays','Sundays'];
  var bi=-1,bv=-1,wi2=-1,wv=99;
  for(var r=0;r<7;r++){
    if(wdn[r] < 3) continue;
    var av = wds[r]/wdn[r];
    if(av > bv){ bv=av; bi=r; }
    if(av < wv){ wv=av; wi2=r; }
  }
  if(bi>=0 && wi2>=0 && bi!==wi2 && bv-wv >= 1)
    out.push(['\uD83D\uDCC5','You feel best on <b>'+names[bi]+'</b> and lowest on <b>'+names[wi2]+'</b>.']);
  var jd=0, jdn=0, nd=0, ndn=0;
  for(var cq=0; cq<60; cq++){
    var cds = fmt(addDays(now,-cq)), cmi = moodOf(cds);
    if(cmi < 0) continue;
    var hasJ = false;
    for(var cj=0; cj<state.jr.length; cj++) if(state.jr[cj].d === cds){ hasJ = true; break; }
    if(hasJ){ jd += MOODS[cmi].s; jdn++; } else { nd += MOODS[cmi].s; ndn++; }
  }
  if(jdn >= 5 && ndn >= 5){
    var jdiff = jd/jdn - nd/ndn;
    if(jdiff >= 0.4) out.push(['\u270D\uFE0F','Your mood averages <b>+'+jdiff.toFixed(1)+'</b> higher on days you journal.']);
  }
  if(!out.length) out.push(['\uD83C\uDF31','Log a few more days to unlock mood insights.']);
  var ih='';
  for(var z=0;z<Math.min(4,out.length);z++)
    ih += '<div class="insight"><span class="ii">'+out[z][0]+'</span><div>'+out[z][1]+'</div></div>';
  $('moIns').innerHTML = ih; renderPatternCard('moPatternInsights',2);
}
function renderMood(){
  if($('sleepCard')) renderSleepCard();
  renderMoodToday();
  renderMoodCal();
  renderMoodStats();
}

/* ================= journal ================= */
var PROMPTS = [
 'What made you smile today, even briefly?',
 'What is one thing you did today that your future self will thank you for?',
 'Describe today in three words \u2014 then explain one of them.',
 'What drained your energy today, and what refilled it?',
 'Write about a small detail you noticed today that you usually miss.',
 'What would you do differently if today restarted right now?',
 'Who made a difference in your day \u2014 and do they know?',
 'What are you quietly proud of this week?',
 'What is worrying you? Write it down and leave it here.',
 'What did you learn today \u2014 about anything, or anyone?',
 'If today had a soundtrack, what would it be and why?',
 'What is something you are looking forward to?',
 'Write a note to yourself one year from now.',
 'What felt hard today \u2014 and how did you handle it?',
 'What are three things you are grateful for right now?',
 'Which habit helped you most today?'
];
var jrEd = null, jrQ = '', jrTag = 'all', jrDelTimer2 = null, jrTimePick = false;
var photoCache = {};
function jrPrompt(){
  var doy = Math.floor((new Date() - new Date(new Date().getFullYear(),0,0)) / 86400000);
  return PROMPTS[doy % PROMPTS.length];
}
function jrTagsOf(e){
  var m = (e.t + ' ' + e.b).match(/#[A-Za-z0-9_]+/g);
  if(!m) return [];
  var seen = {}, out = [];
  for(var i=0;i<m.length;i++){
    var t = m[i].toLowerCase();
    if(!seen[t]){ seen[t] = 1; out.push(t); }
  }
  return out;
}
function jrAllTags(){
  var cnt = {};
  for(var i=0;i<state.jr.length;i++){
    var ts = jrTagsOf(state.jr[i]);
    for(var j=0;j<ts.length;j++) cnt[ts[j]] = (cnt[ts[j]]||0)+1;
  }
  var arr = [];
  for(var k in cnt) arr.push([k, cnt[k]]);
  arr.sort(function(a,b){ return b[1]-a[1]; });
  return arr.slice(0,8).map(function(x){ return x[0]; });
}
function sortJr(){
  state.jr.sort(function(a,b){
    if(a.d !== b.d) return a.d < b.d ? 1 : -1;
    return (b.created||0) - (a.created||0);
  });
}
function jrFind(id){
  for(var i=0;i<state.jr.length;i++) if(state.jr[i].id === id) return state.jr[i];
  return null;
}
function onThisDay(){
  var t = toDate(today()), out = [];
  for(var i=0;i<state.jr.length;i++){
    var e = state.jr[i];
    if(e.d === today()) continue;
    var dd = toDate(e.d);
    if(dd.getDate() !== t.getDate()) continue;
    if(dd.getMonth() === t.getMonth() && dd.getFullYear() < t.getFullYear()){
      var yy = t.getFullYear() - dd.getFullYear();
      out.push([e, yy + (yy===1 ? ' yr ago' : ' yrs ago')]);
    } else {
      var months = (t.getFullYear()-dd.getFullYear())*12 + (t.getMonth()-dd.getMonth());
      if(months >= 1 && months < 12) out.push([e, months + ' mo ago']);
    }
  }
  return out.slice(0,3);
}
function fillPhotos(root){
  var imgs = root.querySelectorAll('img[data-pn]');
  for(var i=0;i<imgs.length;i++){
    var pn = imgs[i].getAttribute('data-pn');
    if(photoCache[pn]){ imgs[i].src = photoCache[pn]; continue; }
    var b = '';
    if(nat && nat.readPhoto){ try{ b = nat.readPhoto(pn) || ''; }catch(e){} }
    if(b){
      photoCache[pn] = 'data:image/jpeg;base64,' + b;
      imgs[i].src = photoCache[pn];
    } else imgs[i].style.display = 'none';
  }
}
function mdLite(t){
  return esc(t)
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\*([^*]+)\*/g, '<i>$1</i>');
}
function jrCardHTML(e){
  var dt = toDate(e.d).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  var html = '<div class="jrCard" data-jid="'+e.id+'">'
    + '<div class="jrDt">'+dt+'</div>'
    + (e.t ? '<div class="jrTt">'+esc(e.t)+'</div>' : '')
    + (e.b ? '<div class="jrSnip">'+mdLite(e.b)+'</div>' : '');
  if(e.ph.length){
    html += '<div class="jrThRow">';
    for(var i=0;i<Math.min(4,e.ph.length);i++) html += '<img class="jrTh" data-pn="'+e.ph[i]+'" alt="">';
    html += '</div>';
  }
  var tg = jrTagsOf(e);
  if(tg.length){
    html += '<div class="jrTags">';
    for(var j2=0;j2<tg.length;j2++) html += '<span class="jrTag">'+esc(tg[j2])+'</span>';
    html += '</div>';
  }
  return html + '</div>';
}
function renderJr(){
  $('jrPrompt').textContent = '\u201C' + jrPrompt() + '\u201D';
  var tags = jrAllTags(), th = '<button class="chip'+(jrTag==='all'?' sel':'')+'" data-jt="all">All</button>';
  for(var i=0;i<tags.length;i++)
    th += '<button class="chip'+(jrTag===tags[i]?' sel':'')+'" data-jt="'+esc(tags[i])+'">'+esc(tags[i])+'</button>';
  $('jrTagRow').innerHTML = th;
  var otd = onThisDay(), oh = '';
  for(var o=0;o<otd.length;o++){
    var oe = otd[o][0];
    oh += '<div class="otdRow" data-jid="'+oe.id+'"><span class="oy">'+otd[o][1]+'</span>'
      + '<span class="ot">'+esc(oe.t || oe.b.slice(0,60) || 'Untitled entry')+'</span></div>';
  }
  $('otdCard').style.display = oh ? '' : 'none';
  $('otdList').innerHTML = oh;
  sortJr();
  var html = '', shown = 0;
  for(var e2=0;e2<state.jr.length;e2++){
    var en = state.jr[e2];
    if(jrTag !== 'all' && jrTagsOf(en).indexOf(jrTag) < 0) continue;
    if(jrQ && (en.t + ' ' + en.b).toLowerCase().indexOf(jrQ) < 0) continue;
    html += jrCardHTML(en);
    shown++;
  }
  if(state.jr.length && !shown) html = '<div class="setS" style="text-align:center;padding:24px 0">No entries match.</div>';
  $('jrList').innerHTML = html;
  $('jrEmpty').hidden = state.jr.length > 0;
  fillPhotos($('jrList'));
  fillPhotos($('otdList'));
}
function renderJrTags(){
  var fake = {t: $('jrTitle').value, b: $('jrBody').value, ph:[]};
  var tg = jrTagsOf(fake);
  $('jrTagLine').textContent = tg.length ? 'Tags: ' + tg.join('  ') : 'Add #tags anywhere in your text';
}
function renderJrPhotos(){
  var html = '';
  for(var i=0;i<jrEd.ph.length;i++)
    html += '<div class="jrPhW"><img class="jrTh" data-pn="'+jrEd.ph[i]+'" alt=""><button class="jrPhX" data-rp="'+i+'">\u00D7</button></div>';
  $('jrPhotos').innerHTML = html || '<div class="setS">No photos yet.</div>';
  fillPhotos($('jrPhotos'));
}
function openJr(id){
  var src = id ? jrFind(id) : null;
  jrEd = src ? JSON.parse(JSON.stringify(src)) : {id:'', d: today(), t:'', b:'', ph:[], created: Date.now()};
  jrEd._edit = id || '';
  $('shJrTitle').textContent = id ? 'Edit entry' : 'New entry';
  $('jrDateTxt').textContent = jrEd.d === today() ? 'Today' : niceDate(jrEd.d);
  $('jrTitle').value = jrEd.t;
  $('jrBody').value = jrEd.b;
  $('jrBody').placeholder = id ? 'Write freely\u2026 use #tags anywhere' : jrPrompt();
  $('jrDelBtn').style.display = id ? '' : 'none';
  resetJrDel();
  renderJrTags();
  renderJrPhotos();
  openSheet('jrSheet');
}
function saveJr(){
  jrEd.t = $('jrTitle').value.replace(/^\s+|\s+$/g,'');
  jrEd.b = $('jrBody').value.replace(/^\s+|\s+$/g,'');
  if(!jrEd.t && !jrEd.b && !jrEd.ph.length){ $('jrBody').focus(); return; }
  if(jrEd._edit){
    var ex = jrFind(jrEd._edit);
    var idx = state.jr.indexOf(ex);
    delete jrEd._edit;
    state.jr[idx] = jrEd;
  } else {
    delete jrEd._edit;
    jrEd.id = Date.now().toString(36) + Math.random().toString(36).slice(2,7);
    state.jr.push(jrEd);
  }
  sortJr(); persist(); closeSheet(); renderJr(); buzz(14);
}
function resetJrDel(){
  if(jrDelTimer2){ clearTimeout(jrDelTimer2); jrDelTimer2 = null; }
  var b = $('jrDelBtn');
  b.classList.remove('armed'); b.textContent = 'Delete entry';
}
function onJrDelete(){
  var b = $('jrDelBtn');
  if(!b.classList.contains('armed')){
    b.classList.add('armed'); b.textContent = 'Tap again to delete';
    jrDelTimer2 = setTimeout(resetJrDel, 2600);
    return;
  }
  var ex = jrFind(jrEd._edit || jrEd.id);
  if(ex){
    for(var i=0;i<ex.ph.length;i++){ if(nat){ try{ nat.deletePhoto(ex.ph[i]); }catch(e){} } delete photoCache[ex.ph[i]]; }
    state.jr.splice(state.jr.indexOf(ex), 1);
  }
  persist(); closeSheet(); renderJr();
}
function maybeAskFullscreen(){
  if(!nat || !nat.fsCheck || state.set.fsAsked) return;
  try{
    if(JSON.parse(nat.fsCheck()).need){
      state.set.fsAsked = 1; persist();
      toastN('Allow full-screen reminders on the next screen');
      setTimeout(function(){ try{ nat.fsOpen(); }catch(e){} }, 900);
    }
  }catch(e){}
}
function webSave(name, mime, b64){
  try{
    var bin = atob(b64), arr = new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
    var url = URL.createObjectURL(new Blob([arr], {type: mime}));
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 400);
    return true;
  }catch(e){ return false; }
}
var webTimers = [];
function webNotifSupported(){ return !nat && 'Notification' in window; }
function clearWebTimers(){ for(var i=0;i<webTimers.length;i++) clearTimeout(webTimers[i]); webTimers = []; }
function scheduleWebNotifs(){
  clearWebTimers();
  if(!webNotifSupported() || !state.set.webNotif) return;
  if(Notification.permission !== 'granted') return;
  var now = new Date(), td = today();
  for(var i=0;i<state.habits.length;i++){
    var h = state.habits[i];
    if(h.arch || !dueOn(h, now) || isDone(h, td)) continue;
    var times = (h.rem && h.rem.times) ? h.rem.times : [];
    for(var j=0;j<times.length;j++){
      var hm = times[j].split(':');
      var at = new Date(); at.setHours(+hm[0], +hm[1], 0, 0);
      var delay = at.getTime() - now.getTime();
      if(delay <= 0 || delay > 86400000) continue;
      (function(hab, tstr){
        var id = setTimeout(function(){
          try{
            var n = new Notification(hab.emoji + ' ' + hab.name, {
              body: 'Time for your habit \u2014 keep the chain alive.',
              tag: 'habit-' + hab.id, icon: 'icon-192.png'
            });
            n.onclick = function(){ window.focus(); if(findHabit(hab.id)) openDetail(hab.id); n.close(); };
          }catch(e){}
        }, delay);
        webTimers.push(id);
      })(h, times[j]);
    }
  }
  for(var ci=0;ci<state.accts.length;ci++){var ca=state.accts[ci];if(ca.type!=='credit'||!ca.active)continue;var cb=creditOutstanding(ca.id);if(cb<=0)continue;var due=nextCreditDue(ca), dueAt=new Date(due.getFullYear(),due.getMonth(),due.getDate(),9,0,0,0), cdelay=dueAt.getTime()-now.getTime();if(cdelay<=0||cdelay>7*86400000)continue;(function(card,balance,at){var id=setTimeout(function(){try{new Notification('Credit card payment due: '+card.name,{body:'Outstanding '+inr(balance)+' · payment due today.',tag:'cc-due-'+card.id});}catch(e){}},cdelay);webTimers.push(id);})(ca,cb,dueAt);}
  for(var ti=0;ti<state.tasks.length;ti++){var tk=state.tasks[ti],st=taskEffectiveStatus(tk);if(st==='completed'||!tk.dueDate||!tk.reminders.length)continue;var base=new Date(tk.dueDate+'T'+(tk.dueTime||'09:00'));for(var ri=0;ri<tk.reminders.length;ri++){var at=new Date(base.getTime()-tk.reminders[ri]*86400000),delay=at.getTime()-now.getTime();if(delay<=0||delay>30*86400000)continue;(function(task,when){var id=setTimeout(function(){try{var n=new Notification((task.priority==='high'?'🔴 ':'✓ ')+task.title,{body:'Task reminder · due '+niceDate(task.dueDate)+(task.dueTime?' at '+timeFmt(task.dueTime):''),tag:'task-'+task.id+'-'+when});n.onclick=function(){window.focus();showTab('pgTasks');setTimeout(function(){if(state.tasks.some(function(x){return x.id===task.id;}))openTask(task.id);},100);};}catch(e){}},delay);webTimers.push(id);})(tk,tk.reminders[ri]);}}
}
window.extOpen = function(kind, val, acct){
  try{
    if(kind === 'tab'){ showTab(val); }
    else if(kind === 'habit' && findHabit(val)){ showTab('pgToday'); openDetail(val); }
    else if(kind === 'add'){ openExpFromWidget(val, acct); }
    else if(kind === 'voice'){ showTab('pgAI'); setTimeout(function(){ startVoice($('uaiInput'), function(text,err){ if(!err&&text)uaiSend(text,{voice:true}); }); }, 120); }
  }catch(e){}
};
function openExpFromWidget(kind, acctId){
  showTab('pgExp');
  if(sheetOpen) closeSheet();
  setTimeout(function(){
    openExp(null);
    if(kind==='inc' || kind==='exp'){ expKindSel = kind; }
    if(acctId){ for(var i=0;i<state.accts.length;i++){ if(state.accts[i].id===acctId && state.accts[i].active){ expAcctSel=acctId; break; } } }
    expCatSel=''; expSubSel='';
    if(typeof paintKind==='function') paintKind();
    if(typeof paintExpPickers==='function') paintExpPickers();
    setTimeout(function(){ var el=$('expAmt'); if(el){ try{ el.focus(); }catch(e){} } }, 90);
  }, sheetOpen ? 80 : 0);
}
window.photoResult = function(name){
  if(window.pendingPhotoTarget==='expense' && expEd && /^[A-Za-z0-9_.-]+$/.test(name)){
    window.pendingPhotoTarget='';
    try{
      var b=nat&&nat.readPhoto?nat.readPhoto(name):'';
      if(b) receiptScanData='data:image/jpeg;base64,'+b;
      if(nat&&nat.deletePhoto)nat.deletePhoto(name);
    }catch(e){}
    receiptScanName=name; renderExpReceipt();
    if(receiptScanData) scanReceiptWithAi(); else toastN('Could not read receipt');
    return;
  }
  if(jrEd && /^[A-Za-z0-9_.-]+$/.test(name)){
    jrEd.ph.push(name); renderJrPhotos(); toastN('Photo added');
  }
};

/* ================= combined day view ================= */
function habitsDoneOn(ds){
  var d=toDate(ds), due=0, done=0;
  for(var i=0;i<state.habits.length;i++){ var h=state.habits[i];
    if(h.arch && (!h.archAt || ds>=h.archAt)) continue;
    if(onVacation(ds) || !dueOn(h,d)) continue;
    due++; if(isDone(h,ds) || isFroz(h,ds)) done++; }
  return {due:due, done:done};
}
function expenseOn(ds){
  var exp=0, inc=0;
  for(var i=0;i<state.tx.length;i++){ var x=state.tx[i]; if(x.d!==ds) continue;
    if(x.kind==='exp') exp+=x.amt; else if(x.kind==='inc') inc+=x.amt; }
  return {exp:exp, inc:inc};
}
function workoutsOn(ds){
  var n=0; for(var i=0;i<state.wlog.length;i++){ var w=state.wlog[i];
    if(w.d===ds && setsTotal(exById(w.exId)||{mtype:'reps'}, w.sets)>0) n++; }
  return n;
}
// mood score shown as /10 for the daily view (MOODS.s is 1..7 -> map to ~1..10)
function moodOutOf10(ds){ var mi=moodOf(ds); if(mi<0) return null; return Math.round(MOODS[mi].s/7*10); }

function dayHasData(ds){
  var h=habitsDoneOn(ds), e=expenseOn(ds);
  return moodOf(ds)>=0 || sleepOn(ds) || h.due>0 || e.exp>0 || e.inc>0 || workoutsOn(ds)>0;
}

function dayRowsHTML(ds){
  var rows='';
  var mi=moodOf(ds);
  if(mi>=0){ var m10=moodOutOf10(ds);
    rows += diRow(MOODS[mi].e, 'Mood', MOODS[mi].l+' \u00B7 '+m10+'/10'); }
  var sl=sleepOn(ds);
  if(sl && sl.mins>0) rows += diRow('\uD83D\uDE34', 'Sleep', fmtDur(sl.mins)+(sl.bed&&sl.wake?' \u00B7 '+timeFmt(sl.bed)+'\u2192'+timeFmt(sl.wake):''));
  var h=habitsDoneOn(ds);
  if(h.due>0) rows += diRow('\u2705', 'Habits', h.done+' / '+h.due+' completed');
  var wo=workoutsOn(ds);
  if(wo>0) rows += diRow('\uD83D\uDCAA', 'Workouts', wo+' session'+(wo===1?'':'s'));
  var e=expenseOn(ds);
  if(e.exp>0 || e.inc>0){ var t=inr(e.exp); if(e.inc>0) t+=' spent \u00B7 '+inr(e.inc)+' in'; else t+=' spent';
    rows += diRow('\uD83D\uDCB0', 'Expenses', t); }
  return rows || '<div class="setS" style="padding:14px 0;text-align:center">Nothing logged this day.</div>';
}
function diRow(ico, label, val){
  return '<div class="diRow"><span class="diIco">'+ico+'</span><span class="diL">'+label+'</span><span class="diV">'+esc(val)+'</span></div>';
}

function dailyInsight(ds){
  var parts=[], mi=moodOf(ds), sl=sleepOn(ds), h=habitsDoneOn(ds), e=expenseOn(ds), wo=workoutsOn(ds);
  var isToday = ds===today();
  // headline priority: sleep+mood link > habits > mood > expenses
  if(sl && sl.mins>0 && mi>=0){
    var good = sl.mins>=420, posMood = MOODS[mi].s>=5;
    if(good && posMood) return '\u2728 Good night\u2019s sleep ('+fmtDur(sl.mins)+') and you\u2019re feeling '+MOODS[mi].l.toLowerCase()+'. Nice combo.';
    if(!good && !posMood) return '\uD83D\uDE34 Short sleep ('+fmtDur(sl.mins)+') and a tougher mood today \u2014 be gentle with yourself.';
  }
  if(h.due>0 && h.done>=h.due && h.due>0) return '\uD83C\uDF89 All '+h.due+' habit'+(h.due===1?'':'s')+' done'+(isToday?' today':'')+'. '+(sl&&sl.mins>0?'On '+fmtDur(sl.mins)+' of sleep.':'Strong day.');
  if(h.due>0 && h.done>0) return '\u2705 '+h.done+' of '+h.due+' habits'+(isToday?' so far':'')+'. '+(h.due-h.done)+' to go.';
  if(mi>=0 && sl && sl.mins>0) return diMoodSleepLine(mi, sl);
  if(mi>=0) return MOODS[mi].e+' Feeling '+MOODS[mi].l.toLowerCase()+(isToday?' today':'')+'.';
  if(sl && sl.mins>0) return '\uD83D\uDE34 '+fmtDur(sl.mins)+' of sleep logged.';
  if(e.exp>0) return '\uD83D\uDCB0 '+inr(e.exp)+' spent'+(isToday?' today':'')+'.';
  if(wo>0) return '\uD83D\uDCAA '+wo+' workout session'+(wo===1?'':'s')+' logged.';
  return isToday ? '\uD83C\uDF31 Nothing logged yet today \u2014 check in with a habit, mood, or sleep.' : 'Nothing logged this day.';
}
function diMoodSleepLine(mi, sl){
  return MOODS[mi].e+' '+MOODS[mi].l+' after '+fmtDur(sl.mins)+' of sleep.';
}

function renderDailyInsightToday(){
  var box=$('todayDI'); if(!box) return;
  box.innerHTML = dailyInsight(today());
}

var calY = new Date().getFullYear(), calM = new Date().getMonth(), calSel = '';
function renderCalendar(){
  var box=$('calGrid'); if(!box) return;
  $('calTitle').textContent = new Date(calY,calM,1).toLocaleDateString(undefined,{month:'long',year:'numeric'});
  var now=new Date();
  $('calNext').disabled = (calY>now.getFullYear())||(calY===now.getFullYear()&&calM>=now.getMonth());
  var first=new Date(calY,calM,1), startDow=(first.getDay()+6)%7; // Mon=0
  var days=new Date(calY,calM+1,0).getDate();
  var tstr=today(), h='';
  for(var i=0;i<startDow;i++) h+='<div class="calCell empty"><span class="cnum"></span></div>';
  for(var d=1;d<=days;d++){
    var ds=calY+'-'+pad(calM+1)+'-'+pad(d);
    var has=dayHasData(ds);
    var cls='calCell'+(has?' hasData':'')+(ds===tstr?' today':'')+(ds===calSel?' sel':'');
    var dots='';
    if(has){
      var hb=habitsDoneOn(ds), sl=sleepOn(ds), mi=moodOf(ds), e=expenseOn(ds);
      if(hb.due>0 && hb.done>0) dots+='<i style="background:var(--sGreen)"></i>';
      if(sl&&sl.mins>0) dots+='<i style="background:var(--sPurple)"></i>';
      if(mi>=0) dots+='<i style="background:var(--amber)"></i>';
      if(e.exp>0) dots+='<i style="background:var(--coral)"></i>';
    }
    h+='<div class="'+cls+'" data-calday="'+ds+'"><span class="cnum">'+d+'</span><span class="calDots">'+dots+'</span></div>';
  }
  box.innerHTML=h;
  // show detail for selected (or hide)
  if(calSel){ renderCalDay(calSel); } else { $('calDay').style.display='none'; }
}
function renderCalDay(ds){
  calSel=ds;
  $('calDay').style.display='';
  $('calDayTitle').textContent = toDate(ds).toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});
  $('calDI').innerHTML = dailyInsight(ds);
  $('calDayRows').innerHTML = dayRowsHTML(ds);
  // refresh grid selection highlight
  var cells=$('calGrid').querySelectorAll('[data-calday]');
  for(var i=0;i<cells.length;i++) cells[i].classList.toggle('sel', cells[i].getAttribute('data-calday')===ds);
}

/* ================= sleep tracker ================= */
function sleepOn(ds){ for(var i=0;i<state.sleep.length;i++) if(state.sleep[i].d===ds) return state.sleep[i]; return null; }
function sleepMins(bed, wake){
  if(!/^\d{2}:\d{2}$/.test(bed) || !/^\d{2}:\d{2}$/.test(wake)) return 0;
  var bp=bed.split(':'), wp=wake.split(':');
  var b=(+bp[0])*60+(+bp[1]), w=(+wp[0])*60+(+wp[1]);
  var diff = w - b; if(diff===0) return 0; if(diff<0) diff += 1440; // crossed midnight
  return diff;
}
function fmtDur(mins){
  if(!mins) return '\u2014';
  var h=Math.floor(mins/60), m=mins%60;
  return h+'h'+(m>0?' '+m+'m':'');
}
function avgSleepMins(days){
  var now=new Date(), tot=0, n=0;
  for(var i=0;i<days;i++){ var sl=sleepOn(fmt(addDays(now,-i))); if(sl && sl.mins>0){ tot+=sl.mins; n++; } }
  return n?Math.round(tot/n):0;
}
function moodSleepCorr(){
  // pair each day's sleep (mins) with that day's mood score; need >=5 pairs
  var pairs=[];
  for(var i=0;i<state.sleep.length;i++){ var sl=state.sleep[i]; if(sl.mins<=0) continue;
    var mi=moodOf(sl.d); if(mi<0) continue; pairs.push({h:sl.mins/60, m:MOODS[mi].s}); }
  if(pairs.length<5) return {n:pairs.length, txt:''};
  // split into well-rested (>=7h) vs short (<7h) and compare avg mood
  var lo=[], hi=[];
  for(var j=0;j<pairs.length;j++){ (pairs[j].h>=7?hi:lo).push(pairs[j].m); }
  function avg(a){ if(!a.length) return null; var t=0; for(var k=0;k<a.length;k++) t+=a[k]; return t/a.length; }
  var loA=avg(lo), hiA=avg(hi);
  // Pearson-ish direction
  var mh=0,mm=0; for(var p2=0;p2<pairs.length;p2++){ mh+=pairs[p2].h; mm+=pairs[p2].m; } mh/=pairs.length; mm/=pairs.length;
  var num=0,dh=0,dm=0; for(var q=0;q<pairs.length;q++){ var xh=pairs[q].h-mh, xm=pairs[q].m-mm; num+=xh*xm; dh+=xh*xh; dm+=xm*xm; }
  var r = (dh>0&&dm>0) ? num/Math.sqrt(dh*dm) : 0;
  var txt;
  if(loA!==null && hiA!==null){
    var diff = Math.round((hiA-loA)*10)/10;
    if(diff>=0.5) txt='\uD83D\uDE34\u2192\uD83D\uDE0A On nights you sleep <b>7h+</b>, your mood averages <b>'+hiA.toFixed(1)+'/7</b> vs <b>'+loA.toFixed(1)+'/7</b> on shorter nights. More sleep tracks with better mood for you.';
    else if(diff<=-0.5) txt='\uD83E\uDD14 Interestingly, your mood is a bit higher on shorter-sleep nights ('+loA.toFixed(1)+' vs '+hiA.toFixed(1)+'). Worth watching.';
    else txt='\u2696\uFE0F Your mood looks fairly steady regardless of sleep length so far ('+hiA.toFixed(1)+' vs '+loA.toFixed(1)+'/7).';
  } else if(r>0.3) txt='\uD83D\uDE34\u2192\uD83D\uDE0A More sleep tends to line up with better mood for you.';
  else txt='\u2696\uFE0F No strong sleep\u2013mood pattern yet.';
  return {n:pairs.length, txt:txt, r:r};
}
function renderSleepCard(){
  var card=$('sleepCard'), t=today();
  var sl=sleepOn(t);
  var avg7=avgSleepMins(7);
  var html='';
  if(sl && sl.mins>0){
    html += '<div class="sleepMain"><div class="sleepIco">\uD83D\uDE34</div>'
      +'<div class="sleepInfo"><b>'+fmtDur(sl.mins)+'</b><span>'
      +(sl.bed&&sl.wake ? timeFmt(sl.bed)+' \u2192 '+timeFmt(sl.wake) : 'last night')
      +(avg7>0?' \u00B7 7-day avg '+fmtDur(avg7):'')+'</span></div>'
      +'<button class="sleepLogBtn" data-sleeplog="1">Edit</button></div>';
  } else {
    html += '<div class="sleepEmpty"><div class="sleepIco">\uD83D\uDE34</div>'
      +'<div class="se2">How did you sleep last night?</div>'
      +'<button class="sleepLogBtn" data-sleeplog="1">Log sleep</button></div>';
  }
  // 7-day bars
  var now=new Date(), bars='', anyBar=false, mxH=10;
  for(var i=6;i>=0;i--){ var ds=fmt(addDays(now,-i)); var s2=sleepOn(ds); var hrs=s2?s2.mins/60:0; if(hrs>0) anyBar=true;
    var pct=Math.min(100, hrs/mxH*100);
    bars += '<div class="sb"><i style="height:'+pct+'%"></i><span>'+'SMTWTFS'[(addDays(now,-i).getDay())]+'</span></div>'; }
  if(anyBar) html += '<div class="sleepBars">'+bars+'</div>';
  // correlation
  var corr=moodSleepCorr();
  if(corr.txt) html += '<div class="sleepCorr">'+corr.txt+'</div>';
  else if(sl||anyBar) html += '<div class="sleepCorr" style="color:var(--mut)">Log sleep and mood together for ~5 days to reveal your sleep\u2013mood pattern.</div>';
  card.innerHTML=html;
}

/* ---- sleep sheet ---- */
var sleepEd=null, sleepPick='';
function openSleep(ds){
  var d = ds || today();
  var sl=sleepOn(d);
  sleepEd={d:d, bed:sl?sl.bed:'', wake:sl?sl.wake:'', note:sl?sl.note:''};
  sleepEd._edit = !!sl;
  $('sleepSheetT').textContent = sl ? 'Edit sleep' : 'Log sleep';
  $('sleepDateLbl').textContent = d===today() ? 'Last night \u2192 this morning' : niceDate(d);
  $('bedTxt').textContent = sleepEd.bed ? timeFmt(sleepEd.bed) : '\u2014';
  $('wakeTxt').textContent = sleepEd.wake ? timeFmt(sleepEd.wake) : '\u2014';
  $('sleepNote').value = sleepEd.note;
  $('sleepDel').style.display = sl ? '' : 'none';
  updSleepDur();
  openSheet('sleepSheet');
}
function updSleepDur(){
  var m = sleepMins(sleepEd.bed, sleepEd.wake);
  $('sleepDur').textContent = m>0 ? fmtDur(m) : '\u2014';
}
function pickSleepTime(which){
  sleepPick = which;
  var cur = (which==='bed' ? sleepEd.bed : sleepEd.wake) || (which==='bed'?'23:00':'07:00');
  var p = cur.split(':');
  if(nat && nat.pickTime){ try{ sleepTimeActive=true; nat.pickTime(+p[0], +p[1]); return; }catch(e){} }
  var v = prompt((which==='bed'?'Bedtime':'Wake time')+' (HH:MM, 24h)', cur);
  if(v && /^\d{1,2}:\d{2}$/.test(v)){ var pp=v.split(':'); applySleepTime(pad(Math.min(23,+pp[0]))+':'+pad(Math.min(59,+pp[1]))); }
}
var sleepTimeActive=false;
function applySleepTime(hm){
  if(sleepPick==='bed'){ sleepEd.bed=hm; $('bedTxt').textContent=timeFmt(hm); }
  else if(sleepPick==='wake'){ sleepEd.wake=hm; $('wakeTxt').textContent=timeFmt(hm); }
  sleepPick=''; sleepTimeActive=false; updSleepDur();
}
function saveSleep(){
  var mins = sleepMins(sleepEd.bed, sleepEd.wake);
  if(!sleepEd.bed || !sleepEd.wake){ toastN('Set both bed and wake times'); return; }
  var existing=sleepOn(sleepEd.d);
  var rec = existing || {d:sleepEd.d};
  rec.bed=sleepEd.bed; rec.wake=sleepEd.wake; rec.mins=mins; rec.note=$('sleepNote').value.trim();
  if(!existing) state.sleep.push(rec);
  persist(); closeSheet(); renderSleepCard();
  toastN('Slept '+fmtDur(mins));
}

/* ================= workout UI ================= */
var EX_ICON = {reps:'\uD83D\uDCAA', weight:'\uD83C\uDFCB\uFE0F', time:'\u23F1\uFE0F', distance:'\uD83C\uDFC3', count:'\uD83D\uDD22'};
var wkChartRange = {};

function renderWkCard(){
  var card=$('wkCard');
  var actives=state.exs.filter(function(e){return e.active;});
  card.style.display='';
  if(!actives.length){
    card.innerHTML='<div class="wkCardEmpty" data-wkopen="1"><div class="wce">\uD83D\uDCAA</div><div class="wct2">Track a workout</div><div class="wcs">Add exercises and log your progress</div></div>';
    return;
  }
  var gp=goalProgress();
  var h='<div class="wch"><div class="wct">Workout</div>'+(gp!==null?'<div class="wcgo">'+gp+'% of goals</div>':'')+'</div>';
  var shown=actives.slice(0,3);
  for(var i=0;i<shown.length;i++){
    var ex=shown[i], v=exToday(ex.id), done=ex.goal>0 && v>=ex.goal;
    h+='<div class="wkExRow" data-wkopen="1"><div class="wei">'+(EX_ICON[ex.mtype]||'\uD83D\uDCAA')+'</div>'
      +'<div style="flex:1;min-width:0"><div class="wen">'+esc(ex.name)+'</div>'
      +(ex.goal>0?'<div class="wkMini"><i class="'+(done?'done':'')+'" style="width:'+Math.min(100,v/ex.goal*100)+'%"></i></div>':'')+'</div>'
      +'<div class="wev'+(done?' done':'')+'">'+(v>0?fmtExVal(ex,v):'\u2013')+(ex.goal>0?' <span style="color:var(--mut);font-size:11px">/ '+fmtV(ex.goal)+'</span>':'')+'</div></div>';
  }
  if(actives.length>3) h+='<div class="miniLink" data-wkopen="1" style="margin-top:6px">+'+(actives.length-3)+' more \u2014 open module</div>';
  card.innerHTML=h;
}

function openWkModule(){ renderWkModule(); $('wkModule').classList.add('on'); setTimeout(function(){ for(var j=0;j<state.exs.length;j++) drawExChart(state.exs[j]); }, 60); }
function closeWkModule(){ $('wkModule').classList.remove('on'); renderWkCard(); if($('pgStats').classList.contains('on')) renderStats(); }

function renderWkModule(){
  var body=$('wkBody');
  if(!state.exs.length){
    body.innerHTML='<div class="empty" style="padding-top:40px"><div class="big">\uD83D\uDCAA</div><div class="t">No exercises yet</div><div class="s">Tap + to add your first exercise.<br>Push-ups, running, plank \u2014 anything you want to track.</div></div>';
    return;
  }
  var h='';
  for(var i=0;i<state.exs.length;i++){
    var ex=state.exs[i]; if(!ex.active && !wkShowArchived) continue;
    h+=exCardHTML(ex);
  }
  body.innerHTML=h;
  // wire chart only for the expanded card
  if(wkOpenId){ var oex=exById(wkOpenId); if(oex){
    var seg=document.getElementById('cseg-'+oex.id);
    if(seg) seg.addEventListener('click', function(e){ var b=climb(e.target,this,'data-r'); if(!b) return;
      wkChartRange[oex.id]=+b.getAttribute('data-r'); drawExChart(oex); syncChartSeg(oex); });
  }}
}
var wkShowArchived=false;

var wkOpenId = '';
function exCardHTML(ex){
  var v=exToday(ex.id), goal=ex.goal, done=goal>0 && v>=goal, best=exBest(ex.id);
  var mt=MTYPES[ex.mtype]||MTYPES.reps;
  var range=wkChartRange[ex.id]||7;
  var open = (wkOpenId===ex.id);
  var h='<div class="exCard'+(open?' open':'')+'" data-ex="'+ex.id+'">';
  // compact header — always visible, tappable
  h+='<div class="exHeadRow" data-extoggle="'+ex.id+'">'
    +'<div class="exIco">'+(EX_ICON[ex.mtype]||'\uD83D\uDCAA')+'</div>'
    +'<div class="exNm"><b>'+esc(ex.name)+'</b><span>'+mt.label+(ex.goal>0?' \u00B7 goal '+fmtExVal(ex,goal):(best>0?' \u00B7 best '+fmtExVal(ex,best):''))+'</span></div>'
    +'<div class="exVal"><b class="'+(done?'done':'')+'">'+(v>0?fmtExVal(ex,v):'\u2013')+'</b><span>today</span></div>'
    +'<svg class="exChev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'
    +'</div>';
  if(goal>0) h+='<div class="exBar exBarTop"><i class="'+(done?'done':'')+'" style="width:'+Math.min(100,v/goal*100)+'%"></i></div>';
  // collapsible detail — only rendered when open
  if(open){
    h+='<div class="exDetail">';
    h+='<div class="exStats">'
      +'<div><b>'+fmtExVal(ex,v).replace(/ .*/,'')+'</b><span>Today</span></div>'
      +'<div><b>'+(exDaysLogged(ex.id))+'</b><span>Sessions</span></div>'
      +'<div><b>'+fmtExVal(ex,exAvg(ex.id)).replace(/ .*/,'')+'</b><span>Avg</span></div>'
      +'<div><b>'+fmtExVal(ex,best).replace(/ .*/,'')+'</b><span>Best</span></div></div>';
    h+='<div class="exChart"><div class="chartSeg" id="cseg-'+ex.id+'">'
      +'<button data-r="7" class="'+(range===7?'sel':'')+'">7D</button>'
      +'<button data-r="30" class="'+(range===30?'sel':'')+'">30D</button>'
      +'<button data-r="9999" class="'+(range===9999?'sel':'')+'">All</button></div>'
      +'<div id="chart-'+ex.id+'"></div></div>';
    h+='<div class="exActions"><button class="exLogBtn" data-log="'+ex.id+'">Log today</button>'
      +'<button class="exEditBtn" data-exhist="'+ex.id+'" title="History">\uD83D\uDCCB</button>'
      +'<button class="exEditBtn" data-exedit="'+ex.id+'">\u270E</button></div>';
    h+='</div>';
  }
  h+='</div>';
  return h;
}

function exChartData(ex, range){
  if(range===9999){
    var rows=state.wlog.filter(function(w){return w.exId===ex.id;}).sort(function(a,b){return a.d<b.d?-1:1;});
    return rows.map(function(w){ return {d:w.d, v:setsTotal(ex,w.sets)}; });
  }
  return exHistory(ex.id, range);
}
function drawExChart(ex){
  var box=document.getElementById('chart-'+ex.id); if(!box) return;
  var range=wkChartRange[ex.id]||7;
  var data=exChartData(ex, range);
  if(!data.length || !data.some(function(d){return d.v>0;})){
    box.innerHTML='<div class="setS" style="text-align:center;padding:16px 0">No data yet \u2014 log a few sessions.</div>'; return;
  }
  var mx=0; for(var i=0;i<data.length;i++) if(data[i].v>mx) mx=data[i].v; if(mx<=0) mx=1;
  var W=Math.max(280, data.length*10), H=90, pad=6;
  var step=data.length>1?(W-pad*2)/(data.length-1):0;
  var pts=data.map(function(d,i){ var x=pad+i*step, y=H-pad-(d.v/mx)*(H-pad*2); return [x,y]; });
  var line=pts.map(function(pt,i){ return (i?'L':'M')+pt[0].toFixed(1)+' '+pt[1].toFixed(1); }).join(' ');
  var area=line+' L'+pts[pts.length-1][0].toFixed(1)+' '+(H-pad)+' L'+pts[0][0].toFixed(1)+' '+(H-pad)+' Z';
  var dots=''; if(data.length<=14) for(var j=0;j<pts.length;j++) if(data[j].v>0) dots+='<circle cx="'+pts[j][0].toFixed(1)+'" cy="'+pts[j][1].toFixed(1)+'" r="2.6" fill="var(--sBlue)"/>';
  box.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="width:100%;height:90px"><path d="'+area+'" fill="var(--iceSoft)"/><path d="'+line+'" fill="none" stroke="var(--sBlue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'+dots+'</svg>';
}
function syncChartSeg(ex){ var seg=document.getElementById('cseg-'+ex.id); if(!seg) return; var r=wkChartRange[ex.id]||7;
  var bs=seg.children; for(var i=0;i<bs.length;i++) bs[i].classList.toggle('sel', +bs[i].getAttribute('data-r')===r); }

/* ---- exercise sheet ---- */
var exEd=null, exTypeSel='reps';
function openEx(id){
  var ex=id?exById(id):null;
  exEd = ex?JSON.parse(JSON.stringify(ex)):{id:'',name:'',mtype:'reps',unit:'',sets:false,goal:0,active:true,created:Date.now()};
  exEd._edit=id||''; exTypeSel=exEd.mtype;
  $('exSheetT').textContent=id?'Edit exercise':'New exercise';
  $('exName').value=exEd.name; $('exUnit').value=exEd.unit; $('exGoal').value=exEd.goal||'';
  $('exSets').classList.toggle('on', exEd.sets);
  $('exDel').style.display=id?'':'none';
  paintExType();
  openSheet('exSheet');
}
function paintExType(){
  var g=''; for(var k in MTYPES) g+='<button class="'+(k===exTypeSel?'sel':'')+'" data-mt="'+k+'">'+MTYPES[k].label+'</button>';
  $('exTypeGrid').innerHTML=g;
  var mt=MTYPES[exTypeSel];
  if(!$('exUnit').value || $('exUnit').dataset.auto==='1'){ $('exUnit').value=mt.unit; $('exUnit').dataset.auto='1'; }
  // sets default suggestion
}
function saveEx(){
  var n=$('exName').value.trim(); if(!n){ $('exName').focus(); return; }
  exEd.name=n; exEd.mtype=exTypeSel; exEd.unit=$('exUnit').value.trim().slice(0,12);
  exEd.goal=Math.max(0, parseFloat($('exGoal').value)||0); exEd.sets=$('exSets').classList.contains('on');
  if(exEd._edit){ for(var i=0;i<state.exs.length;i++) if(state.exs[i].id===exEd._edit){ delete exEd._edit; state.exs[i]=exEd; break; } }
  else { delete exEd._edit; exEd.id='e'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); state.exs.push(exEd); }
  persist(); closeSheet(); renderWkModule(); renderWkCard();
  setTimeout(function(){ for(var j=0;j<state.exs.length;j++) drawExChart(state.exs[j]); }, 60);
  toastN('Exercise saved');
}

/* ---- exercise history ---- */
var histEx=null;
function openHist(exId){
  histEx=exById(exId); if(!histEx) return;
  $('histT').textContent='History \u00B7 '+histEx.name;
  renderHist();
  openSheet('histSheet');
}
function renderHist(){
  var ex=histEx;
  var rows=state.wlog.filter(function(w){ return w.exId===ex.id && setsTotal(ex,w.sets)>0; })
    .sort(function(a,b){ return a.d<b.d?1:-1; });
  // summary
  var best=exBest(ex.id), avg=exAvg(ex.id), total=exTotal(ex.id);
  $('histSummary').innerHTML =
    '<div><b>'+exDaysLogged(ex.id)+'</b><span>Sessions</span></div>'
    + '<div><b>'+fmtExVal(ex,best).replace(/ .*/,'')+'</b><span>Best</span></div>'
    + '<div><b>'+fmtExVal(ex,avg).replace(/ .*/,'')+'</b><span>Avg</span></div>';
  var hasRows = rows.length > 0;
  $('histExpLbl').style.display = hasRows ? '' : 'none';
  $('histExpRow').style.display = hasRows ? '' : 'none';
  if(!hasRows){ $('histList').innerHTML='<div class="histEmpty">No sessions logged yet.<br>Log this exercise to see its history here.</div>'; return; }
  var h='', tstr=today();
  for(var i=0;i<rows.length;i++){
    var w=rows[i], val=setsTotal(ex,w.sets), isPr=(val===best);
    var dLabel = w.d===tstr ? 'Today' : toDate(w.d).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'});
    var setStr='';
    if(ex.sets && w.sets.length>1){
      var parts=[]; for(var k=0;k<w.sets.length;k++) parts.push(fmtV(w.sets[k]));
      setStr = w.sets.length+' sets \u00B7 '+parts.join(', ')+(ex.unit?' '+ex.unit:'');
    } else {
      setStr = (MTYPES[ex.mtype]||MTYPES.reps).label;
      if(ex.goal>0) setStr += val>=ex.goal ? ' \u00B7 \u2713 goal' : ' \u00B7 '+Math.round(val/ex.goal*100)+'% of goal';
    }
    h += '<div class="histDay"><div class="hd"><div class="hdd">'+dLabel+'</div><div class="hds">'+esc(setStr)+'</div></div>'
      + '<div class="hdv'+(isPr?' pr':'')+'">'+(isPr?'\uD83C\uDFC6 ':'')+fmtExVal(ex,val)+'</div>'
      + '<button class="histEdit" data-histedit="'+w.d+'">\u270E</button></div>';
  }
  $('histList').innerHTML=h;
}

/* ---- workout log export ---- */
function exLogRows(ex){
  var rows=state.wlog.filter(function(w){ return w.exId===ex.id && setsTotal(ex,w.sets)>0; })
    .sort(function(a,b){ return a.d<b.d?-1:1; });
  var head=['Date','Value','Unit','Sets','Set breakdown','Goal','Goal met'];
  var out=[head];
  var mt=MTYPES[ex.mtype]||MTYPES.reps;
  for(var i=0;i<rows.length;i++){ var w=rows[i], v=setsTotal(ex,w.sets);
    out.push([
      w.d,
      ex.mtype==='time'? fmtExVal(ex,v).replace(/ min$/,'') : v,
      ex.mtype==='time'?'mm:ss or min':(ex.unit||mt.unit||''),
      w.sets.length,
      w.sets.map(function(n){return fmtV(n);}).join(' | '),
      ex.goal>0?ex.goal:'',
      ex.goal>0?(v>=ex.goal?'Yes':'No'):''
    ]);
  }
  return out;
}
function exportExLogCsv(ex){
  var rows=exLogRows(ex);
  var csv=rows.map(function(r){ return r.map(function(c){ var val=String(c).replace(/"/g,'""'); return /[",\n]/.test(val)?'"'+val+'"':val; }).join(','); }).join('\n');
  var name='workout-'+slugName(ex.name)+'-'+today()+'.csv';
  var b64=btoa(unescape(encodeURIComponent(csv)));
  if(nat&&nat.saveFile){ try{ nat.saveFile(name,'text/csv',b64); toastN('Saved'); return; }catch(e){} }
  webSave(name,'text/csv',b64); toastN('Downloading CSV\u2026');
}
function exportExLogXlsx(ex){
  if(typeof XLSX==='undefined'){ ensureXlsx(function(){ exportExLogXlsx(ex); }); return; }
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exLogRows(ex)), 'Log');
  var mt=MTYPES[ex.mtype]||MTYPES.reps;
  var sum=[['Exercise',ex.name],['Measurement',mt.label],['Unit',ex.unit||mt.unit||''],
    ['Goal',ex.goal>0?ex.goal:'\u2014'],['Sessions',exDaysLogged(ex.id)],
    ['Personal best',exBest(ex.id)],['Average',Math.round(exAvg(ex.id)*100)/100],['Total',exTotal(ex.id)],
    ['Starting value',exStart(ex.id)],['Current (today)',exToday(ex.id)]];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sum), 'Summary');
  var out=XLSX.write(wb,{bookType:'xlsx',type:'base64'});
  var name='workout-'+slugName(ex.name)+'-'+today()+'.xlsx';
  if(nat&&nat.saveFile){ try{ nat.saveFile(name,XMIME,out); toastN('Saved'); return; }catch(e){} }
  webSave(name,XMIME,out); toastN('Downloading Excel\u2026');
}
function exportExLogPdf(ex){
  var mt=MTYPES[ex.mtype]||MTYPES.reps, best=exBest(ex.id);
  var rows=state.wlog.filter(function(w){ return w.exId===ex.id && setsTotal(ex,w.sets)>0; })
    .sort(function(a,b){ return a.d<b.d?1:-1; });
  var body='';
  for(var i=0;i<rows.length;i++){ var w=rows[i], v=setsTotal(ex,w.sets), isPr=(v===best);
    var setStr = (ex.sets && w.sets.length>1) ? w.sets.map(function(n){return fmtV(n);}).join(', ') : '\u2014';
    body += '<tr><td>'+toDate(w.d).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})+'</td>'
      +'<td style="text-align:right">'+fmtExVal(ex,v)+(isPr?' \uD83C\uDFC6':'')+'</td>'
      +'<td>'+esc(setStr)+'</td>'
      +'<td style="text-align:center">'+(ex.goal>0?(v>=ex.goal?'\u2713':''):'')+'</td></tr>';
  }
  var doc2='<html><head><meta charset="utf-8"><title>'+esc(ex.name)+' \u2014 Workout Log</title><style>'
    +'body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px;margin-bottom:2px}.sub{color:#666;font-size:13px;margin-bottom:16px}'
    +'h2{font-size:14px;margin-top:22px;border-bottom:1px solid #ccc;padding-bottom:4px}'
    +'table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}td,th{padding:6px 8px;border-bottom:1px solid #eee;text-align:left}'
    +'.sum{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0}.sum div{background:#f5f5f5;border-radius:8px;padding:10px 14px;min-width:90px}'
    +'.sum b{display:block;font-size:16px}.sum span{font-size:11px;color:#666}</style></head><body>'
    +'<h1>'+esc(ex.name)+'</h1><div class="sub">'+mt.label+(ex.goal>0?' \u00B7 goal '+fmtExVal(ex,ex.goal):'')+' \u00B7 exported '+niceDate(today())+'</div>'
    +'<div class="sum">'
    +'<div><b>'+exDaysLogged(ex.id)+'</b><span>Sessions</span></div>'
    +'<div><b>'+fmtExVal(ex,best)+'</b><span>Personal best</span></div>'
    +'<div><b>'+fmtExVal(ex,exAvg(ex.id))+'</b><span>Average</span></div>'
    +'<div><b>'+fmtExVal(ex,exStart(ex.id))+'</b><span>Starting</span></div>'
    +'<div><b>'+fmtExVal(ex,exToday(ex.id))+'</b><span>Today</span></div></div>'
    +'<h2>Session log</h2>'
    +'<table><tr><th>Date</th><th style="text-align:right">Value</th><th>Sets</th><th style="text-align:center">Goal</th></tr>'+body+'</table>'
    +'</body></html>';
  var w2=window.open('','_blank');
  if(w2){ w2.document.write(doc2); w2.document.close(); setTimeout(function(){ w2.print(); },400); }
  else toastN('Allow pop-ups to export PDF');
}
function slugName(n){ return String(n).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,30) || 'exercise'; }

/* ---- log sheet ---- */
var logEx=null, logSets=[], logDate=null;
function openLog(exId, forDate){
  logEx=exById(exId); if(!logEx) return;
  logDate = forDate || today();
  var w=wlogForDate(exId, logDate);
  logSets = w && w.sets.length ? w.sets.slice() : [];
  var dNice = logDate===today() ? 'today' : niceDate(logDate);
  $('logT').textContent='Log \u00B7 '+logEx.name+(logDate===today()?'':' \u00B7 '+dNice);
  var mt=MTYPES[logEx.mtype]||MTYPES.reps;
  $('logGoal').textContent = logEx.goal>0 ? 'Goal: '+fmtExVal(logEx, logEx.goal)+' \u00B7 '+dNice+': '+fmtExVal(logEx, exDayValue(exId, logDate)) : 'No goal set';
  $('logLbl').textContent = logEx.mtype==='time'
    ? 'Duration in minutes (e.g. 1.5 = 1:30)'
    : mt.label + (logEx.unit?' ('+logEx.unit+')':'');
  if(logEx.sets){
    $('logSetWrap').style.display=''; $('logSingleWrap').style.display='none';
    if(!logSets.length) logSets=[0];
    renderLogSets();
  } else {
    $('logSetWrap').style.display='none'; $('logSingleWrap').style.display='';
    $('logVal').value = logSets.length ? fmtV(logSets[0]) : '';
  }
  $('logPr').style.display='none';
  openSheet('logSheet');
}
function renderLogSets(){
  var h='';
  for(var i=0;i<logSets.length;i++){
    h+='<div class="setRowLog"><span class="sn">Set '+(i+1)+'</span>'
      +'<input class="inp" type="number" inputmode="decimal" step="any" min="0" data-si="'+i+'" value="'+(logSets[i]||'')+'" placeholder="0">'
      +'<button class="sx" data-sx="'+i+'">\u00D7</button></div>';
  }
  $('logSetWrap').innerHTML=h+'<button class="addSetBtn" id="addSetBtn">+ Add set</button>';
}
function readLogSets(){
  var ins=$('logSetWrap').querySelectorAll('[data-si]');
  logSets=[]; for(var i=0;i<ins.length;i++){ var v=parseFloat(ins[i].value); logSets.push(isNaN(v)?0:Math.max(0,v)); }
}
function saveLog(){
  var prevBest=exBest(logEx.id);
  if(logEx.sets){ readLogSets(); logSets=logSets.filter(function(n){return n>0;}); }
  else { var v=parseFloat($('logVal').value); logSets = (isNaN(v)||v<=0)?[]:[Math.max(0,v)]; }
  setExVal(logEx.id, logSets, logDate);
  var newVal=exDayValue(logEx.id, logDate), newBest=exBest(logEx.id);
  var histWasOpen = histEx && histEx.id===logEx.id;
  closeSheet(); renderWkModule(); renderWkCard();
  if(histWasOpen){ openHist(logEx.id); }
  setTimeout(function(){ for(var j=0;j<state.exs.length;j++) drawExChart(state.exs[j]); }, 60);
  buzz(14);
  if(newBest>prevBest && newVal>0 && prevBest>0){ toastN('\uD83C\uDFC6 New personal best \u2014 '+fmtExVal(logEx,newBest)+'!'); }
  else if(logEx.goal>0 && newVal>=logEx.goal){ toastN('\u2713 Goal reached \u2014 '+fmtExVal(logEx,newVal)+'!'); }
  else if(newVal>0){ toastN('Logged \u2014 '+fmtExVal(logEx,newVal)); }
  else toastN('Cleared');
}

/* ================= workout tracker ================= */
var MTYPES = {
  reps:   {label:'Reps',            unit:'reps', agg:'sum', pr:'max', setDefault:true},
  weight: {label:'Weight \u00D7 Reps', unit:'kg',  agg:'max', pr:'max', setDefault:true},
  time:   {label:'Duration',        unit:'min',  agg:'sum', pr:'max', setDefault:false},
  distance:{label:'Distance',       unit:'km',   agg:'sum', pr:'max', setDefault:false},
  count:  {label:'Count',           unit:'',     agg:'sum', pr:'max', setDefault:false}
};
function exById(id){ for(var i=0;i<state.exs.length;i++) if(state.exs[i].id===id) return state.exs[i]; return null; }
function wlogFor(exId, d){ for(var i=0;i<state.wlog.length;i++) if(state.wlog[i].exId===exId && state.wlog[i].d===d) return state.wlog[i]; return null; }
function wlogForDate(exId, d){ return wlogFor(exId, d); }
function setsTotal(ex, sets){
  if(!sets || !sets.length) return 0;
  var mt = MTYPES[ex.mtype] || MTYPES.reps;
  if(mt.agg==='max'){ var mx=0; for(var i=0;i<sets.length;i++) if(sets[i]>mx) mx=sets[i]; return mx; }
  var t=0; for(var j=0;j<sets.length;j++) t+=sets[j]; return t;
}
function exDayValue(exId, d){ var ex=exById(exId); if(!ex) return 0; var w=wlogFor(exId,d); return w?setsTotal(ex,w.sets):0; }
function exToday(exId){ return exDayValue(exId, today()); }
function fmtExVal(ex, v){
  var mt = MTYPES[ex.mtype] || MTYPES.reps;
  if(ex.mtype==='time'){
    var m=Math.floor(v), sec=Math.round((v-m)*60);
    return sec>0 ? m+':'+pad(sec) : m+' min';
  }
  var u = ex.unit || mt.unit;
  return fmtV(v) + (u ? ' '+u : '');
}
function exBest(exId){
  var ex=exById(exId); if(!ex) return 0;
  var best=0;
  for(var i=0;i<state.wlog.length;i++){ if(state.wlog[i].exId!==exId) continue;
    var v=setsTotal(ex, state.wlog[i].sets); if(v>best) best=v; }
  return best;
}
function exDaysLogged(exId){ var n=0; for(var i=0;i<state.wlog.length;i++) if(state.wlog[i].exId===exId && setsTotal(exById(exId),state.wlog[i].sets)>0) n++; return n; }
function exTotal(exId){ var ex=exById(exId); if(!ex) return 0; var t=0;
  for(var i=0;i<state.wlog.length;i++) if(state.wlog[i].exId===exId) t+=setsTotal(ex,state.wlog[i].sets); return t; }
function exAvg(exId){ var n=exDaysLogged(exId); return n?exTotal(exId)/n:0; }
function exStart(exId){
  var ex=exById(exId); if(!ex) return 0;
  var rows=state.wlog.filter(function(w){ return w.exId===exId && setsTotal(ex,w.sets)>0; })
    .sort(function(a,b){ return a.d<b.d?-1:1; });
  return rows.length?setsTotal(ex,rows[0].sets):0;
}
function exHistory(exId, days){
  var out=[], now=new Date(), ex=exById(exId);
  for(var i=days-1;i>=0;i--){ var dt=addDays(now,-i), ds=fmt(dt);
    out.push({d:ds, v:ex?exDayValue(exId,ds):0}); }
  return out;
}
function workoutStreak(){
  // consecutive days (up to today) with at least one exercise logged
  var n=0, now=new Date();
  for(var i=0;i<400;i++){ var ds=fmt(addDays(now,-i)); var any=false;
    for(var j=0;j<state.wlog.length;j++) if(state.wlog[j].d===ds && setsTotal(exById(state.wlog[j].exId)||{mtype:'reps'}, state.wlog[j].sets)>0){ any=true; break; }
    if(any) n++; else if(i>0) break; else if(i===0) continue;
  }
  return n;
}
function workoutsCompleted(){
  var days={};
  for(var i=0;i<state.wlog.length;i++){ var w=state.wlog[i];
    if(setsTotal(exById(w.exId)||{mtype:'reps'}, w.sets)>0) days[w.d]=true;
  }
  return Object.keys(days).length;
}
function personalBests(){ var n=0; for(var i=0;i<state.exs.length;i++) if(exBest(state.exs[i].id)>0) n++; return n; }
function goalProgress(){
  // avg % across active exercises that have a goal, based on today's value
  var withGoal=state.exs.filter(function(e){ return e.active && e.goal>0; });
  if(!withGoal.length) return null;
  var sum=0; for(var i=0;i<withGoal.length;i++) sum+=Math.min(1, exToday(withGoal[i].id)/withGoal[i].goal);
  return Math.round(sum/withGoal.length*100);
}
function setExVal(exId, sets, forDate){
  var d = forDate || today();
  var w=wlogFor(exId, d);
  var clean = sets.map(function(n){ return Math.max(0, +n||0); }).filter(function(n,i){ return true; });
  if(w){ w.sets=clean; }
  else { state.wlog.push({id:'w'+Date.now().toString(36)+Math.random().toString(36).slice(2,7), exId:exId, d:d, sets:clean, created:Date.now()}); }
  // prune empty
  state.wlog = state.wlog.filter(function(x){ return x.sets.length>0 && setsTotal(exById(x.exId)||{mtype:'reps'}, x.sets)>=0; });
  persist();
}

/* ================= expense tracker ================= */
var expY = new Date().getFullYear(), expM = new Date().getMonth();
var expView = 'tx', expQ = '', expFilter = 'all', expShowN = 60; /* perf: incremental tx list window */
var ACCT_ICON = {bank:'\uD83C\uDFE6', cash:'\uD83D\uDCB5', credit:'\uD83D\uDCB3', debit:'\uD83D\uDCB3', upi:'\uD83D\uDCF1', wallet:'\uD83D\uDC5B', other:'\uD83D\uDCB0'};
var CAT_ICON = {'Food':'\uD83C\uDF74','Transport':'\uD83D\uDE97','Shopping':'\uD83D\uDECD\uFE0F','Bills & Utilities':'\uD83D\uDCA1','Entertainment':'\uD83C\uDFAC','Health':'\uD83D\uDC8A','Other':'\uD83D\uDCCC','Income':'\uD83D\uDCB0'};

function acctById(id){ for(var i=0;i<state.accts.length;i++) if(state.accts[i].id===id) return state.accts[i]; return null; }
function acctBalance(id){var a=acctById(id);if(!a)return 0;var bal=+a.open||0;for(var i=0;i<state.tx.length;i++){var x=state.tx[i];if(x.kind==='exp'&&x.acct===id)bal-=(+x.amt||0);else if(x.kind==='inc'&&x.acct===id)bal+=(+x.amt||0);else if(x.kind==='xfer'){if(x.acct===id)bal-=(+x.amt||0);if(x.to===id)bal+=(+x.amt||0);}}return bal;}
function creditOutstanding(id){var a=acctById(id);return !a||a.type!=='credit'?0:Math.max(0,-acctBalance(id));}
function creditAvailable(id){var a=acctById(id);return !a||!a.creditLimit?null:Math.max(0,(+a.creditLimit||0)-creditOutstanding(id));}
function netWorth(){var t=0;for(var i=0;i<state.accts.length;i++)if(state.accts[i].active&&state.accts[i].type!=='credit')t+=acctBalance(state.accts[i].id);return t;}
function nextCreditDue(a){var n=new Date(),day=Math.min(31,Math.max(1,+a.dueDay||15));var y=n.getFullYear(),m=n.getMonth(),last=new Date(y,m+1,0).getDate();day=Math.min(day,last);if(n.getDate()>=day){m++;last=new Date(y,m+1,0).getDate();day=Math.min(day,last);}return new Date(y,m,day);}
function cashFlowForecast(days){
  var cash=0;
  for(var i=0;i<state.accts.length;i++) if(state.accts[i].active&&state.accts[i].type!=='credit') cash+=acctBalance(state.accts[i].id);
  return {cash:cash,income:0,expenses:0,projected:cash};
}

function txInMonth(y,m){
  var pre = y+'-'+pad(m+1);
  return state.tx.filter(function(x){ return x.d.slice(0,7)===pre; });
}
function monthTotals(y,m){
  var inc=0,exp=0, list=txInMonth(y,m);
  for(var i=0;i<list.length;i++){ if(list[i].kind==='inc') inc+=list[i].amt; else if(list[i].kind==='exp') exp+=list[i].amt; }
  return {inc:inc, exp:exp, net:inc-exp};
}
function catTotals(y,m){
  var map={}, list=txInMonth(y,m);
  for(var i=0;i<list.length;i++){ var x=list[i]; if(x.kind!=='exp') continue; var c=x.cat||'Other'; map[c]=(map[c]||0)+x.amt; }
  return map;
}

function renderExp(){
  if(expView==='upcoming') expView='tx';
  var now=new Date();
  $('expMonTitle').textContent = new Date(expY,expM,1).toLocaleDateString(undefined,{month:'long',year:'numeric'});
  $('expNext').disabled = (expY>now.getFullYear())||(expY===now.getFullYear()&&expM>=now.getMonth());
  var mt = monthTotals(expY,expM);
  var prevMt=monthTotals(expM===0?expY-1:expY,expM===0?11:expM-1),spendVs='';if(prevMt.exp>0){var sd=Math.round((mt.exp-prevMt.exp)/prevMt.exp*100);spendVs=(sd<0?'↓ '+Math.abs(sd)+'%':'↑ '+sd+'%')+' vs last month';}var ctot=catTotals(expY,expM),topCat='',topV=0;for(var tc in ctot){if(ctot[tc]>topV){topV=ctot[tc];topCat=tc;}}
  $('expSum').innerHTML='<div class="es"><b style="color:var(--sGreen)">'+inr(mt.inc)+'</b><span>Income</span></div><div class="es"><b style="color:var(--coral)">'+inr(mt.exp)+'</b><span>Spent</span></div><div class="es"><b style="color:'+(mt.net>=0?'var(--sBlue)':'var(--coral)')+'">'+inr(mt.net)+'</b><span>Balance</span></div>'+(spendVs?'<div style="grid-column:1/-1;font-size:10.5px;color:var(--mut);text-align:center;margin-top:-2px">'+spendVs+'</div>':'')+(topCat&&topV>0?'<div style="grid-column:1/-1;font-size:11px;color:var(--ink2);background:var(--card);border:1px solid var(--line);border-radius:14px;padding:9px 11px;text-align:left">💡 '+esc(topCat)+' is your highest spend category this month · '+inr(topV)+'</div>':'');
  var segShow = expView==='tx';
  $('expMonNav').style.display = (expView==='tx'||expView==='budg'||expView==='ins')?'':'none';
  ['expTx','expUpcoming','expBudg','expAcct','expIns'].forEach(function(id){ $(id).style.display='none'; });
  $('expEmpty').hidden = true;
  try{
    if(expView==='tx') renderExpTx();
    else if(expView==='budg') renderExpBudg();
    else if(expView==='acct') renderExpAcct();
    else if(expView==='ins') renderExpIns();
  }catch(e){
    console.error('Money view render failed',e);
    var target=$(expView==='budg'?'expBudg':expView==='acct'?'expAcct':expView==='ins'?'expIns':'expTx');
    if(target)target.innerHTML='<div class="setS" style="padding:24px;text-align:center">This section could not be loaded. Your data is safe. Try opening it again.</div>';
  }
}

function renderExpTx(){
  var list = state.tx.slice();
  if(expFilter!=='all') list = list.filter(function(x){ return x.kind===expFilter; });
  if(expQ){ var q=expQ.toLowerCase(); list = list.filter(function(x){
    return (x.payee+' '+x.note+' '+x.cat+' '+x.sub+' '+x.tags).toLowerCase().indexOf(q)>=0; }); }
  list.sort(function(a,b){ if(a.d!==b.d) return a.d<b.d?1:-1; return (b.created||0)-(a.created||0); });
  /* perf: render the transaction history incrementally instead of all rows at once */
  var expTotalRows=list.length, expCapped=expTotalRows>expShowN+20;
  if(expCapped) list=list.slice(0,expShowN);
  var box=$('expTx'); box.style.display='';
  if(!state.tx.length){ $('expEmpty').hidden=false; box.innerHTML=''; return; }
  if(!list.length){ box.innerHTML='<div class="setS" style="text-align:center;padding:26px 0">No transactions match.</div>'; return; }
  var html='', lastDay='';
  for(var i=0;i<list.length;i++){
    var x=list[i];
    if(x.d!==lastDay){ lastDay=x.d;
      html += '<div class="txDay">'+toDate(x.d).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'})+'</div>'; }
    var ico, title, sub, cls, sign;
    if(x.kind==='xfer'){ ico='\u21C4'; var af=acctById(x.acct),at=acctById(x.to);
      title=(af?af.name:'?')+' \u2192 '+(at?at.name:'?'); sub='Transfer'; cls='xfer'; sign=''; }
    else { ico=CAT_ICON[x.cat]||(x.kind==='inc'?'\uD83D\uDCB0':'\uD83D\uDCCC');
      title=x.payee||x.cat||(x.kind==='inc'?'Income':'Expense');
      sub=(x.cat||'')+(x.sub?' \u00B7 '+x.sub:'')+(acctById(x.acct)?' \u00B7 '+acctById(x.acct).name:'');
      cls=x.kind; sign=x.kind==='exp'?'-':'+'; }
    html += '<div class="txRow" data-tx="'+x.id+'"><div class="txIco">'+ico+'</div>'
      + '<div class="txMid"><div class="tn">'+esc(title)+'</div><div class="ts">'+esc(sub)+'</div></div>'
      + '<div class="txAmt '+cls+'">'+sign+inr(x.amt)+'</div></div>';
  }
  box.innerHTML=html;
  if(expCapped) box.insertAdjacentHTML('beforeend','<button class="sbtn" id="expShowMore" style="width:100%;margin-top:10px">Show more ('+(expTotalRows-list.length)+' older)</button>');
  box.insertAdjacentHTML('beforeend','<div style="display:flex;gap:8px;margin:12px 0 4px"><button class="sbtn" id="expRangeExport">Export date range</button></div>');
}
function smartExpensePredictions(daysAhead){ return []; }
function renderExpUpcoming(){
  var box=$('expUpcoming');
  if(box) box.style.display='none';
  expView='tx';
  syncSeg();
}
function renderExpAcct(){
  var box=$('expAcct'); box.style.display='';
  var html='<div class="insCard" style="text-align:center"><div class="il">Net worth</div><div class="iv" style="font-size:26px;color:var(--sBlue)">'+inr(netWorth())+'</div><div class="setS" style="margin-top:4px">Credit cards are excluded from net worth</div></div>';
  for(var i=0;i<state.accts.length;i++){
    var a=state.accts[i], bal=acctBalance(a.id), shown=a.type==='credit'?-creditOutstanding(a.id):bal;
    var acctMeta=a.type==='credit' ? ((a.creditLimit?inr(a.creditLimit)+' limit · ':'')+(a.creditLimit?'Available '+inr(creditAvailable(a.id))+' · ':'')+'Due day '+a.dueDay) : a.type;
    html += '<div class="acctCard" data-acct="'+a.id+'"><div class="ai">'+(ACCT_ICON[a.type]||'💰')+'</div>'
      + '<div class="an"><b>'+esc(a.name)+(a.active?'':' <span style="color:var(--mut)">(inactive)</span>')+'</b><span>'+esc(acctMeta)+'</span></div>'
      + '<div class="abal'+(shown<0?' neg':'')+'">'+(a.type==='credit'?'Owed '+inr(creditOutstanding(a.id)):inr(shown))+'</div></div>';
  }
  html += '<button class="addT" id="acctAdd">+ Add account</button>';
  html += '<button class="addT" id="xferBtn" style="margin-top:8px">\u21C4 Transfer between accounts</button>';
  box.innerHTML=html;
}

function renderExpBudg(){
  var box=$('expBudg'); box.style.display='';
  var ct=catTotals(expY,expM), cats=Object.keys(state.cats);
  var overall = state.budg.__total||0, spent=monthTotals(expY,expM).exp;
  var html='';
  if(overall>0){
    var pct=Math.min(100,spent/overall*100), cl=spent>overall?'over':(pct>=85?'warn':'');
    html += '<div class="budgRow"><div class="bh"><span>Overall</span><span class="'+(spent>overall?'over':'')+'">'+inr(spent)+' / '+inr(overall)+'</span></div>'
      + '<div class="budgBar"><i class="'+cl+'" style="width:'+pct+'%"></i></div></div>';
  }
  for(var i=0;i<cats.length;i++){
    var c=cats[i], b=state.budg[c]||0; if(!b && !ct[c]) continue;
    var sp=ct[c]||0, pct2=b?Math.min(100,sp/b*100):0, cl2=b&&sp>b?'over':(b&&sp/b>=.85?'warn':'');
    html += '<div class="budgRow" data-budg="'+esc(c)+'"><div class="bh"><span>'+(CAT_ICON[c]||'')+' '+esc(c)+'</span>'
      + '<span class="'+(b&&sp>b?'over':'')+'">'+inr(sp)+(b?' / '+inr(b):' \u00B7 no budget')+'</span></div>'
      + (b?'<div class="budgBar"><i class="'+cl2+'" style="width:'+pct2+'%"></i></div>':'')+'</div>';
  }
  html += '<button class="addT" id="budgEdit">Set budgets</button>';
  html += '<button class="addT" id="catEditBtn" style="margin-top:8px">Manage categories</button>';
  box.innerHTML = html || '<div class="setS">No budgets set.</div>';
}

function expenseInsight(mt, pt, ct, topCat, topV){
  // over budget?
  var overC=''; for(var c in ct){ var b=state.budg[c]; if(b && ct[c]>b){ overC=c; break; } }
  if(state.budg.__total && mt.exp>state.budg.__total) return '\u26A0\uFE0F You\u2019ve passed your monthly budget \u2014 '+inr(mt.exp)+' of '+inr(state.budg.__total)+'.';
  if(overC) return '\u26A0\uFE0F <b>'+esc(overC)+'</b> is over budget this month ('+inr(ct[overC])+' of '+inr(state.budg[overC])+').';
  // vs last month
  if(pt.exp>0){ var diff=Math.round((mt.exp-pt.exp)/pt.exp*100);
    if(diff<=-10) return '\uD83D\uDCC9 Spending is down <b>'+Math.abs(diff)+'%</b> vs last month \u2014 nice control.';
    if(diff>=15) return '\uD83D\uDCC8 Spending is up <b>'+diff+'%</b> vs last month, mostly on '+(topCat?esc(topCat):'various')+'.'; }
  // projection vs last month total
  var dayN=(expY===new Date().getFullYear()&&expM===new Date().getMonth())?new Date().getDate():new Date(expY,expM+1,0).getDate();
  var proj=(mt.exp/Math.max(1,dayN))*new Date(expY,expM+1,0).getDate();
  if(state.budg.__total && proj>state.budg.__total) return '\uD83D\uDD2E At this pace you\u2019ll spend ~'+inr(proj)+' \u2014 above your '+inr(state.budg.__total)+' budget.';
  if(topCat && topV>0) return '\uD83D\uDCB8 Your biggest spend is <b>'+esc(topCat)+'</b> ('+inr(topV)+'). Net this month: '+inr(mt.net)+'.';
  if(mt.exp===0 && mt.inc===0) return '\uD83D\uDCCA No transactions yet this month \u2014 add one to see insights.';
  return '\u2705 '+inr(mt.exp)+' spent, '+inr(mt.inc)+' in \u2014 net '+inr(mt.net)+' this month.';
}
function renderExpIns(){
  var box=$('expIns'); box.style.display='';
  var mt=monthTotals(expY,expM), ct=catTotals(expY,expM);
  var prev=new Date(expY,expM-1,1), pt=monthTotals(prev.getFullYear(),prev.getMonth());
  var topCat='',topV=0; for(var c in ct) if(ct[c]>topV){ topV=ct[c]; topCat=c; }
  var subMap={}, list=txInMonth(expY,expM);
  for(var i=0;i<list.length;i++){ var x=list[i]; if(x.kind==='exp'&&x.sub){ subMap[x.cat+' \u00B7 '+x.sub]=(subMap[x.cat+' \u00B7 '+x.sub]||0)+x.amt; } }
  var topSub='',topSubV=0; for(var sk in subMap) if(subMap[sk]>topSubV){ topSubV=subMap[sk]; topSub=sk; }
  var dayN=(expY===new Date().getFullYear()&&expM===new Date().getMonth())?new Date().getDate():new Date(expY,expM+1,0).getDate();
  var avg=mt.exp/Math.max(1,dayN);
  var vsLast = pt.exp>0 ? Math.round((mt.exp-pt.exp)/pt.exp*100) : 0;
  var html='';
  html += '<div class="lbl"><i class="lic" style="--lc:var(--amber)"></i>Insight</div>';
  html += '<div class="insCard" style="margin-bottom:10px">'+expenseInsight(mt, pt, ct, topCat, topV)+'</div>';
  html += '<div class="insCard"><div class="il">Total spent this month</div><div class="iv" style="color:var(--coral)">'+inr(mt.exp)+'</div></div>';
  if(topCat) html += '<div class="insCard"><div class="il">Highest category</div><div class="iv">'+(CAT_ICON[topCat]||'')+' '+esc(topCat)+' <small style="color:var(--mut)">'+inr(topV)+'</small></div></div>';
  if(topSub) html += '<div class="insCard"><div class="il">Highest subcategory</div><div class="iv">'+esc(topSub)+' <small style="color:var(--mut)">'+inr(topSubV)+'</small></div></div>';
  html += '<div class="insCard"><div class="il">vs last month</div><div class="iv"><small style="color:'+(vsLast>0?'var(--coral)':'var(--sGreen)')+'">'+(vsLast>0?'+':'')+vsLast+'%</small> <span style="font-size:12px;color:var(--mut)">('+inr(pt.exp)+' last)</span></div></div>';
  html += '<div class="insCard"><div class="il">Avg / day</div><div class="iv">'+inr(avg)+'</div></div>';
  // category breakdown bars
  var cats=Object.keys(ct).sort(function(a,b){return ct[b]-ct[a];});
  if(cats.length){
    var mx=ct[cats[0]]||1, bars='<div class="insCard"><div class="il">Where it went</div>';
    for(var k=0;k<cats.length;k++){ var w=Math.round(ct[cats[k]]/mx*100);
      bars += '<div class="catBar"><span class="cbn">'+(CAT_ICON[cats[k]]||'')+' '+esc(cats[k])+'</span><span class="cbr"><i style="width:'+w+'%"></i></span><span class="cba">'+inr(ct[cats[k]])+'</span></div>'; }
    bars += '</div>'; html += bars;
  }
  // top 5 expenses
  var top5=list.filter(function(x){return x.kind==='exp';}).sort(function(a,b){return b.amt-a.amt;}).slice(0,5);
  if(top5.length){ var t5='<div class="insCard"><div class="il">Top 5 expenses</div>';
    for(var t=0;t<top5.length;t++){ t5 += '<div class="catBar"><span class="cbn" style="width:auto;flex:1">'+esc(top5[t].payee||top5[t].cat||'Expense')+'</span><span class="cba">'+inr(top5[t].amt)+'</span></div>'; }
    t5 += '</div>'; html += t5;
  }
  html += '<div id="expPatternInsights" style="margin-top:10px"></div>'; renderPatternCard('expPatternInsights',4);
  html += '<div class="lbl" style="margin-top:6px">Reports</div>';
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="sbtn" id="repCsv">CSV</button><button class="sbtn" id="repXlsx">Excel</button><button class="sbtn" id="repPdf">PDF</button><button class="sbtn acc" id="repRange">Date range</button></div>';
  box.innerHTML=html;
  var csv=$('repCsv'), xl=$('repXlsx'), pd=$('repPdf');
  if(csv) csv.onclick=exportExpCsv;
  if(xl) xl.onclick=exportExpXlsx;
  if(pd) pd.onclick=exportExpPdf;
  var rr=$('repRange'); if(rr) rr.onclick=openExpRangeExport;
}

function expRows(){
  var list=txInMonth(expY,expM).slice().sort(function(a,b){return a.d<b.d?-1:1;});
  var rows=[['Date','Type','Description','Account','To','Category','Subcategory','Amount','Method','Note','Tags']];
  for(var i=0;i<list.length;i++){ var x=list[i]; var af=acctById(x.acct),at=acctById(x.to);
    rows.push([x.d, x.kind, x.payee||'', af?af.name:'', at?at.name:'', x.cat||'', x.sub||'', x.amt, x.method||'', x.note||'', x.tags||'']); }
  return rows;
}
function exportExpCsv(){
  var rows=expRows(), csv=rows.map(function(r){ return r.map(function(c){ var v=String(c).replace(/"/g,'""'); return /[",\n]/.test(v)?'"'+v+'"':v; }).join(','); }).join('\n');
  var name='expenses-'+expY+'-'+pad(expM+1)+'.csv';
  var b64=btoa(unescape(encodeURIComponent(csv)));
  if(nat&&nat.saveFile){ try{ nat.saveFile(name,'text/csv',b64); toastN('Saved'); return; }catch(e){} }
  webSave(name,'text/csv',b64); toastN('Downloading CSV\u2026');
}
function exportExpXlsx(){
  if(typeof XLSX==='undefined'){ ensureXlsx(function(){ exportExpXlsx(); }); return; }
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expRows()), 'Transactions');
  var mt=monthTotals(expY,expM), ct=catTotals(expY,expM);
  var sum=[['Month',expY+'-'+pad(expM+1)],['Income',mt.inc],['Expense',mt.exp],['Net',mt.net],[],['Category','Spent']];
  for(var c in ct) sum.push([c,ct[c]]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sum), 'Summary');
  var acc=[['Account','Type','Balance']];
  for(var i=0;i<state.accts.length;i++) acc.push([state.accts[i].name,state.accts[i].type,acctBalance(state.accts[i].id)]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(acc), 'Accounts');
  var out=XLSX.write(wb,{bookType:'xlsx',type:'base64'});
  var name='expenses-'+expY+'-'+pad(expM+1)+'.xlsx';
  if(nat&&nat.saveFile){ try{ nat.saveFile(name,XMIME,out); toastN('Saved'); return; }catch(e){} }
  webSave(name,XMIME,out); toastN('Downloading Excel\u2026');
}
function exportExpPdf(){
  var mt=monthTotals(expY,expM), ct=catTotals(expY,expM), list=txInMonth(expY,expM).slice().sort(function(a,b){return a.d<b.d?-1:1;});
  var title='Expense Report \u2014 '+new Date(expY,expM,1).toLocaleDateString(undefined,{month:'long',year:'numeric'});
  var rowsHtml='';
  for(var i=0;i<list.length;i++){ var x=list[i]; var af=acctById(x.acct);
    rowsHtml += '<tr><td>'+x.d+'</td><td>'+esc(x.payee||x.cat||x.kind)+'</td><td>'+esc(af?af.name:'')+'</td><td>'+esc(x.cat||'')+'</td><td style="text-align:right">'+(x.kind==='exp'?'-':x.kind==='inc'?'+':'')+inr(x.amt)+'</td></tr>'; }
  var catHtml=''; for(var c in ct) catHtml+='<tr><td>'+esc(c)+'</td><td style="text-align:right">'+inr(ct[c])+'</td></tr>';
  var doc2='<html><head><meta charset="utf-8"><title>'+title+'</title><style>'
    +'body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px}h2{font-size:14px;margin-top:22px;border-bottom:1px solid #ccc;padding-bottom:4px}'
    +'table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}td,th{padding:6px 8px;border-bottom:1px solid #eee;text-align:left}'
    +'.sum{display:flex;gap:16px;margin:12px 0}.sum div{flex:1;background:#f5f5f5;border-radius:8px;padding:10px;text-align:center}'
    +'.sum b{display:block;font-size:16px}</style></head><body>'
    +'<h1>'+title+'</h1>'
    +'<div class="sum"><div><b style="color:#149c63">'+inr(mt.inc)+'</b>Income</div><div><b style="color:#c0392b">'+inr(mt.exp)+'</b>Spent</div><div><b>'+inr(mt.net)+'</b>Net</div></div>'
    +'<h2>By category</h2><table>'+catHtml+'</table>'
    +'<h2>Transactions</h2><table><tr><th>Date</th><th>Description</th><th>Account</th><th>Category</th><th style="text-align:right">Amount</th></tr>'+rowsHtml+'</table>'
    +'</body></html>';
  var w2=window.open('','_blank');
  if(w2){ w2.document.write(doc2); w2.document.close(); setTimeout(function(){ w2.print(); },400); }
  else toastN('Allow pop-ups to export PDF');
}

function daysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function safeDate(y,m,day){ return new Date(y,m,Math.min(day,daysInMonth(y,m))); }
function recurringNextDate(r, after){
  var d = after instanceof Date ? new Date(after.getTime()) : toDate(after);
  if(r.freq==='weekly'){ var target=r.weekday; var delta=(target-d.getDay()+7)%7; if(delta===0)delta=7; return addDays(d,delta); }
  if(r.freq==='yearly'){
    var y=d.getFullYear(),m=(r.month||1)-1,day=Math.min(31,r.yearDay||r.day||1),cand=safeDate(y,m,day);
    if(cand.getTime()<=d.getTime()) cand=safeDate(y+1,m,day); return cand;
  }
  var y2=d.getFullYear(),m2=d.getMonth(),day2=Math.min(31,r.day||1),cand2=safeDate(y2,m2,day2);
  if(cand2.getTime()<=d.getTime()) cand2=safeDate(y2,m2+1,day2); return cand2;
}
function nextRecurringDateFrom(r,baseIso){ return recurringNextDate(r,baseIso?toDate(baseIso):addDays(toDate(r.start||today()),-1)); }
function expRowsRange(from,to){
  var list=state.tx.filter(function(x){return x.d>=from&&x.d<=to;}).slice().sort(function(a,b){return a.d<b.d?-1:1;});
  var rows=[['ID','Date','Type','Payee / Merchant','Account','To Account','Category','Subcategory','Amount','Payment Method','Note','Tags','Receipt','Recurring ID','Created']];
  for(var i=0;i<list.length;i++){var x=list[i],af=acctById(x.acct),at=acctById(x.to);rows.push([x.id,x.d,x.kind,x.payee||'',af?af.name:'',at?at.name:'',x.cat||'',x.sub||'',x.amt,x.method||'',x.note||'',x.tags||'',x.receipt||(x.receiptData?'Uploaded image':''),x.recurId||'',x.created?new Date(x.created).toISOString():'']);}return rows;
}
function openExpRangeExport(){var end=today(),start=fmt(addDays(toDate(end),-30));$('expExportFrom').value=start;$('expExportTo').value=end;openSheet('expExportSheet');}
function exportExpRangeXlsx(){var from=$('expExportFrom').value,to=$('expExportTo').value;if(!from||!to||from>to){toastN('Select a valid date range');return;}if(typeof XLSX==='undefined'){ensureXlsx(function(){exportExpRangeXlsx();});return;}var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(expRowsRange(from,to)),'Expenses');var out=XLSX.write(wb,{bookType:'xlsx',type:'base64'}),name='expenses-'+from+'-to-'+to+'.xlsx';if(nat&&nat.saveFile){try{nat.saveFile(name,XMIME,out);closeSheet();toastN('Saved Excel');return;}catch(e){}}if(webSave(name,XMIME,out)){closeSheet();toastN('Downloading Excel…');}else toastN('Export failed');}
function exportExpRangePdf(){var from=$('expExportFrom').value,to=$('expExportTo').value;if(!from||!to||from>to){toastN('Select a valid date range');return;}var rows=expRowsRange(from,to),title='Expense Data — '+niceDate(from)+' to '+niceDate(to),th='',body='';for(var i=0;i<rows[0].length;i++)th+='<th>'+esc(rows[0][i])+'</th>';for(var r=1;r<rows.length;r++){body+='<tr>';for(var c=0;c<rows[r].length;c++)body+='<td>'+esc(rows[r][c])+'</td>';body+='</tr>';}var doc='<html><head><meta charset="utf-8"><title>'+esc(title)+'</title><style>@page{size:landscape;margin:10mm}body{font-family:Arial,sans-serif;padding:10px;color:#111;font-size:8px}h1{font-size:16px}table{width:100%;border-collapse:collapse;table-layout:auto}th,td{padding:4px 5px;border:1px solid #ddd;vertical-align:top;white-space:nowrap}th{background:#f3f3f3;font-weight:700}</style></head><body><h1>'+esc(title)+'</h1><table><thead><tr>'+th+'</tr></thead><tbody>'+body+'</tbody></table></body></html>';var w=window.open('','_blank');if(w){w.document.write(doc);w.document.close();setTimeout(function(){w.print();},400);}else toastN('Allow pop-ups to export PDF');}
function openRecurList(){ fToast('Recurring transactions have been removed from this build'); }
function recurringStateInit(r){if(!r)return;r.status=r.active===false?'paused':(r.status||'active');if(!r.nextDate){var base=r.last||addDays(toDate(r.start||today()),-1),n=recurringNextDate(r,base),guard=0;while(fmt(n)<today()&&guard++<500)n=recurringNextDate(r,n);r.nextDate=fmt(n);}if(r.end&&(r.nextDate||r.start)>r.end)r.status='ended';if(r.skipNext===undefined)r.skipNext=false;}
function recurringAdvance(r,fromDate){var n=recurringNextDate(r,fromDate||r.nextDate||today());r.nextDate=fmt(n);r.last=fmt(fromDate||r.last||today());return r.nextDate;}
function runRecur(){ return false; }

function normTx(x){ x.id='t'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); return x; }

/* ---- recurring expense sheet ---- */
var recurEd=null,recurFreq='monthly',recurWeekday=1,recurCat='',recurAcct='';
function openRecur(id){ toastN('Recurring transactions have been removed from this build'); }

function paintRecur(){var bs=$('recurFreqGrid').children;for(var i=0;i<bs.length;i++)bs[i].classList.toggle('sel',bs[i].getAttribute('data-rf')===recurFreq);$('recurMonthlyFields').style.display=recurFreq==='monthly'?'':'none';$('recurWeeklyFields').style.display=recurFreq==='weekly'?'':'none';$('recurYearlyFields').style.display=recurFreq==='yearly'?'':'none';var wb=$('recurWeekGrid').children;for(var j=0;j<wb.length;j++)wb[j].classList.toggle('sel',+wb[j].getAttribute('data-rw')===recurWeekday);var cats=Object.keys(state.cats),cg='';for(var k=0;k<cats.length;k++)cg+=chip(cats[k],cats[k]===recurCat,'data-rc',cats[k]);$('recurCatGrid').innerHTML=cg;var acs=activeAccts(),ag='';for(var m=0;m<acs.length;m++)ag+=chip(acs[m].name,acs[m].id===recurAcct,'data-ra',acs[m].id);$('recurAcctGrid').innerHTML=ag;}
function saveRecur(){
  toastN('Recurring transactions have been removed from this build');
}
/* ---- expense sheet ---- */
var expEd = null, expKindSel='exp', expCatSel='', expSubSel='', expAcctSel='', expToSel='';
/* Receipts are scan-only inputs. Images are kept only in memory until the AI request completes. */
var receiptScanData='', receiptScanName='';
function clearReceiptScanData(){receiptScanData='';receiptScanName='';}
function removeLegacyReceiptStore(){try{if(window.indexedDB)indexedDB.deleteDatabase('HabitTrackerMedia');}catch(e){}}
function renderExpReceipt(){
  var box=$('expReceiptPreview');
  if(!box)return;
  box.innerHTML=receiptScanData
    ? '<img class="receiptThumb" src="'+receiptScanData+'" alt="Receipt preview"><div class="receiptName">Used for scan only — not saved</div>'
    : '<div class="setS">Receipt images are used only to extract expense details and are not saved.</div>';
}
function resizeReceipt(file,cb){var fr=new FileReader();fr.onload=function(){var im=new Image();im.onload=function(){var max=1600,scale=Math.min(1,max/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*scale)),h=Math.max(1,Math.round(im.height*scale)),c=document.createElement('canvas');c.width=w;c.height=h;var ctx=c.getContext('2d');ctx.drawImage(im,0,0,w,h);cb(c.toDataURL('image/jpeg',.78));};im.onerror=function(){cb(fr.result);};im.src=fr.result;};fr.readAsDataURL(file);}
function receiptDataForScanAsync(){return Promise.resolve(receiptScanData||'');}
function scanReceiptWithAi(){
  var key=getAiKey();if(!key){toastN('Add your Gemini API key in AI settings to extract receipt details');return;}
  if(getAiProvider()!=='gemini'){toastN('Receipt scan currently uses Gemini vision');return;}
  receiptDataForScanAsync().then(function(data){
    if(!data){toastN('Upload or capture a receipt first');return;}
    var model=getAiModel(),parts=data.split(','),mime=(parts[0].match(/^data:(.*?);base64$/)||[])[1]||'image/jpeg',b64=parts[1]||'';
    var prompt='Read this receipt and return ONLY valid JSON with keys amount, merchant, date, category, payment_method, note. amount must be a number. date must be YYYY-MM-DD or empty. category should be one of the common categories if clear. Do not invent missing values. Do not include extra text.';
    toastN('Scanning receipt…');
    return fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{parts:[{text:prompt},{inlineData:{mimeType:mime,data:b64}}]}],generationConfig:{maxOutputTokens:220}})})
      .then(function(r){if(!r.ok)throw new Error('API '+r.status);return r.json();})
      .then(function(d){var txt=d.candidates&&d.candidates[0]&&d.candidates[0].content&&d.candidates[0].content.parts&&d.candidates[0].content.parts[0]&&d.candidates[0].content.parts[0].text;if(!txt)throw new Error('Empty response');txt=txt.replace(/^```json\s*/,'').replace(/```\s*$/,'').trim();var o=JSON.parse(txt);if(o.amount>0)$('expAmt').value=fmtV(o.amount);if(o.merchant)$('expPayee').value=String(o.merchant).slice(0,60);if(/^\d{4}-\d{2}-\d{2}$/.test(o.date||'')){expEd.d=o.date;$('expDateTxt').textContent=o.date===today()?'Today':niceDate(o.date);}if(o.payment_method)$('expMethod').value=String(o.payment_method).slice(0,24);if(o.note)$('expNote').value=String(o.note).slice(0,200);var cats=Object.keys(state.cats),want=String(o.category||'').toLowerCase(),best='';for(var i=0;i<cats.length;i++)if(cats[i].toLowerCase()===want){best=cats[i];break;}if(best){expCatSel=best;paintExpPickers();}toastN('Receipt scanned — review before saving');})
      .catch(function(e){toastN('Receipt scan failed: '+e.message);})
      .then(function(){clearReceiptScanData();renderExpReceipt();});
  }).catch(function(e){clearReceiptScanData();renderExpReceipt();toastN('Could not read receipt: '+e.message);});
}
function addExpReceipt(){
  if(nat&&nat.pickPhoto){try{window.pendingPhotoTarget='expense';nat.pickPhoto();return;}catch(e){}}
  var input=$('expReceiptFile');if(input){input.removeAttribute('capture');input.click();}else toastN('Photo picker unavailable');
}
function addExpReceiptCamera(){
  if(nat&&nat.capturePhoto){try{window.pendingPhotoTarget='expense';nat.capturePhoto();return;}catch(e){}}
  var input=$('expReceiptFile');if(input){input.setAttribute('capture','environment');input.click();}else toastN('Camera unavailable');
}

function activeAccts(){ return state.accts.filter(function(a){return a.active;}); }

function openExp(id){
  var x = id ? null : null;
  if(id){ for(var i=0;i<state.tx.length;i++) if(state.tx[i].id===id) x=state.tx[i]; }
  if(!state.accts.length){ toastN('Add an account first'); expView='acct'; renderExp(); syncSeg(); openAcct(null); return; }
  expEd = x ? JSON.parse(JSON.stringify(x)) : {id:'', kind:'exp', amt:0, acct:activeAccts()[0].id, to:'', cat:'', sub:'', payee:'', method:'', note:'', tags:'', receipt:'', receiptData:'', d:today(), created:Date.now()};
  expEd.receipt=''; expEd.receiptData=''; clearReceiptScanData();
  expEd._edit = id||'';
  expKindSel = expEd.kind; expCatSel = expEd.cat; expSubSel = expEd.sub;
  expAcctSel = expEd.acct || (activeAccts()[0]&&activeAccts()[0].id) || '';
  expToSel = expEd.to;
  $('expSheetT').textContent = id ? 'Edit transaction' : 'Add expense';
  $('expAmt').value = expEd.amt ? fmtV(expEd.amt) : '';
  $('expPayee').value=expEd.payee; $('expMethod').value=expEd.method; $('expNote').value=expEd.note; $('expTags').value=expEd.tags;
  $('expDateTxt').textContent = expEd.d===today()?'Today':niceDate(expEd.d);
  $('expMoreBox').style.display='none'; $('expMore').style.display='';
  $('expDel').style.display = id ? '' : 'none';
  paintKind(); paintExpPickers();
  openSheet('expSheet');
}
function paintKind(){
  var bs=$('expKind').children;
  for(var i=0;i<bs.length;i++) bs[i].classList.toggle('sel', bs[i].getAttribute('data-k')===expKindSel);
  var isX = expKindSel==='xfer', isInc = expKindSel==='inc';
  $('expCatLbl').style.display = isX?'none':''; $('expCatGrid').style.display = isX?'none':'';
  $('expSubLbl').style.display='none'; $('expSubGrid').style.display='none';
  $('expToLbl').style.display = isX?'':'none'; $('expToGrid').style.display = isX?'':'none';
  $('expAcctLbl').textContent = isX ? 'From account' : 'Account';
  $('expSheetT').textContent = expEd._edit ? 'Edit transaction' : (isX?'Transfer':(isInc?'Add income':'Add expense'));
  $('expSave').textContent = isX?'Save transfer':'Save';
}
function chip(txt,sel,attr,val){ return '<button class="'+(sel?'sel':'')+'" '+attr+'="'+esc(val)+'">'+esc(txt)+'</button>'; }
function paintExpPickers(){
  var cats = expKindSel==='inc' ? state.incCats : Object.keys(state.cats);
  var cg=''; for(var i=0;i<cats.length;i++) cg += chip(cats[i], cats[i]===expCatSel, 'data-ec', cats[i]);
  cg += '<button class="chipAdd" data-newcat="1">+ New</button>';
  $('expCatGrid').innerHTML = cg;
  // subcats (expenses only, whenever a category is selected — so a first subcategory can be added inline)
  if(expKindSel==='exp' && expCatSel && state.cats[expCatSel]){
    var sg=''; var subs=state.cats[expCatSel]||[];
    for(var j=0;j<subs.length;j++) sg += chip(subs[j], subs[j]===expSubSel, 'data-es', subs[j]);
    sg += '<button class="chipAdd" data-newsub="1">+ New</button>';
    $('expSubGrid').innerHTML=sg; $('expSubLbl').style.display=''; $('expSubGrid').style.display='';
  } else { $('expSubLbl').style.display='none'; $('expSubGrid').style.display='none'; }
  if($('expNewCatRow')){ $('expNewCatRow').style.display='none'; }
  if($('expNewSubRow')){ $('expNewSubRow').style.display='none'; }
  var ag=''; var acs=activeAccts();
  for(var k=0;k<acs.length;k++) ag += chip(acs[k].name, acs[k].id===expAcctSel, 'data-ea', acs[k].id);
  $('expAcctGrid').innerHTML=ag;
  if(expKindSel==='xfer'){ var tg='';
    for(var m=0;m<acs.length;m++) tg += chip(acs[m].name, acs[m].id===expToSel, 'data-et', acs[m].id);
    $('expToGrid').innerHTML=tg; }
}
function addNewCat(){
  var snap=captureExpenseForm();
  var n=$('expNewCat').value.trim().slice(0,24);if(!n)return;
  if(expKindSel==='inc'){if(state.incCats.indexOf(n)<0)state.incCats.push(n);}else{if(!state.cats[n])state.cats[n]=[];}
  expCatSel=n;expSubSel='';$('expNewCatRow').style.display='none';$('expNewCat').value='';
  paintExpPickers();restoreExpenseForm(snap);persist();toastN('Category added — transaction details preserved');
}
function addNewSub(){
  var snap=captureExpenseForm();
  var n=$('expNewSub').value.trim().slice(0,24);if(!n||expKindSel!=='exp'||!expCatSel||!state.cats[expCatSel])return;
  if(state.cats[expCatSel].indexOf(n)<0)state.cats[expCatSel].push(n);expSubSel=n;
  $('expNewSubRow').style.display='none';$('expNewSub').value='';paintExpPickers();restoreExpenseForm(snap);persist();
  toastN('Subcategory added — transaction details preserved');
}
function saveExp(){var amt=parseFloat(($('expAmt').value||'').replace(',','.'));if(isNaN(amt)||amt<=0){$('expAmt').focus();toastN('Enter an amount');return;}expEd.kind=expKindSel;expEd.amt=amt;expEd.acct=expAcctSel;if(expKindSel==='xfer'){if(!expToSel||expToSel===expAcctSel){toastN('Pick a different destination');return;}expEd.to=expToSel;expEd.cat='';expEd.sub='';}else{expEd.to='';expEd.cat=expCatSel||'Other';expEd.sub=expKindSel==='exp'?expSubSel:'';}expEd.payee=$('expPayee').value.trim();expEd.method=$('expMethod').value.trim();expEd.note=$('expNote').value.trim();expEd.tags=$('expTags').value.trim();expEd.receipt=''; expEd.receiptData=''; function commit(){expEd.receipt=''; expEd.receiptData='';if(expEd._edit){for(var i=0;i<state.tx.length;i++)if(state.tx[i].id===expEd._edit){delete expEd._edit;state.tx[i]=expEd;break;}}else{delete expEd._edit;expEd.id='t'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);state.tx.push(expEd);}persist();closeSheet();renderExp();buzz(14);var over=budgetWarn();toastN(over||'Saved');}commit();}
function budgetWarn(){
  var ct=catTotals(expY,expM);
  for(var c in ct){ var b=state.budg[c]; if(b && ct[c]>b) return '\u26A0\uFE0F '+c+' over budget'; }
  var tot=monthTotals(expY,expM).exp; if(state.budg.__total && tot>state.budg.__total) return '\u26A0\uFE0F Over monthly budget';
  return '';
}

/* ---- account sheet ---- */
var acctEd=null, acctTypeSel='bank';
var ACCT_TYPES=[['bank','Bank'],['cash','Cash'],['credit','Credit card'],['debit','Debit card'],['upi','UPI'],['wallet','Wallet'],['other','Other']];
function openAcct(id){
  var a=id?acctById(id):null;
  acctEd = a?JSON.parse(JSON.stringify(a)):{id:'',name:'',type:'bank',open:0,active:true};
  acctEd._edit=id||''; acctTypeSel=acctEd.type;
  $('acctSheetT').textContent=id?'Edit account':'Add account';
  $('acctName').value=acctEd.name; $('acctOpen').value=acctEd.open||''; $('acctCreditLimit').value=acctEd.creditLimit||''; $('acctBillDay').value=acctEd.billDay||1; $('acctDueDay').value=acctEd.dueDay||15; $('acctCreditFields').style.display=acctTypeSel==='credit'?'':'none';
  $('acctActive').classList.toggle('on',acctEd.active!==false);
  $('acctDel').style.display=id?'':'none';
  var g=''; for(var i=0;i<ACCT_TYPES.length;i++) g+=chip(ACCT_TYPES[i][1],ACCT_TYPES[i][0]===acctTypeSel,'data-at',ACCT_TYPES[i][0]);
  $('acctTypeGrid').innerHTML=g;
  openSheet('acctSheet');
}
function saveAcct(){
  var n=$('acctName').value.trim(); if(!n){ $('acctName').focus(); return; }
  acctEd.name=n; acctEd.type=acctTypeSel; acctEd.open=parseFloat($('acctOpen').value)||0; acctEd.creditLimit=Math.max(0,parseFloat($('acctCreditLimit').value)||0); acctEd.billDay=Math.min(31,Math.max(1,+$('acctBillDay').value||1)); acctEd.dueDay=Math.min(31,Math.max(1,+$('acctDueDay').value||15));
  acctEd.active=$('acctActive').classList.contains('on');
  if(acctEd._edit){ for(var i=0;i<state.accts.length;i++) if(state.accts[i].id===acctEd._edit){ delete acctEd._edit; state.accts[i]=acctEd; break; } }
  else { delete acctEd._edit; acctEd.id='a'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); state.accts.push(acctEd); }
  persist(); closeSheet(); renderExp(); toastN('Account saved');
}

/* ---- transfer quick sheet reuses expSheet in xfer mode ---- */
function openXfer(){
  if(activeAccts().length<2){ toastN('Need two active accounts'); return; }
  openExp(null); expKindSel='xfer'; expAcctSel=activeAccts()[0].id; expToSel=activeAccts()[1].id;
  paintKind(); paintExpPickers();
}

/* ---- budget sheet ---- */
function openBudg(){
  $('budgTotal').value = state.budg.__total||'';
  var cats=Object.keys(state.cats), h='';
  for(var i=0;i<cats.length;i++){ h += '<div class="lbl">'+(CAT_ICON[cats[i]]||'')+' '+esc(cats[i])+'</div>'
    + '<input class="inp" data-bc="'+esc(cats[i])+'" type="number" inputmode="decimal" step="any" placeholder="0" value="'+(state.budg[cats[i]]||'')+'">'; }
  $('budgCatList').innerHTML=h;
  openSheet('budgSheet');
}
function saveBudg(){
  var b={}; var t=parseFloat($('budgTotal').value); if(t>0) b.__total=t;
  var ins=$('budgCatList').querySelectorAll('[data-bc]');
  for(var i=0;i<ins.length;i++){ var v=parseFloat(ins[i].value); if(v>0) b[ins[i].getAttribute('data-bc')]=v; }
  state.budg=b; persist(); closeSheet(); renderExp(); toastN('Budgets saved');
}

/* ---- category editor ---- */
function renderCatEditor(){
  var cats=Object.keys(state.cats), h='';
  for(var i=0;i<cats.length;i++){ var c=cats[i];
    h += '<div class="catEditRow"><b>'+(CAT_ICON[c]||'')+' '+esc(c)+'</b><span class="x" data-delcat="'+esc(c)+'">Delete</span></div>';
    var subs=state.cats[c], sc='';
    for(var j=0;j<subs.length;j++) sc += '<span class="subChip">'+esc(subs[j])+' <span class="x" data-delsub="'+esc(c)+'|'+esc(subs[j])+'">\u00D7</span></span>';
    sc += '<span class="subChip" style="background:var(--amberSoft);color:var(--amber)" data-addsub="'+esc(c)+'">+ sub</span>';
    h += '<div style="padding:2px 0 10px">'+sc+'</div>';
  }
  $('catList').innerHTML=h;
}
function openCatEditor(){ renderCatEditor(); openSheet('catSheet'); }

/* ================= PIN lock ================= */
var lockMode='', pinBuf='', pinTmp='', lastUnlock=0, wasHidden=false;
function pinHash(p){ return 'h' + intHash('hb$' + p + '#salt').toString(36); }
function bioAvailSafe(){ try{ return !!(nat && nat.bioAvail()); }catch(e){ return false; } }
function updDots(){
  var is = $('lockDots').children;
  for(var i=0;i<4;i++) is[i].classList.toggle('f', i < pinBuf.length);
}
function showLock(mode){
  lockMode = mode; pinBuf = ''; updDots();
  var T = {unlock:'Enter PIN', new1:'Choose a PIN', new2:'Repeat PIN', ver:'Enter current PIN', off:'Enter current PIN'};
  var S = {unlock:'Personal Tracker is locked', new1:'4 digits', new2:'Type it once more', ver:'To change it', off:'To remove the lock'};
  $('lockT').textContent = T[mode]; $('lockS').textContent = S[mode];
  $('kBio').style.display = (mode==='unlock' && state.set.bio && bioAvailSafe()) ? '' : 'none';
  $('lock').classList.add('on');
  if(mode==='unlock' && state.set.bio && bioAvailSafe()) setTimeout(tryBio, 380);
}
function hideLock(){ $('lock').classList.remove('on'); lockMode=''; pinBuf=''; }
function lockNow(){
  if(!state.set.pin) return;
  if(Date.now() - lastUnlock < 4000) return;
  if(lockMode) return;
  showLock('unlock');
}
function tryBio(){ if(nat && lockMode==='unlock'){ try{ nat.bio(); }catch(e){} } }
window.bioResult = function(ok){
  if(ok && lockMode==='unlock'){ lastUnlock = Date.now(); hideLock(); }
};
function pinErr(){
  buzz(40); pinBuf=''; updDots();
  var d = $('lockDots'); if(!d) return;
  d.classList.add('err');
  setTimeout(function(){ d.classList.remove('err'); }, 420);
}
function padKey(k){
  if(k==='bio'){ tryBio(); return; }
  if(k==='del'){ pinBuf = pinBuf.slice(0,-1); updDots(); return; }
  if(pinBuf.length >= 4) return;
  pinBuf += k; updDots(); buzz(8);
  if(pinBuf.length < 4) return;
  var buf = pinBuf;
  setTimeout(function(){
    if(lockMode==='unlock'){
      if(pinHash(buf)===state.set.pin){ lastUnlock=Date.now(); hideLock(); }
      else { pinErr(); }
    } else if(lockMode==='new1'){ pinTmp = buf; showLock('new2'); }
    else if(lockMode==='new2'){
      if(buf===pinTmp){ state.set.pin = pinHash(buf); persist(); hideLock(); renderSet(); toastN('PIN set'); }
      else { toastN('PINs didn\'t match'); showLock('new1'); }
    } else if(lockMode==='ver'){
      if(pinHash(buf)===state.set.pin) showLock('new1');
      else { pinErr(); }
    } else if(lockMode==='off'){
      if(pinHash(buf)===state.set.pin){ state.set.pin=''; state.set.bio=false; persist(); hideLock(); renderSet(); toastN('PIN removed'); }
      else { pinErr(); }
    }
  }, 130);
}

/* ================= theme ================= */
function resolvedLight(){
  var t = state.set.theme || 'dark';
  if(t === 'light') return true;
  if(t === 'dark') return false;
  try{ return window.matchMedia('(prefers-color-scheme: light)').matches; }catch(e){ return false; }
}
var PAL_LIGHT_BG = {ember:'#F6F1E7', lagoon:'#EEF5F1', frost:'#EEF3FA', sakura:'#F8EFF3', violet:'#F1EFFA', mono:'#F6F1E7'};
var PAL_ALL = ['ember','lagoon','frost','sakura','violet','mono'];
function applyTheme(){
  var L = resolvedLight();
  var root = document.documentElement;
  root.classList.toggle('light', L);
  root.classList.toggle('amoled', !L && (state.set.theme === 'amoled'));
  var fonts = ['nothing','apple','google','space','bricolage','serif','system'];
  for(var fi=0; fi<fonts.length; fi++) root.classList.toggle('font-'+fonts[fi], state.set.font === fonts[fi]);
  var pal = state.set.pal || 'ember';
  for(var i=0;i<PAL_ALL.length;i++) root.classList.remove('p-' + PAL_ALL[i]);
  if(pal !== 'ember') root.classList.add('p-' + pal);
  var bg = L ? (PAL_LIGHT_BG[pal] || '#F6F1E7') : '#000000';
  var meta = document.querySelector('meta[name=theme-color]');
  if(meta) meta.setAttribute('content', bg);
  document.documentElement.setAttribute('data-theme', state.set.theme || 'dark');
  if(nat && nat.setBars){ try{ nat.setBars(bg, L); }catch(e){} }
}
try{
  var mqL = window.matchMedia('(prefers-color-scheme: light)');
  var mqFn = function(){ if((state.set.theme||'dark')==='auto') applyTheme(); };
  if(mqL.addEventListener) mqL.addEventListener('change', mqFn);
  else if(mqL.addListener) mqL.addListener(mqFn);
}catch(e){}
function applyGrey(){ document.documentElement.classList.toggle('grey', !!state.set.grey); }

/* ================= settings ================= */
function webNotifState(){
  if(!webNotifSupported()){ $('rowWebNotif').style.display = 'none'; return; }
  $('rowWebNotif').style.display = '';
  var perm = Notification.permission;
  var on = state.set.webNotif && perm === 'granted';
  $('btnWebNotif').textContent = on ? 'On' : (perm === 'denied' ? 'Blocked' : 'Enable');
  $('btnWebNotif').className = 'sbtn' + (on ? ' acc' : '');
  $('stWebNotif').textContent = perm === 'denied'
    ? 'Blocked \u2014 allow notifications in your browser\u2019s site settings'
    : on ? 'On \u2014 reminders fire while this tab is open'
    : 'Get habit reminders in this browser';
}
function renderSet(){
  selChip('thRow','data-th', state.set.theme || 'dark');
  selChip('palRow','data-pal', state.set.pal || 'ember');
  selChip('fontRow','data-font', state.set.font || 'nothing');
  var granted = nat ? (function(){try{return nat.notifGranted();}catch(e){return true;}})() : true;
  $('stNotif').textContent = nat ? (granted ? 'Enabled \u2014 reminders will fire on time' : 'Off \u2014 enable to get habit reminders') : 'Available in the Android app';
  $('btnNotif').style.display = (nat && !granted) ? '' : 'none';
  var exact = nat ? (function(){try{return nat.canExact();}catch(e){return true;}})() : true;
  $('stExact').textContent = exact ? 'On \u2014 reminders fire exactly on time' : 'Off \u2014 reminders may drift a few minutes';
  $('btnExact').style.display = (nat && !exact) ? '' : 'none';
  var hasPin = !!state.set.pin;
  $('stPin').textContent = hasPin ? 'On \u2014 required to open the app' : 'Off';
  $('btnPin').textContent = hasPin ? 'Change' : 'Set';
  $('btnPinOff').style.display = hasPin ? '' : 'none';
  $('rowBio').style.display = (hasPin && bioAvailSafe()) ? '' : 'none';
  $('bioTog').classList.toggle('on', !!state.set.bio);
  $('greyTog').classList.toggle('on', !!state.set.grey);
  $('stStack').textContent = state.stack.length ? state.stack.length + ' habits chained in order' : 'Chain habits in order \u2014 finishing one points to the next';
  $('unameIn').value = state.set.uname || '';
  webNotifState();
  if(nat && nat.fsCheck){
    try{
      var fsj = JSON.parse(nat.fsCheck());
      $('rowFs').style.display = fsj.need ? '' : 'none';
    }catch(e){ $('rowFs').style.display = 'none'; }
  }
  var vac = onVacation(today());
  $('stVac').textContent = vac ? 'On until ' + niceDate(state.set.vacUntil) + ' \u2014 chains protected' : 'Pause every habit \u2014 chains stay safe';
  $('btnVac').textContent = vac ? 'End' : 'Start';
  var an = 0;
  for(var ai=0; ai<state.habits.length; ai++) if(state.habits[ai].arch) an++;
  $('stArch').textContent = an ? an + ' paused \u00B7 history kept' : 'Nothing archived';
  $('stBk').textContent = state.set.lastAutoBk ?
    'Saved daily \u00B7 last: ' + state.set.lastAutoBk
    : 'A local backup is saved once a day';
  $('verLine').textContent = nat
    ? ('Personal Tracker v' + (function(){try{return nat.appVer();}catch(e){return '2';}})() + ' \u00b7 private')
    : 'Personal Tracker \u00b7 web \u00b7 private';
}

/* ================= cloud sync (Firebase Cloud Firestore) ================= */
// Firestore-only sync. Realtime Database is intentionally not used by this build.
var SYNC_CFG_KEY = 'hb_sync_cfg';
var SYNC_HISTORY_KEY = 'hb_sync_history_v1';
var DEFAULT_SYNC_CFG = {
  apiKey: 'AIzaSyBGl_VR0LAv6sqmi08v6Sigf5Mt41-UyuA',
  authDomain: 'habits-644e7.firebaseapp.com',
  projectId: 'habits-644e7',
  storageBucket: 'habits-644e7.firebasestorage.app',
  messagingSenderId: '34132591511',
  appId: '1:34132591511:web:6646118b60e4710cb13ad2'
};
var FIRESTORE_SDK_URL = 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore-compat.js';
var fbApp=null, fbAuth=null, fbFS=null, fbDoc=null, fbRecords=null, fbUser=null, fbUnsub=null, syncMetaDoc=null;
var syncBusy=false, syncApplying=false, syncPushT=null, syncLastAt=0, syncLastDevice='', syncLastState='', syncCfg=null, syncState='', syncLegacyMode=false, syncInitialHydration=true;
var deviceId = (function(){ try{ var k='hb_device_id'; var v=localStorage.getItem(k); if(v) return v; v='d_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8); localStorage.setItem(k,v); return v; }catch(e){ return 'd_'+Date.now(); } })();

function loadSyncCfg(){
  try{ var r=localStorage.getItem(SYNC_CFG_KEY); return r?JSON.parse(r):null; }catch(e){ return null; }
}
function saveSyncCfg(cfg){ try{ localStorage.setItem(SYNC_CFG_KEY, JSON.stringify(cfg)); }catch(e){} }
function clearSyncCfg(){ try{ localStorage.removeItem(SYNC_CFG_KEY); }catch(e){} }
function loadSyncHistory(){ try{ return JSON.parse(localStorage.getItem(SYNC_HISTORY_KEY)||'[]'); }catch(e){ return []; } }
function saveSyncHistory(a){ try{ localStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(a.slice(0,10))); }catch(e){} }
function snapshotLocal(reason){
  try{
    var a=loadSyncHistory();
    a.unshift({at:Date.now(),reason:reason||'sync',mtime:state.mtime||0,data:JSON.stringify(stateForStorage())});
    saveSyncHistory(a);
  }catch(e){}
}
function cfgLooksValid(c){ return c && c.apiKey && c.authDomain && c.projectId && c.appId; }
function isOnline(){ return (typeof navigator==='undefined') || navigator.onLine !== false; }
function syncEnabled(){ return !!syncCfg; }
function setSyncState(v){ syncState=v||''; var d=$('syncDot'); if(d) d.className='syncDot'+(v==='syncing'?' busy':v==='error'?' err':v==='synced'?' on':''); renderSyncUI(); renderTodaySyncUI(); }

// parse JSON or a loose JS config object
function parseFbConfig(txt){
  txt=String(txt||'').trim(); if(!txt) return null;
  var b=txt.indexOf('{'), e=txt.lastIndexOf('}'); if(b>=0&&e>b) txt=txt.slice(b,e+1);
  try{return JSON.parse(txt);}catch(_){ }
  try{ return JSON.parse(txt.replace(/([,{]\s*)([A-Za-z0-9_]+)\s*:/g,'$1"$2":').replace(/'/g,'"').replace(/,\s*}/g,'}')); }catch(_){return null;}
}

var fbLoading=null;
function loadFirestoreSDK(){
  if(window.firebase && firebase.firestore) return Promise.resolve();
  if(fbLoading) return fbLoading;
  var files=['firebase-app-compat.js','firebase-auth-compat.js'];
  var chain=files.reduce(function(c,f){return c.then(function(){return new Promise(function(res,rej){var sc=document.createElement('script');sc.src=f;sc.async=false;sc.onload=res;sc.onerror=function(){rej(new Error('sdk-load-failed'));};document.head.appendChild(sc);});});},Promise.resolve());
  chain=chain.then(function(){return new Promise(function(res,rej){
    var sc=document.createElement('script'); sc.src=FIRESTORE_SDK_URL; sc.async=false; sc.onload=res; sc.onerror=function(){rej(new Error('firestore-sdk-load-failed'));}; document.head.appendChild(sc);
  });});
  fbLoading=Promise.race([chain,new Promise(function(_,rej){setTimeout(function(){rej(new Error('sdk-timeout'));},15000);})]);
  fbLoading.catch(function(){fbLoading=null;}); return fbLoading;
}

function ensureFirebaseReady(){
  if(fbAuth && fbFS) return Promise.resolve();
  if(!syncCfg) return Promise.reject(new Error('no-config'));
  return loadFirestoreSDK().then(function(){
    if(!window.firebase || !firebase.auth || !firebase.firestore) throw new Error('sdk-load-failed');
    if(!fbApp){
      fbApp=firebase.apps&&firebase.apps.length?firebase.app():firebase.initializeApp(syncCfg);
      fbAuth=firebase.auth();
      fbFS=firebase.firestore();
      try{ fbAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); }catch(e){}
      // Firestore local cache with multi-tab synchronization.
      return fbFS.enablePersistence({synchronizeTabs:true}).catch(function(e){
        // Another tab may already own persistence. Firestore will still work online.
        if(e && (e.code==='failed-precondition'||e.code==='unimplemented')) return;
        throw e;
      }).then(function(){
        fbAuth.onAuthStateChanged(function(u){
          fbUser=u;
          if(u) attachFirestoreSync(u); else detachFirestoreSync();
          renderSyncUI();
        });
      });
    }
  });
}

function initSync(){
  var savedCfg=loadSyncCfg();
  syncCfg=cfgLooksValid(savedCfg)?savedCfg:DEFAULT_SYNC_CFG;
  saveSyncCfg(syncCfg);
  renderSyncUI();
  ensureFirebaseReady().then(function(){renderSyncUI();}).catch(function(){setSyncState('error');});
}

function syncMetaRef(){return fbDoc||null;}
function applySyncMeta(d){d=d||{};var x=d.syncMeta&&typeof d.syncMeta==='object'?d.syncMeta:d;var at=Number(x.lastSyncAtMs||0);if(at)syncLastAt=at;syncLastDevice=String(x.lastSyncDeviceId||'');syncLastState=String(x.lastSyncState||'');}
function loadSyncMeta(){var ref=syncMetaRef();if(!ref)return Promise.resolve();syncMetaDoc=ref;return ref.get({source:'default'}).then(function(s){if(s.exists){var d=s.data()||{};applySyncMeta(d);renderSyncUI();renderTodaySyncUI();}}).catch(function(){});}
function writeSyncMeta(status){var ref=syncMetaRef();if(!ref||!fbUser)return Promise.resolve();var at=Date.now();var payload={lastSyncAtMs:at,lastSyncState:status||'synced',lastSyncDeviceId:deviceId,lastSyncMtime:Number(state.mtime||at),schemaVersion:1};syncLastAt=at;syncLastState=status||'synced';syncLastDevice=deviceId;return ref.set({syncMeta:payload},{merge:true}).catch(function(){});}

function syncRecordEntries(){var out={};function addArray(d,a){(a||[]).forEach(function(v){if(v&&v.id)out[d+':'+v.id]=v;});}function addMap(d,o){if(!o||typeof o!=='object')return;Object.keys(o).forEach(function(k){out[d+':'+k]={key:k,value:o[k]};});}addArray('habit',state.habits);addArray('tx',state.tx);addArray('acct',state.accts);addArray('exercise',state.exs);addArray('workout',state.wlog);addArray('sleep',state.sleep);addArray('journal',state.jr);addArray('goal',state.goals);addArray('task',state.tasks);addMap('mood',state.mood);addMap('moodNote',state.moodNotes);addMap('hlog',state.hlog);addMap('closed',state.closed);addMap('budg',state.budg);addMap('budgets',state.budgets);addMap('cats',state.cats);addMap('fxRates',state.fxRates);out['set:all']=state.set;out['incCats:all']=state.incCats;return out;}
var syncRecordShadow={};var syncPendingRecords={};
try{syncRecordShadow=JSON.parse(localStorage.getItem('hb_sync_record_shadow')||'{}')||{};}catch(e){}
try{syncPendingRecords=JSON.parse(localStorage.getItem('hb_sync_pending')||'{}')||{};}catch(e){}
function syncHash(v){try{return JSON.stringify(v);}catch(e){return String(v);}}
function queueChangedSyncRecords(){var cur=syncRecordEntries(),now=Date.now(),meta=syncRecordShadow||{};Object.keys(cur).forEach(function(k){var h=syncHash(cur[k]),old=meta[k];if(!old||old.hash!==h){meta[k]={hash:h,at:now};syncPendingRecords[k]={data:cur[k],at:now,deleted:false};}});Object.keys(meta).forEach(function(k){if(!cur[k]&&!meta[k].deleted){meta[k]={hash:'__deleted__',at:now,deleted:true};syncPendingRecords[k]={data:null,at:now,deleted:true};}});syncRecordShadow=meta;try{localStorage.setItem('hb_sync_record_shadow',JSON.stringify(meta));localStorage.setItem('hb_sync_pending',JSON.stringify(syncPendingRecords));}catch(e){}}
function applySyncRecord(key,value,deleted){var p=key.indexOf(':'),d=p>=0?key.slice(0,p):key,id=p>=0?key.slice(p+1):'';function arrSet(a,v){var ix=a.findIndex(function(x){return x&&x.id===id;});if(deleted){if(ix>=0)a.splice(ix,1);}else if(ix>=0)a[ix]=v;else a.push(v);}if(d==='habit'){arrSet(state.habits,value);return;}if(d==='tx'){arrSet(state.tx,value);return;}if(d==='acct'){arrSet(state.accts,value);return;}if(d==='exercise'){arrSet(state.exs,value);return;}if(d==='workout'){arrSet(state.wlog,value);return;}if(d==='sleep'){arrSet(state.sleep,value);return;}if(d==='journal'){arrSet(state.jr,value);return;}if(d==='goal'){arrSet(state.goals,value);return;}if(d==='task'){arrSet(state.tasks,value);return;}var map={'mood':'mood','moodNote':'moodNotes','hlog':'hlog','closed':'closed','budg':'budg','budgets':'budgets','cats':'cats','fxRates':'fxRates'}[d];if(map){state[map]=state[map]||{};if(deleted)delete state[map][id];else state[map][id]=value&&value.value!==undefined?value.value:value;return;}if(d==='set'&&id==='all'){if(!deleted)state.set=Object.assign({},state.set,value||{});return;}if(d==='incCats'&&id==='all'){if(!deleted)state.incCats=value||[];}}
function pushLegacySync(force){if(!fbDoc||!fbUser)return Promise.resolve();if(!isOnline()&&!force){setSyncState('cached');return Promise.resolve();}setSyncState('syncing');var payload={data:JSON.stringify(stateForStorage()),version:Number(state.mtime||Date.now()),schemaVersion:2,updatedAtMs:Date.now(),syncMode:'compatibility'};return fbDoc.set(payload,{merge:true}).then(function(){return writeSyncMeta('synced');}).then(function(){setSyncState('synced');syncMsg('Compatibility sync is active. Publish the included Firestore Rules to enable record-level sync.',false);}).catch(function(e){setSyncState(isOnline()?'error':'cached');syncMsg(prettySyncErr(e),true);throw e;});}
function pushRecordSync(force){if(syncLegacyMode)return pushLegacySync(force);if(!fbRecords||!fbUser)return Promise.resolve();if(!isOnline()&&!force){setSyncState('cached');return Promise.resolve();}queueChangedSyncRecords();var keys=Object.keys(syncPendingRecords);if(!keys.length){setSyncState('synced');return writeSyncMeta('synced').then(function(){setSyncState('synced');});}setSyncState('syncing');var jobs=[];for(var b=0;b<keys.length;b+=400){(function(keys2){var batch=fbFS.batch();keys2.forEach(function(k){var m=syncPendingRecords[k],ref=fbRecords.doc(k.replace(/[^A-Za-z0-9_-]/g,'_')),pl={key:k,deleted:!!m.deleted,updatedAtMs:m.at,deviceId:deviceId,schemaVersion:2};if(!m.deleted)pl.data=m.data;batch.set(ref,pl,{merge:true});});jobs.push(batch.commit());})(keys.slice(b,b+400));}return Promise.all(jobs).then(function(){keys.forEach(function(k){delete syncPendingRecords[k];});try{localStorage.setItem('hb_sync_pending',JSON.stringify(syncPendingRecords));}catch(e){}return writeSyncMeta('synced');}).then(function(){setSyncState('synced');syncMsg('',false);}).catch(function(e){setSyncState(isOnline()?'error':'cached');syncMsg(prettySyncErr(e),true);throw e;});}
function applyRemoteRecords(docs){var changed=false;docs.forEach(function(doc){var v=doc.data()||{},key=v.key||doc.id,at=Number(v.updatedAtMs||0),local=syncRecordShadow[key],pending=syncPendingRecords[key],lat=Math.max(local&&local.at||0,pending&&pending.at||0);if(at<=lat)return;applySyncRecord(key,v.data,v.deleted);delete syncPendingRecords[key];syncRecordShadow[key]={hash:v.deleted?'__deleted__':syncHash(v.data),at:at,deleted:!!v.deleted};changed=true;});try{localStorage.setItem('hb_sync_record_shadow',JSON.stringify(syncRecordShadow));localStorage.setItem('hb_sync_pending',JSON.stringify(syncPendingRecords));}catch(e){}if(changed){state=normState(state);var json=stateJson();if(json){try{localStorage.setItem(KEY,json);}catch(e){}if(nat){try{nat.saveState(json);}catch(e){}}}applyTheme();applyGrey();reRenderCurrent();}return changed;}
function enableLegacySync(reason){syncLegacyMode=true;if(fbUnsub){try{fbUnsub();}catch(e){}}fbUnsub=null;fbRecords=null;setSyncState('syncing');syncMsg('Compatibility sync is active. Publish the included Firestore Rules to enable record-level sync.',false);syncReconcile().catch(function(e){setSyncState(isOnline()?'error':'cached');syncMsg(prettySyncErr(e),true);});}
function attachFirestoreSync(u){
  detachFirestoreSync();
  if(!fbFS)return;
  fbDoc=fbFS.collection('users').doc(u.uid);
  fbRecords=fbDoc.collection('records');
  syncMetaDoc=syncMetaRef();
  syncLegacyMode=false;
  syncInitialHydration=true;
  setSyncState('syncing');
  fbUnsub=fbRecords.onSnapshot({includeMetadataChanges:true},function(snap){
    if(syncApplying)return;
    var docs=[];
    snap.docChanges().forEach(function(ch){if(ch.type==='added'||ch.type==='modified')docs.push(ch.doc);});
    if(docs.length)applyRemoteRecords(docs);
    if(!syncInitialHydration)setSyncState(snap.metadata.fromCache?'cached':'synced');
  },function(e){
    if(e&&e.code==='permission-denied'){enableLegacySync('permission-denied');return;}
    setSyncState('error');syncMsg(prettySyncErr(e),true);
  });
  loadSyncMeta().then(function(){return syncReconcile();}).then(function(){syncInitialHydration=false;setSyncState(isOnline()?'synced':'cached');renderToday();if($('pgTasks').classList.contains('on'))renderTasks();}).catch(function(){});
}
function detachFirestoreSync(){if(fbUnsub){try{fbUnsub();}catch(e){}}fbUnsub=null;fbRecords=null;fbDoc=null;syncMetaDoc=null;syncLegacyMode=false;}
function syncReconcile(){
  if(!fbDoc||!fbUser)return Promise.resolve();
  if(syncLegacyMode){
    setSyncState('syncing');
    return fbDoc.get({source:'default'}).then(function(legacy){
      var d=legacy.exists?legacy.data()||{}:{};
      if(d.data){
        var remoteAt=Number(d.version||d.updatedAtMs||0),localAt=Number(state.mtime||0);
        if(!hasMeaningfulData(state) || remoteAt>localAt){
          try{state=normState(typeof d.data==='string'?JSON.parse(d.data):d.data);state.mtime=remoteAt||Date.now();var stored=stateForStorage();localStorage.setItem(KEY,JSON.stringify(stored));if(nat)nat.saveState(JSON.stringify(stored));}catch(e){}
        }
      }
      return pushLegacySync(true);
    }).catch(function(e){setSyncState(isOnline()?'error':'cached');syncMsg(prettySyncErr(e),true);throw e;});
  }
  if(!fbRecords)return Promise.resolve();
  setSyncState('syncing');
  return fbRecords.get({source:'default'}).then(function(snap){
    if(snap.size){
      syncApplying=true;
      try{applyRemoteRecords(snap.docs);}finally{setTimeout(function(){syncApplying=false;},50);}
      return pushRecordSync(false);
    }
    return fbDoc.get({source:'default'}).then(function(legacy){
      var d=legacy.exists?legacy.data()||{}:{};
      if(d.data){
        var remoteAt=Number(d.version||d.updatedAtMs||0),localAt=Number(state.mtime||0);
        if(!hasMeaningfulData(state) || remoteAt>localAt){
          try{state=normState(typeof d.data==='string'?JSON.parse(d.data):d.data);state.mtime=remoteAt||Date.now();var stored=stateForStorage();localStorage.setItem(KEY,JSON.stringify(stored));if(nat)nat.saveState(JSON.stringify(stored));}catch(e){}
        }
      }
      return pushRecordSync(true);
    });
  }).catch(function(e){
    if(e&&e.code==='permission-denied'){enableLegacySync('permission-denied');return Promise.resolve();}
    setSyncState(isOnline()?'error':'cached');syncMsg(prettySyncErr(e),true);throw e;
  });
}
function scheduleSyncPush(){if((!fbDoc||!fbUser)||syncApplying)return;if(syncPushT)clearTimeout(syncPushT);syncPushT=setTimeout(function(){pushRecordSync(false).catch(function(){});},700);}
function pushNow(force){return pushRecordSync(!!force);}
function CloudPush(){return pushNow(false);}window.Cloud=window.Cloud||{};window.Cloud.push=CloudPush;

function renderTodaySyncUI(){
  var bar=$('todaySyncBar'), dot=$('todaySyncDot'), text=$('todaySyncText'), sub=$('todaySyncSub'), btn=$('todaySyncBtn');
  if(!bar||!dot||!text||!sub||!btn) return;
  var offline=!isOnline(), configured=syncEnabled(), signedIn=!!fbUser;
  bar.classList.toggle('disabled', !configured || !signedIn);
  dot.className='todaySyncDot';
  btn.classList.remove('busy');
  btn.disabled=false;
  if(!configured){
    text.textContent='Cloud sync not configured';
    sub.textContent='Set up Firestore in Settings';
    btn.querySelector('span').textContent='Set up';
    return;
  }
  if(!signedIn){
    text.textContent='Cloud sync';
    sub.textContent='Sign in from Settings to sync';
    btn.querySelector('span').textContent='Sign in';
    return;
  }
  var stateLabel=syncState==='syncing'?'Syncing…':(syncState==='cached'||offline?'Offline (cached)':syncState==='error'?'Sync error':'Synced');
  var stateClass=syncState==='syncing'?'syncing':(syncState==='cached'||offline?'cached':syncState==='error'?'error':'synced');
  dot.classList.add(stateClass);
  text.textContent=stateLabel;
  if(syncState==='error') sub.textContent='Check Settings for details';
  else if(syncState==='syncing') sub.textContent='Updating your cloud data';
  else if(offline) sub.textContent='Changes stay safe on this device';
  else sub.textContent=syncLastAt?('Last cloud sync '+new Date(syncLastAt).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})):'Ready to sync';
  btn.querySelector('span').textContent=syncState==='syncing'?'Syncing…':'Sync';
  if(syncState==='syncing') btn.classList.add('busy');
}

function renderSyncUI(){
  renderTodaySyncUI();
  if(!$('syncCard')) return;
  var offline=!isOnline();
  $('syncOffline').style.display=(syncEnabled()&&offline)?'':'none';
  if(!syncEnabled()){show('syncSetup',true);show('syncAuth',false);show('syncOn',false);return;}
  if(fbUser){
    show('syncSetup',false);show('syncAuth',false);show('syncOn',true);
    $('syncWho').textContent=fbUser.email||'signed in';
    var label=syncState==='syncing'?'Syncing…':syncState==='cached'||offline?'Offline (cached)':syncState==='error'?'Sync error':'Synced';
    $('syncOn').querySelector('.setT').textContent=label;
    $('syncLast').textContent=syncLastAt?('at '+new Date(syncLastAt).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})):'waiting…';
  }else{show('syncSetup',false);show('syncAuth',true);show('syncOn',false);}
}
function show(id,on){var el=$(id);if(el)el.style.display=on?'':'none';}
function syncMsg(t,err){var m=$('syncAuthMsg');if(!m)return;m.style.display=t?'':'none';m.textContent=t||'';m.style.color=err?'var(--coral)':'var(--mut)';}
function prettyAuthErr(e){var c=e&&e.code||'';if(c.indexOf('email-already-in-use')>=0)return'That email already has an account — use Sign in.';if(c.indexOf('user-not-found')>=0)return'No account yet — use Create account.';if(c.indexOf('wrong-password')>=0||c.indexOf('invalid-credential')>=0)return'Wrong email or password.';if(c.indexOf('weak-password')>=0)return'Password should be at least 6 characters.';if(c.indexOf('invalid-email')>=0)return'That doesn’t look like a valid email.';if(c.indexOf('network')>=0)return'Network error — check your connection.';return(e&&e.message)?e.message:'Something went wrong.';}
function prettySyncErr(e){
  var c=(e&&e.code)||'', m=(e&&e.message)||'';
  if(c==='permission-denied') return 'Firestore permission denied — publish the included Firestore Rules and make sure you are signed in.';
  if(c==='unauthenticated') return 'Firebase authentication expired — sign in again.';
  if(c==='failed-precondition') return 'Firestore local cache could not start — close other tabs/apps and try again.';
  if(c==='unavailable') return 'Firestore is temporarily unavailable — check your internet connection.';
  if(c==='resource-exhausted') return 'Firestore quota/rate limit reached — try again later.';
  if(c==='invalid-argument') return 'Firestore rejected the sync payload.';
  if(c==='state-too-large') return 'Sync failed — local data is too large for one Firestore document.';
  if(c==='sdk-load-failed'||c==='firestore-sdk-load-failed'||c==='sdk-timeout') return 'Could not load the Firestore SDK. Check internet access and try again.';
  return m ? ('Sync error: '+m) : 'Sync failed — check Firestore Rules and connection.';
}
function doSyncSignin(create){
  var email=$('syncEmail').value.trim(),pw=$('syncPw').value;
  if(!email||pw.length<6){syncMsg('Enter an email and a 6+ character password.',true);return;}
  syncMsg(create?'Creating account…':'Signing in…',false);
  ensureFirebaseReady().then(function(){return create?fbAuth.createUserWithEmailAndPassword(email,pw):fbAuth.signInWithEmailAndPassword(email,pw);}).then(function(){syncMsg('',false);$('syncPw').value='';}).catch(function(e){syncMsg(prettyAuthErr(e),true);});
}

/* ================= export / import ================= */
function jsonB64(){ return btoa(unescape(encodeURIComponent(JSON.stringify(stateForStorage())))); }
var XMIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
function buildXlsx(){
  var wb = XLSX.utils.book_new(), now = new Date();
  var hRows = [['Name','Icon','Type','Target','Unit','Category','Time of day','Repeat','Start','End','Reminders','Current chain','Best chain','Total done','30-day %']];
  for(var i=0;i<state.habits.length;i++){
    var h = state.habits[i], r = habitRate(h, addDays(now,-29), now);
    hRows.push([h.name, h.emoji, TYPELBL[h.type]||h.type, h.target, h.unit, h.cat, h.section,
      h.sched.kind, h.start, h.end, h.rem.times.join(' '), streak(h), bestStreak(h), totalDone(h), Math.round(r.rate*100)]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hRows), 'Habits');
  var earliest = today();
  for(var e=0;e<state.habits.length;e++) if(state.habits[e].created < earliest) earliest = state.habits[e].created;
  var d0 = toDate(earliest);
  if(dayDiff(earliest, today()) > 365) d0 = addDays(new Date(), -365);
  var head = ['Date'];
  for(var n=0;n<state.habits.length;n++) head.push(state.habits[n].name);
  var log = [head], daily = [['Date','Scheduled','Done','%']];
  var d = new Date(d0.getTime()), guard = 0;
  while(fmt(d) <= today() && guard++ < 400){
    var row = [fmt(d)], a = dayAgg(d);
    for(var m=0;m<state.habits.length;m++){
      var hb = state.habits[m], ds = fmt(d);
      row.push(isFroz(hb,ds) ? 'frozen' : (val(hb,ds) || ''));
    }
    log.push(row);
    daily.push([fmt(d), a.s, a.d, a.s ? Math.round(a.d/a.s*100) : '']);
    d = addDays(d,1);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(log), 'Log');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(daily), 'Daily');
  var mrows = [['Date','Mood','Score','Remark']], mkeys = [];
  for(var mmk in state.mood) mkeys.push(mmk);
  mkeys.sort();
  for(var mq=0; mq<mkeys.length; mq++){
    var mmi = state.mood[mkeys[mq]];
    if(typeof mmi === 'number' && MOODS[mmi]) mrows.push([mkeys[mq], MOODS[mmi].l, MOODS[mmi].s, state.moodNotes[mkeys[mq]] || '']);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mrows), 'Mood');
  var jrows = [['Date','Title','Entry','Tags','Photos']];
  for(var jq=0; jq<state.jr.length; jq++){
    var jen = state.jr[jq];
    jrows.push([jen.d, jen.t, jen.b, jrTagsOf(jen).join(' '), jen.ph.length]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(jrows), 'Journal');
  if(state.tasks&&state.tasks.length){var trows=[['Task','Description','Due date','Due time','Priority','Status','Subtask progress','Comments']];state.tasks.forEach(function(t){var tsp=taskSubProgress(t);trows.push([t.title,t.description,t.dueDate,t.dueTime||'',t.priority.toUpperCase(),taskEffectiveStatus(t),tsp.done+'/'+tsp.total,(t.comments||[]).map(function(c){return c.text;}).join(' || ')]);});XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(trows),'Tasks');}
  var p30 = periodStats(addDays(now,-29), now);
  var sum = [['Metric','Value'],
    ['Average completion (30d)', Math.round(p30.rate*100)+'%'],
    ['Productivity score', prodScore()],
    ['Weekly consistency', Math.round(weeklyConsistency()*100)+'%'],
    ['Monthly consistency', Math.round(monthlyConsistency()*100)+'%'],
    ['Missed days (30d)', p30.missed],
    ['Perfect weeks (12w)', perfectWeeks(12)],
    ['Perfect months (12m)', perfectMonths(12)],
    ['Exported', new Date().toString()]];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sum), 'Summary');
  return XLSX.write(wb, {bookType:'xlsx', type:'base64'});
}
window.importNative = function(b64){
  var txt;
  try{ txt = decodeURIComponent(escape(atob(b64))); }catch(e){ try{ txt = atob(b64); }catch(e2){ toastN('Could not read file'); return; } }
  try{
    var o = JSON.parse(txt);
    if(o && o.habits && o.habits.length !== undefined){
      state = normState(o);
      state.mtime = Date.now();
      try{ localStorage.setItem(KEY, JSON.stringify(stateForStorage())); }catch(e3){}
      persist(); applyTheme(); applyGrey(); renderToday(); renderSet();
      toastN('Imported ' + state.habits.length + ' habits \u2713');
    } else toastN('Not a Habits backup');
  }catch(e4){ toastN('Not a Habits backup'); }
};
function autoBackupDaily(){
  if(!nat || state.set.lastAutoBk === today()) return;
  try{
    var p = nat.autoBackup('habits-backup-' + today() + '.json', JSON.stringify(stateForStorage()));
    state.set.lastAutoBk = today();
    if(p) state.set.lastBkPath = p;
    persist();
  }catch(e){}
}

/* ================= native sync & alarms ================= */
function computeAlarms(){
  var out = [], now = Date.now();
  for(var i=0;i<state.habits.length;i++){
    var h = state.habits[i];
    var times = h.rem.times.slice();
    if(h.rem.missed) times.push('21:30');
    if(!times.length) continue;
    for(var day=0; day<7; day++){
      var d = addDays(new Date(), day);
      if(!dueOn(h, d)) continue;
      var ds = fmt(d);
      for(var j=0;j<times.length;j++){
        var p = times[j].split(':');
        var dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), +p[0], +p[1], 0, 0);
        if(dt.getTime() <= now) continue;
        out.push({c: intHash(h.id+'|'+ds+'|'+times[j]), t: dt.getTime(), h: h.id,
          n: h.name, e: h.emoji, r: h.rem.repeat ? 1 : 0});
      }
    }
  }
  if(state.set.jrRem){
    for(var jd=0; jd<7; jd++){
      var djr = addDays(new Date(), jd);
      var pj = state.set.jrRem.split(':');
      var dtj = new Date(djr.getFullYear(), djr.getMonth(), djr.getDate(), +pj[0], +pj[1], 0, 0);
      if(dtj.getTime() <= now) continue;
      out.push({c: intHash('jr|' + fmt(djr)), t: dtj.getTime(), h: 'jr',
        n: 'Journal — a minute for today\u2019s entry', e: '\u270D\uFE0F', r: 0});
    }
  }
  // Credit-card payment reminders: only cards with an outstanding balance are reminded.
  for(var ci=0;ci<state.accts.length;ci++){var ca=state.accts[ci];if(ca.type!=='credit'||!ca.active)continue;var cb=creditOutstanding(ca.id);if(cb<=0)continue;var due=nextCreditDue(ca), dueAt=new Date(due.getFullYear(),due.getMonth(),due.getDate(),9,0,0,0);if(dueAt.getTime()<=now||dueAt.getTime()>now+7*86400000)continue;out.push({c:intHash('cc-due|'+ca.id+'|'+fmt(due)),t:dueAt.getTime(),h:'credit',n:'Credit card payment due: '+ca.name,e:'💳',b:'Outstanding '+inr(cb)+' · due today',r:0});}
  // Task reminders use the same native alarm pipeline as existing habit reminders.
  for(var ti=0;ti<state.tasks.length;ti++){var tk=state.tasks[ti],st=taskEffectiveStatus(tk);if(st==='completed'||!tk.dueDate||!tk.reminders.length)continue;var base=new Date(tk.dueDate+'T'+(tk.dueTime||'09:00'));for(var ri=0;ri<tk.reminders.length;ri++){var offset=tk.reminders[ri]*86400000,at=new Date(base.getTime()-offset);if(at.getTime()<=now||at.getTime()>now+30*86400000)continue;out.push({c:intHash('task-rem|'+tk.id+'|'+tk.reminders[ri]+'|'+tk.dueDate),t:at.getTime(),h:'',task:tk.id,n:tk.title,e:tk.priority==='high'?'🔴':'✓',b:'Task reminder · due '+niceDate(tk.dueDate)+(tk.dueTime?' at '+timeFmt(tk.dueTime):''),r:0});}}
  out.sort(function(a,b){ return a.t - b.t; });
  return JSON.stringify(out.slice(0, 140));
}
function pushAlarms(){
  if(!nat){ scheduleWebNotifs(); return; }
  if(!nat) return;
  var j = computeAlarms();
  if(j !== lastAlarmsJson){ lastAlarmsJson = j; try{ nat.setAlarms(j); }catch(e){} }
}
function syncFromNative(){
  if(!nat) return false;
  try{
    var s = nat.getState();
    if(!s) return false;
    var o = JSON.parse(s);
    var nativeHasData=hasMeaningfulData(o), localHasData=hasMeaningfulData(state);
    if(nativeHasData && (!localHasData || (o.mtime||0) > (state.mtime||0))){
      state = normState(o);
      try{ localStorage.setItem(KEY, JSON.stringify(stateForStorage())); }catch(e){}
      return true;
    }
    if((o.mtime||0) < (state.mtime||0) && localHasData){
      nat.saveState(JSON.stringify(stateForStorage()));
    }
  }catch(e){}
  return false;
}
window.onNativeResume = function(){
  syncFromNative();
  handleLaunchAction();
  pushAlarms();
  renderToday();
  if($('pgStats').classList.contains('on')) renderStats();
  if($('pgMood').classList.contains('on')) renderMood();
  if($('pgTasks').classList.contains('on')) renderTasks();
  if(wasHidden){ wasHidden = false; lockNow(); }
};

/* ================= pickers & tabs ================= */
function buildPickers(){
  var eh = '';
  for(var i=0;i<EMOJIS.length;i++) eh += '<button class="ebtn" data-e="'+EMOJIS[i]+'">'+EMOJIS[i]+'</button>';
  $('egrid').innerHTML = eh;
  var ch = '';
  for(var j=0;j<COLORS.length;j++)
    ch += '<button class="cbtn" data-c="'+COLORS[j]+'" style="background:'+COLORS[j]+';color:'+COLORS[j]+'" aria-label="color"></button>';
  $('cgrid').innerHTML = ch;
  var th = '';
  for(var k=0;k<TEMPLATES.length;k++)
    th += '<button class="tpl" data-tp="'+k+'">'+TEMPLATES[k].e+' '+TEMPLATES[k].n+'</button>';
  $('tplRow').innerHTML = th;
}
function materialSnack(msg, action, cb){
  var box=$('materialSnack'), txt=$('materialSnackMsg'), act=$('materialSnackAction');
  if(!box) return;
  clearTimeout(window._matSnackT);
  txt.textContent=msg||'';
  act.style.display=action?'':'none'; act.textContent=action||''; act.onclick=function(){ if(cb) cb(); box.classList.remove('on'); };
  box.classList.add('on');
  window._matSnackT=setTimeout(function(){box.classList.remove('on');},3200);
}
function openAddActionSheet(){ openSheet('actionSheet'); }
function handleAddAction(kind){
  closeSheet();
  setTimeout(function(){
    if(kind==='habit') openEdit(null);
    else if(kind==='task') openTask(null);
    else if(kind==='expense'){ showTab('pgExp'); setTimeout(function(){openExp(null);},60); }
    else if(kind==='mood'){ showTab('pgMood'); setTimeout(function(){ var g=$('moGrid'); if(g) g.scrollIntoView({behavior:'smooth',block:'center'}); var first=g&&g.querySelector('[data-mood]'); if(first) first.focus(); },80); }
    else if(kind==='journal'){ setTimeout(function(){openJr(null);},60); }
    else if(kind==='sleep'){ showTab('pgMood'); setTimeout(function(){openSleep(today());},60); }
  },80);
}

function showTab(id){
  var wm = $('wkModule'); if(wm && wm.classList.contains('on')) wm.classList.remove('on');
  var pgs = ['pgToday','pgTasks','pgMood','pgExp','pgStats','pgAI','pgSet'];
  for(var i=0;i<pgs.length;i++) $(pgs[i]).classList.toggle('on', pgs[i]===id);
  var tabs = $('tabbar').children;
  for(var j=0;j<tabs.length;j++) tabs[j].classList.toggle('on', tabs[j].getAttribute('data-tab')===id);
  $('fabLbl').textContent = id==='pgExp' ? 'Add' : 'Add anything';
  if(id==='pgStats') renderStats();
  if(id==='pgTasks') renderTasks();
  if(id==='pgMood') renderMood();
  if(id==='pgExp') renderExp();
  if(id==='pgSet') renderSet();
  if(id==='pgAI') renderAI();
  $('fab').style.display = (id==='pgToday'||id==='pgExp'||id==='pgTasks') ? '' : 'none';
  $('fabLbl').textContent = id==='pgExp' ? 'Add' : id==='pgTasks' ? 'Add task' : 'Add anything';
  $('app').scrollTop = 0;
}
function climb(el, root, attr){
  while(el && el !== root){
    if(el.getAttribute && el.getAttribute(attr) !== null) return el;
    el = el.parentNode;
  }
  return null;
}


/* ================= TASK MANAGEMENT ================= */
var taskSearchQ='',taskFilter='all',taskExportMode='today',taskEd=null,taskShowAllDone=false; /* perf: completed list capped until expanded */
function taskCommentTime(ts){try{return new Date(ts).toLocaleString(undefined,{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});}catch(e){return '';}}
function renderTaskComments(){
  var wrap=$('taskComments'),list=$('taskCommentList'),count=$('taskCommentCount');
  if(!wrap||!list||!count)return;
  var editing=!!(taskEd&&taskEd._edit);
  wrap.style.display=editing?'':'none';
  if(!editing)return;
  var comments=taskEd.comments||[];count.textContent=comments.length;
  if(!comments.length){list.innerHTML='<div class="setS">No comments yet. Add the first note for this task.</div>';return;}
  var html='';
  comments.forEach(function(c){
    html+='<div class="taskComment" data-comment-id="'+esc(c.id)+'">'
      +'<div class="taskCommentText">'+esc(c.text)+'</div>'
      +'<div class="taskCommentMeta">'+esc(taskCommentTime(c.updatedAt||c.createdAt))+(c.updatedAt&&c.updatedAt!==c.createdAt?' · edited':'')+'</div>'
      +'<div class="taskCommentActions">'
      +'<button class="sbtn" data-comment-edit="'+esc(c.id)+'">Edit</button>'
      +'<button class="sbtn" data-comment-rephrase="'+esc(c.id)+'">✨ Rephrase</button>'
      +'<button class="sbtn" data-comment-delete="'+esc(c.id)+'">Delete</button>'
      +'</div></div>';
  });
  list.innerHTML=html;
}
function addTaskComment(){
  if(!taskEd||!taskEd._edit){toastN('Save the task first, then add comments.');return;}
  var input=$('taskCommentInput'),text=input?input.value.trim():'';if(!text)return;
  taskEd.comments=taskEd.comments||[];var now=Date.now();taskEd.comments.push({id:'c'+now.toString(36)+Math.random().toString(36).slice(2,6),text:text.slice(0,1000),createdAt:now,updatedAt:now});
  var live=state.tasks.find(function(x){return x.id===taskEd._edit;});if(live){live.comments=JSON.parse(JSON.stringify(taskEd.comments));live.updatedAt=now;persist();}
  input.value='';renderTaskComments();renderTasks();toastN('Comment added');
}
function editTaskComment(id){
  var list=$('taskCommentList'),c=(taskEd&&taskEd.comments||[]).find(function(x){return x.id===id;});if(!list||!c)return;
  var el=list.querySelector('[data-comment-id="'+id+'"]');if(!el)return;
  el.innerHTML='<textarea class="inp taskCommentEdit" data-comment-edit-input>'+esc(c.text)+'</textarea><div class="taskCommentActions"><button class="primary" data-comment-save="'+esc(id)+'">Save</button><button class="sbtn" data-comment-cancel="'+esc(id)+'">Cancel</button></div>';
}
function saveTaskCommentEdit(id){
  var el=$('taskCommentList').querySelector('[data-comment-id="'+id+'"]'),c=(taskEd&&taskEd.comments||[]).find(function(x){return x.id===id;});if(!el||!c)return;var input=el.querySelector('[data-comment-edit-input]'),text=input?input.value.trim():'';if(!text){toastN('Comment cannot be empty');return;}c.text=text.slice(0,1000);c.updatedAt=Date.now();var live=state.tasks.find(function(x){return x.id===taskEd._edit;});if(live){live.comments=JSON.parse(JSON.stringify(taskEd.comments));live.updatedAt=c.updatedAt;persist();}renderTaskComments();renderTasks();toastN('Comment updated');
}
function deleteTaskComment(id){if(!taskEd)return;var ix=(taskEd.comments||[]).findIndex(function(x){return x.id===id;});if(ix<0)return;if(!confirm('Delete this comment?'))return;taskEd.comments.splice(ix,1);var live=state.tasks.find(function(x){return x.id===taskEd._edit;});if(live){live.comments=JSON.parse(JSON.stringify(taskEd.comments));live.updatedAt=Date.now();persist();}renderTaskComments();renderTasks();toastN('Comment deleted');}
function rephraseTaskComment(id){
  var c=(taskEd&&taskEd.comments||[]).find(function(x){return x.id===id;});if(!c)return;
  if(!getAiKey()){toastN('Add your AI key in Settings → AI first');return;}
  var el=$('taskCommentList').querySelector('[data-comment-id="'+id+'"]');if(!el)return;
  var preview=el.querySelector('[data-comment-preview]');if(preview){preview.textContent='Rephrasing…';}else{preview=document.createElement('div');preview.className='taskCommentPreview';preview.setAttribute('data-comment-preview','');preview.textContent='Rephrasing…';el.appendChild(preview);}
  var prompt='Rephrase the following task comment so it is clear, professional, concise, and natural. Preserve the exact meaning. Return only the rewritten comment, with no quotation marks or explanation.\n\nTask: '+String(taskEd.title||'')+'\nComment: '+c.text;
  gemCall(prompt,180).then(function(out){var txt=String(out||'').replace(/```[\s\S]*?```/g,'').trim();if(!txt)throw new Error('Empty AI response');preview.innerHTML=esc(txt)+'<div class="taskCommentActions"><button class="primary" data-comment-use-rephrase="'+esc(id)+'">Use this</button><button class="sbtn" data-comment-cancel-rephrase="'+esc(id)+'">Keep original</button></div>';preview.setAttribute('data-rephrase-text',txt);}).catch(function(e){preview.textContent='Could not rephrase: '+e.message;});
}
function useTaskCommentRephrase(id){var el=$('taskCommentList').querySelector('[data-comment-id="'+id+'"]'),c=(taskEd&&taskEd.comments||[]).find(function(x){return x.id===id;});if(!el||!c)return;var p=el.querySelector('[data-comment-preview]'),txt=p?p.getAttribute('data-rephrase-text')||'':'';if(!txt)return;c.text=txt.slice(0,1000);c.updatedAt=Date.now();var live=state.tasks.find(function(x){return x.id===taskEd._edit;});if(live){live.comments=JSON.parse(JSON.stringify(taskEd.comments));live.updatedAt=c.updatedAt;persist();}renderTaskComments();renderTasks();toastN('Comment rephrased');}
function openTask(id){var src=id?state.tasks.find(function(t){return t.id===id;}):null;if(id&&String(id).indexOf('habit:')===0){var hp=String(id).split(':')[1],hh=findHabit(hp);if(hh){showTab('pgToday');openDetail(hh.id);return;}}taskEd=src?JSON.parse(JSON.stringify(src)):normTask({title:'',description:'',dueDate:today(),dueTime:'',priority:'medium',reminders:[],recurrence:{freq:'none',interval:1,endDate:''},subtasks:[],comments:[],status:'open',createdAt:Date.now(),updatedAt:Date.now()});taskEd.comments=Array.isArray(taskEd.comments)?taskEd.comments:[];taskEd._edit=id||'';$('taskSheetTitle').textContent=id?'Edit task':'Add task';$('taskSave').textContent=id?'Save changes':'Add task';$('taskDelete').style.display=id?'':'none';$('taskStatusLbl').style.display=id?'':'none';$('taskStatusRow').style.display=id?'':'none';syncTaskForm();renderTaskComments();openSheet('taskSheet');}
function syncTaskForm(){var t=taskEd||normTask({});$('taskTitleIn').value=t.title==='Task'?'':t.title;$('taskDescIn').value=t.description||'';$('taskDueDateIn').value=t.dueDate||today();$('taskDueTimeIn').value=t.dueTime||'';selChip('taskPriorityRow','data-tp',t.priority||'medium');var rv=t.reminders&&t.reminders.length===2?'both':t.reminders&&t.reminders.length===1?String(t.reminders[0]):'none';selChip('taskReminderRow','data-tr',rv);var rf=t.recurrence&&t.recurrence.freq||'none';selChip('taskRecRow','data-trec',rf);$('taskRecInterval').value=t.recurrence&&t.recurrence.interval||2;$('taskRecEndDate').value=t.recurrence&&t.recurrence.endDate||'';$('taskRecCustom').classList.toggle('on',rf==='custom');$('taskRecEnd').classList.toggle('on',rf!=='none');if(t._edit){selChip('taskStatusRow','data-ts',t.status||'open');}renderTaskSubEditor();}
function renderTaskSubEditor(){var box=$('taskSubList'),a=(taskEd&&taskEd.subtasks)||[];box.innerHTML=a.map(function(s,i){return '<div class="taskSubItem"><button class="subChk '+(s.done?'on':'')+'" data-sub-toggle="'+i+'">'+(s.done?'✓':'')+'</button><span class="subText '+(s.done?'done':'')+'">'+esc(s.title)+'</span><button class="subDel" data-sub-del="'+i+'">×</button></div>';}).join('');}
function addTaskSub(){var v=$('taskSubInput').value.trim();if(!v)return;if(!taskEd.subtasks)taskEd.subtasks=[];taskEd.subtasks.push({id:'s'+Math.random().toString(36).slice(2,8),title:v,done:false});$('taskSubInput').value='';renderTaskSubEditor();$('taskSubInput').focus();}
function saveTask(){var title=$('taskTitleIn').value.trim();if(!title){$('taskTitleIn').focus();return;}var d=$('taskDueDateIn').value||'';var tm=$('taskDueTimeIn').value||'';var rf=taskEd.recurrence.freq||'none';if(d&&d<today()&&!taskEd._edit){/* past tasks are allowed and immediately show overdue */}if(rf!=='none'&&(!d)){toastN('Recurring tasks need a due date');return;}if(rf==='custom')taskEd.recurrence.interval=Math.max(1,Math.min(365,+$('taskRecInterval').value||1));else taskEd.recurrence.interval=1;taskEd.recurrence.endDate=rf==='none'?'':$('taskRecEndDate').value||'';if(taskEd.recurrence.endDate&&d&&taskEd.recurrence.endDate<d){toastN('Recurrence end date must be after the due date');return;}taskEd.title=title;taskEd.description=$('taskDescIn').value.trim();taskEd.dueDate=d;taskEd.dueTime=tm;taskEd.updatedAt=Date.now();taskEd.reminders=(taskEd.reminders||[]).slice();if(taskEd._edit){var old=state.tasks.find(function(x){return x.id===taskEd._edit;});if(old){var wasCompleted=old.status==='completed';taskEd.id=old.id;taskEd.createdAt=old.createdAt;taskEd.seriesId=old.seriesId;taskEd.occurrenceKey=old.occurrenceKey;var ix=state.tasks.indexOf(old);delete taskEd._edit;state.tasks[ix]=normTask(taskEd);if(!wasCompleted&&state.tasks[ix].status==='completed'){state.tasks[ix].completedAt=Date.now();taskCreateNextOccurrence(state.tasks[ix]);}}}else{delete taskEd._edit;taskEd.id='k'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);taskEd.createdAt=Date.now();taskEd.updatedAt=taskEd.createdAt;if(taskEd.recurrence.freq!=='none')taskEd.seriesId=taskEd.id;state.tasks.push(normTask(taskEd));}persist();closeSheet();showTab('pgTasks');taskReminderPermissionNotice(state.tasks.find(function(x){return x.id===taskEd.id;}));toastN('Task saved');}
function taskReminderPermissionNotice(t){if(!t||!t.reminders||!t.reminders.length)return;if(nat){try{if(!nat.notifGranted())toastN('Task saved. Enable Notifications in Settings for reminders.');}catch(e){}}else if(webNotifSupported()&&Notification.permission!=='granted')toastN('Task saved. Enable browser notifications in Settings for reminders.');}
function deleteTask(){if(!taskEd||!taskEd._edit)return;var t=state.tasks.find(function(x){return x.id===taskEd._edit;});if(!t)return;if(!confirm('Delete “'+t.title+'”?'))return;state.tasks=state.tasks.filter(function(x){return x.id!==t.id;});persist();closeSheet();renderTasks();toastN('Task deleted');}
function toggleTaskComplete(id){var t=state.tasks.find(function(x){return x.id===id;});if(!t)return;var was=t.status==='completed';if(was){t.status='open';t.completedAt=0;t.updatedAt=Date.now();}else{t.status='completed';t.completedAt=Date.now();t.updatedAt=t.completedAt;var nx=taskCreateNextOccurrence(t);if(nx)toastN('Completed · next '+taskDateLabel(nx));}persist();renderTasks();}
function toggleHabitTask(id){var p=String(id).split(':');if(p.length<3)return;var h=findHabit(p[1]),ds=p[2];if(!h)return;if(isDone(h,ds))setVal(h.id,ds,0);else if(dueOn(h,toDate(ds)))setVal(h.id,ds,targ(h));renderTasks();}
function taskFilterMatch(t){var st=taskEffectiveStatus(t);if(taskFilter==='overdue')return st==='overdue';if(taskFilter==='today')return t.dueDate===today()&&st!=='completed';if(taskFilter==='upcoming')return !!t.dueDate&&t.dueDate>today()&&st!=='completed';if(taskFilter==='completed')return st==='completed';return true;}
function renderTaskCard(t){var st=taskEffectiveStatus(t),sp=taskSubProgress(t),over=st==='overdue',virtual=!!t.virtualHabit;var check=st==='completed'||(virtual&&t.linkedHabitId&&isDone(findHabit(t.linkedHabitId),t.linkedHabitOccurrenceDate));var clickAttr=virtual?'data-habit-task="'+esc(t.id)+'"':'data-task-check="'+esc(t.id)+'"';return '<div class="taskCard '+(over?'overdue':'')+'" data-task-id="'+esc(t.id)+'"><div class="taskTop"><button class="taskCheck '+(check?'done':'')+'" '+clickAttr+' aria-label="Complete task">'+(check?'✓':'')+'</button><div class="taskBody"><div class="taskTitle '+(check?'done':'')+'">'+(t.priority==='high'?'🔴 ':'')+esc(t.title)+'</div>'+(t.description?'<div class="taskDesc">'+esc(t.description)+'</div>':'')+'<div class="taskMeta"><span class="taskPri '+t.priority+'">'+t.priority.toUpperCase()+'</span><span class="taskStatus">'+(st==='inprogress'?'In Progress':st.charAt(0).toUpperCase()+st.slice(1))+'</span><span>'+esc(taskDateLabel(t))+'</span>'+(t.recurrence&&t.recurrence.freq!=='none'?'<span class="taskSeries">↻ '+t.recurrence.freq+'</span>':'')+(virtual?'<span class="taskSeries">Habit</span>':'')+'</div>'+(sp.total?'<div class="taskSubProgress">'+sp.done+' / '+sp.total+' subtasks<div class="taskSubBar"><i style="width:'+Math.round(sp.done/sp.total*100)+'%"></i></div></div>':'')+((t.comments&&t.comments.length)?'<div class="taskMeta"><span>💬 '+t.comments.length+' comment'+(t.comments.length===1?'':'s')+'</span></div>':'')+'</div></div></div>';}
function renderTasks(){var box=$('taskList');if(!box)return;var all=taskAllVisible().filter(function(t){return taskFilterMatch(t)&&taskMatches(t,taskSearchQ);});all.sort(function(a,b){var sa=taskEffectiveStatus(a),sb=taskEffectiveStatus(b);var rank=function(x){return x==='overdue'?0:x==='open'||x==='inprogress'?1:2;};var ra=rank(sa),rb=rank(sb);if(ra!==rb)return ra-rb;var da=taskDueMs(a),db=taskDueMs(b);if(da!==db)return da-db;return String(a.title).localeCompare(String(b.title));});var sections=[];var groups={overdue:[],today:[],upcoming:[],completed:[],other:[]};all.forEach(function(t){var st=taskEffectiveStatus(t);if(st==='overdue')groups.overdue.push(t);else if(st==='completed')groups.completed.push(t);else if(t.dueDate===today())groups.today.push(t);else if(t.dueDate&&t.dueDate>today())groups.upcoming.push(t);else groups.other.push(t);});[['overdue','OVERDUE'],['today','TODAY'],['upcoming','UPCOMING'],['other','NO DUE DATE'],['completed','COMPLETED']].forEach(function(pair){var a=groups[pair[0]];if(!a.length)return;var extra='';if(pair[0]==='completed'&&!taskShowAllDone&&a.length>30){extra='<button class="sbtn" data-task-showdone style="width:100%;margin:6px 0 2px">Show all completed ('+a.length+')</button>';a=a.slice(0,30);}sections.push('<div class="taskSectionTitle">'+pair[1]+'</div>'+a.map(renderTaskCard).join('')+extra);});box.innerHTML=sections.join('');$('taskEmpty').hidden=all.length>0;var s=taskAllVisible(),over=s.filter(function(t){return taskEffectiveStatus(t)==='overdue';}).length,tn=s.filter(function(t){return t.dueDate===today()&&taskEffectiveStatus(t)!=='completed';}).length,up=s.filter(function(t){return t.dueDate&&t.dueDate>today()&&taskEffectiveStatus(t)!=='completed';}).length,done=state.tasks.filter(function(t){return t.status==='completed';}).length;$('taskSummary').innerHTML='<div class="taskStat over"><b>'+over+'</b><span>Overdue</span></div><div class="taskStat today"><b>'+tn+'</b><span>Today</span></div><div class="taskStat up"><b>'+up+'</b><span>Upcoming</span></div><div class="taskStat done"><b>'+done+'</b><span>Completed</span></div>';}
function exportTaskRows(from,to){var rows=[['Task','Description','Due date','Due time','Priority','Status','Subtasks','Comments']];state.tasks.filter(function(t){return t.dueDate&&t.dueDate>=from&&t.dueDate<=to;}).sort(function(a,b){return taskDueMs(a)-taskDueMs(b);}).forEach(function(t){var sp=taskSubProgress(t);rows.push([t.title,t.description,t.dueDate,t.dueTime||'',t.priority.toUpperCase(),taskEffectiveStatus(t),sp.done+'/'+sp.total]);});return rows;}
function taskExportBounds(){if(taskExportMode==='custom')return{from:$('taskExportFrom').value,to:$('taskExportTo').value};return taskRangeBounds(taskExportMode);}
function taskPdfSafe(v){return String(v==null?'':v).replace(/[^\x20-\x7E]/g,'?').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}
function taskPdfWrap(text,max){text=String(text||'');if(!text)return [''];var words=text.split(/\s+/),out=[],line='';for(var i=0;i<words.length;i++){var w=words[i];if(!line){line=w;continue;}if((line+' '+w).length<=max)line+=' '+w;else{out.push(line);line=w;}}if(line)out.push(line);return out.length?out:[''];}
function exportTasks(kind){
  var b=taskExportBounds();if(!b.from||!b.to||b.from>b.to){toastN('Select a valid date range');return;}
  var tasks=state.tasks.filter(function(t){return t.dueDate&&t.dueDate>=b.from&&t.dueDate<=b.to;}).sort(function(a,b){return taskDueMs(a)-taskDueMs(b);});
  if(kind==='xlsx'){
    if(typeof XLSX==='undefined'){ensureXlsx(function(){exportTasks('xlsx');});return;}
    var rows=[['Task','Description','Due date','Due time','Priority','Status','Subtasks','Comments']];
    tasks.forEach(function(t){var sp=taskSubProgress(t);rows.push([t.title,t.description,t.dueDate,t.dueTime||'',t.priority.toUpperCase(),taskEffectiveStatus(t),sp.done+'/'+sp.total,(t.comments||[]).map(function(c){return c.text;}).join(' || ')]);});
    var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Tasks');var out=XLSX.write(wb,{bookType:'xlsx',type:'base64'}),name='tasks-'+b.from+'-to-'+b.to+'.xlsx';if(nat&&nat.saveFile){try{nat.saveFile(name,XMIME,out);toastN('Tasks Excel saved');return;}catch(e){}}if(webSave(name,XMIME,out))toastN('Downloading Excel…');else toastN('Export failed');return;
  }
  var pdf=makeTaskPdf(tasks,'Task Report',b.from,b.to),name='tasks-'+b.from+'-to-'+b.to+'.pdf';if(nat&&nat.saveFile){try{nat.saveFile(name,'application/pdf',pdf);toastN('Task PDF saved');return;}catch(e){}}if(webSave(name,'application/pdf',pdf))toastN('Downloading PDF…');else toastN('PDF export failed');
}
function makeTaskPdf(tasks,title,from,to){
  var pageW=595,pageH=842,margin=42,contentTop=780,bottom=48,lineH=14,pages=[],cur=[],y=contentTop;
  function newPage(){if(cur.length)pages.push(cur);cur=[];y=contentTop;}
  function need(h){if(y-h<bottom)newPage();}
  function text(txt,size,bold,indent,color){var lines=taskPdfWrap(txt,Math.max(35,Math.floor((pageW-margin*2-indent)/Math.max(4.5,size*.48))));for(var i=0;i<lines.length;i++){need(lineH);cur.push({type:'text',x:margin+indent,y:y,text:lines[i],size:size,bold:!!bold,color:color||[0.12,0.12,0.12]});y-=lineH;}}
  function rule(){need(8);cur.push({type:'line',x1:margin,x2:pageW-margin,y:y+5});y-=9;}
  function gap(n){y-=n;}
  var overdue=tasks.filter(function(t){return taskEffectiveStatus(t)==='overdue';}).length,todayN=tasks.filter(function(t){return t.dueDate===today()&&taskEffectiveStatus(t)!=='completed';}).length,up=tasks.filter(function(t){return t.dueDate>today()&&taskEffectiveStatus(t)!=='completed';}).length,done=tasks.filter(function(t){return taskEffectiveStatus(t)==='completed';}).length;
  text(title,20,true,0,[0.08,0.10,0.14]);text(niceDate(from)+' to '+niceDate(to),9,false,0,[0.38,0.40,0.44]);gap(5);rule();
  text('SUMMARY',10,true,0,[0.12,0.38,0.65]);text('Overdue: '+overdue+'   Due today: '+todayN+'   Upcoming: '+up+'   Completed: '+done,9,false,0,[0.25,0.25,0.28]);gap(7);rule();
  if(!tasks.length)text('No tasks found for this date range.',11,false,0,[0.35,0.35,0.38]);
  tasks.forEach(function(t,idx){
    need(70);var priority=t.priority.toUpperCase();var pColor=t.priority==='high'?[0.78,0.16,0.13]:t.priority==='medium'?[0.86,0.48,0.08]:[0.10,0.42,0.70];
    text((idx+1)+'. '+t.title,13,true,0,[0.08,0.10,0.14]);
    text(priority+'  |  '+(taskEffectiveStatus(t)==='inprogress'?'In Progress':taskEffectiveStatus(t).charAt(0).toUpperCase()+taskEffectiveStatus(t).slice(1))+'  |  Due: '+(t.dueDate?niceDate(t.dueDate):'No due date')+(t.dueTime?' at '+timeFmt(t.dueTime):''),9,true,8,pColor);
    if(t.description){text('Description: '+t.description,9,false,8,[0.25,0.25,0.28]);}
    var sp=taskSubProgress(t);if(sp.total){text('Subtasks: '+sp.done+'/'+sp.total+' completed',9,true,8,[0.25,0.25,0.28]);(t.subtasks||[]).forEach(function(st){text((st.done?'[x] ':'[ ] ')+st.title,8.5,false,16,[0.30,0.30,0.32]);});}
    if(t.comments&&t.comments.length){text('Comments ('+t.comments.length+')',9,true,8,[0.12,0.38,0.65]);t.comments.forEach(function(c){text('• '+c.text,8.5,false,16,[0.30,0.30,0.32]);});}
    gap(5);rule();
  });
  if(cur.length)pages.push(cur);
  var objs=[];function add(o){objs.push(o);return objs.length;}var font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),fontB=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');var pageIds=[];
  pages.forEach(function(items,pi){var c='';items.forEach(function(it){if(it.type==='line'){c+='0.82 0.82 0.82 RG 0.7 w '+it.x1+' '+it.y+' m '+it.x2+' '+it.y+' l S\n';return;}var col=it.color||[0.12,0.12,0.12];c+=col[0]+' '+col[1]+' '+col[2]+' rg BT /'+(it.bold?'F2':'F1')+' '+it.size+' Tf '+it.x+' '+it.y+' Td ('+taskPdfSafe(it.text)+') Tj ET\n';});c+='BT /F1 8 Tf 42 26 Td (Page '+(pi+1)+' of '+pages.length+') Tj ET\n';var cid=add('<< /Length '+c.length+' >>\nstream\n'+c+'endstream');var pid=add('<< /Type /Page /Parent PARENT /MediaBox [0 0 '+pageW+' '+pageH+'] /Resources << /Font << /F1 '+font+' 0 R /F2 '+fontB+' 0 R >> >> /Contents '+cid+' 0 R >>');pageIds.push(pid);});
  if(!pageIds.length){var cid=add('<< /Length 0 >>\nstream\nendstream');pageIds.push(add('<< /Type /Page /Parent PARENT /MediaBox [0 0 '+pageW+' '+pageH+'] /Resources << /Font << /F1 '+font+' 0 R /F2 '+fontB+' 0 R >> >> /Contents '+cid+' 0 R >>'));}
  var kids=pageIds.map(function(id){return id+' 0 R';}).join(' '),parent=add('<< /Type /Pages /Kids ['+kids+'] /Count '+pageIds.length+' >>');for(var i=0;i<pageIds.length;i++)objs[pageIds[i]-1]=objs[pageIds[i]-1].replace('PARENT',parent+' 0 R');var catalog=add('<< /Type /Catalog /Pages '+parent+' 0 R >>');var pdf='%PDF-1.4\n',offs=[0];for(var oi=0;oi<objs.length;oi++){offs.push(pdf.length);pdf+=(oi+1)+' 0 obj\n'+objs[oi]+'\nendobj\n';}var xref=pdf.length;pdf+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n';for(var oj=1;oj<=objs.length;oj++)pdf+=String(offs[oj]).padStart(10,'0')+' 00000 n \n';pdf+='trailer\n<< /Size '+(objs.length+1)+' /Root '+catalog+' 0 R >>\nstartxref\n'+xref+'\n%%EOF';var bytes=new TextEncoder().encode(pdf),bin='';for(var bi=0;bi<bytes.length;bi++)bin+=String.fromCharCode(bytes[bi]);return btoa(bin);
}


/* ================= init & wiring ================= */
function init(){
  buildPickers();

  var navDownX=0,navDownY=0,navMoved=false;
  $('tabbar').addEventListener('pointerdown',function(e){navDownX=e.clientX;navDownY=e.clientY;navMoved=false;},{passive:true});
  $('tabbar').addEventListener('pointermove',function(e){if(Math.abs(e.clientX-navDownX)>10||Math.abs(e.clientY-navDownY)>10)navMoved=true;},{passive:true});
  $('tabbar').addEventListener('click', function(e){
    if(navMoved){navMoved=false;return;}
    var b = climb(e.target, this, 'data-tab');
    if(b) showTab(b.getAttribute('data-tab'));
  });
  $('fab').addEventListener('click', function(){
    if($('pgExp').classList.contains('on')) openExp(null); else if($('pgTasks').classList.contains('on')) openTask(null); else openAddActionSheet();
  });

  $('actionSheet').addEventListener('click', function(e){
    var b=climb(e.target,this,'data-add-action');
    if(b) handleAddAction(b.getAttribute('data-add-action'));
  });
  $('scrim').addEventListener('click', function(){ closeSheet(); });

  $('taskAddTop').addEventListener('click',function(){openTask(null);});
  $('taskEmptyCta').addEventListener('click',function(){openTask(null);});
  var taskSrchT=null;$('taskSearch').addEventListener('input',function(){taskSearchQ=this.value;if(taskSrchT)clearTimeout(taskSrchT);taskSrchT=setTimeout(function(){taskSrchT=null;renderTasks();},180);});
  $('taskFilters').addEventListener('click',function(e){var b=climb(e.target,this,'data-tf');if(!b)return;taskFilter=b.getAttribute('data-tf');selChip('taskFilters','data-tf',taskFilter);renderTasks();});
  $('taskList').addEventListener('click',function(e){var sd=climb(e.target,this,'data-task-showdone');if(sd){taskShowAllDone=true;renderTasks();return;}var cb=climb(e.target,this,'data-task-check');if(cb){toggleTaskComplete(cb.getAttribute('data-task-check'));return;}var hb=climb(e.target,this,'data-habit-task');if(hb){toggleHabitTask(hb.getAttribute('data-habit-task'));return;}var b=climb(e.target,this,'data-task-id');if(b)openTask(b.getAttribute('data-task-id'));});
  $('taskExportRange').addEventListener('click',function(e){var b=climb(e.target,this,'data-ter');if(!b)return;taskExportMode=b.getAttribute('data-ter');selChip('taskExportRange','data-ter',taskExportMode);$('taskExportCustom').style.display=taskExportMode==='custom'?'':'none';});
  $('taskExportXlsx').addEventListener('click',function(){exportTasks('xlsx');});
  $('taskExportPdf').addEventListener('click',function(){exportTasks('pdf');});
  $('taskDashSummary').addEventListener('click',function(e){if(e.target&&e.target.id==='taskDashView')showTab('pgTasks');});

  $('taskPriorityRow').addEventListener('click',function(e){var b=climb(e.target,this,'data-tp');if(!b)return;taskEd.priority=b.getAttribute('data-tp');selChip('taskPriorityRow','data-tp',taskEd.priority);});
  $('taskReminderRow').addEventListener('click',function(e){var b=climb(e.target,this,'data-tr');if(!b)return;var v=b.getAttribute('data-tr');taskEd.reminders=v==='none'?[]:v==='both'?[1,2]:[+v];selChip('taskReminderRow','data-tr',v);});
  $('taskRecRow').addEventListener('click',function(e){var b=climb(e.target,this,'data-trec');if(!b)return;taskEd.recurrence.freq=b.getAttribute('data-trec');selChip('taskRecRow','data-trec',taskEd.recurrence.freq);$('taskRecCustom').classList.toggle('on',taskEd.recurrence.freq==='custom');$('taskRecEnd').classList.toggle('on',taskEd.recurrence.freq!=='none');});
  $('taskStatusRow').addEventListener('click',function(e){var b=climb(e.target,this,'data-ts');if(!b)return;taskEd.status=b.getAttribute('data-ts');selChip('taskStatusRow','data-ts',taskEd.status);});
  $('taskSubAdd').addEventListener('click',addTaskSub);
  $('taskSubInput').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();addTaskSub();}});
  $('taskSubList').addEventListener('click',function(e){var b=climb(e.target,this,'data-sub-del');if(b){taskEd.subtasks.splice(+b.getAttribute('data-sub-del'),1);renderTaskSubEditor();return;}var c=climb(e.target,this,'data-sub-toggle');if(c){taskEd.subtasks[+c.getAttribute('data-sub-toggle')].done=!taskEd.subtasks[+c.getAttribute('data-sub-toggle')].done;renderTaskSubEditor();}});
  $('taskCommentAdd').addEventListener('click',addTaskComment);
  $('taskCommentInput').addEventListener('keydown',function(e){if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();addTaskComment();}});
  $('taskCommentList').addEventListener('click',function(e){
    var b=climb(e.target,this,'data-comment-edit');if(b){editTaskComment(b.getAttribute('data-comment-edit'));return;}
    b=climb(e.target,this,'data-comment-save');if(b){saveTaskCommentEdit(b.getAttribute('data-comment-save'));return;}
    b=climb(e.target,this,'data-comment-cancel');if(b){renderTaskComments();return;}
    b=climb(e.target,this,'data-comment-delete');if(b){deleteTaskComment(b.getAttribute('data-comment-delete'));return;}
    b=climb(e.target,this,'data-comment-rephrase');if(b){rephraseTaskComment(b.getAttribute('data-comment-rephrase'));return;}
    b=climb(e.target,this,'data-comment-use-rephrase');if(b){useTaskCommentRephrase(b.getAttribute('data-comment-use-rephrase'));return;}
    b=climb(e.target,this,'data-comment-cancel-rephrase');if(b){renderTaskComments();return;}
  });
  $('taskCancel').addEventListener('click',function(){closeSheet();});
  $('taskSave').addEventListener('click',saveTask);
  $('taskDelete').addEventListener('click',deleteTask);

  /* search & category filter */
  $('srchBtn').addEventListener('click', function(){
    var w = $('srchWrap'), on = !w.classList.contains('on');
    w.classList.toggle('on', on);
    this.classList.toggle('on', on);
    if(on){ setTimeout(function(){ $('srch').focus(); }, 80); }
    else {
      srchQ = ''; srchCat = 'all';
      $('srch').value = '';
      selChip('catFil','data-cf','all');
      renderToday();
    }
  });
  var srchT=null;
  $('srch').addEventListener('input', function(){
    srchQ = this.value.toLowerCase().replace(/^\s+/,'');
    if(srchT)clearTimeout(srchT);
    srchT=setTimeout(function(){srchT=null;renderToday();},180);
  });
  $('catFil').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-cf'); if(!b) return;
    srchCat = b.getAttribute('data-cf');
    selChip('catFil','data-cf',srchCat);
    renderToday();
  });

  $('pgToday').addEventListener('click', function(e){
    // Home focus/close controls are dynamic; handle them from the stable page container.
    var focusOpen = climb(e.target, this, 'data-fopen');
    if(focusOpen){ if(focusId) openDetail(focusId); return; }
    if(e.target && e.target.id === 'fBtn'){ focusTap(); return; }
    if(e.target && e.target.id === 'ccBtn'){
      var t = today(), due = [];
      for(var i=0;i<state.habits.length;i++){
        var h = state.habits[i];
        if(!h.arch && dueOn(h, new Date())) due.push(h);
      }
      var doneN = 0;
      for(var j=0;j<due.length;j++) if(isDone(due[j], t)) doneN++;
      state.closed[t] = {score:dayScore(due, doneN),due:due.map(function(h){return h.id;}),done:doneN,closedAt:Date.now()};
      persist(); renderToday(); toastN('Day closed · '+(typeof state.closed[t]==='object'?state.closed[t].score:state.closed[t])+'%'); return;
    }
    var actEl = climb(e.target, this, 'data-act');
    var act = actEl ? actEl.getAttribute('data-act') : null;
    if(act === 'vacEnd'){ state.set.vacFrom=''; state.set.vacUntil=''; persist(); renderToday(); renderSet(); toastN('Welcome back \uD83D\uDC4B'); return; }
    if(act === 'recover'){ applyRecover(actEl.getAttribute('data-id')); return; }
    if(act === 'stk'){ tapMain(actEl.getAttribute('data-id')); return; }
    var idEl = climb(e.target, this, 'data-id');
    if(!idEl) return;
    var id = idEl.getAttribute('data-id');
    if(act === 'chk'){ tapMain(id); return; }
    if(act === 'day'){ toggleDay(id, actEl.getAttribute('data-date')); return; }
    openDetail(id);
  });

  /* add/edit: chips */
  $('typeRow').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-ty'); if(!b) return;
    ed.type = b.getAttribute('data-ty'); selChip('typeRow','data-ty',ed.type); refreshTypeRows();
  });
  $('catRow').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-cat'); if(!b) return;
    ed.cat = b.getAttribute('data-cat'); selChip('catRow','data-cat',ed.cat);
  });
  $('secRow').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-sec'); if(!b) return;
    ed.section = b.getAttribute('data-sec'); selChip('secRow','data-sec',ed.section);
  });
  $('schRow').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-sk'); if(!b) return;
    ed.sched.kind = b.getAttribute('data-sk'); selChip('schRow','data-sk',ed.sched.kind); refreshSchedRows();
  });
  $('dowRow').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-dw'); if(!b) return;
    var v = +b.getAttribute('data-dw'), ix = ed.sched.dows.indexOf(v);
    if(ix >= 0){ if(ed.sched.dows.length > 1) ed.sched.dows.splice(ix,1); }
    else ed.sched.dows.push(v);
    refreshSchedRows();
  });

  /* add/edit: EMOJI + COLOR pickers (bug fix — these were never wired) */
  $('egrid').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-e'); if(!b) return;
    ed.emoji = b.getAttribute('data-e');
    selGrid('egrid','data-e',ed.emoji);
    buzz(8);
  });
  $('cgrid').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-c'); if(!b) return;
    ed.color = b.getAttribute('data-c');
    selGrid('cgrid','data-c',ed.color);
    buzz(8);
  });

  /* add/edit: reminders via native time picker */
  $('btnAddTime').addEventListener('click', function(){
    ed.rem.times.push(ed.rem.times.length ? '20:00' : '07:30');
    renderRemList();
    openTimePicker(ed.rem.times.length - 1);
  });
  $('remList').addEventListener('click', function(e){
    var del = climb(e.target, this, 'data-rd');
    if(del){ ed.rem.times.splice(+del.getAttribute('data-rd'), 1); renderRemList(); return; }
    var tb = climb(e.target, this, 'data-ri');
    if(tb) openTimePicker(+tb.getAttribute('data-ri'));
  });

  /* add/edit: dates via native date picker */
  $('btnStart').addEventListener('click', function(){ openDatePicker('start'); });
  $('btnEnd').addEventListener('click', function(){ openDatePicker('end'); });
  $('btnEndClr').addEventListener('click', function(e){ e.stopPropagation(); ed.end=''; refreshDateBtns(); });

  $('saveBtn').addEventListener('click', saveHabit);
  $('swRepeat').addEventListener('click', function(){ this.classList.toggle('on'); });
  $('swMissed').addEventListener('click', function(){ this.classList.toggle('on'); });

  /* theme chips */
  $('thRow').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-th'); if(!b) return;
    state.set.theme = b.getAttribute('data-th');
    selChip('thRow','data-th',state.set.theme);
    applyTheme(); persist();
  });
  $('palRow').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-pal'); if(!b) return;
    state.set.pal = b.getAttribute('data-pal');
    selChip('palRow','data-pal',state.set.pal);
    applyTheme(); persist(); buzz(10);
  });
  $('fontRow').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-font'); if(!b) return;
    state.set.font = b.getAttribute('data-font');
    selChip('fontRow','data-font',state.set.font);
    applyTheme(); persist(); buzz(10);
  });
  $('bioTog').addEventListener('click', function(){
    var on = !this.classList.contains('on');
    if(on && !bioAvailSafe()){ toastN('Biometrics unavailable'); return; }
    this.classList.toggle('on', on);
    state.set.bio = on; persist();
  });
  $('greyTog').addEventListener('click', function(){
    this.classList.toggle('on');
    state.set.grey = this.classList.contains('on');
    applyGrey(); persist();
  });

  /* detail */
  $('mPrev').addEventListener('click', function(){
    detailM--; if(detailM<0){ detailM=11; detailY--; } selMiss=null; renderDetail();
  });
  $('mNext').addEventListener('click', function(){
    detailM++; if(detailM>11){ detailM=0; detailY++; } selMiss=null; renderDetail();
  });
  $('mgrid').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-md'); if(!b) return;
    var ds = b.getAttribute('data-md');
    if(ds > today()) return;
    var h = findHabit(detailId); if(!h) return;
    if(isFroz(h, ds)){ unfreeze(detailId, ds); return; }
    if(isDone(h, ds)){ selMiss=null; toggleDay(detailId, ds); return; }
    if(ds < today() && ds >= h.created && dueOn(h, toDate(ds))){ selMiss = ds; renderDetail(); return; }
    selMiss = null; toggleDay(detailId, ds);
  });
  $('btnFz').addEventListener('click', function(){
    if(selMiss){ var d = selMiss; selMiss = null; applyFreeze(detailId, d); }
  });
  $('btnMk').addEventListener('click', function(){
    if(selMiss){ var d = selMiss; selMiss = null; toggleDay(detailId, d); }
  });
  $('btnEdit').addEventListener('click', function(){
    var id = detailId; closeSheet();
    setTimeout(function(){ openEdit(id); }, 300);
  });
  $('delBtn').addEventListener('click', onDelete);

  /* stack */
  $('btnStack').addEventListener('click', function(){ renderStackSheet(); openSheet('stackSheet'); });
  $('stackList').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-stk'); if(!b) return;
    var id = b.getAttribute('data-stk'), ix = state.stack.indexOf(id);
    if(ix >= 0) state.stack.splice(ix,1); else state.stack.push(id);
    persist(); renderStackSheet();
  });
  $('btnStackClear').addEventListener('click', function(){ state.stack=[]; persist(); renderStackSheet(); });
  $('btnStackDone').addEventListener('click', function(){ closeSheet(); renderToday(); });

  /* settings buttons */
  $('btnNotif').addEventListener('click', function(){ if(nat){ nat.reqNotif(); setTimeout(renderSet, 900); } });
  $('btnExact').addEventListener('click', function(){ if(nat){ nat.reqExact(); } });
  $('btnSound').addEventListener('click', function(){ if(nat){ nat.openChannelSettings(); } else toastN('Available in the app'); });
  $('btnCurrency').addEventListener('click', function(){ if(window.showCurrency) window.showCurrency(); else toastN('Currency settings are loading — try again'); });
  $('btnPin').addEventListener('click', function(){ showLock(state.set.pin ? 'ver' : 'new1'); });
  $('btnPinOff').addEventListener('click', function(){ showLock('off'); });
  $('btnXlsx').addEventListener('click', function(){
    if(typeof XLSX==='undefined'){ ensureXlsx(function(){ $('btnXlsx').click(); }); return; }
    if(!nat){
      toastN(webSave('habits-' + today() + '.xlsx', XMIME, buildXlsx()) ? 'Downloading\u2026' : 'Export failed');
      return;
    }
    try{ var p = nat.saveFile('habits-' + today() + '.xlsx', XMIME, buildXlsx());
      toastN(p ? 'Saved to ' + p : 'Save failed'); }catch(e){ toastN('Export failed'); }
  });
  $('btnXlsxShare').addEventListener('click', function(){
    if(!nat) return;
    if(typeof XLSX==='undefined'){ ensureXlsx(function(){ $('btnXlsxShare').click(); }); return; }
    try{ nat.shareFile('habits-' + today() + '.xlsx', XMIME, buildXlsx()); }catch(e){ toastN('Export failed'); }
  });

  // ---- PDF Monthly Report ----
  $('btnPdfReport').addEventListener('click', function(){
    toastN('Generating report…');
    setTimeout(function(){ generatePdfReport(); }, 100);
  });

  function generatePdfReport(){
    var now = new Date(), y = now.getFullYear(), m = now.getMonth();
    var monthName = now.toLocaleDateString(undefined,{month:'long',year:'numeric'});
    var daysInMonth = new Date(y,m+1,0).getDate();
    var ms = fmt(new Date(y,m,1)), me = fmt(new Date(y,m,daysInMonth));
    var active = state.habits.filter(function(h){return !h.arch;});
    var curr = state.set.curr || '\u20B9';

    // Habit stats
    var habitRows = active.map(function(h){
      var due=0, done=0;
      for(var d=1;d<=daysInMonth;d++){
        var ds=fmt(new Date(y,m,d)); if(ds>today()) break;
        if(dueOn(h,new Date(y,m,d))){due++;if(isDone(h,ds))done++;}
      }
      return {name:h.name, done:done, due:due, pct:due?Math.round(done/due*100):0, streak:streak(h)};
    });

    // Mood stats
    var moodCounts={}, moodTotal=0;
    for(var d2=1;d2<=daysInMonth;d2++){
      var ds2=fmt(new Date(y,m,d2)); if(ds2>today()) break;
      var mi=moodOf(ds2); if(mi>=0){moodTotal++;var ml=MOODS[mi].l;moodCounts[ml]=(moodCounts[ml]||0)+1;}
    }
    var topMood='—'; var topMoodN=0;
    for(var mk in moodCounts) if(moodCounts[mk]>topMoodN){topMoodN=moodCounts[mk];topMood=mk;}

    // Sleep stats
    var sleepMins=[], sleepDays=0;
    for(var d3=1;d3<=daysInMonth;d3++){
      var ds3=fmt(new Date(y,m,d3)); if(ds3>today()) break;
      var sl=sleepOn(ds3); if(sl&&sl.mins>0){sleepMins.push(sl.mins);sleepDays++;}
    }
    var avgSleep=sleepDays?Math.round(sleepMins.reduce(function(a,b){return a+b;},0)/sleepDays):0;

    // Expense stats
    var mExp=0, mInc=0, catSpend={};
    state.tx.forEach(function(t){
      if(t.d>=ms&&t.d<=me){
        if(t.kind==='exp'){mExp+=t.amt||0;var c=t.cat||'Other';catSpend[c]=(catSpend[c]||0)+(t.amt||0);}
        else if(t.kind==='inc') mInc+=t.amt||0;
      }
    });
    var topCats=Object.keys(catSpend).sort(function(a,b){return catSpend[b]-catSpend[a];}).slice(0,5);

    // Build HTML report
    var css='body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:700px;margin:0 auto;padding:32px 24px;color:#222;background:#fff}'
      +'h1{font-size:28px;font-weight:800;margin:0 0 4px;color:#111}'
      +'.sub{font-size:14px;color:#888;margin-bottom:28px}'
      +'.sec{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#999;margin:28px 0 12px;border-bottom:1px solid #eee;padding-bottom:6px}'
      +'table{width:100%;border-collapse:collapse;margin-bottom:8px}'
      +'th{text-align:left;font-size:12px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.5px;padding:6px 8px;border-bottom:2px solid #eee}'
      +'td{padding:8px;border-bottom:1px solid #f0f0f0;font-size:14px}'
      +'.pct{font-weight:700}'
      +'.good{color:#2D8A5E}.avg{color:#C79400}.bad{color:#E85D4A}'
      +'.bar{display:inline-block;height:8px;border-radius:4px;background:#E85D4A;vertical-align:middle;margin-left:8px}'
      +'.stat-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px}'
      +'.stat-box{background:#f8f8f6;border-radius:12px;padding:16px;text-align:center}'
      +'.stat-val{font-size:24px;font-weight:800;color:#111}'
      +'.stat-lbl{font-size:11px;color:#999;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}'
      +'.footer{text-align:center;margin-top:40px;font-size:11px;color:#ccc}'
      +'@media print{body{padding:16px}}';

    var h='<!DOCTYPE html><html><head><meta charset="utf-8"><title>Monthly Report — '+monthName+'</title><style>'+css+'</style></head><body>';
    h+='<h1>Monthly Report</h1><div class="sub">'+monthName+' · Personal Tracker</div>';

    // Overview stats
    var totalDue=0,totalDone=0;
    habitRows.forEach(function(r){totalDue+=r.due;totalDone+=r.done;});
    var overallPct=totalDue?Math.round(totalDone/totalDue*100):0;
    h+='<div class="stat-grid">';
    h+='<div class="stat-box"><div class="stat-val">'+overallPct+'%</div><div class="stat-lbl">Habits</div></div>';
    h+='<div class="stat-box"><div class="stat-val">'+topMood+'</div><div class="stat-lbl">Top mood</div></div>';
    h+='<div class="stat-box"><div class="stat-val">'+(avgSleep?Math.floor(avgSleep/60)+'h'+avgSleep%60+'m':'—')+'</div><div class="stat-lbl">Avg sleep</div></div>';
    h+='</div>';
    h+='<div class="stat-grid">';
    h+='<div class="stat-box"><div class="stat-val">'+inr(mInc)+'</div><div class="stat-lbl">Income</div></div>';
    h+='<div class="stat-box"><div class="stat-val">'+inr(mExp)+'</div><div class="stat-lbl">Spent</div></div>';
    h+='<div class="stat-box"><div class="stat-val '+(mInc-mExp>=0?'good':'bad')+'">'+inr(mInc-mExp)+'</div><div class="stat-lbl">Net</div></div>';
    h+='</div>';

    // Habits table
    if(habitRows.length){
      h+='<div class="sec">Habits</div><table><tr><th>Habit</th><th>Done</th><th>Rate</th><th>Streak</th></tr>';
      habitRows.forEach(function(r){
        var cls=r.pct>=80?'good':r.pct>=50?'avg':'bad';
        h+='<tr><td><b>'+r.name+'</b></td><td>'+r.done+'/'+r.due+'</td><td class="pct '+cls+'">'+r.pct+'%<span class="bar" style="width:'+Math.max(2,r.pct*.6)+'px;background:'+(r.pct>=80?'#2D8A5E':r.pct>=50?'#C79400':'#E85D4A')+'"></span></td><td>'+r.streak+'d</td></tr>';
      });
      h+='</table>';
    }

    // Mood breakdown
    if(moodTotal>0){
      h+='<div class="sec">Mood</div><table><tr><th>Mood</th><th>Days</th><th>%</th></tr>';
      for(var mk2 in moodCounts){
        h+='<tr><td>'+mk2+'</td><td>'+moodCounts[mk2]+'</td><td>'+Math.round(moodCounts[mk2]/moodTotal*100)+'%</td></tr>';
      }
      h+='</table>';
    }

    // Sleep
    if(sleepDays>0){
      h+='<div class="sec">Sleep</div>';
      h+='<p>Average: <b>'+Math.floor(avgSleep/60)+'h '+avgSleep%60+'m</b> across '+sleepDays+' nights logged.</p>';
      var under6=sleepMins.filter(function(m){return m<360;}).length;
      var over7=sleepMins.filter(function(m){return m>=420;}).length;
      h+='<p>Nights 7h+: <b class="good">'+over7+'</b> · Under 6h: <b class="bad">'+under6+'</b></p>';
    }

    // Spending by category
    if(topCats.length){
      h+='<div class="sec">Top Spending</div><table><tr><th>Category</th><th>Amount</th><th>% of total</th></tr>';
      topCats.forEach(function(c){
        h+='<tr><td>'+c+'</td><td>'+inr(catSpend[c])+'</td><td>'+Math.round(catSpend[c]/mExp*100)+'%</td></tr>';
      });
      h+='</table>';
    }

    h+='<div class="footer">Generated by Personal Tracker · Developed by Vishal · For personal use only<br>'+new Date().toLocaleDateString()+'</div>';
    h+='</body></html>';

    var w2=window.open('','_blank');
    if(w2){
      w2.document.write(h); w2.document.close();
      setTimeout(function(){ try{w2.print();}catch(e){} }, 400);
      toastN('Report opened — save as PDF from the print dialog');
    } else {
      toastN('Pop-up blocked — allow pop-ups for this site');
    }
  }

  $('btnBk').addEventListener('click', function(){
    if(!nat){
      toastN(webSave('habits-backup-' + today() + '.json', 'application/json', jsonB64()) ? 'Downloading backup\u2026' : 'Backup failed');
      return;
    }
    try{ var p = nat.saveFile('habits-backup-' + today() + '.json', 'application/json', jsonB64());
      toastN(p ? 'Saved to ' + p : 'Save failed'); }catch(e){ toastN('Backup failed'); }
  });
  $('btnDrive').addEventListener('click', function(){
    if(!nat) return;
    try{ nat.shareFile('habits-backup-' + today() + '.json', 'application/json', jsonB64()); }catch(e){ toastN('Share failed'); }
  });
  $('btnImport').addEventListener('click', function(){
    if(nat){ nat.pickImport(); return; }
    var fi = document.createElement('input');
    fi.type = 'file'; fi.accept = '.json,application/json';
    fi.addEventListener('change', function(){
      var f = fi.files && fi.files[0]; if(!f) return;
      var rd = new FileReader();
      rd.onload = function(){
        try{ importNative(btoa(unescape(encodeURIComponent(String(rd.result))))); }
        catch(e){ toastN('Could not read that file'); }
      };
      rd.readAsText(f);
    });
    fi.click();
  });

  $('pad').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-k'); if(b) padKey(b.getAttribute('data-k'));
  });

  /* journal */
  $('jrSrchBtn').addEventListener('click', function(){
    var w2 = $('jrSrchWrap'), on = !w2.classList.contains('on');
    w2.classList.toggle('on', on);
    this.classList.toggle('on', on);
    if(on){ setTimeout(function(){ $('jrSrch').focus(); }, 80); }
    else { jrQ=''; jrTag='all'; $('jrSrch').value=''; renderJr(); }
  });
  $('jrSrch').addEventListener('input', function(){
    jrQ = this.value.toLowerCase().replace(/^\s+/,'');
    renderJr();
  });
  $('jrTagRow').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-jt'); if(!b) return;
    jrTag = b.getAttribute('data-jt');
    renderJr();
  });
  $('jrWriteBtn').addEventListener('click', function(){ openJr(null); });
  $('jrList').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-jid'); if(!b) return;
    openJr(b.getAttribute('data-jid'));
  });
  $('otdList').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-jid'); if(!b) return;
    openJr(b.getAttribute('data-jid'));
  });
  $('jrDateBtn').addEventListener('click', function(){
    pendingDateField = 'jrDate';
    var pcur = (jrEd && jrEd.d) || today(), pp = pcur.split('-');
    if(nat && nat.pickDate){ try{ nat.pickDate(+pp[0], +pp[1]-1, +pp[2]); return; }catch(e){} }
    var v = prompt('Date (YYYY-MM-DD)', pcur);
    if(v) window.dateResult(v); else pendingDateField = '';
  });
  $('jrTitle').addEventListener('input', renderJrTags);
  $('jrBody').addEventListener('input', renderJrTags);
  $('jrAddPh').addEventListener('click', function(){
    if(nat && nat.pickPhoto){ try{ nat.pickPhoto(); }catch(e){ toastN('Photo picker unavailable'); } }
    else toastN('Photos work in the Android app');
  });
  $('jrPhotos').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-rp'); if(!b) return;
    var i = +b.getAttribute('data-rp');
    var pn = jrEd.ph[i];
    jrEd.ph.splice(i, 1);
    if(nat){ try{ nat.deletePhoto(pn); }catch(e2){} }
    delete photoCache[pn];
    renderJrPhotos();
  });
  $('jrSaveBtn').addEventListener('click', saveJr);
  $('jrDelBtn').addEventListener('click', onJrDelete);
  $('btnWebNotif').addEventListener('click', function(){
    if(!webNotifSupported()) return;
    if(Notification.permission === 'granted'){
      state.set.webNotif = !state.set.webNotif;
      persist(); scheduleWebNotifs(); webNotifState();
      toastN(state.set.webNotif ? 'Browser reminders on' : 'Browser reminders off');
      return;
    }
    if(Notification.permission === 'denied'){
      toastN('Notifications are blocked in your browser settings');
      return;
    }
    Notification.requestPermission().then(function(perm){
      if(perm === 'granted'){
        state.set.webNotif = true; persist(); scheduleWebNotifs();
        try{ new Notification('\uD83D\uDD14 Reminders on', {body:'You\u2019ll be nudged here at habit times.', icon:'icon-192.png'}); }catch(e){}
      }
      webNotifState();
    });
  });
  $('btnTestRem').addEventListener('click', function(){
    if(nat && nat.testReminder){
      try{ nat.testReminder(); }catch(e){}
      toastN('Lock your screen \u2014 full-screen test in ~5s');
    } else toastN('Works in the Android app');
  });
  $('btnFs').addEventListener('click', function(){
    if(nat && nat.fsOpen){ try{ nat.fsOpen(); }catch(e){} }
  });

  /* mood tracker */
  $('moGrid').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-mi'); if(!b) return;
    var i = +b.getAttribute('data-mi'), t = today();
    setMood(t, moodOf(t) === i ? -1 : i);
    renderMood();
  });
  $('mogrid').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-mo'); if(!b) return;
    var ds = b.getAttribute('data-mo');
    if(ds > today()) return;
    moEdit = (moEdit === ds) ? '' : ds;
    renderMoodCal();
  });
  $('moBarGrid').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-mbi'); if(!b) return;
    var i = +b.getAttribute('data-mbi');
    if(moEdit){ setMood(moEdit, i); moEdit = ''; renderMood(); }
  });
  $('moPrev').addEventListener('click', function(){
    moM--; if(moM<0){ moM=11; moY--; } moEdit=''; renderMoodCal();
  });
  $('moNext').addEventListener('click', function(){
    moM++; if(moM>11){ moM=0; moY++; } moEdit=''; renderMoodCal();
  });
  $('moRemSave').addEventListener('click', function(){
    var t = today();
    if(moodOf(t) < 0) return;
    var v = $('moRem').value.replace(/^\s+|\s+$/g,'');
    if(v) state.moodNotes[t] = v; else delete state.moodNotes[t];
    persist(); renderMoodCal(); toastN(v ? 'Remark saved' : 'Remark cleared');
  });
  $('moBarRemSave').addEventListener('click', function(){
    if(!moEdit || moodOf(moEdit) < 0) return;
    var v = $('moBarRem').value.replace(/^\s+|\s+$/g,'');
    if(v) state.moodNotes[moEdit] = v; else delete state.moodNotes[moEdit];
    persist(); renderMoodCal(); toastN(v ? 'Remark saved' : 'Remark cleared');
  });
  $('moSeg').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-ms'); if(!b) return;
    moSel = b.getAttribute('data-ms');
    var bs = this.children; for(var i=0;i<bs.length;i++) bs[i].classList.toggle('sel', bs[i]===b);
    renderMoodStats();
  });

  /* templates */
  $('tplRow').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-tp'); if(!b || !ed) return;
    var tp = TEMPLATES[+b.getAttribute('data-tp')];
    ed.name = tp.n; ed.emoji = tp.e; ed.type = tp.ty || 'check';
    ed.target = tp.t || (tp.ty==='time' ? 20 : (tp.ty==='money' ? 100 : 8));
    ed.unit = tp.u || '';
    ed.cat = tp.cat || 'Health';
    ed.section = tp.sec || 'any';
    ed.sched.kind = tp.sk || 'daily';
    if(tp.q) ed.sched.quota = tp.q;
    ed.color = COLORS[(+b.getAttribute('data-tp')) % COLORS.length];
    syncForm(); buzz(10);
  });

  /* focus timer */
  $('tmrGo').addEventListener('click', function(){
    if(!detailId) return;
    var t = tmrState(detailId);
    if(t.start){ t.acc += Math.floor((Date.now()-t.start)/1000); t.start = 0; }
    else t.start = Date.now();
    persist(); tmrRender();
  });
  $('tmrLog').addEventListener('click', function(){
    if(!detailId) return;
    var h = findHabit(detailId); if(!h) return;
    if(!dueOn(h, new Date()) && !isDone(h, today())){ toastN(notDueMsg(h, new Date())); return; }
    var t = tmrState(detailId), secs = tmrSecs(t);
    var mins = Math.round(secs/60);
    if(mins < 1){ toastN('Under a minute \u2014 keep going'); return; }
    delete state.timers[detailId];
    setVal(detailId, today(), val(h, today()) + mins);
    $('tmrVal').textContent = '00:00';
    $('tmrGo').textContent = 'Start'; $('tmrGo').classList.remove('go');
    toastN('Logged ' + mins + ' min \u2713');
  });

  /* journal */
  $('jrSave').addEventListener('click', function(){
    var h = findHabit(detailId); if(!h) return;
    var v = $('jrTxt').value.replace(/^\s+|\s+$/g,'');
    if(v) h.dnotes[today()] = v; else delete h.dnotes[today()];
    persist(); renderDetail(); toastN(v ? 'Note saved' : 'Note cleared');
  });

  /* archive */
  $('valSave').addEventListener('click', function(){
    if(!detailId) return;
    var h2 = findHabit(detailId); if(!h2) return;
    var raw = parseFloat(($('valIn').value || '').replace(',', '.'));
    if(isNaN(raw) || raw < 0) raw = 0;
    setVal(detailId, today(), Math.min(100000, raw));
    renderDetail(); renderToday();
    var tg2 = targ(h2), nv2 = val(h2, today());
    toastN(nv2 <= 0 ? 'Cleared \u2014 not started'
      : nv2 < tg2 ? 'Work done \u2014 ' + fmtV(nv2) + '/' + tg2 + ' saved'
      : 'Target achieved \u2014 ' + fmtV(nv2) + '/' + tg2 + ' \uD83C\uDF89');
  });
  $('archBtn').addEventListener('click', function(){
    var h = findHabit(detailId); if(!h) return;
    if(h.arch){ h.arch = false; h.archAt = ''; toastN('Restored \uD83D\uDC4B'); }
    else { h.arch = true; h.archAt = today(); toastN('Archived \u2014 history kept'); }
    persist(); closeSheet(); renderToday(); renderSet();
  });
  $('btnArch').addEventListener('click', function(){ renderArchSheet(); openSheet('archSheet'); });
  $('archList').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-ra'); if(!b) return;
    var h = findHabit(b.getAttribute('data-ra')); if(!h) return;
    h.arch = false; h.archAt = '';
    persist(); renderArchSheet(); renderToday(); renderSet();
    toastN(h.emoji + ' ' + h.name + ' is back');
  });
  $('archDone').addEventListener('click', function(){ closeSheet(); renderSet(); });

  /* vacation */
  $('btnVac').addEventListener('click', function(){
    if(onVacation(today())){
      state.set.vacFrom = ''; state.set.vacUntil = '';
      persist(); renderSet(); renderToday(); toastN('Vacation ended');
      return;
    }
    pendingDateField = 'vacUntil';
    var p = today().split('-');
    if(nat && nat.pickDate){ try{ nat.pickDate(+p[0], +p[1]-1, +p[2]); return; }catch(e){} }
    var v = prompt('Vacation until (YYYY-MM-DD)', today());
    if(v) window.dateResult(v); else pendingDateField = '';
  });

  // ---- Gemini AI key management ----
  // ---- AI provider management ----
  $('aiProvider').addEventListener('change', function(){
    var prov=this.value;
    localStorage.setItem('ai_provider',prov);
    syncAiCfgToNative();
    populateModels(prov);
    $('aiKeyHint').textContent='Get key at '+AI_PROVIDERS[prov].url;
    $('aiStatus').innerHTML='Provider switched to '+AI_PROVIDERS[prov].name;
  });
  $('aiModel').addEventListener('change', function(){
    localStorage.setItem('ai_model',this.value);
    syncAiCfgToNative();
    if(getAiKey()) $('aiStatus').innerHTML='<span style="color:var(--sGreen)">✓ Model: '+this.value+'</span>';
  });
  $('btnAiSave').addEventListener('click', function(){
    var k=$('aiApiKey').value.trim();
    if(!k){$('aiStatus').textContent='Enter a key first.';return;}
    localStorage.setItem('ai_key',k);
    localStorage.setItem('ai_provider',$('aiProvider').value);
    localStorage.setItem('ai_model',$('aiModel').value);
    syncAiCfgToNative();
    $('aiApiKey').value='';
    $('aiStatus').innerHTML='<span style="color:var(--sGreen)">✓ Saved · '+AI_PROVIDERS[$('aiProvider').value].name+' · '+$('aiModel').value+'</span>';
    renderInsights();
  });
  $('btnAiClear').addEventListener('click', function(){
    localStorage.removeItem('ai_key'); localStorage.removeItem('ai_weekly_narr'); localStorage.removeItem('ai_weekly_narr_day');
    syncAiCfgToNative();
    $('aiStatus').innerHTML='Key removed.';
    renderInsights();
  });
  $('btnAiFetch').addEventListener('click', function(){
    var key=getAiKey()||$('aiApiKey').value.trim();
    var provId=$('aiProvider').value;
    var prov=AI_PROVIDERS[provId];
    if(!key){$('aiStatus').textContent='Enter a key first to fetch models.';return;}
    if(!prov.listModels){$('aiStatus').textContent='This provider doesn\'t support live model listing.';return;}
    $('aiStatus').textContent='Fetching models from '+prov.name+'…';
    prov.listModels(key).then(function(models){
      if(models&&models.length){
        prov.models=models;
        populateModels(provId);
        $('aiStatus').innerHTML='<span style="color:var(--sGreen)">✓ Loaded '+models.length+' models from '+prov.name+'</span>';
      } else {
        $('aiStatus').textContent='No models returned — check your key.';
      }
    }).catch(function(e){
      $('aiStatus').textContent='Failed: '+e.message;
    });
  });

  // ---- Ask Your Data chat ----
  // ---- Universal AI Assistant wiring ----
  function doUaiSend(){ var v=$('uaiInput').value.trim();if(!v)return;$('uaiInput').value='';uaiSend(v); }
  $('uaiSend').addEventListener('click', doUaiSend);
  $('uaiClear').addEventListener('click', function(){
    var log=$('uaiLog');
    if(!log || !log.childNodes.length){ return; }
    if(log.querySelector('.uaiClearAsk')){ return; }
    var ask=document.createElement('div');
    ask.className='uaiMsg bot uaiClearAsk';
    ask.innerHTML='Clear this conversation?<div class="uaiBtns" style="margin-top:8px"><button class="sbtn" data-cc="no">Cancel</button><button class="primary" data-cc="yes">Clear</button></div>';
    ask.addEventListener('click', function(e){
      var b=e.target.closest('button'); if(!b) return;
      if(b.getAttribute('data-cc')==='yes'){ log.innerHTML=''; $('uaiInput').value=''; $('uaiInput').focus(); }
      else ask.remove();
    });
    log.appendChild(ask); log.scrollTop=log.scrollHeight;
  });
  $('uaiMic').addEventListener('click', function(){
    startVoice($('uaiInput'), function(text){
      toastN('Got: "'+text+'" — tap → to parse');
    });
  });
  $('uaiInput').addEventListener('keydown', function(e){if(e.key==='Enter'){e.preventDefault();doUaiSend();}});
  if($('aiCfgHead'))$('aiCfgHead').addEventListener('click',function(){$('aiCfg').classList.toggle('open');});
  // Quick hint chips
  document.querySelectorAll('.uaiHint').forEach(function(el){
    el.addEventListener('click', function(){ $('uaiInput').value=this.getAttribute('data-cmd');$('uaiInput').focus(); });
  });

  // ---- Natural language expense entry ----
  // Wire the AI page NL expense (nlExpInput2/nlExpSend2)

  // ---- Voice control: rebuilt for reliability ----
  var _speechCbId = 0, _speechCallbacks = {}, _browserSpeech = null, _speechTimer = null;
  var _voiceActive = false;

  function voiceStatus(msg, isError){
    var el=$('uaiVoiceStatus');
    if(el){ el.textContent=msg||''; el.className='uaiVoiceStatus'+(isError?' err':''); el.style.display=msg?'block':'none'; }
  }
  function clearSpeechTimer(){ if(_speechTimer){ clearTimeout(_speechTimer); _speechTimer=null; } }
  function stopBrowserSpeech(){
    clearSpeechTimer();
    if(_browserSpeech){
      try{ _browserSpeech.onresult=null; _browserSpeech.onerror=null; _browserSpeech.onend=null; _browserSpeech.stop(); }catch(e){}
      _browserSpeech=null;
    }
    _voiceActive=false;
  }
  function finishVoice(text,err,onDone){
    if(!_voiceActive && !err && !text) return;
    clearSpeechTimer();
    if(_browserSpeech){try{_browserSpeech.onresult=null;_browserSpeech.onerror=null;_browserSpeech.onend=null;_browserSpeech.stop();}catch(e){} _browserSpeech=null;}
    _voiceActive=false;
    if(err){ voiceStatus(err,true); }
    else if(text){ voiceStatus('Heard: '+text,false); }
    else { voiceStatus('No speech detected. Tap the microphone and try again.',true); }
    if(onDone) onDone(String(text||''),err||null);
  }
  window._speechResult=function(id,text,err){
    var cb=_speechCallbacks[id]; if(!cb)return; delete _speechCallbacks[id];
    finishVoice(text||'',err||null,cb);
  };
  window._speechState=function(id,state){
    if(!_voiceActive)return;
    if(state==='ready'){voiceStatus('Microphone ready — speak now',false);}
    else if(state==='begin'){voiceStatus('Listening…',false);}
  };

  function startBrowserSpeech(targetInput,onDone){
    var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ finishVoice('', 'Voice input is not supported in this browser. Use Chrome/Edge or the Android app.', onDone); return; }
    stopBrowserSpeech();
    _voiceActive=true;
    voiceStatus('Starting microphone…',false);
    var r;
    try{ r=new SR(); }catch(e){ finishVoice('', 'Could not start voice input: '+(e.message||e), onDone); return; }
    _browserSpeech=r;
    r.lang='en-IN';
    r.continuous=false;
    r.interimResults=true;
    r.maxAlternatives=1;
    var finalText='', interim='';
    r.onstart=function(){ voiceStatus('Listening… Speak now',false); };
    r.onaudiostart=function(){ voiceStatus('Listening… Speak now',false); };
    r.onspeechstart=function(){ voiceStatus('Hearing you…',false); };
    r.onresult=function(e){
      interim='';
      for(var i=e.resultIndex;i<e.results.length;i++){
        var part=e.results[i][0]&&e.results[i][0].transcript||'';
        if(e.results[i].isFinal) finalText+=part+' ';
        else interim+=part;
      }
      var shown=(finalText+interim).replace(/\s+/g,' ').trim();
      if(shown) voiceStatus('“'+shown+'”',false);
      if(finalText.trim()) finishVoice(finalText.trim(),null,onDone);
    };
    r.onerror=function(e){
      var map={
        'notallowed':'Microphone permission was denied. Allow microphone access and try again.',
        'service-not-allowed':'The browser blocked speech recognition. Allow microphone access for this site.',
        'audio':'The microphone could not be opened.',
        'network':'Speech recognition needs a network connection.',
        'no-speech':'No speech detected. Tap the microphone and speak clearly.',
        'aborted':'Voice input was cancelled.',
        'language':'English (India) speech recognition is unavailable.'
      };
      finishVoice('',map[e.error]||('Voice recognition error: '+e.error),onDone);
    };
    r.onend=function(){
      _browserSpeech=null; clearSpeechTimer();
      if(!_voiceActive)return;
      if(finalText.trim()) finishVoice(finalText.trim(),null,onDone);
      else finishVoice('', 'Voice recognition ended without hearing speech. Tap the microphone and try again.', onDone);
    };
    // Safety timer starts BEFORE start(), so a browser that never fires onstart cannot hang forever.
    _speechTimer=setTimeout(function(){
      if(_voiceActive){ try{r.abort();}catch(e){} finishVoice('', 'The microphone did not start. Check browser microphone permission and try again.', onDone); }
    },8000);
    try{ r.start(); }
    catch(e){ finishVoice('', 'Could not start the microphone: '+(e.message||e), onDone); }
  }

  function startVoice(targetInput,onDone){
    onDone=onDone||function(){};
    if(_voiceActive){ stopBrowserSpeech(); try{if(nat&&nat.stopSpeech)nat.stopSpeech();}catch(e){} voiceStatus('Voice input stopped',false); return; }
    var input=targetInput||$('uaiInput');
    // Native Android path. The callback returns transcript text to this same function.
    if(nat && typeof nat.startSpeech==='function'){
      var id='sp_'+(++_speechCbId);
      _voiceActive=true;
      _speechCallbacks[id]=function(text,err){
        if(!err && text && input){ input.value=text; input.focus(); }
        finishVoice(text||'',err||null,onDone);
      };
      voiceStatus('Starting microphone…',false);
      try{ nat.startSpeech(id); }
      catch(e){ delete _speechCallbacks[id]; finishVoice('',e.message||'Could not start Android voice input',onDone); return; }
      _speechTimer=setTimeout(function(){
        if(_voiceActive){ try{nat.stopSpeech&&nat.stopSpeech();}catch(e){} var cb=_speechCallbacks[id]; delete _speechCallbacks[id]; finishVoice('', 'The microphone did not respond. Check microphone permission and try again.', onDone); }
      },12000);
      return;
    }
    startBrowserSpeech(input,onDone);
  }

  // AI microphone: voice is treated as a command, so recognized text is sent to AI automatically.
  $('uaiMic').addEventListener('click', function(){
    startVoice($('uaiInput'), function(text,err){
      if(err || !text) return;
      $('uaiInput').value=text;
      uaiSend(text,{voice:true});
    });
  });
  /* simplified stats + mood toggles */
  $('moToggle').addEventListener('click', function(){
    var f = $('moFull'), on = f.style.display === 'none';
    f.style.display = on ? '' : 'none';
    this.textContent = on ? 'Fewer insights' : 'More insights';
    if(on) renderMoodStats();
  });

  /* mood reflection */
  $('moWhyRow').addEventListener('click', function(e){
    var b = climb(e.target, this, 'data-why'); if(!b) return;
    var t = today();
    if(moodOf(t) < 0) return;
    state.moodNotes[t] = b.getAttribute('data-why');
    persist(); renderMood();
    toastN('Noted \u2014 ' + b.getAttribute('data-why'));
  });


  /* profile */
  $('unameSave').addEventListener('click', function(){
    state.set.uname = $('unameIn').value.replace(/^\s+|\s+$/g,'').slice(0,24);
    persist(); renderToday();
    toastN(state.set.uname ? 'Hi, ' + state.set.uname + ' \uD83D\uDC4B' : 'Name cleared');
  });

  /* empty-state CTAs */
  $('emptyCta').addEventListener('click', function(){ openEdit(null); });
  $('expCta').addEventListener('click', function(){ openExp(null); });

  // stats trend selectors
  $('trendSeg').addEventListener('click', function(e){ var b=climb(e.target,this,'data-tr'); if(!b) return;
    statTrend=+b.getAttribute('data-tr'); var bs=this.children; for(var i=0;i<bs.length;i++) bs[i].classList.toggle('sel', bs[i]===b);
    drawStatTrend(); });
  $('calPrev').addEventListener('click', function(){ calM--; if(calM<0){calM=11;calY--;} calSel=''; renderCalendar(); });
  $('calNext').addEventListener('click', function(){ var n=new Date(); if(calY>n.getFullYear()||(calY===n.getFullYear()&&calM>=n.getMonth())) return; calM++; if(calM>11){calM=0;calY++;} calSel=''; renderCalendar(); });
  $('calGrid').addEventListener('click', function(e){ var c=climb(e.target,this,'data-calday'); if(!c) return;
    var ds=c.getAttribute('data-calday'); if(!dayHasData(ds) && ds!==today()){ /* still allow view */ }
    if(calSel===ds){ calSel=''; $('calDay').style.display='none'; renderCalendar(); } else renderCalDay(ds); });
  $('calDayClose').addEventListener('click', function(){ calSel=''; $('calDay').style.display='none'; renderCalendar(); });

  // ---- cloud sync wiring ----
  $('syncConfigBtn').addEventListener('click', function(){ $('syncCfgForm').style.display=''; if(!$('syncCfgIn').value) $('syncCfgIn').value=JSON.stringify(syncCfg||DEFAULT_SYNC_CFG,null,2); $('syncCfgIn').focus(); });
  $('syncCfgCancel').addEventListener('click', function(){ $('syncCfgForm').style.display='none'; $('syncCfgIn').value=''; });
  $('syncReconfig').addEventListener('click', function(){ if(fbAuth&&fbUser){ try{fbAuth.signOut();}catch(e){} } clearSyncCfg(); syncCfg=null; fbApp=null; fbAuth=null; fbFS=null; fbDoc=null; fbRecords=null; renderSyncUI(); $('syncCfgForm').style.display=''; });
  $('syncCfgSave').addEventListener('click', function(){
    var cfg=parseFbConfig($('syncCfgIn').value);
    if(!cfgLooksValid(cfg)){ toastN('Config missing apiKey/authDomain/projectId/appId'); return; }
    saveSyncCfg(cfg); syncCfg=cfg; $('syncCfgForm').style.display='none'; $('syncCfgIn').value='';
    toastN('Config saved — sign in to sync'); initSync();
  });
  $('syncSignin').addEventListener('click', function(){ doSyncSignin(false); });
  $('syncSignup').addEventListener('click', function(){ doSyncSignin(true); });
  $('syncSignout').addEventListener('click', function(){ if(fbAuth){ try{ fbAuth.signOut(); toastN('Signed out'); }catch(e){} } });
  $('syncNow').addEventListener('click', function(){
    if(!fbUser){ toastN('Sign in first'); return; }
    if(!isOnline()){ setSyncState('cached'); toastN('Offline — local changes are safe'); return; }
    syncReconcile().then(function(){ toastN('Synced'); }).catch(function(e){ setSyncState('error'); var msg=prettySyncErr(e); syncMsg(msg,true); toastN(msg); });
  });
  $('todaySyncBtn').addEventListener('click', function(){
    if(!syncEnabled()){ showTab('pgSet'); toastN('Set up Cloud Firestore in Settings'); return; }
    if(!fbUser){ showTab('pgSet'); toastN('Sign in to enable cloud sync'); return; }
    if(!isOnline()){ setSyncState('cached'); toastN('Offline — local changes are safe'); return; }
    syncReconcile().then(function(){ toastN('Synced'); }).catch(function(e){ setSyncState('error'); var msg=prettySyncErr(e); syncMsg(msg,true); toastN(msg); });
  });
  window.addEventListener('online', function(){ renderSyncUI(); if(syncEnabled() && !fbAuth) initSync(); else if(fbUser) syncReconcile().catch(function(){}); });
  window.addEventListener('offline', function(){ if(fbUser) setSyncState('cached'); renderSyncUI(); });

  $('fitTrendSeg').addEventListener('click', function(e){ var b=climb(e.target,this,'data-ft'); if(!b) return;
    fitTrend=+b.getAttribute('data-ft'); var bs=this.children; for(var i=0;i<bs.length;i++) bs[i].classList.toggle('sel', bs[i]===b);
    drawFitTrend(); });
  $('stAchv').addEventListener('click', function(e){ if(e.target && e.target.id==='achvViewAll'){ renderAchvModal(); $('achvModal').classList.add('on'); } });
  $('achvModalClose').addEventListener('click', function(){ $('achvModal').classList.remove('on'); });
  $('achvModal').addEventListener('click', function(e){ if(e.target===this) this.classList.remove('on'); });


  // workout module
  $('wkCard').addEventListener('click', function(e){ if(climb(e.target,this,'data-wkopen')) openWkModule(); });
  $('sleepCard').addEventListener('click', function(e){ if(climb(e.target,this,'data-sleeplog')) openSleep(today()); });
  $('bedBtn').addEventListener('click', function(){ pickSleepTime('bed'); });
  $('wakeBtn').addEventListener('click', function(){ pickSleepTime('wake'); });
  $('sleepSave').addEventListener('click', saveSleep);
  $('sleepDel').addEventListener('click', function(){
    var d=sleepEd.d; state.sleep=state.sleep.filter(function(x){return x.d!==d;});
    persist(); closeSheet(); renderSleepCard(); toastN('Cleared');
  });
  $('wkClose').addEventListener('click', closeWkModule);
  $('wkAdd').addEventListener('click', function(){ openEx(null); });
  $('wkBody').addEventListener('click', function(e){
    var lg=climb(e.target,this,'data-log'); if(lg){ openLog(lg.getAttribute('data-log')); return; }
    var hi=climb(e.target,this,'data-exhist'); if(hi){ openHist(hi.getAttribute('data-exhist')); return; }
    var ed=climb(e.target,this,'data-exedit'); if(ed){ openEx(ed.getAttribute('data-exedit')); return; }
    var tg=climb(e.target,this,'data-extoggle'); if(tg){
      var id=tg.getAttribute('data-extoggle');
      wkOpenId = (wkOpenId===id) ? '' : id;
      renderWkModule();
      if(wkOpenId){ var oex=exById(wkOpenId); setTimeout(function(){ if(oex) drawExChart(oex); }, 50);
        var card=$('wkBody').querySelector('.exCard.open'); if(card && card.scrollIntoView) setTimeout(function(){ card.scrollIntoView({behavior:'smooth', block:'nearest'}); }, 70); }
      return;
    }
  });
  $('histList').addEventListener('click', function(e){
    var he=climb(e.target,this,'data-histedit'); if(he && histEx){ var exId=histEx.id, d=he.getAttribute('data-histedit'); closeSheet(); setTimeout(function(){ openLog(exId, d); }, 60); }
  });
  $('histCsv').addEventListener('click', function(){ if(histEx) exportExLogCsv(histEx); });
  $('histXlsx').addEventListener('click', function(){ if(histEx) exportExLogXlsx(histEx); });
  $('histPdf').addEventListener('click', function(){ if(histEx) exportExLogPdf(histEx); });
  $('exTypeGrid').addEventListener('click', function(e){ var b=climb(e.target,this,'data-mt'); if(!b) return;
    exTypeSel=b.getAttribute('data-mt'); $('exUnit').dataset.auto = $('exUnit').value===(MTYPES[exTypeSel]&&MTYPES[exTypeSel].unit)?'1':($('exUnit').value?'0':'1');
    // reset auto so unit follows type unless user typed
    if(!$('exUnit').value){ $('exUnit').dataset.auto='1'; }
    paintExType(); });
  $('exUnit').addEventListener('input', function(){ this.dataset.auto='0'; });
  $('exSets').addEventListener('click', function(){ this.classList.toggle('on'); });
  $('exSave').addEventListener('click', saveEx);
  $('exDel').addEventListener('click', function(){
    if(!exEd._edit) return;
    if(!confirm('Delete this exercise and its history?')) return;
    state.exs=state.exs.filter(function(x){return x.id!==exEd._edit;});
    state.wlog=state.wlog.filter(function(x){return x.exId!==exEd._edit;});
    persist(); closeSheet(); renderWkModule(); renderWkCard(); toastN('Deleted');
  });
  $('logSetWrap').addEventListener('click', function(e){
    if(e.target && e.target.id==='addSetBtn'){ readLogSets(); logSets.push(0); renderLogSets(); return; }
    var sx=climb(e.target,this,'data-sx'); if(sx){ readLogSets(); logSets.splice(+sx.getAttribute('data-sx'),1); if(!logSets.length) logSets=[0]; renderLogSets(); }
  });
  $('logMinus').addEventListener('click', function(){ var v=parseFloat($('logVal').value)||0; var st=logEx&&logEx.mtype==='distance'?0.5:1; $('logVal').value=fmtV(Math.max(0,v-st)); });
  $('logPlus').addEventListener('click', function(){ var v=parseFloat($('logVal').value)||0; var st=logEx&&logEx.mtype==='distance'?0.5:1; $('logVal').value=fmtV(v+st); });
  $('logSave').addEventListener('click', saveLog);


  function syncSeg(){ var bs=$('expSeg').children; for(var i=0;i<bs.length;i++) bs[i].classList.toggle('sel', bs[i].getAttribute('data-ex')===expView); }
  window.syncSeg = syncSeg;
  $('expSeg').addEventListener('click', function(e){
    var b=climb(e.target,this,'data-ex'); if(!b) return;
    expView=b.getAttribute('data-ex'); syncSeg(); renderExp();
  });
  $('expPrev').addEventListener('click', function(){ expM--; if(expM<0){expM=11;expY--;} renderExp(); });
  $('expNext').addEventListener('click', function(){ expM++; if(expM>11){expM=0;expY++;} renderExp(); });
  $('expSrchBtn').addEventListener('click', function(){
    var w=$('expSrchWrap'), on=!w.classList.contains('on'); w.classList.toggle('on',on); this.classList.toggle('on',on);
    if(on) setTimeout(function(){$('expSrch').focus();},80); else { expQ=''; expFilter='all'; expShowN=60; $('expSrch').value=''; syncFilterChips(); renderExp(); }
  });
  var expSrchT=null;$('expSrch').addEventListener('input', function(){ expQ=this.value; expShowN=60; if(expSrchT)clearTimeout(expSrchT); expSrchT=setTimeout(function(){expSrchT=null;renderExp();},180); });
  function syncFilterChips(){ var bs=$('expFilterRow').children; for(var i=0;i<bs.length;i++) bs[i].classList.toggle('sel', bs[i].getAttribute('data-xf')===expFilter); }
  $('expFilterRow').addEventListener('click', function(e){ var b=climb(e.target,this,'data-xf'); if(!b) return; expFilter=b.getAttribute('data-xf'); expShowN=60; syncFilterChips(); renderExp(); });
  $('expTx').addEventListener('click', function(e){ if(e.target&&e.target.id==='expShowMore'){ expShowN+=150; renderExpTx(); return; } var b=climb(e.target,this,'data-tx'); if(b) openExp(b.getAttribute('data-tx')); if(e.target&&e.target.id==='expRangeExport') openExpRangeExport(); });
  $('expAcct').addEventListener('click', function(e){
    if(e.target && e.target.id==='acctAdd'){ openAcct(null); return; }
    if(e.target && e.target.id==='xferBtn'){ openXfer(); return; }
    var b=climb(e.target,this,'data-acct'); if(b) openAcct(b.getAttribute('data-acct'));
  });
  $('expBudg').addEventListener('click', function(e){
    if(e.target && e.target.id==='budgEdit'){ openBudg(); return; }
    if(e.target && e.target.id==='catEditBtn'){ openCatEditor(); return; }
  });

  // expense sheet
  $('expKind').addEventListener('click', function(e){ var b=climb(e.target,this,'data-k'); if(!b) return; expKindSel=b.getAttribute('data-k'); expSubSel=''; paintKind(); paintExpPickers(); });
  $('expCatGrid').addEventListener('click', function(e){
    if(climb(e.target,this,'data-newcat')){ $('expNewSubRow').style.display='none'; $('expNewCatRow').style.display='flex'; $('expNewCat').value=''; $('expNewCat').focus(); return; }
    var b=climb(e.target,this,'data-ec'); if(!b) return; expCatSel=b.getAttribute('data-ec'); expSubSel=''; paintExpPickers();
  });
  $('expSubGrid').addEventListener('click', function(e){
    if(climb(e.target,this,'data-newsub')){ $('expNewSubRow').style.display='flex'; $('expNewSub').value=''; $('expNewSub').focus(); return; }
    var b=climb(e.target,this,'data-es'); if(!b) return; expSubSel = (expSubSel===b.getAttribute('data-es'))?'':b.getAttribute('data-es'); paintExpPickers();
  });
  $('expNewCatOk').addEventListener('click', addNewCat);
  $('expNewCat').addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); addNewCat(); } });
  $('expNewCatX').addEventListener('click', function(){ $('expNewCatRow').style.display='none'; });
  $('expNewSubOk').addEventListener('click', addNewSub);
  $('expNewSub').addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); addNewSub(); } });
  $('expNewSubX').addEventListener('click', function(){ $('expNewSubRow').style.display='none'; });
  $('expAcctGrid').addEventListener('click', function(e){ var b=climb(e.target,this,'data-ea'); if(!b) return; expAcctSel=b.getAttribute('data-ea'); paintExpPickers(); });
  $('expToGrid').addEventListener('click', function(e){ var b=climb(e.target,this,'data-et'); if(!b) return; expToSel=b.getAttribute('data-et'); paintExpPickers(); });
  $('expMore').addEventListener('click', function(){ var x=$('expMoreBox'); var on=x.style.display==='none'; x.style.display=on?'':'none'; this.style.display=on?'none':''; });
  $('expDateBtn').addEventListener('click', function(){
    pendingDateField='expDate'; var pc=(expEd&&expEd.d||today()).split('-');
    if(nat&&nat.pickDate){ try{ nat.pickDate(+pc[0],+pc[1]-1,+pc[2]); return; }catch(e){} }
    var v=prompt('Date (YYYY-MM-DD)', expEd.d); if(v) window.dateResult(v); else pendingDateField='';
  });
  $('expSave').addEventListener('click', saveExp);
  $('expDel').addEventListener('click', function(){
    if(!expEd._edit) return;
    for(var i=0;i<state.tx.length;i++) if(state.tx[i].id===expEd._edit){ state.tx.splice(i,1); break; }
    persist(); closeSheet(); renderExp(); toastN('Deleted');
  });

  $('expReceiptAdd').addEventListener('click', addExpReceipt);
  $('expReceiptCamera').addEventListener('click', addExpReceiptCamera);
  $('expReceiptFile').addEventListener('change', function(){var f=this.files&&this.files[0];if(!f)return;if(f.size>12*1024*1024){toastN('Receipt is too large');this.value='';return;}resizeReceipt(f,function(data){receiptScanData=data;receiptScanName=f.name||'receipt';renderExpReceipt();scanReceiptWithAi();});this.value='';});
  $('recurKindGrid').addEventListener('click',function(e){var b=climb(e.target,this,'data-rkind');if(!b)return;recurEd.kind=b.getAttribute('data-rkind');var bs=this.children;for(var i=0;i<bs.length;i++)bs[i].classList.toggle('sel',bs[i]===b);});
  $('recurFreqGrid').addEventListener('click',function(e){var b=climb(e.target,this,'data-rf');if(!b)return;recurFreq=b.getAttribute('data-rf');paintRecur();});
  $('recurWeekGrid').addEventListener('click',function(e){var b=climb(e.target,this,'data-rw');if(!b)return;recurWeekday=+b.getAttribute('data-rw');paintRecur();});
  $('recurCatGrid').addEventListener('click',function(e){var b=climb(e.target,this,'data-rc');if(!b)return;recurCat=b.getAttribute('data-rc');paintRecur();});
  $('recurAcctGrid').addEventListener('click',function(e){var b=climb(e.target,this,'data-ra');if(!b)return;recurAcct=b.getAttribute('data-ra');paintRecur();});
  $('recurActive').addEventListener('click',function(){this.classList.toggle('on');});
  $('recurSave').addEventListener('click',saveRecur);
  $('recurDel').addEventListener('click',function(){if(!recurEd||!recurEd._edit)return;if(!confirm('Delete this recurring transaction? Existing posted transactions will remain.'))return;state.recur=state.recur.filter(function(r){return r.id!==recurEd._edit;});persist();closeSheet();renderExp();toastN('Recurring expense deleted');});
  $('expExportXlsx').addEventListener('click',exportExpRangeXlsx);
  $('expExportPdf').addEventListener('click',exportExpRangePdf);

  // account sheet
  $('acctTypeGrid').addEventListener('click', function(e){ var b=climb(e.target,this,'data-at'); if(!b) return; acctTypeSel=b.getAttribute('data-at'); $('acctCreditFields').style.display=acctTypeSel==='credit'?'':'none'; var bs=this.children; for(var i=0;i<bs.length;i++) bs[i].classList.toggle('sel', bs[i]===b); });
  $('acctActive').addEventListener('click', function(){ this.classList.toggle('on'); });
  $('acctSave').addEventListener('click', saveAcct);
  $('acctDel').addEventListener('click', function(){
    if(!acctEd._edit) return;
    var used=state.tx.some(function(x){return x.acct===acctEd._edit||x.to===acctEd._edit;});
    if(used){ toastN('Has transactions — set inactive instead'); return; }
    for(var i=0;i<state.accts.length;i++) if(state.accts[i].id===acctEd._edit){ state.accts.splice(i,1); break; }
    persist(); closeSheet(); renderExp(); toastN('Account deleted');
  });

  // budget + category editor
  $('budgSave').addEventListener('click', saveBudg);
  $('catAdd').addEventListener('click', function(){
    var n=$('catNew').value.trim(); if(!n||state.cats[n]) { $('catNew').value=''; return; }
    state.cats[n]=[]; $('catNew').value=''; persist(); renderCatEditor();
  });
  $('catDone').addEventListener('click', function(){ closeSheet(); renderExp(); });
  $('catList').addEventListener('click', function(e){
    var dc=climb(e.target,this,'data-delcat'); if(dc){ var c=dc.getAttribute('data-delcat'); if(Object.keys(state.cats).length>1){ delete state.cats[c]; persist(); renderCatEditor(); } return; }
    var ds=climb(e.target,this,'data-delsub'); if(ds){ var pr=ds.getAttribute('data-delsub').split('|'); var arr=state.cats[pr[0]]||[]; var ix=arr.indexOf(pr[1]); if(ix>=0){ arr.splice(ix,1); persist(); renderCatEditor(); } return; }
    var as=climb(e.target,this,'data-addsub'); if(as){ var cc=as.getAttribute('data-addsub'); var nm=prompt('New subcategory for '+cc); if(nm&&nm.trim()){ state.cats[cc].push(nm.trim().slice(0,30)); persist(); renderCatEditor(); } return; }
  });

  $('jrEmptyCta').addEventListener('click', function(){ openJr(null); });

  document.addEventListener('visibilitychange', function(){
    if(document.hidden){
      wasHidden = true;
      if(fbDoc && fbUser && !syncApplying){ if(syncPushT){ clearTimeout(syncPushT); syncPushT=null; } pushNow(false).catch(function(){}); }
    }
    else {
      renderToday(); if($('pgMood').classList.contains('on')) renderMood();
      if(wasHidden && !nat){ wasHidden=false; lockNow(); }
      if(fbDoc && fbUser && !syncApplying){ syncReconcile().catch(function(){}); }
    }
  });
  window.addEventListener('pagehide', function(){
    if(fbDoc && fbUser && !syncApplying){ if(syncPushT){ clearTimeout(syncPushT); syncPushT=null; } pushNow(false).catch(function(){}); }
  });

  syncFromNative();
  syncAiCfgToNative();
  grantMonthly();
  applyTheme();
  applyGrey();
  renderToday();
  autoBackupDaily();
  // Do not persist an empty startup state before Firebase has had a chance to hydrate a fresh install.
  // This prevents a blank WebView from being treated as newer local data and overwriting cloud data.
  if(hasMeaningfulData(state)) { var _bj=stateJson(); if(_bj){ try{ localStorage.setItem(KEY, _bj); }catch(e){} } }
  /* perf: let the first frame paint before the Firebase SDKs load and parse */
  if(typeof initSync==='function') setTimeout(initSync, 400);
  if(state.set.pin) showLock('unlock');
}
init();
/* Widget deep links: runs at boot AND on warm relaunch (onNativeResume). */
function handleLaunchAction(){
  if(!(nat && nat.getLaunchAction)) return;
  try{
    var _la = JSON.parse(nat.getLaunchAction() || '{}');
    window._widgetFlowArmed = _la.fromWidget==='1' && !!(_la.habit||_la.task||_la.addTask||_la.addHabit||_la.workout||_la.add);
    if(_la.tab) showTab(_la.tab);
    else if(_la.habit && findHabit(_la.habit)){ showTab('pgToday'); openDetail(_la.habit); }
    else if(_la.task){ showTab('pgTasks'); setTimeout(function(){openTask(_la.task);},120); }
    else if(_la.addTask){ showTab('pgTasks'); setTimeout(function(){openTask();},120); }
    else if(_la.addHabit){ showTab('pgToday'); setTimeout(function(){openEdit(null);},150); }
    else if(_la.workout){ showTab('pgStats'); if(_la.workout!=='1') setTimeout(function(){ try{ openLog(_la.workout); }catch(e){ try{ openEx(_la.workout); }catch(e2){} } },180); }
    else if(_la.add){ openExpFromWidget(_la.add, _la.acct); }
    else if(_la.voice){ showTab('pgAI'); setTimeout(function(){ startVoice($('uaiInput'), function(text,err){ if(!err&&text)uaiSend(text,{voice:true}); }); }, 120); }
  }catch(e){}
}
handleLaunchAction();
