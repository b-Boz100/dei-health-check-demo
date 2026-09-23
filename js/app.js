import { computeScores } from './scoring.js';

const state = {
  config: null,
  currentIndex: 0,
  answers: {},
};

const screens = {
  landing: document.getElementById('screen-landing'),
  quiz: document.getElementById('screen-quiz'),
  results: document.getElementById('screen-results'),
};

function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.hidden = key !== name;
  }
}

async function loadConfig() {
  const response = await fetch('config.json');
  if (!response.ok) {
    throw new Error(`Failed to load quiz config: ${response.status}`);
  }
  return response.json();
}

function renderLanding(config) {
  document.getElementById('landing-headline').textContent = config.landing.headline;
  document.getElementById('landing-subheading').textContent = config.landing.subheading;

  const heroImage = document.getElementById('landing-hero-image');
  heroImage.src = config.landing.heroImageUrl;
  heroImage.alt = '';

  document.getElementById('how-it-works-heading').textContent = config.landing.howItWorks.heading;
  document.getElementById('how-it-works-intro').textContent = config.landing.howItWorks.intro;

  const howItWorksImage = document.getElementById('how-it-works-image');
  howItWorksImage.src = config.landing.howItWorks.imageUrl;
  howItWorksImage.alt = '';

  const stepsList = document.getElementById('how-it-works-steps');
  stepsList.innerHTML = '';
  for (const step of config.landing.howItWorks.steps) {
    const item = document.createElement('li');
    item.textContent = step;
    stepsList.append(item);
  }

  document.getElementById('key-areas-heading').textContent = config.landing.keyAreasHeading;
  const keyAreasList = document.getElementById('key-areas-list');
  keyAreasList.innerHTML = '';
  for (const area of config.landing.keyAreas) {
    const card = document.createElement('div');
    card.className = 'key-area-card';

    const icon = document.createElement('img');
    icon.className = 'key-area-icon';
    icon.src = area.iconUrl;
    icon.alt = '';

    const heading = document.createElement('h3');
    heading.textContent = area.name;

    const description = document.createElement('p');
    description.textContent = area.description;

    card.append(icon, heading, description);
    keyAreasList.append(card);
  }

  document.getElementById('landing-about-text').textContent = config.about;

  for (const button of document.querySelectorAll('.start-quiz-button')) {
    button.textContent =
      button.id === 'start-button' ? config.landing.startButtonLabel : config.landing.secondaryButtonLabel;
  }

  const logo = document.getElementById('brand-logo');
  logo.src = config.brand.logoUrl;
  logo.alt = config.brand.name;

  document.documentElement.style.setProperty('--brand-primary', config.brand.primaryColor);
}

function categoryNameFor(config, categoryId) {
  const category = config.categories.find((c) => c.id === categoryId);
  return category ? category.name : '';
}

const ANSWER_LABELS = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];

function renderQuestion() {
  const { config, currentIndex, answers } = state;
  const question = config.questions[currentIndex];

  document.getElementById('quiz-category').textContent = categoryNameFor(config, question.categoryId);
  document.getElementById('quiz-question').textContent = `${currentIndex + 1}. ${question.text}`;

  const optionsContainer = document.getElementById('quiz-options');
  optionsContainer.innerHTML = '';

  ANSWER_LABELS.forEach((label, i) => {
    const value = i + 1;
    const optionId = `option-${value}`;

    const wrapper = document.createElement('label');
    wrapper.className = 'quiz-option';
    wrapper.htmlFor = optionId;

    const labelText = document.createElement('span');
    labelText.textContent = label;

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'answer';
    input.id = optionId;
    input.value = String(value);
    input.checked = answers[question.id] === value;
    input.addEventListener('change', () => {
      state.answers[question.id] = value;
      document.getElementById('next-button').disabled = false;
    });

    wrapper.append(labelText, input);
    optionsContainer.append(wrapper);
  });

  document.getElementById('back-button').hidden = currentIndex === 0;
  document.getElementById('next-button').disabled = answers[question.id] === undefined;
  document.getElementById('next-button').textContent = 'Next';

  document.getElementById('quiz-error').hidden = true;

  const progress = (currentIndex / config.questions.length) * 100;
  document.getElementById('progress-fill').style.width = `${progress}%`;
}

async function submitQuiz() {
  return { scores: computeScores(state.answers, state.config) };
}

async function goToNextQuestion() {
  if (state.currentIndex < state.config.questions.length - 1) {
    state.currentIndex += 1;
    renderQuestion();
    return;
  }

  const nextButton = document.getElementById('next-button');
  const quizError = document.getElementById('quiz-error');
  nextButton.disabled = true;
  nextButton.textContent = 'Calculating your results...';

  try {
    const { scores } = await submitQuiz();
    renderResults(scores);
  } catch (err) {
    quizError.textContent = 'Something went wrong calculating your results. Please try again.';
    quizError.hidden = false;
    nextButton.disabled = false;
    nextButton.textContent = 'Next';
  }
}

function goToPreviousQuestion() {
  if (state.currentIndex > 0) {
    state.currentIndex -= 1;
    renderQuestion();
  }
}

// Renders the CTA body, turning the phone number into a tap-to-call link.
function renderCtaBody(element, body, phone) {
  element.textContent = '';
  const phoneIndex = phone ? body.indexOf(phone) : -1;
  if (phoneIndex === -1) {
    element.textContent = body;
    return;
  }

  const phoneLink = document.createElement('a');
  phoneLink.className = 'cta-phone';
  phoneLink.href = `tel:${phone.replace(/\s/g, '')}`;
  phoneLink.textContent = phone;

  element.append(
    body.slice(0, phoneIndex),
    phoneLink,
    body.slice(phoneIndex + phone.length)
  );
}

function renderResults(scores) {
  const { config } = state;
  const overallBand = scores.overall.band;
  const overallCopy = config.results.overall[overallBand];

  document.getElementById('results-overall-headline').textContent = overallCopy.headline;
  document.getElementById('results-overall-body').textContent = overallCopy.body;
  document.getElementById('results-overall-score').textContent = `${scores.overall.score}%`;
  document.getElementById('results-overall-band').textContent = overallBand;

  const categoriesContainer = document.getElementById('results-categories');
  categoriesContainer.innerHTML = '';

  for (const category of config.categories) {
    const categoryScore = scores.categoryScores[category.id];
    const categoryCopy = config.results.categories[category.id][categoryScore.band];

    const card = document.createElement('div');
    card.className = `category-card band-${categoryScore.band}`;

    const header = document.createElement('div');
    header.className = 'category-header';

    const heading = document.createElement('h4');
    heading.textContent = category.name;

    const scoreBadge = document.createElement('div');
    scoreBadge.className = 'score-circle';
    scoreBadge.setAttribute('aria-label', `Your score: ${categoryScore.score}%, ${categoryScore.band}`);

    const scoreNumber = document.createElement('span');
    scoreNumber.className = 'score-circle-value';
    scoreNumber.textContent = `${categoryScore.score}%`;

    const scoreBand = document.createElement('span');
    scoreBand.className = 'score-circle-band';
    scoreBand.textContent = categoryScore.band;

    scoreBadge.append(scoreNumber, scoreBand);
    header.append(heading, scoreBadge);

    const description = document.createElement('p');
    description.className = 'category-description';
    description.textContent = categoryCopy.description;

    const helpBox = document.createElement('div');
    helpBox.className = 'help-box';

    const helpHeading = document.createElement('p');
    helpHeading.className = 'help-heading';
    helpHeading.textContent = 'CoAct Connect can help you:';

    const bulletList = document.createElement('ul');
    bulletList.className = 'help-list';
    for (const bullet of categoryCopy.helpBullets) {
      const item = document.createElement('li');
      item.textContent = bullet;
      bulletList.append(item);
    }

    helpBox.append(helpHeading, bulletList);
    card.append(header, description, helpBox);
    categoriesContainer.append(card);
  }

  document.getElementById('cta-heading').textContent = config.cta.heading;
  document.getElementById('cta-subheading').textContent = config.cta.subheading;
  renderCtaBody(document.getElementById('cta-body'), config.cta.body, config.cta.phone);
  const ctaButton = document.getElementById('cta-button');
  ctaButton.textContent = config.cta.buttonLabel;
  ctaButton.href = config.cta.url;

  const ctaImage = document.getElementById('cta-image');
  ctaImage.src = config.cta.imageUrl;
  ctaImage.alt = '';

  const footerLogo = document.getElementById('footer-logo');
  footerLogo.src = config.brand.footerLogoUrl;
  footerLogo.alt = config.brand.footerLogoAlt;

  document.getElementById('about-text').textContent = config.about;

  showScreen('results');
}

async function init() {
  const config = await loadConfig();
  state.config = config;

  renderLanding(config);
  showScreen('landing');

  const startQuiz = () => {
    state.currentIndex = 0;
    state.answers = {};
    renderQuestion();
    showScreen('quiz');
  };

  for (const button of document.querySelectorAll('.start-quiz-button')) {
    button.addEventListener('click', startQuiz);
  }

  document.getElementById('next-button').addEventListener('click', goToNextQuestion);
  document.getElementById('back-button').addEventListener('click', goToPreviousQuestion);
}

init();
