import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  createTask,
  deleteTask,
  getMyProfile,
  getMyTasks,
  updateTask,
} from "@/lib/tasks.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TaskFlow" },
      {
        name: "description",
        content: "Your TaskFlow board: task statistics, filters, and your full task list.",
      },
    ],
  }),
  component: Dashboard,
});

type Task = Tables<"tasks">;
type Priority = "low" | "medium" | "high";
type Status = "todo" | "in_progress" | "completed";

const STATUS_LABEL: Record<Status, string> = {
  todo: "To do",
  in_progress: "In progress",
  completed: "Completed",
};

const NEXT_STATUS: Record<Status, Status> = {
  todo: "in_progress",
  in_progress: "completed",
  completed: "todo",
};

function priorityBadgeClass(p: Priority) {
  if (p === "high") return "bg-destructive/10 text-destructive";
  if (p === "medium") return "bg-accent/10 text-accent";
  return "bg-foreground/5 text-muted-foreground";
}

function statusBadgeClass(s: Status) {
  if (s === "completed") return "bg-primary/10 text-primary";
  if (s === "in_progress") return "bg-primary/10 text-primary";
  return "bg-warn/10 text-warn";
}

function isOverdue(task: Task) {
  return !!task.due_date && task.status !== "completed" && task.due_date < todayStr();
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDue(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchTasks = useServerFn(getMyTasks);
  const fetchProfile = useServerFn(getMyProfile);
  const createTaskFn = useServerFn(createTask);
  const updateTaskFn = useServerFn(updateTask);
  const deleteTaskFn = useServerFn(deleteTask);

  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => fetchTasks() });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [editing, setEditing] = useState<Task | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [newDue, setNewDue] = useState("");

  const stats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const overdue = tasks.filter(isOverdue).length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, todo, inProgress, completed, overdue, pct };
  }, [tasks]);

  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (statusFilter === "all" || t.status === statusFilter) &&
          (priorityFilter === "all" || t.priority === priorityFilter),
      ),
    [tasks, statusFilter, priorityFilter],
  );

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await createTaskFn({
        data: {
          title: newTitle.trim(),
          description: "",
          priority: newPriority,
          status: "todo",
          due_date: newDue || null,
        },
      });
      setNewTitle("");
      setNewDue("");
      setNewPriority("medium");
      await refresh();
      toast.success("Task added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add task");
    }
  }

  async function handleCycleStatus(task: Task) {
    try {
      await updateTaskFn({ data: { id: task.id, status: NEXT_STATUS[task.status as Status] } });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update task");
    }
  }

  async function handleDelete(task: Task) {
    try {
      await deleteTaskFn({ data: { id: task.id } });
      await refresh();
      toast.success("Task deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete task");
    }
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const displayName = profile?.display_name || "there";
  const inFlight = stats.todo + stats.inProgress;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -top-48 -left-44 h-[560px] w-[560px] rounded-full bg-primary/20 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-56 -right-40 h-[520px] w-[520px] rounded-full bg-accent/15 blur-[130px]" />
      <div className="pointer-events-none absolute top-1/3 right-1/3 h-72 w-72 rounded-full bg-primary/10 blur-[110px]" />

      <div className="relative mx-auto max-w-[1440px] px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <span className="font-display text-lg font-bold text-primary">T</span>
            </div>
            <div className="leading-tight">
              <div className="font-display text-xl font-semibold tracking-tight">TaskFlow</div>
              <div className="text-xs text-muted-foreground">DevOps project board</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass-pill hidden items-center gap-2 rounded-full px-4 py-2 text-sm sm:flex">
              <span className="size-1.5 rounded-full bg-primary" />
              {inFlight} task{inFlight === 1 ? "" : "s"} in flight
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background ring-1 ring-border transition-colors hover:bg-foreground/90"
            >
              Sign out
            </button>
            <div className="grid size-9 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary ring-1 ring-primary/20">
              {initials(displayName)}
            </div>
          </div>
        </header>

        <section className="mt-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-balance">
            Hey {displayName} — here's your board.
          </h1>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total" value={stats.total} sub="all tasks" delay={0} />
          <StatCard label="To do" value={stats.todo} sub="queued for pickup" delay={50} />
          <StatCard
            label="In progress"
            value={stats.inProgress}
            sub="actively worked"
            delay={100}
          />
          <StatCard
            label="Completed"
            value={stats.completed}
            sub={`${stats.pct}% done`}
            delay={150}
          />
          <StatCard
            label="Overdue"
            value={stats.overdue}
            sub="need attention"
            delay={200}
            danger={stats.overdue > 0}
          />
          <div className="glass-card animate-rise p-5" style={{ animationDelay: "250ms" }}>
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Completion
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-3xl font-bold tracking-tight">{stats.pct}</span>
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-mist-3">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${stats.pct}%` }}
              />
            </div>
          </div>
        </section>

        <section className="mt-4 flex flex-wrap items-center gap-3">
          <div className="glass-pill flex items-center gap-2 rounded-xl px-3 py-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | Status)}
              className="cursor-pointer bg-transparent text-sm font-medium text-foreground outline-none"
            >
              <option value="all">All statuses</option>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="glass-pill flex items-center gap-2 rounded-xl px-3 py-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Priority
            </span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as "all" | Priority)}
              className="cursor-pointer bg-transparent text-sm font-medium text-foreground outline-none"
            >
              <option value="all">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">
            Showing {filtered.length} of {tasks.length}
          </div>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {filtered.length === 0 && (
            <div className="glass-card col-span-full p-8 text-center text-sm text-muted-foreground">
              {tasks.length === 0
                ? "No tasks yet — add your first one below."
                : "No tasks match these filters."}
            </div>
          )}
          {filtered.map((task, i) => {
            const overdue = isOverdue(task);
            return (
              <div
                key={task.id}
                className="glass-card animate-rise p-5"
                style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${priorityBadgeClass(task.priority as Priority)}`}
                    >
                      {task.priority}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                        overdue
                          ? "bg-destructive/10 text-destructive"
                          : statusBadgeClass(task.status as Status)
                      }`}
                    >
                      {overdue ? "Overdue" : STATUS_LABEL[task.status as Status]}
                    </span>
                  </div>
                  {task.due_date && (
                    <span
                      className={`text-xs font-medium ${overdue ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      Due {formatDue(task.due_date)}
                    </span>
                  )}
                </div>
                <h3
                  className={`mt-3 text-base font-semibold leading-tight text-balance ${
                    task.status === "completed" ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {task.title}
                </h3>
                {task.description && (
                  <p className="mt-1 text-sm leading-relaxed text-pretty text-muted-foreground">
                    {task.description}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <button
                    onClick={() => handleCycleStatus(task)}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground ring-1 ring-primary/30 transition-colors hover:bg-primary/90"
                  >
                    {task.status === "completed"
                      ? "Reopen"
                      : `Mark ${STATUS_LABEL[NEXT_STATUS[task.status as Status]].toLowerCase()}`}
                  </button>
                  <button
                    onClick={() => setEditing(task)}
                    className="rounded-lg bg-card px-3 py-1.5 text-sm font-medium text-foreground/70 ring-1 ring-border transition-colors hover:bg-secondary"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(task)}
                    className="rounded-lg bg-card px-3 py-1.5 text-sm font-medium text-destructive ring-1 ring-border transition-colors hover:bg-destructive/5"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        <section className="glass-card mt-4 p-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Add a task
          </div>
          <form
            onSubmit={handleAdd}
            className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto_auto]"
          >
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task title"
              className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary/40"
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Priority)}
              className="cursor-pointer rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground ring-1 ring-border outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              type="date"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
              className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground ring-1 ring-border outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-1 ring-primary/30 transition-colors hover:bg-primary/90"
            >
              Add task
            </button>
          </form>
        </section>
      </div>

      {editing && (
        <EditDialog
          task={editing}
          onClose={() => setEditing(null)}
          onSave={async (fields) => {
            try {
              await updateTaskFn({ data: { id: editing.id, ...fields } });
              setEditing(null);
              await refresh();
              toast.success("Task updated");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not update task");
            }
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  delay,
  danger,
}: {
  label: string;
  value: number;
  sub: string;
  delay: number;
  danger?: boolean;
}) {
  return (
    <div className="glass-card animate-rise p-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 font-display text-3xl font-bold tracking-tight ${danger ? "text-destructive" : ""}`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function EditDialog({
  task,
  onClose,
  onSave,
}: {
  task: Task;
  onClose: () => void;
  onSave: (fields: {
    title: string;
    description: string;
    priority: Priority;
    status: Status;
    due_date: string | null;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState<Priority>(task.priority as Priority);
  const [status, setStatus] = useState<Status>(task.status as Status);
  const [due, setDue] = useState(task.due_date ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      due_date: due || null,
    });
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="glass-card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-semibold tracking-tight">Edit task</h2>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground ring-1 ring-border outline-none focus:ring-2 focus:ring-primary/40"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
            className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary/40"
          />
          <div className="grid grid-cols-3 gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="cursor-pointer rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground ring-1 ring-border outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="cursor-pointer rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground ring-1 ring-border outline-none"
            >
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground ring-1 ring-border outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-card px-4 py-2 text-sm font-medium text-foreground/70 ring-1 ring-border transition-colors hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-1 ring-primary/30 transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
