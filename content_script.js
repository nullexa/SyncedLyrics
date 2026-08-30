function findBlyricsOuterHTML() {
  const el = document.querySelector('div.blyrics-container');
  return el ? el.outerHTML : null;
}

function getCurrentSongInfo() {
  const singleElement = document.querySelector('.content-info-wrapper.style-scope.ytmusic-player-bar');
  const text = singleElement?.firstElementChild?.innerText?.trim() ?? null;
  console.log('Scraped song info:', text);
  return text;
}

browser.runtime.onMessage.addListener((message, sender) => {
  if (!message || !message.action) return;

  if (message.action === 'getBlyrics') {
    return Promise.resolve({ html: findBlyricsOuterHTML(), url: location.href });
  }

  if (message.action === 'getInfo') {
    return Promise.resolve(getCurrentSongInfo());
  }
});
