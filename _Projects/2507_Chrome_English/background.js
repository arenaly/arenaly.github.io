// Background script for Chrome extension
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('apiKey', (data) => {
    if (!data.apiKey) {
      // Only set default apiKey if it's not already set
      chrome.storage.sync.set({
        apiKey: '',
        apiProvider: 'gemini',
        systemPrompt: `Translate the following English text to Korean accurately and naturally.

Instructions:
1. Provide a natural Korean translation
2. If the text contains cultural references, idioms, slang, or context-specific terms, add brief cultural explanation in parentheses
3. For technical terms, provide both Korean translation and original English term if commonly used
4. Maintain the tone and style of the original text
5. Format your response as: Translation (Cultural context if applicable)

Be concise but informative with cultural context.`,
        contextSentences: 2,
        showCultural: true,
        enableHotkey: true
      });
    }
  });

  // Handle context menu (optional enhancement)
  if (chrome.contextMenus) {

    chrome.contextMenus.create({
      id: 'translateToKorean',
      title: 'Translate to Korean',
      contexts: ['selection']
    });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'translateToKorean') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'translateSelection',
      text: info.selectionText
    });
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.sync.get([
      'apiProvider',
      'apiKey',
      'systemPrompt',
      'contextSentences',
      'showCultural',
      'enableHotkey'
    ], (result) => {
      sendResponse(result);
    });
    return true;
  }

  if (request.action === 'translate') {
    (async () => { // Use an immediately invoked async function
      // Helper to promisify chrome.storage.sync.get
      function getStorageData(keys) {
        return new Promise((resolve) => {
          chrome.storage.sync.get(keys, (result) => {
            resolve(result);
          });
        });
      }

      const settings = await getStorageData(['apiProvider', 'apiKey', 'systemPrompt']);

      if (!settings.apiKey) {
        sendResponse({ error: 'API key not configured. Please set up your API key in the extension settings.' });
        return;
      }

      const prompt = request.context
        ? `${settings.systemPrompt}\n\nContext: ${request.context}\n\nText to translate: "${request.text}"`
        : `${settings.systemPrompt}\n\nText to translate: "${request.text}"`;

      try {
        let translation;
        if (settings.apiProvider === 'gemini') {
          translation = await translateWithGemini(prompt, settings.apiKey);
        } else {
          translation = await translateWithOpenAI(prompt, settings.apiKey);
        }
        sendResponse({ translation });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })(); // Call the async function immediately
    return true;
  }
});

async function translateWithGemini(prompt, apiKey) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || 'Translation failed';
}

async function translateWithOpenAI(prompt, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: prompt
      }],
      max_tokens: 500,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'Translation failed';
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, {
    action: 'toggleTranslator'
  });
});