#!/usr/bin/env bash
# Creates 62 GitHub issues in dgmiller81/DayBean from the task cards in docs/daybeans/08-tasks-and-issues.md
#
# Each issue: short TL;DR + deep-link to the task card on the canonical commit.
# Labels: sprint:N, track:X, status:ready.
# Milestone: "S<N> · …" matching the sprint.
set -euo pipefail

REPO="dgmiller81/DayBean"
SHA="c736aed4cb07bcac902394edd326b5c4a40f43ab"
DOC_BASE="https://github.com/${REPO}/blob/${SHA}/docs/daybeans/08-tasks-and-issues.md"

# helper: create_issue ID "Title" track summary milestone-title
create_issue() {
  local id="$1" title="$2" track="$3" sprint="$4" summary="$5" milestone="$6"
  local body
  body=$(cat <<EOF
**TL;DR:** ${summary}

**Full task card** (OWNS / READS / DEPENDS ON / acceptance criteria) is in [\`docs/daybeans/08-tasks-and-issues.md#${id,,}\`](${DOC_BASE}#${id,,}).

**Sprint:** ${sprint} · **Track:** ${track}

**Definition of Done:** every checkbox in the task card's Acceptance section ticked, \`npx tsc --noEmit\` clean, PR reviewed, merged to \`main\`.
EOF
)
  gh issue create \
    --repo "$REPO" \
    --title "[$id] $title" \
    --body "$body" \
    --label "sprint:$sprint" \
    --label "track:$track" \
    --label "status:ready" \
    --milestone "$milestone" \
    > /dev/null
  echo "  ✓ $id  $title"
}

echo "=== Sprint 0 · Foundation ==="
M0="S0 · Foundation"
create_issue "S0-T01" "Fork the repo to DayBean and bootstrap" "infra" "0" "Fork repo, package.json rename, root README, CI workflow with tsc + prisma validate, branch protection on main." "$M0"
create_issue "S0-T02" "Consolidated Prisma migration — every column DayBean needs" "server" "0" "Single migration adding all new models + columns: JournalTheme, SuggestedGoal, Partner, Voucher, RewardClaim, plus DailyContent backup columns, RefreshLog.phase, Pref additions, Goal.category, User.role." "$M0"
create_issue "S0-T03" "Type contracts in src/types/" "server" "0" "Define every type later sprints will produce/consume. Boundary Zod schemas. Types only, no implementation." "$M0"
create_issue "S0-T04" "Brand color tokens in globals.css (foundation only)" "ui" "0" "Add --espresso, --crema*, etc. to :root and every theme block. No usage yet — just registration so S1 can apply them without conflict." "$M0"
create_issue "S0-T05" "Server-action stubs for every new feature" "server" "0" "Stub files in src/server/actions/* with typed signatures that throw \"not implemented\". Lets UI work proceed against shared contracts." "$M0"
create_issue "S0-T06" "Cron infrastructure scaffold" "infra" "0" "Tiny scheduler + /api/cron/[job] endpoint gated by X-Cron-Secret. Stub jobs morning-brew + evening-prebrew." "$M0"
create_issue "S0-T07" "Constants + BrandMark component for DayBean" "ui" "0" "APP_NAME, APP_TAGLINE, and a placeholder BrandMark SVG component. Real AI-generated logo lands later in S1-T08." "$M0"
create_issue "S0-T08" "Provider-health observability stub" "infra" "0" "src/server/observability/provider-health.ts with last24hErrorRate, regionalErrorRate, last30mErrorRate. Reads RefreshLog." "$M0"
create_issue "S0-T09" "PREBREW_POLICY config + read paths" "infra" "0" "Typed config.PREBREW_POLICY ('always'|'tiered'|'reactive'|'smart-resume'), default 'always'. Validated at startup." "$M0"

echo "=== Sprint 1 · Brand Pivot ==="
M1="S1 · Brand Pivot"
create_issue "S1-T01" "Rename product to DayBeans across UI" "ui" "1" "Topbar, Hero, layout title/meta. Use BrandMark from S0-T07." "$M1"
create_issue "S1-T02" "Tab labels → Pour Over / Daily Grind / Slow Sip / Bean Count" "ui" "1" "Update TAB_LABEL + TAB_DEFS eyebrows. Tab IDs unchanged. StickyHeader date format \"DayBeans ~ <date>\"." "$M1"
create_issue "S1-T03" "Default theme = Dawn (apply brand tokens)" "ui" "1" "Promote warm-cream palette as :root default. Existing themes unchanged." "$M1"
create_issue "S1-T04" "Voice rewrite — copy across the app" "ui" "1" "Hero greetings by hour. Refresh status: 'Today's brew didn't drop' / 'Yesterday's still warm'. Loading: 'Brewing…'." "$M1"
create_issue "S1-T05" "Cookie/session prefix migration mm_* → db_*" "server" "1" "Read either prefix, write db_*. 60-day deprecation window for mm_*." "$M1"
create_issue "S1-T06" "Tab icons — espresso flavor" "ui" "1" "Optional polish on coffee-themed icons. Bean Count gets a bean cluster glyph." "$M1"
create_issue "S1-T07" "Marketing landing — port landing-v2.html to a Next.js route" "ui" "1" "Each section as a React component under src/components/landing/*. Theme picker, animations, parity with mockup." "$M1"
create_issue "S1-T08" "Logo file integration (placeholder until AI logo lands)" "design" "1" "Drop placeholder SVG monogram + wordmark + favicon in public/logo/. Swap-in-place when real logos arrive." "$M1"

echo "=== Sprint 2 · Dual-Run Resilience ==="
M2="S2 · Dual-Run Resilience"
create_issue "S2-T01" "refreshDailyContent accepts phase parameter" "server" "2" "Phase: 'morning'|'evening-prebrew'|'cold-start'|'manual'. Branch on it: prebrew writes only backup columns, others write only primary. RefreshLog tagged." "$M2"
create_issue "S2-T02" "prebrewTomorrow(userId) helper" "server" "2" "Convenience wrapper. Idempotent: skips if already pre-brewed today for tomorrow." "$M2"
create_issue "S2-T03" "Read-path precedence in daily-content.ts" "server" "2" "Three-level fallback: primary → backup → fixture. 36-hour backup expiry. Apply dedupe at every level." "$M2"
create_issue "S2-T04" "Morning brew cron job" "server" "2" "Hourly cron: for each user where local hour == refreshHour AND no successful morning today, run refreshDailyContent." "$M2"
create_issue "S2-T05" "Evening pre-brew cron + policy gate" "server" "2" "Implements shouldPrebrewFor(user, providerHealth) policy. Default 'always'. Wired to PREBREW_POLICY config." "$M2"
create_issue "S2-T06" "Refresh status UI in Settings" "ui" "2" "Three states: healthy primary / backup served / both failed. Voice cues from §6.4." "$M2"

echo "=== Sprint 3 · Slow Sip Features ==="
M3="S3 · Slow Sip Features"
create_issue "S3-T01" "Settings — Hobbies tag picker" "ui" "3" "Tag picker UI with suggestion chips + free-text. Persists to Pref.hobbies as JSON." "$M3"
create_issue "S3-T02" "Settings — Lives-with multi-select" "ui" "3" "Chips: partner / kids / parents / roommates / alone. Persists to Pref.livesWith." "$M3"
create_issue "S3-T03" "Settings — Finance check-in toggle + numbers" "ui" "3" "Optional toggle + display-string inputs (net worth, cash, savings target). No bank integration." "$M3"
create_issue "S3-T04" "Slow Sip rotating cards component" "ui" "3" "Server component picks 3 cards based on hobbies + livesWith + finance + journal themes. Fairness rule: no repeats 3 days running." "$M3"
create_issue "S3-T05" "Goal categories (UI + persistence)" "ui" "3" "Picker for category: family / finance / hobby / fitness / faith / work / null. Persists to Goal.category." "$M3"
create_issue "S3-T06" "Personal LLM prompt extension" "server" "3" "Extend prompts.ts personal.* block with hobbies + livesWith bias and explicit rotation rules. Lands BEFORE S4-T05." "$M3"
create_issue "S3-T07" "Bean Count category-aware roll-up" "ui" "3" "Group goals by category in Bean Count. Small badge per category alongside rings." "$M3"

echo "=== Sprint 4 · The Journal Listens ==="
M4="S4 · The Journal Listens"
create_issue "S4-T01" "Theme extraction module" "server" "4" "Pure-JS lemmatizer + TF-IDF + recency decay. Returns top theme tokens with weights. Unit-tested." "$M4"
create_issue "S4-T02" "Intent detection module" "server" "4" "Regex-first detection of 'I want to…' / 'I keep…' / 'I should…' phrases. Generates draft SuggestedGoals." "$M4"
create_issue "S4-T03" "Journal-themes persistence + scheduler hook" "server" "4" "Hook into addJournalEntry/updateJournalEntry. Upsert JournalTheme rows. Insert SuggestedGoal rows for matched intents." "$M4"
create_issue "S4-T04" "Settings → Journal Themes panel" "ui" "4" "'What we heard' tab — top themes with weights + per-theme mute toggle." "$M4"
create_issue "S4-T05" "Prompt enrichment with themes + excerpts" "server" "4" "Inject top 6 unmuted themes (with weights) and abstracted excerpts into user prompt. Strengthen no-quote rule. Lands AFTER S3-T06." "$M4"
create_issue "S4-T06" "Suggested-goals UI on Bean Count" "ui" "4" "Card listing pending suggested goals with one-tap accept/dismiss. Voice cue: 'Picked up from last night's journal.'" "$M4"
create_issue "S4-T07" "Privacy-contract acceptance test" "qa" "4" "Generate 100 reflections from synthetic journal entries; assert no >=4-word substring shared with source. MUST always pass." "$M4"
create_issue "S4-T08" "Journal-themes admin observability" "server" "4" "Admin route showing aggregate theme distribution across users (anonymized)." "$M4"
create_issue "S4-T09" "Voice cue copy on the magic surfaces" "design" "4" "Brand-owner sign-off on the copy strings introduced in S4-T04, S4-T06, S4-T08." "$M4"

echo "=== Sprint 5 · Coffee Rewards ==="
M5="S5 · Coffee Rewards"
create_issue "S5-T01" "Streak detection module" "server" "5" "Given userId, returns current streak length and contributing days. Uses existing Day + Goal records." "$M5"
create_issue "S5-T02" "Voucher pool + claim server actions" "server" "5" "claimReward (idempotent, atomic), dismissReward, availablePartners. Row-level locking on voucher assignment." "$M5"
create_issue "S5-T03" "Streak reward badge in topbar" "ui" "5" "Tiny badge once user crosses 7-day milestone. Click → reward modal." "$M5"
create_issue "S5-T04" "Reward claim modal" "ui" "5" "Lists 3–5 partners with on-offer cards. Pick one → 'Code in your inbox' state." "$M5"
create_issue "S5-T05" "Voucher email template + send" "server" "5" "JSX-based template with brand voice ('Cup on the counter.'). Uses Resend. RESEND_API_KEY in .env.example." "$M5"
create_issue "S5-T06" "Admin — Partner CRUD" "ui" "5" "List, add, edit, delete partners. Set weekly voucher budget. Gated by User.role === 'admin'." "$M5"
create_issue "S5-T07" "Admin — Voucher inventory" "ui" "5" "Per-partner voucher pool view; bulk-add codes; mark redeemed; assignment history." "$M5"
create_issue "S5-T08" "Reward analytics" "server" "5" "Admin route: vouchers issued, redemption rate, geography, partner breakdown. Anonymous." "$M5"
create_issue "S5-T09" "Marketing — partner strip + giveaway block on landing" "ui" "5" "Live data from Partner table for landing's partner strip + featured roaster of the week." "$M5"

echo "=== Sprint 6 · First Pour Onboarding ==="
M6="S6 · First Pour Onboarding"
create_issue "S6-T01" "Onboarding route shell + state machine" "ui" "6" "/welcome route hosting 6-step flow. Each step persists on next-click. Skip-able. Progress indicator." "$M6"
create_issue "S6-T02" "Onboarding steps 1–3 (Name, Work, Growing)" "ui" "6" "Three step components per Epic 9. Brand voice cues from journey-map §5.1." "$M6"
create_issue "S6-T03" "Onboarding steps 4–6 (Company, Bean, Morning)" "ui" "6" "Lives-with multi-select, faith picker, theme + refresh-hour live preview." "$M6"
create_issue "S6-T04" "completeOnboarding action + warm-up generation" "server" "6" "Single transaction writes all 6 fields. One-shot LLM warm-up so Day 1 isn't generic." "$M6"
create_issue "S6-T05" "Middleware redirect for new users" "server" "6" "If signed-in but no Pref row, redirect to /welcome. Skip on /welcome/* and /api/*." "$M6"
create_issue "S6-T06" "First-Pour acceptance test" "qa" "6" "Headless test: create user, complete 6 steps in <30s, assert Pref populated, dashboard renders." "$M6"

echo "=== Sprint 7 · Launch Readiness ==="
M7="S7 · Launch Readiness"
create_issue "S7-T01" "Privacy page + content" "ui" "7" "Plain-language privacy page: storage, LLM (themes only), partners (anonymous counts), export/delete." "$M7"
create_issue "S7-T02" "Data export" "server" "7" "Email link valid 24h → JSON dump of user data. Background job, not synchronous." "$M7"
create_issue "S7-T03" "Account deletion" "server" "7" "Two-step confirmation. 24h grace period. Cascade delete after grace." "$M7"
create_issue "S7-T04" "Postgres migration (prod)" "infra" "7" "Migrate prod from SQLite to Postgres. Dev stays SQLite. Test backup/restore." "$M7"
create_issue "S7-T05" "Production deploy + monitoring" "infra" "7" "Deploy pipeline. Plausible analytics (opt-in). Sentry for errors." "$M7"
create_issue "S7-T06" "Launch QA matrix" "qa" "7" "Playwright e2e: signup→onboarding→day-1, journal→suggested-goal, streak→reward, theme switch, account delete." "$M7"
create_issue "S7-T07" "Beta tester onboarding" "qa" "7" "Recruit 25 testers across 4 personas. Unique invite codes. 14-day feedback before launch." "$M7"
create_issue "S7-T08" "Launch checklist sign-off" "qa" "7" "Walk §6.11 launch checklist. Founder approval. Ship." "$M7"

echo
echo "Done. 62 issues created."
