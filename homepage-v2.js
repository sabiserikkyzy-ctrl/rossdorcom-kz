const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('.mobile-menu');

function setMenu(open) {
  menuButton?.setAttribute('aria-expanded', String(open));
  menuButton?.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  mobileMenu?.classList.toggle('open', open);
  mobileMenu?.setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('menu-open', open);
}

menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
mobileMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });
const updateHeader = () => header?.classList.toggle('is-solid', scrollY > 80);
updateHeader();
addEventListener('scroll', updateHeader, { passive: true });

const productCards = [...document.querySelectorAll('.product-card')];
function selectProduct(card) {
  productCards.forEach((item) => {
    const active = item === card;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-pressed', String(active));
  });
}
productCards.forEach((card) => {
  card.addEventListener('click', (event) => { if (!event.target.closest('a')) selectProduct(card); });
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectProduct(card);
    }
  });
});

const counters = [...document.querySelectorAll('[data-count]')];
function animateCounter(element) {
  const target = Number(element.dataset.count);
  if (!Number.isFinite(target) || reducedMotion) {
    element.textContent = target.toLocaleString('ru-RU');
    return;
  }
  const start = target === 2013 ? 2000 : 0;
  const duration = 1400;
  const startedAt = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(start + (target - start) * eased).toLocaleString('ru-RU');
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
if ('IntersectionObserver' in window && !reducedMotion) {
  const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCounter(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: .65 });
  counters.forEach((counter) => counterObserver.observe(counter));
} else {
  counters.forEach(animateCounter);
}

const equipmentNavigation = [...document.querySelectorAll('.equipment-nav-item')];
const equipmentDisplays = [...document.querySelectorAll('.equipment-display-item')];
function selectEquipment(index) {
  equipmentNavigation.forEach((item, position) => {
    const active = index === position;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  equipmentDisplays.forEach((item, position) => item.classList.toggle('is-active', index === position));
}
equipmentNavigation.forEach((button, index) => button.addEventListener('click', () => selectEquipment(index)));

function makeMarquee(rail) {
  if (!rail || rail.querySelector('.marquee-track')) return;
  const items = [...rail.children];
  const track = document.createElement('div');
  const sequence = document.createElement('div');
  sequence.className = 'marquee-sequence';
  items.forEach((item) => sequence.append(item));
  const clone = sequence.cloneNode(true);
  clone.setAttribute('aria-hidden', 'true');
  clone.querySelectorAll('button,[tabindex]').forEach((item) => item.setAttribute('tabindex', '-1'));
  track.className = 'marquee-track';
  track.append(sequence, clone);
  rail.append(track);
}
makeMarquee(document.querySelector('[data-partner-rail]'));
makeMarquee(document.querySelector('[data-certificate-rail]'));

const certificateDialog = document.querySelector('[data-certificate-dialog]');
const dialogImage = certificateDialog?.querySelector('img');
document.querySelectorAll('[data-certificate-rail] button').forEach((button) => button.addEventListener('click', () => {
  if (!certificateDialog || !dialogImage) return;
  dialogImage.src = button.dataset.certificate;
  dialogImage.alt = button.querySelector('img')?.alt || 'Сертификат ТОО «ROSSDORCOM KZ»';
  certificateDialog.showModal();
}));
certificateDialog?.querySelector('[data-dialog-close]')?.addEventListener('click', () => certificateDialog.close());
certificateDialog?.addEventListener('click', (event) => { if (event.target === certificateDialog) certificateDialog.close(); });

const form = document.querySelector('[data-contact-form]');
const validate = (input) => {
  let message = '';
  if (input.name === 'name' && input.value.trim().length < 2) message = 'Укажите имя.';
  if (input.name === 'phone') {
    const digits = input.value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) message = 'Укажите корректный номер.';
  }
  const label = input.closest('label');
  label?.classList.toggle('invalid', Boolean(message));
  const error = label?.querySelector('small');
  if (error) error.textContent = message;
  return !message;
};
form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const fields = [...form.querySelectorAll('[required]')];
  const invalid = fields.find((field) => !validate(field));
  if (invalid) { invalid.focus(); return; }
  const status = form.querySelector('.form-status');
  const submitButton = form.querySelector('[type="submit"]');
  const submitLabel = form.querySelector('[data-submit-label]');
  const originalLabel = submitLabel?.textContent;
  status.textContent = '';
  status.className = 'form-status';
  submitButton.disabled = true;
  form.setAttribute('aria-busy', 'true');
  if (submitLabel) submitLabel.textContent = 'Отправляем...';
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.elements.name.value,
        phone: form.elements.phone.value,
        message: form.elements.message.value,
        website: form.elements.website.value,
        page: location.href,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok || !result.stored) throw new Error('Lead was not stored');
    form.reset();
    status.textContent = 'Заявка отправлена. Специалист ТОО «ROSSDORCOM KZ» свяжется с вами.';
    status.classList.add('is-success');
  } catch {
    status.textContent = 'Не удалось отправить заявку. Позвоните нам или напишите на info@rossdorcom.kz.';
    status.classList.add('is-error');
  } finally {
    submitButton.disabled = false;
    form.removeAttribute('aria-busy');
    if (submitLabel) submitLabel.textContent = originalLabel;
    status.focus();
  }
});
form?.querySelectorAll('[required]').forEach((input) => input.addEventListener('blur', () => validate(input)));
