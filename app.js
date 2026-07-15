import {
  aboutCase,
  cases,
  dokieArtifactManifest,
  dokieTemplateSystem,
  vivaJourneyByTitle,
} from "./shell/case-registry.js";
import { runtimeState as aboutRuntimeState } from "./cases/about/runtime-state.js";
import { runtimeState as coladaRuntimeState } from "./cases/colada/runtime-state.js";
import { runtimeState as dokieRuntimeState } from "./cases/dokie/runtime-state.js";
import { runtimeState as vivaRuntimeState } from "./cases/viva-video/runtime-state.js";
import { runtimeState as soundsNomadRuntimeState } from "./cases/soundsnomad/runtime-state.js";


const selectEntries = [aboutCase, ...cases];
const allCaseEntries = selectEntries;
const caseMap = new Map(allCaseEntries.map((item) => [item.id, item]));

// Dokie 的公开 Showcase 只读引用真实产物，不在页面中复制、OCR、改写或重新生成内容。






const targets = Array.from(document.querySelectorAll("[data-case-target]"));
const homeCardRail = document.querySelector(".home-card-rail");
const aboutButton = document.querySelector("[data-about-trigger]");
const cabinet = document.querySelector("[data-arcade-cabinet]");
const progress = document.querySelector("[data-case-progress]");
const screenCount = document.querySelector("[data-screen-count]");
const selectPanel = document.querySelector("[data-screen-panel='select']");
const casePanel = document.querySelector("[data-screen-panel='case']");
const caseKicker = document.querySelector("[data-case-kicker]");
const caseTitle = document.querySelector("[data-case-title]");
const caseSummary = document.querySelector("[data-case-summary]");
const caseVisual = document.querySelector("[data-case-visual]");
const caseFileKicker = document.querySelector("[data-case-file-kicker]");
const caseFileTitle = document.querySelector("[data-case-file-title]");
const caseFileSummary = document.querySelector("[data-case-file-summary]");
const casePage = document.querySelector("[data-case-page]");
const casePageLabel = document.querySelector("[data-case-page-label]");
const stopButton = document.querySelector("[data-stop-game]");
const startButtons = Array.from(document.querySelectorAll("[data-start-case]"));
const stepBackButton = document.querySelector("[data-step-back]");
const stepForwardButton = document.querySelector("[data-step-forward]");
const musicToggle = document.querySelector("[data-music-toggle]");
const musicLabel = document.querySelector("[data-music-label]");
const soundtrack = document.querySelector("[data-site-soundtrack]");
const crtBootOverlay = document.querySelector("[data-crt-boot]");
const crtStartButton = document.querySelector("[data-crt-start]");
const controlPanel = document.querySelector(".control-panel");

let activeCaseId = getInitialCaseId();
let screenMode = getInitialScreenMode();
let activePageIndex = getInitialPageIndex();
let renderedRouteKey = "";
let musicEnabled = false;
let musicAvailable = true;
let experienceStarted = false;
const DOKIE_EXECUTION_STAGES = ["start", "parse", "plan", "tool-calling", "build", "review", "refine"];
const DOKIE_EXECUTION_STAGE_LABELS = {
  start: "Start / Input",
  parse: "Parse",
  plan: "Plan",
  "tool-calling": "Tool Calling",
  build: "Build",
  review: "Review",
  refine: "Refine",
};
let activeShowcaseIndex = null;
let activeColadaCaseIndex = null;
let wheelInputLocked = false;
const ABOUT_AUTO_INTERVAL = 2200;

function getInitialCaseId() {
  const { caseId } = getHashRoute();
  return caseMap.has(caseId) ? caseId : aboutCase.id;
}

function getInitialScreenMode() {
  const { isPlayRoute } = getHashRoute();
  return isPlayRoute ? "case" : "select";
}

function getInitialPageIndex() {
  const hash = window.location.hash.replace("#", "");
  const match = hash.match(/-p(\d+)$/);
  return match ? Math.max(Number(match[1]) - 1, 0) : 0;
}

function getHashRoute() {
  const hash = window.location.hash.replace("#", "");
  const isPlayRoute = hash.startsWith("play-");
  const route = isPlayRoute ? hash.replace("play-", "") : hash;
  return {
    caseId: route.replace(/-p\d+$/, ""),
    isPlayRoute,
  };
}

function getActiveCase() {
  return caseMap.get(activeCaseId) || aboutCase;
}

function getActivePage() {
  const activeCase = getActiveCase();
  return activeCase.pages[activePageIndex] || activeCase.pages[0];
}

function getActiveIndex() {
  return selectEntries.findIndex((item) => item.id === activeCaseId);
}

function formatIndex(index) {
  return String(index + 1).padStart(2, "0");
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createImage(src, alt, className) {
  const image = document.createElement("img");
  image.src = src;
  image.alt = alt;
  image.loading = "lazy";
  if (className) image.className = className;
  return image;
}

function createEagerImage(src, alt, className) {
  const image = createImage(src, alt, className);
  image.loading = "eager";
  image.decoding = "async";
  return image;
}

function renderTagRow(items, className = "case-chip-row") {
  const row = createElement("div", className);
  items?.forEach((item) => row.append(createElement("span", "", item)));
  return row;
}

function renderEvidenceFigure(item, className, caption) {
  const figure = createElement("figure", className);
  figure.append(createEagerImage(item.src, item.alt || item.title, ""));
  if (caption || item.title) figure.append(createElement("figcaption", "", caption || item.title));
  return figure;
}

function setButtonPulse(button) {
  if (!button) return;
  button.classList.remove("is-pressed");
  window.requestAnimationFrame(() => {
    button.classList.add("is-pressed");
    window.setTimeout(() => button.classList.remove("is-pressed"), 180);
  });
}

function syncMusicControl() {
  if (!musicToggle) return;
  musicToggle.setAttribute("aria-pressed", String(musicEnabled));
  musicToggle.setAttribute("aria-label", musicEnabled ? "关闭背景音乐" : "开启背景音乐");
  if (musicLabel) musicLabel.textContent = musicEnabled ? "Music On" : "Music Off";
  document.body.dataset.music = musicEnabled ? "on" : "off";
}

async function enableMusic(pulseTarget = musicToggle) {
  if (!soundtrack) return false;
  soundtrack.volume = 0.32;
  try {
    await soundtrack.play();
    musicEnabled = true;
  } catch (error) {
    musicEnabled = false;
    syncMusicControl();
    if (musicLabel) musicLabel.textContent = "Tap to Play";
    console.warn("Background music could not start:", error);
    setButtonPulse(pulseTarget);
    return false;
  }
  syncMusicControl();
  setButtonPulse(pulseTarget);
  return true;
}

async function toggleMusic() {
  if (!soundtrack || !musicToggle || !experienceStarted) return;

  if (musicEnabled) {
    soundtrack.pause();
    musicEnabled = false;
    syncMusicControl();
    setButtonPulse(musicToggle);
    return;
  }

  await enableMusic(musicToggle);
}

function finishArcadeBoot() {
  if (experienceStarted) return;
  experienceStarted = true;
  document.body.dataset.experience = "on";
  if (crtBootOverlay) crtBootOverlay.hidden = true;
  if (selectPanel) selectPanel.inert = false;
  if (casePanel) casePanel.inert = false;
  if (controlPanel) controlPanel.inert = false;
  if (musicToggle) musicToggle.disabled = !musicAvailable;
  cabinet?.focus({ preventScroll: true });
}

function startArcadeExperience() {
  if (experienceStarted || !crtBootOverlay || !crtStartButton) return;

  document.body.dataset.experience = "starting";
  crtStartButton.disabled = true;
  crtBootOverlay.classList.add("is-starting");

  // Keep play() inside the user's click gesture so browsers allow the soundtrack.
  void enableMusic(crtStartButton);

  const finishOnShellAnimation = (event) => {
    if (event.animationName !== "crt-boot-shell" && event.animationName !== "crt-boot-reduced") return;
    crtBootOverlay.removeEventListener("animationend", finishOnShellAnimation);
    finishArcadeBoot();
  };
  crtBootOverlay.addEventListener("animationend", finishOnShellAnimation);
  window.setTimeout(finishArcadeBoot, 1400);
}

function setPanels() {
  document.body.dataset.screenMode = screenMode;
  if (selectPanel) selectPanel.hidden = screenMode !== "select";
  if (casePanel) casePanel.hidden = screenMode !== "case";
}

function updateHash() {
  const pageSuffix = activePageIndex > 0 ? `-p${activePageIndex + 1}` : "";
  const nextHash = screenMode === "case" ? `#play-${activeCaseId}${pageSuffix}` : `#${activeCaseId}`;
  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, "", nextHash);
  }
}

function renderIntroPage(page) {
  const layout = createElement("div", page.productVisual ? "case-page case-page-intro has-product-visual" : "case-page case-page-intro");
  const copy = createElement("div", "intro-copy-stack");
  const bullets = createElement("div", "case-bullet-list");
  const chips = createElement("div", "case-chip-row");
  const createProductVisual = () => {
    const visual = createElement("figure", "product-visual-slot");
    const device = createElement("div", "product-device-mock");
    const screen = createElement("div", "product-device-screen");

    screen.append(
      createElement("span", "product-slot-label", page.productVisual.label),
      createElement("strong", "", page.productVisual.title),
      createElement("i", "product-sticker product-sticker-a"),
      createElement("i", "product-sticker product-sticker-b"),
      createElement("i", "product-sticker product-sticker-c")
    );
    device.append(screen);
    visual.append(device, createElement("figcaption", "", page.productVisual.caption));
    return visual;
  };

  page.bullets.forEach((item) => {
    const bullet = createElement("p", "", item);
    bullets.append(bullet);
  });

  page.chips.forEach((item) => {
    chips.append(createElement("span", "", item));
  });

  if (page.productVisual) {
    const hero = createElement("div", "intro-hero-card");
    const heroCopy = createElement("div", "intro-hero-copy");
    const detail = createElement("div", "intro-detail-strip");

    heroCopy.append(createElement("h3", "", page.title), createElement("p", "", page.summary));
    hero.append(heroCopy, createProductVisual());
    detail.append(bullets, chips);
    layout.append(hero, detail);
    return layout;
  }

  copy.append(bullets, chips);
  layout.append(copy);
  return layout;
}

function renderShowcasePage(page) {
  const layout = createElement("div", "case-page case-page-showcase");
  const grid = createElement("div", "showcase-grid");

  page.cards.forEach(([title, copy], index) => {
    const card = createElement("article", "showcase-card");
    const media = createElement("div", "placeholder-media");
    const button = createElement("button", "showcase-view-button", "View Case");

    media.dataset.slot = String(index + 1);
    button.type = "button";
    button.dataset.showcaseOpen = String(index);
    button.setAttribute("aria-label", `查看 ${title} 的前后对比案例`);
    card.append(media, createElement("h3", "", title), createElement("p", "", copy), button);
    grid.append(card);
  });

  layout.append(grid);
  if (activeShowcaseIndex !== null && page.cards[activeShowcaseIndex]) {
    layout.append(renderShowcaseModal(page));
  }
  return layout;
}

function renderComparisonPane(label, title, variant) {
  const pane = createElement("article", `comparison-pane comparison-pane-${variant}`);
  const paper = createElement("div", "comparison-paper");

  paper.append(
    createElement("span", "comparison-tape"),
    createElement("i", "comparison-card comparison-card-a"),
    createElement("i", "comparison-card comparison-card-b"),
    createElement("i", "comparison-mark comparison-mark-a"),
    createElement("i", "comparison-mark comparison-mark-b")
  );
  pane.append(createElement("span", "comparison-label", label), paper, createElement("strong", "", title));
  return pane;
}

function renderShowcaseModal(page) {
  const [title, copy] = page.cards[activeShowcaseIndex];
  const overlay = createElement("div", "showcase-modal-layer");
  const modal = createElement("section", "showcase-modal");
  const header = createElement("div", "showcase-modal-header");
  const closeButton = createElement("button", "showcase-close-button", "Close");
  const comparison = createElement("div", "comparison-board");

  overlay.dataset.showcaseBackdrop = "true";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", `${title} 前后对比`);
  closeButton.type = "button";
  closeButton.dataset.showcaseClose = "true";

  header.append(
    createElement("div", "", ""),
    closeButton
  );
  header.firstChild.append(
    createElement("span", "showcase-modal-kicker", "Before / After Case"),
    createElement("h4", "", title),
    createElement("p", "", copy)
  );
  comparison.append(
    renderComparisonPane("Before", "原始照片 / 灵感素材", "before"),
    renderComparisonPane("After", "可发布视觉资产", "after")
  );
  modal.append(header, comparison, createElement("p", "showcase-modal-note", "案例结构呈现从原始输入到可发布视觉资产的转化。"));
  overlay.append(modal);
  return overlay;
}

function renderColadaIntroPage(page) {
  const layout = createElement("div", "case-page colada-page colada-intro-page");
  const wall = createElement("section", "colada-product-wall", "");
  const intro = createElement("div", "colada-project-intro");
  const deck = createElement("div", "colada-product-deck");
  const chips = createElement("div", "case-chip-row colada-chip-row");
  const screens = page.screens || [];
  const activeIndex = screens.length ? ((coladaRuntimeState.productIndex % screens.length) + screens.length) % screens.length : 0;
  const activeScreen = screens[activeIndex];

  screens.forEach((screen, index) => {
    const offset = (index - activeIndex + screens.length) % screens.length;
    const phone = createElement("button", offset === 0 ? "colada-phone-frame colada-product-card is-active" : "colada-phone-frame colada-product-card");
    phone.type = "button";
    phone.dataset.stackOffset = String(offset);
    phone.dataset.coladaProduct = String(index);
    phone.setAttribute("aria-label", `查看 ${screen.label}：${screen.caption || screen.alt}`);
    phone.setAttribute("aria-pressed", String(index === activeIndex));
    phone.append(createImage(screen.src, screen.alt, ""), createElement("span", "colada-phone-caption", screen.label));
    deck.append(phone);
  });

  page.chips?.forEach((item) => chips.append(createElement("span", "", item)));

  const dots = createElement("div", "colada-product-dots");
  screens.forEach((screen, index) => {
    const button = createElement("button", index === activeIndex ? "is-active" : "", screen.label);
    button.type = "button";
    button.dataset.coladaProduct = String(index);
    button.setAttribute("aria-pressed", String(index === activeIndex));
    dots.append(button);
  });

  const productControls = createElement("div", "colada-product-controls");
  const previousButton = createElement("button", "colada-product-arrow", "‹");
  const nextButton = createElement("button", "colada-product-arrow", "›");
  previousButton.type = "button";
  nextButton.type = "button";
  previousButton.dataset.coladaProductStep = "-1";
  nextButton.dataset.coladaProductStep = "1";
  previousButton.setAttribute("aria-label", "查看上一张 Colada 产品截图");
  nextButton.setAttribute("aria-label", "查看下一张 Colada 产品截图");
  productControls.append(previousButton, dots, nextButton);

  const readout = createElement("div", "colada-product-readout");
  readout.append(
    createElement("strong", "", activeScreen?.label || "产品截图"),
    createElement("span", "", activeScreen?.caption || "点击样机或箭头查看完整产品截图。")
  );

  intro.append(
    createElement("span", "colada-intro-kicker", page.label),
    createElement("h3", "", page.title),
    createElement("p", "colada-intro-summary", page.summary),
    createElement("p", "colada-intro-role", page.role),
    chips,
    readout,
    productControls
  );

  wall.append(intro, deck);
  layout.append(wall);
  return layout;
}

function renderColadaShowcasePage(page) {
  const layout = createElement("div", "case-page colada-page colada-showcase-page");
  const grid = createElement("div", "colada-case-grid");

  page.cases?.forEach((item, index) => {
    const card = createElement("article", "colada-case-card");
    const media = createElement("div", "colada-case-media");
    const copy = createElement("div", "colada-case-copy");
    const button = createElement("button", "showcase-view-button colada-view-button", "查看案例");

    media.append(
      createElement("span", "colada-case-icon", item.icon || "✦"),
      createImage(item.images?.[0], `${item.title}代表性封面`, "colada-case-cover")
    );
    const route = createElement("div", "colada-case-route", "案例视图：输入 → 输出");
    button.type = "button";
    button.dataset.coladaCaseOpen = String(index);
    button.setAttribute("aria-label", `查看 ${item.title} 案例素材`);
    copy.append(
      createElement("span", "colada-case-kicker", item.kicker),
      createElement("h4", "", item.title),
      createElement("p", "", item.copy),
      route,
      button
    );
    card.append(media, copy);
    grid.append(card);
  });

  layout.append(grid);
  if (activeColadaCaseIndex !== null && page.cases?.[activeColadaCaseIndex]) {
    layout.append(renderColadaCaseModal(page));
  }
  return layout;
}

function renderColadaCaseModal(page) {
  const item = page.cases[activeColadaCaseIndex];
  const overlay = createElement("div", "showcase-modal-layer colada-case-modal-layer");
  const modal = createElement("section", "showcase-modal colada-case-modal");
  const header = createElement("div", "showcase-modal-header");
  const closeButton = createElement("button", "showcase-close-button", "关闭");
  const gallery = createElement("div", "colada-modal-gallery");

  overlay.dataset.coladaCaseBackdrop = "true";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", `${item.title} 案例素材`);
  closeButton.type = "button";
  closeButton.dataset.coladaCaseClose = "true";

  item.images.slice(0, 2).forEach((src, index) => {
    const figure = createElement("figure", "colada-modal-image");
    figure.append(
      createElement("span", "colada-modal-image-label", index === 0 ? "输入" : "输出"),
      createImage(src, `${item.title}展开图 ${index + 1}`, "")
    );
    gallery.append(figure);
  });

  header.append(createElement("div", "", ""), closeButton);
  header.firstChild.append(
    createElement("span", "showcase-modal-kicker", item.kicker),
    createElement("h4", "", item.title),
    createElement("p", "", item.copy)
  );
  modal.append(header, gallery, createElement("p", "showcase-modal-note", "用户提供的 Colada 场景素材，用于说明手账 / 拼贴 / 贴纸的真实使用方向。"));
  overlay.append(modal);
  return overlay;
}

function renderColadaCanvasBoard(page, selectedTemplate) {
  const board = createElement("div", coladaRuntimeState.generating ? "colada-canvas-board is-generating" : "colada-canvas-board");
  board.dataset.template = selectedTemplate?.id || "soft-planner";
  board.dataset.materialCount = String(coladaRuntimeState.materialIds.size);

  (page.materials || []).forEach((material) => {
    if (!coladaRuntimeState.materialIds.has(material.id)) return;
    const piece = createElement("article", `colada-canvas-material colada-canvas-material-${material.id}${material.src ? " has-image" : " is-note"}`);
    piece.dataset.materialId = material.id;
    if (material.src) {
      const image = createImage(material.src, material.alt || material.title, "colada-canvas-piece-image");
      image.loading = "eager";
      image.decoding = "async";
      piece.append(image, createElement("span", "colada-canvas-piece-caption", material.title));
    } else {
      const note = createElement("div", "colada-canvas-piece-note");
      note.append(createElement("b", "", material.icon), createElement("strong", "", material.title), createElement("span", "", material.copy));
      piece.append(note);
    }
    board.append(piece);
  });

  if (!coladaRuntimeState.materialIds.size) {
    board.append(createElement("span", "colada-canvas-empty", "选择素材，开始制作"));
  }

  board.append(
    createElement("span", "colada-canvas-tape"),
    createElement("span", "colada-canvas-spark", "✦"),
    createElement("span", "colada-canvas-sticker colada-canvas-sticker-heart", "♡"),
    createElement("span", "colada-canvas-sticker colada-canvas-sticker-smile", "☺"),
    createElement("span", "colada-canvas-sticker colada-canvas-sticker-label", "CIAO!")
  );
  if (coladaRuntimeState.generating) {
    const composeState = createElement("div", "colada-compose-state");
    composeState.append(
      createElement("strong", "", "正在编排页面"),
      createElement("span", "", "画板正在整理素材并逐步成形。")
    );
    board.append(composeState);
  }
  return board;
}

function renderColadaTemplateButton(template, index) {
  const button = createElement("button", index === coladaRuntimeState.templateIndex ? "journal-template is-selected" : "journal-template");
  const icon = createElement("span", "journal-template-icon", template.icon || "✦");
  const copy = createElement("span", "journal-template-copy");

  button.type = "button";
  button.dataset.coladaTemplate = String(index);
  button.setAttribute("aria-pressed", String(index === coladaRuntimeState.templateIndex));
  copy.append(createElement("strong", "", template.title), createElement("em", "", template.desc));
  button.append(icon, copy);
  return button;
}

function renderColadaJournalPage(page) {
  const layout = createElement("div", "case-page colada-page colada-journal-page");
  layout.dataset.coladaStage = coladaRuntimeState.journalStage;
  const steps = createElement("ol", "colada-journal-steps");
  const selectedTemplate = page.templates?.[coladaRuntimeState.templateIndex] || page.templates?.[0];
  const stageLabels = {
    canvas: ["画板", "先把素材放到画板上"],
    style: ["选择风格", "选择一套视觉语气"],
    generating: ["生成", "画板正在连续成形"],
    result: ["结果", "查看横向成品并重置"],
  };
  const stageOrder = ["canvas", "style", "generating", "result"];
  const activeStageIndex = stageOrder.indexOf(coladaRuntimeState.journalStage);
  Object.entries(stageLabels).forEach(([stage, [title, copy]], index) => {
    const item = createElement("li", index === activeStageIndex ? "is-active" : index < activeStageIndex ? "is-complete" : "");
    item.dataset.coladaStage = stage;
    item.setAttribute("aria-current", index === activeStageIndex ? "step" : "false");
    item.append(createElement("span", "colada-journal-step-number", `0${index + 1}`), createElement("strong", "", title), createElement("p", "", copy));
    steps.append(item);
  });

  if (coladaRuntimeState.journalStage === "result") {
    const resultOnly = createElement("section", "colada-result-only");
    resultOnly.append(
      createElement("span", "colada-canvas-label", `04 · 结果 / ${selectedTemplate?.title || "生成页面"}`),
      renderColadaGeneratedSheet(selectedTemplate?.resultSrc, `${selectedTemplate?.title || "模板"} 横向生成结果图`, "colada-generated-sheet colada-result-sheet"),
      createElement("span", "colada-result-demo-label", "生成结果 · 横向成品")
    );
    const resultTemplates = createElement("div", "colada-result-template-list");
    page.templates?.forEach((template, index) => resultTemplates.append(renderColadaTemplateButton(template, index)));
    const resetButton = createElement("button", "colada-journey-button", "重置");
    resetButton.type = "button";
    resetButton.dataset.coladaJourney = "reset";
    resultOnly.append(resultTemplates, resetButton);
    layout.append(steps, resultOnly);
    return layout;
  }

  const workbench = createElement("div", "colada-journal-workbench");
  const before = createElement("section", coladaRuntimeState.generating ? "colada-paper-panel colada-canvas-before is-generating" : "colada-paper-panel colada-canvas-before");
  const controls = createElement("aside", "colada-journal-controls");
  const canvasLabel = coladaRuntimeState.journalStage === "canvas" ? "01 · 画板 / 添加素材" : `01 · 画板 / ${selectedTemplate?.title || "当前预览"}`;
  before.append(
    createElement("span", "colada-canvas-label", canvasLabel),
    renderColadaCanvasBoard(page, selectedTemplate),
    createElement("p", "colada-paper-meta", `${coladaRuntimeState.materialIds.size} / 4 项素材已放入画板`)
  );

  const journeyActions = createElement("div", "colada-journey-actions");
  if (coladaRuntimeState.journalStage === "canvas") {
    controls.setAttribute("aria-label", "画板素材");
    controls.append(createElement("span", "journal-control-label", "添加到画板"));
    const materialList = createElement("div", "colada-material-board");
    page.materials?.forEach((material) => {
      const isSelected = coladaRuntimeState.materialIds.has(material.id);
      const button = createElement("button", isSelected ? "colada-material-toggle is-selected" : "colada-material-toggle");
      button.type = "button";
      button.dataset.coladaMaterial = material.id;
      button.setAttribute("aria-pressed", String(isSelected));
      button.append(createElement("span", "colada-material-stamp", material.icon), createElement("strong", "", material.title), createElement("small", "", material.copy));
      materialList.append(button);
    });
    controls.append(materialList, createElement("p", "colada-stage-note", "点击按钮后，素材会立即出现在画板上；至少两项后进入选择风格。"));
    const styleButton = createElement("button", "colada-journey-button", "继续选择风格");
    styleButton.type = "button";
    styleButton.dataset.coladaJourney = "style";
    styleButton.disabled = coladaRuntimeState.materialIds.size < 2;
    journeyActions.append(styleButton);
  } else if (coladaRuntimeState.journalStage === "style") {
    controls.setAttribute("aria-label", "风格模板");
    controls.append(createElement("span", "journal-control-label", "选择风格"));
    const templateList = createElement("div", "journal-template-list colada-template-list");
    page.templates?.forEach((template, index) => templateList.append(renderColadaTemplateButton(template, index)));
    controls.append(templateList, createElement("p", "colada-stage-note", `当前预览：${selectedTemplate?.title || "未选择"} · 选好后生成横向页面。`));
    const generateButton = createElement("button", "generate-button journal-generate colada-generate", "生成");
    generateButton.type = "button";
    generateButton.dataset.generateColada = "true";
    generateButton.disabled = !selectedTemplate || coladaRuntimeState.materialIds.size < 2;
    journeyActions.append(generateButton);
  } else if (coladaRuntimeState.journalStage === "generating") {
    controls.setAttribute("aria-label", "生成状态");
    controls.append(createElement("span", "journal-control-label", "生成"), createElement("p", "colada-stage-note", `正在生成 ${selectedTemplate?.title || "当前风格"}；画板会连续成形。`));
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      const advanceButton = createElement("button", "colada-journey-button", "查看结果");
      advanceButton.type = "button";
      advanceButton.dataset.coladaJourney = "advance";
      journeyActions.append(advanceButton);
    }
  }
  controls.append(journeyActions);

  workbench.append(before, controls);
  layout.append(steps, workbench);
  return layout;
}

function resetColadaJournal() {
  clearColadaGenerationTimer();
  coladaRuntimeState.generating = false;
  coladaRuntimeState.journalStage = "canvas";
  coladaRuntimeState.templateIndex = 0;
  coladaRuntimeState.materialIds = new Set(["photo", "sticker", "text", "date"]);
}

function clearColadaGenerationTimer() {
  window.clearTimeout(coladaRuntimeState.generationTimer);
  coladaRuntimeState.generationTimer = null;
}

function scheduleColadaGeneration() {
  clearColadaGenerationTimer();
  if (!coladaRuntimeState.generating || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  coladaRuntimeState.generationTimer = window.setTimeout(advanceColadaGeneration, 2400);
}

function advanceColadaGeneration() {
  if (!coladaRuntimeState.generating || coladaRuntimeState.journalStage !== "generating") return;
  clearColadaGenerationTimer();
  coladaRuntimeState.generating = false;
  coladaRuntimeState.journalStage = "result";
  render();
}

function startColadaGeneration(button) {
  if (coladaRuntimeState.generating || coladaRuntimeState.journalStage !== "style" || coladaRuntimeState.materialIds.size < 2) return;
  clearColadaGenerationTimer();
  coladaRuntimeState.generating = true;
  coladaRuntimeState.journalStage = "generating";
  render();
  setButtonPulse(button);
  scheduleColadaGeneration();
}

function renderColadaGeneratedSheet(src, alt, className) {
  const figure = createElement("figure", className);
  if (src) {
    const image = createImage(src, alt, "");
    image.loading = "eager";
    image.decoding = "async";
    figure.append(image);
  }
  return figure;
}

function renderColadaViz(viz) {
  const root = createElement("div", `colada-result-viz colada-result-viz-${viz.type}`);
  root.dataset.vizType = viz.type;
  root.append(createElement("span", "colada-viz-label", viz.label));

  if (viz.type === "meter") {
    const readout = createElement("strong", "colada-viz-readout", Number(viz.values?.[0] || 0).toLocaleString());
    const line = createElement("span", "colada-viz-meter-line");
    line.append(createElement("i", "colada-viz-meter-marker"));
    root.append(readout, line);
  } else if (viz.type === "bars") {
    const barGroup = createElement("div", "colada-viz-bars");
    (viz.values || []).forEach((value) => {
      const bar = createElement("i", "colada-viz-bar");
      bar.style.setProperty("--bar-value", `${Math.max(0, Math.min(100, Number(value) || 0))}%`);
      barGroup.append(bar);
    });
    root.append(barGroup);
  } else {
    const path = createElement("ol", "colada-viz-path");
    (viz.values || []).forEach((value, index) => {
      const item = createElement("li", "");
      item.append(createElement("span", "", value));
      if (index < viz.values.length - 1) item.append(createElement("b", "", "→"));
      path.append(item);
    });
    root.append(path);
  }

  if (viz.candidate) root.append(createElement("small", "colada-viz-candidate", "* candidate"));
  return root;
}

function renderColadaResultPage(page) {
  const layout = createElement("div", "case-page colada-page colada-result-page");
  const visual = createElement("figure", "colada-store-visual");
  const showcase = createElement("div", "colada-results-showcase");
  const resultProof = createElement("section", "colada-result-proof");
  const reach = page.blocks?.find((block) => block.kind === "reach") || {};
  const efficiency = page.blocks?.find((block) => block.kind === "efficiency") || {};
  const product = page.blocks?.find((block) => block.kind === "product") || {};

  showcase.append(
    createElement("span", "colada-showcase-label", "COLADA / 生成结果"),
    renderColadaGeneratedSheet(page.visual.src, page.visual.alt, "colada-generated-sheet colada-showcase-sheet"),
    createImage("assets/colada/产品界面1.png", "Colada 产品界面截图", "colada-showcase-phone"),
    createElement("span", "colada-showcase-stamp", "素材 → 风格 → 分享")
  );
  visual.append(showcase, createElement("figcaption", "", page.visual.caption));

  resultProof.append(
    createElement("span", "colada-proof-label", "简历证据 / COLADA 0→1"),
    createElement("h3", "colada-proof-title", product.headline || "从洞察到上线"),
    createElement("p", "colada-proof-copy", "作为面向欧美女性创作者的 0→1 产品负责人，协同增长与技术，推进产品、商业化、后端生成工作流与系统提示词。")
  );

  const metrics = createElement("div", "colada-proof-metrics");
  const appendMetric = (data, note) => {
    const metric = createElement("article", "colada-proof-metric");
    metric.append(
      createElement("span", "colada-proof-metric-label", data.headline),
      createElement("strong", "colada-proof-metric-value", data.value),
      createElement("small", "colada-proof-metric-note", note)
    );
    metrics.append(metric);
  };
  appendMetric(reach, "上线 2 个月");
  appendMetric(efficiency, "简历项目口径");

  resultProof.append(
    metrics,
    createElement("p", "colada-proof-product", product.evidence || "协同增长与技术，推进产品和商业化落地。"),
    createElement("p", "colada-proof-source", "数据来源：简历项目经历；公开前确认统计窗口。")
  );

  layout.append(visual, resultProof);
  return layout;
}

function renderDokieIntroPage(page) {
  const layout = createElement("div", "case-page dokie-page dokie-intro-page");
  const copy = createElement("section", "dokie-intro-copy");
  const brand = createElement("div", "dokie-brand-lockup");
  const logo = createEagerImage(page.logo, "Dokie logo", "");
  const hero = renderEvidenceFigure(page.hero, "dokie-home-shot", page.hero.note);

  brand.append(logo, createElement("strong", "", "Dokie"));
  copy.append(brand, createElement("p", "dokie-role", page.role), renderTagRow(page.tags, "dokie-tag-row"));
  layout.append(copy, hero);
  return layout;
}

function renderDokieExecutionStageRail() {
  const rail = createElement("ol", "dokie-execution-rail");
  const currentIndex = DOKIE_EXECUTION_STAGES.indexOf(dokieRuntimeState.executionStage);
  const isFinished = dokieRuntimeState.executionStage === "refine";

  DOKIE_EXECUTION_STAGES.forEach((stage, index) => {
    const state = index < currentIndex || isFinished && index === currentIndex ? "complete" : index === currentIndex ? "running" : "queued";
    const item = createElement("li", `is-${state}`);
    item.dataset.executionStage = stage;
    item.append(createElement("span", "dokie-execution-rail-index", String(index + 1).padStart(2, "0")), createElement("strong", "", DOKIE_EXECUTION_STAGE_LABELS[stage]), createElement("small", "dokie-execution-rail-state", state === "complete" ? "Complete" : state === "running" ? "Running" : "Queued"));
    rail.append(item);
  });

  return rail;
}

function renderDokieExecutionInput(page) {
  const task = page.execution.task;
  const panel = createElement("section", "dokie-execution-input");
  const fields = createElement("dl", "dokie-execution-fields");
  const progressCopy = dokieRuntimeState.executionStage === "start" ? "准备运行" : dokieRuntimeState.executionStage === "refine" ? "执行完成" : "智能体运行中";

  page.execution.fields.forEach(([label, value]) => {
    const row = createElement("div", "");
    row.append(createElement("dt", "", label), createElement("dd", "", value));
    fields.append(row);
  });

  panel.append(
    createElement("p", "dokie-execution-label", "Input / brief"),
    createElement("h4", "", "一份任务进入系统"),
    createElement("blockquote", "dokie-execution-prompt", task),
    fields,
    createElement("p", "dokie-execution-input-status", progressCopy)
  );
  return panel;
}

function renderDokieExecutionOutput(page) {
  const output = createElement("section", "dokie-execution-output");
  const stageIndex = DOKIE_EXECUTION_STAGES.indexOf(dokieRuntimeState.executionStage);
  const buildStarted = stageIndex >= DOKIE_EXECUTION_STAGES.indexOf("build");
  const finalOutput = dokieRuntimeState.executionStage === "review" || dokieRuntimeState.executionStage === "refine";

  output.append(
    createElement("p", "dokie-execution-label", "Live output"),
    createElement("h4", "", finalOutput ? "Editable pitch deck" : "Output forms here")
  );

  if (!buildStarted) {
    output.append(
      createElement("div", "dokie-execution-output-empty", "Waiting for Build"),
      createElement("p", "dokie-execution-output-note", "智能体完成规划前，演示文稿保持隐藏。")
    );
    return output;
  }

  const stack = createElement("div", "dokie-execution-slide-stack");
  const pageItems = page.execution.slides.slice(0, Math.max(dokieRuntimeState.executionSlideCount, 1));
  pageItems.forEach(([title, copy], index) => {
    const slide = createElement("article", index === pageItems.length - 1 ? "is-latest" : "is-revealed");
    slide.append(
      createElement("span", "dokie-execution-slide-number", String(index + 1).padStart(2, "0")),
      createElement("strong", "", title),
      createElement("p", "", copy)
    );
    stack.append(slide);
  });
  output.append(stack);

  if (finalOutput) {
    const evidence = renderEvidenceFigure(
      { src: dokieArtifactManifest[0].items[0].src, alt: dokieArtifactManifest[0].items[0].alt },
      "dokie-execution-proof",
      "PPT / 可编辑产物"
    );
    output.append(evidence);
  } else {
    output.append(createElement("p", "dokie-execution-output-note", `已映射 ${dokieRuntimeState.executionSlideCount} / ${page.execution.slides.length} 页`));
  }

  return output;
}

function renderDokieExecutionCenter(page) {
  const center = createElement("section", `dokie-execution-center is-${dokieRuntimeState.executionStage}`);
  const execution = page.execution;
  const stageTitle = DOKIE_EXECUTION_STAGE_LABELS[dokieRuntimeState.executionStage];
  const statusCopy = {
    start: "准备把一份需求变成可编辑演示文稿。",
    parse: "智能体正在提取让需求可执行的关键信息。",
    plan: "智能体正在把需求转成故事主线和视觉方向。",
    "tool-calling": "工具按顺序调用，每个结果都会传递到下一步。",
    build: "演示文稿正在逐页生成，而不是直接输出一张死图。",
    review: "正在按可交付标准检查生成结果。",
    refine: "产物已经可以继续调整和导出。",
  }[dokieRuntimeState.executionStage];

  center.append(
    createElement("p", "dokie-execution-label", stageTitle),
    createElement("h4", "", dokieRuntimeState.executionStage === "start" ? "Run the Agent" : stageTitle),
    createElement("p", "dokie-execution-status-copy", statusCopy)
  );

  if (dokieRuntimeState.executionStage === "start") {
    center.append(
      createElement("div", "dokie-execution-ready", "运行智能体，观察需求如何变成演示文稿。"),
      createElement("span", "dokie-execution-ready-hint", "Auto-play · 20–30 sec · Step anytime")
    );
  }

  if (dokieRuntimeState.executionStage === "parse") {
    const chips = createElement("div", "dokie-execution-parse-grid");
    execution.parse.slice(0, dokieRuntimeState.executionParseIndex + 1).forEach(([label, value], index) => {
      const item = createElement("article", index === dokieRuntimeState.executionParseIndex ? "is-latest" : "is-revealed");
      item.append(createElement("strong", "", label), createElement("p", "", value));
      chips.append(item);
    });
    center.append(chips);
  }

  if (dokieRuntimeState.executionStage === "plan") {
    const plan = createElement("div", "dokie-execution-plan");
    const outline = createElement("ol", "dokie-execution-outline");
    execution.outline.slice(0, dokieRuntimeState.executionPlanIndex + 1).forEach(([title, copy], index) => {
      const item = createElement("li", index === dokieRuntimeState.executionPlanIndex ? "is-latest" : "is-revealed");
      item.append(createElement("span", "", String(index + 1).padStart(2, "0")), createElement("strong", "", title), createElement("p", "", copy));
      outline.append(item);
    });
    const template = createElement("div", "dokie-execution-template");
    template.append(createElement("span", "", "Template match"), ...execution.template.map((item) => createElement("strong", "", item)));
    plan.append(outline, template);
    center.append(plan);
  }

  if (dokieRuntimeState.executionStage === "tool-calling") {
    const tools = createElement("ol", "dokie-execution-tools");
    execution.tools.slice(0, dokieRuntimeState.executionToolIndex + 1).forEach(([title, copy], index) => {
      const isLatest = index === dokieRuntimeState.executionToolIndex;
      const item = createElement("li", isLatest ? "is-running" : "is-complete");
      item.append(
        createElement("span", "dokie-execution-tool-index", String(index + 1).padStart(2, "0")),
        createElement("strong", "", title),
      createElement("p", "", isLatest ? "Working on this handoff" : copy)
      );
      tools.append(item);
    });
    center.append(tools);
  }

  if (dokieRuntimeState.executionStage === "build") {
    const meter = createElement("div", "dokie-execution-build-meter");
    meter.append(
      createElement("strong", "", `${dokieRuntimeState.executionSlideCount} / ${execution.slides.length} slides forming`),
      createElement("span", "", "Slide Composer → Visual Layout"),
      createElement("div", "dokie-execution-meter-track")
    );
    meter.querySelector(".dokie-execution-meter-track").append(createElement("i", "", ""));
    meter.querySelector("i").style.width = `${(dokieRuntimeState.executionSlideCount / execution.slides.length) * 100}%`;
    center.append(meter);
  }

  if (dokieRuntimeState.executionStage === "review") {
    const review = createElement("div", "dokie-execution-review");
    execution.qualityLens.slice(0, dokieRuntimeState.executionQualityIndex + 1).forEach(([title, copy], index) => {
      const item = createElement("article", index === dokieRuntimeState.executionQualityIndex ? "is-latest" : "is-revealed");
      item.append(createElement("strong", "", title), createElement("p", "", copy));
      review.append(item);
    });
    center.append(review);
  }

  if (dokieRuntimeState.executionStage === "refine") {
    const actions = createElement("div", "dokie-execution-refine");
    execution.refine.forEach(([label, copy]) => {
      const button = createElement("button", dokieRuntimeState.refineAction === label ? "is-active" : "", label);
      button.type = "button";
      button.dataset.dokieRefineAction = label;
      button.setAttribute("aria-pressed", String(dokieRuntimeState.refineAction === label));
      button.title = copy;
      actions.append(button);
    });
    center.append(actions, createElement("p", "dokie-execution-refine-note", dokieRuntimeState.refineAction ? `${dokieRuntimeState.refineAction} 已准备好进入下一轮编辑。` : "选择下一步，让产物继续迭代。"));
  }

  return center;
}

function renderDokieWorkflowPage(page) {
  const layout = createElement("div", "case-page dokie-page dokie-execution-page");
  const header = createElement("header", "dokie-execution-header");
  const controls = createElement("div", "dokie-execution-controls");
  const runButton = createElement("button", "dokie-execution-run", dokieRuntimeState.executionPlaying ? "Running…" : "Run Agent");
  const stepButton = createElement("button", "", "Step");
  const replayButton = createElement("button", "", "Replay");
  const currentLabel = DOKIE_EXECUTION_STAGE_LABELS[dokieRuntimeState.executionStage];
  const heading = createElement("div", "dokie-execution-heading");
  const current = createElement("div", "dokie-execution-current");

  runButton.type = "button";
  runButton.dataset.dokieExecution = "run";
  runButton.setAttribute("aria-pressed", String(dokieRuntimeState.executionPlaying));
  stepButton.type = "button";
  stepButton.dataset.dokieExecution = "step";
  replayButton.type = "button";
  replayButton.dataset.dokieExecution = "replay";

  controls.append(runButton, stepButton, replayButton);
  heading.append(createElement("p", "dokie-execution-label", "Agent execution"), createElement("h4", "", "观察一份需求变成可交付内容"));
  current.append(createElement("strong", "", currentLabel));
  header.append(heading, current, controls);

  const rail = renderDokieExecutionStageRail();
  const body = createElement("div", "dokie-execution-body");
  body.append(renderDokieExecutionInput(page), renderDokieExecutionCenter(page), renderDokieExecutionOutput(page));
  layout.append(header, rail, body);
  return layout;
}

function renderDokieFormatsPage() {
  const active = dokieArtifactManifest[dokieRuntimeState.formatIndex] || dokieArtifactManifest[0];
  const itemIndex = Math.min(Math.max(dokieRuntimeState.artifactIndex, 0), active.items.length - 1);
  const activeItem = active.items[itemIndex];
  if (casePanel) casePanel.scrollTop = 0;
  const layout = createElement("div", "case-page dokie-page dokie-format-showcase-page");
  const tabs = createElement("div", "dokie-format-tabs");
  const isVerticalReader = active.id === "long-scroll" || active.id === "draft";
  const viewerShell = createElement("section", `dokie-artifact-shell is-${active.id}${isVerticalReader ? " is-vertical-reader" : ""}`);
  const viewerHeader = createElement("div", "dokie-artifact-header");
  const viewer = createElement("div", `dokie-artifact-viewer is-${active.id}`);
  layout.dataset.dokieFormatView = active.id;
  layout.dataset.dokieArtifactIndex = String(itemIndex);
  layout.dataset.dokieArtifactScroll = String(dokieRuntimeState.artifactScroll);
  const viewerStatus = createElement("span", "dokie-artifact-status", active.id === "ppt" || active.id === "social" ? `${activeItem.label} · ${itemIndex + 1} / ${active.items.length}` : "Top · 0%");
  let overview = null;
  let overviewImage = null;
  let overviewViewport = null;
  let overviewStatus = null;
  let syncOverview = () => {};

  if (isVerticalReader) {
    overview = createElement("aside", "dokie-artifact-overview");
    const overviewHeader = createElement("div", "dokie-artifact-overview-header");
    overviewStatus = createElement("span", "dokie-artifact-overview-status", `${dokieRuntimeState.artifactScroll}%`);
    const overviewCanvas = createElement("button", "dokie-artifact-overview-canvas");
    overviewImage = createEagerImage(activeItem.src, activeItem.alt, "dokie-artifact-overview-image");
    overviewViewport = createElement("span", "dokie-artifact-overview-viewport");
    overviewCanvas.type = "button";
    overviewCanvas.setAttribute("aria-label", "点击总览定位阅读位置");
    overviewCanvas.append(overviewImage, overviewViewport);
    overviewHeader.append(createElement("strong", "", "Overview"), overviewStatus);
    overview.append(overviewHeader, overviewCanvas);

    syncOverview = () => {
      if (!overviewImage?.complete || !overviewImage.naturalWidth || !viewer.clientHeight || !viewer.scrollHeight) return;
      const canvasRect = overviewCanvas.getBoundingClientRect();
      const imageRect = overviewImage.getBoundingClientRect();
      const viewportRatio = Math.min(1, viewer.clientHeight / Math.max(viewer.scrollHeight, 1));
      const viewportHeight = Math.max(16, imageRect.height * viewportRatio);
      const maxScroll = Math.max(viewer.scrollHeight - viewer.clientHeight, 0);
      const maxViewportTop = Math.max(imageRect.height - viewportHeight, 0);
      const scrollRatio = maxScroll ? viewer.scrollTop / maxScroll : 0;
      overviewViewport.style.left = `${imageRect.left - canvasRect.left}px`;
      overviewViewport.style.top = `${imageRect.top - canvasRect.top + maxViewportTop * scrollRatio}px`;
      overviewViewport.style.width = `${imageRect.width}px`;
      overviewViewport.style.height = `${viewportHeight}px`;
      overviewStatus.textContent = `${dokieRuntimeState.artifactScroll}%`;
    };

    overviewImage.addEventListener("load", () => window.requestAnimationFrame(syncOverview), { once: true });
    overviewCanvas.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const canvasRect = overviewCanvas.getBoundingClientRect();
      const imageRect = overviewImage.getBoundingClientRect();
      const viewportRatio = Math.min(1, viewer.clientHeight / Math.max(viewer.scrollHeight, 1));
      const viewportHeight = Math.max(16, imageRect.height * viewportRatio);
      const maxViewportTop = Math.max(imageRect.height - viewportHeight, 0);
      const clickTop = event.clientY - canvasRect.top - viewportHeight / 2 - (imageRect.top - canvasRect.top);
      const ratio = maxViewportTop ? Math.min(Math.max(clickTop / maxViewportTop, 0), 1) : 0;
      viewer.scrollTop = ratio * Math.max(viewer.scrollHeight - viewer.clientHeight, 0);
      window.requestAnimationFrame(syncOverview);
    });
    window.addEventListener("resize", syncOverview, { passive: true });
  }

  dokieArtifactManifest.forEach((item, index) => {
    const button = createElement("button", index === dokieRuntimeState.formatIndex ? "is-active" : "", "");
    button.type = "button";
    button.dataset.dokieFormat = String(index);
    button.setAttribute("aria-pressed", String(index === dokieRuntimeState.formatIndex));
    button.append(createElement("strong", "", item.title), createElement("small", "", item.countLabel));
    tabs.append(button);
  });

  viewerHeader.append(
    createElement("div", "dokie-artifact-header-title", `${active.title} · ${active.mode}`),
    createElement("small", "dokie-artifact-proof-label", "真实产物引用 · 方法证据"),
    viewerStatus
  );
  if (active.id === "ppt") {
    const image = createEagerImage(activeItem.src, activeItem.alt, "dokie-artifact-image");
    const workspace = createElement("div", "dokie-ppt-workspace");
    const stage = createElement("div", "dokie-ppt-stage");
    const canvas = createElement("div", "dokie-ppt-canvas");
    const controls = createElement("div", "dokie-artifact-controls");
    const previous = createElement("button", "dokie-ppt-page-button", "‹");
    const next = createElement("button", "dokie-ppt-page-button", "›");

    viewer.append(image);
    canvas.append(viewer);
    stage.append(canvas);

    previous.type = "button";
    next.type = "button";
    previous.dataset.dokieArtifact = "previous";
    next.dataset.dokieArtifact = "next";
    previous.setAttribute("aria-label", "上一页");
    next.setAttribute("aria-label", "下一页");
    previous.disabled = itemIndex === 0;
    next.disabled = itemIndex === active.items.length - 1;
    controls.append(previous, createElement("strong", "dokie-ppt-page-count", `${itemIndex + 1} / ${active.items.length}`), next);

    const thumbRail = createElement("div", "dokie-artifact-thumbs dokie-ppt-thumb-rail");
    active.items.forEach((item, index) => {
      const thumb = createElement("button", index === itemIndex ? "is-active" : "", "");
      thumb.type = "button";
      thumb.dataset.dokieArtifact = String(index);
      thumb.setAttribute("aria-label", `查看第 ${index + 1} 页`);
      thumb.append(
        createImage(item.src, item.alt, ""),
        createElement("span", "dokie-ppt-thumb-label", String(index + 1).padStart(2, "0"))
      );
      thumbRail.append(thumb);
    });

    workspace.append(stage, controls, thumbRail);
    viewerShell.append(viewerHeader, workspace);
  } else if (active.id === "social") {
    const image = createEagerImage(activeItem.src, activeItem.alt, "dokie-artifact-image");
    const workspace = createElement("div", "dokie-ppt-workspace dokie-social-workspace");
    const stage = createElement("div", "dokie-ppt-stage dokie-social-stage");
    const canvas = createElement("div", "dokie-ppt-canvas dokie-social-canvas");
    const controls = createElement("div", "dokie-artifact-controls");
    const previous = createElement("button", "dokie-ppt-page-button", "‹");
    const next = createElement("button", "dokie-ppt-page-button", "›");

    viewer.append(image);
    canvas.append(viewer);
    stage.append(canvas);

    previous.type = "button";
    next.type = "button";
    previous.dataset.dokieArtifact = "previous";
    next.dataset.dokieArtifact = "next";
    previous.setAttribute("aria-label", "上一张");
    next.setAttribute("aria-label", "下一张");
    previous.disabled = itemIndex === 0;
    next.disabled = itemIndex === active.items.length - 1;
    controls.append(previous, createElement("strong", "dokie-ppt-page-count", `${itemIndex + 1} / ${active.items.length}`), next);

    const thumbRail = createElement("div", "dokie-artifact-thumbs dokie-ppt-thumb-rail");
    active.items.forEach((item, index) => {
      const thumb = createElement("button", index === itemIndex ? "is-active" : "", "");
      thumb.type = "button";
      thumb.dataset.dokieArtifact = String(index);
      thumb.setAttribute("aria-label", `查看 ${item.label}`);
      thumb.append(
        createImage(item.src, item.alt, ""),
        createElement("span", "dokie-ppt-thumb-label", String(index + 1).padStart(2, "0"))
      );
      thumbRail.append(thumb);
    });

    workspace.append(stage, controls, thumbRail);
    viewerShell.append(viewerHeader, workspace);
  } else {
    const image = createEagerImage(activeItem.src, activeItem.alt, "dokie-artifact-image");
    image.loading = "lazy";
    viewer.append(image);
    viewer.addEventListener("scroll", () => {
      const maxScroll = Math.max(viewer.scrollHeight - viewer.clientHeight, 1);
      dokieRuntimeState.artifactScroll = Math.round((viewer.scrollTop / maxScroll) * 100);
      layout.dataset.dokieArtifactScroll = String(dokieRuntimeState.artifactScroll);
      const position = dokieRuntimeState.artifactScroll <= 5 ? "Top" : dokieRuntimeState.artifactScroll >= 95 ? "End" : "Reading";
      viewerStatus.textContent = `${position} · ${dokieRuntimeState.artifactScroll}%`;
      syncOverview();
    }, { passive: true });
    viewer.dataset.scrollPercent = String(dokieRuntimeState.artifactScroll);
    viewerShell.append(
      viewerHeader,
      viewer,
      createElement(
        "p",
        "dokie-artifact-scroll-note",
        isVerticalReader ? "在竖向阅读器内滚动；格式标签与产物比例保持独立。" : "在容器内滚动阅读；外层街机屏幕保持稳定。"
      )
    );
    window.requestAnimationFrame(() => {
      const maxScroll = Math.max(viewer.scrollHeight - viewer.clientHeight, 0);
      viewer.scrollTop = Math.round((maxScroll * dokieRuntimeState.artifactScroll) / 100);
      syncOverview();
    });
  }

  if (overview) layout.append(tabs, overview, viewerShell);
  else layout.append(tabs, viewerShell);
  return layout;
}

function renderDokieTemplateSystemPage() {
  const layout = createElement("div", "case-page dokie-page dokie-template-system-page dokie-template-final-page");
  const stage = createElement("section", "dokie-template-final-stage");
  const stageHeader = createElement("div", "dokie-template-final-header");
  stageHeader.append(
    createElement("span", "dokie-panel-label", "Dokie / Template Cases"),
    createElement("span", "dokie-template-final-count", "19 template cases · one workspace")
  );

  const gallery = createElement("div", "dokie-template-final-gallery");
  const templateCaseGroups = [
    {
      id: "ppt",
      title: "PPT cases",
      className: "dokie-template-ppt-cases",
      files: ["0101.png", "0102.png", "0103.png", "0105.png", "0201.png", "543.png", "544.png", "545.png", "546.png"],
    },
    {
      id: "social",
      title: "Social cases",
      className: "dokie-template-social-cases",
      files: ["2051140.png", "388619f9d1.png", "900038_cover.png", "900043_cover.png", "900057.png", "b54725a91e.png", "bc51febf1c.png", "cover1832211.png", "df7d66dd38.png", "f76cbf0acb.png"],
    },
  ];
  let galleryIndex = 0;
  templateCaseGroups.forEach((group) => {
    const rail = createElement("div", `dokie-template-case-rail ${group.className}`);
    group.files.forEach((file, index) => {
      const item = {
        src: `assets/dokie/${group.id === "ppt" ? "PPT案例" : "social 社媒图文案例"}/${file}`,
        alt: `${group.title} ${index + 1}`,
      };
      const card = createElement("figure", `dokie-template-gallery-card is-${group.id}`);
      card.dataset.dokieGalleryIndex = String(galleryIndex);
      card.append(createImage(item.src, item.alt, "dokie-template-gallery-image"));
      card.append(createElement("figcaption", "", `${group.title} · ${String(index + 1).padStart(2, "0")}`));
      rail.append(card);
      galleryIndex += 1;
    });
    gallery.append(rail);
  });

  const intro = createElement("article", "dokie-template-final-intro");
  const logo = createEagerImage("assets/dokie/logo-dokie.png", "Dokie logo", "dokie-template-final-logo");
  const formats = createElement("div", "dokie-template-final-formats");
  ["PPT", "Long Scroll", "Draft", "Social"].forEach((format) => formats.append(createElement("span", "", format)));
  const productLink = createElement("a", "dokie-template-product-link", "打开 dokie.ai ↗");
  productLink.href = "https://dokie.ai";
  productLink.target = "_blank";
  productLink.rel = "noopener noreferrer";
  productLink.setAttribute("aria-label", "在新标签页打开 dokie.ai 产品首页");
  intro.append(
    logo,
    createElement("p", "dokie-panel-label", "One brief · many outputs"),
    createElement("h4", "", "Dokie，把想法变成可交付内容"),
    createElement("p", "dokie-template-final-copy", "从一段需求、一个文件或一次对话出发，Dokie 生成可以继续编辑、分享和导出的 PPT、长图、文档与社媒内容。"),
    formats,
    productLink
  );

  stage.append(stageHeader, gallery, intro);
  layout.append(stage);
  return layout;
}

function renderVivaIntroPage(page) {
  const layout = createElement("div", "case-page viva-page viva-intro-page");
  const footprints = createElement("div", "viva-footprints");
  const copy = createElement("section", "viva-intro-copy");

  page.footprints.forEach((item, index) => {
    footprints.append(renderEvidenceFigure(item, index === 0 ? "viva-store-shot is-primary" : "viva-store-shot", item.title));
  });

  copy.append(renderTagRow(page.tags, "viva-tag-row"), createElement("p", "", "VivaVideo 与 VivaCut 商店页呈现成熟创作工具的真实产品覆盖。"));
  layout.append(footprints, copy);
  return layout;
}

function renderVivaShelfPage(page) {
  const active = page.plays[vivaRuntimeState.playIndex] || page.plays[0];
  const layout = createElement("div", "case-page viva-page viva-shelf-page");
  const shelf = createElement("div", "viva-play-list");
  const visual = createElement("section", "viva-play-visual");
  const notes = createElement("div", "viva-play-notes");
  const halfPlayCount = Math.floor(page.plays.length / 2);

  shelf.setAttribute("role", "tablist");
  shelf.setAttribute("aria-label", "Viva Video AI play selector");
  visual.setAttribute("aria-label", `${active.title} product UI reconstruction`);

  page.plays.forEach((item, index) => {
    const button = createElement("button", index === vivaRuntimeState.playIndex ? "is-active" : "");
    button.type = "button";
    button.role = "tab";
    button.dataset.vivaPlay = String(index);
    let shelfPosition = index - vivaRuntimeState.playIndex;
    if (shelfPosition > halfPlayCount) shelfPosition -= page.plays.length;
    if (shelfPosition < -halfPlayCount) shelfPosition += page.plays.length;
    button.dataset.vivaPos = String(shelfPosition);
    button.setAttribute("aria-selected", String(index === vivaRuntimeState.playIndex));
    button.setAttribute("aria-pressed", String(index === vivaRuntimeState.playIndex));
    button.setAttribute("aria-label", `选择 ${item.title}`);
    button.append(
      createElement("span", "viva-play-icon", item.icon || "•"),
      createElement("span", "viva-play-title", item.title),
      createElement("span", "viva-play-kind", item.kind || "AI play")
    );
    shelf.append(button);
  });

  const visualHeader = createElement("div", "viva-visual-header");
  visualHeader.append(
    createElement("p", "viva-panel-label", "Selected product UI"),
    createElement("span", "viva-reconstruction-badge", "UI reconstruction")
  );
  const reconstruction = createElement("figure", "viva-ui-reconstruction");
  reconstruction.append(
    createEagerImage(active.src, active.alt || active.title, ""),
    createElement("figcaption", "", "Based on the original product flow · not an official screenshot")
  );
  visual.append(visualHeader, reconstruction);

  const moduleIntro = createElement("section", "viva-module-intro");
  moduleIntro.append(
    createElement("p", "viva-panel-label", "Selected module"),
    createElement("h4", "", active.title),
    createElement("p", "viva-module-summary", active.wrap)
  );
  const moduleFacts = createElement("div", "viva-module-facts");
  [["User wants", active.want], ["Next action", active.next]].forEach(([title, copy]) => {
    const item = createElement("article", "");
    item.append(createElement("strong", "", title), createElement("p", "", copy));
    moduleFacts.append(item);
  });
  moduleIntro.append(moduleFacts);
  notes.append(moduleIntro);

  layout.append(shelf, visual, notes);
  return layout;
}

function renderVivaLoopPage(page) {
  const flowValue = Number(vivaRuntimeState.journeyStep) || 0;
  const activeIndex = Math.min(page.steps.length - 1, Math.max(0, Math.floor(flowValue)));
  const activeStep = page.steps[activeIndex] || page.steps[0];
  const stageStates = ["INPUT READY", "ASSET SELECT", "CONTENT BUILD", "PREVIEW CHECK", "DRAFT EDIT"];
  const photoReady = casePage?.dataset.vivaPhotoReady === "1" || activeIndex >= 1;
  const characterReady = casePage?.dataset.vivaCharacterReady === "1" || activeIndex >= 1;
  const selectedMotion = casePage?.dataset.vivaMotion || "";
  const selectedVoice = casePage?.dataset.vivaVoice || "";
  const scriptValue = casePage?.dataset.vivaScript || page.defaultScript || "";
  const audioReady = casePage?.dataset.vivaAudioReady === "1" || activeIndex >= 3;
  const previewReady = casePage?.dataset.vivaPreviewReady === "1" || flowValue >= 3.1;
  const syncReady = casePage?.dataset.vivaSyncReady === "1" || activeIndex >= 4;
  const draftReady = casePage?.dataset.vivaDraftReady === "1" || flowValue >= 4.1;
  const clearFlowState = () => {
    if (!casePage) return;
    delete casePage.dataset.vivaPhotoReady;
    delete casePage.dataset.vivaCharacterReady;
    delete casePage.dataset.vivaMotion;
    delete casePage.dataset.vivaVoice;
    delete casePage.dataset.vivaScript;
    delete casePage.dataset.vivaAudioReady;
    delete casePage.dataset.vivaPreviewReady;
    delete casePage.dataset.vivaSyncReady;
    delete casePage.dataset.vivaDraftReady;
  };
  const isSelectedMotion = (label) => selectedMotion === label;
  const isSelectedVoice = (label) => selectedVoice === label;
  const layout = createElement("div", "case-page viva-page viva-loop-page");
  const flow = createElement("div", "viva-dh-flow");
  const rail = createElement("nav", "viva-dh-step-rail");
  const workbench = createElement("section", "viva-dh-workbench");
  const workbenchHeader = createElement("div", "viva-dh-workbench-header");
  const workbenchBody = createElement("div", "viva-dh-workbench-body");
  const principle = createElement("aside", "viva-dh-principle-panel");
  const footer = createElement("div", "viva-dh-flow-footer");

  const decorateArt = (art) => {
    art.append(
      createElement("span", "viva-dh-art-tag", `ASSET / ${activeStep.label.toUpperCase()}`),
      createElement("span", "viva-dh-art-index", `0${activeIndex + 1}`)
    );
    return art;
  };

  const createStepImageArt = (className) => {
    const art = createElement("div", `viva-dh-stage-art ${className}`);
    const image = createElement("img", "viva-dh-stage-image");
    image.src = activeStep.artSrc;
    image.alt = activeStep.artAlt || `${activeStep.title}产品界面`;
    image.loading = "eager";
    image.decoding = "async";
    art.append(image);
    return art;
  };

  const actionButton = (label, action, className = "", disabled = false, beforeRender) => {
    const button = createElement("button", `viva-dh-button ${className}`, label);
    button.type = "button";
    button.dataset.vivaJourney = String(action);
    button.disabled = disabled;
    if (beforeRender) button.addEventListener("click", beforeRender);
    return button;
  };

  page.steps.forEach((step, index) => {
    const unlocked = index <= activeIndex;
    const complete = index < activeIndex || (index === page.steps.length - 1 && draftReady);
    const state = complete ? "DONE" : index === activeIndex ? "NOW" : index === activeIndex + 1 ? "NEXT" : "LOCKED";
    const button = createElement("button", `viva-dh-step-card${index === activeIndex ? " is-active" : ""}${complete ? " is-complete" : ""}`);
    button.type = "button";
    button.dataset.vivaJourney = String(index);
    button.dataset.state = state.toLowerCase();
    button.disabled = !unlocked;
    button.setAttribute("aria-current", index === activeIndex ? "step" : "false");
    button.setAttribute("aria-label", `${step.title}${button.disabled ? "，尚未解锁" : ""}`);
    button.append(
      createElement("span", "viva-dh-step-index", `0${index + 1} / ${complete ? "DONE" : "FLOW"}`),
      createElement("strong", "", step.label),
      createElement("em", "", step.short),
      createElement("span", "viva-dh-step-status", state)
    );
    rail.append(button);
  });

  const workbenchMeta = createElement("div", "viva-dh-header-meta");
  workbenchMeta.append(
    createElement("span", "viva-dh-stage-state", stageStates[activeIndex]),
    createElement("span", "viva-dh-progress", `0${activeIndex + 1} / 05`)
  );
  workbenchHeader.append(
    createElement("span", "viva-dh-kicker", `STEP 0${activeIndex + 1} / ${activeStep.label.toUpperCase()}`),
    workbenchMeta
  );

  const stage = createElement("div", "viva-dh-stage");
  const copy = createElement("div", "viva-dh-stage-copy");
  copy.append(createElement("span", "viva-dh-concept-label", `${activeStep.layer} / CONCEPT`), createElement("h3", "", activeStep.title), createElement("p", "", activeStep.copy));

  if (activeIndex === 0) {
    const art = createStepImageArt("viva-dh-character-art");
    const upload = createElement("div", "viva-dh-upload-state");
    upload.classList.toggle("is-ready", photoReady);
    upload.append(createElement("b", "", photoReady ? "PHOTO READY" : "NO PHOTO"), createElement("span", "", photoReady ? "role-photo-01.jpg · 概念素材" : "还没有选择照片"));
    const actions = createElement("div", "viva-dh-actions");
    actions.append(
      actionButton(photoReady ? "换一张照片" : "选择照片", 0.1, "is-dark", false, () => {
        if (casePage) casePage.dataset.vivaPhotoReady = "1";
      }),
      actionButton("Create Character", 1, "is-green", !photoReady, () => {
        if (casePage) casePage.dataset.vivaCharacterReady = "1";
      })
    );
    const uploadCard = createElement("div", "viva-dh-upload-card");
    uploadCard.append(upload, actions);
    copy.append(uploadCard);
    stage.append(decorateArt(art), copy);
  } else if (activeIndex === 1) {
    const art = createStepImageArt("viva-dh-motion-art");
    const motionGrid = createElement("div", "viva-dh-choice-grid");
    page.motions.forEach((motion, index) => {
      const button = createElement("button", `viva-dh-choice${isSelectedMotion(motion.label) ? " is-selected" : ""}`);
      button.type = "button";
      button.dataset.vivaJourney = String(1.1 + index / 10);
      button.setAttribute("aria-pressed", String(isSelectedMotion(motion.label)));
      button.addEventListener("click", () => {
        if (casePage) casePage.dataset.vivaMotion = motion.label;
      });
      button.append(createElement("strong", "", motion.label), createElement("span", "", motion.detail));
      motionGrid.append(button);
    });
    const actions = createElement("div", "viva-dh-actions");
    actions.append(actionButton("Use This Motion", 2, "is-green", !selectedMotion));
    copy.append(motionGrid, actions);
    stage.append(decorateArt(art), copy);
  } else if (activeIndex === 2) {
    const art = createStepImageArt("viva-dh-voice-art");
    const scriptCard = createElement("div", "viva-dh-script-card");
    const textarea = createElement("textarea", "", "");
    textarea.value = scriptValue;
    textarea.setAttribute("aria-label", "数字人口播脚本");
    textarea.addEventListener("input", () => {
      if (casePage) casePage.dataset.vivaScript = textarea.value;
    });
    const voiceGrid = createElement("div", "viva-dh-choice-grid viva-dh-voice-grid");
    page.voices.forEach((voice, index) => {
      const button = createElement("button", `viva-dh-choice${isSelectedVoice(voice.label) ? " is-selected" : ""}`);
      button.type = "button";
      button.dataset.vivaJourney = String(2.1 + index / 10);
      button.setAttribute("aria-pressed", String(isSelectedVoice(voice.label)));
      button.addEventListener("click", () => {
        if (casePage) casePage.dataset.vivaVoice = voice.label;
      });
      button.append(createElement("strong", "", voice.label), createElement("span", "", voice.detail));
      voiceGrid.append(button);
    });
    scriptCard.append(textarea, voiceGrid, actionButton("Generate Voice Preview", 3, "is-green", !selectedVoice || !scriptValue.trim(), () => {
      if (casePage) casePage.dataset.vivaAudioReady = "1";
    }));
    copy.append(scriptCard);
    stage.append(decorateArt(art), copy);
  } else if (activeIndex === 3) {
    const art = createStepImageArt("viva-dh-sync-art");
    const syncStatus = createElement("div", "viva-dh-upload-state");
    syncStatus.classList.toggle("is-ready", previewReady);
    syncStatus.append(createElement("b", "", previewReady ? "SYNC PREVIEW READY" : "PREVIEW NOT RUN"), createElement("span", "", previewReady ? "audio timeline · face markers aligned" : "点击预览检查声音和口型"));
    const actions = createElement("div", "viva-dh-actions");
    actions.append(actionButton("Preview Lip-sync", 3.1, "is-dark", !audioReady), actionButton("Approve Preview", 4, "is-green", !previewReady, () => {
      if (casePage) casePage.dataset.vivaSyncReady = "1";
    }));
    copy.append(syncStatus, actions);
    stage.append(decorateArt(art), copy);
  } else {
    const art = createStepImageArt("viva-dh-compose-art");
    const composeStatus = createElement("div", "viva-dh-upload-state");
    composeStatus.classList.toggle("is-ready", draftReady);
    composeStatus.append(createElement("b", "", draftReady ? "DRAFT READY" : "WAITING TO COMPOSE"), createElement("span", "", draftReady ? "可继续编辑或导出" : "完成口型预览后进入合成"));
    const actions = createElement("div", "viva-dh-actions");
    actions.append(actionButton("Edit Again", 1, "is-dark", false, () => {
      if (casePage) delete casePage.dataset.vivaDraftReady;
    }), actionButton("Export Draft", 4.1, "is-green", !syncReady, () => {
      if (casePage) casePage.dataset.vivaDraftReady = "1";
    }));
    copy.append(composeStatus, actions);
    stage.append(decorateArt(art), copy);
  }

  workbenchBody.append(stage);
  workbench.append(workbenchHeader, workbenchBody);

  const io = createElement("div", "viva-dh-io");
  const inputRow = createElement("div", "");
  const outputRow = createElement("div", "");
  inputRow.append(createElement("span", "", "INPUT"), createElement("strong", "", activeStep.input));
  outputRow.append(createElement("span", "", "OUTPUT"), createElement("strong", "", activeStep.output));
  io.append(inputRow, outputRow);

  const layerStatus = createElement("div", "viva-dh-layer-status");
  layerStatus.append(
    createElement("span", "viva-dh-status-dot", ""),
    createElement("strong", "", "ACTIVE LAYER"),
    createElement("small", "", activeStep.layer)
  );
  principle.append(
    layerStatus,
    createElement("span", "viva-dh-principle-label", "PRODUCT LAYER"),
    createElement("h4", "", activeStep.layer),
    createElement("p", "", activeStep.note),
    io,
    createElement("div", "viva-dh-principle-note", activeIndex === 4 ? "Export 只是出口，结果仍然回到 Viva Video 的编辑时间线。" : "这一层先独立成可判断的资产，下一层再引用它。")
  );

  flow.append(rail, workbench, principle);
  footer.append(createElement("span", "viva-dh-flow-message", draftReady ? "草稿已经完成，可以进入 Workflow Logic 查看产品判断。" : activeStep.note), actionButton("Reset Flow", "reset", "is-quiet", false, clearFlowState));
  layout.append(flow, footer);
  layout.addEventListener("click", (event) => {
    const control = event.target.closest("[data-viva-journey]");
    if (!control || !layout.contains(control) || !casePage) return;
    const action = control.dataset.vivaJourney;
    const actionValue = Number(action);
    if (action === "reset") {
      clearFlowState();
      return;
    }
    if (action === "0.1") casePage.dataset.vivaPhotoReady = "1";
    if (action === "1" && control.textContent.trim() === "Create Character") casePage.dataset.vivaCharacterReady = "1";
    if (actionValue >= 1.1 && actionValue < 1.4) {
      const motionIndex = Math.round((actionValue - 1) * 10) - 1;
      if (page.motions[motionIndex]) casePage.dataset.vivaMotion = page.motions[motionIndex].label;
    }
    if (actionValue >= 2.1 && actionValue < 2.4) {
      const voiceIndex = Math.round((actionValue - 2) * 10) - 1;
      if (page.voices[voiceIndex]) casePage.dataset.vivaVoice = page.voices[voiceIndex].label;
    }
    if (action === "3") casePage.dataset.vivaAudioReady = "1";
    if (action === "3.1") casePage.dataset.vivaPreviewReady = "1";
    if (action === "4") casePage.dataset.vivaSyncReady = "1";
    if (action === "4.1") casePage.dataset.vivaDraftReady = "1";
    if (control.textContent.trim() === "Edit Again") delete casePage.dataset.vivaDraftReady;
  });
  layout.addEventListener("input", (event) => {
    if (event.target.matches("textarea") && casePage) casePage.dataset.vivaScript = event.target.value;
  });
  return layout;
}

function renderVivaLearningPage(page) {
  const activeLearning = page.learnings[vivaRuntimeState.learningIndex] || page.learnings[0];
  const layout = createElement("div", "case-page viva-page viva-learning-page");
  const flow = createElement("div", "viva-logic-flow");
  const rail = createElement("nav", "viva-logic-rail");
  const detail = createElement("section", "viva-logic-detail");
  const map = createElement("aside", "viva-logic-map");

  page.learnings.forEach((learning, index) => {
    const item = createElement("button", `viva-logic-card${index === vivaRuntimeState.learningIndex ? " is-active" : ""}`);
    item.type = "button";
    item.dataset.vivaLearning = String(index);
    item.dataset.state = index === vivaRuntimeState.learningIndex ? "open" : "view";
    item.setAttribute("aria-pressed", String(index === vivaRuntimeState.learningIndex));
    item.append(
      createElement("span", "viva-logic-index", `0${index + 1} / DECISION`),
      createElement("strong", "", learning.title),
      createElement("em", "", learning.short),
      createElement("span", "viva-logic-card-status", index === vivaRuntimeState.learningIndex ? "OPEN" : "VIEW")
    );
    rail.append(item);
  });

  const facts = createElement("dl", "viva-logic-facts");
  [["DESIGN", activeLearning.design], ["BENEFIT", activeLearning.benefit], ["HOW", activeLearning.how]].forEach(([label, copy]) => {
    const row = createElement("div", "");
    row.append(createElement("dt", "", label), createElement("dd", "", copy));
    facts.append(row);
  });
  const signal = createElement("div", "viva-logic-signal");
  signal.append(
    createElement("span", "viva-logic-signal-label", "OBSERVATION METRIC"),
    createElement("strong", "", "观察指标"),
    createElement("p", "", activeLearning.signal),
    createElement("small", "", "用于评估该产品判断与工作流效果。")
  );
  const detailHeader = createElement("div", "viva-logic-detail-header");
  detailHeader.append(
    createElement("span", "viva-logic-label", `PRODUCT DECISION / 0${vivaRuntimeState.learningIndex + 1}`),
    createElement("span", "viva-logic-detail-state", "ACTIVE DECISION")
  );
  const decisionPrompt = createElement("div", "viva-logic-prompt");
  decisionPrompt.append(createElement("span", "viva-logic-prompt-label", "WHY THIS MATTERS"), createElement("p", "", activeLearning.question));
  detail.append(detailHeader, createElement("h4", "", activeLearning.title), decisionPrompt, facts, signal);

  const assetStack = createElement("div", "viva-asset-stack");
  ["Character Asset", "Motion Loop", "Audio Track", "Lip-sync Preview", "Editable Draft"].forEach((label, index) => {
    const item = createElement("span", `is-layer-${index + 1}`, label);
    assetStack.append(item);
  });
  map.append(createElement("span", "viva-logic-map-title", "HOW THE LAYERS CONNECT"), assetStack, createElement("p", "", "产品价值不在于一次生成，而在于让每一层都能被替换、检查，并回到编辑链路。"));
  flow.append(rail, detail, map);
  layout.append(flow, createElement("p", "viva-learning-note", "四个产品判断共同降低重复创作成本，并把生成结果接回主编辑链路。"));
  return layout;
}

function getActiveSoundsSource(page) {
  return page.sources?.find((item) => item.id === soundsNomadRuntimeState.sourceId) || page.sources?.[0];
}

function clearSoundsNomadScanTimers() {
  window.clearTimeout(soundsNomadRuntimeState.scanTimer);
  soundsNomadRuntimeState.scanTimer = null;
}

function resetSoundsNomadDemo() {
  clearSoundsNomadScanTimers();
  soundsNomadRuntimeState.sourceId = "fog_window";
  soundsNomadRuntimeState.fieldPhase = "entry";
  soundsNomadRuntimeState.scanStep = 0;
  soundsNomadRuntimeState.collectedIds = new Set();
}

function clearDokieExecutionTimer() {
  window.clearTimeout(dokieRuntimeState.executionTimer);
  dokieRuntimeState.executionTimer = null;
}

function resetDokieExecutionState() {
  clearDokieExecutionTimer();
  dokieRuntimeState.executionStage = "start";
  dokieRuntimeState.executionParseIndex = -1;
  dokieRuntimeState.executionPlanIndex = -1;
  dokieRuntimeState.executionToolIndex = -1;
  dokieRuntimeState.executionSlideCount = 0;
  dokieRuntimeState.executionQualityIndex = -1;
  dokieRuntimeState.executionPlaying = false;
  dokieRuntimeState.executionEntered = false;
  dokieRuntimeState.refineAction = "";
}

function getDokieExecutionPage() {
  return caseMap.get("dokie")?.pages.find((page) => page.type === "dokie-workflow");
}

function getDokieExecutionDelay() {
  if (dokieRuntimeState.executionStage === "start") return 3200;
  if (dokieRuntimeState.executionStage === "parse") return 520;
  if (dokieRuntimeState.executionStage === "plan") return 500;
  if (dokieRuntimeState.executionStage === "tool-calling") return 600;
  if (dokieRuntimeState.executionStage === "build") return 500;
  if (dokieRuntimeState.executionStage === "review") return 700;
  return 0;
}

function scheduleDokieExecution() {
  clearDokieExecutionTimer();
  if (!dokieRuntimeState.executionPlaying || dokieRuntimeState.executionStage === "refine") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  dokieRuntimeState.executionTimer = window.setTimeout(() => {
    advanceDokieExecution();
  }, getDokieExecutionDelay());
}

function beginDokieExecution({ autoPlay = true, reset = true } = {}) {
  if (reset) resetDokieExecutionState();
  dokieRuntimeState.executionEntered = true;
  dokieRuntimeState.executionPlaying = autoPlay;
  render();
  scheduleDokieExecution();
}

function advanceDokieExecution() {
  const page = getDokieExecutionPage();
  if (!page?.execution) return;

  if (dokieRuntimeState.executionStage === "start") {
    dokieRuntimeState.executionStage = "parse";
    dokieRuntimeState.executionParseIndex = 0;
  } else if (dokieRuntimeState.executionStage === "parse") {
    if (dokieRuntimeState.executionParseIndex < page.execution.parse.length - 1) {
      dokieRuntimeState.executionParseIndex += 1;
    } else {
      dokieRuntimeState.executionStage = "plan";
      dokieRuntimeState.executionPlanIndex = 0;
    }
  } else if (dokieRuntimeState.executionStage === "plan") {
    if (dokieRuntimeState.executionPlanIndex < page.execution.outline.length - 1) {
      dokieRuntimeState.executionPlanIndex += 1;
    } else {
      dokieRuntimeState.executionStage = "tool-calling";
      dokieRuntimeState.executionToolIndex = 0;
    }
  } else if (dokieRuntimeState.executionStage === "tool-calling") {
    if (dokieRuntimeState.executionToolIndex < page.execution.tools.length - 1) {
      dokieRuntimeState.executionToolIndex += 1;
    } else {
      dokieRuntimeState.executionStage = "build";
      dokieRuntimeState.executionSlideCount = 1;
    }
  } else if (dokieRuntimeState.executionStage === "build") {
    if (dokieRuntimeState.executionSlideCount < page.execution.slides.length) {
      dokieRuntimeState.executionSlideCount += 1;
    } else {
      dokieRuntimeState.executionStage = "review";
      dokieRuntimeState.executionQualityIndex = 0;
    }
  } else if (dokieRuntimeState.executionStage === "review") {
    if (dokieRuntimeState.executionQualityIndex < page.execution.qualityLens.length - 1) {
      dokieRuntimeState.executionQualityIndex += 1;
    } else {
      dokieRuntimeState.executionStage = "refine";
      dokieRuntimeState.executionPlaying = false;
      clearDokieExecutionTimer();
    }
  }

  render();
  scheduleDokieExecution();
}

function resetDokieCaseState() {
  dokieRuntimeState.formatIndex = 0;
  dokieRuntimeState.artifactIndex = 0;
  dokieRuntimeState.artifactScroll = 0;
  dokieRuntimeState.templateStageIndex = 0;
  dokieRuntimeState.templateRoleIndex = 0;
  dokieRuntimeState.templateTaskIndex = 0;
  dokieRuntimeState.templateToken = "Color";
  resetDokieExecutionState();
}

function resetVivaCaseState() {
  vivaRuntimeState.playIndex = 0;
  vivaRuntimeState.journeyStep = 0;
  vivaRuntimeState.loopIndex = 0;
  vivaRuntimeState.learningIndex = 0;
  if (casePage) {
    delete casePage.dataset.vivaPhotoReady;
    delete casePage.dataset.vivaCharacterReady;
    delete casePage.dataset.vivaMotion;
    delete casePage.dataset.vivaVoice;
    delete casePage.dataset.vivaScript;
    delete casePage.dataset.vivaAudioReady;
    delete casePage.dataset.vivaPreviewReady;
    delete casePage.dataset.vivaSyncReady;
    delete casePage.dataset.vivaDraftReady;
  }
}

function resetAboutCaseState() {
  window.clearInterval(aboutRuntimeState.autoTimer);
  aboutRuntimeState.autoTimer = null;
  aboutRuntimeState.focusIndex = 0;
  aboutRuntimeState.practiceStepIndex = 0;
}

const caseRuntimeAdapters = Object.freeze({
  about: {
    state: aboutRuntimeState,
    reset: resetAboutCaseState,
    onPageLeave: resetAboutCaseState,
    blocksNext: () => false,
  },
  colada: {
    state: coladaRuntimeState,
    reset: resetColadaJournal,
    onPageLeave: () => {},
    blocksNext: () => false,
  },
  dokie: {
    state: dokieRuntimeState,
    reset: resetDokieCaseState,
    onPageLeave: resetDokieExecutionState,
    blocksNext: () => false,
  },
  creator: {
    state: vivaRuntimeState,
    reset: resetVivaCaseState,
    onPageLeave: () => {},
    blocksNext: ({ pageIndex }) =>
      pageIndex === 2 && !(casePage?.dataset.vivaDraftReady === "1" || vivaRuntimeState.journeyStep >= 4.1),
  },
  indie: {
    state: soundsNomadRuntimeState,
    reset: resetSoundsNomadDemo,
    onPageLeave: suspendSoundsFieldIfNeeded,
    blocksNext: () => false,
  },
});

function getCaseRuntime(caseId = activeCaseId) {
  return caseRuntimeAdapters[caseId] || null;
}

function resetCaseRuntime(caseId = activeCaseId) {
  getCaseRuntime(caseId)?.reset();
}

function suspendSoundsFieldIfNeeded() {
  const page = getActivePage();
  if (page?.type !== "sounds-field") return;
  clearSoundsNomadScanTimers();
  if (soundsNomadRuntimeState.fieldPhase === "scan_running") {
    soundsNomadRuntimeState.fieldPhase = soundsNomadRuntimeState.collectedIds.has(soundsNomadRuntimeState.sourceId) ? "discovery_collected" : "source_selected";
    soundsNomadRuntimeState.scanStep = 0;
  }
}

function selectSoundsSource(sourceId) {
  if (soundsNomadRuntimeState.fieldPhase === "entry") return;
  clearSoundsNomadScanTimers();
  soundsNomadRuntimeState.sourceId = sourceId;
  soundsNomadRuntimeState.fieldPhase = soundsNomadRuntimeState.collectedIds.has(sourceId) ? "discovery_collected" : "source_selected";
  soundsNomadRuntimeState.scanStep = 0;
  render();
}

function advanceSoundsScan() {
  clearSoundsNomadScanTimers();
  soundsNomadRuntimeState.scanStep += 1;
  if (soundsNomadRuntimeState.scanStep >= 3) {
    soundsNomadRuntimeState.fieldPhase = "discovery_uncollected";
    render();
    return;
  }
  render();
  soundsNomadRuntimeState.scanTimer = window.setTimeout(advanceSoundsScan, 520);
}

function startSoundsScan() {
  if (soundsNomadRuntimeState.fieldPhase !== "source_selected") return;
  clearSoundsNomadScanTimers();
  soundsNomadRuntimeState.fieldPhase = "scan_running";
  soundsNomadRuntimeState.scanStep = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 2 : 0;
  render();
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  soundsNomadRuntimeState.scanTimer = window.setTimeout(advanceSoundsScan, 520);
}

function collectSoundsSource() {
  if (!soundsNomadRuntimeState.sourceId || soundsNomadRuntimeState.fieldPhase !== "discovery_uncollected") return;
  clearSoundsNomadScanTimers();
  if (soundsNomadRuntimeState.collectedIds.has(soundsNomadRuntimeState.sourceId)) return;
  soundsNomadRuntimeState.collectedIds.add(soundsNomadRuntimeState.sourceId);
  soundsNomadRuntimeState.fieldPhase = "discovery_collected";
  render();
}

function enterSoundsField() {
  clearSoundsNomadScanTimers();
  soundsNomadRuntimeState.fieldPhase = "source_selected";
  soundsNomadRuntimeState.scanStep = 0;
  render();
}

function continueSoundsField(page) {
  clearSoundsNomadScanTimers();
  if (soundsNomadRuntimeState.fieldPhase === "discovery_collected") {
    soundsNomadRuntimeState.fieldPhase = "continue";
    render();
    return;
  }
  const nextSource = page.sources.find((item) => !soundsNomadRuntimeState.collectedIds.has(item.id));
  if (!nextSource) {
    soundsNomadRuntimeState.fieldPhase = "continue";
    render();
    return;
  }
  soundsNomadRuntimeState.sourceId = nextSource.id;
  soundsNomadRuntimeState.scanStep = 0;
  soundsNomadRuntimeState.fieldPhase = "source_selected";
  render();
}

function renderSoundsPhoneMock(page) {
  const evidence = createElement("figure", "sn-intro-evidence");
  const frame = createElement("div", "sn-evidence-frame sn-intro-frame");
  frame.append(
    createEagerImage(page.evidence.src, page.evidence.alt, "sn-evidence-image"),
    createElement("span", "sn-evidence-stamp", "REAL PRODUCT")
  );
  evidence.append(frame, createElement("figcaption", "", page.evidence.label));
  return evidence;
}

function renderSoundsNomadSnapshotPage(page) {
  const layout = createElement("div", "case-page sounds-page sounds-intro-page");
  const copy = createElement("section", "sn-intro-copy");
  const decision = createElement("div", "sn-decision-block");
  decision.append(createElement("strong", "", "CASE DECISION"), createElement("span", "", page.decision));
  copy.append(
    createElement("span", "sn-section-kicker", page.badge),
    decision,
    renderTagRow(page.tags, "sn-tag-row")
  );

  const proof = createElement("section", "sn-intro-proof");
  const proofHead = createElement("div", "sn-proof-heading");
  proofHead.append(createElement("span", "", "PRODUCT SNAPSHOT"), createElement("strong", "", "真实产品证据"));
  const proofBody = createElement("div", "sn-proof-body");
  const productMap = createElement("div", "sn-product-proof-list");
  page.productProof.forEach(([number, title, label], index) => {
    const item = createElement("div", index === 2 ? "is-core" : "");
    item.append(createElement("b", "", number), createElement("strong", "", title), createElement("small", "", label));
    productMap.append(item);
  });
  proofBody.append(renderSoundsPhoneMock(page), productMap);
  proof.append(proofHead, proofBody, createElement("p", "sn-proof-foot", page.footnote));
  layout.append(copy, proof);
  return layout;
}

function renderSoundsNomadFieldPage(page) {
  const layout = createElement("div", "case-page sounds-page sounds-field-page");
  const field = createElement("section", "sn-field-map");
  const panel = createElement("section", "sn-field-action");
  const evidence = createElement("aside", "sn-field-evidence");
  layout.dataset.soundsPhase = soundsNomadRuntimeState.fieldPhase;
  field.dataset.soundsPhase = soundsNomadRuntimeState.fieldPhase;
  panel.dataset.soundsPhase = soundsNomadRuntimeState.fieldPhase;
  evidence.dataset.soundsPhase = soundsNomadRuntimeState.fieldPhase;
  const source = getActiveSoundsSource(page);
  const isCollected = source ? soundsNomadRuntimeState.collectedIds.has(source.id) : false;
  const progress = Math.min(page.garden.total, page.garden.base + soundsNomadRuntimeState.collectedIds.size);

  const mapFrame = createElement("div", "sn-map-frame");
  mapFrame.append(createEagerImage(page.evidence.map.src, page.evidence.map.alt, "sn-map-image"));
  mapFrame.append(createElement("span", "sn-evidence-stamp", "FIELD MAP / INTERACTIVE PROTOTYPE"));
  page.sources.forEach((item) => {
    const marker = createElement("button", item.id === soundsNomadRuntimeState.sourceId ? "sn-source-marker is-active" : "sn-source-marker");
    marker.type = "button";
    marker.dataset.soundsSource = item.id;
    marker.style.left = `${item.x}%`;
    marker.style.top = `${item.y}%`;
    marker.setAttribute("aria-pressed", String(item.id === soundsNomadRuntimeState.sourceId));
    marker.append(createElement("span", "", item.marker));
    if (soundsNomadRuntimeState.collectedIds.has(item.id)) marker.classList.add("is-collected");
    mapFrame.append(marker);
  });
  field.append(createElement("span", "sn-map-label", page.badge), mapFrame, createElement("small", "sn-map-caption", "INTERACTIVE PROTOTYPE · 选择声源"));

  const flow = createElement("div", "sn-flow-steps");
  page.flow.forEach((step, index) => {
    const isDone = (soundsNomadRuntimeState.fieldPhase === "source_selected" && index === 0)
      || (soundsNomadRuntimeState.fieldPhase === "scan_running" && index <= 1)
      || (["discovery_uncollected", "discovery_collected"].includes(soundsNomadRuntimeState.fieldPhase) && index <= 2)
      || (soundsNomadRuntimeState.fieldPhase === "continue" && index <= 3);
    flow.append(createElement("span", isDone ? "is-done" : index === 0 ? "is-current" : "", step));
    if (index < page.flow.length - 1) flow.append(createElement("i", "", "→"));
  });

  const actionTitle = createElement("h4", "", "选择现场声源");
  const actionCopy = createElement("p", "", "地图声源 / 交互原型");
  const actionKicker = createElement("span", "sn-card-kicker", "01 FIND");
  panel.append(createElement("span", "sn-panel-label", "FIELD FLOW"), flow, actionKicker, actionTitle, actionCopy);

  if (soundsNomadRuntimeState.fieldPhase === "entry") {
    actionKicker.textContent = "01 FIND";
    actionTitle.textContent = "选择现场声源";
    actionCopy.textContent = `${source?.place || "Field location"} · ${source?.clue || "地图声源"}`;
    const enterButton = createElement("button", "sn-primary-action", "Open Field map →");
    enterButton.type = "button";
    enterButton.dataset.soundsEntry = "true";
    panel.append(enterButton, createElement("small", "sn-scope-note", "选择声源，进入扫描演示。"));
  } else if (soundsNomadRuntimeState.fieldPhase === "source_selected") {
    actionKicker.textContent = "01 FIND";
    actionTitle.textContent = source?.marker || "Field source";
    actionCopy.textContent = `${source?.place || "Field site"} · 已选中地图声源。`;
    const scanButton = createElement("button", "sn-primary-action", "Scan source →");
    scanButton.type = "button";
    scanButton.dataset.soundsScan = "true";
    panel.append(scanButton, createElement("small", "sn-scope-note", "交互原型 · 环境扫描演示"));
  } else if (soundsNomadRuntimeState.fieldPhase === "scan_running") {
    actionKicker.textContent = "02 SCAN";
    actionTitle.textContent = "正在扫描现场音频";
    actionCopy.textContent = "正在分析环境声源的节奏与质感。";
    const scan = createElement("div", "sn-scan-state");
    page.scanSteps.forEach((step, index) => scan.append(createElement("span", index <= soundsNomadRuntimeState.scanStep ? "is-active" : "", step)));
    panel.append(scan, createElement("small", "sn-scope-note", "交互原型 · 扫描状态"));
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      const continueScanButton = createElement("button", "sn-primary-action", "Finish scan →");
      continueScanButton.type = "button";
      continueScanButton.dataset.soundsScanContinue = "true";
      panel.append(continueScanButton);
    }
  } else if (soundsNomadRuntimeState.fieldPhase === "discovery_uncollected") {
    actionKicker.textContent = "03 CARD";
    actionTitle.textContent = "Discovery Card";
    actionCopy.textContent = "扫描完成；结果已整理为 Discovery Card。";
    const collectButton = createElement("button", "sn-primary-action", "Collect card →");
    collectButton.type = "button";
    collectButton.dataset.soundsCollect = "true";
    panel.append(collectButton, createElement("small", "sn-scope-note", "真实产品截图 · Discovery Card"));
  } else if (soundsNomadRuntimeState.fieldPhase === "discovery_collected") {
    actionKicker.textContent = "03 CARD / COLLECTED";
    actionTitle.textContent = source?.sound || "Discovered sound";
    actionCopy.textContent = `${page.garden.name} · 已收藏，可查看场景结果。`;
    const continueButton = createElement("button", "sn-primary-action", "Open Echo Garden →");
    continueButton.type = "button";
    continueButton.dataset.soundsContinue = "true";
    panel.append(continueButton, createElement("small", "sn-scope-note", "交互原型 · 已收藏"));
  } else {
    actionKicker.textContent = "04 KEEP";
    actionTitle.textContent = `${page.garden.name} ${progress}/${page.garden.total}`;
    actionCopy.textContent = "已回到个人场景。";
    const continueButton = createElement("button", "sn-primary-action", "Back to Field →");
    continueButton.type = "button";
    continueButton.dataset.soundsContinue = "true";
    panel.append(continueButton, createElement("small", "sn-scope-note", "真实产品截图 · Echo Garden"));
  }

  const evidenceTitle = createElement("div", "sn-evidence-heading");
  const isGardenProof = soundsNomadRuntimeState.fieldPhase === "continue";
  evidenceTitle.append(
    createElement("span", "", isGardenProof ? "KEEP / REAL SCREEN" : "PROOF / REAL SCREEN"),
    createElement("strong", "", isGardenProof ? "ECHO GARDEN" : "DISCOVERY CARD"),
  );
  const proofFrame = createElement("figure", "sn-field-proof");
  const discoveryProof = {
    ...page.evidence.discovery,
    src: "cases/soundsnomad/assets/discovery-card-detail.png",
    alt: "真实 SoundsNomad Discovery Card 卡片主体截图",
  };
  const proofImage = soundsNomadRuntimeState.fieldPhase === "discovery_uncollected" || soundsNomadRuntimeState.fieldPhase === "discovery_collected" ? discoveryProof : soundsNomadRuntimeState.fieldPhase === "continue" ? page.evidence.garden : null;
  if (proofImage) {
    const proofClass = soundsNomadRuntimeState.fieldPhase === "continue" ? "sn-proof-image sn-garden-proof" : "sn-proof-image sn-discovery-proof";
    proofFrame.append(createEagerImage(proofImage.src, proofImage.alt, proofClass), createElement("figcaption", "", soundsNomadRuntimeState.fieldPhase === "continue" ? "Echo Garden / product evidence" : "Discovery Card / product evidence"));
  } else {
    proofFrame.append(createElement("span", "sn-proof-empty", "等待扫描结果。"));
  }
  evidence.append(evidenceTitle, proofFrame);

  layout.append(field, panel, evidence);
  return layout;
}

function renderSoundsNomadAudioBasePage(page) {
  const layout = createElement("div", "case-page sounds-page sounds-base-page");
  const device = createElement("section", "sn-product-device");
  const tabs = createElement("div", "sn-device-tabs");
  const view = createElement("div", "sn-device-view");
  const readouts = createElement("div", "sn-device-readouts");
  const groupName = "sounds-product-screen";
  page.screens.forEach((screen, index) => {
    const inputId = `sn-product-screen-${screen.id}`;
    const input = createElement("input", "sn-tab-input");
    input.type = "radio";
    input.name = groupName;
    input.id = inputId;
    input.checked = index === 0;
    const label = createElement("label", "sn-device-tab", screen.label);
    label.htmlFor = inputId;
    tabs.append(input, label);

    const pane = createElement("label", "sn-device-pane");
    pane.htmlFor = inputId;
    pane.dataset.screen = screen.id;
    pane.setAttribute("aria-label", `${screen.label} / ${screen.name} · ${screen.note}`);
    const chrome = createElement("span", "sn-device-chrome");
    chrome.append(createEagerImage(screen.src, screen.alt, "sn-device-image"));
    const caption = createElement("span", "sn-device-caption");
    caption.append(createElement("b", "", screen.label), createElement("small", "", screen.name));
    pane.append(chrome, caption);
    view.append(pane);

    const readout = createElement("p", "sn-device-readout", `${screen.label} / ${screen.name} · ${screen.note}`);
    readout.dataset.screen = screen.id;
    readouts.append(readout);
  });
  device.append(tabs, view, readouts, createElement("span", "sn-device-stamp", "04 REAL SCREENS / SELECT"));

  const system = createElement("section", "sn-system-summary");
  system.append(createElement("span", "sn-section-kicker", page.badge), createElement("strong", "sn-system-title", "从内容到场景"));
  const systemRows = page.systemRows.map(([number, title, copy], index) => (
    index === 2 ? [number, "Context", copy] : [number, title, copy]
  ));
  systemRows.forEach(([number, title, copy], index) => {
    const row = createElement("div", index === 2 ? "sn-system-row is-core" : "sn-system-row");
    row.append(createElement("b", "", number), createElement("span", "", title), createElement("small", "", copy));
    system.append(row);
  });
  const callout = createElement("div", "sn-system-callout");
  callout.append(createElement("b", "", "FIELD / SYSTEM LINK"), createElement("span", "", "Field 将地图声源接入声音系统。"));
  system.append(callout, createElement("small", "sn-boundary-note", page.note));
  layout.append(device, system);
  return layout;
}

function renderSoundsNomadBuildLoopPage(page) {
  const layout = createElement("div", "case-page sounds-page sounds-loop-page");
  const workflow = createElement("section", "sn-workflow-track");
  page.steps.forEach(([number, label, title, line], index) => {
    const item = createElement("article", index === 1 ? "is-collab" : "");
    item.append(createElement("b", "", number), createElement("span", "", label), createElement("strong", "", title), createElement("small", "", line));
    if (index < page.steps.length - 1) item.append(createElement("i", "sn-workflow-arrow", "→"));
    workflow.append(item);
  });

  const growth = createElement("div", "sn-growth-grid");
  const aso = createElement("section", "sn-aso-proof");
  aso.append(createElement("span", "sn-section-kicker", "ASO / METHOD"), createElement("strong", "", page.aso.title));
  const chain = createElement("div", "sn-aso-chain");
  page.aso.chain.forEach((item, index) => {
    chain.append(createElement("span", "", item));
    if (index < page.aso.chain.length - 1) chain.append(createElement("i", "", "→"));
  });
  aso.append(chain, createElement("p", "", page.aso.note), createElement("small", "sn-pipeline-note", page.aso.pipeline));

  const flashcam = createElement("section", "sn-flashcam-proof");
  const flashcamHeading = createElement("div", "sn-proof-heading");
  flashcamHeading.append(createElement("span", "", "RELATED CASE"), createElement("strong", "", page.flashcam.title));
  const flashcamInputs = createElement("div", "sn-flashcam-tabs");
  const flashcamView = createElement("div", "sn-flashcam-view");
  page.flashcam.screens.forEach((screen, index) => {
    const inputId = `sn-flashcam-screen-${screen.id}`;
    const input = createElement("input", "sn-tab-input");
    input.type = "radio";
    input.name = "sounds-flashcam-screen";
    input.id = inputId;
    input.checked = index === 0;
    const label = createElement("label", "sn-device-tab", screen.label);
    label.htmlFor = inputId;
    flashcamInputs.append(input, label);
    const pane = createElement("figure", "sn-flashcam-pane");
    pane.dataset.screen = screen.id;
    pane.append(createEagerImage(screen.src, screen.alt, "sn-flashcam-image"));
    flashcamView.append(pane);
  });
  flashcam.append(flashcamHeading, flashcamInputs, flashcamView, createElement("p", "sn-flashcam-note", page.flashcam.note));
  growth.append(aso, flashcam);

  layout.append(createElement("span", "sn-section-kicker", page.badge), workflow, growth);
  return layout;
}

function renderFormatsPage(page) {
  const layout = createElement("div", "case-page case-page-formats");
  const rail = createElement("div", "format-rail");

  page.formats.forEach(([title, copy]) => {
    const item = createElement("article", "format-card");
    item.append(createElement("span", "", title), createElement("p", "", copy));
    rail.append(item);
  });

  layout.append(rail);
  return layout;
}

function renderInteractionPage(page) {
  const layout = createElement("div", "case-page case-page-interaction");
  const demo = createElement("div", "journal-demo");
  const selectedTemplate = page.templates?.[coladaRuntimeState.templateIndex] || page.templates?.[0];
  const canvas = createElement("section", coladaRuntimeState.journalStage === "result" ? "journal-canvas is-ready" : "journal-canvas");
  const canvasTop = createElement("div", "journal-canvas-top");
  const board = createElement("div", "journal-board");
  const controls = createElement("aside", "journal-controls");
  const templateList = createElement("div", "journal-template-list");
  const materials = createElement("div", "journal-material-list");
  const action = createElement("button", "generate-button journal-generate", coladaRuntimeState.journalStage === "result" ? "Regenerate Page" : "Generate Page");

  action.type = "button";
  action.dataset.generateColada = "true";

  canvas.setAttribute("aria-label", "Colada journal canvas");
  controls.setAttribute("aria-label", "Journal template controls");

  canvasTop.append(
    createElement("span", "", "Editable Canvas"),
    createElement("strong", "", coladaRuntimeState.journalStage === "result" ? "After" : "Before")
  );

  const photoA = createElement("div", "journal-photo journal-photo-a");
  photoA.append(createElement("span", "", "PHOTO"));
  const photoB = createElement("div", "journal-photo journal-photo-b");
  photoB.append(createElement("span", "", "SUNSET"));
  const note = createElement("div", "journal-note");
  note.append(createElement("strong", "", "weekend notes"), createElement("p", "", "coffee, city walk, calm mood"));
  const tape = createElement("div", "journal-tape");
  const stroke = createElement("div", "journal-stroke");
  const sparkle = createElement("div", "journal-sparkle");
  const resultLayer = createElement("div", "journal-result-layer");

  resultLayer.append(
    createElement("span", "", "Generated journal page"),
    createElement("strong", "", "Weekend Memory Board"),
    createElement("p", "", selectedTemplate ? `Template · ${selectedTemplate.name}` : "Template selected")
  );

  board.append(photoA, photoB, note, tape, stroke, sparkle, resultLayer);
  canvas.append(canvasTop, board);

  controls.append(createElement("span", "journal-control-label", "Template style"));

  page.templates?.forEach((template, index) => {
    const templateButton = createElement("button", index === coladaRuntimeState.templateIndex ? "journal-template is-selected" : "journal-template");
    const swatch = createElement("span", "journal-template-swatch");
    const copy = createElement("span", "");

    templateButton.type = "button";
    templateButton.dataset.coladaTemplate = String(index);
    templateButton.setAttribute("aria-pressed", String(index === coladaRuntimeState.templateIndex));
    swatch.style.setProperty("--template-accent", template.accent);
    copy.append(createElement("strong", "", template.name), createElement("em", "", template.tone));
    templateButton.append(swatch, copy);
    templateList.append(templateButton);
  });

  controls.append(templateList, createElement("span", "journal-control-label", "Canvas materials"));

  page.materials.forEach(([title, copy]) => {
    const item = createElement("div", "journal-material");
    item.append(createElement("strong", "", title), createElement("span", "", copy));
    materials.append(item);
  });

  controls.append(materials, action);
  demo.append(canvas, controls);
  layout.append(demo);
  return layout;
}

function renderProfilePage(page) {
  const layout = createElement("div", "case-page case-page-profile");
  const photoWrap = createElement("div", "profile-photo");
  const image = document.createElement("img");
  const copy = createElement("div", "profile-copy");
  const bullets = createElement("div", "case-bullet-list");
  const chips = createElement("div", "case-chip-row");

  image.src = page.image;
  image.alt = "Shane profile photo";
  image.loading = "lazy";
  photoWrap.append(image);

  page.bullets.forEach((item) => {
    bullets.append(createElement("p", "", item));
  });

  page.chips.forEach((item) => {
    chips.append(createElement("span", "", item));
  });

  copy.append(bullets, chips);
  layout.append(photoWrap, copy);
  return layout;
}

function getFocusIndex(items) {
  if (!items?.length) return 0;
  return Math.min(Math.max(aboutRuntimeState.focusIndex, 0), items.length - 1);
}

function getAboutFocusItems(page = getActivePage()) {
  if (!page?.type?.startsWith("about-")) return [];
  return page.timeline || page.nodes || page.stages || page.tracks || [];
}

function updateAboutAutoCycle() {
  window.clearInterval(aboutRuntimeState.autoTimer);
  aboutRuntimeState.autoTimer = null;

  const page = getActivePage();
  const items = getAboutFocusItems(page);
  if (screenMode !== "case" || activeCaseId !== aboutCase.id || items.length <= 1) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  aboutRuntimeState.autoTimer = window.setInterval(() => {
    const currentItems = getAboutFocusItems();
    if (screenMode !== "case" || activeCaseId !== aboutCase.id || currentItems.length <= 1) {
      updateAboutAutoCycle();
      return;
    }
    aboutRuntimeState.focusIndex = (aboutRuntimeState.focusIndex + 1) % currentItems.length;
    aboutRuntimeState.practiceStepIndex = 0;
    render();
  }, ABOUT_AUTO_INTERVAL);
}

function renderAboutTagList(items, className = "about-tag-row") {
  const row = createElement("div", className);
  items?.forEach((item) => row.append(createElement("span", "", item)));
  return row;
}

function renderAboutProfilePage(page) {
  const layout = createElement("div", "case-page about-page about-profile-page");
  const focusedIndex = getFocusIndex(page.timeline);
  const focusedItem = page.timeline[focusedIndex];
  const portrait = createElement("figure", "about-portrait-card");
  const image = document.createElement("img");
  const stickerLayer = createElement("div", "about-sticker-layer");
  const timeline = createElement("div", "about-work-track");
  const support = createElement("div", "about-support-grid");
  const detail = createElement("aside", "about-focus-note");

  image.src = page.image;
  image.alt = "Shane profile photo";
  image.loading = "lazy";
  portrait.append(image);

  page.stickers?.forEach((item, index) => {
    const sticker = createElement("span", "", item);
    sticker.dataset.sticker = String(index + 1);
    stickerLayer.append(sticker);
  });
  portrait.append(stickerLayer, renderAboutTagList(page.chips));

  page.timeline.forEach((item, index) => {
    const node = createElement("button", index === focusedIndex ? "about-track-node is-active" : "about-track-node");
    node.type = "button";
    node.dataset.aboutFocus = String(index);
    node.setAttribute("aria-pressed", String(index === focusedIndex));
    node.append(createElement("span", "", item.meta), createElement("strong", "", item.title));
    timeline.append(node);
  });

  page.cards.forEach((item) => {
    const card = createElement("article", "about-support-card");
    card.append(createElement("span", "", item.title), createElement("p", "", item.copy));
    support.append(card);
  });

  detail.append(
    createElement("span", "", focusedItem.meta),
    createElement("strong", "", focusedItem.title),
    createElement("p", "", focusedItem.copy)
  );

  layout.append(portrait, timeline, detail, support);
  return layout;
}

function renderAboutSystemPage(page) {
  const layout = createElement("div", "case-page about-page about-system-page");
  const focusedIndex = getFocusIndex(page.nodes);
  const focusedItem = page.nodes[focusedIndex];
  const map = createElement("section", "about-system-map");
  const core = createElement("div", "system-core");
  const nodes = createElement("div", "system-node-ring");
  const folderRail = createElement("div", "system-folder-rail");
  const note = createElement("aside", "about-focus-note system-focus-note");

  core.append(createElement("span", "", "Rule Core"), createElement("strong", "", page.core));

  page.nodes.forEach((item, index) => {
    const node = createElement("button", index === focusedIndex ? "system-node is-active" : "system-node");
    node.type = "button";
    node.dataset.aboutFocus = String(index);
    node.dataset.systemNode = String(index + 1);
    node.setAttribute("aria-pressed", String(index === focusedIndex));
    node.append(createElement("span", "", item.label), createElement("strong", "", item.title));
    nodes.append(node);
  });

  page.folders.forEach((item) => folderRail.append(createElement("span", "", item)));
  map.append(core, nodes, folderRail);

  note.append(
    createElement("span", "", focusedItem.label),
    createElement("strong", "", focusedItem.title),
    createElement("p", "", focusedItem.copy)
  );

  layout.append(map, note);
  return layout;
}

function renderAboutLoopPage(page) {
  const layout = createElement("div", "case-page about-page about-loop-page");
  const focusedIndex = getFocusIndex(page.stages);
  const focusedItem = page.stages[focusedIndex];
  const loop = createElement("section", "about-loop-orbit");
  const center = createElement("div", "loop-center");
  const note = createElement("aside", "about-focus-note loop-focus-note");

  center.append(createElement("span", "", "System Upgrade"), createElement("strong", "", "AI-native loop"));
  loop.append(center);

  page.stages.forEach((item, index) => {
    const stage = createElement("button", index === focusedIndex ? "loop-stage is-active" : "loop-stage");
    stage.type = "button";
    stage.dataset.aboutFocus = String(index);
    stage.dataset.loopStage = String(index + 1);
    stage.setAttribute("aria-pressed", String(index === focusedIndex));
    stage.append(createElement("span", "", item.artifact), createElement("strong", "", item.title));
    loop.append(stage);
  });

  note.append(
    createElement("span", "", focusedItem.artifact),
    createElement("strong", "", focusedItem.title),
    createElement("p", "", focusedItem.copy)
  );

  layout.append(loop, note);
  return layout;
}

function renderAboutPracticePage(page) {
  const layout = createElement("div", "case-page about-page about-practice-page");
  const focusedIndex = getFocusIndex(page.tracks);
  const focusedItem = page.tracks[focusedIndex] || page.tracks[0];
  const focusedSteps = focusedItem?.steps || [];
  const focusedStepIndex = focusedSteps.length
    ? Math.min(Math.max(aboutRuntimeState.practiceStepIndex, 0), focusedSteps.length - 1)
    : 0;
  const map = createElement("section", "practice-map");

  page.tracks.forEach((item, index) => {
    const isActive = index === focusedIndex;
    const track = createElement("article", isActive ? "practice-track is-active" : "practice-track");
    const trackSelect = createElement("button", "practice-track-select");
    const vector = renderPracticeVector(index);
    const flow = createElement("div", "practice-flow");
    const note = createElement("p", "practice-step-note");

    track.dataset.practiceTrack = String(index + 1);
    trackSelect.type = "button";
    trackSelect.dataset.aboutFocus = String(index);
    trackSelect.setAttribute("aria-pressed", String(isActive));
    trackSelect.append(
      createElement("span", "practice-track-meta", item.meta),
      createElement("strong", "", item.title)
    );

    (item.steps || []).forEach((step, stepIndex) => {
      const [label] = Array.isArray(step) ? step : [step];
      if (isActive) {
        const stepButton = createElement("button", "practice-step");
        stepButton.type = "button";
        stepButton.dataset.aboutPracticeStep = "true";
        stepButton.dataset.aboutPracticeTrack = String(index);
        stepButton.dataset.aboutPracticeStepIndex = String(stepIndex);
        stepButton.setAttribute("aria-pressed", String(stepIndex === focusedStepIndex));
        stepButton.append(
          createElement("span", "practice-step-index", String(stepIndex + 1).padStart(2, "0")),
          createElement("strong", "", label)
        );
        flow.append(stepButton);
        return;
      }

      const staticStep = createElement("span", "practice-step practice-step-static");
      staticStep.append(
        createElement("span", "practice-step-index", String(stepIndex + 1).padStart(2, "0")),
        createElement("strong", "", label)
      );
      flow.append(staticStep);
    });

    const activeStep = focusedSteps[focusedStepIndex];
    const activeStepNote = Array.isArray(activeStep) ? activeStep[1] : "点击步骤查看说明。";
    note.textContent = isActive ? activeStepNote || "点击步骤查看说明。" : "点击线路查看步骤聚焦。";
    track.append(
      trackSelect,
      vector,
      createElement("p", "practice-summary", item.copy),
      flow,
      note
    );
    map.append(track);
  });

  layout.append(map);
  return layout;
}

function renderPracticeVector(index) {
  const vector = createElement("div", `practice-vector practice-illustration practice-illustration-${index + 1}`);
  const assets = [
    ["practice-backend-pixel-v1.png", "业务后台支持像素插图"],
    ["practice-indie-pixel-v1.png", "独立产品像素插图"],
    ["practice-content-pixel-v1.png", "内容自动化工作流像素插图"],
  ];
  const [filename, alt] = assets[index] || assets[0];
  const image = createElement("img");
  const fallback = createElement("span", "practice-asset-fallback", "配图暂不可用，流程仍可继续阅读");
  image.src = `prototypes/prd_about-v8-recapture_20260713-0220/assets/${filename}`;
  image.alt = alt;
  image.loading = "lazy";
  image.decoding = "async";
  fallback.hidden = true;
  image.addEventListener("error", () => {
    image.hidden = true;
    fallback.hidden = false;
    vector.classList.add("has-error");
  });
  vector.append(image, fallback);

  return vector;
}

function renderResultPage(page) {
  const layout = createElement("div", page.visual ? "case-page case-page-result has-store-visual" : "case-page case-page-result");
  const blocks = createElement("div", "result-grid");

  page.blocks.forEach(([title, copy]) => {
    const block = createElement("article", "result-card");
    block.append(createElement("h3", "", title), createElement("p", "", copy));
    blocks.append(block);
  });

  if (page.visual) {
    const visual = createElement("figure", "store-visual-slot");
    const poster = createElement("div", "store-poster-mock");
    const screen = createElement("div", "store-poster-screen");

    screen.append(
      createElement("span", "store-slot-label", page.visual.label),
      createElement("strong", "", page.visual.title),
      createElement("i", "store-poster-card store-poster-card-a"),
      createElement("i", "store-poster-card store-poster-card-b"),
      createElement("i", "store-poster-card store-poster-card-c")
    );
    poster.append(screen);
    visual.append(poster, createElement("figcaption", "", page.visual.caption));
    layout.append(visual, blocks);
    return layout;
  }

  layout.append(blocks);
  return layout;
}

function renderLinkPage(page) {
  const layout = createElement("div", "case-page case-page-link");
  if (page.blocks) {
    layout.append(renderResultPage(page));
  }

  const terminal = createElement("div", "link-terminal");
  const button = createElement("button", "link-button is-disabled", page.button);
  button.type = "button";
  button.disabled = true;
  terminal.append(
    createElement("span", "", "External product link"),
    createElement("strong", "", "Case complete"),
    createElement("p", "", "项目方法、产品路径与公开证据已在当前页面内完整呈现。"),
    button
  );
  layout.append(terminal);
  return layout;
}

function renderCasePage(activeCase) {
  if (!casePage) return;

  const page = getActivePage();
  const usesIntegratedIntro = page.type === "intro" && page.productVisual;
  const frameClasses = ["case-page-frame"];
  if (usesIntegratedIntro) frameClasses.push("has-integrated-intro");
  if (page.type?.startsWith("colada-")) frameClasses.push("has-colada-page");
  if (page.type?.startsWith("dokie-")) frameClasses.push("has-dokie-page");
  if (page.type?.startsWith("viva-")) frameClasses.push("has-viva-page");
  if (page.type?.startsWith("sounds-")) frameClasses.push("has-soundsnomad-page");
  casePage.className = frameClasses.join(" ");
  casePage.dataset.pageType = page.type;
  casePage.dataset.caseId = activeCase.id;

  if (usesIntegratedIntro) {
    casePage.replaceChildren();
  } else {
    const header = createElement("div", "case-page-copy");
    header.append(createElement("h3", "", page.title), createElement("p", "", page.summary));
    casePage.replaceChildren(header);
  }

  if (page.type === "intro") casePage.append(renderIntroPage(page));
  if (page.type === "profile") casePage.append(renderProfilePage(page));
  if (page.type === "about-profile") casePage.append(renderAboutProfilePage(page));
  if (page.type === "about-system") casePage.append(renderAboutSystemPage(page));
  if (page.type === "about-loop") casePage.append(renderAboutLoopPage(page));
  if (page.type === "about-practice") casePage.append(renderAboutPracticePage(page));
  if (page.type === "colada-intro") casePage.append(renderColadaIntroPage(page));
  if (page.type === "colada-showcase") casePage.append(renderColadaShowcasePage(page));
  if (page.type === "colada-journal") casePage.append(renderColadaJournalPage(page));
  if (page.type === "colada-result") casePage.append(renderColadaResultPage(page));
  if (page.type === "dokie-intro") casePage.append(renderDokieIntroPage(page));
  if (page.type === "dokie-workflow") casePage.append(renderDokieWorkflowPage(page));
  if (page.type === "dokie-formats") casePage.append(renderDokieFormatsPage(page));
  if (page.type === "dokie-template") casePage.append(renderDokieTemplateSystemPage(page));
  if (page.type === "viva-intro") casePage.append(renderVivaIntroPage(page));
  if (page.type === "viva-shelf") casePage.append(renderVivaShelfPage(page));
  if (page.type === "viva-loop") casePage.append(renderVivaLoopPage(page));
  if (page.type === "viva-learning") casePage.append(renderVivaLearningPage(page));
  if (page.type === "sounds-intro") casePage.append(renderSoundsNomadSnapshotPage(page));
  if (page.type === "sounds-field") casePage.append(renderSoundsNomadFieldPage(page));
  if (page.type === "sounds-base") casePage.append(renderSoundsNomadAudioBasePage(page));
  if (page.type === "sounds-loop") casePage.append(renderSoundsNomadBuildLoopPage(page));
  if (page.type === "showcase") casePage.append(renderShowcasePage(page));
  if (page.type === "formats") casePage.append(renderFormatsPage(page));
  if (page.type === "interaction") casePage.append(renderInteractionPage(page));
  if (page.type === "result") casePage.append(renderResultPage(page));
  if (page.type === "link") casePage.append(renderLinkPage(page));

  if (casePageLabel) casePageLabel.textContent = page.label;
}

function updateStepButtons(activeCase) {
  const isCaseMode = screenMode === "case";
  const activeIndex = getActiveIndex();
  const prevDisabled = isCaseMode ? activePageIndex === 0 : false;
  const runtimeBlocksNext = isCaseMode && getCaseRuntime(activeCase.id)?.blocksNext({ pageIndex: activePageIndex });
  const nextDisabled = isCaseMode ? activePageIndex >= activeCase.pages.length - 1 || runtimeBlocksNext : false;

  if (stepBackButton) {
    stepBackButton.disabled = prevDisabled;
    stepBackButton.setAttribute("aria-label", isCaseMode ? "上一页" : "上一个项目");
  }

  if (stepForwardButton) {
    stepForwardButton.disabled = nextDisabled;
    stepForwardButton.setAttribute("aria-label", isCaseMode ? "下一页" : "下一个项目");
  }

  document.body.dataset.stepContext = isCaseMode ? "page" : "case";
  document.body.dataset.stepIndex = isCaseMode ? String(activePageIndex) : String(Math.max(activeIndex, 0));
}

function render() {
  const nextCase = getActiveCase();
  const activeIndex = getActiveIndex();
  const nextPage = nextCase.pages[activePageIndex] || nextCase.pages[0];
  const displayIndex =
    activeIndex >= 0 ? `${formatIndex(activeIndex)} / ${String(selectEntries.length).padStart(2, "0")}` : "01 / 05";

  activePageIndex = Math.min(activePageIndex, nextCase.pages.length - 1);
  const routeKey = `${screenMode}:${nextCase.id}:${activePageIndex}`;
  if (renderedRouteKey !== routeKey) {
    renderedRouteKey = routeKey;
    if (casePanel) casePanel.scrollTop = 0;
  }
  document.body.dataset.activeCase = nextCase.id;
  if (casePanel) casePanel.dataset.caseTheme = nextCase.id;
  document.documentElement.style.setProperty("--active-case-index", String(Math.max(activeIndex, 0)));

  if (progress) progress.textContent = displayIndex;
  if (screenCount) screenCount.textContent = displayIndex;
  if (caseKicker) caseKicker.textContent = nextCase.kicker;
  if (caseTitle) caseTitle.textContent = nextCase.title;
  if (caseSummary) caseSummary.textContent = nextCase.summary;
  if (caseVisual) {
    caseVisual.dataset.caseVisual = nextCase.visual;
    caseVisual.replaceChildren(
      createEagerImage(nextCase.headerImage, nextCase.headerAlt || "", "case-visual-image")
    );
  }
  if (caseFileKicker) caseFileKicker.textContent = nextCase.kicker;
  if (caseFileTitle) caseFileTitle.textContent = nextCase.title;
  if (caseFileSummary) caseFileSummary.textContent = nextCase.summary;

  if (!(nextCase.id === "dokie" && nextPage.type === "dokie-workflow") && dokieRuntimeState.executionEntered) {
    resetDokieExecutionState();
  }

  targets.forEach((button) => {
    const isActive = button.dataset.caseTarget === nextCase.id;
    const targetIndex = selectEntries.findIndex((item) => item.id === button.dataset.caseTarget);
    let wheelPosition = targetIndex - activeIndex;

    if (wheelPosition > Math.floor(selectEntries.length / 2)) wheelPosition -= selectEntries.length;
    if (wheelPosition < -Math.floor(selectEntries.length / 2)) wheelPosition += selectEntries.length;

    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.setAttribute("aria-pressed", String(isActive));
    if (button.classList.contains("home-stack-card")) {
      button.dataset.wheelPos = String(wheelPosition);
    }
    if (button.getAttribute("role") === "tab") {
      button.tabIndex = isActive ? 0 : -1;
    }
  });

  renderCasePage(nextCase);
  updateStepButtons(nextCase);
  setPanels();
  if (nextCase.id === "dokie" && nextPage.type === "dokie-workflow" && !dokieRuntimeState.executionEntered) {
    dokieRuntimeState.executionEntered = true;
    dokieRuntimeState.executionPlaying = true;
    scheduleDokieExecution();
  }
  updateAboutAutoCycle();
}

function setActiveCase(caseId, options = {}) {
  if (!caseMap.has(caseId)) return;
  const previousCaseId = activeCaseId;
  if (previousCaseId !== caseId) resetCaseRuntime(previousCaseId);
  activeCaseId = caseId;
  activePageIndex = 0;
  activeShowcaseIndex = null;
  activeColadaCaseIndex = null;
  resetCaseRuntime(caseId);
  if (options.mode) screenMode = options.mode;
  render();
  if (options.updateHash) updateHash();
}

function stepCase(direction) {
  const currentIndex = getActiveIndex();
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (safeIndex + direction + selectEntries.length) % selectEntries.length;
  setActiveCase(selectEntries[nextIndex].id, { mode: "select", updateHash: true });
}

function startCase() {
  screenMode = "case";
  activePageIndex = 0;
  activeShowcaseIndex = null;
  activeColadaCaseIndex = null;
  resetCaseRuntime();
  render();
  updateHash();
}

function backToSelect() {
  activePageIndex = 0;
  resetCaseRuntime();
  activeShowcaseIndex = null;
  activeColadaCaseIndex = null;
  screenMode = "select";
  render();
  updateHash();
}

function openAbout() {
  resetCaseRuntime(activeCaseId);
  activeCaseId = aboutCase.id;
  activePageIndex = 0;
  activeShowcaseIndex = null;
  activeColadaCaseIndex = null;
  resetCaseRuntime();
  screenMode = "case";
  render();
  updateHash();
}

function stopGame() {
  resetCaseRuntime(activeCaseId);
  activeCaseId = aboutCase.id;
  activePageIndex = 0;
  activeShowcaseIndex = null;
  activeColadaCaseIndex = null;
  resetCaseRuntime();
  screenMode = "select";
  render();
  window.history.replaceState(null, "", window.location.pathname);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function stepPage(direction) {
  const activeCase = getActiveCase();
  const nextPageIndex = activePageIndex + direction;
  if (nextPageIndex < 0 || nextPageIndex >= activeCase.pages.length) return;
  getCaseRuntime()?.onPageLeave();
  activePageIndex = nextPageIndex;
  activeShowcaseIndex = null;
  activeColadaCaseIndex = null;
  render();
  updateHash();
}

function stepArcade(direction) {
  if (screenMode === "case") {
    stepPage(direction);
    return;
  }

  stepCase(direction);
}

targets.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveCase(button.dataset.caseTarget, { mode: "select", updateHash: true });
    setButtonPulse(button);
  });
});

homeCardRail?.addEventListener(
  "wheel",
  (event) => {
    if (screenMode !== "select") return;
    event.preventDefault();
    if (wheelInputLocked) return;

    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (delta === 0) return;

    wheelInputLocked = true;
    stepCase(delta > 0 ? 1 : -1);
    window.setTimeout(() => {
      wheelInputLocked = false;
    }, 220);
  },
  { passive: false }
);

aboutButton?.addEventListener("click", () => {
  openAbout();
  setButtonPulse(aboutButton);
});

stopButton?.addEventListener("click", () => {
  stopGame();
  setButtonPulse(stopButton);
});

startButtons.forEach((button) => {
  button.addEventListener("click", () => {
    startCase();
    setButtonPulse(button);
  });
});

stepBackButton?.addEventListener("click", () => {
  stepArcade(-1);
  setButtonPulse(stepBackButton);
});

stepForwardButton?.addEventListener("click", () => {
  stepArcade(1);
  setButtonPulse(stepForwardButton);
});

musicToggle?.addEventListener("click", toggleMusic);
crtStartButton?.addEventListener("click", startArcadeExperience);
soundtrack?.addEventListener("error", () => {
  musicAvailable = false;
  musicEnabled = false;
  syncMusicControl();
  if (musicToggle) musicToggle.disabled = true;
  if (musicLabel) musicLabel.textContent = "Music Error";
});
syncMusicControl();
if (musicToggle) musicToggle.disabled = true;

function handleAboutCaseClick(event) {
  const practiceStep = event.target.closest("[data-about-practice-step]");
  if (practiceStep) {
    const nextTrackIndex = Number(practiceStep.dataset.aboutPracticeTrack);
    const nextStepIndex = Number(practiceStep.dataset.aboutPracticeStepIndex);
    if (!Number.isNaN(nextTrackIndex) && !Number.isNaN(nextStepIndex)) {
      aboutRuntimeState.focusIndex = nextTrackIndex;
      aboutRuntimeState.practiceStepIndex = nextStepIndex;
      render();
      setButtonPulse(practiceStep);
    }
    return true;
  }

  const focusButton = event.target.closest("[data-about-focus]");
  if (!focusButton) return false;
  const nextIndex = Number(focusButton.dataset.aboutFocus);
  if (!Number.isNaN(nextIndex)) {
    aboutRuntimeState.focusIndex = nextIndex;
    aboutRuntimeState.practiceStepIndex = 0;
    render();
    setButtonPulse(focusButton);
  }
  return true;
}

function handleColadaCaseClick(event) {
  const openCaseButton = event.target.closest("[data-colada-case-open]");
  if (openCaseButton) {
    const nextIndex = Number(openCaseButton.dataset.coladaCaseOpen);
    if (!Number.isNaN(nextIndex)) {
      activeColadaCaseIndex = nextIndex;
      render();
    }
    return true;
  }

  const shouldCloseCase =
    event.target.closest("[data-colada-case-close]") || event.target.dataset.coladaCaseBackdrop === "true";
  if (shouldCloseCase) {
    activeColadaCaseIndex = null;
    render();
    return true;
  }

  const templateButton = event.target.closest("[data-colada-template]");
  if (templateButton) {
    if (coladaRuntimeState.journalStage !== "style" && coladaRuntimeState.journalStage !== "result") return true;
    const nextIndex = Number(templateButton.dataset.coladaTemplate);
    if (!Number.isNaN(nextIndex)) {
      coladaRuntimeState.templateIndex = nextIndex;
      render();
    }
    return true;
  }

  const materialButton = event.target.closest("[data-colada-material]");
  if (materialButton && coladaRuntimeState.journalStage === "canvas") {
    const materialId = materialButton.dataset.coladaMaterial;
    if (coladaRuntimeState.materialIds.has(materialId)) coladaRuntimeState.materialIds.delete(materialId);
    else coladaRuntimeState.materialIds.add(materialId);
    render();
    setButtonPulse(materialButton);
    return true;
  }

  const journeyButton = event.target.closest("[data-colada-journey]");
  if (journeyButton) {
    const action = journeyButton.dataset.coladaJourney;
    if (action === "style") {
      if (coladaRuntimeState.journalStage !== "canvas" || coladaRuntimeState.materialIds.size < 2) return true;
      clearColadaGenerationTimer();
      coladaRuntimeState.generating = false;
      coladaRuntimeState.journalStage = "style";
    } else if (action === "advance") {
      if (coladaRuntimeState.journalStage !== "generating") return true;
      advanceColadaGeneration();
      return true;
    } else if (action === "reset") {
      resetColadaJournal();
    }
    render();
    return true;
  }

  const productStepButton = event.target.closest("[data-colada-product-step]");
  if (productStepButton) {
    const page = getActivePage();
    const screens = page?.type === "colada-intro" ? page.screens || [] : [];
    const direction = Number(productStepButton.dataset.coladaProductStep);
    if (screens.length && !Number.isNaN(direction)) {
      coladaRuntimeState.productIndex = (coladaRuntimeState.productIndex + direction + screens.length) % screens.length;
      render();
      setButtonPulse(productStepButton);
    }
    return true;
  }

  const productButton = event.target.closest("[data-colada-product]");
  if (productButton) {
    const nextIndex = Number(productButton.dataset.coladaProduct);
    if (!Number.isNaN(nextIndex)) {
      coladaRuntimeState.productIndex = nextIndex;
      render();
    }
    return true;
  }

  const generateButton = event.target.closest("[data-generate-colada]");
  if (!generateButton) return false;
  startColadaGeneration(generateButton);
  return true;
}

function handleDokieCaseClick(event) {
  const executionButton = event.target.closest("[data-dokie-execution]");
  if (executionButton) {
    const action = executionButton.dataset.dokieExecution;
    if (action === "run") {
      beginDokieExecution({ autoPlay: true, reset: true });
    } else if (action === "step") {
      clearDokieExecutionTimer();
      dokieRuntimeState.executionEntered = true;
      dokieRuntimeState.executionPlaying = false;
      advanceDokieExecution();
    } else if (action === "replay") {
      beginDokieExecution({ autoPlay: true, reset: true });
    }
    return true;
  }

  const refineActionButton = event.target.closest("[data-dokie-refine-action]");
  if (refineActionButton && dokieRuntimeState.executionStage === "refine") {
    dokieRuntimeState.refineAction = refineActionButton.dataset.dokieRefineAction;
    render();
    return true;
  }

  const formatButton = event.target.closest("[data-dokie-format]");
  if (formatButton) {
    const nextIndex = Number(formatButton.dataset.dokieFormat);
    if (!Number.isNaN(nextIndex)) {
      dokieRuntimeState.formatIndex = nextIndex;
      dokieRuntimeState.artifactIndex = 0;
      dokieRuntimeState.artifactScroll = 0;
      render();
      setButtonPulse(formatButton);
    }
    return true;
  }

  const artifactButton = event.target.closest("[data-dokie-artifact]");
  if (artifactButton) {
    const action = artifactButton.dataset.dokieArtifact;
    const activeArtifact = dokieArtifactManifest[dokieRuntimeState.formatIndex];
    if (action === "previous") dokieRuntimeState.artifactIndex = Math.max(0, dokieRuntimeState.artifactIndex - 1);
    else if (action === "next") dokieRuntimeState.artifactIndex = Math.min(activeArtifact.items.length - 1, dokieRuntimeState.artifactIndex + 1);
    else {
      const nextIndex = Number(action);
      if (!Number.isNaN(nextIndex)) dokieRuntimeState.artifactIndex = nextIndex;
    }
    dokieRuntimeState.artifactScroll = 0;
    render();
    setButtonPulse(artifactButton);
    return true;
  }

  const stageButton = event.target.closest("[data-dokie-template-stage]");
  if (stageButton) {
    const nextIndex = Number(stageButton.dataset.dokieTemplateStage);
    if (!Number.isNaN(nextIndex)) {
      dokieRuntimeState.templateStageIndex = nextIndex;
      render();
      setButtonPulse(stageButton);
    }
    return true;
  }

  const roleButton = event.target.closest("[data-dokie-template-role]");
  if (roleButton) {
    const nextIndex = Number(roleButton.dataset.dokieTemplateRole);
    if (!Number.isNaN(nextIndex)) {
      dokieRuntimeState.templateRoleIndex = nextIndex;
      render();
      setButtonPulse(roleButton);
    }
    return true;
  }

  const taskButton = event.target.closest("[data-dokie-template-task]");
  if (taskButton) {
    const nextIndex = Number(taskButton.dataset.dokieTemplateTask);
    if (!Number.isNaN(nextIndex)) {
      dokieRuntimeState.templateTaskIndex = nextIndex;
      render();
      setButtonPulse(taskButton);
    }
    return true;
  }

  const tokenButton = event.target.closest("[data-dokie-token]");
  if (!tokenButton) return false;
  dokieRuntimeState.templateToken = tokenButton.dataset.dokieToken;
  render();
  setButtonPulse(tokenButton);
  return true;
}

function handleVivaCaseClick(event) {
  const playButton = event.target.closest("[data-viva-play]");
  if (playButton) {
    const nextIndex = Number(playButton.dataset.vivaPlay);
    if (!Number.isNaN(nextIndex)) {
      vivaRuntimeState.playIndex = nextIndex;
      vivaRuntimeState.journeyStep = 0;
      render();
      setButtonPulse(playButton);
    }
    return true;
  }

  const journeyButton = event.target.closest("[data-viva-journey]");
  if (journeyButton) {
    const action = journeyButton.dataset.vivaJourney;
    if (action === "next") vivaRuntimeState.journeyStep = Math.min(3, vivaRuntimeState.journeyStep + 1);
    else if (action === "reset") vivaRuntimeState.journeyStep = 0;
    else {
      const nextIndex = Number(action);
      if (!Number.isNaN(nextIndex)) vivaRuntimeState.journeyStep = nextIndex;
    }
    render();
    setButtonPulse(journeyButton);
    return true;
  }

  const loopButton = event.target.closest("[data-viva-loop]");
  if (loopButton) {
    const nextIndex = Number(loopButton.dataset.vivaLoop);
    if (!Number.isNaN(nextIndex)) {
      vivaRuntimeState.loopIndex = nextIndex;
      render();
    }
    return true;
  }

  const learningButton = event.target.closest("[data-viva-learning]");
  if (!learningButton) return false;
  const nextIndex = Number(learningButton.dataset.vivaLearning);
  if (!Number.isNaN(nextIndex)) {
    vivaRuntimeState.learningIndex = nextIndex;
    render();
  }
  return true;
}

function handleSoundsNomadCaseClick(event) {
  const entryButton = event.target.closest("[data-sounds-entry]");
  if (entryButton) {
    enterSoundsField();
    setButtonPulse(entryButton);
    return true;
  }

  const sourceButton = event.target.closest("[data-sounds-source]");
  if (sourceButton) {
    selectSoundsSource(sourceButton.dataset.soundsSource);
    setButtonPulse(sourceButton);
    return true;
  }

  const scanButton = event.target.closest("[data-sounds-scan]");
  if (scanButton) {
    startSoundsScan();
    setButtonPulse(scanButton);
    return true;
  }

  const scanContinueButton = event.target.closest("[data-sounds-scan-continue]");
  if (scanContinueButton) {
    advanceSoundsScan();
    setButtonPulse(scanContinueButton);
    return true;
  }

  const collectButton = event.target.closest("[data-sounds-collect]");
  if (collectButton) {
    collectSoundsSource();
    setButtonPulse(collectButton);
    return true;
  }

  const continueButton = event.target.closest("[data-sounds-continue]");
  if (!continueButton) return false;
  continueSoundsField(getActivePage());
  setButtonPulse(continueButton);
  return true;
}

const caseClickHandlers = Object.freeze({
  about: handleAboutCaseClick,
  colada: handleColadaCaseClick,
  dokie: handleDokieCaseClick,
  creator: handleVivaCaseClick,
  indie: handleSoundsNomadCaseClick,
});

casePage?.addEventListener("click", (event) => {
  caseClickHandlers[activeCaseId]?.(event);
});

cabinet?.addEventListener("keydown", (event) => {
  if (!experienceStarted) return;

  if (activeColadaCaseIndex !== null && event.key === "Escape") {
    event.preventDefault();
    activeColadaCaseIndex = null;
    render();
    return;
  }

  if (activeShowcaseIndex !== null && event.key === "Escape") {
    event.preventDefault();
    activeShowcaseIndex = null;
    render();
    return;
  }

  if (screenMode === "select" && (event.key === "ArrowRight" || event.key === "ArrowDown")) {
    event.preventDefault();
    stepCase(1);
  }

  if (screenMode === "select" && (event.key === "ArrowLeft" || event.key === "ArrowUp")) {
    event.preventDefault();
    stepCase(-1);
  }

  if (screenMode === "case" && event.key === "ArrowRight") {
    event.preventDefault();
    stepPage(1);
  }

  if (screenMode === "case" && event.key === "ArrowLeft") {
    event.preventDefault();
    stepPage(-1);
  }

  if (event.key === "Enter") {
    event.preventDefault();
    if (screenMode === "select") startCase();
    else stepPage(1);
  }

  if (event.key === "Escape" && screenMode === "case") {
    event.preventDefault();
    backToSelect();
  }
});

window.addEventListener("hashchange", () => {
  const previousCaseId = activeCaseId;
  const previousPageIndex = activePageIndex;
  activeCaseId = getInitialCaseId();
  activePageIndex = getInitialPageIndex();
  if (previousCaseId !== activeCaseId) {
    resetCaseRuntime(previousCaseId);
    resetCaseRuntime(activeCaseId);
  } else if (previousPageIndex !== activePageIndex) {
    getCaseRuntime()?.onPageLeave();
  }
  activeShowcaseIndex = null;
  activeColadaCaseIndex = null;
  screenMode = getInitialScreenMode();
  render();
});

render();
