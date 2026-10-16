"""Production test runner: python3 run.py <suite> -> prod/res_<suite>.json"""
import threading, http.server, socketserver, functools, json, sys, time, importlib.util
from playwright.sync_api import sync_playwright
socketserver.TCPServer.allow_reuse_address=True
ROOT='/home/claude/HabitTracker-web'
HELP="""window.T={w:ms=>new Promise(r=>setTimeout(r,ms||400)),
 ok:(c,d)=>({ok:!!c,d:(d===undefined?'':(typeof d==='string'?d:JSON.stringify(d))).slice(0,220)}),
 vis:s=>{const e=typeof s==='string'?document.querySelector(s):s;return !!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none'},
 q:s=>document.querySelector(s), qa:s=>[...document.querySelectorAll(s)],
 click:s=>{const e=document.querySelector(s);if(!e)throw new Error('missing '+s);e.click();},
 set:(s,v)=>{const e=document.querySelector(s);if(!e)throw new Error('missing '+s);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},
 page:()=>(document.querySelector('.page.on')||{}).id};"""
def run(suite):
    spec=importlib.util.spec_from_file_location('s',f'/home/claude/perf/prod/s_{suite}.py'); mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    port=11000+abs(hash(suite))%800
    H=functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT); H.log_message=lambda *a:None
    srv=socketserver.TCPServer(('127.0.0.1',port),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
    out=[]
    with sync_playwright() as p:
        b=p.chromium.launch(); vp=getattr(mod,'VIEWPORT',(390,844))
        ctx=b.new_context(service_workers='block',viewport={'width':vp[0],'height':vp[1]},device_scale_factor=2,is_mobile=vp[0]<600,has_touch=vp[0]<600,accept_downloads=True)
        ctx.add_init_script(getattr(mod,'INIT',"window.__noAuthGate=true;window.__noSleepGate=true;"))
        pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:160])); pg.on('dialog',lambda d:d.accept())
        pg.goto(f'http://127.0.0.1:{port}/index.html'); pg.wait_for_timeout(900)
        if getattr(mod,'SEED','demo')=='demo': pg.evaluate(open('/home/claude/review/demo_seed.js').read())
        else: pg.evaluate("state.set.onboarded=true;persist({now:true})")
        pg.reload(); pg.wait_for_timeout(1500); pg.evaluate(HELP)
        load_errs=list(errs); errs.clear()
        if load_errs: out.append({'id':f'{suite.upper()}-LOAD','area':suite,'title':'Page loads without errors','ok':False,'d':'; '.join(load_errs)[:220]})
        for c in mod.CASES:
            cid,area,title,js=c[:4]; t0=time.time(); res={'ok':False,'d':''}
            try:
                if js.startswith('PY:'): res=getattr(mod,js[3:])(pg,ctx)
                else:
                    if js.startswith('RELOAD:'): pg.reload(); pg.wait_for_timeout(1500); pg.evaluate(HELP); js=js[7:]
                    res=pg.evaluate(js)
                    if not isinstance(res,dict): res={'ok':bool(res),'d':str(res)[:200]}
            except Exception as e: res={'ok':False,'d':'EXCEPTION: '+str(e).split('\n')[0][:200]}
            e2=list(errs); errs.clear()
            if e2: res['ok']=False; res['d']=(res.get('d','')+' | JS error: '+e2[0])[:260]
            try: pg.evaluate("try{closeSheet()}catch(e){}"); pg.wait_for_timeout(120); pg.evaluate("window.T||("+HELP+")")
            except Exception: pass
            out.append({'id':cid,'area':area,'title':title,'ok':bool(res.get('ok')),'d':res.get('d',''),'ms':int((time.time()-t0)*1000)})
            print(('PASS' if res.get('ok') else 'FAIL'),cid.ljust(9),title[:60].ljust(60),'|',str(res.get('d',''))[:120],flush=True)
        b.close()
    srv.shutdown(); json.dump(out,open(f'/home/claude/perf/prod/res_{suite}.json','w'),indent=1)
    print(f'== {suite}: {sum(1 for r in out if r["ok"])}/{len(out)} passed')
if __name__=='__main__': run(sys.argv[1])
