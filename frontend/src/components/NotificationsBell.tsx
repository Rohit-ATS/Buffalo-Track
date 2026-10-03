import { useState } from "react";
import { Bell, Check, FileText, FlaskConical, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const initial = [
  {
    id: 1,
    icon: FlaskConical,
    title: "New evidence receipt",
    body: "STX1B ↔ STXBP1 edge upgraded to Observed.",
    time: "4m ago",
    unread: true,
  },
  {
    id: 2,
    icon: Users,
    title: "Community reply",
    body: "A family foundation joined the natural-history brief.",
    time: "1h ago",
    unread: true,
  },
  {
    id: 3,
    icon: FileText,
    title: "Brief ready for review",
    body: "Collaboration brief draft #1 awaits expert review.",
    time: "3h ago",
    unread: true,
  },
  {
    id: 4,
    icon: Check,
    title: "CACNA1A kept separate",
    body: "Opposite variant effects flagged — no edge created.",
    time: "Yesterday",
    unread: false,
  },
];

export function NotificationsBell() {
  const [items, setItems] = useState(initial);
  const unread = items.filter((i) => i.unread).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={`Notifications, ${unread} unread`}
          className="relative rounded-full"
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-risk text-[9px] font-bold text-primary-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 overflow-hidden rounded-xl p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="font-display text-lg leading-none">Notifications</p>
            <p className="mt-1 font-sketch text-sm text-primary">fresh from the atlas ↘</p>
          </div>
          <button
            onClick={() => setItems((all) => all.map((i) => ({ ...i, unread: false })))}
            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40"
            disabled={unread === 0}
          >
            Mark all read
          </button>
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {items.map(({ id, icon: Icon, title, body, time, unread: isUnread }) => (
            <li key={id}>
              <button
                onClick={() =>
                  setItems((all) => all.map((i) => (i.id === id ? { ...i, unread: false } : i)))
                }
                className={`flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted ${isUnread ? "bg-surface" : ""}`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{title}</span>
                    {isUnread && <span className="size-2 rounded-full bg-primary" />}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                    {body}
                  </span>
                  <span className="mt-1 block text-[10px] text-muted-foreground">{time}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="px-4 py-2 text-center text-[10px] text-muted-foreground">
          Demo notifications · research navigation, not medical advice
        </p>
      </PopoverContent>
    </Popover>
  );
}
