(async () => {
  /************************************************************
   * Reset X news feed
   * Auto-clicks:
   * - "Not interested in this post"
   * - "Show fewer posts from..."
   *
   * Stop:
   * window.stopXNotInterested()
   ************************************************************/

  const CONFIG = {
    MAX_MENU_OPENS: 500,
    LOOP_DELAY_MS: 60,
    AFTER_CLICK_DELAY_MS: 80,
    SCROLL_DELAY_MS: 180,
    SCROLL_STEP_PX: 1200,
    LOG_EVERY_MS: 1500
  };

  const NOT_INTERESTED_RE =
    /^(not interested in this post|not interested|pas intéressé|ce post ne m['’]intéresse pas|ne m['’]intéresse pas)$/i;

  const SHOW_FEWER_RE =
    /^(show fewer posts from|show fewer posts|show fewer|see fewer posts from|voir moins|afficher moins|montrer moins|moins de posts|moins de publications)/i;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const textOf = (el) => {
    return (
      el?.innerText ||
      el?.textContent ||
      el?.getAttribute?.("aria-label") ||
      ""
    ).trim();
  };

  const visible = (el) => {
    if (!el) return false;

    const r = el.getBoundingClientRect();

    return (
      r.width > 0 &&
      r.height > 0 &&
      r.bottom > 0 &&
      r.top < window.innerHeight &&
      r.right > 0 &&
      r.left < window.innerWidth
    );
  };

  const realClick = (el) => {
    if (!el) return false;

    const target =
      el.closest('[role="menuitem"], [role="button"], button, a') || el;

    try {
      target.scrollIntoView({ block: "center", inline: "center" });
    } catch {}

    const r = target.getBoundingClientRect();

    const opts = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: r.left + r.width / 2,
      clientY: r.top + r.height / 2
    };

    target.dispatchEvent(new PointerEvent("pointerdown", opts));
    target.dispatchEvent(new MouseEvent("mousedown", opts));
    target.dispatchEvent(new PointerEvent("pointerup", opts));
    target.dispatchEvent(new MouseEvent("mouseup", opts));
    target.dispatchEvent(new MouseEvent("click", opts));

    try {
      target.click();
    } catch {}

    return true;
  };

  const closeMenus = () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        keyCode: 27,
        which: 27,
        bubbles: true
      })
    );
  };

  const getClickableTextElements = (regex) => {
    const raw = [
      ...document.querySelectorAll(
        '[role="menuitem"], [role="button"], button, a, span'
      )
    ];

    const matched = raw
      .filter((el) => visible(el))
      .filter((el) => {
        const txt = textOf(el);
        return txt.length > 0 && txt.length < 160 && regex.test(txt);
      })
      .map((el) => el.closest('[role="menuitem"], [role="button"], button, a') || el);

    return [...new Set(matched)]
      .filter((el) => visible(el))
      .sort((a, b) => textOf(a).length - textOf(b).length);
  };

  const findNotInterested = () => {
    return getClickableTextElements(NOT_INTERESTED_RE)[0] || null;
  };

  const findShowFewer = () => {
    return getClickableTextElements(SHOW_FEWER_RE)[0] || null;
  };

  const getArticles = () => {
    return [...document.querySelectorAll('article[role="article"]')].filter(visible);
  };

  const getPostKey = (article) => {
    const link = article.querySelector('a[href*="/status/"]');

    if (link) return link.href;

    return textOf(article).slice(0, 250);
  };

  const findMoreButton = (article) => {
    const buttons = [
      ...article.querySelectorAll(
        'button[data-testid="caret"], button[aria-label="More"], button[aria-haspopup="menu"]'
      )
    ].filter(visible);

    return buttons[0] || null;
  };

  window.__xNIState = {
    stop: false,
    menuOpened: 0,
    notInterestedClicked: 0,
    showFewerClicked: 0,
    failed: 0,
    processed: new Set(),
    lastAction: "starting"
  };

  window.stopXNotInterested = () => {
    window.__xNIState.stop = true;
    closeMenus();
    console.warn("Reset X news feed stopped.");
  };

  const printStatus = () => {
    console.clear();
    console.log("Reset X news feed is running...");
    console.log("Stop command: window.stopXNotInterested()");
    console.table({
      "menus opened": window.__xNIState.menuOpened,
      "not interested clicked": window.__xNIState.notInterestedClicked,
      "show fewer clicked": window.__xNIState.showFewerClicked,
      "failed": window.__xNIState.failed,
      "last action": window.__xNIState.lastAction
    });
  };

  const statusLoop = async () => {
    while (!window.__xNIState.stop) {
      printStatus();
      await sleep(CONFIG.LOG_EVERY_MS);
    }
  };

  const notInterestedLoop = async () => {
    while (!window.__xNIState.stop) {
      const el = findNotInterested();

      if (el) {
        realClick(el);
        window.__xNIState.notInterestedClicked++;
        window.__xNIState.lastAction = "clicked Not interested";
        await sleep(CONFIG.AFTER_CLICK_DELAY_MS);
      }

      await sleep(CONFIG.LOOP_DELAY_MS);
    }
  };

  const showFewerLoop = async () => {
    while (!window.__xNIState.stop) {
      const el = findShowFewer();

      if (el) {
        realClick(el);
        window.__xNIState.showFewerClicked++;
        window.__xNIState.lastAction = "clicked Show fewer";
        await sleep(CONFIG.AFTER_CLICK_DELAY_MS);
      }

      await sleep(CONFIG.LOOP_DELAY_MS);
    }
  };

  const menuOpenLoop = async () => {
    while (
      !window.__xNIState.stop &&
      window.__xNIState.menuOpened < CONFIG.MAX_MENU_OPENS
    ) {
      const articles = getArticles();
      let openedSomething = false;

      for (const article of articles) {
        if (
          window.__xNIState.stop ||
          window.__xNIState.menuOpened >= CONFIG.MAX_MENU_OPENS
        ) {
          break;
        }

        const key = getPostKey(article);

        if (!key || window.__xNIState.processed.has(key)) {
          continue;
        }

        const more = findMoreButton(article);

        if (!more) {
          window.__xNIState.failed++;
          continue;
        }

        window.__xNIState.processed.add(key);

        article.scrollIntoView({ block: "center" });
        await sleep(30);

        realClick(more);

        window.__xNIState.menuOpened++;
        window.__xNIState.lastAction = "opened post menu";
        openedSomething = true;

        await sleep(120);
      }

      window.scrollBy(0, CONFIG.SCROLL_STEP_PX);
      await sleep(CONFIG.SCROLL_DELAY_MS);

      if (!openedSomething) {
        window.scrollBy(0, CONFIG.SCROLL_STEP_PX * 2);
        await sleep(250);
      }
    }

    window.__xNIState.stop = true;
    closeMenus();
    printStatus();
    console.log("Reset X news feed finished.");
  };

  console.clear();
  console.log("Reset X news feed started.");

  statusLoop();
  notInterestedLoop();
  showFewerLoop();

  await menuOpenLoop();
})();
