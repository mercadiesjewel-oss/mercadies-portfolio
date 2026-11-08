(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.p-title').forEach((h) => {
    const text = h.textContent.trim();
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    const letters = document.createElement('span');
    letters.setAttribute('aria-hidden', 'true');
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch === ' ' ? ' ' : ch;
      s.style.setProperty('--d', `${(0.15 + i * 0.035).toFixed(3)}s`);
      letters.appendChild(s);
    });
    h.textContent = '';
    h.append(sr, letters);
  });
})();
