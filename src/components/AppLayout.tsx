import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { api } from "@/services/api";
import NotificationBell from "@/components/NotificationBell";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Package,
  Factory,
  Eye,
  DollarSign,
  Paintbrush,
  ShoppingCart,
  Truck,
  Wrench,
  Warehouse,
  RefreshCw,
  User,
  Layers,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Map each nav item to the roles that can see it. Empty = visible to all.
const navItems = [
  { label: "Pulse", icon: Layers, path: "/", group: 0, roles: [] as string[] },
  { label: "Orders", icon: Package, path: "/orders", group: 0, roles: [] },
  { label: "Sales", icon: Package, path: "/sales", group: 1, roles: ["sales"] },
  { label: "Finance", icon: DollarSign, path: "/finance", group: 1, roles: ["finance"] },
  { label: "Survey", icon: Eye, path: "/survey", group: 2, roles: ["survey"] },
  { label: "Design", icon: Paintbrush, path: "/design", group: 2, roles: ["design"] },
  { label: "Procurement", icon: ShoppingCart, path: "/procurement", group: 3, roles: ["procurement"] },
  { label: "Store", icon: Warehouse, path: "/store", group: 3, roles: ["stores"] },
  { label: "Production", icon: Factory, path: "/production", group: 4, roles: ["production"] },
  { label: "Dispatch", icon: Truck, path: "/dispatch", group: 5, roles: ["dispatch"] },
  { label: "Installation", icon: Wrench, path: "/installation", group: 5, roles: ["installation"] },
  { label: "Rework", icon: RefreshCw, path: "/rework", group: 6, roles: ["rework"] },
  { label: "Settings", icon: Settings, path: "/settings", group: 7, roles: ["admin"] },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { roles: userRoles } = useUserRoles();
  const location = useLocation();
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    if (!user) return;
    api.users.getProfile().then((data) => {
      if (data?.name) setProfileName(data.name);
    }).catch(console.error);
  }, [user]);

  const isAdmin = userRoles.includes("admin");
  const isManagement = userRoles.includes("management");

  // Filter nav items based on user roles
  const visibleItems = navItems.filter((item) => {
    // Admin and management see everything
    if (isAdmin || isManagement) return true;
    // Items with no role restriction are visible to all
    if (item.roles.length === 0) return true;
    // Check if user has any of the required roles
    return item.roles.some((r) => userRoles.includes(r as any));
  });

  const initials = profileName
    ? profileName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : (user?.email?.slice(0, 2).toUpperCase() || "U");

  const renderLink = (path: string, label: string, Icon: any) => {
    const active = location.pathname === path || (path !== "/" && location.pathname.startsWith(path));
    return (
      <Link
        key={path}
        to={path}
        className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          }`}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-56 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex h-20 items-center gap-3 border-b border-sidebar-border/30 px-6 bg-gradient-to-b from-sidebar-background to-transparent">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[#F2A111] text-white shadow-sm">
            <Activity className="h-5 w-5" />
          </div>
          <div className="flex flex-col ml-1">
            <span className="font-medium text-lg tracking-tight text-white leading-none">Pulse</span>
            <span className="text-[9px] font-medium tracking-[.15em] text-white/50 mt-1 uppercase">Operations Hub</span>
          </div>
        </div>
        <nav className="flex-1 overflow-auto p-2 space-y-0.5">
          {visibleItems.map((item, i) => {
            const prevGroup = i > 0 ? visibleItems[i - 1].group : item.group;
            return (
              <div key={item.path}>
                {i > 0 && item.group !== prevGroup && (
                  <Separator className="my-1.5 bg-sidebar-border" />
                )}
                {renderLink(item.path, item.label, item.icon)}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden bg-[#fafbfc]">
        <header className="flex h-16 items-center justify-end gap-5 border-b border-slate-200/60 px-8 bg-white/70 backdrop-blur-xl shrink-0 z-20">
          <NotificationBell />
          <div className="h-6 w-px bg-slate-200 mx-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-transparent group">
                <div className="absolute -inset-1 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                <Avatar className="h-10 w-10 border-2 border-white ring-2 ring-primary/10 shadow-sm group-hover:ring-primary/30 transition-all">
                  <AvatarFallback className="bg-primary text-white text-[10px] font-black tracking-tighter shadow-inner">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2 rounded-[24px] border border-slate-200 shadow-[0_20px_48px_rgba(0,0,0,0.1)] backdrop-blur-3xl bg-white/90">
              <DropdownMenuLabel className="p-4 pt-4 pb-4">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-slate-900 tracking-tight">{profileName || "Workspace User"}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100 mx-2" />
              <div className="p-1">
                <DropdownMenuItem onClick={signOut} className="flex items-center gap-3 cursor-pointer py-2 px-4 rounded-md text-red-600 font-medium text-sm hover:bg-red-50 hover:text-red-700 transition-colors">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
