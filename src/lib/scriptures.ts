export type Verse = { v: number; text: string };
export type Commentary = { title: string; body: string };
export type Scripture = {
  ref: string;
  theme: string;
  themes: string[];
  passage: Verse[];
  commentary: Commentary[];
};

export const SCRIPTURES: Scripture[] = [
  {
    ref: "Philippians 4:11-13",
    theme: "Contentment",
    themes: ["contentment", "content", "peace", "enough", "satisfied"],
    passage: [
      { v: 11, text: "Not that I speak in respect of want: for I have learned, in whatsoever state I am, therewith to be content." },
      { v: 12, text: "I know both how to be abased, and I know how to abound: every where and in all things I am instructed both to be full and to be hungry, both to abound and to suffer need." },
      { v: 13, text: "I can do all things through Christ which strengtheneth me." },
    ],
    commentary: [
      { title: "Contentment is learned, not given", body: "Paul says he has 'learned' to be content — even contentment is a discipline practiced in good seasons and hard ones." },
      { title: "v.13 in context", body: "This famous verse sits inside a passage about being content with little. Strength here is the strength to need less, not the strength to acquire more." },
    ],
  },
  {
    ref: "Micah 6:8",
    theme: "Humility",
    themes: ["humble", "humility", "pride", "prideful", "arrogant", "ego"],
    passage: [
      { v: 8, text: "He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?" },
    ],
    commentary: [
      { title: "Three things, in order", body: "Justice (right action), mercy (kind heart), humility (right posture) — the order is deliberate. The first two are easier when the third is in place." },
    ],
  },
  {
    ref: "Matthew 6:25-27, 33-34",
    theme: "Anxiety",
    themes: ["anxious", "anxiety", "worry", "worried", "stressed", "overwhelm", "fear", "fearful", "dread"],
    passage: [
      { v: 25, text: "Therefore I say unto you, Take no thought for your life, what ye shall eat, or what ye shall drink; nor yet for your body, what ye shall put on. Is not the life more than meat, and the body than raiment?" },
      { v: 26, text: "Behold the fowls of the air: for they sow not, neither do they reap, nor gather into barns; yet your heavenly Father feedeth them. Are ye not much better than they?" },
      { v: 27, text: "Which of you by taking thought can add one cubit unto his stature?" },
      { v: 33, text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you." },
      { v: 34, text: "Take therefore no thought for the morrow: for the morrow shall take thought for the things of itself. Sufficient unto the day is the evil thereof." },
    ],
    commentary: [
      { title: "Birds and lilies", body: "Jesus's argument is from the lesser to the greater: if creation is provided for without anxiety, how much more you?" },
      { title: "Sufficient for today", body: "Worry is borrowing trouble from a tomorrow that isn't here. Today's portion is the only portion you've been given." },
    ],
  },
  {
    ref: "1 Thessalonians 5:16-18",
    theme: "Gratitude",
    themes: ["grateful", "gratitude", "thankful", "thanks", "blessing", "bless"],
    passage: [
      { v: 16, text: "Rejoice evermore." },
      { v: 17, text: "Pray without ceasing." },
      { v: 18, text: "In every thing give thanks: for this is the will of God in Christ Jesus concerning you." },
    ],
    commentary: [
      { title: "In, not for", body: "It says 'in' every thing, not 'for' every thing. Gratitude is found alongside hard things, not in pretending they are good." },
    ],
  },
  {
    ref: "Colossians 3:12-14",
    theme: "Forgiveness",
    themes: ["forgive", "forgiveness", "grudge", "resent", "resentment", "bitter", "bitterness"],
    passage: [
      { v: 12, text: "Put on therefore, as the elect of God, holy and beloved, bowels of mercies, kindness, humbleness of mind, meekness, longsuffering;" },
      { v: 13, text: "Forbearing one another, and forgiving one another, if any man have a quarrel against any: even as Christ forgave you, so also do ye." },
      { v: 14, text: "And above all these things put on charity, which is the bond of perfectness." },
    ],
    commentary: [
      { title: "Put on", body: "The verb is active and daily. Forgiveness is something you wear — not something that happens to you." },
    ],
  },
  {
    ref: "Proverbs 3:5-6",
    theme: "Trust",
    themes: ["trust", "control", "controlling", "plan", "uncertain", "uncertainty", "doubt"],
    passage: [
      { v: 5, text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding." },
      { v: 6, text: "In all thy ways acknowledge him, and he shall direct thy paths." },
    ],
    commentary: [
      { title: "Lean not", body: "The verse is not anti-thinking. It is anti-leaning — i.e., do not put your weight where it cannot hold." },
    ],
  },
  {
    ref: "Galatians 6:9",
    theme: "Perseverance",
    themes: ["discipline", "consistent", "persevere", "quit", "give up", "tired", "weary", "burnout"],
    passage: [
      { v: 9, text: "And let us not be weary in well doing: for in due season we shall reap, if we faint not." },
    ],
    commentary: [
      { title: "Due season", body: "The harvest comes on its own clock, not yours. The work today is a deposit; the season is the withdrawal." },
    ],
  },
  {
    ref: "Ephesians 6:4",
    theme: "Fatherhood",
    themes: ["kids", "children", "dad", "father", "parent", "parenting"],
    passage: [
      { v: 4, text: "And, ye fathers, provoke not your children to wrath: but bring them up in the nurture and admonition of the Lord." },
    ],
    commentary: [
      { title: "Provoke not", body: "The first instruction to fathers is restraint. Discipline begins with the father's own self-control, not the child's." },
    ],
  },
  {
    ref: "Colossians 3:23-24",
    theme: "Work",
    themes: ["career", "work", "job", "project", "team", "leadership", "ceo", "cto"],
    passage: [
      { v: 23, text: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men;" },
      { v: 24, text: "Knowing that of the Lord ye shall receive the reward of the inheritance: for ye serve the Lord Christ." },
    ],
    commentary: [
      { title: "Heartily", body: "Wholeheartedness is the antidote to status anxiety at work. The audience changes; the work changes with it." },
    ],
  },
  {
    ref: "2 Corinthians 9:7",
    theme: "Generosity",
    themes: ["generous", "generosity", "giving", "selfless", "tithe", "share"],
    passage: [
      { v: 7, text: "Every man according as he purposeth in his heart, so let him give; not grudgingly, or of necessity: for God loveth a cheerful giver." },
    ],
    commentary: [
      { title: "Cheerful, not coerced", body: "The text rules out two distortions: giving from guilt, and giving from pressure. Cheerfulness is the test." },
    ],
  },
  {
    ref: "Psalm 23:1-4",
    theme: "Stillness",
    themes: ["still", "stillness", "rest", "quiet", "silence", "calm", "sabbath"],
    passage: [
      { v: 1, text: "The LORD is my shepherd; I shall not want." },
      { v: 2, text: "He maketh me to lie down in green pastures: he leadeth me beside the still waters." },
      { v: 3, text: "He restoreth my soul: he leadeth me in the paths of righteousness for his name's sake." },
      { v: 4, text: "Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me." },
    ],
    commentary: [
      { title: "Maketh me", body: "Sometimes rest is not chosen — it is led to. The shepherd is more insistent on stillness than the sheep." },
    ],
  },
  {
    ref: "Psalm 46:10",
    theme: "Stillness",
    themes: ["still", "stillness", "rest", "quiet", "silence", "calm", "sabbath"],
    passage: [
      { v: 10, text: "Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth." },
    ],
    commentary: [
      { title: "Stillness is knowledge", body: "The verse links being still to knowing — not to doing nothing. Quiet is how some truths arrive." },
    ],
  },
];
