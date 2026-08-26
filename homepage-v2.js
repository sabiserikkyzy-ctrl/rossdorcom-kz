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

function updateHeader() {
  header?.classList.toggle('is-solid', scrollY > innerHeight * .76);
}
updateHeader();
addEventListener('scroll', updateHeader, { passive: true });

const productVisual = document.querySelector('.product-visual');
const productImage = productVisual?.querySelector('img');
const productCaption = productVisual?.querySelector('figcaption span');
const productItems = [...document.querySelectorAll('.product-item')];

function selectProduct(item) {
  if (!productImage || item.classList.contains('is-active')) return;
  productItems.forEach((entry) => entry.classList.toggle('is-active', entry === item));
  productVisual.classList.add('is-changing');
  const commit = () => {
    productImage.src = item.dataset.productImage;
    productImage.alt = item.dataset.productAlt;
    if (productCaption) productCaption.textContent = `PRODUCT SYSTEM / ${item.querySelector('span').textContent}`;
    productVisual.classList.remove('is-changing');
  };
  reducedMotion ? commit() : setTimeout(commit, 180);
}

productItems.forEach((item) => {
  item.addEventListener('pointerenter', () => selectProduct(item));
  item.addEventListener('focus', () => selectProduct(item));
});

if (innerWidth <= 900) {
  const productObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) selectProduct(entry.target); });
  }, { rootMargin: '-35% 0px -45%', threshold: 0 });
  productItems.forEach((item) => productObserver.observe(item));
}

const form = document.querySelector('[data-contact-form]');
const validate = (input) => {
  let message = '';
  if (input.name === 'name' && input.value.trim().length < 2) message = 'Укажите имя.';
  if (input.name === 'phone') {
    const digits = input.value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) message = 'Укажите корректный номер.';
  }
  input.closest('label').querySelector('small').textContent = message;
  return !message;
};
form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const fields = [...form.querySelectorAll('[required]')];
  if (!fields.map(validate).every(Boolean)) { fields.find((field) => !validate(field))?.focus(); return; }
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
        page: location.href
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok || !result.stored) throw new Error('Lead was not stored');
    form.reset();
    status.textContent = 'Заявка отправлена. Специалист ТОО «ROSSDORCOM KZ» свяжется с вами в ближайшее время.';
    status.classList.add('is-success');
  } catch (error) {
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
