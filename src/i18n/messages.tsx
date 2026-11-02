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
  meta: {
    title: string;
    description: string;
    sortTitle: string;
    marathonTitle: string;
    settingsTitle: string;
  };
  common: {
    languageLabel: string;
    loadingGame: string;
    /** Steps the record one gap toward older / newer songs. */
    earlier: string;
    later: string;
    /** Name of the swipeable line of cards. */
    lineLabel: string;
    play: string;
    pause: string;
    restart: string;
    loadingPlayer: string;
    loadingSong: string;
    cantPlay: string;
    differentSong: string;
    watch: string;
    /** Read to screen readers after links that open in a new tab. */
    newTab: string;
    startingYear: string;
    shareResult: string;
    copied: string;
    copyFailed: string;
    /** Accessible name of the place button, e.g. "Place it: Between 1992 and 1997". */
    placeIt: (label: string) => string;
    songs: (n: number) => string;
  };
  slots: SlotLabels;
  /** What the place button says: where today's song goes, as a phrase. */
  placeAt: SlotLabels;
  home: {
    headline: string;
    tagline: string;
    modesLabel: string;
    sortTag: string;
    sortDesc: string;
    marathonTag: string;
    marathonDesc: string;
    weekHeading: string;
    weekCount: (n: number) => string;
    weekDay: (day: string, played: boolean) => string;
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
    perfect: string;
    score: (hits: number, total: number) => string;
    stats: { played: string; perfect: string; streak: string; bestStreak: string };
    tomorrow: string;
    shareHead: (n: number, hits: number, total: number) => string;
  };
  settings: {
    name: string;
    songsHeading: string;
    songsIntro: string;
    kinds: Record<Locale, { name: string; desc: string }>;
    count: (n: number) => string;
    lastOne: string;
    applyNote: string;
    /** Added to share text when only one kind is on, since the puzzle differs. */
    shareTag: Record<Locale, string>;
    back: string;
  };
  marathon: {
    name: string;
    intro: (year: number) => ReactNode;
    hearts: (left: number, total: number) => string;
    score: (hits: number) => string;
    deckLabel: (n: number) => string;
    lostHeart: string;
    over: string;
    ranOut: string;
    final: (hits: number) => string;
    stats: { today: string; best: string; played: string; average: string };
    tomorrow: string;
    shareHead: (n: number, hits: number) => string;
    songsHeading: string;
    placedRight: string;
    placedWrong: string;
    openOnYouTube: (title: string) => string;
  };
};

const enSongs = (n: number) => `${n} song${n === 1 ? "" : "s"}`;

const en: Messages = {
  meta: {
    title: "Spindle — the daily music timeline game",
    description:
      "Listen to songs without seeing the titles and put them in order by release year. A new puzzle every day.",
    sortTitle: "Daily Five · Spindle",
    marathonTitle: "Marathon · Spindle",
    settingsTitle: "Settings · Spindle",
  },
  common: {
    languageLabel: "Language",
    loadingGame: "Warming up the turntable…",
    earlier: "Earlier",
    later: "Later",
    lineLabel: "Your timeline. Swipe to move the record between two songs.",
    play: "Play",
    pause: "Pause",
    restart: "↺ Restart",
    loadingPlayer: "Loading player…",
    loadingSong: "Loading song…",
    cantPlay: "This song can't be played here (YouTube blocked or removed it).",
    differentSong: "Give me a different song",
    watch: "watch",
    newTab: "(opens in a new tab)",
    startingYear: "Starting year",
    shareResult: "Share result",
    copied: "Copied!",
    copyFailed: "Couldn't copy",
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
  placeAt: {
    anywhere: "Anywhere",
    before: (y) => `Before ${y}`,
    after: (y) => `After ${y}`,
    in: (y) => `In ${y}`,
    between: (a, b) => `Between ${a} and ${b}`,
  },
  home: {
    headline: "When did this song come out?",
    tagline:
      "A daily music game. Listen to songs — no titles, no thumbnails — and place them on a timeline.",
    modesLabel: "Games",
    sortTag: "5 songs",
    sortDesc: "Place five songs on one line. Same songs for everyone.",
    marathonTag: "3 hearts",
    marathonDesc: "As many songs as you can. Three wrong and you're out.",
    weekHeading: "This week",
    weekCount: (n) => `${n} of 7 days played`,
    weekDay: (day, played) => `${day}: ${played ? "played" : "not played"}`,
    howTo: "How to play",
    rules: [
      <>
        <b className="text-white">Daily Five:</b> your line starts with a single year (say 1980).
        Listen to the first song and choose <i>before 1980</i> or <i>after 1980</i>. It joins the
        line, and the next song has one more gap to choose from. Five songs, one at a time — each
        right placement is a 🟩.
      </>,
      <>
        <b className="text-white">Marathon:</b> the same idea, without the limit. Keep placing songs
        on one growing line for as long as you can. Each wrong placement costs a ❤️ — after three,
        your score for the day is how many you got right.
      </>,
      "Songs from the same year count either way.",
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
    perfect: "Perfect! 🎉",
    score: (hits, total) => `${hits} / ${total} placed right`,
    stats: { played: "Played", perfect: "Perfect", streak: "Streak", bestStreak: "Best streak" },
    tomorrow: "New songs tomorrow.",
    shareHead: (n, hits, total) => `Spindle Daily Five #${n} ${hits}/${total}`,
  },
  settings: {
    name: "Settings",
    songsHeading: "Songs",
    songsIntro: "Choose which songs can show up in your puzzles.",
    kinds: {
      en: { name: "International songs", desc: "Hits from around the world, mostly in English" },
      he: { name: "Israeli songs", desc: "Israeli hits, mostly in Hebrew" },
    },
    count: enSongs,
    lastOne: "Keep at least one kind of song on.",
    applyNote:
      "Changes apply to puzzles you haven't started yet. With only one kind on, your daily puzzle is different from players who have both.",
    shareTag: { en: "International songs only", he: "Israeli songs only" },
    back: "Back to the games",
  },
  marathon: {
    name: "Marathon",
    intro: (year) => (
      <>
        Your line starts at <b className="text-white">{year}</b>. Place as many songs as you can —
        three wrong and the run is over.
      </>
    ),
    hearts: (left, total) => `${left} of ${total} hearts left`,
    score: (hits) => `Score: ${hits}`,
    deckLabel: (n) => `Song ${n}`,
    lostHeart: "You lost a heart.",
    over: "Out of hearts!",
    ranOut: "You placed every song we have!",
    final: (hits) => `${enSongs(hits)} placed right`,
    stats: { today: "Today", best: "Best", played: "Played", average: "Average" },
    tomorrow: "A new marathon tomorrow.",
    shareHead: (n, hits) => `Spindle Marathon #${n} · ${hits} 🎵`,
    songsHeading: "Today's songs",
    placedRight: "Placed right:",
    placedWrong: "Placed wrong:",
    openOnYouTube: (title) => `Watch “${title}” on YouTube`,
  },
};

const heSongs = (n: number) => (n === 1 ? "שיר אחד" : `${n} שירים`);

const he: Messages = {
  meta: {
    title: "Spindle — משחק ציר הזמן המוזיקלי היומי",
    description:
      "האזינו לשירים בלי לראות את השמות שלהם וסדרו אותם לפי שנת היציאה. חידה חדשה בכל יום.",
    sortTitle: "החמישייה היומית · Spindle",
    marathonTitle: "מרתון · Spindle",
    settingsTitle: "הגדרות · Spindle",
  },
  common: {
    languageLabel: "שפה",
    loadingGame: "מחממים את הפטיפון…",
    earlier: "מוקדם יותר",
    later: "מאוחר יותר",
    lineLabel: "ציר הזמן שלכם. החליקו כדי להזיז את התקליט בין שני שירים.",
    play: "נגינה",
    pause: "השהיה",
    restart: "↺ מההתחלה",
    loadingPlayer: "טוען את הנגן…",
    loadingSong: "טוען את השיר…",
    cantPlay: "אי אפשר לנגן את השיר הזה כאן (YouTube חסם או הסיר אותו).",
    differentSong: "תנו לי שיר אחר",
    watch: "לצפייה",
    newTab: "(נפתח בכרטיסייה חדשה)",
    startingYear: "שנת ההתחלה",
    shareResult: "שיתוף התוצאה",
    copied: "הועתק!",
    copyFailed: "ההעתקה נכשלה",
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
  placeAt: {
    anywhere: "בכל מקום",
    before: (y) => `לפני ${y}`,
    after: (y) => `אחרי ${y}`,
    in: (y) => `ב־${y}`,
    between: (a, b) => `בין ${a} ל־${b}`,
  },
  home: {
    headline: "מתי השיר הזה יצא?",
    tagline: "משחק מוזיקה יומי. האזינו לשירים — בלי שמות, בלי תמונות — ושבצו אותם על ציר הזמן.",
    modesLabel: "משחקים",
    sortTag: "5 שירים",
    sortDesc: "משבצים חמישה שירים על ציר אחד. אותם שירים לכולם.",
    marathonTag: "3 לבבות",
    marathonDesc: "כמה שיותר שירים. שלוש טעויות ואתם בחוץ.",
    weekHeading: "השבוע",
    weekCount: (n) => `שיחקתם ${n} מתוך 7 ימים`,
    weekDay: (day, played) => `${day}: ${played ? "שיחקתם" : "לא שיחקתם"}`,
    howTo: "איך משחקים",
    rules: [
      <>
        <b className="text-white">החמישייה היומית:</b> הציר שלכם מתחיל בשנה אחת (נגיד 1980). האזינו
        לשיר הראשון ובחרו <i>לפני 1980</i> או <i>אחרי 1980</i>. הוא מצטרף לציר, ולשיר הבא יש עוד
        רווח אחד לבחור ממנו. חמישה שירים, אחד בכל פעם — כל שיבוץ נכון הוא 🟩.
      </>,
      <>
        <b className="text-white">מרתון:</b> אותו רעיון, בלי הגבלה. ממשיכים לשבץ שירים על ציר אחד
        שהולך וגדל, כמה שאפשר. כל שיבוץ שגוי עולה ❤️ — אחרי שלוש טעויות, הניקוד היומי שלכם הוא מספר
        השירים ששיבצתם נכון.
      </>,
      "שירים מאותה שנה נחשבים נכונים בשני הצדדים.",
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
    perfect: "מושלם! 🎉",
    score: (hits, total) => `${hits} / ${total} במקום הנכון`,
    stats: { played: "משחקים", perfect: "מושלמים", streak: "רצף", bestStreak: "רצף שיא" },
    tomorrow: "שירים חדשים מחר.",
    shareHead: (n, hits, total) => `Spindle החמישייה היומית #${n} ${hits}/${total}`,
  },
  settings: {
    name: "הגדרות",
    songsHeading: "שירים",
    songsIntro: "בחרו אילו שירים יכולים להופיע בחידות שלכם.",
    kinds: {
      en: { name: "שירים בינלאומיים", desc: "להיטים מכל העולם, בעיקר באנגלית" },
      he: { name: "שירים ישראליים", desc: "להיטים ישראליים, בעיקר בעברית" },
    },
    count: heSongs,
    lastOne: "צריך להשאיר לפחות סוג אחד של שירים.",
    applyNote:
      "השינויים חלים על חידות שעוד לא התחלתם. כשרק סוג אחד מסומן, החידה היומית שלכם שונה משל שחקנים שמסמנים את שניהם.",
    shareTag: { en: "רק שירים בינלאומיים", he: "רק שירים ישראליים" },
    back: "חזרה למשחקים",
  },
  marathon: {
    name: "מרתון",
    intro: (year) => (
      <>
        הציר שלכם מתחיל ב־<b className="text-white">{year}</b>. שבצו כמה שיותר שירים — שלוש טעויות
        והמרתון נגמר.
      </>
    ),
    hearts: (left, total) => `נשארו ${left} מתוך ${total} לבבות`,
    score: (hits) => `ניקוד: ${hits}`,
    deckLabel: (n) => `שיר ${n}`,
    lostHeart: "איבדתם לב.",
    over: "נגמרו הלבבות!",
    ranOut: "שיבצתם את כל השירים שיש לנו!",
    final: (hits) => `${heSongs(hits)} במקום הנכון`,
    stats: { today: "היום", best: "שיא", played: "משחקים", average: "ממוצע" },
    tomorrow: "מרתון חדש מחר.",
    shareHead: (n, hits) => `Spindle מרתון #${n} · ${hits} 🎵`,
    songsHeading: "השירים של היום",
    placedRight: "שובץ נכון:",
    placedWrong: "שובץ לא נכון:",
    openOnYouTube: (title) => `לצפייה ב״${title}״ ב־YouTube`,
  },
};

export const MESSAGES: Record<Locale, Messages> = { en, he };
