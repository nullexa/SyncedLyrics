# SyncedLyrics

SongSync is a lightweight tool to extract word-by-word synced lyrics from YouTube Music. It converts lyrics displayed by the Better Lyrics extension (https://better-lyrics.boidu.dev/) into Enhanced LRC (ELRC) format for easy copying.

> [!NOTE]
> This extension does not fetch from an external source. It specifically extracts the data that Better Lyrics has already injected into your browser page. Then convert it to Enhanced LRC (ELRC) format

### How to use
- Open YouTube Music and start a track.
- Click on the Lyrics tab 
- Wait until Better Lyrics find and sync up the lyrics
- Then open up the SyncedLyrics popup window and copy the lyrics

> [!IMPORTANT]
> To this extension to successfully extract the lyrics, you have to wait until the 'Better Lyrics' extension fully sync up. If not, it will extract with inaccurate timestamps

### Permissions
- activeTab
- host permissions to https://music.youtube.com/*

> This extension is not signed, you have to use this as a Debug Add-on (Temporary Extension)
