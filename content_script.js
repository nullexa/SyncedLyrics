function findBlyricsOuterHTML() {
  const el = document.querySelector('div.blyrics-container');
  return el ? el.outerHTML : null;
}

browser.runtime.onMessage.addListener((message, sender) => {
  if (message && message.action === 'getBlyrics') {
    return Promise.resolve({ html: findBlyricsOuterHTML(), url: location.href });
  }
});
