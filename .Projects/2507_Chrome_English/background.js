chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.text) {
    chrome.storage.sync.get(['apiKey', 'systemPrompt'], (data) => {
      const apiKey = data.apiKey;
      const systemPrompt = data.systemPrompt || 'Translate the following English text to Korean and provide a brief cultural explanation if the text is not a common word or phrase. Text:';

      if (!apiKey) {
        sendResponse({ translation: 'API key not set. Please set it in the extension options.' });
        return;
      }

      fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "contents": [{
            "parts": [{
              "text": `${systemPrompt} "${request.text}"`
            }]
          }]
        })
      })
      .then(response => response.json())
      .then(data => {
        const translation = data.candidates[0].content.parts[0].text;
        sendResponse({ translation });
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { translation });
        });
      })
      .catch(error => {
        console.error('Error:', error);
        sendResponse({ translation: 'Error fetching translation.' });
      });
    });
  }
  return true; // Indicates that the response is sent asynchronously
});
