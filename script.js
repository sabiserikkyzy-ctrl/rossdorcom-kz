(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  const setMenu = (open) => {
    if (!menuButton || !mobileMenu) return;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    mobileMenu.classList.toggle('open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('locked', open);
  };
  menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  mobileMenu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.querySelectorAll('.dossier-menu a').forEach(link => link.addEventListener('click', () => link.closest('details')?.removeAttribute('open')));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  const updateHeader = () => header?.classList.toggle('scrolled', scrollY > 55 || document.body.classList.contains('inner-page'));
  updateHeader(); addEventListener('scroll', updateHeader, { passive: true });

  const hero = document.querySelector('.hero');
  const heroPlates = [...document.querySelectorAll('[data-depth]')];
  if (hero && heroPlates.length && matchMedia('(pointer:fine)').matches && innerWidth > 900 && !reduced) {
    hero.addEventListener('pointermove', event => {
      const box = hero.getBoundingClientRect();
      const px = (event.clientX - box.left) / box.width - .5;
      const py = (event.clientY - box.top) / box.height - .5;
      hero.style.setProperty('--hero-x', `${event.clientX - box.left}px`);
      hero.style.setProperty('--hero-y', `${event.clientY - box.top}px`);
      heroPlates.forEach(plate => {
        const depth = Number(plate.dataset.depth || 1);
        plate.style.setProperty('--depth-x', `${px * depth * 10}px`);
        plate.style.setProperty('--depth-y', `${py * depth * 8}px`);
      });
    });
    hero.addEventListener('pointerleave', () => heroPlates.forEach(plate => {
      plate.style.setProperty('--depth-x', '0px');
      plate.style.setProperty('--depth-y', '0px');
    }));
  }

  const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting || entry.boundingClientRect.top < innerHeight) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  }), { threshold: .12 });
  document.querySelectorAll('.reveal,.image-reveal').forEach(el => revealObserver.observe(el));

  const easeOut = t => 1 - Math.pow(1 - t, 4);
  const counterObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target, target = Number(el.dataset.count), start = performance.now(), duration = 1600;
    const frame = now => { const p = Math.min((now - start) / duration, 1); el.textContent = Math.round(target * easeOut(p)).toLocaleString('ru-RU'); if (p < 1) requestAnimationFrame(frame); };
    requestAnimationFrame(frame); counterObserver.unobserve(el);
  }), { threshold: .7 });
  document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));

  const clients = [
    ['committee-highways.png', 'Комитет автомобильных дорог', 'Казахстан'],
    ['qazavtojol.png', 'QazAvtoJol', 'Казахстан'],
    ['sine-midas-story.png', 'Sine Midas Story', ''],
    ['china-construction.png', 'Строительная компания из Китая', 'Китай'],
    ['citic-construction.png', 'CITIC Construction', 'Китай'],
    ['sinohydro.png', 'Sinohydro', 'Китай'],
    ['assana-dorstroy.png', 'Ассана-Дорстрой', 'Казахстан'],
    ['akzhol.png', 'Ақжол Құрылыс', 'Казахстан'],
    ['uniserv.png', 'Uniserv', ''],
    ['sgc.png', 'SGC', ''],
    ['kyrgyzstan.png', 'Кыргызская Республика', ''],
    ['uzbekistan.png', 'Республика Узбекистан', ''],
    ['tajikistan.png', 'Республика Таджикистан', '']
  ];
  const clientAssets = Object.fromEntries(
    Object.entries(import.meta.glob('./assets/clients/*.png', { eager: true, query: '?url', import: 'default' }))
      .map(([path, url]) => [path.split('/').pop(), url])
  );
  const clientTrack = document.querySelector('[data-client-track]');
  if (clientTrack) {
    for (let copy = 0; copy < 2; copy += 1) {
      const sequence = document.createElement('div');
      sequence.className = 'client-sequence';
      sequence.setAttribute('aria-hidden', String(copy === 1));
      clients.forEach(([file, name, country], index) => {
        const figure = document.createElement('button');
        figure.type = 'button';
        figure.className = 'client-mark';
        figure.dataset.client = String(index + 1).padStart(2, '0');
        figure.dataset.name = name;
        figure.dataset.country = country;
        figure.setAttribute('aria-label', `Открыть информацию: ${name}`);
        if (copy === 1) figure.tabIndex = -1;
        const image = document.createElement('img');
        image.src = clientAssets[file];
        image.alt = copy === 0 ? name : '';
        image.loading = 'lazy';
        figure.append(image);
        sequence.append(figure);
      });
      clientTrack.append(sequence);
    }
  }

  const clientModal = document.querySelector('.client-modal');
  const clientPanel = clientModal?.querySelector('.client-modal-panel');
  const clientModalImage = clientModal?.querySelector('img');
  const clientModalTitle = clientModal?.querySelector('h3');
  const clientModalCountry = clientModal?.querySelector('p');
  const clientModalClose = clientModal?.querySelector('.client-modal-close');
  let clientLastFocus;
  const closeClientModal = () => {
    if (!clientModal) return;
    clientModal.classList.remove('open');
    clientModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('locked');
    clientLastFocus?.focus();
  };
  clientTrack?.addEventListener('click', event => {
    const mark = event.target.closest('.client-mark');
    if (!mark || !clientModal || !clientModalImage || !clientModalTitle || !clientModalCountry) return;
    clientLastFocus = mark;
    clientModalImage.src = mark.querySelector('img').src;
    clientModalImage.alt = mark.dataset.name;
    clientModalTitle.textContent = mark.dataset.name;
    clientModalCountry.textContent = mark.dataset.country;
    clientModalCountry.hidden = !mark.dataset.country;
    clientModal.classList.add('open');
    clientModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('locked');
    clientModalClose?.focus();
  });
  clientModalClose?.addEventListener('click', closeClientModal);
  clientModal?.addEventListener('click', event => { if (event.target === clientModal) closeClientModal(); });

  document.querySelectorAll('.faq-list button').forEach(button => button.addEventListener('click', () => {
    const opening = button.getAttribute('aria-expanded') !== 'true';
    document.querySelectorAll('.faq-list button[aria-expanded=true]').forEach(other => other.setAttribute('aria-expanded', 'false'));
    button.setAttribute('aria-expanded', String(opening));
  }));

  const servicePreview = document.querySelector('.service-preview');
  document.querySelectorAll('[data-service-image]').forEach(row => {
    row.addEventListener('mouseenter', () => { if (!servicePreview) return; servicePreview.querySelector('img').src = row.dataset.serviceImage; servicePreview.classList.add('show'); });
    row.addEventListener('mousemove', e => { if (!servicePreview) return; servicePreview.style.left = `${Math.min(e.clientX + 25, innerWidth - 360)}px`; servicePreview.style.top = `${Math.min(e.clientY - 110, innerHeight - 250)}px`; });
    row.addEventListener('mouseleave', () => servicePreview?.classList.remove('show'));
  });

  const story = document.querySelector('.story'), storyTrack = document.querySelector('.story-track');
  let ticking = false;
  const updateScrollEffects = () => {
    document.querySelectorAll('.parallax img').forEach(img => { const box = img.parentElement.getBoundingClientRect(); if (box.bottom > 0 && box.top < innerHeight) img.style.transform = `translate3d(0,${(box.top / innerHeight) * -25}px,0) scale(1.06)`; });
    if (story && storyTrack && innerWidth > 760 && !reduced) { const rect = story.getBoundingClientRect(), distance = story.offsetHeight - innerHeight, max = storyTrack.scrollWidth - innerWidth; const progress = Math.max(0, Math.min(1, -rect.top / distance)); storyTrack.style.transform = `translate3d(${-max * progress}px,0,0)`; }
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking && !reduced) { ticking = true; requestAnimationFrame(updateScrollEffects); } }, { passive: true });
  addEventListener('resize', updateScrollEffects); updateScrollEffects();

  const certs = Object.entries(import.meta.glob('./assets/certificates/*.png', { eager: true, query: '?url', import: 'default' }))
    .sort(([a], [b]) => a.localeCompare(b)).map(([, url]) => url);
  const certTrack = document.querySelector('[data-cert-track]');
  if (certTrack) [...certs, ...certs].forEach((src, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'cert-button'; button.dataset.index = String(index % certs.length); button.setAttribute('aria-label', `Открыть сертификат ${index % certs.length + 1}`);
    const img = document.createElement('img'); img.src = src; img.alt = `Сертификат ROSSDORCOM KZ ${index % certs.length + 1}`; img.loading = 'lazy'; button.append(img); certTrack.append(button);
  });
  const modal = document.querySelector('.certificate-modal'), modalImage = modal?.querySelector('img'), modalCount = modal?.querySelector('.modal-count'), modalClose = modal?.querySelector('.modal-close'); let lastFocus;
  const closeModal = () => { if (!modal) return; modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('locked'); lastFocus?.focus(); };
  certTrack?.addEventListener('pointerdown', () => certTrack.classList.add('is-paused'), { capture: true });
  certTrack?.addEventListener('pointerleave', () => certTrack.classList.remove('is-paused'));
  certTrack?.addEventListener('click', e => { const button = e.target.closest('.cert-button'); if (!button || !modal || !modalImage) return; lastFocus = button; const index = Number(button.dataset.index); modalImage.src = certs[index]; modalImage.alt = `Сертификат ROSSDORCOM KZ ${index + 1}`; if (modalCount) modalCount.textContent = `${String(index + 1).padStart(2, '0')} / 08`; modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); document.body.classList.add('locked'); modalClose?.focus(); });
  modalClose?.addEventListener('click', closeModal); modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); }); addEventListener('keydown', e => { if (e.key === 'Escape' && modal?.classList.contains('open')) closeModal(); if (e.key === 'Escape' && clientModal?.classList.contains('open')) closeClientModal(); });

  const contactVideo = document.querySelector('.contact-video');
  if (contactVideo && reduced) contactVideo.pause();

  const form = document.querySelector('[data-contact-form]');
  const validateField = input => { const label = input.closest('label'), raw = input.value.trim(); let message = ''; if (input.name === 'name' && raw.length < 2) message = 'Укажите имя (минимум 2 символа).'; if (input.name === 'phone' && raw.replace(/\D/g, '').length < 10) message = 'Укажите корректный номер телефона.'; label?.classList.toggle('invalid', Boolean(message)); const note = label?.querySelector('small'); if (note) note.textContent = message; return !message; };
  form?.querySelectorAll('input[required]').forEach(input => input.addEventListener('blur', () => validateField(input)));
  form?.addEventListener('submit', e => { e.preventDefault(); const fields = [...form.querySelectorAll('input[required]')]; const valid = fields.map(validateField).every(Boolean); if (!valid) { form.querySelector('.invalid input')?.focus(); return; } form.classList.add('submitted'); const success = form.querySelector('.form-success'); success?.classList.add('show'); success?.focus(); });

  const sections = [...document.querySelectorAll('main section[id]')], navLinks = [...document.querySelectorAll('.desktop-nav a[href^="#"]')];
  if (sections.length && navLinks.length) { const spy = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`)); }), { rootMargin: '-35% 0px -55%', threshold: 0 }); sections.forEach(section => spy.observe(section)); }

  if (matchMedia('(pointer:fine)').matches && innerWidth > 900) {
    const dot = document.querySelector('.cursor-dot'), ring = document.querySelector('.cursor-ring'); if (dot && ring) { document.body.classList.add('has-cursor'); let x = 0, y = 0, rx = 0, ry = 0; addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; dot.style.transform = `translate(${x - 2.5}px,${y - 2.5}px)`; }); const animate = () => { rx += (x - rx) * .13; ry += (y - ry) * .13; ring.style.transform = `translate(${rx - 17.5}px,${ry - 17.5}px)`; requestAnimationFrame(animate); }; animate(); document.querySelectorAll('a,button,input,textarea').forEach(el => { el.addEventListener('mouseenter', () => ring.classList.add('hover')); el.addEventListener('mouseleave', () => ring.classList.remove('hover')); }); }
    document.querySelectorAll('.magnetic').forEach(el => { el.addEventListener('mousemove', e => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX-r.left-r.width/2)*.12}px,${(e.clientY-r.top-r.height/2)*.12}px)`; }); el.addEventListener('mouseleave', () => el.style.transform = ''); });
  }
})();
