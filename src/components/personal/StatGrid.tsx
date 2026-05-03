import { getDayOrEmpty } from "@/server/queries/days";
import { FinancialWidget } from "./FinancialWidget";
import { HealthWidget } from "./HealthWidget";
import { DisconnectWidget } from "./DisconnectWidget";
import { WinWidget } from "./WinWidget";

export async function StatGrid({ userId, iso }: { userId: string; iso: string }) {
  const day = await getDayOrEmpty(userId, iso);

  return (
    <div className="grid-4" style={{ marginBottom: 22 }}>
      <FinancialWidget userId={userId} iso={iso} initial={day.fin ?? {}} />
      <HealthWidget userId={userId} iso={iso} initial={day.health ?? {}} />
      <DisconnectWidget userId={userId} iso={iso} initial={day.disconnect ?? 0} />
      <WinWidget userId={userId} iso={iso} initial={day.win ?? ""} />
    </div>
  );
}
