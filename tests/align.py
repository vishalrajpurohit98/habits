"""Button alignment audit: side-by-side buttons in the same row must share top edge and height."""
import threading, http.server, socketserver, functools, json, sys
from playwright.sync_api import sync_playwright
socketserver.TCPServer.allow_reuse_address=True
ROOT=sys.argv[1] if len(sys.argv)>1 else '/home/claude/HabitTracker-web'; VW=int(sys.argv[2]) if len(sys.argv)>2 else 390
H=functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT); H.log_message=lambda *a:None
s=socketserver.TCPServer(('127.0.0.1',10480+VW%7),H); threading.Thread(target=s.serve_forever,daemon=True).start()
def sec(n): return "showTab('pgSet');[...document.querySelectorAll('#setCardGrid .setCard2')].find(c=>c.textContent.indexOf('"+n+"')>=0).click()"
STATES=[('Habit editor',"openEdit(null)"),('Habit detail',"openDetail(state.habits[0].id)"),('Task editor',"openTask(state.tasks.find(t=>!t.virtualHabit).id)"),('Expense',"openExp(null)"),
 ('Account',"openAcct(null)"),('Journal editor',"openJr(null)"),('Journal reader',"openJrRead(state.jr[0].id)"),('Journal export',"showTab('pgJr');document.getElementById('jrExportBtn').click()"),
 ('Mood',"openSheet('moodSheet');try{renderMoodToday()}catch(e){}"),('Sleep',"openSleep(today())"),('Notebooks',"showTab('pgJr');openJrBooks()"),('Notebook edit',"openJrBookEdit(null)"),
 ('Bills',"showTab('pgExp');openBills()"),('Bill editor',"openBill(null)"),('Trash',sec('Data')+";setTimeout(()=>document.getElementById('btnTrash').click(),300)"),('Task export',"showTab('pgTasks');document.getElementById('taskExportToggle').click()"),
 ('Money export',"openExpRangeExport()"),('Search',"showTab('pgToday');document.getElementById('homeSearch').click()"),('Create',"showTab('pgToday');document.querySelector('#tabbar .navFab').click()"),
 ('Daily review',"(document.querySelector('[data-review-open]')||{click(){openReview&&openReview()}}).click()"),('Exit dialog',"showTab('pgToday');handleAndroidBack()"),
 ('Workout module',"openWkModule()"),('Workout summary',"openWkModule();setTimeout(()=>{const b=[...document.querySelectorAll('#wkModule button')].find(x=>/start session/i.test(x.textContent));b&&b.click();setTimeout(()=>{const f=document.getElementById('wsFinish');f&&f.click();},500)},400)"),
 ('Settings Data',sec('Data')),('Settings Privacy',sec('Privacy')),('Settings Cloud',sec('Cloud sync')),('Settings Profile',sec('Profile')),('Settings Notifications',sec('Notifications')),
 ('Home',"homeMoment=()=>'evening';showTab('pgToday');renderHome()"),('Journal page',"showTab('pgJr');jrGo('timeline')"),('Journal AI',"showTab('pgJr');jrGo('insights')"),('Money page',"showTab('pgExp')"),('Tasks page',"showTab('pgTasks')"),('AI page',"showTab('pgAI')"),('Insights',"showTab('pgStats')"),
 ('Financial tools',"showTab('pgExp');document.querySelector('[data-ft=\"financial-tools\"]').click()"),
 ('PIN lock',"state.set.pin=pinHash('2468');lastUnlock=0;showLock('unlock')"),
 ('Sleep check-in',"document.getElementById('lock')&&document.getElementById('lock').classList.remove('on');showSleepGate()"),
 ('AI settings',"document.getElementById('sleepGate').hidden=true;document.documentElement.classList.remove('sleepGateOn');showTab('pgAI');const h=document.getElementById('aiCfgHead');h&&h.click()"),
 ('Drafts list',"state.jrDrafts=[{id:'d1',title:'Draft',content:'x',date:today(),savedAt:Date.now()}];showTab('pgJr');jrGo('timeline');setTimeout(()=>{try{window._renderJrDraftsBtn&&window._renderJrDraftsBtn()}catch(e){};document.getElementById('jrDraftsBtn').click()},300)")]
FIND="""(()=>{const out=[];const BTN='button,.sbtn,.btnS,.primary,a.btn,[role=button]';
  const vis=e=>{const r=e.getBoundingClientRect();if(r.width<8||r.height<8)return false;const cs=getComputedStyle(e);const sh=e.closest('.sheet');if(sh&&!sh.classList.contains('open'))return false;return cs.visibility!=='hidden'&&cs.display!=='none'&&r.bottom>0&&r.top<innerHeight*3};
  const name=e=>(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\\s+/).slice(0,2).join('.'):'')||e.tagName.toLowerCase();
  document.querySelectorAll('*').forEach(p=>{const kids=[...p.children].filter(c=>c.matches(BTN)&&vis(c)&&!c.closest('.tog'));if(kids.length<2)return;
    for(let i=0;i<kids.length;i++)for(let j=i+1;j<kids.length;j++){const a=kids[i].getBoundingClientRect(),b=kids[j].getBoundingClientRect();
      const ov=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top); if(ov<Math.min(a.height,b.height)*0.4) continue;
      const dt=Math.abs(a.top-b.top),dh=Math.abs(a.height-b.height),dc=Math.abs((a.top+a.bottom)/2-(b.top+b.bottom)/2),db=Math.abs(a.bottom-b.bottom);
      const act=x=>x.matches('.primary,.sbtn,.btnS,.ghost,.danger')&&(x.textContent||'').trim().length>1;
      if(Math.min(dt,dc,db)>1.5||(act(kids[i])&&act(kids[j])&&dh>1.5)) out.push({row:name(p),a:(kids[i].textContent||kids[i].getAttribute('aria-label')||'').trim().slice(0,18),b:(kids[j].textContent||kids[j].getAttribute('aria-label')||'').trim().slice(0,18),dTop:Math.round(dt),hA:Math.round(a.height),hB:Math.round(b.height)});}});
  const seen={};return out.filter(o=>{const k=o.row+o.a+o.b;if(seen[k])return false;seen[k]=1;return true;});})()"""
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':VW,'height':844 if VW<600 else 900},is_mobile=VW<600); ctx.add_init_script("window.__noAuthGate=true;window.__noSleepGate=true;")
    pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:120])); pg.on('dialog',lambda d:d.dismiss())
    pg.goto(f'http://127.0.0.1:{10480+VW%7}/index.html'); pg.wait_for_timeout(900); pg.evaluate(open('/home/claude/review/demo_seed.js').read())
    pg.evaluate("state.recur=[{id:'rA',name:'Netflix',kind:'exp',amt:649,freq:'monthly',start:today(),nextDate:today(),mode:'remind',active:true}];persist({now:true})"); pg.reload(); pg.wait_for_timeout(1600)
    total=0
    for nm,js in STATES:
        try:
            pg.evaluate("document.querySelectorAll('.proModal,.featureModal,.exitDlgWrap').forEach(e=>e.remove());try{closeSheet()}catch(e){};try{document.getElementById('wkModule').classList.remove('on');document.getElementById('wkSession').classList.remove('on')}catch(e){};window.scrollTo(0,0)")
            pg.wait_for_timeout(300); pg.evaluate(js); pg.wait_for_timeout(1300); r=pg.evaluate(FIND)
        except Exception as e: print('skip',nm,str(e)[:80]); continue
        total+=len(r)
        for x in r: print(f'{nm:22s}| {x["row"][:34]:34s}| "{x["a"]}" vs "{x["b"]}" top off by {x["dTop"]}px, heights {x["hA"]}/{x["hB"]}')
    print(f'== {len(STATES)} places checked at {VW}px · {total} misaligned rows · errors {errs[:2]}')
    b.close()
s.shutdown()
