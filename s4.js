
(function(){
'use strict';
var $=function(id){return document.getElementById(id);};
function esc2(v){return typeof esc==='function'?esc(String(v==null?'':v)):String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function toast(m){if(typeof toastN==='function')toastN(m);}
function pct(n,d){return d?Math.round(n/d*100):0;}
function activeHabits(){return state.habits.filter(function(h){return !h.arch;});}
function dayStats(ds){var due=0,done=0;activeHabits().forEach(function(h){var d=toDate(ds);if(dueOn(h,d)){due++;if(isDone(h,ds)||isFroz(h,ds))done++;}});return{due:due,done:done,pct:pct(done,due)};}
function weekStats(){var end=toDate(today()),start=addDays(end,-6),due=0,done=0;for(var i=0;i<7;i++){var s=dayStats(fmt(addDays(start,i)));due+=s.due;done+=s.done;}return{due:due,done:done,pct:pct(done,due)};}
function overallStreak(){var max=0,which='';activeHabits().forEach(function(h){var s=streak(h);if(s>max){max=s;which=h.name;}});return{n:max,name:which};}
function taskAging(t){var created=Number(t.createdAt)||0;if(!created)return 0;return Math.max(0,Math.floor((Date.now()-created)/86400000));}
function taskAgingLabel(t){var a=taskAging(t);return a===0?'Today':a===1?'1 day':a+' days';}
function taskRisk(t){var st=taskEffectiveStatus(t);if(st==='overdue')return 'Overdue';if(t.dueDate){var dd=dayDiff(today(),t.dueDate);if(dd<=1)return 'Due soon';}if(taskAging(t)>=7)return 'Aging';return '';}

function ensureReviewState(){
 state.set=state.set||{};state.set.dailyReviews=state.set.dailyReviews||{};
 if(typeof state.set.reviewPrompt!=='string')state.set.reviewPrompt='';
}
function renderProDashboard(){
 var host=$('todayProDash');if(!host)return;
 var ws=weekStats(),os=overallStreak(),active=activeHabits();
 var overdue=state.tasks.filter(function(t){return taskEffectiveStatus(t)==='overdue';}).length;
 var dueToday=state.tasks.filter(function(t){return t.dueDate===today()&&taskEffectiveStatus(t)!=='completed';}).length;
 var completedToday=state.tasks.filter(function(t){return t.status==='completed'&&t.completedAt&&fmt(new Date(t.completedAt))===today();}).length;
 var days='';for(var i=6;i>=0;i--){var ds=fmt(addDays(toDate(today()),-i)),s=dayStats(ds);days+='<div class="pdDay"><span>'+toDate(ds).toLocaleDateString(undefined,{weekday:'narrow'})+'</span><i><b style="width:'+Math.max(4,s.pct)+'%"></b></i><em>'+s.pct+'%</em></div>';}
 var html='<div class="proDash"><div class="pdHead"><div><span class="pdEy">WEEKLY PULSE</span><b>Your week at a glance</b></div><span class="pdScore">'+ws.pct+'%</span></div>'+
 '<div class="pdStats"><div><strong>'+ws.done+'</strong><small>completed</small></div><div><strong>'+os.n+'</strong><small>day streak</small></div><div><strong>'+overdue+'</strong><small>overdue</small></div><div><strong>'+dueToday+'</strong><small>due today</small></div></div>'+
 '<div class="pdTrend">'+days+'</div>'+
 '<div class="pdFooter"><span>✓ '+completedToday+' tasks completed today</span><button type="button" data-review-open>Daily review →</button></div></div></div>';
 host.innerHTML=html;
}
function renderReviewCard(){
 var host=$('dailyReviewCard');if(!host)return;
 var r=dayStats(today()), tasks=state.tasks.filter(function(t){return t.dueDate===today()||taskEffectiveStatus(t)==='overdue';}),doneTasks=tasks.filter(function(t){return t.status==='completed';}).length;
 var saved=state.set.dailyReviews[today()];
 host.innerHTML='<div class="reviewCard '+(saved?'reviewDone':'')+'"><div class="reviewIcon">'+(saved?'✓':'◐')+'</div><div class="reviewBody"><div class="reviewTitle">'+(saved?'Daily review completed':'Close the day with a 60-second review')+'</div><div class="reviewSub">Habits '+r.done+'/'+r.due+' · Tasks '+doneTasks+'/'+tasks.length+(saved?' · Saved today':'')+'</div></div><button class="reviewBtn" data-review-open>'+(saved?'View':'Review')+'</button></div>';
}
function openReview(){
 ensureReviewState();var old=$('dailyReviewModal');if(old)old.remove();
 var r=dayStats(today()),ws=weekStats(),os=overallStreak(),saved=state.set.dailyReviews[today()]||{};
 var m=document.createElement('div');m.id='dailyReviewModal';m.className='proModal';m.innerHTML='<div class="proBackdrop" data-review-close></div><div class="proDialog" role="dialog" aria-modal="true"><div class="proDialogHead"><div><span class="pdEy">DAILY REVIEW</span><h2>'+niceDate(today())+'</h2></div><button class="iconClose" data-review-close>×</button></div><div class="reviewMetrics"><div><b>'+r.pct+'%</b><span>Habit completion</span></div><div><b>'+ws.pct+'%</b><span>7-day consistency</span></div><div><b>'+os.n+'</b><span>Current streak</span></div></div><label class="reviewLabel">What went well?</label><textarea id="reviewWin" class="inp reviewInput" maxlength="500" placeholder="One thing you are proud of today…">'+esc2(saved.win||'')+'</textarea><label class="reviewLabel">What needs attention tomorrow?</label><textarea id="reviewNext" class="inp reviewInput" maxlength="500" placeholder="One thing to carry forward…">'+esc2(saved.next||'')+'</textarea><div class="reviewActions"><button class="sbtn" data-review-close>Cancel</button><button class="primary" data-review-save>Save review</button></div></div>';
 document.body.appendChild(m);document.body.classList.add('proModalOpen');setTimeout(function(){var x=$('reviewWin');if(x)x.focus();},120);
}
function closeReview(){var m=$('dailyReviewModal');if(m)m.remove();document.body.classList.remove('proModalOpen');}
function saveReview(){ensureReviewState();state.set.dailyReviews[today()]={win:($('reviewWin')||{}).value||'',next:($('reviewNext')||{}).value||'',savedAt:Date.now()};persist();closeReview();renderReviewCard();renderProDashboard();toast('Daily review saved');}

function enhanceTaskCards(){
 var cards=document.querySelectorAll('#taskList .taskCard');for(var i=0;i<cards.length;i++){var id=cards[i].getAttribute('data-task-id'),t=state.tasks.find(function(x){return x.id===id;});if(!t||t.virtualHabit)continue;var meta=cards[i].querySelector('.taskMeta');if(!meta)continue;var risk=taskRisk(t);var age=taskAging(t);if(risk||age){var old=meta.querySelector('[data-aging]');if(!old){var s=document.createElement('span');s.setAttribute('data-aging','');s.className='taskAging '+(risk==='Overdue'?'bad':risk==='Due soon'?'soon':'');s.textContent=(risk?risk+' · ':'')+'Age '+taskAgingLabel(t);meta.appendChild(s);}}
 }
}
function renderTaskAgingSummary(){
 var host=$('taskAgingSummary');if(!host)return;var active=state.tasks.filter(function(t){return taskEffectiveStatus(t)!=='completed';}),over=active.filter(function(t){return taskEffectiveStatus(t)==='overdue';}).length,old=active.filter(function(t){return taskAging(t)>=7;}).length,soon=active.filter(function(t){return t.dueDate&&dayDiff(today(),t.dueDate)<=1&&taskEffectiveStatus(t)!=='overdue';}).length,avg=active.length?Math.round(active.reduce(function(a,t){return a+taskAging(t);},0)/active.length):0;host.innerHTML='<div><b>'+over+'</b><span>Overdue</span></div><div><b>'+soon+'</b><span>Due soon</span></div><div><b>'+old+'</b><span>7d+ aging</span></div><div><b>'+avg+'d</b><span>Avg age</span></div>';
}
function addSmartInsights(){
 var host=$('proInsights');if(!host)return;var hs=activeHabits(),best=null,worst=null;hs.forEach(function(h){var r=typeof periodRate==='function'?periodRate(h,30):0;if(!best||r>best.r)best={h:h,r:r};if(!worst||r<worst.r)worst={h:h,r:r};});var t=state.tasks.filter(function(x){return taskEffectiveStatus(x)==='overdue';}).length;var lines=[];if(best)lines.push('Your strongest habit is <b>'+esc2(best.h.name)+'</b> at '+Math.round(best.r*100)+'% over 30 days.');if(worst&&hs.length>1)lines.push('<b>'+esc2(worst.h.name)+'</b> is the habit most worth protecting next.');if(t)lines.push('<b>'+t+' actionable'+(t===1?' is':'s are')+' overdue.</b> Clear the oldest one first to reduce backlog.');if(!lines.length)lines.push('Build a few days of data and your personal insights will appear here.');host.innerHTML='<div class="insightPanel"><div class="insightTitle">✦ Smart insights</div>'+lines.map(function(x){return '<div class="insightLine">'+x+'</div>';}).join('')+'</div>';
}

function addFeatureMarkup(){
 var today=$('pgToday');if(today&&!$('todayProDash')){var anchor=$('taskDashSummary');var d=document.createElement('div');d.id='todayProDash';if(anchor)anchor.parentNode.insertBefore(d,anchor);else today.insertBefore(d,today.firstChild);}
 if(today&&!$('dailyReviewCard')){var d2=document.createElement('div');d2.id='dailyReviewCard';var list=$('list');if(list)list.parentNode.insertBefore(d2,list);else today.appendChild(d2);}
 if(today&&!$('proInsights')){var d3=document.createElement('div');d3.id='proInsights';var ai=$('aiInsights');if(ai)ai.parentNode.insertBefore(d3,ai);else today.appendChild(d3);}
 var tasks=$('pgTasks');if(tasks&&!$('taskAgingSummary')){var a=document.createElement('div');a.id='taskAgingSummary';var search=$('taskSearch');if(search)search.parentNode.insertBefore(a,search);else tasks.insertBefore(a,tasks.firstChild);}
}
function bind(){
 document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-review-open]');if(b){e.preventDefault();openReview();return;}b=e.target.closest&&e.target.closest('[data-review-close]');if(b){e.preventDefault();closeReview();return;}b=e.target.closest&&e.target.closest('[data-review-save]');if(b){e.preventDefault();saveReview();return;}
 });
 var oldRenderTasks=window.renderTasks;if(typeof oldRenderTasks==='function'&&!oldRenderTasks.__pro){window.renderTasks=function(){oldRenderTasks();renderTaskAgingSummary();setTimeout(enhanceTaskCards,0);};window.renderTasks.__pro=true;}
 var oldRenderToday=window.renderToday;if(typeof oldRenderToday==='function'&&!oldRenderToday.__pro){window.renderToday=function(){oldRenderToday();renderProDashboard();renderReviewCard();addSmartInsights();};window.renderToday.__pro=true;}
}
function init(){ensureReviewState();addFeatureMarkup();bind();renderProDashboard();renderReviewCard();addSmartInsights();if(typeof renderTasks==='function')renderTasks();if(typeof renderToday==='function')renderToday();}
setTimeout(init,40);
window.__HT_PRO__='productivity-suite-v2';
})();

