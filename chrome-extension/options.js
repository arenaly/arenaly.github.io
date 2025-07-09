async function restore() {
  const { apiKey, systemPrompt } = await chrome.storage.sync.get({
    apiKey: '',
    systemPrompt: 'You are an assistant that translates given text into Korean and adds brief cultural context if the wording is unusual.'
  });
  document.getElementById('apiKey').value = apiKey;
  document.getElementById('systemPrompt').value = systemPrompt;
}

async function save() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const systemPrompt = document.getElementById('systemPrompt').value.trim();
  await chrome.storage.sync.set({ apiKey, systemPrompt });
  const status = document.getElementById('status');
  status.textContent = 'Saved';
  setTimeout(() => status.textContent = '', 2000);
}

document.getElementById('save').addEventListener('click', save);

restore();
