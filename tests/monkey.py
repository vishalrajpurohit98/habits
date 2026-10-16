"""Monkey test: random taps/typing across pages and sheets; reports JS errors with the action that caused them."""
import threading, http.server, socketserver, functools, random, sys
from playwright.sync_api import sync_playwright
socketserver.TCPServer.allow_reuse_address=True
H=functools.partial(http.server.SimpleHTTPRequestHandler, directory='/home/claude/HabitTracker-web'); H.log_message=lambda *a:None
s=socketserver.TCPServer(('127.0.0.1',10490),H); threading.Thread(target=s.serve_forever,daemon=True).start()
random.seed(int(sys.argv[1]) if len(sys.argv)>1 else 7); N=int(sys.argv[2]) if len(sys.argv)>2 else 350
OPEN=["showTab('pgToday')","showTab('pgHabits')","showTab('pgTasks')","showTab('pgExp')","showTab('pgJr');jrGo('timeline')","showTab('pgJr');jrGo('calendar')","showTab('pgJr');jrGo('write')","showTab('pgJr');jrGo('insights')","showTab('pgStats')","showTab('pgAI')","showTab('pgSet')",
 "openEdit(null)","openTask(null)","openExp(null)","openJr(null)","openSheet('moodSheet')","openSleep(today())","openBills()","openBill(null)","openAcct(null)","openWkModule()","document.querySelector('#tabbar .navFab').click()","document.getElementById('homeSearch').click()"]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True); ctx.add_init_script("window.__noAuthGate=true;window.__noSleepGate=true;")
    pg=ctx.new_page(); errs=[]; last={'a':''}; pg.on('pageerror',lambda e:errs.append((last['a'],str(e)[:160]))); pg.on('dialog',lambda d:d.dismiss())
    pg.goto('http://127.0.0.1:10490/index.html'); pg.wait_for_timeout(900); pg.evaluate(open('/home/claude/review/demo_seed.js').read()); pg.reload(); pg.wait_for_timeout(1500)
    pg.evaluate("window.aiFetch=function(){return Promise.resolve({ok:true,json:()=>Promise.resolve({candidates:[{content:{parts:[{text:'{\"action\":\"query\",\"params\":{},\"message\":\"ok\"}'}]}}]})})};uStore.setItem('ai_key','k');window.webSave=function(){return true};window.open=function(){return {document:{write(){},close(){}},focus(){},print(){},close(){}}};")
    for i in range(N):
        try:
            r=random.random()
            if r<0.18:
                a=random.choice(OPEN); last['a']='open: '+a; pg.evaluate("try{"+a+"}catch(e){throw e}")
            elif r<0.80:
                picked=pg.evaluate("""(()=>{const els=[...document.querySelectorAll('button,a,[role=button],.chip,.tab,.card,.taskCard,.jrRow,.txRow,.setCard2,.setRow,.tog,input[type=checkbox],.hmSpaceGrid button')].filter(e=>{const r=e.getBoundingClientRect();if(r.width<6||r.height<6||r.bottom<0||r.top>innerHeight)return false;const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)return false;const sh=e.closest('.sheet');if(sh&&!sh.classList.contains('open'))return false;if(e.closest('.page')&&!e.closest('.page').classList.contains('on'))return false;if(/sign out|delete everything|remove pin|reset all|factory|wipe|google|continue with/i.test(e.textContent||''))return false;return true});
                  if(!els.length)return null;const e=els[Math.floor(Math.random()*els.length)];const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,n:((e.id?'#'+e.id:'')+'.'+String(e.className).split(' ').slice(0,2).join('.')+' "'+(e.textContent||'').trim().slice(0,18)+'"')}})()""")
                if picked: last['a']='tap '+picked['n']; pg.mouse.click(picked['x'],picked['y'])
            elif r<0.92:
                last['a']='type'; pg.evaluate("""(()=>{const f=[...document.querySelectorAll('input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=range]),textarea,[contenteditable=true]')].filter(e=>e.getClientRects().length&&(!e.closest('.sheet')||e.closest('.sheet').classList.contains('open')));if(!f.length)return;const e=f[Math.floor(Math.random()*f.length)];const v=['hello','42','2026-13-45','<b>x</b>','','a'.repeat(300),'-5','12:30'][Math.floor(Math.random()*8)];if(e.isContentEditable)e.innerHTML=v;else{e.value=v;}e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()""")
            else:
                last['a']='back'; pg.evaluate("try{handleAndroidBack()}catch(e){throw e}")
            pg.wait_for_timeout(60)
            if i%40==39: pg.evaluate("document.querySelectorAll('.proModal,.featureModal,.exitDlgWrap').forEach(e=>e.remove())")
        except Exception as e:
            errs.append((last['a'],'PY '+str(e).split('\n')[0][:120]))
    uniq={}
    for a,e in errs: uniq.setdefault(e,a)
    print(f'{N} actions · {len(errs)} errors · {len(uniq)} distinct')
    for e,a in uniq.items(): print('  ERROR:',e,'\n     during:',a)
    b.close()
s.shutdown()
