import React, { useMemo, useState } from 'react';

const games = [
  { id: 'quiz', number: '01', title: 'Money IQ', tag: 'Quick quiz', description: 'Test your everyday finance knowledge.', icon: '🧠', time: '2 min' },
  { id: 'budget', number: '02', title: 'Budget Builder', tag: 'Money skills', description: 'Balance a monthly budget without overspending.', icon: '🧩', time: '3 min' },
  { id: 'growth', number: '03', title: 'Compound Climb', tag: 'Investing basics', description: 'Estimate how money can grow over time.', icon: '📈', time: '2 min' },
  { id: 'scam', number: '04', title: 'Scam Spotter', tag: 'Stay safe', description: 'Spot suspicious messages and money traps.', icon: '🕵️', time: '2 min' },
  { id: 'risk', number: '05', title: 'Risk Match', tag: 'Market basics', description: 'Match common investments with their risk levels.', icon: '🎯', time: '2 min' }
];

const quizQuestions = [
  { q: 'What does diversification mean?', options: ['Putting all money into one asset', 'Spreading investments across different assets', 'Buying only the cheapest asset'], answer: 1, explain: 'Diversification spreads exposure. It can reduce concentration risk, but it cannot remove investment risk.' },
  { q: 'What is an emergency fund mainly for?', options: ['Unexpected essential expenses', 'Buying trending stocks', 'Paying for luxury upgrades'], answer: 0, explain: 'An emergency fund can help cover unexpected costs such as urgent repairs or a loss of income.' },
  { q: 'What happens to a fixed-rate loan payment when its rate is fixed?', options: ['It changes every day', 'The interest rate stays the same during the fixed period', 'The loan becomes risk-free'], answer: 1, explain: 'A fixed rate stays unchanged for the agreed period, although fees and other terms still matter.' }
];

const scamScenarios = [
  { message: '“You are guaranteed 40% profit this week. Send money now to unlock your account.”', answer: 'scam', reason: 'Guaranteed high returns, urgency and a payment request are major warning signs.' },
  { message: '“Your bank statement is ready. Sign in through the bank app you normally use.”', answer: 'safer', reason: 'Using the official app is safer than following an unexpected login link. Always verify the message independently.' },
  { message: '“A stranger asks for your one-time password to reverse a transfer.”', answer: 'scam', reason: 'Never share one-time passwords or login codes. A legitimate support agent should not ask for them.' }
];

const riskCards = [
  { name: 'Insured savings account', risk: 'Lower', detail: 'Generally lower market risk, subject to local protection limits and institution rules.' },
  { name: 'Diversified bond fund', risk: 'Medium', detail: 'Can fluctuate with interest rates, credit conditions and fund holdings.' },
  { name: 'Single small-company stock', risk: 'Higher', detail: 'A single company can be volatile and may lose substantial value.' }
];

export default function FinancialMiniGames() {
  const [active, setActive] = useState('quiz');
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizChoice, setQuizChoice] = useState(null);
  const [budget, setBudget] = useState([900, 700, 500, 400]);
  const [budgetChecked, setBudgetChecked] = useState(false);
  const [growthChoice, setGrowthChoice] = useState(null);
  const [scamIndex, setScamIndex] = useState(0);
  const [scamChoice, setScamChoice] = useState(null);
  const [riskChoice, setRiskChoice] = useState({});
  const [riskChecked, setRiskChecked] = useState(false);

  const budgetTotal = budget.reduce((sum, value) => sum + value, 0);
  const currentQuiz = quizQuestions[quizIndex];
  const currentScam = scamScenarios[scamIndex];
  const growthAnswer = 1000 * Math.pow(1.08, 10);
  const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  const resetGame = () => {
    setQuizIndex(0); setQuizScore(0); setQuizChoice(null);
    setBudget([900, 700, 500, 400]); setBudgetChecked(false);
    setGrowthChoice(null); setScamIndex(0); setScamChoice(null);
    setRiskChoice({}); setRiskChecked(false);
  };

  return (
    <section className="fynorix-games-section section-gap" aria-labelledby="fynorix-games-title">
      <div className="fynorix-games-heading">
        <div><div className="eyebrow"><span/> LEARN BY PLAYING</div><h2 id="fynorix-games-title">Play. Learn. Get money-smart.</h2><p>Five quick, free finance games. No account, deposit or real-money play required.</p></div>
        <span className="fynorix-games-free">✦ Free for everyone</span>
      </div>
      <div className="fynorix-games-layout">
        <nav className="fynorix-games-list" aria-label="Choose a financial mini game">
          {games.map((game) => <button type="button" key={game.id} className={active === game.id ? 'fynorix-game-choice active' : 'fynorix-game-choice'} onClick={() => { setActive(game.id); resetGame(); }}><span className="fynorix-game-emoji">{game.icon}</span><span className="fynorix-game-choice-copy"><strong>{game.title}</strong><small>{game.tag} · {game.time}</small></span><span className="fynorix-game-number">{game.number}</span></button>)}
        </nav>
        <div className="fynorix-game-stage">
          {active === 'quiz' && <div className="fynorix-game-inner"><div className="fynorix-game-topline"><span>🧠 MONEY IQ</span><small>QUESTION {quizIndex + 1} OF {quizQuestions.length}</small></div><div className="fynorix-game-progress"><i style={{ width: ((quizIndex + 1) / quizQuestions.length * 100) + '%' }}/></div><h3>{currentQuiz.q}</h3><div className="fynorix-game-options">{currentQuiz.options.map((option, index) => <button type="button" key={option} disabled={quizChoice !== null} className={quizChoice === index ? (index === currentQuiz.answer ? 'correct' : 'incorrect') : ''} onClick={() => { setQuizChoice(index); if (index === currentQuiz.answer) setQuizScore((score) => score + 1); }}>{String.fromCharCode(65 + index)}. {option}</button>)}</div>{quizChoice !== null && <div className="fynorix-game-feedback"><strong>{quizChoice === currentQuiz.answer ? 'Correct! Nice work.' : 'Not quite — keep learning.'}</strong><p>{currentQuiz.explain}</p><button type="button" className="button button-primary button-small" onClick={() => { if (quizIndex === quizQuestions.length - 1) { setQuizIndex(0); setQuizScore(0); } else setQuizIndex((index) => index + 1); setQuizChoice(null); }}>{quizIndex === quizQuestions.length - 1 ? 'Play again' : 'Next question'} →</button><small>Score: {quizScore} / {quizQuestions.length}</small></div>}</div>}
          {active === 'budget' && <div className="fynorix-game-inner"><div className="fynorix-game-topline"><span>🧩 BUDGET BUILDER</span><small>MONTHLY TAKE-HOME · $3,000</small></div><h3>Can you give every dollar a job?</h3><p className="fynorix-game-help">Adjust the amounts so your plan stays within $3,000. Try to keep some money for saving, too.</p><div className="fynorix-budget-total"><span>Planned total</span><strong className={budgetTotal > 3000 ? 'over' : ''}>{money(budgetTotal)}</strong><small>{money(3000 - budgetTotal)} {budgetTotal <= 3000 ? 'left to assign' : 'over budget'}</small></div><div className="fynorix-budget-controls">{['Needs','Wants','Savings','Other'].map((label, index) => <label key={label}><span>{label}<strong>{money(budget[index])}</strong></span><input type="range" min="0" max="1800" step="50" value={budget[index]} onChange={(event) => { setBudget((values) => values.map((value, i) => i === index ? Number(event.target.value) : value)); setBudgetChecked(false); }}/></label>)}</div><button type="button" className="button button-primary button-small" onClick={() => setBudgetChecked(true)}>Check my budget</button>{budgetChecked && <p className="fynorix-game-result">{budgetTotal === 3000 ? '🎉 Balanced! Your plan adds up to $3,000.' : budgetTotal < 3000 ? 'Good start — assign the remaining money before you finish.' : 'You are over budget. Adjust the sliders to bring the total to $3,000 or less.'}</p>}</div>}
          {active === 'growth' && <div className="fynorix-game-inner"><div className="fynorix-game-topline"><span>📈 COMPOUND CLIMB</span><small>LEARNING CHALLENGE</small></div><h3>If $1,000 grew by 8% each year, about how much could it become after 10 years?</h3><p className="fynorix-game-help">Assume annual compounding and no additional deposits, fees or taxes.</p><div className="fynorix-game-options">{[1600, 2000, 2159].map((value) => <button type="button" key={value} disabled={growthChoice !== null} className={growthChoice === value ? (value === 2159 ? 'correct' : 'incorrect') : ''} onClick={() => setGrowthChoice(value)}>{money(value)}</button>)}</div>{growthChoice !== null && <div className="fynorix-game-feedback"><strong>{growthChoice === 2159 ? 'That’s it!' : 'The closest answer is $2,159.'}</strong><p>Compound growth earns returns on earlier returns. The estimate is {money(growthAnswer)} before fees and taxes; actual investments can lose value.</p><button type="button" className="button button-primary button-small" onClick={() => setGrowthChoice(null)}>Try again</button></div>}</div>}
          {active === 'scam' && <div className="fynorix-game-inner"><div className="fynorix-game-topline"><span>🕵️ SCAM SPOTTER</span><small>CASE {scamIndex + 1} OF {scamScenarios.length}</small></div><h3>Would you trust this message?</h3><blockquote className="fynorix-scam-message">{currentScam.message}</blockquote><div className="fynorix-game-options two"><button type="button" disabled={scamChoice !== null} className={scamChoice === 'scam' ? 'correct' : ''} onClick={() => setScamChoice('scam')}>🚩 Suspicious</button><button type="button" disabled={scamChoice !== null} className={scamChoice === 'safer' ? 'correct' : ''} onClick={() => setScamChoice('safer')}>✓ Seems safer</button></div>{scamChoice !== null && <div className="fynorix-game-feedback"><strong>{scamChoice === currentScam.answer ? 'Good judgement!' : 'Take another look.'}</strong><p>{currentScam.reason}</p><button type="button" className="button button-primary button-small" onClick={() => { setScamIndex((index) => (index + 1) % scamScenarios.length); setScamChoice(null); }}>{scamIndex === scamScenarios.length - 1 ? 'Start again' : 'Next case'} →</button></div>}</div>}
          {active === 'risk' && <div className="fynorix-game-inner"><div className="fynorix-game-topline"><span>🎯 RISK MATCH</span><small>3 ASSETS TO MATCH</small></div><h3>Match each example with its general risk level.</h3><div className="fynorix-risk-list">{riskCards.map((card) => <label key={card.name}><span><strong>{card.name}</strong><small>{card.detail}</small></span><select value={riskChoice[card.name] || ''} onChange={(event) => { setRiskChoice((current) => ({ ...current, [card.name]: event.target.value })); setRiskChecked(false); }}><option value="">Choose level</option><option>Lower</option><option>Medium</option><option>Higher</option></select></label>)}</div><button type="button" className="button button-primary button-small" onClick={() => setRiskChecked(true)} disabled={Object.keys(riskChoice).length !== 3}>Check matches</button>{riskChecked && <p className="fynorix-game-result">{riskCards.every((card) => riskChoice[card.name] === card.risk) ? '🎉 Perfect match! You got all three.' : 'Not all matches are correct yet. Review the descriptions and try again.'}</p>}</div>}
        </div>
      </div>
      <p className="fynorix-games-note">For education and entertainment only. Examples use USD and simplified assumptions; they are not financial advice, investment recommendations or real-money games.</p>
    </section>
  );
}
