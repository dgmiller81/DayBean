# 05 · Journey Maps

Five canonical journeys. Each one ties brand voice to specific screen states.
These are the maps a designer should reference before designing any screen, and
a PM should hand to engineering alongside [04 · Product Requirements](04-product-requirements.md).

## 5.1 Journey 1 — First Pour (new user signup → first morning)

| # | Touchpoint | User state | DayBeans response | Voice cue |
|---|------------|------------|-------------------|-----------|
| 1 | Landing page hero | Curious. Saw a tweet, an ad, or a friend mentioned coffee rewards. | Hero headline + parallax cup; "See it in motion" or "Brew my morning". | *"Different beans. Same morning."* |
| 2 | "Brew my morning" tap | Wants to try, not commit. | Sign-up modal: Google / Apple / email. Marketing: *"No card. Free during early access."* | *"First pour's on us."* |
| 3 | Welcome email | Just signed up; phone in hand. | One email, one sentence, one button: *"Pour your first morning."* | *"Welcome. The cup's on the counter."* |
| 4 | Onboarding step 1: Name | Slightly skeptical. | *"What should we call you?"* with a single text field. | (no quip — keep it warm) |
| 5 | Onboarding step 2: Work | "Here come the questions." | *"What kind of work do you do?"* — job title, industry. With a *"skip — figure it out from my journal later"* option. | *"It's not a survey. We just don't want to feed you generic news."* |
| 6 | Onboarding step 3: Growing | Curious. | *"What are you growing into?"* — tag picker with suggestions. | *"This is the part where you put the hobbies you keep meaning to make time for."* |
| 7 | Onboarding step 4: Who's home | Tender question, handled gently. | *"Who's your morning company?"* — partner / kids / alone / etc. | (no quip; respect the question) |
| 8 | Onboarding step 5: Faith | Could be a deal-breaker. Handle with care. | *"What's your bean?"* — Christian / Jewish / Muslim / spiritual / secular / custom. | *"We won't preach. We won't argue. We carry it for those who carry it."* |
| 9 | Onboarding step 6: Theme & time | Ready to be done. | Live theme preview + "What time should we brew?" (default 4am). | *"Pick the morning you want."* |
| 10 | First page render | Slight wow expected. | Steam-wisp loader (≤3s) → personalized dashboard. **Welcome banner**: *"This is your first brew. We'll learn the rest as you journal."* | *"We're brewing your morning."* |
| 11 | First click on a Daily Grind story | Engaged. | Article opens; click tracked. | (silent UX) |
| 12 | First journal entry | Trying it on. | Entry saved; tomorrow's content will use the theme. | *"Got it. We listen — without quoting."* |

### Success metric for this journey
- 70% of sign-ups complete onboarding (≤90s median).
- 50% leave at least one journal entry on day 1.
- 40% return on day 2.

---

## 5.2 Journey 2 — Tuesday morning (returning user, daily routine)

The most important journey to get right. Daily ritual is where retention lives.

| # | Touchpoint | User state | DayBeans response | Voice cue |
|---|------------|------------|-------------------|-----------|
| 1 | 6:42am — alarm. | Tired. Scrolling reflex. | (DayBeans not yet open; phone home screen has the espresso-brown app icon — easy to spot) | *(icon)* |
| 2 | Tap app icon | Half-awake. | Splash: 1s steam wisp + DB monogram. Then dashboard. | *"Good morning."* (in Hero) |
| 3 | Reads Pour Over | Looking for grounding. | Verse + reflection that names *"feeling rushed"* (theme from yesterday's journal). | *"You wrote about rushing three times this week. Today, before you respond to anything, breathe twice."* |
| 4 | Box-breath, 60 seconds | Calmer. | Breath ring expands/contracts. | (no copy — let the breath be the copy) |
| 5 | Tap Daily Grind | Caffeine kicking in. | 4 stories curated to job + interests. Quick Scan list of 8 lines. | (silent — let the content speak) |
| 6 | Bookmarks one story | Engaged. | Hover bookmark icon → "Bookmarked." Saved to drawer. | *(no copy)* |
| 7 | Skim Slow Sip | Wakes up the heart-side of the brain. | "Marriage & family" card on top because last journal mentioned daughter. | *"You said you wanted phone-free dinners. Here's the case for boring evenings."* |
| 8 | Glances at Bean Count | Ego check. | 4 rings + heatmap. *"Today: 0 / 19. Streak: 12 days."* — no shame; the day's young. | *(silent unless streak threatened)* |
| 9 | Drawer → adds a quick journal note | Tapping while waiting for coffee. | Drawer slides in from right; journal pager visible. Types: *"Big board call at 10. Don't get defensive."* | *(no copy)* |
| 10 | Closes drawer; closes app | Day starting. | App backgrounds quietly. | *(no notification, ever)* |
| 11 | Evening — Bean Count notification | (User opted in.) Curious how the day landed. | One push, max: *"7 of 19. Goodnight."* | *(once a day, opt-in)* |

### What never happens in this journey
- No interstitials. No "rate the app." No streak guilt. No upsell.

---

## 5.3 Journey 3 — The Journal Magic Loop (the killer feature)

This is the differentiator. The journey traces how a single Tuesday-night journal
entry becomes Wednesday's curated content.

```
Tuesday 11:42 PM                              Wednesday 4:00 AM        Wednesday 6:42 AM
┌─────────────────────────┐                  ┌──────────────────┐    ┌────────────────────┐
│ JOURNAL                 │                  │ THEME EXTRACTION │    │ MORNING DASHBOARD  │
│                         │                  │                  │    │                    │
│ "I want to be present   │  ──── stored ───>│ Last 14 days,    │ ─> │ Pour Over:         │
│  in my kid's life and   │  in JournalEntry │ extract weighted │    │   Verse: Psalm     │
│  not on my phone."      │                  │ themes:          │    │   46:10 (be still) │
│                         │                  │                  │    │                    │
│ "Need to do something   │                  │  presence × 4    │    │   Reflection that  │
│  about this."           │                  │  rest × 3        │    │   names presence   │
│                         │                  │  daughter × 2    │    │                    │
└─────────────────────────┘                  │  rushing × 2     │    │ Slow Sip:          │
                                             │                  │    │   Article on phone │
                                             └──────────────────┘    │   -free dinners    │
                                                       │             │                    │
                                                       v             │ Bean Count:        │
                                             ┌──────────────────┐    │   Suggested goal:  │
                                             │ INTENT DETECTOR  │    │   "30 phone-free   │
                                             │                  │    │   dinners"         │
                                             │ Match phrases:   │    │   [accept]         │
                                             │  "I want to..."  │    │                    │
                                             │  "I keep..."     │    └────────────────────┘
                                             │                  │
                                             │ Generates draft  │
                                             │ goal             │
                                             └──────────────────┘
```

### Voice cues across the loop

| Stage | Voice cue |
|---|---|
| Journal entry | *(silent — just save it)* |
| Theme extraction | *(invisible to user)* |
| Tomorrow's reflection | *"You wrote about presence and rest this week."* |
| Suggested article | *"Picked up from last night's journal."* |
| Suggested goal | *"You said you wanted to do this. Tap to make it real."* |
| Settings → "What we heard" | *"Themes only. Themes never include your words."* |

### The privacy contract embedded in this journey

- Journal text never leaves the database.
- Theme tokens (single words / short phrases) are passed to the LLM, with a strict no-quote rule in the prompt.
- The user can mute any theme they don't want biasing content.
- Acceptance test: 100 generated reflections, no >=4-word substring matches the source journal.

---

## 5.4 Journey 4 — Bean Streak → Coffee Reward

| # | Touchpoint | User state | DayBeans response | Voice cue |
|---|------------|------------|-------------------|-----------|
| 1 | Day 6 of streak | Mildly proud. | Bean Count shows streak at 6 with bean glyph. | *(silent)* |
| 2 | Day 7 morning | Doesn't yet know about reward. | After completing first goal of day 7, top-bar badge appears: *"7 mornings. Pick a roaster on us."* | *"7 mornings. Pick a roaster on us."* |
| 3 | Tap badge | Curious. | Modal: *"Where do you usually pour?"* — 3–5 partner options + a "send code" button. Cards show partner, what's on offer (drip / 12oz / pastry combo). | *"Today's free pour, courtesy of Caribou."* |
| 4 | Picks Caribou | Confirmed. | Email sent within 1min with single-use code. App shows: *"Code in your inbox. Cup on the counter."* | *"Cup on the counter."* |
| 5 | Redeems in store | Real-world moment. | (out of app) | *(brand happens off-screen)* |
| 6 | Day 8 morning | Wonders if streak resets. | Streak continues counting; reward badge cleared until next 7-day milestone. | *"That cup was on us. Next one's on you. Until 14."* |

### Failure paths
- **Voucher ran out for the week**: *"This week's stash is dry. We restock Sunday — your streak's saved."*
- **User declines the voucher**: *"Saved for later. We'll keep an eye out."* (Voucher stored in account; redeemable for 14 days.)
- **Partnership API down**: Show generic "we'll email it shortly" with manual fulfillment fallback.

### Success metric
- 50% of users who hit 7-day streak claim the voucher.
- 30% of claimers redeem within 7 days.
- 20% of redeemers hit a 14-day streak.

---

## 5.5 Journey 5 — The First Friction (recovery from a bad morning)

This journey is about how DayBeans fails gracefully — the brand is most tested
when things go wrong.

### Scenario A — Morning generation failed (LLM provider down)

> The dual-run resilience design (see [06 · Phase A.5](06-implementation-plan.md#64-phase-a5--dual-run-resilience))
> makes this scenario almost invisible to the user.

#### A1 — Morning failed, last night's pre-brew saved us *(the common case)*

1. 5pm yesterday: pre-brew for today succeeded. `backupContentJson` is sitting on the row.
2. 4am today: morning brew failed. `contentJson` stays empty.
3. 6:42am: user opens app. Read path returns the **backup** content. UI is identical.
4. The user has **no idea anything went wrong**. Same fonts, same heatmap, same Daily Grind articles. Settings → Refresh status quietly shows *"Backup poured at 6:42am — last night's pre-brew did the work."*

**This should be the *vast* majority of failure days.** The user's morning is preserved.

#### A2 — Both runs failed *(the rare case)*

1. 5pm yesterday: pre-brew failed too (both provider regions out, network outage, etc.).
2. 4am today: morning fails again.
3. 6:42am: read path falls through to the static fixture. **Topbar badge appears**: *"Today's brew didn't drop. Yesterday's still warm."*
4. Tapping the badge opens Settings → Refresh status with a manual refresh button.
5. Manual refresh either succeeds (now the user has fresh content) or shows the same badge with the time of last attempt.
6. User can journal as normal; nothing else in the experience is degraded.

**Voice cue**: never apologize. Never "we're sorry." Just *"Yesterday's still warm."*

#### A3 — Backup was used, but it's stale (>36h)

1. User hasn't opened the app in two days. Pre-brew skipped them yesterday (they fell out of the active-7d window).
2. Morning fails today.
3. The backup on the row, if any, is now older than 36h — read path treats it as expired and falls through to fixture.
4. Same UX as A2: topbar badge, manual refresh available. On manual refresh, content resumes. On the user's next *normal* morning open, the cron will re-include them in pre-brew.

### Scenario B — User stops opening the app for 14 days

1. Day 7 since last open: a single "we miss you" email — opt-in only. *"Your beans are still here."* + a one-button link.
2. Day 14: no email. We don't chase.
3. When user returns: dashboard is fresh; no judgment. Streak counter shows the gap. *"7 mornings strong, then 14 quiet ones. Today's a new pot."*

### Scenario C — User deletes their account

1. Settings → Delete account.
2. Two-step confirmation: *"You sure?"* + *"This is permanent."*
3. On delete: 24-hour grace period during which the user can undo.
4. After 24h: full cascade delete. Confirmation email: *"Deleted. Your data is gone. Take care."*

**Voice cue**: when goodbye is happening, the voice gets simpler, not more dramatic. *"Take care."*

---

## 5.6 What every journey has in common

1. **Voice scales with intimacy.** Marketing is witty. Onboarding is warm. Daily UX is quiet. Settings/privacy is direct. Goodbye is simple.
2. **No interruption pattern is ever introduced.** No modals on top of modals. No "are you sure?" except for irreversible actions.
3. **Off-app moments are part of the brand.** The coffee voucher journey lives in the user's actual morning, not in the app. We design the brand for that.
4. **Failure is part of the journey, not a footnote.** Errors get the same care as features.
