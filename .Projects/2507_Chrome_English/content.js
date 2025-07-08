let toolbar;

document.addEventListener('mouseup', (event) => {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (selectedText.length > 0) {
    createToolbar(selection.getRangeAt(0).getBoundingClientRect());
    sendMessageToBackground(selectedText);
  } else {
    if (toolbar) {
      toolbar.remove();
    }
  }
});

function createToolbar(range) {
  if (toolbar) {
    toolbar.remove();
  }

  toolbar = document.createElement('div');
  toolbar.id = 'translation-toolbar';
  toolbar.innerHTML = '<span>Loading...</span>';
  document.body.appendChild(toolbar);

  const top = window.scrollY + range.top - toolbar.offsetHeight - 5;
  toolbar.style.top = `${top}px`;
  toolbar.style.left = `${range.left}px`;
}

function sendMessageToBackground(text) {
  chrome.runtime.sendMessage({ text }, (response) => {
    if (toolbar) {
      toolbar.innerHTML = `<span>${response.translation}</span>`;
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.translation) {
    if (toolbar) {
      toolbar.innerHTML = `<span>${request.translation}</span>`;
    }
  }
});
