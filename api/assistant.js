// Vercel serverless endpoint for the FYNVERA AI Guide.
// Configure GEMINI_API_KEY as a Vercel Environment Variable (never expose it in VITE_*).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI_NOT_CONFIGURED' });

  const { message, history = [], context = '' } = req.body || {};
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Please enter a question.' });
  }
  if (message.length > 1200) return res.status(413).json({ error: 'Please keep your question under 1,200 characters.' });

  const safeHistory = Array.isArray(history)
    ? history.slice(-8).filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.text === 'string')
      .map((item) => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.text.slice(0, 1200) }] }))
    : [];

  const systemInstruction = `You are FYNVERA Guide, a helpful general-purpose AI assistant built into the FYNVERA finance education website. Answer the user's actual question clearly and naturally, not only questions about the website. Support English and Sinhala; reply in the language the user uses. You may explain finance, investing, crypto, stocks, forex, economics, technology, education, writing, and everyday topics. For FYNVERA navigation, explain the relevant existing site features. Be honest when unsure and never invent live prices, breaking news, website features, or facts. You do not have live web browsing or access to the user's private account, portfolio, database, or transactions. Never claim to have checked them. For financial topics, provide balanced educational information, explain material risks, do not promise returns or give personalized buy/sell instructions. Encourage users not to share passwords, API keys, recovery phrases, or sensitive financial information. Keep answers useful and reasonably concise. Current page context: ${String(context).slice(0, 250)}.`;

  try {
    const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [...safeHistory, { role: 'user', parts: [{ text: message.trim() }] }],
        generationConfig: { temperature: 0.65, maxOutputTokens: 700 }
      })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('Gemini API error:', upstream.status, data?.error?.message || 'Unknown provider error');
      return res.status(upstream.status === 429 ? 429 : 502).json({
        error: upstream.status === 429 ? 'The free AI usage limit has been reached for now. Please try again later.' : 'The AI service could not answer right now. Please try again.'
      });
    }
    const reply = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    if (!reply) return res.status(502).json({ error: 'The AI returned an empty answer. Please try again.' });
    return res.status(200).json({ reply });
  } catch (error) {
    console.error('FYNVERA assistant request failed:', error);
    return res.status(500).json({ error: 'The AI service is temporarily unavailable.' });
  }
}
