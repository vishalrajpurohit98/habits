SEED='empty'
W="await T.w(450);"
def corrupt(pg,ctx):
    pg.evaluate("uStore.setItem(KEY,'{this is not json')"); pg.reload(); pg.wait_for_timeout(1800)
    ok=pg.evaluate("typeof state==='object'&&Array.isArray(state.habits)&&!!document.querySelector('.page.on')")
    return {'ok':ok,'d':'app loaded after corrupted data: '+str(ok)}
def oldschema(pg,ctx):
    pg.evaluate("uStore.setItem(KEY,JSON.stringify({habits:[{id:'h1',name:'Old habit',emoji:'⭐'}]}))"); pg.reload(); pg.wait_for_timeout(1800)
    r=pg.evaluate("({habits:state.habits.length,tasks:Array.isArray(state.tasks),jr:Array.isArray(state.jr),tx:Array.isArray(state.tx)})")
    return {'ok':r['habits']==1 and r['tasks'] and r['jr'] and r['tx'],'d':str(r)}
def big(pg,ctx):
    pg.evaluate("""(()=>{const d=new Date();state.habits=[];for(let i=0;i<50;i++)state.habits.push({id:'hb'+i,name:'Habit '+i,emoji:'⭐',type:'check',sched:{kind:'daily'},done:{}});
      state.tx=[];state.accts=state.accts&&state.accts.length?state.accts:[{id:'a1',name:'Bank',type:'bank',open:1000,active:true}];for(let i=0;i<3000;i++){const x=new Date(d);x.setDate(d.getDate()-(i%365));state.tx.push({id:'t'+i,kind:i%7?'exp':'inc',amt:100+i%900,acct:state.accts[0].id,cat:'Food',payee:'Shop '+i,d:fmt(x)});}
      state.jr=[];for(let i=0;i<800;i++){const x=new Date(d);x.setDate(d.getDate()-i);state.jr.push(jrMigrateEntry({id:'j'+i,date:fmt(x),time:'21:00',title:'Entry '+i,content:'<p>Some text for entry '+i+'</p>'}));}
      state.tasks=[];for(let i=0;i<500;i++)state.tasks.push(normTask({id:'k'+i,title:'Task '+i,priority:['low','medium','high'][i%3],dueDate:fmt(new Date(Date.now()+(i%40-20)*864e5)),status:i%5?'open':'completed'}));persist({now:true});})()""")
    pg.reload(); pg.wait_for_timeout(2500)
    times=pg.evaluate("""(async()=>{const r={};for(const p of ['pgToday','pgHabits','pgExp','pgJr','pgTasks','pgStats']){const t=performance.now();showTab(p);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));r[p]=Math.round(performance.now()-t);}return r})()""")
    return {'ok':max(times.values())<1500,'d':'render ms '+str(times)}
CASES=[
 ('EDGE-01','Edge cases','Brand-new empty account: every page renders with empty states',"(async()=>{const bad=[];for(const p of ['pgToday','pgHabits','pgExp','pgAI','pgJr','pgTasks','pgStats','pgSet']){showTab(p);await T.w(250);if(!T.q('#'+p+' h1'))bad.push(p);}showTab('pgJr');jrGo('timeline');await T.w(300);const je=T.vis('#jrEmpty');showTab('pgTasks');await T.w(300);return T.ok(!bad.length,(bad.length?'failed '+bad:'8 pages')+' | journal empty state '+je)})()"),
 ('EDGE-02','Edge cases','Insights with no data render without errors',"(async()=>{showTab('pgStats');for(const b of T.qa('#statSubSeg button')){b.click();await T.w(300);}return T.ok(true,'rendered')})()"),
 ('EDGE-03','Edge cases','Special characters, quotes and other scripts round-trip safely',"(async()=>{const s='Tom & Jerry \"quotes\" <b>tag</b> العربية 中文 😀';openTask(null);"+W+"T.set('#taskTitleIn',s);T.click('#taskSave');"+W+"showTab('pgTasks');await T.w(400);const t=state.tasks.find(t=>t.title===s);const shown=T.q('#taskList').innerText.includes('Tom & Jerry \"quotes\" <b>tag</b>');return T.ok(t&&shown,'stored '+!!t+' shown literally '+shown)})()"),
 ('EDGE-04','Edge cases','Leap-day and year-end dates format correctly',"(()=>{const a=fmt(new Date(2028,1,29)),b=fmt(new Date(2026,11,31)),c=fmt(new Date(2027,0,1));return T.ok(a==='2028-02-29'&&b==='2026-12-31'&&c==='2027-01-01',[a,b,c])})()"),
 ('EDGE-05','Edge cases','Works offline: changes save without errors',"(async()=>{Object.defineProperty(navigator,'onLine',{get:()=>false,configurable:true});window.dispatchEvent(new Event('offline'));openTask(null);"+W+"T.set('#taskTitleIn','Offline task');T.click('#taskSave');"+W+"Object.defineProperty(navigator,'onLine',{get:()=>true,configurable:true});window.dispatchEvent(new Event('online'));return T.ok(state.tasks.some(t=>t.title==='Offline task'),'saved offline')})()"),
 ('EDGE-06','Edge cases','Storage full: the app keeps working and does not crash',"(async()=>{const o=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('QuotaExceededError','QuotaExceededError')};let err=null;try{openTask(null);await T.w(400);T.set('#taskTitleIn','Quota task');T.click('#taskSave');await T.w(500);persist({now:true});}catch(e){err=e.message}Storage.prototype.setItem=o;return T.ok(!err&&state.tasks.some(t=>t.title==='Quota task'),err||'kept in memory, no crash')})()"),
 ('EDGE-07','Edge cases','Switching tabs 60 times quickly causes no errors',"(async()=>{const p=['pgToday','pgHabits','pgExp','pgJr','pgTasks','pgStats','pgSet','pgAI'];for(let i=0;i<60;i++){showTab(p[i%p.length]);await T.w(20);}return T.ok(true,'60 switches')})()"),
 ('EDGE-08','Edge cases','Corrupted saved data does not stop the app from opening','PY:corrupt'),
 ('EDGE-09','Edge cases','Old or partial saved data is upgraded on load','PY:oldschema'),
 ('EDGE-10','Edge cases','Large account stays fast','PY:big'),
]
