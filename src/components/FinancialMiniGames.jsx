import React, { useEffect, useState } from 'react';

const GAME_LIBRARY = [
  {id:'money-iq',title:'Money IQ',category:'Financial literacy',icon:'🧠',description:'Build confidence with everyday money concepts.',levels:[
    [{q:'What is a budget?',o:['A plan for income and spending','A type of investment','A bank account'],a:0,e:'A budget gives your money a plan before you spend it.'},{q:'What is an emergency fund for?',o:['Speculative trading','Unexpected essential costs','Luxury shopping'],a:1,e:'Emergency savings can help with unexpected essential expenses.'}],
    [{q:'What does inflation mean?',o:['Prices generally rise over time','All prices fall','Interest disappears'],a:0,e:'Inflation is a broad increase in prices that reduces purchasing power.'},{q:'What is liquidity?',o:['How quickly an asset can be converted to cash','A guaranteed profit','A loan term'],a:0,e:'Liquidity describes how easily an asset can be bought or sold.'}],
    [{q:'What is compound interest?',o:['Interest only on the original amount','Returns earned on principal and prior returns','A fixed bank fee'],a:1,e:'Compounding means returns can earn returns over time.'},{q:'Why compare APR when borrowing?',o:['It helps compare borrowing costs','It predicts stock prices','It removes all loan risk'],a:0,e:'APR helps show the annualized cost of borrowing.'}]
  ]},
  {id:'budget-builder',title:'Budget Builder',category:'Personal finance',icon:'🧩',description:'Make smart spending choices and balance a monthly plan.',levels:[
    [{q:'Your income is $2,000. Essentials cost $1,200. What remains?',o:['$600','$800','$1,200'],a:1,e:'$2,000 minus $1,200 leaves $800.'},{q:'Which is usually a fixed expense?',o:['Monthly rent','A surprise repair','An occasional gift'],a:0,e:'Rent is often a recurring fixed cost.'}],
    [{q:'Your plan is $100 over budget. What is a sensible first step?',o:['Ignore the difference','Review flexible spending','Borrow immediately'],a:1,e:'Review flexible categories before borrowing.'},{q:'What is a sinking fund?',o:['Money set aside for a planned future cost','A credit card balance','A high-risk asset'],a:0,e:'A sinking fund spreads a known future cost over time.'}],
    [{q:'You receive an unexpected $300. What is a balanced approach?',o:['Spend it all instantly','Consider goals, debt and savings','Assume it must be invested'],a:1,e:'Choose based on your priorities and financial plan.'},{q:'What does zero-based budgeting mean?',o:['Income minus planned allocations equals zero','You have no savings','You spend everything on day one'],a:0,e:'Every dollar is assigned a purpose, including savings.'}]
  ]},
  {id:'compound-climb',title:'Compound Climb',category:'Investing basics',icon:'📈',description:'Explore how time and compounding affect long-term growth.',levels:[
    [{q:'$100 earns 10% in one year. What is the balance?',o:['$101','$110','$120'],a:1,e:'10% of $100 is $10, so the balance is $110.'},{q:'Compounding works by earning returns on…',o:['Only the first deposit','Principal and earlier returns','Fees only'],a:1,e:'Earlier returns remain invested and may earn returns too.'}],
    [{q:'$1,000 grows 10% for two years, compounded annually. Value?',o:['$1,100','$1,200','$1,210'],a:2,e:'$1,000 × 1.1 × 1.1 = $1,210.'},{q:'Which factor gives compounding more time?',o:['Starting earlier','Frequent withdrawals','Higher fees'],a:0,e:'Time can make a major difference, but returns are not guaranteed.'}],
    [{q:'What can high fees do over many years?',o:['Reduce compounding','Guarantee higher returns','Have no effect'],a:0,e:'Fees reduce the amount left invested.'},{q:'A projected 8% return is…',o:['Guaranteed','An illustrative assumption','A market promise'],a:1,e:'Projections are scenarios, not promises.'}]
  ]},
  {id:'scam-spotter',title:'Scam Spotter',category:'Financial safety',icon:'🕵️',description:'Recognize common fraud and phishing warning signs.',levels:[
    [{q:'A stranger promises guaranteed 40% weekly returns. What now?',o:['Send a small payment','Treat it as a major red flag','Share your password'],a:1,e:'Guaranteed unusually high returns are a classic warning sign.'},{q:'Someone asks for your one-time passcode. You should…',o:['Never share it','Send it if they know your name','Post it in chat'],a:0,e:'Never share one-time passwords or authentication codes.'}],
    [{q:'An email link asks you to log in urgently. What should you do?',o:['Click without checking','Visit the official site independently','Forward your login details'],a:1,e:'Use a trusted official app or type the known website address.'},{q:'A broker is on a regulator register but uses a different web address. What now?',o:['Assume it is genuine','Verify the exact domain and contacts','Send funds first'],a:1,e:'Scammers impersonate real firms. Verify the exact entity and domain.'}],
    [{q:'A caller asks you to transfer money to a “safe wallet”. This is…',o:['Normal bank procedure','A serious scam warning','A guaranteed refund'],a:1,e:'Do not transfer money based on an unsolicited urgent call.'},{q:'You think you have been scammed. What is a useful first step?',o:['Send more money','Contact your bank promptly','Delete all evidence'],a:1,e:'Contact the provider through official channels and preserve records.'}]
  ]},
  {id:'risk-match',title:'Risk Match',category:'Investment risk',icon:'🎯',description:'Understand how risk differs between common financial products.',levels:[
    [{q:'Which generally has lower market risk?',o:['Eligible savings deposit within protection limits','One speculative penny stock','A leveraged crypto trade'],a:0,e:'Eligible deposits may have lower market risk, subject to local rules.'},{q:'Which is generally more concentrated?',o:['A broad index fund','A single company share','A diversified fund'],a:1,e:'A single share exposes you to one company.'}],
    [{q:'What can leverage do?',o:['Magnify gains and losses','Remove risk','Guarantee profit'],a:0,e:'Leverage magnifies positive and negative price moves.'},{q:'Can diversification eliminate all risk?',o:['Yes','No, it cannot remove market risk','Only for crypto'],a:1,e:'Diversification spreads exposure but cannot guarantee against losses.'}],
    [{q:'Which factor should influence your risk level?',o:['Time horizon and ability to absorb losses','A social media tip','Last week’s top performer'],a:0,e:'Goals, risk capacity and time horizon matter.'},{q:'A bond fund can lose value when…',o:['Interest rates rise or credit worsens','Markets are open','It has a name'],a:0,e:'Bond values can change with rates and credit conditions.'}]
  ]},
  {id:'inflation-detective',title:'Inflation Detective',category:'Economics',icon:'🔎',description:'See how inflation affects purchasing power and everyday choices.',levels:[
    [{q:'If prices rise 5%, what happens to the same cash amount?',o:['It buys less on average','It buys more','Its value is guaranteed'],a:0,e:'When prices rise, purchasing power generally falls.'},{q:'Inflation measures usually track…',o:['Changes in a basket of prices','One share price','A credit score'],a:0,e:'Consumer price measures track changes in a representative basket.'}],
    [{q:'Pay rises 2% while prices rise 4%. Real pay…',o:['Likely falls','Doubles','Is unchanged'],a:0,e:'Purchasing power may fall because prices rose faster than income.'},{q:'What is a sensible response to rising costs?',o:['Review spending and compare options','Panic-buy everything','Assume investments beat inflation'],a:0,e:'Reviewing the budget and comparing costs can help.'}],
    [{q:'Why do central banks monitor inflation?',o:['Price stability is often part of their mandate','To set every shop price','To guarantee stock returns'],a:0,e:'Many central banks aim for price stability.'},{q:'Lower inflation means prices are…',o:['Always falling','Still possibly rising, but more slowly','Zero forever'],a:1,e:'Disinflation means prices rise more slowly, not necessarily fall.'}]
  ]},
  {id:'credit-coach',title:'Credit Score Coach',category:'Credit basics',icon:'💳',description:'Learn habits that support healthy credit management.',levels:[
    [{q:'What is a credit report?',o:['A record of credit account history','A shopping list','A savings account'],a:0,e:'Credit reports contain information about credit accounts and repayment history.'},{q:'Which habit is generally helpful?',o:['Paying bills on time','Ignoring statements','Applying for every card'],a:0,e:'On-time payments are important in many scoring systems.'}],
    [{q:'Credit utilization usually refers to…',o:['Revolving balances versus available limits','Your salary tax rate','Savings interest'],a:0,e:'Utilization compares balances with available revolving credit.'},{q:'Why check your credit report?',o:['Spot errors or unfamiliar accounts','Guarantee a loan','Increase income'],a:0,e:'Reviewing reports can help identify mistakes or possible identity theft.'}],
    [{q:'Does closing an old card always improve a score?',o:['Yes, always','No, it can affect utilization and history','It doubles your score'],a:1,e:'Effects vary by scoring model and individual profile.'},{q:'If you find an error on a credit report, what should you do?',o:['Use the bureau dispute process','Pay a stranger to erase it','Ignore it'],a:0,e:'Use the official dispute process and keep supporting documents.'}]
  ]},
  {id:'needs-wants',title:'Needs vs Wants',category:'Spending choices',icon:'🛍️',description:'Practice prioritizing essentials and thoughtful spending.',levels:[
    [{q:'Which is usually a basic need?',o:['Essential groceries','A premium game skin','A luxury watch'],a:0,e:'Food and essential groceries are basic needs.'},{q:'A purchase is not in your plan. What could you do?',o:['Pause and compare with goals','Buy it immediately','Use high-cost debt'],a:0,e:'A pause can help you decide whether it fits your priorities.'}],
    [{q:'You need a laptop for work. What is useful to compare?',o:['Total cost and required features','Only the brand logo','The most expensive model'],a:0,e:'Compare the features you need, total cost and reliability.'},{q:'What is opportunity cost?',o:['Value of the next-best option you give up','A bank password','A guaranteed discount'],a:0,e:'Choosing one option means giving up the next-best alternative.'}],
    [{q:'A subscription you never use renews monthly. What is sensible?',o:['Review and cancel if not needed','Keep every subscription','Ignore statements'],a:0,e:'Reviewing recurring costs can free up money.'},{q:'An unneeded item is 50% off. You save money by…',o:['Not buying it if it was not needed','Buying two','Borrowing to get it'],a:0,e:'A discount is not a saving if it causes unnecessary spending.'}]
  ]},
  {id:'diversification-dash',title:'Diversification Dash',category:'Portfolio basics',icon:'🧺',description:'Build an understanding of spreading investment exposure.',levels:[
    [{q:'What does diversification mean?',o:['Spreading investments across assets','Buying only one stock','Checking prices every minute'],a:0,e:'Diversification avoids relying entirely on one holding.'},{q:'Which portfolio is more concentrated?',o:['100% in one company','Multiple sectors and asset types','A broad market fund'],a:0,e:'One holding creates concentration in that company.'}],
    [{q:'Owning five technology stocks only may still be…',o:['Sector-concentrated','Fully diversified','Risk-free'],a:0,e:'Several holdings in one sector may share similar risks.'},{q:'What can diversification help reduce?',o:['Some company-specific risk','All market risk','All losses'],a:0,e:'It can reduce unsystematic risk but not broad market risk.'}],
    [{q:'Why review correlations between assets?',o:['Assets moving together offer less diversification','To guarantee returns','To remove fees'],a:0,e:'Holdings that move together may not spread risk as much.'},{q:'What is a sensible portfolio review habit?',o:['Check allocation against goals periodically','Chase every trending asset','Assume past returns repeat'],a:0,e:'A periodic review can help keep a portfolio aligned with goals.'}]
  ]},
  {id:'goal-sprint',title:'Goal Sprint',category:'Savings goals',icon:'🏁',description:'Turn a savings target into manageable steps.',levels:[
    [{q:'Save $600 in 6 months, ignoring interest. How much monthly?',o:['$50','$100','$150'],a:1,e:'$600 divided by 6 months equals $100 per month.'},{q:'A useful savings goal should be…',o:['Specific and time-bound','Impossible to measure','Based only on guesses'],a:0,e:'A clear amount and target date make progress easier to track.'}],
    [{q:'You are behind your savings target. What can help?',o:['Review timeline and monthly amount','Give up immediately','Use a payday loan'],a:0,e:'Adjusting the plan realistically is better than expensive debt.'},{q:'Automating a transfer after payday can…',o:['Make saving more consistent','Guarantee returns','Remove all bills'],a:0,e:'Automation can make regular saving easier.'}],
    [{q:'Your emergency fund is for…',o:['Unexpected essential expenses','A planned holiday upgrade','Speculative trades'],a:0,e:'Keep emergency money accessible for unexpected needs.'},{q:'When should you review a savings goal?',o:['When income, costs or priorities change','Never','Only after missing it'],a:0,e:'Reviewing after life changes helps keep the target realistic.'}]
  ]}
];

// Expand each game into a 100-stage learning journey. Questions are drawn
// from that game's topic bank in rotating pairs to reinforce key concepts.
GAME_LIBRARY.forEach((game) => {
  const questionBank = game.levels.flat();
  game.levels = Array.from({ length: 100 }, (_, levelIndex) => {
    const first = (levelIndex * 2) % questionBank.length;
    const second = (first + 1) % questionBank.length;
    const pair = [questionBank[first], questionBank[second]];
    return levelIndex % 2 === 0 ? pair : [...pair].reverse();
  });
});

const getLevelStage = (level) => {
  if (level < 10) return 'Starter';
  if (level < 30) return 'Builder';
  if (level < 60) return 'Skilled';
  return 'Expert';
};

export default function FinancialMiniGames({ user }) {
  const storageKey = 'fynorix-game-progress-' + (user?.id || 'member');
  const [progress, setProgress] = useState(() => { try { return JSON.parse(window.localStorage.getItem(storageKey) || '{}'); } catch { return {}; } });
  const [selectedGame, setSelectedGame] = useState(GAME_LIBRARY[0].id);
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [choice, setChoice] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);
  const game = GAME_LIBRARY.find((item) => item.id === selectedGame) || GAME_LIBRARY[0];
  const questions = game.levels[selectedLevel];
  const question = questions[questionIndex];
  const done = progress[game.id] || [];
  const totalLevels = GAME_LIBRARY.reduce((sum,item)=>sum+item.levels.length,0);
  const completed = GAME_LIBRARY.reduce((sum,item)=>sum+(progress[item.id]||[]).length,0);
  const unlocked = (level) => level === 0 || done.includes(level - 1);
  useEffect(() => { try { window.localStorage.setItem(storageKey, JSON.stringify(progress)); } catch {} }, [storageKey, progress]);
  const selectGame = (id) => { setSelectedGame(id); setSelectedLevel(0); setQuestionIndex(0); setChoice(null); setAnswers([]); setFinished(false); };
  const selectLevel = (level) => { if (!unlocked(level)) return; setSelectedLevel(level); setQuestionIndex(0); setChoice(null); setAnswers([]); setFinished(false); };
  const nextQuestion = () => {
    if (choice === null) return;
    const next = [...answers, choice === question.a]; setAnswers(next);
    if (questionIndex === questions.length - 1) {
      setFinished(true);
      if (next.filter(Boolean).length >= 1) setProgress((old)=>({...old,[game.id]:[...new Set([...(old[game.id]||[]),selectedLevel])].sort()}));
    } else { setQuestionIndex((n)=>n+1); setChoice(null); }
  };
  const passed = answers.filter(Boolean).length >= 1;
  const restart = () => { setQuestionIndex(0); setChoice(null); setAnswers([]); setFinished(false); };
  return <section className="financial-games-workspace">
    <div className="workspace-welcome"><div><div className="eyebrow"><span/> LEARN THROUGH PLAY</div><h1>Financial Games</h1><p>Build real-world money knowledge with short challenges, unlock new levels and track your learning progress.</p></div><span className="data-pill"><span className="privacy-dot"/> {completed}/{totalLevels} LEVELS COMPLETE</span></div>
    <div className="financial-games-summary"><div><strong>10</strong><span>Mini games</span></div><div><strong>{totalLevels}</strong><span>Levels to explore</span></div><div><strong>{completed}</strong><span>Levels completed</span></div><div className="financial-games-progress"><div><span>Overall progress</span><b>{Math.round(completed/totalLevels*100)}%</b></div><i><em style={{width:(completed/totalLevels*100)+'%'}}/></i></div></div>
    <div className="financial-games-layout">
      <aside className="financial-games-library"><div className="financial-games-library-title"><strong>Choose a game</strong><small>10 learning challenges</small></div>{GAME_LIBRARY.map((item,index)=><button type="button" key={item.id} className={'financial-game-tile '+(selectedGame===item.id?'selected':'')} onClick={()=>selectGame(item.id)}><span className="financial-game-tile-icon">{item.icon}</span><span className="financial-game-tile-copy"><b>{String(index+1).padStart(2,'0')} · {item.title}</b><small>{item.category}</small><i>{(progress[item.id]||[]).length}/100 levels complete</i></span><span className="financial-game-tile-arrow">›</span></button>)}</aside>
      <main className="financial-game-play-panel">
        <div className="financial-game-play-head"><div><span className="financial-game-kicker">{game.icon} {game.category.toUpperCase()}</span><h2>{game.title}</h2><p>{game.description}</p></div><span className="financial-game-level-count">{done.length}/100 done</span></div>
        <div className="financial-game-levels" aria-label="Game levels">{game.levels.map((_,index)=><button type="button" key={index} disabled={!unlocked(index)} className={'financial-game-level '+(selectedLevel===index?'active ':'')+(done.includes(index)?'completed':'')} onClick={()=>selectLevel(index)}><span>{done.includes(index)?'✓':unlocked(index)?'0'+(index+1):'🔒'}</span><b>Level {index+1}</b><small>{getLevelStage(index)}</small></button>)}</div>
        <div className="financial-game-question-card">
          {!finished ? <><div className="financial-game-question-meta"><span>LEVEL {selectedLevel+1} · QUESTION {questionIndex+1}/{questions.length}</span><span>{answers.filter(Boolean).length} correct so far</span></div><div className="financial-game-question-progress"><i style={{width:((questionIndex+1)/questions.length*100)+'%'}}/></div><h3>{question.q}</h3><div className="financial-game-answer-list">{question.o.map((option,index)=><button type="button" key={option} className={choice===index?'chosen':''} onClick={()=>setChoice(index)}><span>{String.fromCharCode(65+index)}</span>{option}</button>)}</div><div className="financial-game-question-footer"><small>Choose the best answer to continue.</small><button type="button" className="button button-primary" disabled={choice===null} onClick={nextQuestion}>{questionIndex===questions.length-1?'Finish level':'Check & continue'} →</button></div></> : <div className="financial-game-finish"><span>{passed?'🏆':'💡'}</span><h3>{passed?'Level complete!':'Good try — practise makes progress.'}</h3><p>You answered {answers.filter(Boolean).length} of {questions.length} correctly.</p><p>{passed?'This level is saved. The next level is now unlocked.':'You need at least one correct answer to pass this level.'}</p><div><button type="button" className="button button-primary" onClick={restart}>Play level again</button>{passed&&selectedLevel<99&&<button type="button" className="button button-soft" onClick={()=>selectLevel(selectedLevel+1)}>Next level →</button>}{passed&&selectedLevel===99&&<button type="button" className="button button-soft" onClick={()=>selectGame(GAME_LIBRARY[(GAME_LIBRARY.findIndex((item)=>item.id===game.id)+1)%GAME_LIBRARY.length].id)}>Explore another game →</button>}</div></div>}
        </div>
        <div className="financial-game-footer-note">Progress is saved in this browser for this signed-in profile. Educational only — no real money, deposits, prizes or trading.</div>
      </main>
    </div>
  </section>;
}
