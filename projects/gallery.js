(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frames = [...document.querySelectorAll('.p-main .p-frame')];

  if (!reduce && 'IntersectionObserver' in window) {
    frames.forEach((f) => f.classList.add('p-reveal'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    frames.forEach((f) => io.observe(f));
  }

  const links = [...document.querySelectorAll('.p-main a.p-zoom')];
  if (!links.length) return;

  const dlg = document.createElement('dialog');
  dlg.className = 'p-lightbox';
  dlg.setAttribute('aria-label', 'Enlarged view');
  dlg.innerHTML = `
    <button class="p-lb__btn p-lb__close" type="button" aria-label="Close">×</button>
    <button class="p-lb__btn p-lb__prev" type="button" aria-label="Previous image">←</button>
    <figure><img alt=""><figcaption></figcaption></figure>
    <button class="p-lb__btn p-lb__next" type="button" aria-label="Next image">→</button>`;
  document.body.append(dlg);

  const img = dlg.querySelector('img');
  const cap = dlg.querySelector('figcaption');
  let current = 0;

  const show = (n) => {
    current = (n + links.length) % links.length;
    const a = links[current];
    img.src = a.href;
    img.alt = a.querySelector('img').alt;
    cap.textContent = `${current + 1} / ${links.length}`;
  };

  links.forEach((a, n) => a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    show(n);
    dlg.showModal();
  }));

  dlg.querySelector('.p-lb__close').addEventListener('click', () => dlg.close());
  dlg.querySelector('.p-lb__prev').addEventListener('click', () => show(current - 1));
  dlg.querySelector('.p-lb__next').addEventListener('click', () => show(current + 1));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
})();
