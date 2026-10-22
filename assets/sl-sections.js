/* Custom elements isolate each instance and reconnect safely in Shopify's editor. */
(() => {
  if (!customElements.get('sl-transformations')) {
    customElements.define('sl-transformations', class extends HTMLElement {
      connectedCallback() {
        this.cleanup?.();
        const track = this.querySelector('[data-track]');
        const previous = this.querySelector('[data-prev]');
        const next = this.querySelector('[data-next]');
        if (!track || !previous || !next) return;
        const controller = new AbortController();
        const options = { signal: controller.signal };
        const update = () => {
          const overflow = track.scrollWidth - track.clientWidth > 3;
          previous.hidden = next.hidden = !overflow;
          previous.disabled = track.scrollLeft <= 2;
          next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 3;
        };
        const move = (direction) => {
          const card = track.querySelector('.sl-story');
          const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
          track.scrollBy({ left: direction * ((card?.getBoundingClientRect().width || track.clientWidth) + gap), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        };
        previous.addEventListener('click', () => move(-1), options);
        next.addEventListener('click', () => move(1), options);
        track.addEventListener('scroll', update, { ...options, passive: true });
        track.addEventListener('keydown', (event) => {
          if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
          event.preventDefault();
          move(event.key === 'ArrowRight' ? 1 : -1);
        }, options);
        const selectBlock = (event) => {
          if (!this.contains(event.target)) return;
          const card = event.target.closest('[data-block-id]');
          if (card) track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: 'instant' });
        };
        document.addEventListener('shopify:block:select', selectBlock, options);
        const observer = new ResizeObserver(update);
        observer.observe(track);
        update();
        this.cleanup = () => { controller.abort(); observer.disconnect(); };
      }
      disconnectedCallback() { this.cleanup?.(); }
    });
  }
  if (!customElements.get('sl-product-form')) {
    customElements.define('sl-product-form', class extends HTMLElement {
      connectedCallback() {
        this.controller?.abort();
        this.controller = new AbortController();
        this.querySelector('[data-variant]')?.addEventListener('change', (event) => {
          const option = event.target.selectedOptions[0];
          const available = option.dataset.available === 'true';
          const savings = Number(option.dataset.saving) || 0;
          const price = this.querySelector('.sl-product__price');
          const compare = this.querySelector('s[data-compare]');
          const badge = this.querySelector('.sl-product__saving');
          const percent = this.querySelector('[data-percent]');
          const button = this.querySelector('[data-add]');
          if (price) price.textContent = option.dataset.price;
          if (compare) { compare.textContent = option.dataset.compare; compare.hidden = savings <= 0; }
          if (badge) badge.hidden = savings <= 0;
          if (percent) percent.textContent = savings;
          if (button) { button.disabled = !available; button.textContent = available ? this.dataset.addLabel : this.dataset.soldLabel; }
        }, { signal: this.controller.signal });
      }
      disconnectedCallback() { this.controller?.abort(); }
    });
  }
})();
