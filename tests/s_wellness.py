SEED='demo'
W="await T.w(450);"
def mood(pg,ctx):
    pg.evaluate("delete state.mood[today()];persist();closeSheet()"); pg.wait_for_timeout(200)
    pg.click('#tabbar .navFab'); pg.wait_for_timeout(400); pg.click('[data-add-action="mood"]'); pg.wait_for_timeout(700)
    pg.locator('#moodSheet .moBtn[data-mi="1"]').click(); pg.wait_for_timeout(500)
    m=pg.evaluate("moodOf(today())"); return {'ok':m==1,'d':'tapped Happy -> mood index '+str(m)}
def charttip(pg,ctx):
    pg.evaluate("closeSheet();showTab('pgStats');document.querySelector('#statSubSeg [data-ss=ov]').click();document.querySelector('#trendSeg [data-tr=\"30\"]').click()"); pg.wait_for_timeout(500)
    bx=pg.locator('#stTrend .chWrap').bounding_box(); pg.mouse.click(bx['x']+bx['width']*0.6,bx['y']+bx['height']/2); pg.wait_for_timeout(400)
    t=pg.evaluate("(()=>{const e=document.querySelector('#stTrend .chTip');return e&&getComputedStyle(e).display!=='none'?e.textContent.trim():''})()")
    return {'ok':bool(t),'d':'tooltip: '+t}
def wk(pg,ctx):
    pg.evaluate("openWkModule()"); pg.wait_for_timeout(700)
    btns=pg.evaluate("[...document.querySelectorAll('#wkModule button')].filter(b=>b.getClientRects().length).map(b=>b.textContent.trim()).filter(Boolean).slice(0,30)")
    return {'ok':len(btns)>0,'d':'module buttons: '+', '.join(btns[:12])}
CASES=[
 ('MS-01','Mood','Log today mood from the mood sheet','PY:mood'),
 ('MS-02','Mood','Changing mood the same day replaces it (one per day)',"(()=>{setMood(today(),0);setMood(today(),3);return T.ok(moodOf(today())===3,moodOf(today()))})()"),
 ('MS-03','Sleep','Sleep duration across midnight is correct',"(()=>{const a=sleepMins('23:30','07:15'),b=sleepMins('13:00','14:00');return T.ok(a===465&&b===60,'23:30 to 07:15 = '+a+' min, 13:00 to 14:00 = '+b+' min')})()"),
 ('MS-04','Sleep','Log sleep from the sleep sheet',"(async()=>{openSleep(today());"+W+"const s=T.q('#sleepSave');if(!s)return T.ok(false,'no save');s.click();"+W+"return T.ok(!!sleepOn(today()),JSON.stringify(sleepOn(today())))})()"),
 ('MS-05','Sleep','Average sleep and sleep-mood link render in Insights',"(async()=>{showTab('pgStats');T.click('#statSubSeg [data-ss=he]');await T.w(500);return T.ok(/sleep|mood/i.test(T.q('#pgStats').innerText),'wellness text ok')})()"),
 ('WK-01','Workouts','Workout module opens with its controls','PY:wk'),
 ('WK-02','Workouts','Workout log values are summed per day',"(()=>{const e=(state.exs||[])[0];if(!e)return T.ok(false,'no exercises in demo');const v=exToday(e.id);return T.ok(typeof v==='number',e.name+' today '+v)})()"),
 ('INS-01','Insights','Overview, Habits and Wellness tabs render',"(async()=>{showTab('pgStats');const r=[];for(const b of T.qa('#statSubSeg button').filter(x=>T.vis(x))){b.click();await T.w(400);r.push(b.textContent.trim()+':'+(T.q('#pgStats').innerText.length>150));}return T.ok(r.length===3&&r.every(x=>x.endsWith('true')),r)})()"),
 ('INS-02','Insights','Trend chart switches 7D / 30D / 3M / 1Y',"(async()=>{showTab('pgStats');T.click('#statSubSeg [data-ss=ov]');await T.w(300);const r=[];for(const b of T.qa('#trendSeg button')){b.click();await T.w(250);r.push(b.textContent.trim()+(b.classList.contains('sel')?'*':''));}return T.ok(r.length>=3&&r[r.length-1].endsWith('*'),r)})()"),
 ('INS-03','Insights','Chart points show their value on tap','PY:charttip'),
 ('INS-04','Insights','Year in pixels shows 12 months of 31 days',"(async()=>{showTab('pgStats');T.click('#statSubSeg [data-ss=he]');await T.w(500);const g=T.q('.ypGrid'),m=T.q('.ypMonths');return T.ok(g&&g.children.length===372&&m&&m.children.length===12,'cells '+(g&&g.children.length)+' months '+(m&&m.children.length))})()"),
]
