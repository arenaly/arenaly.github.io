
class DetailPopup {
  constructor() {
    this.popup = null;
  }

  show(content, rect) {
    if (this.popup) {
      this.popup.remove();
    }

    this.popup = document.createElement('div');
    this.popup.className = 'korean-translator-detail-popup';
    this.popup.innerHTML = `
      <div class="ktdp-header">
        <span class="ktdp-title">Details</span>
        <button class="ktdp-close-btn" aria-label="Close">×</button>
      </div>
      <div class="ktdp-body">
        ${content}
      </div>
    `;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    // Position the detail popup near the main tooltip or selected text
    // For simplicity, let's position it slightly to the right and below the main tooltip
    this.popup.style.position = 'absolute';
    this.popup.style.top = `${rect.top + scrollTop}px`;
    this.popup.style.left = `${rect.right + scrollLeft + 20}px`; // 20px to the right of the selection
    this.popup.style.zIndex = '9999999'; // Higher than main tooltip

    document.body.appendChild(this.popup);

    this.popup.querySelector('.ktdp-close-btn').addEventListener('click', () => {
      this.hide();
    });
  }

  hide() {
    if (this.popup) {
      this.popup.remove();
      this.popup = null;
    }
  }
}
