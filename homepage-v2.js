import { totalEquipment } from './js/equipment-data.js';

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

const totalNode = document.querySelector('[data-equipment-total]');
if (totalNode) totalNode.textContent = totalEquipment;

const form = document.querySelector('[data-contact-form]');
const validate = (input) => {
  let message = '';
  if (input.name === 'name' && input.value.trim().length < 2) message = 'Укажите имя.';
  if (input.name === 'phone' && input.value.replace(/\D/g, '').length < 10) message = 'Укажите корректный номер.';
  input.closest('label').querySelector('small').textContent = message;
  return !message;
};
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const fields = [...form.querySelectorAll('[required]')];
  if (!fields.map(validate).every(Boolean)) { fields.find((field) => !validate(field))?.focus(); return; }
  const status = form.querySelector('.form-status');
  status.textContent = 'Данные проверены. Свяжитесь с отделом проектов по телефону или электронной почте.';
  status.focus();
});
form?.querySelectorAll('[required]').forEach((input) => input.addEventListener('blur', () => validate(input)));
