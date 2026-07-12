import { ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { WebsiteHeader } from "@/components/website/WebsiteHeader";
import { cn } from "@/lib/utils";
import { Lightbulb, LifeBuoy, Rocket, BookOpen } from "lucide-react";

const tabs = [
  { to: "/support/ideas", label: "Ideas", icon: Lightbulb },
  { to: "/support/tickets", label: "Tickets", icon: LifeBuoy },
  { to: "/support/releases", label: "Releases", icon: Rocket },
  { to: "/support/help", label: "Help Center", icon: BookOpen },
];

export function SupportShell({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      <WebsiteHeader />
      <div className="border-b border-border/50 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((t) => {
              const active = pathname.startsWith(t.to);
              const Icon = t.icon;
              return (
                <NavLink
                  key={t.to}
                  to={t.to}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                    active
                      ? "border-accent-gold text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
      <main className="flex-1 container mx-auto px-4 py-6">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}

export default function SupportLayout() {
  // Auth gating temporarily disabled — will be re-enabled later.
  return <SupportShell />;
}