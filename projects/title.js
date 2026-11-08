(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.p-title').forEach((h) => {
    const text = h.textContent.trim();
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    const letters = document.createElement('span');
    letters.setAttribute('aria-hidden', 'true');
    let i = 0;
    text.split(' ').forEach((word, w, words) => {
      const group = document.createElement('span');
      group.className = 'w';
      [...word].forEach((ch) => {
        const s = document.createElement('span');
        s.className = 'ch';
        s.textContent = ch;
        s.style.setProperty('--d', `${(0.15 + i * 0.035).toFixed(3)}s`);
        group.appendChild(s);
        i++;
      });
      letters.appendChild(group);
      if (w < words.length - 1) { letters.append(' '); i++; }
    });
    h.textContent = '';
    h.append(sr, letters);
  });
})();
