export type Reflection = {
  title: string;
  body: string;
  practice: string;
};

export const REFLECTIONS: Reflection[] = [
  {
    title: "Begin where you are",
    body: "Today is not last year, and it is not next quarter. The version of you that wakes up has only the next hour to attend to. Most of the weight you feel is borrowed from a future that hasn't arrived — set it down for now.",
    practice: "Name three things you can see, hear, and feel — let your nervous system catch up to your morning.",
  },
  {
    title: "The work is the work",
    body: "Mastery is a series of unremarkable Tuesdays. The temptation is to look for the breakthrough; the practice is to do the next small thing well. The breakthrough, when it comes, will look an awful lot like the day before it.",
    practice: "Pick one thing you've been avoiding because it isn't impressive. Do it before noon.",
  },
  {
    title: "Less is more often the answer",
    body: "If you can't decide, the menu is too long. Cut the options in half before you re-read them. Decisions are easier when there's less to decide between, and most of the things you crossed off won't be missed.",
    practice: "List today's commitments. Cross out anything that wouldn't matter if you didn't do it.",
  },
  {
    title: "Friction tells you something",
    body: "When the same task feels heavy three days in a row, the task isn't the problem — the framing is. Friction is information about the gap between how you're doing the thing and how it actually wants to be done. Listen to it before you push through it.",
    practice: "Ask: what would make this easier? Then change one thing about the conditions, not the work.",
  },
  {
    title: "People are not problems",
    body: "When you find yourself rehearsing what someone did wrong, you're not solving anything; you're rehearsing. The story tightens with each pass and the person, in your head, becomes less of a person and more of a case. Loosen the grip.",
    practice: "Write the most generous interpretation of their behavior you can sustain.",
  },
  {
    title: "The second arrow",
    body: "Pain is the first arrow. The story you tell about the pain — that you should be over it, that it shouldn't have happened — is the second one. The second is the one that lingers, and it's the only one you have any say over.",
    practice: "Notice when you start narrating your discomfort. Let the first arrow be the only one.",
  },
  {
    title: "Walk a slower mile",
    body: "Speed eats attention. There is a pace at which you start noticing the people you live with again, and it is slower than the one your day defaults to. The walk is not in the way of your day — sometimes it IS the day.",
    practice: "Take a walk without your phone. Count the trees on your block. Yes, really.",
  },
  {
    title: "Generosity is a discipline",
    body: "The instinct to be small with your time, your money, and your praise is older than your values. Discipline is choosing the value over the instinct, in small unimpressive moments, again and again. It compounds in ways you won't see for a while.",
    practice: "Compliment someone today, specifically and without qualification.",
  },
  {
    title: "Sleep is a position",
    body: "You will not solve the hard problem at midnight. You will solve a worse version of it at 5 AM, rested, with twenty minutes of clear thought. The problem is patient enough to wait for you to be a person again.",
    practice: "Decide tonight's bedtime now, and write it where you'll see it at 9 PM.",
  },
  {
    title: "The body keeps the score",
    body: "Tension you ignore in your shoulders becomes tension in your speech, then in your decisions. The body is not separate from the meeting; it's the room the meeting takes place in. Move first, decide second.",
    practice: "Stand up. Roll your shoulders three times. Whatever you were thinking about, think about it again.",
  },
  {
    title: "Read for surprise",
    body: "The point of reading widely is to be wrong about something you thought you knew. The book that confirms what you already believe gave you a comfortable hour; the book that disrupts you gave you a year. Choose accordingly.",
    practice: "Read one essay outside your field today. Highlight the sentence that bothered you.",
  },
  {
    title: "You are not your last meeting",
    body: "An hour with the wrong energy can color the whole afternoon if you let it. The next hour doesn't know about the last one — that's a story you bring with you. You can choose not to bring it.",
    practice: "Between meetings, take 90 seconds. Stand. Breathe. Re-enter your own life.",
  },
  {
    title: "Care without urgency",
    body: "Anxious caring tells the people you love that they are responsible for your peace. Calm caring tells them they are loved. The difference is felt, not announced — they can tell which one you brought to the room.",
    practice: "Ask someone how they are — and stay quiet long enough to hear them.",
  },
  {
    title: "Smaller, sooner",
    body: "Waiting until you can do it all at once is how you don't do it at all. The first attempt is allowed to be embarrassing; that's the cost of a real first attempt. Ship the wince — it teaches you faster than the polish.",
    practice: "Ship the smallest version of the thing today, even if it makes you wince.",
  },
  {
    title: "Notice the gift",
    body: "There is at least one thing about today that, in five years, you will wish you had paid more attention to. The kid who climbed in your lap. The light at 4 PM. The friend who called for no reason. Pay it now.",
    practice: "Tonight, write one sentence about a moment you almost missed.",
  },
];

export function pickReflections(iso: string, n = 5): Reflection[] {
  const seed = Math.floor(new Date(iso + "T00:00:00").getTime() / 86_400_000);
  const out: Reflection[] = [];
  for (let i = 0; i < n; i++) {
    out.push(REFLECTIONS[(seed + i * 3) % REFLECTIONS.length]);
  }
  return out;
}
