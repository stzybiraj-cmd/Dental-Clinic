/* ==========================================================================
   [Pallavi Dental Clinic] — Dental Hospital Website
   script.js  ·  vanilla JavaScript, no dependencies

   CONTENTS
   01. Config & helpers
   02. Footer year
   03. Header: shadow on scroll, mobile menu, active link
   04. Scroll-reveal animations
   05. Stats counter animation
   06. Before / After slider
   07. Testimonials carousel
   08. FAQ accordion
   09. Booking form validation
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     01. CONFIG & HELPERS
     ------------------------------------------------------------------------ */
  const CONFIG = {
    carouselAutoplayMs: 0,   // set to e.g. 7000 to auto-advance testimonials (0 = off)
    fakeSubmitDelayMs: 700   // simulated network delay for the booking form
  };

  const $  = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


  /* ------------------------------------------------------------------------
     02. FOOTER YEAR
     ------------------------------------------------------------------------ */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();


  /* ------------------------------------------------------------------------
     03. HEADER: SHADOW ON SCROLL, MOBILE MENU, ACTIVE LINK
     ------------------------------------------------------------------------ */
  const header = $('.site-header');
  const nav = $('#primary-nav');
  const navToggle = $('.nav-toggle');

  // Add a soft border/shadow to the header once the page has scrolled
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Open / close the hamburger menu
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  navToggle.addEventListener('click', () => {
    setMenu(navToggle.getAttribute('aria-expanded') !== 'true');
  });

  // Close the menu after choosing a link, pressing Escape, or resizing to desktop
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      setMenu(false);
      navToggle.focus();
    }
  });
  window.matchMedia('(min-width: 960px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  // Highlight the nav link of the section currently in view
  const navLinks = $$('.nav__link');
  const sectionsById = new Map();
  navLinks.forEach((link) => {
    const section = $(link.getAttribute('href'));
    if (section) sectionsById.set(section, link);
  });

  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((l) => { l.classList.remove('is-active'); l.removeAttribute('aria-current'); });
        const active = sectionsById.get(entry.target);
        if (active) {
          active.classList.add('is-active');
          active.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });   // trigger when a section crosses mid-screen
    sectionsById.forEach((_, section) => spy.observe(section));
  }


  /* ------------------------------------------------------------------------
     04. SCROLL-REVEAL ANIMATIONS
     - Anything with [data-reveal] fades in once.
     - Children of [data-stagger] are revealed one after another.
     ------------------------------------------------------------------------ */
  $$('[data-stagger]').forEach((group) => {
    Array.from(group.children).forEach((child, i) => {
      child.setAttribute('data-reveal', '');
      child.style.setProperty('--d', `${i * 70}ms`);
    });
  });

  const revealTargets = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);        // animate once
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealTargets.forEach((el) => revealObserver.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-visible'));
  }


  /* ------------------------------------------------------------------------
     05. STATS COUNTER
     Reads data-count (target number) and data-suffix (e.g. "+" or "%").
     ------------------------------------------------------------------------ */
  const formatNumber = (n) => n.toLocaleString('en-US');

  const animateCount = (el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const duration = 1600;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);           // ease-out cubic
      el.textContent = formatNumber(Math.round(target * eased)) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const counters = $$('.stat__num[data-count]');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => {
      el.textContent = '0' + (el.dataset.suffix || '');
      counterObserver.observe(el);
    });
  }
  // Otherwise the final numbers already written in the HTML stay as they are.


  /* ------------------------------------------------------------------------
     06. BEFORE / AFTER SLIDER
     The visible handle follows the value of a hidden <input type="range">.
     ------------------------------------------------------------------------ */
  $$('.compare').forEach((compare) => {
    const range = $('input[type="range"]', compare);
    const update = () => compare.style.setProperty('--pos', `${range.value}%`);
    range.addEventListener('input', update);
    update();
  });


  /* ------------------------------------------------------------------------
     07. TESTIMONIALS CAROUSEL
     Buttons, dots, arrow keys, swipe, and optional autoplay.
     ------------------------------------------------------------------------ */
  const carousel = $('[data-carousel]');
  if (carousel) {
    const viewport = $('.carousel__viewport', carousel);
    const track = $('.carousel__track', carousel);
    const slides = $$('.carousel__slide', carousel);
    const dotsWrap = $('[data-dots]', carousel);
    let index = 0;
    let timer = null;

    // Build one dot per slide
    const dots = slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel__dot';
      dot.setAttribute('aria-label', `Go to testimonial ${i + 1}`);
      dot.addEventListener('click', () => { goTo(i); restartAutoplay(); });
      dotsWrap.appendChild(dot);
      return dot;
    });

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = `translateX(${-index * 100}%)`;
      slides.forEach((slide, k) => {
        const isCurrent = k === index;
        slide.setAttribute('aria-hidden', String(!isCurrent));
        slide.inert = !isCurrent;                 // keeps hidden slides out of the tab order
      });
      dots.forEach((dot, k) => dot.setAttribute('aria-current', String(k === index)));
    }

    $('[data-prev]', carousel).addEventListener('click', () => { goTo(index - 1); restartAutoplay(); });
    $('[data-next]', carousel).addEventListener('click', () => { goTo(index + 1); restartAutoplay(); });

    // Keyboard: left / right arrows while focus is inside the carousel
    carousel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft')  { goTo(index - 1); restartAutoplay(); }
      if (e.key === 'ArrowRight') { goTo(index + 1); restartAutoplay(); }
    });

    // Swipe on touch screens / drag with a mouse
    let startX = null;
    viewport.addEventListener('pointerdown', (e) => { startX = e.clientX; });
    viewport.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const delta = e.clientX - startX;
      if (Math.abs(delta) > 45) { goTo(index + (delta < 0 ? 1 : -1)); restartAutoplay(); }
      startX = null;
    });
    viewport.addEventListener('pointercancel', () => { startX = null; });

    // Optional autoplay (off by default). Pauses on hover and keyboard focus.
    function startAutoplay() {
      if (!CONFIG.carouselAutoplayMs || prefersReducedMotion) return;
      timer = setInterval(() => goTo(index + 1), CONFIG.carouselAutoplayMs);
    }
    function stopAutoplay() { clearInterval(timer); timer = null; }
    function restartAutoplay() { stopAutoplay(); startAutoplay(); }

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);

    goTo(0);
    startAutoplay();
  }


  /* ------------------------------------------------------------------------
     08. FAQ ACCORDION
     Each button toggles aria-expanded and an "is-open" class on its panel.
     (One item open at a time; remove the "close others" block to allow many.)
     ------------------------------------------------------------------------ */
  const accordion = $('[data-accordion]');
  if (accordion) {
    const triggers = $$('.accordion__trigger', accordion);

    const setItem = (trigger, open) => {
      trigger.setAttribute('aria-expanded', String(open));
      document.getElementById(trigger.getAttribute('aria-controls')).classList.toggle('is-open', open);
    };

    triggers.forEach((trigger) => {
      // Sync the starting state from the HTML
      setItem(trigger, trigger.getAttribute('aria-expanded') === 'true');

      trigger.addEventListener('click', () => {
        const willOpen = trigger.getAttribute('aria-expanded') !== 'true';
        triggers.forEach((other) => { if (other !== trigger) setItem(other, false); }); // close others
        setItem(trigger, willOpen);
      });
    });
  }


  /* ------------------------------------------------------------------------
     09. BOOKING FORM VALIDATION
     ------------------------------------------------------------------------ */
  const form = $('#booking-form');
  if (form) {
    const successBox = $('#form-success');
    const successName = $('#success-name');
    const submitBtn = $('button[type="submit"]', form);
    const dateInput = $('#date');

    // Local-time YYYY-MM-DD for "today" (avoids UTC off-by-one problems)
    const toISODate = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    const today = toISODate(new Date());
    dateInput.min = today;   // prevents picking past dates in the date picker

    // One validator per field. Return an error string, or '' when the value is fine.
    const validators = {
      name(value) {
        if (!value.trim()) return 'Please enter your full name.';
        if (value.trim().length < 2) return 'Your name looks too short.';
        return '';
      },
      phone(value) {
        if (!value.trim()) return 'Please enter a phone number.';
        const digits = value.replace(/\D/g, '');
        if (!/^[+\d\s().-]+$/.test(value) || digits.length < 7 || digits.length > 15) {
          return 'Enter a valid phone number, e.g. +1 555 012 3456.';
        }
        return '';
      },
      email(value) {
        if (!value.trim()) return 'Please enter your email address.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())) return 'Enter a valid email, e.g. name@example.com.';
        return '';
      },
      service(value) {
        return value ? '' : 'Please choose a service.';
      },
      date(value) {
        if (!value) return 'Please choose a preferred date.';
        if (value < today) return 'Please choose today or a future date.';
        return '';
      },
      time(value) {
        return value ? '' : 'Please choose a preferred time.';
      },
      message(value) {
        return value.length > 500 ? 'Please keep your message under 500 characters.' : '';
      }
    };

    // Show or clear the error for a single field
    const validateField = (field) => {
      const check = validators[field.name];
      if (!check) return true;
      const error = check(field.value);
      const errorEl = document.getElementById(`${field.id}-error`);
      errorEl.textContent = error;
      field.setAttribute('aria-invalid', String(Boolean(error)));
      return !error;
    };

    const fields = Array.from(form.elements).filter((el) => validators[el.name]);

    // Validate when leaving a field, and re-validate while typing once an error is showing
    fields.forEach((field) => {
      field.addEventListener('blur', () => validateField(field));
      field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      });
      field.addEventListener('change', () => validateField(field));
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Validate everything, then focus the first invalid field
      const results = fields.map((field) => validateField(field));
      if (results.includes(false)) {
        fields[results.indexOf(false)].focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      /* TODO: send the data to your backend or email service here, e.g.
         const data = Object.fromEntries(new FormData(form));
         fetch('/api/appointments', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(data)
         }).then(showSuccess).catch(showError);
         Until then, we simulate a short delay and show the success message. */
      setTimeout(() => {
        successName.textContent = $('#name').value.trim().split(/\s+/)[0];
        form.hidden = true;
        successBox.hidden = false;
        successBox.focus();               // announces the message to screen readers
        form.reset();
        fields.forEach((f) => f.removeAttribute('aria-invalid'));
        submitBtn.disabled = false;
        submitBtn.textContent = 'Request appointment';
      }, CONFIG.fakeSubmitDelayMs);
    });

    // "Book another appointment" returns to the empty form
    $('#book-another').addEventListener('click', () => {
      successBox.hidden = true;
      form.hidden = false;
      $('#name').focus();
    });
  }
})();
