import type { ReactNode } from "react";
import type { SlotLabels } from "@/lib/timeline";
import type { Locale } from "./config";

/**
 * All UI text, per language. Values can be strings, functions (for numbers and
 * names), or small bits of JSX where a sentence has bold/italic parts.
 *
 * Song titles and artists come from `songs.json` and are not translated. Wrap them in
 * <bdi> when they appear inside a sentence so they don't scramble right-to-left text.
 */
export type Messages = {
  langName: string;
  meta: { title: string; description: string; sortTitle: string; timelineTitle: string };
  common: {
    languageLabel: string;
    loadingGame: string;
    oldest: string;
    newest: string;
    play: string;
    pause: string;
    restart: string;
    loadingPlayer: string;
    loadingSong: string;
    cantPlay: string;
    differentSong: string;
    watch: string;
    startingYear: string;
    shareResult: string;
    copied: string;
    copyFailed: string;
    addSlot: (label: string) => string;
    songGoesHere: (label: string) => string;
    placeIt: (label: string) => string;
    songs: (n: number) => string;
  };
  slots: SlotLabels;
  home: {
    tagline: string;
    sortDesc: string;
    timelineDesc: string;
    playCta: string;
    howTo: string;
    rules: ReactNode[];
    footer: string;
    github: string;
  };
  sort: {
    name: string;
    intro: (year: number) => ReactNode;
    progress: (n: number, total: number) => string;
    deckLabel: (n: number, total: number) => string;
    correct: string;
    wrong: string;
    reveal: (title: string, artist: string, year: number) => ReactNode;
    movedHere: string;
    pickSpot: string;
    perfect: string;
    score: (hits: number, total: number) => string;
    stats: { played: string; perfect: string; streak: string; bestStreak: string };
    tomorrow: string;
    shareHead: (n: number, hits: number, total: number) => string;
  };
  timeline: {
    name: string;
    noSong: string;
    introFirst: (year: number) => string;
    introPending: string;
    introDone: string;
    dayLine: (day: number, best: number) => string;
    today: string;
    belongsHere: string;
    pickSpot: string;
    nailed: string;
    notQuite: string;
    correctMsg: (songs: number) => string;
    wrongMsg: (title: string, year: number, songs: number) => ReactNode;
    stats: { songs: string; best: string; runs: string; day: string };
    shareHead: (n: number) => string;
    shareEnded: (songs: number) => string;
    shareAlive: (songs: number) => string;
  };
};

const enSongs = (n: number) => `${n} song${n === 1 ? "" : "s"}`;

const en: Messages = {
  langName: "English",
  meta: {
    title: "Spindle — the daily music timeline game",
    description:
      "Listen to songs without seeing the titles and put them in order by release year. A new puzzle every day.",
    sortTitle: "Daily Five · Spindle",
    timelineTitle: "Daily Timeline · Spindle",
  },
  common: {
    languageLabel: "Language",
    loadingGame: "Warming up the turntable…",
    oldest: "▲ Oldest",
    newest: "▼ Newest",
    play: "Play",
    pause: "Pause",
    restart: "↺ Restart",
    loadingPlayer: "Loading player…",
    loadingSong: "Loading song…",
    cantPlay: "This song can't be played here (YouTube blocked or removed it).",
    differentSong: "Give me a different song",
    watch: "watch",
    startingYear: "Starting year",
    shareResult: "Share result",
    copied: "Copied!",
    copyFailed: "Couldn't copy",
    addSlot: (l) => `+ ${l}`,
    songGoesHere: (l) => `🎵 Song goes here · ${l}`,
    placeIt: (l) => `Place it: ${l}`,
    songs: enSongs,
  },
  slots: {
    anywhere: "Anywhere",
    before: (y) => `Before ${y}`,
    after: (y) => `After ${y}`,
    in: (y) => `In ${y}`,
    between: (a, b) => `${a} – ${b}`,
  },
  home: {
    tagline:
      "A daily music game. Listen to songs — no titles, no thumbnails — and figure out when they came out.",
    sortDesc:
      "Start from one year, then place five songs on the line, one at a time. Same songs for everyone.",
    timelineDesc:
      "One song a day. Slot it into your growing timeline. Every day you keep it alive, it gets harder.",
    playCta: "Play →",
    howTo: "How to play",
    rules: [
      <>
        <b className="text-white">Daily Five:</b> your line starts with a single year (say 1980).
        Listen to the first song and choose <i>before 1980</i> or <i>after 1980</i>. It joins the
        line, and the next song has one more gap to choose from. Five songs, one at a time — each
        right placement is a 🟩.
      </>,
      <>
        <b className="text-white">Daily Timeline:</b> a new timeline starts with a free year (say,
        1997). Day 1: is the song <i>before 1997</i> or <i>after 1997</i>? Get it right and it
        joins your timeline — day 2 might be <i>before 1997</i>, <i>1997–2000</i> or{" "}
        <i>after 2000</i>, and so on.
      </>,
      "A wrong guess — or a missed day — ends your timeline and a new one starts. Songs from the same year count either way.",
      "Everything is saved in your browser. A new day starts at your local midnight.",
    ],
    footer: "Songs play straight from YouTube; Spindle hosts no audio.",
    github: "Open source on GitHub",
  },
  sort: {
    name: "Daily Five",
    intro: (year) => (
      <>
        Your line starts at <b className="text-white">{year}</b>. Listen to each song and drop it
        before or after the cards you already have — one song at a time.
      </>
    ),
    progress: (n, total) => `Song ${n} of ${total}`,
    deckLabel: (n, total) => `Song ${n} of ${total}`,
    correct: "✅ Correct!",
    wrong: "❌ Not quite.",
    reveal: (title, artist, year) => (
      <>
        “<bdi>{title}</bdi>” by <bdi>{artist}</bdi> is from <b>{year}</b>.
      </>
    ),
    movedHere: "moved here",
    pickSpot: "Pick a spot on the line",
    perfect: "Perfect! 🎉",
    score: (hits, total) => `${hits} / ${total} placed right`,
    stats: { played: "Played", perfect: "Perfect", streak: "Streak", bestStreak: "Best streak" },
    tomorrow: "New songs tomorrow.",
    shareHead: (n, hits, total) => `Spindle Daily Five #${n} ${hits}/${total}`,
  },
  timeline: {
    name: "Daily Timeline",
    noSong: "No song available today.",
    introFirst: (year) =>
      `Day 1 of a new timeline, starting at ${year}. Is today's song from before or after?`,
    introPending: "Listen to today's song and drop it where it belongs on your timeline.",
    introDone: "Come back tomorrow for your next song.",
    dayLine: (day, best) => `Timeline day ${day} · Best ${best}`,
    today: "Today",
    belongsHere: "belongs here",
    pickSpot: "Pick a spot on the timeline",
    nailed: "Nailed it! ✅",
    notQuite: "Not quite ❌",
    correctMsg: (songs) =>
      `Your timeline now has ${enSongs(songs)}. Each day adds a gap and gets harder — don't miss a day!`,
    wrongMsg: (title, year, songs) => (
      <>
        “<bdi>{title}</bdi>” came out in {year}. Your timeline ended at {enSongs(songs)}. A fresh
        one starts tomorrow.
      </>
    ),
    stats: { songs: "Songs", best: "Best", runs: "Runs", day: "Day" },
    shareHead: (n) => `Spindle Timeline #${n}`,
    shareEnded: (songs) => `❌ Timeline ended at ${enSongs(songs)}`,
    shareAlive: (songs) => `🔥 ${enSongs(songs)} and counting`,
  },
};

const heSongs = (n: number) => (n === 1 ? "שיר אחד" : `${n} שירים`);

const he: Messages = {
  langName: "עברית",
  meta: {
    title: "Spindle — משחק ציר הזמן המוזיקלי היומי",
    description:
      "האזינו לשירים בלי לראות את השמות שלהם וסדרו אותם לפי שנת היציאה. חידה חדשה בכל יום.",
    sortTitle: "החמישייה היומית · Spindle",
    timelineTitle: "ציר הזמן היומי · Spindle",
  },
  common: {
    languageLabel: "שפה",
    loadingGame: "מחממים את הפטיפון…",
    oldest: "▲ הכי ישן",
    newest: "▼ הכי חדש",
    play: "נגינה",
    pause: "השהיה",
    restart: "↺ מההתחלה",
    loadingPlayer: "טוען את הנגן…",
    loadingSong: "טוען את השיר…",
    cantPlay: "אי אפשר לנגן את השיר הזה כאן (YouTube חסם או הסיר אותו).",
    differentSong: "תנו לי שיר אחר",
    watch: "לצפייה",
    startingYear: "שנת ההתחלה",
    shareResult: "שיתוף התוצאה",
    copied: "הועתק!",
    copyFailed: "ההעתקה נכשלה",
    addSlot: (l) => `+ ${l}`,
    songGoesHere: (l) => `🎵 השיר נכנס כאן · ${l}`,
    placeIt: (l) => `לשבץ: ${l}`,
    songs: heSongs,
  },
  slots: {
    anywhere: "בכל מקום",
    before: (y) => `לפני ${y}`,
    after: (y) => `אחרי ${y}`,
    in: (y) => `ב־${y}`,
    between: (a, b) => `${a} – ${b}`,
  },
  home: {
    tagline:
      "משחק מוזיקה יומי. האזינו לשירים — בלי שמות, בלי תמונות — ונחשו מתי הם יצאו.",
    sortDesc:
      "מתחילים משנה אחת, ואז משבצים חמישה שירים על הציר, אחד אחרי השני. אותם שירים לכולם.",
    timelineDesc:
      "שיר אחד ביום. שבצו אותו בציר הזמן שלכם, שהולך וגדל. כל יום שהוא שורד, זה נהיה קשה יותר.",
    playCta: "לשחק ←",
    howTo: "איך משחקים",
    rules: [
      <>
        <b className="text-white">החמישייה היומית:</b> הציר שלכם מתחיל בשנה אחת (נגיד 1980).
        האזינו לשיר הראשון ובחרו <i>לפני 1980</i> או <i>אחרי 1980</i>. הוא מצטרף לציר, ולשיר הבא
        יש עוד רווח אחד לבחור ממנו. חמישה שירים, אחד בכל פעם — כל שיבוץ נכון הוא 🟩.
      </>,
      <>
        <b className="text-white">ציר הזמן היומי:</b> ציר זמן חדש מתחיל בשנה חינמית (נגיד 1997).
        ביום הראשון: השיר יצא <i>לפני 1997</i> או <i>אחרי 1997</i>? צדקתם — והוא מצטרף לציר
        שלכם. ביום השני האפשרויות יכולות להיות <i>לפני 1997</i>, <i>1997–2000</i> או{" "}
        <i>אחרי 2000</i>, וכן הלאה.
      </>,
      "ניחוש שגוי — או יום שפספסתם — מסיים את ציר הזמן, ומתחיל ציר חדש. שירים מאותה שנה נחשבים נכונים בשני הצדדים.",
      "הכול נשמר בדפדפן שלכם. יום חדש מתחיל בחצות לפי השעה המקומית שלכם.",
    ],
    // \u200f (RLM) keeps the semicolon on the Hebrew side of "YouTube".
    footer: "השירים מתנגנים ישירות מ־YouTube\u200f; ל־Spindle אין שום אודיו משלה.",
    github: "קוד פתוח ב־GitHub",
  },
  sort: {
    name: "החמישייה היומית",
    intro: (year) => (
      <>
        הציר שלכם מתחיל ב־<b className="text-white">{year}</b>. האזינו לכל שיר ושבצו אותו לפני או
        אחרי הקלפים שכבר יש לכם — שיר אחד בכל פעם.
      </>
    ),
    progress: (n, total) => `שיר ${n} מתוך ${total}`,
    deckLabel: (n, total) => `שיר ${n} מתוך ${total}`,
    correct: "✅ נכון!",
    wrong: "❌ לא בדיוק.",
    reveal: (title, artist, year) => (
      <>
        ״<bdi>{title}</bdi>״ של <bdi>{artist}</bdi> יצא ב־<b>{year}</b>.
      </>
    ),
    movedHere: "הועבר לכאן",
    pickSpot: "בחרו מקום על הציר",
    perfect: "מושלם! 🎉",
    score: (hits, total) => `${hits} / ${total} במקום הנכון`,
    stats: { played: "משחקים", perfect: "מושלמים", streak: "רצף", bestStreak: "רצף שיא" },
    tomorrow: "שירים חדשים מחר.",
    shareHead: (n, hits, total) => `Spindle החמישייה היומית #${n} ${hits}/${total}`,
  },
  timeline: {
    name: "ציר הזמן היומי",
    noSong: "אין שיר זמין היום.",
    introFirst: (year) => `יום 1 בציר זמן חדש, שמתחיל ב־${year}. השיר של היום יצא לפני או אחרי?`,
    introPending: "האזינו לשיר של היום ושבצו אותו במקום הנכון בציר הזמן שלכם.",
    introDone: "חזרו מחר לשיר הבא.",
    dayLine: (day, best) => `יום ${day} בציר · שיא ${best}`,
    today: "היום",
    belongsHere: "המקום שלו כאן",
    pickSpot: "בחרו מקום על ציר הזמן",
    nailed: "בול! ✅",
    notQuite: "לא בדיוק ❌",
    correctMsg: (songs) =>
      `בציר הזמן שלכם יש עכשיו ${heSongs(songs)}. כל יום מוסיף רווח ונהיה קשה יותר — אל תפספסו יום!`,
    wrongMsg: (title, year, songs) => (
      <>
        ״<bdi>{title}</bdi>״ יצא ב־{year}. ציר הזמן שלכם נגמר אחרי {heSongs(songs)}. ציר חדש
        מתחיל מחר.
      </>
    ),
    stats: { songs: "שירים", best: "שיא", runs: "סבבים", day: "יום" },
    shareHead: (n) => `Spindle ציר הזמן #${n}`,
    shareEnded: (songs) => `❌ ציר הזמן נגמר אחרי ${heSongs(songs)}`,
    shareAlive: (songs) => `🔥 ${heSongs(songs)} וממשיכים`,
  },
};

export const MESSAGES: Record<Locale, Messages> = { en, he };
