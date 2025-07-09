chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'translate') {
    const { text, context } = message;
    try {
      const { apiKey, systemPrompt } = await chrome.storage.sync.get({
        apiKey: '',
        systemPrompt: 'You are an assistant that translates given text into Korean and adds brief cultural context if the wording is unusual.'
      });
      if (!apiKey) {
        sendResponse({ error: 'API key not set in extension options.' });
        return;
      }
      const body = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Context: ${context}\n\nText to translate: ${text}` }
        ]
      };
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });
      const data = await resp.json();
      if (data.error) {
        sendResponse({ error: data.error.message });
        return;
      }
      const translation = data.choices[0].message.content.trim();
      sendResponse({ translation });
    } catch (err) {
      sendResponse({ error: err.message });
    }
    return true; // Keep the message channel open
  }
});
