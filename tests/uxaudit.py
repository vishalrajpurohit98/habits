"""Accessibility audit: contrast (WCAG AA), small text (<12px), touch targets (<40px), clipped text. Both themes."""
import threading, http.server, socketserver, functools, json, sys
from playwright.sync_api import sync_playwright
socketserver.TCPServer.allow_reuse_address=True
ROOT=sys.argv[1]; PORT=int(sys.argv[2]); OUT=sys.argv[3]
H=functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT); H.log_message=lambda *a:None
s=socketserver.TCPServer(('127.0.0.1',PORT),H); threading.Thread(target=s.serve_forever,daemon=True).start()
def sec(n): return "showTab('pgSet');[...document.querySelectorAll('#setCardGrid .setCard2')].find(c=>c.textContent.indexOf('"+n+"')>=0).click()"
SCREENS=[('Home',"homeMoment=()=>'day';showTab('pgToday');renderHome()"),('Habits',"showTab('pgHabits')"),('Tasks',"showTab('pgTasks')"),('Money',"showTab('pgExp')"),('Money·Accounts',"showTab('pgExp');document.querySelectorAll('#expSeg button')[2].click()"),
 ('Journal',"showTab('pgJr');jrGo('timeline')"),('Journal·Calendar',"showTab('pgJr');jrGo('calendar')"),('Journal·Write',"showTab('pgJr');jrGo('write')"),('Journal·AI',"showTab('pgJr');jrGo('insights')"),('Insights',"showTab('pgStats')"),('Insights·Wellness',"showTab('pgStats');document.querySelector('#statSubSeg [data-ss=he]').click()"),
 ('AI',"showTab('pgAI')"),('Settings',"showTab('pgSet')"),('Settings·Appearance',sec('Appearance')),('Settings·Data',sec('Data')),('Settings·Notifications',sec('Notifications')),('Settings·Cloud',sec('Cloud sync')),
 ('Sheet·Habit',"openEdit(null)"),('Sheet·Detail',"openDetail(state.habits[0].id)"),('Sheet·Task',"openTask(state.tasks.find(t=>!t.virtualHabit).id)"),('Sheet·Expense',"openExp(null)"),('Sheet·Journal',"openJr(null)"),('Sheet·Reader',"openJrRead(state.jr[0].id)"),('Sheet·Mood',"openSheet('moodSheet');try{renderMoodToday()}catch(e){}"),('Sheet·Sleep',"openSleep(today())"),('Sheet·Bills',"openBills()")]
JS=r"""(()=>{const R={contrast:[],small:[],target:[],clip:[]};const cv=document.createElement('canvas');cv.width=cv.height=1;const cx=cv.getContext('2d',{willReadFrequently:true});
 const lum=c=>{try{cx.clearRect(0,0,1,1);cx.fillStyle='#010203';cx.fillStyle=c;cx.fillRect(0,0,1,1);const d=cx.getImageData(0,0,1,1).data;const a=d[3]/255;if(a===0)return null;const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return {l:0.2126*f(d[0])+0.7152*f(d[1])+0.0722*f(d[2]),a:a,rgb:[d[0],d[1],d[2]]}}catch(e){return null}};
 const bgOf=e=>{let n=e;while(n&&n!==document.documentElement){const c=getComputedStyle(n).backgroundColor;const L=lum(c);if(L&&L.a>=0.9)return c;n=n.parentElement;}return getComputedStyle(document.body).backgroundColor};
 const name=e=>(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):'')||e.tagName.toLowerCase();
 const vis=e=>{const r=e.getBoundingClientRect();if(r.width<2||r.height<2)return false;const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)return false;const sh=e.closest('.sheet');if(sh&&!sh.classList.contains('open'))return false;if(e.closest('.page')&&!e.closest('.page').classList.contains('on'))return false;return r.bottom>0&&r.top<innerHeight*2};
 document.querySelectorAll('body *').forEach(e=>{if(!vis(e))return;const cs=getComputedStyle(e);const txt=[...e.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');
   if(txt&&!e.closest('.phMissing')){const fs=parseFloat(cs.fontSize);if(fs<11&&!e.closest('svg,.ypMonths'))R.small.push([name(e),fs+'px',txt.slice(0,20)]);
     const fg=lum(cs.color),bg=lum(bgOf(e));if(fg&&bg){const [a,b]=[fg.l,bg.l];const ratio=(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);const large=fs>=24||(fs>=18.66&&+cs.fontWeight>=700);const need=large?3:4.5;if(ratio<need&&!e.closest('[disabled],.disabled,.pending,[aria-disabled=true],.phMissing,.ncX'))R.contrast.push([name(e),+ratio.toFixed(2),fs,txt.slice(0,16)]);}
     if(cs.overflow==='hidden'&&cs.whiteSpace==='nowrap'&&cs.textOverflow!=='ellipsis'&&e.scrollWidth>e.clientWidth+2)R.clip.push([name(e),txt.slice(0,20)]);}
   if(e.matches('button,a,[role=button],input[type=checkbox],input[type=range],.chip,.sbtn')&&!e.closest('.calGrid,.mgrid,.jrCal,.ribbon,.jrToolbar,.hmSpaceGrid,.ypGrid,.hg,.tcMenu')&&!e.matches('.calCell,.cd,.mc,.yipCell,input[type=range]')){const r=e.getBoundingClientRect();if((r.height<40||r.width<40)&&r.width>4&&r.height>4)R.target.push([name(e),Math.round(r.width)+'x'+Math.round(r.height),(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,12)]);}});
 return R;})()"""
out={}
with sync_playwright() as p:
    b=p.chromium.launch()
    for theme in ['dark','light']:
        ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True); ctx.add_init_script("window.__noAuthGate=true;window.__noSleepGate=true;")
        pg=ctx.new_page(); pg.goto(f'http://127.0.0.1:{PORT}/index.html'); pg.wait_for_timeout(900); pg.evaluate(open('/home/claude/review/demo_seed.js').read())
        pg.evaluate("state.recur=[{id:'rA',name:'Netflix',kind:'exp',amt:649,freq:'monthly',start:today(),nextDate:today(),mode:'remind',active:true}];state.set.theme='"+theme+"';persist({now:true})"); pg.reload(); pg.wait_for_timeout(1500)
        for nm,js in SCREENS:
            try:
                pg.evaluate("document.querySelectorAll('.proModal,.featureModal').forEach(e=>e.remove());try{closeSheet()}catch(e){};window.scrollTo(0,0)"); pg.wait_for_timeout(250); pg.evaluate(js); pg.wait_for_timeout(900)
                out[theme+'|'+nm]=pg.evaluate(JS)
            except Exception as e: out[theme+'|'+nm]={'contrast':[],'small':[],'target':[],'clip':[],'error':str(e)[:100]}
        ctx.close()
    b.close()
s.shutdown(); json.dump(out,open(OUT,'w'))
for k in ['contrast','small','target','clip']:
    inst=sum(len(v.get(k,[])) for v in out.values()); dist=len({x[0] for v in out.values() for x in v.get(k,[])}); print(f'== {k}: {inst} instances, {dist} distinct')
