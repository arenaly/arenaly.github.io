// Popup script for settings management
document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    apiProvider: document.getElementById('apiProvider'),
    apiKey: document.getElementById('apiKey'),
    systemPrompt: document.getElementById('systemPrompt'),
    contextSentences: document.getElementById('contextSentences'),
    showCultural: document.getElementById('showCultural'),
    enableHotkey: document.getElementById('enableHotkey'),
    saveBtn: document.getElementById('saveBtn'),
    status: document.getElementById('status')
  };
  
  // Default system prompt
  const defaultPrompt = `Translate the following English text to Korean accurately and naturally.

Instructions:
1. Provide a natural Korean translation
2. If the text contains cultural references, idioms, slang, or context-specific terms, add brief cultural explanation in parentheses
3. For technical terms, provide both Korean translation and original English term if commonly used
4. Maintain the tone and style of the original text
5. Format your response as: Translation (Cultural context if applicable)

Be concise but informative with cultural context.`;
  
  // Load saved settings
  const savedSettings = await chrome.storage.sync.get([
    'apiProvider',
    'apiKey',
    'systemPrompt',
    'contextSentences',
    'showCultural',
    'enableHotkey'
  ]);
  
  // Populate form with saved settings
  elements.apiProvider.value = savedSettings.apiProvider || 'gemini';
  elements.apiKey.value = savedSettings.apiKey || '';
  elements.systemPrompt.value = savedSettings.systemPrompt || defaultPrompt;
  elements.contextSentences.value = savedSettings.contextSentences || 2;
  elements.showCultural.checked = savedSettings.showCultural !== false;
  elements.enableHotkey.checked = savedSettings.enableHotkey !== false;
  
  // Save settings
  elements.saveBtn.addEventListener('click', async () => {
    const settings = {
      apiProvider: elements.apiProvider.value,
      apiKey: elements.apiKey.value.trim(),
      systemPrompt: elements.systemPrompt.value.trim() || defaultPrompt,
      contextSentences: parseInt(elements.contextSentences.value),
      showCultural: elements.showCultural.checked,
      enableHotkey: elements.enableHotkey.checked
    };
    
    // Validate settings
    if (!settings.apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }
    
    if (settings.contextSentences < 0 || settings.contextSentences > 5) {
      showStatus('Context sentences must be between 0 and 5', 'error');
      return;
    }
    
    try {
      elements.saveBtn.disabled = true;
      elements.saveBtn.textContent = 'Saving...';
      
      await chrome.storage.sync.set(settings);
      showStatus('Settings saved successfully!', 'success');
      
      // Test API connection
      await testApiConnection(settings);
      
    } catch (error) {
      showStatus(`Error saving settings: ${error.message}`, 'error');
    } finally {
      elements.saveBtn.disabled = false;
      elements.saveBtn.textContent = 'Save Settings';
    }
  });
  
  // Show status message
  function showStatus(message, type) {
    elements.status.textContent = message;
    elements.status.className = `status ${type}`;
    elements.status.style.display = 'block';
    
    setTimeout(() => {
      elements.status.style.display = 'none';
    }, 3000);
  }
  
  // Test API connection
  async function testApiConnection(settings) {
    try {
      const testPrompt = "Hello";
      
      if (settings.apiProvider === 'gemini') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${settings.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: testPrompt
              }]
            }]
          })
        });
        
        if (!response.ok) {
          throw new Error(`API test failed: ${response.status}`);
        }
        
      } else {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{
              role: 'user',
              content: testPrompt
            }],
            max_tokens: 10
          })
        });
        
        if (!response.ok) {
          throw new Error(`API test failed: ${response.status}`);
        }
      }
      
      showStatus('Settings saved and API connection verified!', 'success');
      
    } catch (error) {
      showStatus(`Settings saved but API test failed: ${error.message}`, 'error');
    }
  }
  
  // Reset to default prompt
  elements.systemPrompt.addEventListener('dblclick', () => {
    if (confirm('Reset to default system prompt?')) {
      elements.systemPrompt.value = defaultPrompt;
    }
  });
  
  // Update help text based on API provider
  elements.apiProvider.addEventListener('change', (e) => {
    const helpText = e.target.parentNode.querySelector('.help-text');
    if (e.target.value === 'gemini') {
      helpText.textContent = 'Get your API key from Google AI Studio (aistudio.google.com)';
    } else {
      helpText.textContent = 'Get your API key from OpenAI Platform (platform.openai.com)';
    }
  });
});