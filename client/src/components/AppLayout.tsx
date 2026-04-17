import { useLocation } from "wouter";
import {
  Calendar,
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Microscope,
  Settings,
  ShieldCheck,
  Users,
  BarChart3,
  KeyRound,
  CheckSquare,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Calendário", href: "/calendar", icon: Calendar },
  { label: "Meus Agendamentos", href: "/my-bookings", icon: CalendarCheck },
  { label: "Equipamentos", href: "/equipment", icon: Microscope },
];

const supervisorItems: NavItem[] = [
  { label: "Aprovações Pendentes", href: "/supervisor/approvals", icon: CheckSquare, roles: ["supervisor", "admin"] },
  { label: "Visão Geral", href: "/supervisor/overview", icon: Eye, roles: ["supervisor", "admin"] },
];

const adminItems: NavItem[] = [
  { label: "Usuários", href: "/admin/users", icon: Users, roles: ["admin"] },
  { label: "Equipamentos", href: "/admin/equipment", icon: FlaskConical, roles: ["admin"] },
  { label: "Controle de Acesso", href: "/admin/access", icon: KeyRound, roles: ["admin"] },
  { label: "Relatórios", href: "/admin/reports", icon: BarChart3, roles: ["admin"] },
  { label: "Configurações", href: "/admin/settings", icon: Settings, roles: ["admin"] },
];

function NavLink({ item, currentPath }: { item: NavItem; currentPath: string }) {
  const [, navigate] = useLocation();
  const isActive = currentPath === item.href;
  const Icon = item.icon;

  return (
    <button
      onClick={() => navigate(item.href)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
        "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
        isActive && "bg-sidebar-accent text-sidebar-primary font-semibold"
      )}
    >
      <Icon className={cn("w-4 h-4 shrink-0", isActive && "text-sidebar-primary")} />
      <span className="truncate">{item.label}</span>
      {isActive && <ChevronRight className="w-3 h-3 ml-auto text-sidebar-primary" />}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/35">
      {children}
    </p>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: user } = trpc.auth.me.useQuery();
  const [currentPath] = useLocation();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });

  const role = user?.role ?? "collaborator";
  const isSupervisor = role === "supervisor" || role === "admin";
  const isAdmin = role === "admin";

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const roleLabel = {
    collaborator: "Colaborador",
    supervisor: "Supervisor",
    admin: "Administrador",
  }[role] ?? "Usuário";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border">
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary/20 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-sidebar-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-sidebar-foreground leading-tight">LabScheduler</p>
            <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-wider">Laboratório</p>
          </div>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          <SectionLabel>Principal</SectionLabel>
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} currentPath={currentPath} />
          ))}

          {isSupervisor && (
            <>
              <SectionLabel>Supervisão</SectionLabel>
              {supervisorItems.map((item) => (
                <NavLink key={item.href} item={item} currentPath={currentPath} />
              ))}
            </>
          )}

          {isAdmin && (
            <>
              <SectionLabel>Administração</SectionLabel>
              {adminItems.map((item) => (
                <NavLink key={item.href} item={item} currentPath={currentPath} />
              ))}
            </>
          )}
        </nav>

        <Separator className="bg-sidebar-border" />

        {/* User Profile */}
        <div className="px-3 py-4">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors">
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.name ?? "Usuário"}
              </p>
              <p className="text-xs text-sidebar-foreground/40">{roleLabel}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => logout.mutate()}
              title="Sair"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
