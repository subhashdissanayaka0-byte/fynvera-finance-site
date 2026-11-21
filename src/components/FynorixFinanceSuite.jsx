import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BellRing, CalendarDays,
  CheckCircle2, Download, FileUp, HeartPulse, Lightbulb, PieChart, Plus,
  RefreshCw, Save, ShieldCheck, Sparkles, Target, TrendingUp, Wallet, X
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { loadLocal, saveLocal } from '../lib/storage.js';

const FINANCE_TABLES = ['finance_transactions','finance_budgets','finance_goals','finance_debts','finance_bills'];
const moneyFmt = (value, currency='USD') => {
  try { return new Intl.NumberFormat(undefined,{style:'currency',currency,maximumFractionDigits:2}).format(Number(value)||0); }
  catch { return currency + ' ' + (Number(value)||0).toFixed(2); }
};
const dateKey = (date) => {
  const d = new Date(date);
  return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
};
const todayKey = () => dateKey(new Date());
const csvCell = (value) => '"' + String(value ?? '').replace(/"/g,'""') + '"';
const downloadText = (name, text, type='text/csv;charset=utf-8') => {
  const blob = new Blob([text],{type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=name; a.click();
  URL.revokeObjectURL(url);
};
const parseCsv = (text) => {
  const rows=[]; let row=[], cell='', quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"' && quoted && text[i+1]==='"'){cell+='"';i++;}
    else if(c==='"') quoted=!quoted;
    else if(c===',' && !quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  row.push(cell); if(row.some(v=>v.trim())) rows.push(row);
  if(!rows.length) return [];
  const headers=rows.shift().map(v=>v.trim().toLowerCase().replace(/\s+/g,'_'));
  return rows.map(values=>Object.fromEntries(headers.map((h,i)=>[h,(values[i]||'').trim()])));
};

function useFinanceRecords(user) {
  const [records,setRecords]=useState({finance_transactions:[],finance_budgets:[],finance_goals:[],finance_debts:[],finance_bills:[]});
  const [loading,setLoading]=useState(true);
  const localKey=(table)=>'fynvera-finance-'+(user?.id||'preview')+'-'+table;
  const refresh=async()=>{
    setLoading(true);
    if(!supabase||!user||user.demo){
      const next={}; FINANCE_TABLES.forEach(t=>next[t]=loadLocal(localKey(t),[]));
      setRecords(next); setLoading(false); return;
    }
    const results=await Promise.all(FINANCE_TABLES.map(t=>supabase.from(t).select('*').eq('user_id',user.id)));
    const next={};
    results.forEach((r,i)=>{next[FINANCE_TABLES[i]]=r.error?[]:(r.data||[]);});
    setRecords(next); setLoading(false);
  };
  useEffect(()=>{let live=true;(async()=>{await refresh();})();return()=>{live=false;};},[user?.id,user?.demo]);
  return {records,loading,refresh,setRecords,localKey};
}

function Panel({children,className=''}) { return <section className={'panel fynorix-suite-panel '+className}>{children}</section>; }
function Metric({label,value,detail,icon:Icon=Activity}) { return <div className="fynorix-metric"><span><Icon size={17}/>{label}</span><strong>{value}</strong>{detail&&<small>{detail}</small>}</div>; }

export function FinancialIntelligenceWorkspace({user,profile,portfolio=[],cryptoPrices={},marketQuotes={},showToast=()=>{}}) {
  const {records,loading}=useFinanceRecords(user);
  const [tab,setTab]=useState('insights');
  const [monthlySaving,setMonthlySaving]=useState('250');
  const [simInitial,setSimInitial]=useState('1000');
  const [simMonthly,setSimMonthly]=useState('200');
  const [simRate,setSimRate]=useState('6');
  const [simYears,setSimYears]=useState('10');
  const currency=profile?.currency||'USD';
  const today=todayKey();
  const tx=records.finance_transactions||[];
  const monthStart=today.slice(0,7)+'-01';
  const monthTx=tx.filter(t=>String(t.occurred_on||'').slice(0,7)===today.slice(0,7));
  const income=monthTx.filter(t=>t.kind==='income').reduce((s,t)=>s+Number(t.amount||0),0);
  const expenses=monthTx.filter(t=>t.kind!=='income').reduce((s,t)=>s+Number(t.amount||0),0);
  const net=income-expenses;
  const savingsRate=income>0?net/income*100:null;
  const budgets=records.finance_budgets.filter(b=>String(b.budget_month||'').slice(0,7)===today.slice(0,7));
  const budgetSpent=(budget)=>monthTx.filter(t=>t.kind!=='income'&&String(t.category||'Other').toLowerCase()===String(budget.category||'').toLowerCase()).reduce((s,t)=>s+Number(t.amount||0),0);
  const debtTotal=records.finance_debts.reduce((s,d)=>s+Number(d.balance||0),0);
  const minimumPayments=records.finance_debts.reduce((s,d)=>s+Number(d.minimum_payment||0),0);
  const goals=records.finance_goals||[];
  const goalsSaved=goals.reduce((s,g)=>s+Number(g.current_amount||0),0);
  const goalsTarget=goals.reduce((s,g)=>s+Number(g.target_amount||0),0);
  const budgetOverspend=budgets.reduce((sum,b)=>sum+Math.max(0,budgetSpent(b)-Number(b.monthly_limit||0)),0);
  const budgetTotal=budgets.reduce((sum,b)=>sum+Number(b.monthly_limit||0),0);
  const budgetScore=budgets.length?Math.max(0,Math.min(25,25*(1-budgetOverspend/Math.max(1,budgetTotal)))):null;
  const scoreParts=[
    {label:'Savings habit',score:savingsRate===null?null:Math.max(0,Math.min(30,savingsRate/20*30)),max:30,detail:savingsRate===null?'Add income and expense transactions':savingsRate.toFixed(1)+'% saved this month'},
    {label:'Budget control',score:budgetScore,max:25,detail:budgets.length?budgets.length+' active category budgets':'Set a monthly budget'},
    {label:'Debt pressure',score:records.finance_debts.length?(income>0?Math.max(0,25-Math.min(25,minimumPayments/income*100)):12.5):null,max:25,detail:records.finance_debts.length?moneyFmt(debtTotal,currency)+' tracked debt':'Add debt details if you have any'},
    {label:'Savings progress',score:goals.length?Math.min(20,goalsTarget>0?goalsSaved/goalsTarget*20:0):null,max:20,detail:goals.length?moneyFmt(goalsSaved,currency)+' saved toward goals':'Create a savings goal'}
  ];
  const available=scoreParts.filter(p=>p.score!==null);
  const score=available.length?Math.round(available.reduce((s,p)=>s+p.score,0)/available.reduce((s,p)=>s+p.max,0)*100):null;
  const insights=[];
  if(savingsRate!==null) insights.push(savingsRate>=20?'Your savings rate is at least 20% this month. Keep the habit consistent.':savingsRate>=0?'Your cash flow is positive. Try increasing savings gradually.':'Your recorded expenses are higher than income this month. Review flexible spending first.');
  if(budgets.length) budgets.forEach(b=>{const spent=budgetSpent(b),limit=Number(b.monthly_limit||0);if(limit>0&&spent>limit)insights.push(b.category+' is over budget by '+moneyFmt(spent-limit,currency)+'.');else if(limit>0&&spent/limit>=.8)insights.push(b.category+' has used '+Math.round(spent/limit*100)+'% of its budget.');});
  if(records.finance_debts.length) insights.push('Your tracked debt is '+moneyFmt(debtTotal,currency)+'. Compare interest rates before choosing a repayment order.');
  if(!insights.length) insights.push('Add a few income, expense, budget and savings records to unlock more useful personal insights.');
  const allocation={};
  portfolio.forEach(item=>{
    const type=item.type||item.asset_type||'Other';
    const symbol=String(item.symbol||'').toUpperCase();
    const qSymbol=item.quoteSymbol||item.quote_symbol||(type==='Crypto'?symbol+'USDT':symbol);
    const ticker=cryptoPrices[qSymbol];
    const quote=marketQuotes[qSymbol]||marketQuotes[qSymbol.replace(/[^A-Z0-9]/g,'')];
    const price=Number(ticker?.lastPrice??quote?.mid??quote?.lastPrice??quote?.bid??0);
    const amount=Number(item.quantity||1);
    const value=price>0?price*amount:Number(item.currentValue??item.value??item.current_value??item.investedValue??item.cost_basis??0);
    if(value>0)allocation[type]=(allocation[type]||0)+value;
  });
  const totalAllocation=Object.values(allocation).reduce((s,v)=>s+v,0);
  const goalRemaining=goals.reduce((s,g)=>s+Math.max(0,Number(g.target_amount||0)-Number(g.current_amount||0)),0);
  const monthly=Number(monthlySaving);
  const predictorMonths=monthly>0?Math.ceil(goalRemaining/monthly):null;
  const initial=Math.max(0,Number(simInitial)||0),contribution=Math.max(0,Number(simMonthly)||0),rate=(Number(simRate)||0)/100/12,months=Math.max(0,Math.min(1200,(Number(simYears)||0)*12));
  const futureValue=rate===0?initial+contribution*months:initial*Math.pow(1+rate,months)+contribution*(Math.pow(1+rate,months)-1)/rate;
  const invested=initial+contribution*months;
  const dueBills=(records.finance_bills||[]).filter(b=>b.active!==false).map(b=>({ ...b, days:Math.ceil((new Date((b.next_due||today)+'T12:00:00')-new Date(today+'T12:00:00'))/86400000)})).sort((a,b)=>a.days-b.days);
  const dueSoon=dueBills.filter(b=>b.days<=30);
  const tabs=[['insights','Smart insights'],['score','Health score'],['allocation','Portfolio mix'],['savings','Savings predictor'],['bills','Bills calendar'],['simulator','Future simulator']];
  return <div className="fynorix-suite">
    <div className="workspace-welcome"><div><div className="eyebrow"><span/> YOUR PERSONAL FINANCIAL INTELLIGENCE</div><h1>Financial Intelligence</h1><p>Understand your money, plan ahead and make informed decisions using your own saved records.</p></div><span className="data-pill"><ShieldCheck size={14}/> PRIVATE WORKSPACE</span></div>
    <div className="fynorix-suite-tabs">{tabs.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div>
    {loading?<Panel><p>Loading your private finance records…</p></Panel>:<>
      {tab==='insights'&&<><div className="fynorix-metrics-grid"><Metric label="Income this month" value={moneyFmt(income,currency)} icon={TrendingUp}/><Metric label="Expenses this month" value={moneyFmt(expenses,currency)} icon={ArrowDownRight}/><Metric label="Net cash flow" value={moneyFmt(net,currency)} icon={Wallet}/><Metric label="Savings rate" value={savingsRate===null?'—':savingsRate.toFixed(1)+'%'} icon={HeartPulse}/></div><Panel><h3><Sparkles size={19}/> Smart financial insights</h3><p className="fynorix-muted">Rule-based observations from your recorded transactions and plans. No paid AI service or bank connection is required.</p><div className="fynorix-insight-list">{insights.map((item,i)=><div key={i}><Lightbulb size={18}/><span>{item}</span></div>)}</div>{budgets.length>0&&<div className="fynorix-budget-bars">{budgets.map(b=>{const spent=budgetSpent(b),limit=Number(b.monthly_limit||0),pct=limit>0?Math.min(100,spent/limit*100):0;return <div key={b.id}><div><strong>{b.category}</strong><span>{moneyFmt(spent,currency)} / {moneyFmt(limit,currency)}</span></div><div className="fynorix-progress"><i style={{width:pct+'%'}}/></div></div>})}</div>}</Panel></>}
      {tab==='score'&&<Panel><div className="fynorix-score-head"><div><h3><HeartPulse size={19}/> Financial health score</h3><p className="fynorix-muted">An educational snapshot based on the information currently recorded.</p></div><div className="fynorix-score-circle"><strong>{score===null?'—':score}</strong><small>/ 100</small></div></div><div className="fynorix-score-parts">{scoreParts.map(p=><div key={p.label}><div><strong>{p.label}</strong><span>{p.score===null?'Not enough data':Math.round(p.score)+' / '+p.max}</span></div><small>{p.detail}</small><div className="fynorix-progress"><i style={{width:(p.score===null?0:p.score/p.max*100)+'%'}}/></div></div>)}</div><p className="fynorix-disclaimer">This is a simple educational indicator, not a credit score, lending decision or professional financial assessment. Missing data is not treated as proof of financial strength.</p></Panel>}
      {tab==='allocation'&&<><div className="fynorix-metrics-grid"><Metric label="Tracked portfolio value" value={moneyFmt(totalAllocation,currency)} icon={PieChart}/><Metric label="Asset groups" value={Object.keys(allocation).length} icon={Activity}/></div><Panel><h3><PieChart size={19}/> Portfolio allocation analyzer</h3><p className="fynorix-muted">Distribution is estimated from available live quotes, then saved values or cost basis. Unpriced assets may be omitted.</p>{Object.keys(allocation).length?<div className="fynorix-allocation-list">{Object.entries(allocation).sort((a,b)=>b[1]-a[1]).map(([type,value])=><div key={type}><div><strong>{type}</strong><span>{moneyFmt(value,currency)} · {totalAllocation?((value/totalAllocation)*100).toFixed(1):0}%</span></div><div className="fynorix-progress"><i style={{width:(totalAllocation?value/totalAllocation*100:0)+'%'}}/></div></div>)}</div>:<p>No priced holdings yet. Add assets to My Portfolio to see the breakdown.</p>}</Panel></>}
      {tab==='savings'&&<Panel><h3><Target size={19}/> Savings goal predictor</h3><p className="fynorix-muted">Estimate how long it may take to reach the remaining balance across your saved goals.</p><div className="fynorix-metrics-grid"><Metric label="Remaining across goals" value={moneyFmt(goalRemaining,currency)} icon={Target}/><Metric label="Already saved" value={moneyFmt(goalsSaved,currency)} icon={Wallet}/></div><label className="field-label">How much can you save each month?<input className="plain-field" type="number" min="0" step="0.01" value={monthlySaving} onChange={e=>setMonthlySaving(e.target.value)}/></label><div className="fynorix-predict-result">{goals.length===0?'Add a savings goal to calculate your estimated finish date.':goalRemaining<=0?'Your recorded savings goals are fully funded.':predictorMonths===null?'Enter a monthly amount greater than zero.':<><strong>{predictorMonths} months</strong><span>Estimated time to reach the remaining target, assuming regular deposits and no withdrawals.</span><small>Estimated finish: {new Date(Date.now()+predictorMonths*30.4375*86400000).toLocaleDateString(undefined,{month:'long',year:'numeric'})}</small></>}</div>{goals.map(g=><div className="fynorix-goal-row" key={g.id}><span>{g.title}</span><strong>{moneyFmt(g.current_amount,currency)} / {moneyFmt(g.target_amount,currency)}</strong></div>)}</Panel>}
      {tab==='bills'&&<><div className="fynorix-metrics-grid"><Metric label="Active bills" value={dueBills.length} icon={CalendarDays}/><Metric label="Due in 30 days" value={dueSoon.length} icon={BellRing}/><Metric label="Overdue" value={dueBills.filter(b=>b.days<0).length} icon={AlertTriangle}/></div><Panel><h3><CalendarDays size={19}/> Bills calendar</h3><p className="fynorix-muted">Upcoming dates are based on the next due date saved in Bills & Subscriptions.</p>{dueBills.length?dueBills.map(b=><div className="fynorix-bill-row" key={b.id}><div><strong>{b.name}</strong><small>{b.category||'Bill'} · {b.frequency||'recurring'}</small></div><strong>{moneyFmt(b.amount,currency)}</strong><span className={b.days<0?'overdue':b.days<=7?'soon':''}>{b.days<0?Math.abs(b.days)+' days overdue':b.days===0?'Due today':'Due in '+b.days+' days'}</span></div>):<p>No active bills saved yet. Add them in Bills & Subscriptions.</p>}</Panel></>}
      {tab==='simulator'&&<Panel><h3><TrendingUp size={19}/> Financial future simulator</h3><p className="fynorix-muted">Explore a hypothetical investment balance with monthly contributions and a constant annual return assumption.</p><div className="fynorix-simulator-fields"><label className="field-label">Starting amount<input className="plain-field" type="number" min="0" value={simInitial} onChange={e=>setSimInitial(e.target.value)}/></label><label className="field-label">Monthly contribution<input className="plain-field" type="number" min="0" value={simMonthly} onChange={e=>setSimMonthly(e.target.value)}/></label><label className="field-label">Assumed annual return (%)<input className="plain-field" type="number" min="-99" max="100" step="0.1" value={simRate} onChange={e=>setSimRate(e.target.value)}/></label><label className="field-label">Years<input className="plain-field" type="number" min="0" max="100" value={simYears} onChange={e=>setSimYears(e.target.value)}/></label></div><div className="fynorix-simulator-result"><small>ESTIMATED FUTURE VALUE</small><strong>{moneyFmt(futureValue,currency)}</strong><div><span>Total contributions: {moneyFmt(invested,currency)}</span><span>Illustrative growth: {moneyFmt(futureValue-invested,currency)}</span></div></div><p className="fynorix-disclaimer">Assumes monthly deposits and monthly compounding at a constant rate. Actual returns vary, may be negative, and are never guaranteed. Fees, taxes and inflation are excluded.</p></Panel>}
    </>}
  </div>;
}

export function PriceAlertsWorkspace({user,cryptoPrices={},marketQuotes={},showToast=()=>{}}) {
  const [alerts,setAlerts]=useState([]);
  const [symbol,setSymbol]=useState('BTC');
  const [assetType,setAssetType]=useState('Crypto');
  const [direction,setDirection]=useState('above');
  const [target,setTarget]=useState('');
  const [busy,setBusy]=useState(false);
  const key='fynorix-price-alerts-'+(user?.id||'preview');
  const getPrice=(a)=>{
    const q=a.quote_symbol||a.quoteSymbol||(a.asset_type==='Crypto'?a.symbol+'USDT':a.symbol);
    const ticker=cryptoPrices[q]; const quote=marketQuotes[q]||marketQuotes[q.replace(/[^A-Z0-9]/g,'')];
    const p=Number(ticker?.lastPrice??quote?.mid??quote?.lastPrice??quote?.bid??0);
    return p>0?p:null;
  };
  const load=async()=>{
    if(supabase&&user&&!user.demo){const {data,error}=await supabase.from('price_alerts').select('*').eq('user_id',user.id).order('created_at',{ascending:false});if(!error)setAlerts(data||[]);}
    else setAlerts(loadLocal(key,[]));
  };
  useEffect(()=>{load();},[user?.id,user?.demo]);
  useEffect(()=>{
    const crossed=alerts.filter(a=>a.active&&getPrice(a)!==null&&(a.direction==='above'?getPrice(a)>=Number(a.target_price):getPrice(a)<=Number(a.target_price)));
    if(!crossed.length)return;
    crossed.forEach(async a=>{
      const updated={...a,active:false,triggered_at:new Date().toISOString()};
      setAlerts(current=>current.map(x=>x.id===a.id?updated:x));
      if(supabase&&user&&!user.demo) await supabase.from('price_alerts').update({active:false,triggered_at:updated.triggered_at}).eq('id',a.id).eq('user_id',user.id);
      else saveLocal(key,alerts.map(x=>x.id===a.id?updated:x));
      showToast(a.symbol+' reached your '+a.direction+' price alert at '+getPrice(a)+'.','success');
    });
  },[alerts,cryptoPrices,marketQuotes]);
  const add=async(e)=>{
    e.preventDefault(); const price=Number(target);
    if(!user){showToast('Sign in to save price alerts.','error');return;}
    if(!Number.isFinite(price)||price<=0){showToast('Enter a target price greater than zero.','error');return;}
    const q=assetType==='Crypto'?(symbol.toUpperCase().endsWith('USDT')?symbol.toUpperCase():symbol.toUpperCase()+'USDT'):symbol.toUpperCase().replace('/','');
    const payload={user_id:user.id,symbol:symbol.toUpperCase(),asset_type:assetType,quote_symbol:q,direction,target_price:price,active:true};
    setBusy(true);
    try{
      if(supabase&&!user.demo){const {data,error}=await supabase.from('price_alerts').insert(payload).select('*').single();if(error)throw error;setAlerts(v=>[data,...v]);}
      else {const row={...payload,id:'local-'+Date.now(),created_at:new Date().toISOString()};setAlerts(v=>[row,...v]);saveLocal(key,[row,...alerts]);}
      setTarget('');showToast('Price alert saved. It will be checked while this workspace is open.','success');
    }catch(err){showToast(err.message||'Could not save alert.','error');}finally{setBusy(false);}
  };
  const remove=async(a)=>{
    if(supabase&&user&&!user.demo&&!String(a.id).startsWith('local-')){const {error}=await supabase.from('price_alerts').delete().eq('id',a.id).eq('user_id',user.id);if(error){showToast(error.message,'error');return;}}
    const next=alerts.filter(x=>x.id!==a.id);setAlerts(next);saveLocal(key,next);
  };
  return <div className="fynorix-suite"><div className="workspace-welcome"><div><div className="eyebrow"><span/> PERSONAL MARKET MONITOR</div><h1>Price Alerts</h1><p>Set a target for supported market symbols and get an in-workspace alert when the live quote crosses it.</p></div><span className="data-pill"><BellRing size={14}/> LIVE QUOTE CHECKS</span></div>
    <Panel><h3><Plus size={19}/> Create a price alert</h3><form className="fynorix-alert-form" onSubmit={add}><label className="field-label">Asset type<select className="select-field" value={assetType} onChange={e=>{setAssetType(e.target.value);setSymbol(e.target.value==='Crypto'?'BTC':e.target.value==='Gold'?'XAUUSD':e.target.value==='Forex'?'EURUSD':'AAPL')}}>{['Crypto','Stock','ETF','Gold','Silver','Forex','Index'].map(x=><option key={x}>{x}</option>)}</select></label><label className="field-label">Symbol<input className="plain-field" value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())} required placeholder="BTC, AAPL, XAUUSD"/></label><label className="field-label">Condition<select className="select-field" value={direction} onChange={e=>setDirection(e.target.value)}><option value="above">Price rises to / above</option><option value="below">Price falls to / below</option></select></label><label className="field-label">Target price (USD)<input className="plain-field" type="number" min="0.00000001" step="any" value={target} onChange={e=>setTarget(e.target.value)} required/></label><button className="button button-primary" disabled={busy}>{busy?'Saving…':'Save alert'}</button></form></Panel>
    <Panel><h3>Your alerts</h3>{alerts.length?alerts.map(a=>{const p=getPrice(a);return <div className="fynorix-alert-row" key={a.id}><div><strong>{a.symbol}</strong><small>{a.asset_type} · {a.direction==='above'?'Above':'Below'} {moneyFmt(a.target_price,'USD')}</small></div><span className={a.active?'active':a.triggered_at?'triggered':'inactive'}>{a.triggered_at?'Triggered':a.active?'Monitoring':'Paused'}</span><span>{p===null?'Quote unavailable':moneyFmt(p,'USD')}</span><button className="icon-button" onClick={()=>remove(a)} aria-label="Delete alert"><X size={16}/></button></div>}):<p>No alerts yet. Add a target above to start monitoring.</p>}<p className="fynorix-disclaimer">Alerts are evaluated while the FYNORIX workspace is open and fresh quote data is available. They are not guaranteed push notifications or exchange orders. Closed, stale or unsupported quotes are not treated as live triggers.</p></Panel>
  </div>;
}

export function MarketNewsIntelligenceWorkspace({articles=[]}) {
  const [filter,setFilter]=useState('All');
  const scored=useMemo(()=>articles.filter(a=>a.contentType!=='topic').map(a=>{
    const text=(a.title+' '+(a.excerpt||'')+' '+(a.body||[]).join(' ')).toLowerCase();
    const positive=['growth','gain','rally','record high','surge','beat expectations','profit','upgrade','approval','adoption','recovery'];
    const negative=['loss','drop','fall','crash','risk','warning','decline','recession','lawsuit','hack','inflation','layoff','downgrade'];
    const p=positive.reduce((n,w)=>n+(text.includes(w)?1:0),0),n=negative.reduce((v,w)=>v+(text.includes(w)?1:0),0);
    return {...a,tone:p>n?'Positive wording':n>p?'Cautious wording':'Mixed / neutral wording',toneScore:p-n};
  }),[articles]);
  const categories=['All',...new Set(scored.map(a=>a.category).filter(Boolean))];
  const visible=scored.filter(a=>filter==='All'||a.category===filter);
  return <div className="fynorix-suite"><div className="workspace-welcome"><div><div className="eyebrow"><span/> MARKET & EDITORIAL CONTEXT</div><h1>Market News Intelligence</h1><p>Review recent FYNORIX insights with a lightweight keyword-based tone scan.</p></div><span className="data-pill"><Activity size={14}/> EDITORIAL SIGNALS</span></div>
    <Panel><div className="fynorix-filter-row">{categories.map(c=><button key={c} className={filter===c?'active':''} onClick={()=>setFilter(c)}>{c}</button>)}</div>{visible.length?visible.map(a=><article className="fynorix-news-row" key={a.id}><div><strong>{a.title}</strong><small>{a.category||'Insights'} · {a.date||'Recently'}</small><p>{a.excerpt||'Open this insight to read the full article.'}</p></div><span className={a.tone.startsWith('Positive')?'positive':a.tone.startsWith('Cautious')?'cautious':'neutral'}>{a.tone}</span></article>):<p>No articles match this category.</p>}<p className="fynorix-disclaimer">This is a simple text-keyword indicator of wording in FYNORIX articles, not real-time market sentiment, investment research or a trading signal. Always read the source and verify facts independently.</p></Panel>
  </div>;
}

export function ImportExportWorkspace({user,profile,portfolio=[],showToast=()=>{}}) {
  const [busy,setBusy]=useState(false);
  const [preview,setPreview]=useState([]);
  const [fileName,setFileName]=useState('');
  const currency=profile?.currency||'USD';
  const key='fynvera-finance-'+(user?.id||'preview')+'-finance_transactions';
  const exportTransactions=async()=>{
    let rows=loadLocal(key,[]);
    if(supabase&&user&&!user.demo){const {data,error}=await supabase.from('finance_transactions').select('*').eq('user_id',user.id).order('occurred_on',{ascending:false});if(error){showToast(error.message,'error');return;}rows=data||[];}
    const headers=['title','amount','kind','category','occurred_on','notes'];
    downloadText('FYNORIX_transactions_'+todayKey()+'.csv',[headers.join(','),...rows.map(r=>headers.map(h=>csvCell(r[h])).join(','))].join('\n'));
    showToast('Transaction CSV exported.','success');
  };
  const exportPortfolio=()=>{
    const headers=['symbol','type','quantity','buyPrice','fees','purchaseDate','value'];
    downloadText('FYNORIX_portfolio_'+todayKey()+'.csv',[headers.join(','),...portfolio.map(r=>headers.map(h=>csvCell(r[h]??(h==='value'?r.currentValue:r[h.replace(/[A-Z]/g,m=>'_'+m.toLowerCase())]))).join(','))].join('\n'));
    showToast('Portfolio CSV exported.','success');
  };
  const readFile=async(e)=>{
    const f=e.target.files?.[0];if(!f)return;setFileName(f.name);
    const text=await f.text();const rows=parseCsv(text);
    const normalized=rows.map(r=>({title:r.title||r.description||r.name||'',amount:Number(r.amount),kind:(r.kind||r.type||'expense').toLowerCase(),category:r.category||'Other',occurred_on:r.occurred_on||r.date||todayKey(),notes:r.notes||''}));
    setPreview(normalized.filter(r=>r.title&&Number.isFinite(r.amount)&&r.amount>=0&&['income','expense'].includes(r.kind)));
  };
  const importRows=async()=>{
    if(!user){showToast('Sign in before importing private records.','error');return;}
    if(!preview.length){showToast('Choose a valid CSV with title, amount, kind and date columns.','error');return;}
    setBusy(true);
    try{
      if(supabase&&!user.demo){const payload=preview.map(r=>({...r,user_id:user.id}));const {error}=await supabase.from('finance_transactions').insert(payload);if(error)throw error;}
      else {const old=loadLocal(key,[]);saveLocal(key,[...preview.map((r,i)=>({...r,id:'local-import-'+Date.now()+'-'+i,created_at:new Date().toISOString()})),...old]);}
      showToast(preview.length+' transactions imported.','success');setPreview([]);setFileName('');
    }catch(err){showToast(err.message||'CSV import failed.','error');}finally{setBusy(false);}
  };
  return <div className="fynorix-suite"><div className="workspace-welcome"><div><div className="eyebrow"><span/> YOUR DATA, YOUR CONTROL</div><h1>Import & Export</h1><p>Move your personal finance records with simple CSV files.</p></div><span className="data-pill"><ShieldCheck size={14}/> ACCOUNT DATA</span></div>
    <div className="fynorix-export-grid"><Panel><h3><Download size={19}/> Export records</h3><p className="fynorix-muted">Download a copy of your transactions or portfolio as a CSV spreadsheet.</p><button className="button button-primary" onClick={exportTransactions}><Download size={16}/> Export transactions</button><button className="button button-outline" onClick={exportPortfolio}><Download size={16}/> Export portfolio</button><small>Currency: {currency}. CSV files can be opened in Excel, Google Sheets or LibreOffice.</small></Panel>
      <Panel><h3><FileUp size={19}/> Import transactions</h3><p className="fynorix-muted">Select a CSV file with columns such as title, amount, kind, category, occurred_on and notes.</p><label className="button button-outline fynorix-file-label"><FileUp size={16}/> Choose CSV<input type="file" accept=".csv,text/csv" onChange={readFile}/></label>{fileName&&<small>{fileName} · {preview.length} valid rows</small>}{preview.length>0&&<><div className="fynorix-import-preview">{preview.slice(0,5).map((r,i)=><div key={i}><strong>{r.title}</strong><span>{r.kind} · {moneyFmt(r.amount,currency)} · {r.occurred_on}</span></div>)}</div><button className="button button-primary" onClick={importRows} disabled={busy}>{busy?'Importing…':'Import '+preview.length+' transactions'}</button></>}</Panel></div>
    <p className="fynorix-disclaimer">Import adds new transaction rows; it does not overwrite existing records. Check the preview before importing. Never upload bank login details, full card numbers or passwords.</p>
  </div>;
}

const DEFAULT_DASHBOARD_CARDS={reports:true,summary:true,portfolio:true,actions:true,articles:true};
export function DashboardCustomizationWorkspace({showToast=()=>{}}) {
  const [cards,setCards]=useState(()=>({...DEFAULT_DASHBOARD_CARDS,...loadLocal('fynorix-dashboard-layout-v1',{})}));
  const labels={reports:'Financial reports',summary:'Overview cards',portfolio:'Portfolio table',actions:'Quick actions',articles:'Latest insights'};
  const toggle=(key)=>setCards(v=>({...v,[key]:!v[key]}));
  const save=()=>{saveLocal('fynorix-dashboard-layout-v1',cards);window.dispatchEvent(new CustomEvent('fynorix-dashboard-layout-change',{detail:cards}));showToast('Dashboard layout saved.','success');};
  const reset=()=>{setCards(DEFAULT_DASHBOARD_CARDS);saveLocal('fynorix-dashboard-layout-v1',DEFAULT_DASHBOARD_CARDS);window.dispatchEvent(new CustomEvent('fynorix-dashboard-layout-change',{detail:DEFAULT_DASHBOARD_CARDS}));showToast('Default dashboard restored.','success');};
  return <div className="fynorix-suite"><div className="workspace-welcome"><div><div className="eyebrow"><span/> YOUR WORKSPACE, YOUR WAY</div><h1>Dashboard Customization</h1><p>Choose which sections appear on your Dashboard. Your other workspace pages remain unchanged.</p></div><span className="data-pill"><Save size={14}/> PERSONAL LAYOUT</span></div><Panel><h3>Dashboard sections</h3>{Object.entries(labels).map(([key,label])=><label className="fynorix-toggle-row" key={key}><span><strong>{label}</strong><small>{key==='summary'?'Portfolio, saved insights and watchlist overview':key==='reports'?'Weekly, monthly and yearly financial reports':'Show or hide this dashboard section'}</small></span><input type="checkbox" checked={Boolean(cards[key])} onChange={()=>toggle(key)}/></label>)}<div className="fynorix-button-row"><button className="button button-primary" onClick={save}><Save size={16}/> Save layout</button><button className="button button-outline" onClick={reset}>Restore defaults</button></div></Panel></div>;
}

export function readDashboardLayout() {
  return {...DEFAULT_DASHBOARD_CARDS,...loadLocal('fynorix-dashboard-layout-v1',{})};
}
