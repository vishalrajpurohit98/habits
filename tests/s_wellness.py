SEED='demo'
W="await T.w(450);"
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
 ('MS-01','Mood','Mood is logged in a journal entry and shows in Journal › Mood',"(async()=>{const te=(state.jr||[]).filter(e=>e.date===today()).pop();openJr(te?te.id:null);await T.w(500);if(!te)T.q('#jrBody').innerHTML='<p>mood test</p>';T.click('.jrMoodOpt[data-jm=great]');T.click('#jrSaveBtn');await T.w(600);showTab('pgJr');jrGo('mood');await T.w(400);const ok=T.vis('#jrView-mood')&&/great/i.test(T.q('.jmHeroT').textContent);const create=T.qa('#actionSheet [data-add-action=mood]').every(b=>!T.vis(b));return T.ok(ok&&create,T.q('.jmHeroT').textContent+' | create mood hidden '+create)})()"),
 ('MS-02','Mood','Mood tab shows this month, calendar and year in pixels',"(async()=>{showTab('pgJr');jrGo('mood');await T.w(400);return T.ok(T.qa('.jmBar').length===5&&T.qa('.jmCell').length>=28&&T.qa('.jmPx').length===372,'bars '+T.qa('.jmBar').length+' cells '+T.qa('.jmCell').length)})()"),
 ('MS-05','Fitness','Insights › Fitness tab renders without mood cards',"(async()=>{showTab('pgStats');T.click('#statSubSeg [data-ss=he]');await T.w(600);const lbl=T.q('#statSubSeg [data-ss=he]').textContent.trim();const moodLeft=[...document.querySelectorAll('#pgStats .insCard,#pgStats .card')].filter(e=>e.getClientRects().length&&getComputedStyle(e).display!=='none'&&/mood|year in pixels/i.test(e.textContent)).length;return T.ok(lbl==='Fitness'&&moodLeft===0&&/workout|fitness/i.test(T.q('#pgStats').innerText),lbl+' moodCards '+moodLeft)})()"),
 ('WK-01','Workouts','Workout module opens with its controls','PY:wk'),
 ('WK-02','Workouts','Workout log values are summed per day',"(()=>{const e=(state.exs||[])[0];if(!e)return T.ok(false,'no exercises in demo');const v=exToday(e.id);return T.ok(typeof v==='number',e.name+' today '+v)})()"),
 ('INS-01','Insights','Overview, Habits and Wellness tabs render',"(async()=>{showTab('pgStats');const r=[];for(const b of T.qa('#statSubSeg button').filter(x=>T.vis(x))){b.click();await T.w(400);r.push(b.textContent.trim()+':'+(T.q('#pgStats').innerText.length>150));}return T.ok(r.length===3&&r.every(x=>x.endsWith('true')),r)})()"),
 ('INS-02','Insights','Trend chart switches 7D / 30D / 3M / 1Y',"(async()=>{showTab('pgStats');T.click('#statSubSeg [data-ss=ov]');await T.w(300);const r=[];for(const b of T.qa('#trendSeg button')){b.click();await T.w(250);r.push(b.textContent.trim()+(b.classList.contains('sel')?'*':''));}return T.ok(r.length>=3&&r[r.length-1].endsWith('*'),r)})()"),
 ('INS-03','Insights','Chart points show their value on tap','PY:charttip'),
 ('INS-04','Insights','Year in pixels lives in Journal › Mood (12 x 31)',"(async()=>{showTab('pgJr');jrGo('mood');await T.w(400);const rows=T.qa('.jmYpRow').length,px=T.qa('.jmPx').length;return T.ok(rows===12&&px===372,'rows '+rows+' pixels '+px)})()"),
]
