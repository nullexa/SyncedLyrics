function findBlyricsOuterHTML() {
  const el = document.querySelector('div.blyrics-container');
  return el ? el.outerHTML : null;
}

// Store current page's content under key = location.href
async function storeCurrentBlyrics() {
  const html = findBlyricsOuterHTML();
  const key = location.href;
  const payload = { value: html, url: key, ts: Date.now() };
  try {
    await browser.storage.local.set({ [key]: payload });
    // optional: console.log('blyrics stored', payload);
  } catch (e) {
    console.warn('Error storing blyrics', e);
  }
}

// When the script loads, store initial value
storeCurrentBlyrics();

// Watch for DOM changes and update stored value (debounced)
let debounceTimer = null;
const observer = new MutationObserver(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    storeCurrentBlyrics();
  }, 300); // small debounce
});
observer.observe(document.documentElement || document.body, {
  childList: true,
  subtree: true,
  characterData: true
});

// Respond to popup messages
browser.runtime.onMessage.addListener((message, sender) => {
  if (message && message.action === 'getBlyrics') {
    // return an object or promise that resolves to the result
    return Promise.resolve({ html: findBlyricsOuterHTML(), url: location.href });
  }
  if (message && message.action === 'getStoredForUrl') {
    const url = message.url;
    return browser.storage.local.get(url).then(obj => ({ stored: obj[url] || null }));
  }
  // else ignore
});
