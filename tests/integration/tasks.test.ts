import { describe, expect, it } from "vitest";
import { makeUser } from "../factories";
import { addTask, toggleTask, deleteTask } from "@/server/actions/tasks";
import { listTasks, countOpenTasks } from "@/server/queries/tasks";

const TODAY = "2026-05-02";

describe("task actions", () => {
  it("add → list → toggle → list (sorted) → delete", async () => {
    const u = await makeUser();
    const t1 = await addTask({ userId: u, title: "Pick up bread", section: "personal" });
    await new Promise((r) => setTimeout(r, 5));
    const t2 = await addTask({ userId: u, title: "Email Dale", section: "business" });
    expect((await listTasks(u)).map((t) => t.id)).toEqual([t2.id, t1.id]);
    expect(await countOpenTasks(u)).toBe(2);

    await toggleTask({ userId: u, taskId: t1.id, iso: TODAY });
    const after = await listTasks(u);
    expect(after.map((t) => [t.id, t.done])).toEqual([[t2.id, false], [t1.id, true]]);
    expect(await countOpenTasks(u)).toBe(1);

    await deleteTask({ userId: u, taskId: t2.id });
    expect((await listTasks(u))).toHaveLength(1);
  });

  it("toggle records completedOn ISO when marking done; clears when un-done", async () => {
    const u = await makeUser();
    const t = await addTask({ userId: u, title: "x", section: "general" });
    await toggleTask({ userId: u, taskId: t.id, iso: TODAY });
    expect((await listTasks(u))[0].completedOn).toBe(TODAY);
    await toggleTask({ userId: u, taskId: t.id, iso: TODAY });
    expect((await listTasks(u))[0].completedOn).toBeNull();
  });

  it("rejects cross-user delete", async () => {
    const a = await makeUser("u_a");
    const b = await makeUser("u_b");
    const t = await addTask({ userId: a, title: "x", section: "general" });
    await expect(deleteTask({ userId: b, taskId: t.id })).rejects.toThrow(/not found/i);
  });
});
