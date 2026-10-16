"""Responsive layout: no horizontal overflow and every page renders at 7 widths."""
import threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright
socketserver.TCPServer.allow_reuse_address=True
H=functools.partial(http.server.SimpleHTTPRequestHandler, directory='/home/claude/HabitTracker-web'); H.log_message=lambda *a:None
s=socketserver.TCPServer(('127.0.0.1',10470),H); threading.Thread(target=s.serve_forever,daemon=True).start()
PAGES=['pgToday','pgHabits','pgTasks','pgExp','pgJr','pgStats','pgAI','pgSet']
with sync_playwright() as p:
    b=p.chromium.launch()
    for vw in [360,390,430,768,1024,1280,1440]:
        ctx=b.new_context(viewport={'width':vw,'height':844 if vw<600 else 900},is_mobile=vw<600); ctx.add_init_script("window.__noAuthGate=true;window.__noSleepGate=true;")
        pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:80]))
        pg.goto('http://127.0.0.1:10470/index.html'); pg.wait_for_timeout(900); pg.evaluate(open('/home/claude/review/demo_seed.js').read()); pg.reload(); pg.wait_for_timeout(1400)
        res={}
        for pid in PAGES:
            pg.evaluate(f"showTab('{pid}')"); pg.wait_for_timeout(350)
            res[pid]=pg.evaluate(f"(()=>{{const p=document.getElementById('{pid}');const over=document.documentElement.scrollWidth>innerWidth+1||[...p.querySelectorAll('*')].some(e=>{{const r=e.getBoundingClientRect();return r.width>0&&r.right>innerWidth+2&&getComputedStyle(e).position!=='fixed'&&!/auto|scroll/.test(getComputedStyle(e.parentElement).overflowX)&&!e.closest('[style*=overflow-x],.payeeChips,.jrFUChips,.gsChips,.chips,.heroAcctRow,.jrNav,.expSeg,.taskFilters,.statSubSeg,.trendSeg')}});return {{title:!!p.querySelector('h1'),overflow:over}}}})()")
        bad=[k for k,v in res.items() if not v['title'] or v['overflow']]
        print(f'{vw}px: '+('OK' if not bad and not errs else 'PROBLEMS '+str(bad)+' errors '+str(errs[:2])))
        ctx.close()
    b.close()
s.shutdown()
