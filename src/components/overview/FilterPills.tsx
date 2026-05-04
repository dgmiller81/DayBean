import { getFilter } from "@/server/queries/filter";
import { setFilter } from "@/server/actions/prefs";
import { TAB_LABELS } from "@/lib/constants";
import type { Filter } from "@/types";

const PILLS: Array<{ value: Filter; label: string; dotClass?: string }> = [
  { value: "all",          label: "All" },
  { value: "mindfulness",  label: TAB_LABELS.mindfulness, dotClass: "sec-mindfulness" },
  { value: "business",     label: TAB_LABELS.business,    dotClass: "sec-business" },
  { value: "personal",     label: TAB_LABELS.personal,    dotClass: "sec-personal" },
];

export async function FilterPills({ userId }: { userId: string }) {
  const current = await getFilter(userId);
  return (
    <div className="filter-row" role="radiogroup" aria-label="Goals filter">
      {PILLS.map((p) => {
        const active = p.value === current;
        const action = setFilter.bind(null, { userId, filter: p.value });
        return (
          <form key={p.value} action={action} style={{ display: "contents" }}>
            <button
              type="submit"
              role="radio"
              aria-checked={active}
              className={`filter-btn${active ? " active" : ""}`}
            >
              {p.dotClass && <span className={`sec-dot ${p.dotClass}`} aria-hidden />}
              {p.label}
            </button>
          </form>
        );
      })}
    </div>
  );
}
