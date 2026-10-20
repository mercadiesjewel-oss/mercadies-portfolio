// Shared behaviour for every page of the portfolio.

// Add a soft shadow to the nav once it has tucked up into its stuck position
const header = document.querySelector('.site-header');
const updateHeader = () => {
  const pad = parseFloat(getComputedStyle(header).getPropertyValue('--header-pad'));
  header.classList.toggle('is-stuck', window.scrollY > pad - 10);
};
addEventListener('scroll', updateHeader, { passive: true });
addEventListener('resize', updateHeader);
updateHeader();

// Reading progress line along the top edge
(() => {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.append(bar);
  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  };
  const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  update();
})();

// Small details: the spotlight follows the cursor, the tilt tile leans toward it
(() => {
  const canPoint = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  if (!canPoint.matches) return;
  document.querySelectorAll('.tile--spotlight').forEach((tile) => {
    tile.addEventListener('pointermove', (e) => {
      const r = tile.getBoundingClientRect();
      tile.style.setProperty('--mx', `${e.clientX - r.left}px`);
      tile.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
  const tiltTile = document.querySelector('.tile--tilt');
  if (tiltTile) {
    const surface = tiltTile.querySelector('.tile__surface');
    tiltTile.addEventListener('pointermove', (e) => {
      const r = tiltTile.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      surface.style.transform = `perspective(600px) rotateX(${-y * 24}deg) rotateY(${x * 24}deg)`;
    });
    tiltTile.addEventListener('pointerleave', () => { surface.style.transform = ''; });
  }
})();

// Hamburger menu (smaller screens)
const toggle = header.querySelector('.nav__toggle');
const setMenu = (open) => {
  header.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', open);
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
};
toggle.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));
header.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && header.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
});
document.addEventListener('click', (e) => { if (!header.contains(e.target)) setMenu(false); });
// Full bar or hamburger? Measure the real words: if the M and every link can't
// fit side by side with at least the minimum gap between them, switch to the
// hamburger menu (so the last word never runs off the screen).
(() => {
  const root = document.documentElement;
  const nav = header.querySelector('.nav');
  const words = [...nav.querySelectorAll('.nav__brand, .nav li a')];
  const fit = () => {
    const cs = getComputedStyle(nav);
    const space = nav.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const minGap = parseFloat(cs.getPropertyValue('--nav-min-gap')) || 48;
    const needed = words.reduce((sum, w) => sum + w.getBoundingClientRect().width, 0) + minGap * (words.length - 1);
    const compact = needed > space;
    if (compact === root.classList.contains('nav-compact')) return;
    // Switch modes instantly: without this, the dropdown's open/close fade
    // would briefly play, flashing the menu open as the bar changes over
    root.classList.add('nav-switching');
    setMenu(false);
    root.classList.toggle('nav-compact', compact);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('nav-switching')));
  };
  fit();
  new ResizeObserver(fit).observe(nav);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);   // widths change once the font loads
})();

// Intro builds: every [data-intro] title builds itself whenever it comes into
// view, and resets once it's scrolled fully away so it replays on return.
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('js-intro')) return;   // reduced motion: show as-is

  const controllers = [...document.querySelectorAll('[data-intro]')].map((el) => {
    // Time the build from the title's own length, so longer titles finish cleanly
    const letters = el.querySelectorAll('.hero__chars > span').length;
    const stagger = parseFloat(getComputedStyle(el).getPropertyValue('--stagger')) || 110;
    const lettersDone = Math.max(0, letters - 1) * stagger + 1900;
    const settleAt = Math.max(2400, lettersDone - 500);   // shadow sets in
    const doneAt = Math.max(3200, lettersDone + 300);     // everything finished

    let timers = [];
    let state = 'hidden';                                  // hidden → playing → built
    const reset = () => {
      timers.forEach(clearTimeout); timers = [];
      el.classList.remove('intro-play', 'is-settled', 'is-built');
      state = 'hidden';
    };
    const play = () => {
      if (state !== 'hidden') return;
      state = 'playing';
      void el.offsetWidth;                                 // restart animations cleanly
      el.classList.add('intro-play');
      timers.push(setTimeout(() => {
        el.classList.add('is-settled');
        document.dispatchEvent(new Event('hero:settled'));
      }, settleAt));
      timers.push(setTimeout(() => {
        el.classList.add('is-built');
        el.classList.remove('intro-play');
        state = 'built';
      }, doneAt));
    };
    const inView = () => {
      const r = el.getBoundingClientRect();
      return r.bottom > innerHeight * .25 && r.top < innerHeight * .75;
    };
    const observe = () => new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) reset();                  // fully out of view → ready to replay
      else if (entry.intersectionRatio >= .3) play();      // back in view → build
    }, { threshold: [0, .3] }).observe(el);
    return { reset, play, inView, observe };
  });

  const start = () => {
    // Nav arrives once on first load
    root.classList.add('nav-play');
    setTimeout(() => root.classList.remove('nav-intro', 'nav-play'), 4400);
    controllers.forEach(c => c.observe());
  };
  // Wait for the font so letters never shift mid-build (with a safety net)
  let started = false;
  const once = () => { if (!started) { started = true; start(); } };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(once);
  setTimeout(once, 1200);

  // Coming back via the browser's back button restores the page from cache — replay then too
  addEventListener('pageshow', (e) => {
    if (e.persisted) controllers.forEach(c => { c.reset(); if (c.inView()) c.play(); });
  });
})();

// Section reveals: each section's content eases in whenever its heading
// scrolls into view (in either direction), and resets once the whole section
// has left the screen so it plays again next time. While an intro title is
// building, reveals wait for it to settle so the two never compete.
(() => {
  if (!document.documentElement.classList.contains('motion')) return;
  const groups = [...document.querySelectorAll('[data-reveal-group]')];
  if (!('IntersectionObserver' in window)) {
    return groups.forEach(g => g.classList.add('is-revealed'));
  }
  const intros = [...document.querySelectorAll('[data-intro]')];
  // Busy = an intro is (or is about to be) building: enough of it is on screen
  // to play (same 30% as its own trigger) and it hasn't settled yet
  const introBusy = () => intros.some((el) => {
    if (el.classList.contains('is-settled') || el.classList.contains('is-built')) return false;
    const r = el.getBoundingClientRect();
    const visible = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
    return visible >= r.height * .3;
  });
  const pending = new Set();

  const reveal = (g) => {
    if (introBusy()) { pending.add(g); return; }
    g.classList.add('is-revealed');
  };
  // Release waiting sections once nothing is building — when an intro settles,
  // or (if it was scrolled away before finishing) as soon as the page moves on.
  const flush = () => {
    if (!pending.size || introBusy()) return;
    pending.forEach(g => g.classList.add('is-revealed'));
    pending.clear();
  };
  document.addEventListener('hero:settled', flush);
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking || !pending.size) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; flush(); });
  }, { passive: true });

  // Trigger: the section's first piece passes ~80% of the way down the screen
  const trigger = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) reveal(e.target.closest('[data-reveal-group]')); });
  }, { rootMargin: '0px 0px -20% 0px' });

  // Reset: the whole section is off screen → hide it again, ready to replay
  const resetter = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) return;
      pending.delete(e.target);
      e.target.classList.remove('is-revealed');
    });
  }, { rootMargin: '-2px 0px -2px 0px' });   // just touching the screen edge counts as gone

  groups.forEach(g => {
    trigger.observe(g.querySelector('[data-reveal]'));
    resetter.observe(g);
  });
})();

// Nav underline follows the section currently in the middle of the screen.
// Only links to sections on this page are tracked; a page can also mark a
// default link (data-default-current — e.g. "Design Projects" on a project
// page) that is underlined whenever no tracked section is in the middle.
(() => {
  const here = location.pathname;
  const all = [...document.querySelectorAll('.nav a')];
  const fallback = document.querySelector('.nav a[data-default-current]');
  const links = new Map(all.filter(a => a.hash && a.pathname === here).map(a => [a.hash.slice(1), a]));
  if (!links.size) return;
  const sections = [...document.querySelectorAll('main section')];
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      all.forEach(a => a.classList.remove('is-current'));
      (links.get(e.target.id) || fallback)?.classList.add('is-current');   // landing hero → none
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => spy.observe(s));
})();

// Business card stack (project pages): click, tap or Enter/Space shuffles
// which side of the card sits on top
document.querySelectorAll('.card-stack').forEach((stack) => {
  const shuffle = () => stack.classList.toggle('is-swapped');
  stack.addEventListener('click', shuffle);
  stack.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); shuffle(); }
  });
});

// Project gallery: hover to open (mouse), tap or swipe (touch), arrow keys (keyboard)
(() => {
  const rail = document.querySelector('.projects__rail');
  if (!rail) return;
  const cards = [...rail.querySelectorAll('.project-card')];
  const dots = [...document.querySelectorAll('.projects__dots button')];
  let active = 0;
  const activate = (i) => {
    active = Math.max(0, Math.min(cards.length - 1, i));
    cards.forEach((c, j) => c.classList.toggle('is-active', j === active));
    dots.forEach((d, j) => d.setAttribute('aria-current', j === active));
  };
  const canHover = matchMedia('(hover: hover) and (pointer: fine)');
  let hoverTimer, swiped = false;
  cards.forEach((card, i) => {
    // a short pause before opening, so sweeping the mouse across doesn't make the row flutter
    card.addEventListener('mouseenter', () => {
      if (!canHover.matches) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => activate(i), 70);
    });
    // A folded card opens on the first tap/click; only an open card follows its link
    card.addEventListener('click', (e) => {
      if (swiped || !card.classList.contains('is-active')) {
        e.preventDefault();
        if (!swiped) activate(i);
      }
    });
    card.addEventListener('focus', () => { if (card.matches(':focus-visible')) activate(i); });
  });
  rail.addEventListener('mouseleave', () => clearTimeout(hoverTimer));
  dots.forEach((d, i) => d.addEventListener('click', () => activate(i)));
  rail.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    activate(active + (e.key === 'ArrowRight' ? 1 : -1));
    cards[active].focus();
  });
  let touchX = null, touchY = null;
  rail.addEventListener('touchstart', (e) => {
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  }, { passive: true });
  rail.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      activate(active + (dx < 0 ? 1 : -1));
      swiped = true;                    // ignore the tap the browser may fire after a swipe
      setTimeout(() => { swiped = false; }, 350);
    }
    touchX = null;
  });
})();

// GSAP Scroll Animations — Award-winning choreography
(() => {
  // Check if GSAP is loaded
  if (typeof gsap === 'undefined') return;

  // Register ScrollTrigger
  gsap.registerPlugin(ScrollTrigger);

  // Animate section titles with elegant color and scale
  document.querySelectorAll('.section-title').forEach((title, i) => {
    gsap.fromTo(
      title,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        scrollTrigger: {
          trigger: title,
          start: 'top 80%',
          end: 'top 60%',
          scrub: 0.5,
          markers: false
        }
      }
    );
  });

  // Animate project cards with sophisticated entrance
  document.querySelectorAll('.project-card').forEach((card, i) => {
    gsap.fromTo(
      card,
      { opacity: 0, y: 40, filter: 'blur(8px)' },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 1.2,
        delay: i * 0.15,
        ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          end: 'top 65%',
          scrub: 0.8,
          markers: false
        }
      }
    );
  });

  // Parallax effect on intro section
  const introAbout = document.querySelector('.intro-about');
  if (introAbout) {
    gsap.to(
      introAbout,
      {
        y: -40,
        ease: 'none',
        scrollTrigger: {
          trigger: introAbout,
          start: 'top center',
          end: 'bottom center',
          scrub: 1,
          markers: false
        }
      }
    );
  }

  // Staggered animation for body text
  document.querySelectorAll('[data-reveal-group]').forEach((group) => {
    const reveals = group.querySelectorAll('[data-reveal]');
    gsap.fromTo(
      reveals,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.15,
        ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        scrollTrigger: {
          trigger: group,
          start: 'top 75%',
          end: 'top 55%',
          scrub: 0.6,
          markers: false
        }
      }
    );
  });

  // Refresh ScrollTrigger when fonts load
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
})();
