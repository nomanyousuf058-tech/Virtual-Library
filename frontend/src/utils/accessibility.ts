export const ensureAccessibility = () => {
  // Add skip to content link
  if (!document.getElementById('skip-to-content')) {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.id = 'skip-to-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 0;
      background: #000;
      color: #fff;
      padding: 8px;
      z-index: 10000;
      transition: top 0.3s;
    `;
    document.body.appendChild(skipLink);

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '0';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });
  }

  // Ensure all images have alt text
  document.querySelectorAll('img:not([alt])').forEach(img => {
    if (!img.getAttribute('alt')) {
      img.setAttribute('alt', '');
    }
  });

  // Ensure all interactive elements are focusable
  document.querySelectorAll('button, [tabindex]').forEach(el => {
    if (el.getAttribute('tabindex') === '-1') {
      el.setAttribute('tabindex', '0');
    }
  });
};

export const trackFocus = () => {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-nav');
    }
  });

  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-nav');
  });
};

export const initAccessibility = () => {
  ensureAccessibility();
  trackFocus();
};