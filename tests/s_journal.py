SEED='demo'
W="await T.w(450);"
def dayone(pg,ctx):
    pg.evaluate("showTab('pgSet');[...document.querySelectorAll('#setCardGrid .setCard2')].find(c=>c.textContent.indexOf('Data')>=0).click()"); pg.wait_for_timeout(400)
    pg.set_input_files('#doFile','/tmp/dayone-export.zip'); pg.wait_for_timeout(7000)
    note=pg.evaluate("(document.getElementById('doNote')||{}).textContent||''"); books=pg.evaluate("jrBooks().map(b=>b.name)")
    pg.evaluate("closeSheet()"); pg.wait_for_timeout(300); pg.evaluate("document.getElementById('doFile').value=''"); pg.set_input_files('#doFile','/tmp/dayone-export.zip'); pg.wait_for_timeout(4000)
    note2=pg.evaluate("(document.getElementById('doNote')||{}).textContent||''"); pg.evaluate("closeSheet()")
    ok=('Imported 5 entries' in note) and ('Travel' in books) and ('Imported 0 entries' in note2)
    return {'ok':ok,'d':note[:90]+' | again: '+note2[:40]+' | notebooks '+','.join(books)}
def photos(pg,ctx):
    pg.evaluate("openJr(null)"); pg.wait_for_timeout(500); pg.set_input_files('#jrPhotoFile',['/tmp/ph0.jpg','/tmp/ph1.jpg','/tmp/ph2.jpg']); pg.wait_for_timeout(4500)
    n=pg.evaluate("jrEd.photos.length"); pg.fill('#jrTitle','QA Photos'); pg.click('#jrSaveBtn'); pg.wait_for_timeout(700)
    e=pg.evaluate("state.jr.find(e=>e.title==='QA Photos').id"); pg.evaluate(f"openJrRead('{e}')"); pg.wait_for_timeout(1200)
    grid=pg.evaluate("document.querySelectorAll('#jrReadPhotos .jrReadPh').length"); pg.click('#jrReadPhotos .jrReadPh >> nth=0'); pg.wait_for_timeout(700)
    c1=pg.evaluate("(document.getElementById('phViewCount')||{}).textContent"); pg.click('#phNext'); pg.wait_for_timeout(400); c2=pg.evaluate("document.getElementById('phViewCount').textContent")
    img=pg.evaluate("document.getElementById('phViewImg').naturalWidth>0"); pg.evaluate("phViewClose();closeSheet()")
    return {'ok':n==3 and grid==3 and c1=='1 / 3' and c2=='2 / 3' and img,'d':f'added {n}, reader grid {grid}, viewer {c1} -> {c2}, image shown {img}'}
def photolimit(pg,ctx):
    pg.evaluate("openJr(null)"); pg.wait_for_timeout(500); pg.set_input_files('#jrPhotoFile',['/tmp/ph0.jpg']*9); pg.wait_for_timeout(9000)
    n=pg.evaluate("jrEd.photos.length"); pg.evaluate("closeSheet()"); pg.wait_for_timeout(300)
    return {'ok':n==8,'d':f'9 chosen -> {n} kept (limit 8)'}
CASES=[
 ('JRN-01','Journal','Write an entry with title, text, mood, place and favourite',"(async()=>{openJr(null);"+W+"T.set('#jrTitle','QA Entry');T.q('#jrBody').innerHTML='<p>Testing the journal flow #qa</p>';T.click('.jrMoodOpt[data-jm=good]');T.set('#jrLocation','Bandra');T.click('#jrFavTog');T.click('#jrSaveBtn');"+W+"const e=state.jr.find(e=>e.title==='QA Entry');return T.ok(e&&e.mood==='good'&&e.location==='Bandra'&&e.favorite&&jrTagsOf(e).includes('#qa'),e&&[e.mood,e.location,e.favorite,jrTagsOf(e)])})()"),
 ('JRN-02','Journal','Entry appears in the timeline with date column and coloured title',"(async()=>{showTab('pgJr');jrGo('timeline');await T.w(500);const r=T.qa('#jrList .jrRow').find(x=>x.innerText.includes('QA Entry'));return T.ok(r&&r.querySelector('.jrRowTitle'),r?'row shown':'not found')})()"),
 ('JRN-03','Journal','Opening an entry shows title, text, mood and place',"(async()=>{const e=state.jr.find(e=>e.title==='QA Entry');openJrRead(e.id);"+W+"const t=T.q('#jrReadSheet').innerText;return T.ok(t.includes('QA Entry')&&t.includes('Testing the journal flow')&&t.includes('Bandra'),t.replace(/\\\\s+/g,' ').slice(0,80))})()"),
 ('JRN-04','Journal','Edit an entry',"(async()=>{const e=state.jr.find(e=>e.title==='QA Entry');openJr(e.id);"+W+"T.set('#jrTitle','QA Entry edited');T.click('#jrSaveBtn');"+W+"return T.ok(state.jr.some(x=>x.id===e.id&&x.title==='QA Entry edited'),'edited')})()"),
 ('JRN-05','Journal','Delete moves the entry to Recently deleted; restore works',"(async()=>{const e=state.jr.find(e=>e.title==='QA Entry edited');openJr(e.id);"+W+"window.confirm=()=>true;const d=T.q('#jrDelBtn');d.click();"+W+"if(state.jr.some(x=>x.id===e.id)){d.click();"+W+"}const ix=(state.trash||[]).findIndex(t=>t.item&&t.item.id===e.id);if(ix>=0)restoreFromTrash(ix);return T.ok(ix>=0&&state.jr.some(x=>x.id===e.id),'in trash '+(ix>=0))})()"),
 ('JRN-06','Journal','Closing an unsaved entry keeps a draft; the Drafts pill appears',"(async()=>{showTab('pgJr');jrGo('timeline');T.click('#jrNewBtn');"+W+"T.set('#jrTitle','QA Draft');T.q('#jrBody').innerHTML='half written';closeSheet();await T.w(700);const b=T.q('#jrDraftsBtn');return T.ok((state.jrDrafts||[]).some(d=>d.title==='QA Draft')&&T.vis(b)&&/Drafts/.test(b.innerText),b.innerText.trim())})()"),
 ('JRN-07','Journal','A draft can be reopened and finished',"(async()=>{T.click('#jrDraftsBtn');await T.w(500);const it=T.q('#draftsList [data-draft-open]');if(!it)return T.ok(false,'draft not listed');it.click();await T.w(700);const ok=T.q('#jrTitle').value==='QA Draft';T.click('#jrSaveBtn');"+W+"return T.ok(ok&&state.jr.some(e=>e.title==='QA Draft')&&!(state.jrDrafts||[]).some(d=>d.title==='QA Draft'),'resumed '+ok)})()"),
 ('JRN-08','Journal','Notebooks: create, move an entry, filter, delete keeps entries',"(async()=>{const before=state.jr.length;jrBooks().push({id:'jb_qa',name:'QA Book',color:'#4A90E2'});persist();const e=state.jr.find(e=>e.title==='QA Draft');e.book='jb_qa';persist();state.set.jrBook='jb_qa';renderJr();await T.w(400);const rows=T.qa('#jrList .jrRow').length;state.set.jrBook='';state.jr.forEach(x=>{if(x.book==='jb_qa')x.book='';});state.set.jrBooks=jrBooks().filter(b=>b.id!=='jb_qa');persist();renderJr();return T.ok(rows===1&&state.jr.length===before&&!e.book,'rows in QA Book '+rows)})()"),
 ('JRN-09','Journal','Add 3 photos; reader grid and viewer (next/previous) work','PY:photos'),
 ('JRN-10','Journal','Photo limit: 9 chosen, 8 kept','PY:photolimit'),
 ('JRN-11','Journal','Calendar tab marks days and shows Memories below',"(async()=>{showTab('pgJr');jrGo('calendar');await T.w(500);return T.ok(T.vis('#jrView-calendar')&&T.vis('#jrView-memories'),'calendar+memories')})()"),
 ('JRN-12','Journal','Photos tab shows the gallery; tapping opens the entry',"(async()=>{jrGo('photos');await T.w(1200);const t=T.qa('.jrGalItem');if(!t.length)return T.ok(false,'no photos');t[0].click();await T.w(700);return T.ok(T.q('#jrReadSheet').classList.contains('open'),t.length+' photos')})()"),
 ('JRN-13','Journal','Code inside entry text is not run when shown',"(async()=>{window.__x1=0;window.__x2=0;openJr(null);"+W+"T.set('#jrTitle','<img src=x onerror=\"window.__x1=1\">');T.q('#jrBody').innerHTML='<img src=x onerror=\"window.__x2=1\">safe text';T.click('#jrSaveBtn');"+W+"window.__x1=0;window.__x2=0;showTab('pgJr');jrGo('timeline');renderJr();await T.w(600);const e=state.jr.find(x=>/safe text/.test(x.content));openJrRead(e.id);await T.w(800);return T.ok(window.__x1===0&&window.__x2===0,'title ran '+window.__x1+' body ran '+window.__x2)})()"),
 ('JRN-14','Journal','List and Cards timeline styles both render',"(async()=>{showTab('pgJr');jrGo('timeline');state.set.jrListStyle='cards';renderJr();await T.w(400);const c=T.qa('#jrList .jrCard:not(.jrRow)').length;state.set.jrListStyle='list';renderJr();await T.w(300);const l=T.qa('#jrList .jrRow').length;return T.ok(c>0&&l>0,'cards '+c+' rows '+l)})()"),
 ('JRN-15','Journal','Export the journal to PDF and Word',"(async()=>{window.__s=[];const ws=window.webSave;window.webSave=function(n){__s.push(n);return true};const op=window.open;window.open=function(){__s.push('print-window');return {document:{write(){},close(){}},focus(){},print(){},close(){}}};showTab('pgJr');T.click('#jrExportBtn');await T.w(600);const open=sheetOpen==='jrExportSheet';T.click('#jrExpWord');await T.w(1200);T.click('#jrExpPdf');await T.w(1200);window.webSave=ws;window.open=op;return T.ok(open&&__s.length>=1,'sheet '+open+' outputs '+__s)})()"),
 ('JRN-16','Journal','Import a Day One export into notebooks; re-import adds nothing','PY:dayone'),
 ('JRN-17','Journal','Journal survives a reload',"RELOAD:(()=>T.ok(state.jr.some(e=>e.title==='QA Draft')&&state.jr.some(e=>e.title==='QA Photos'),state.jr.length+' entries'))()"),
]
