import { TasksDrawer } from "./TasksDrawer";
import { TaskList } from "@/components/tasks/TaskList";
import { AllGoalsList } from "@/components/tasks/AllGoalsList";
import { BookmarksList } from "./BookmarksList";
import { DrawerJournal } from "./DrawerJournal";
import { countOpenTasks } from "@/server/queries/tasks";
import { getLastDrawerTab } from "@/server/queries/drawer";
import { getCurrentUserId } from "@/server/auth-context";
import { listJournalEntriesForDay } from "@/server/queries/journal";
import { listBookmarks } from "@/server/queries/bookmarks";
import { todayISO } from "@/lib/dates";

export async function DrawerHost() {
  const userId = await getCurrentUserId();
  const iso = todayISO();
  const [openCount, lastTab, entries, bookmarks] = await Promise.all([
    countOpenTasks(userId),
    getLastDrawerTab(),
    listJournalEntriesForDay(userId, iso),
    listBookmarks(userId),
  ]);

  const initialEntries = entries.map((e) => ({
    id: e.id,
    content: e.content,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <TasksDrawer
      openCount={openCount}
      initialTab={lastTab}
      tasksContent={<TaskList userId={userId} />}
      goalsContent={<AllGoalsList userId={userId} />}
      bookmarksContent={<BookmarksList userId={userId} />}
      bookmarksCount={bookmarks.length}
      journalContent={<DrawerJournal userId={userId} iso={iso} initial={initialEntries} />}
    />
  );
}
