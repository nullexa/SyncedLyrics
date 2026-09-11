function extractLyrics() {
  const containerEl = document.querySelector('div.blyrics-container');
  if (!containerEl) return null;

  const lineEls = containerEl.querySelectorAll('.blyrics--line');
  return Array.from(lineEls).map((lineEl) => {
    const lineWords = Array.from(lineEl.querySelectorAll('.blyrics--word')).map((wordEl) => ({
      text: wordEl.textContent || '',
      start: parseFloat(wordEl.dataset.time) || 0,
      duration: parseFloat(wordEl.dataset.duration) || 0,
    }));

    return {
      lineNumber: parseInt(lineEl.dataset.lineNumber, 10) || 0,
      start: parseFloat(lineEl.dataset.time) || 0,
      duration: parseFloat(lineEl.dataset.duration) || 0,
      words: lineWords,
    };
  });
}

function getCurrentSongInfo() {
  const singleElement = document.querySelector('.content-info-wrapper.style-scope.ytmusic-player-bar');
  return singleElement?.firstElementChild?.textContent?.trim() || null;
}

browser.runtime.onMessage.addListener((message) => {
  if (!message?.action) return;

  if (message.action === 'getBlyrics') {
    return Promise.resolve({ lyrics: extractLyrics(), url: location.href });
  }

  if (message.action === 'getInfo') {
    return Promise.resolve(getCurrentSongInfo());
  }
});