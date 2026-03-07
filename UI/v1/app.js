const screens = document.querySelectorAll('.app-screen');
const navItems = document.querySelectorAll('.nav-item');
const backButtons = document.querySelectorAll('[data-back]');
const screenLinks = document.querySelectorAll('[data-target-screen]');
const mainTabs = new Set(['home', 'me']);
const bottomNav = document.querySelector('.bottom-nav');
const floatingAdd = document.querySelector('.floating-add');
const floatingAsk = document.querySelector('.floating-ask');

function setActiveScreen(target) {
  screens.forEach((screen) => {
    screen.classList.toggle('is-active', screen.dataset.screen === target);
  });

  navItems.forEach((item) => {
    item.classList.toggle('is-active', item.dataset.target === target);
  });

  const showHomeUi = target === 'home';
  const showAskUi = target === 'detail';

  floatingAdd.hidden = !showHomeUi;
  floatingAsk.hidden = !showAskUi;
  bottomNav.style.display = mainTabs.has(target) ? 'flex' : 'none';
}

navItems.forEach((item) => {
  item.addEventListener('click', () => {
    setActiveScreen(item.dataset.target);
  });
});

screenLinks.forEach((item) => {
  item.addEventListener('click', () => {
    const target = item.dataset.targetScreen;
    if (target) {
      setActiveScreen(target);
    }
  });
});

backButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setActiveScreen(button.dataset.back);
  });
});

setActiveScreen('home');
