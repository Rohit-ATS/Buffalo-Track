import { useNavigate } from "@tanstack/react-router";
import { LogOut, Settings } from "lucide-react";
import { trackDashboardClick } from "@/lib/track-dashboard-click";

export function AccountMenu() {
  const navigate = useNavigate();
  return (
    <div className="group relative">
      <button
        aria-haspopup="menu"
        aria-label="Account menu"
        className="grid size-9 place-items-center rounded-full bg-primary font-display text-primary-foreground ring-offset-2 ring-offset-background transition group-hover:ring-2 group-hover:ring-primary/40 group-focus-within:ring-2 group-focus-within:ring-primary/40"
      >
        RA
      </button>
      <div
        role="menu"
        className="invisible absolute right-0 top-full z-50 pt-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        <div className="w-48 translate-y-1 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg transition-transform group-hover:translate-y-0 group-focus-within:translate-y-0">
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs font-semibold">Research Atlas</p>
            <p className="font-sketch text-sm text-primary">demo explorer</p>
          </div>
          <button
            role="menuitem"
            onClick={() => {
              trackDashboardClick("account_menu_settings");
              navigate({ to: "/dashboard" });
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
          >
            <Settings className="size-4 text-muted-foreground" />
            Settings
          </button>
          <button
            role="menuitem"
            onClick={() => navigate({ to: "/" })}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-risk hover:bg-muted focus:bg-muted focus:outline-none"
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
