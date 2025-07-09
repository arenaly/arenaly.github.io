(function() {
  let popup;

  function createPopup() {
    popup = document.createElement('div');
    popup.style.position = 'absolute';
    popup.style.background = 'white';
    popup.style.border = '1px solid #ccc';
    popup.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
    popup.style.padding = '8px';
    popup.style.zIndex = 100000;
    popup.style.maxWidth = '300px';
    popup.style.fontSize = '14px';
    popup.style.fontFamily = 'sans-serif';
    popup.style.display = 'none';
    document.body.appendChild(popup);
  }

  function showPopup(text, rect) {
    if (!popup) createPopup();
    popup.textContent = text;
    popup.style.left = rect.left + window.scrollX + 'px';
    popup.style.top = rect.top + window.scrollY - popup.offsetHeight - 5 + 'px';
    popup.style.display = 'block';
  }

  function hidePopup() {
    if (popup) popup.style.display = 'none';
  }

  function getContext(node) {
    const text = node.innerText || node.textContent || '';
    return text;
  }

  async function handleSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      hidePopup();
      return;
    }
    const text = selection.toString().trim();
    if (!text) {
      hidePopup();
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    showPopup('Translating...', rect);

    const context = getContext(range.startContainer.parentElement);
    const result = await chrome.runtime.sendMessage({
      type: 'translate',
      text,
      context
    });

    if (result && result.translation) {
      showPopup(result.translation, rect);
    } else if (result && result.error) {
      showPopup('Error: ' + result.error, rect);
    } else {
      hidePopup();
    }
  }

  document.addEventListener('mouseup', handleSelection);
  document.addEventListener('keyup', event => {
    if (event.key === 'Shift' || event.key === 'Control' || event.key === 'Alt') return;
    handleSelection();
  });
})();
