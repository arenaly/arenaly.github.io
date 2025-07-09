// Fixed Content script for text selection and translation
class KoreanTranslator {
  constructor() {
    this.tooltip = null;
    this.translationTriggerButton = null;
    this.isProcessing = false;
    this.settings = {};
    this.currentSelection = null;
    this.currentSelectedText = null;
    this.currentSelectionRect = null;

    this.loadSettings();
    this.init();
    this.injectCSS();
  }

  // Inject CSS styles for the tooltip
  injectCSS() {
    const style = document.createElement('style');
    style.textContent = `
      .korean-translator-tooltip {
        position: absolute;
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        max-width: 300px;
        z-index: 999999;
        opacity: 1;
        visibility: visible;
      }
      
      .korean-translator-trigger-button {
        position: absolute;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
        z-index: 999998;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      
      .korean-translator-trigger-button:hover {
        background: #0056b3;
      }
      
      .kt-header {
        padding: 10px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8f9fa;
        border-radius: 8px 8px 0 0;
      }
      
      .kt-title {
        font-weight: 600;
        color: #333;
      }
      
      .kt-close-btn {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .kt-close-btn:hover {
        color: #333;
      }
      
      .kt-body {
        padding: 12px;
      }
      
      .kt-loading-spinner {
        text-align: center;
        color: #666;
        padding: 20px;
      }
      
      .kt-translation-text {
        margin-bottom: 12px;
        line-height: 1.4;
        color: #333;
      }
      
      .kt-actions {
        display: flex;
        gap: 8px;
      }
      
      .kt-copy-btn, .kt-speak-btn {
        background: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 6px 12px;
        font-size: 12px;
        cursor: pointer;
      }
      
      .kt-copy-btn:hover, .kt-speak-btn:hover {
        background: #e0e0e0;
      }
    `;
    document.head.appendChild(style);
  }

  async loadSettings() {
    const result = await chrome.storage.sync.get([
      'apiProvider',
      'apiKey',
      'contextSentences',
      'systemPrompt',
      'showCultural',
      'enableHotkey'
    ]);
    
    this.settings = {
      apiProvider: result.apiProvider || 'gemini',
      apiKey: result.apiKey || '',
      contextSentences: result.contextSentences || 2,
      systemPrompt: result.systemPrompt || 'Translate the following English text to Korean. If the text contains cultural references, idioms, or context-specific terms, provide brief cultural background in parentheses.',
      showCultural: result.showCultural !== false,
      enableHotkey: result.enableHotkey !== false
    };
  }

  init() {
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('click', this.handleClick.bind(this));
    
    chrome.storage.onChanged.addListener(() => {
      if (chrome.runtime.lastError) {
        return;
      }
      this.loadSettings();
    });
  }

  handleMouseUp(e) {
    if ((this.tooltip && this.tooltip.contains(e.target)) || (this.translationTriggerButton && this.translationTriggerButton.contains(e.target))) {
      return;
    }
    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      console.log('handleMouseUp: Selected text:', selectedText);

      if (selectedText.length > 0) {
        this.currentSelection = selection;
        this.currentSelectedText = selectedText;
        this.currentSelectionRect = selection.getRangeAt(0).getBoundingClientRect();
        console.log('handleMouseUp: currentSelectedText set', this.currentSelectedText);
        this.showTranslationTriggerButton(this.currentSelectionRect);
      } else {
        this.hideTranslationTriggerButton();
      }
    }, 100);
  }

  handleKeyDown(e) {
    if (this.settings.enableHotkey && e.ctrlKey && e.key === 't') {
      e.preventDefault();
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      if (selectedText.length > 0) {
        this.currentSelection = selection;
        this.currentSelectedText = selectedText;
        this.currentSelectionRect = selection.getRangeAt(0).getBoundingClientRect();
        console.log('handleKeyDown: currentSelectedText set for hotkey', this.currentSelectedText);
        this.showTranslationTooltip(this.currentSelectionRect, this.currentSelectedText);
      }
    }
  }

  handleClick(e) {
    if (this.tooltip && !this.tooltip.contains(e.target)) {
      this.hideTooltip();
    }
    if (this.translationTriggerButton && !this.translationTriggerButton.contains(e.target)) {
      this.hideTranslationTriggerButton();
    }
  }

  showTranslationTriggerButton(rect) {
    console.log('showTranslationTriggerButton: Called with rect:', rect);
    if (this.translationTriggerButton) {
      this.translationTriggerButton.remove();
    }

    this.translationTriggerButton = document.createElement('button');
    this.translationTriggerButton.className = 'korean-translator-trigger-button';
    this.translationTriggerButton.textContent = 'Translate';
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    this.translationTriggerButton.style.position = 'absolute';
    this.translationTriggerButton.style.top = `${rect.bottom + scrollTop + 5}px`;
    this.translationTriggerButton.style.left = `${rect.left + scrollLeft}px`;
    this.translationTriggerButton.style.zIndex = '999998';

    document.body.appendChild(this.translationTriggerButton);

    this.translationTriggerButton.addEventListener('click', () => {
      console.log('Trigger button clicked. currentSelectedText:', this.currentSelectedText);
      this.hideTranslationTriggerButton();
      this.showTranslationTooltip(this.currentSelectionRect, this.currentSelectedText);
    });
  }

  hideTranslationTriggerButton() {
    if (this.translationTriggerButton) {
      this.translationTriggerButton.remove();
      this.translationTriggerButton = null;
    }
  }

  async showTranslationTooltip(rect, selectedText) {
    console.log('showTranslationTooltip called with rect:', rect, 'and selectedText:', selectedText);
    
    // Extension context check
    if (!chrome.runtime?.id) {
      console.error('Extension context invalidated - reload page');
      return;
    }
    
    if (this.isProcessing) return;
    
    if (!selectedText || selectedText.length === 0) {
      console.log('showTranslationTooltip: Empty selected text.');
      return;
    }

    this.hideTooltip();
    this.hideTranslationTriggerButton();

    // Create tooltip with immediate content
    this.createTooltip(rect, selectedText);
    
    // Get context if needed
    const context = this.settings.showCultural ? this.getContext(this.currentSelection) : '';
    
    try {
      this.isProcessing = true;
      console.log('Calling translateText with:', selectedText, context);
      const translation = await this.translateText(selectedText, context);
      console.log('Translation received:', translation);
      this.updateTooltipContent(translation);
    } catch (error) {
      console.error('Error during translation:', error);
      this.updateTooltipContent(`Error: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  getContext(selection) {
    if (!selection || selection.rangeCount === 0) return '';
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
      ? range.commonAncestorContainer.parentNode 
      : range.commonAncestorContainer;
    
    const textContent = container.textContent || container.innerText || '';
    const selectedText = this.currentSelectedText;
    const selectedIndex = textContent.indexOf(selectedText);
    
    if (selectedIndex === -1) return '';
    
    const sentences = textContent.split(/[.!?]+/);
    const contextSentences = this.settings.contextSentences;
    
    let context = '';
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (sentence.includes(selectedText)) {
        const start = Math.max(0, i - contextSentences);
        const end = Math.min(sentences.length, i + contextSentences + 1);
        context = sentences.slice(start, end).join('. ').trim();
        break;
      }op
    }
    
    return context;
  }

  createTooltip(rect, selectedText) {
    console.log('createTooltip: Creating tooltip element for:', selectedText);
    
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'korean-translator-tooltip';
    
    // Force inline styles to override any conflicting CSS
    this.tooltip.style.cssText = `
      position: fixed !important;
      background: #fff !important;
      border: 1px solid #ddd !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
      font-family: system-ui, -apple-system, sans-serif !important;
      font-size: 14px !important;
      max-width: 300px !important;
      z-index: 2147483647 !important;
      opacity: 1 !important;
      visibility: visible !important;
      display: block !important;
      pointer-events: auto !important;
    `;
    
    // Calculate position using fixed positioning (relative to viewport)
    const tooltipWidth = 300;
    const tooltipHeight = 120;
    
    // Default position: below the selection
    let top = rect.bottom + 10;
    let left = rect.left;
    
    // If tooltip would go below viewport, position above
    if (top + tooltipHeight > window.innerHeight) {
      top = rect.top - tooltipHeight - 10;
    }
    
    // If tooltip would go above viewport, force below
    if (top < 0) {
      top = rect.bottom + 10;
    }
    
    // Horizontal positioning
    if (left + tooltipWidth > window.innerWidth) {
      left = window.innerWidth - tooltipWidth - 10;
    }
    if (left < 0) {
      left = 10;
    }
    
    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
    
    // Set initial content immediately
    this.tooltip.innerHTML = `
      <div class="kt-header">
        <span class="kt-title">Translating...</span>
        <button class="kt-close-btn" aria-label="Close">×</button>
      </div>
      <div class="kt-body">
        <div class="kt-loading-spinner">Processing translation...</div>
      </div>
    `;
    
    // Append to DOM immediately
    document.body.appendChild(this.tooltip);
    
    // Add close listener
    this.tooltip.querySelector('.kt-close-btn').addEventListener('click', () => {
      this.hideTooltip();
    });
    
    // Debug logging
    console.log('createTooltip: Tooltip created at position:', { top, left });
    console.log('createTooltip: Viewport dimensions:', { 
      width: window.innerWidth, 
      height: window.innerHeight
    });
    console.log('createTooltip: Selection rect:', rect);
    console.log('createTooltip: Tooltip element:', this.tooltip);
    console.log('createTooltip: Tooltip parent:', this.tooltip.parentNode);
    
    // Force visibility check with more detailed logging
    setTimeout(() => {
      if (this.tooltip) {
        const computedStyle = window.getComputedStyle(this.tooltip);
        const boundingRect = this.tooltip.getBoundingClientRect();
        
        console.log('Tooltip computed styles:', {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          position: computedStyle.position,
          top: computedStyle.top,
          left: computedStyle.left,
          zIndex: computedStyle.zIndex,
          width: computedStyle.width,
          height: computedStyle.height
        });
        
        console.log('Tooltip bounding rect:', boundingRect);
        console.log('Tooltip is in viewport:', {
          top: boundingRect.top >= 0 && boundingRect.top < window.innerHeight,
          left: boundingRect.left >= 0 && boundingRect.left < window.innerWidth,
          bottom: boundingRect.bottom > 0 && boundingRect.bottom <= window.innerHeight,
          right: boundingRect.right > 0 && boundingRect.right <= window.innerWidth
        });
      }
    }, 100);
  }

  updateTooltipContent(translation) {
    if (!this.tooltip) return;
    
    this.tooltip.innerHTML = `
      <div class="kt-header">
        <span class="kt-title">Translation</span>
        <button class="kt-close-btn" aria-label="Close">×</button>
      </div>
      <div class="kt-body">
        <div class="kt-translation-text">${translation}</div>
        <div class="kt-actions">
          <button class="kt-copy-btn" title="Copy translation">Copy</button>
          <button class="kt-speak-btn" title="Speak Korean">🔊</button>
        </div>
      </div>
    `;
    
    // Re-add event listeners
    this.tooltip.querySelector('.kt-close-btn').addEventListener('click', () => {
      this.hideTooltip();
    });

    this.tooltip.querySelector('.kt-copy-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(translation.replace(/<[^>]*>/g, ''));
    });
    
    this.tooltip.querySelector('.kt-speak-btn').addEventListener('click', () => {
      const utterance = new SpeechSynthesisUtterance(translation.replace(/<[^>]*>/g, ''));
      utterance.lang = 'ko-KR';
      speechSynthesis.speak(utterance);
    });
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
      window.getSelection().removeAllRanges();
    }
    this.hideTranslationTriggerButton();
  }

  async translateText(text, context) {
    return new Promise((resolve, reject) => {
      try {
        if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
          reject(new Error('Extension context invalidated. Please reload the page.'));
          return;
        }
        
        chrome.runtime.sendMessage({ action: 'translate', text, context }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (response && response.error) {
            reject(new Error(response.error));
          } else if (response && response.translation) {
            resolve(response.translation);
          } else {
            reject(new Error('No translation received'));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}

// Initialize the translator
new KoreanTranslator();