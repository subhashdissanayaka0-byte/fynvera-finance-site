// Vercel serverless endpoint for the FYNVERA AI Guide.
// Keep GEMINI_API_KEY in Vercel Environment Variables; never expose it in VITE_*.
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
  if (message.length > 1200) {
    return res.status(413).json({ error: 'Please keep your question under 1,200 characters.' });
  }

  const safeHistory = Array.isArray(history)
    ? history.slice(-8)
        .filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.text === 'string')
        .map((item) => `${item.role === 'assistant' ? 'FYNVERA AI' : 'User'}: ${item.text.slice(0, 1200)}`)
    : [];

  const systemInstruction = `You are FYNVERA Guide, a helpful general-purpose AI assistant built into the FYNVERA finance education website. Answer the user's actual question clearly and naturally, not only questions about the website. Support English and Sinhala; reply in the language the user uses. You may explain finance, investing, crypto, stocks, forex, economics, technology, education, writing, and everyday topics. For FYNVERA navigation, explain the relevant existing site features. Be honest when unsure and never invent live prices, breaking news, website features, or facts. You do not have live web browsing or access to the user's private account, portfolio, database, or transactions. Never claim to have checked them. For financial topics, provide balanced educational information, explain material risks, do not promise returns or give personalized buy/sell instructions. Encourage users not to share passwords, API keys, recovery phrases, or sensitive financial information. Keep answers useful and reasonably concise. Current page context: ${String(context).slice(0, 250)}.`;

  const conversation = [
    ...safeHistory,
    `User: ${message.trim()}`,
    'FYNVERA AI:'
  ].join('\n');

  // Gemini 3.8 Flash uses the Interactions API. Do not call the legacy
  // generateContent endpoint for this model.
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/interactions';
  const payload = {
    model: 'gemini-3.5-flash-lite',
    input: conversation,
    system_instruction: systemInstruction,
    store: false,
    generation_config: {
      thinking_level: 'minimal',
      temperature: 0.5,
      max_output_tokens: 500
    }
  };

  const retryableStatuses = new Set([429, 500, 502, 503, 504]);

  try {
    let upstream;
    let data = {};

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      try {
        upstream = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        data = await upstream.json().catch(() => ({}));
      } finally {
        clearTimeout(timeout);
      }

      if (upstream.ok || !retryableStatuses.has(upstream.status) || attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 700 * (2 ** attempt)));
    }

    if (!upstream?.ok) {
      const status = upstream?.status || 502;
      console.error('Gemini Interactions API error:', status, data?.error?.message || 'Unknown provider error');
      return res.status(status === 429 ? 429 : 502).json({
        error: status === 429
          ? 'The AI service is busy or its usage limit has been reached. Please try again shortly.'
          : 'The AI service could not answer right now. Please try again shortly.'
      });
    }

    const reply = (
      data?.output_text ||
      data?.steps
        ?.filter((step) => step.type === 'model_output')
        .flatMap((step) => step.content || [])
        .filter((part) => part.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text)
        .join('\n')
    )?.trim();

    if (!reply) {
      console.error('Gemini Interactions API returned no text output.');
      return res.status(502).json({ error: 'The AI returned an empty answer. Please try again.' });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('FYNVERA assistant request failed:', error?.name || 'Error', error?.message || 'Unknown error');
    return res.status(500).json({
      error: error?.name === 'AbortError'
        ? 'The AI took too long to respond. Please try again.'
        : 'The AI service is temporarily unavailable.'
    });
  }
}
