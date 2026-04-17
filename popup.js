const statusEl = document.getElementById('status');
const previewEl = document.getElementById('preview');
const copyBtn = document.getElementById('copyBtn');
const refreshBtn = document.getElementById('refreshBtn');

let fullHTML = null;
let Lyrics = null;

function setStatus(text) {
  statusEl.textContent = text;
}

async function getActiveTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function requestBlyricsFromTab(tab) {
  try {
    const response = await browser.tabs.sendMessage(tab.id, { action: 'getBlyrics' });
    // response expected: { html: ... , url: ... } or undefined
    return response && response.html ? response.html : null;
  } catch (e) {
    // no content script in tab or other error
    return null;
  }
}

async function refreshPreview() {
  setStatus('Fetching...');
  const tab = await getActiveTab();
  if (!tab) {
    setStatus('No active tab');
    previewEl.textContent = '—';
    return;
  }

  if (!/^https:\/\/music\.youtube\.com/.test(tab.url)) {
    setStatus('This extension runs on music.youtube.com only');
    previewEl.textContent = `Active tab: ${tab.url}`;
    return;
  }

  const html = await requestBlyricsFromTab(tab);
if (!html) {
  setStatus('No synced lyrics found.');
  previewEl.textContent = '—';
  fullHTML = null;
  return;
}

fullHTML = html; // store full html

setStatus('Extracted Lyrics — preview');

// extract lyrics 

function parseOuterHTML(html) {
  if (!html) return null;

  const doc = new DOMParser().parseFromString(html, "text/html");

  // Wrap body children in a container if multiple exist
  if (doc.body.children.length === 0) return null;
  if (doc.body.children.length === 1) return doc.body.firstElementChild;

  // If multiple top-level nodes, wrap them in a <div>
  const wrapper = document.createElement("div");
  Array.from(doc.body.children).forEach(c => wrapper.appendChild(c));
  return wrapper;
}

function extractLyricsJSON(containerEl) {
  const lines = [];

  const lineEls = containerEl.querySelectorAll(".blyrics--line");
  lineEls.forEach((lineEl) => {
    const lineWords = [];
    lineEl.querySelectorAll(".blyrics--word").forEach((wordEl) => {
      lineWords.push({
        text: wordEl.textContent,
        start: parseFloat(wordEl.dataset.time) || 0,
        duration: parseFloat(wordEl.dataset.duration) || 0,
      });
    });

    lines.push({
      lineNumber: parseInt(lineEl.dataset.lineNumber) || 0,
      start: parseFloat(lineEl.dataset.time) || 0,
      duration: parseFloat(lineEl.dataset.duration) || 0,
      words: lineWords,
    });
  });

  return lines;
}

const containerEl = parseOuterHTML(fullHTML);
const lyricsJSON = extractLyricsJSON(containerEl);

// console.log("fullHTML length:", fullHTML?.length);
// console.log(JSON.stringify(lyricsJSON, null, 2));

// download json file
// function downloadJSON(data, filename = "lyrics_full.json") {
//   const json = JSON.stringify(data, null, 2);
//   const blob = new Blob([json], { type: "application/json" });
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement("a");
//   a.href = url;
//   a.download = filename;
//   a.click();
//   URL.revokeObjectURL(url);
// }

// Usage (after you have lyricsJSON):
// downloadJSON(lyricsJSON);

/**
 * Formats JSON lyrics into a single-line Enhanced LRC string.
 * @param {Array} data - The JSON input array.
 * @returns {string} - The formatted lyric string.
 */
function formatLyrics(data) {
  // Helper to convert seconds to [mm:ss.xx]
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    const mm = mins.toString().padStart(2, '0');
    const ss = secs.toString().padStart(5, '0'); 
    return `${mm}:${ss}`;
  };

  return data.map(line => {
    // Get the starting timestamp for the line
    const lineStartTime = formatTime(line.start);
    
    // Filter out objects that are just spaces or empty strings
    const actualWords = line.words.filter(w => w.text.trim().length > 0);

    // Build the word sequence with end-time tags: Word<end_time>
    const formattedWords = actualWords.map((wordObj, index) => {
      const endTime = formatTime(wordObj.start + wordObj.duration);
      const text = wordObj.text.trim();
      
      // Add a space before the word unless it's the first word of the line
      const prefix = index === 0 ? "" : " ";
      return `${prefix}${text}<${endTime}>`;
    }).join("");

    // Return the single formatted line
    return `[${lineStartTime}]${formattedWords}`;
  }).join("\n");
}

Lyrics = formatLyrics(lyricsJSON);
// const output = formatLyrics(input);
// console.log(output);

previewEl.textContent = Lyrics

}

copyBtn.addEventListener('click', async () => {
  if (!Lyrics) {
    setStatus('Nothing to copy');
    return;
  }

  try {
    await navigator.clipboard.writeText(Lyrics);
    setStatus('FULL Lyrics copied');
  } catch {
    setStatus('Clipboard failed');
  }
});

// copy from storage 

// copyBtn.addEventListener('click', async () => {
//   const tab = await getActiveTab();
//   if (!tab) return;

//   const obj = await browser.storage.local.get(tab.url);
//   const html = obj[tab.url]?.value;

//   if (!html) {
//     setStatus('No stored value');
//     return;
//   }

//   await navigator.clipboard.writeText(html);
//   setStatus('Copied from storage (full)');
// });

refreshBtn.addEventListener('click', refreshPreview);

window.addEventListener('load', refreshPreview);


