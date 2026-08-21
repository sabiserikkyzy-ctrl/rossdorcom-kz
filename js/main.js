(function () {
  'use strict';

  const header = document.getElementById('header');
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  const form = document.getElementById('form');
  const formSuccess = document.getElementById('form-success');
  const floatingCta = document.getElementById('floating-cta');
  const hero = document.querySelector('.hero');

  /* ---- Sticky header ---- */
  function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 40);

    if (floatingCta && hero) {
      const heroBottom = hero.offsetTop + hero.offsetHeight;
      floatingCta.classList.toggle('is-visible', window.scrollY > heroBottom * 0.6);
    }

    updateActiveNav();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Mobile menu ---- */
  function closeMenu() {
    nav.classList.remove('is-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function openMenu() {
    nav.classList.add('is-open');
    burger.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  burger.addEventListener('click', function () {
    if (nav.classList.contains('is-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  nav.querySelectorAll('.header__nav-link').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  /* ---- Smooth scroll for all anchor CTAs ---- */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      closeMenu();
    });
  });

  /* ---- Active nav link ---- */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.header__nav-link');

  function updateActiveNav() {
    const scrollPos = window.scrollY + header.offsetHeight + 80;

    sections.forEach(function (section) {
      const top = section.offsetTop;
      const bottom = top + section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < bottom) {
        navLinks.forEach(function (link) {
          link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
        });
      }
    });
  }

  /* ---- Scroll reveal ---- */
  const revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  /* ---- Form validation & submit ---- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const fields = form.querySelectorAll('[required]');
    let valid = true;

    fields.forEach(function (field) {
      field.classList.remove('is-invalid');

      if (field.type === 'checkbox' && !field.checked) {
        field.classList.add('is-invalid');
        valid = false;
      } else if (field.type !== 'checkbox' && !field.value.trim()) {
        field.classList.add('is-invalid');
        valid = false;
      }
    });

    const emailField = form.querySelector('#email');
    if (emailField.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value)) {
      emailField.classList.add('is-invalid');
      valid = false;
    }

    if (!valid) return;

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка…';

    setTimeout(function () {
      form.reset();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить на расчёт';
      formSuccess.hidden = false;

      form.querySelectorAll('.form__input, .form__textarea').forEach(function (el) {
        el.classList.remove('is-invalid');
      });

      setTimeout(function () {
        formSuccess.hidden = true;
      }, 8000);
    }, 1200);
  });

  form.querySelectorAll('.form__input, .form__textarea').forEach(function (input) {
    input.addEventListener('input', function () {
      this.classList.remove('is-invalid');
    });
  });
})();
