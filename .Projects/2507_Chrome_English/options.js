document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const systemPromptInput = document.getElementById('systemPrompt');
  const saveButton = document.getElementById('save');
  const statusDiv = document.getElementById('status');

  // Load saved settings
  chrome.storage.sync.get(['apiKey', 'systemPrompt'], (data) => {
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }
    if (data.systemPrompt) {
      systemPromptInput.value = data.systemPrompt;
    }
  });

  // Save settings
  saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value;
    const systemPrompt = systemPromptInput.value;

    chrome.storage.sync.set({ apiKey, systemPrompt }, () => {
      statusDiv.textContent = 'Settings saved.';
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 2000);
    });
  });
});
