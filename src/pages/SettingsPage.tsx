import { Link, Outlet, useLocation } from "react-router-dom";
import { Settings, Users, Database, Factory, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "General", path: "/settings", icon: Settings },
  { label: "Masters", path: "/settings/masters", icon: Database },
  { label: "Users", path: "/settings/users", icon: Users },
];

export default function SettingsPage() {
  const location = useLocation();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">System configuration and management</p>
      </div>

      <div className="flex gap-2 border-b mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap",
                active
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      <Outlet />
    </div>
  );
}
