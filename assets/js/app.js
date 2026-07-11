const menuToggle = document.querySelector('#menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');
const yearElement = document.querySelector('#current-year');

const landingStyles = document.createElement('style');
landingStyles.textContent = `
  body > header {
    background: linear-gradient(100deg, #063d28 0%, #0f5c3a 58%, #176b46 100%) !important;
    border-color: rgba(255,255,255,.15) !important;
  }
  body > header a, body > header nav a { color: #f8fafc !important; }
  body > header a span span:last-child { color: #d1fae5 !important; }
  body > header a > span:first-child { border-color: #f8fafc !important; color: #f8fafc !important; }
  body > header #menu-toggle { border-color: rgba(255,255,255,.45) !important; color: #fff !important; }
  body > header #mobile-menu { border-color: rgba(255,255,255,.18) !important; background: #0f5c3a; }
  main > section:first-child aside { background: linear-gradient(135deg, #0b4c32, #d4a72c) !important; }
  main > section:first-child aside > div { background: linear-gradient(145deg, #f0fdf4 0%, #ffffff 52%, #fffbeb 100%) !important; }
`;
document.head.append(landingStyles);

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    mobileMenu.classList.toggle('hidden', isOpen);
  });
}

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}
