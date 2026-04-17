import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  CalendarCheck,
  Clock,
  FlaskConical,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Microscope,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";

const shiftLabel = { morning: "Matutino", afternoon: "Vespertino", full_day: "Dia Todo" };

function safeDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}
const statusConfig = {
  pending: { label: "Pendente", icon: Clock, className: "status-pending" },
  approved: { label: "Aprovado", icon: CheckCircle2, className: "status-approved" },
  rejected: { label: "Rejeitado", icon: XCircle, className: "status-rejected" },
  cancelled: { label: "Cancelado", icon: AlertCircle, className: "status-cancelled" },
};

export default function Dashboard() {
  const { data: user } = trpc.auth.me.useQuery();
  const [, navigate] = useLocation();

  const today = useMemo(() => new Date(), []);
  const todayStr = today.toISOString().split("T")[0];
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-31`;

  const { data: myBookings } = trpc.bookings.myBookings.useQuery();
  const { data: pendingBookings } = trpc.bookings.pending.useQuery(undefined, {
    enabled: user?.role === "supervisor" || user?.role === "admin",
  });

  const recentBookings = myBookings?.slice(0, 5) ?? [];
  const pendingCount = pendingBookings?.length ?? 0;

  const stats = useMemo(() => {
    if (!myBookings) return { total: 0, approved: 0, pending: 0, rejected: 0 };
    return {
      total: myBookings.length,
      approved: myBookings.filter((b) => b.booking.status === "approved").length,
      pending: myBookings.filter((b) => b.booking.status === "pending").length,
      rejected: myBookings.filter((b) => b.booking.status === "rejected").length,
    };
  }, [myBookings]);

  const isSupervisor = user?.role === "supervisor" || user?.role === "admin";
  const greeting = () => {
    const h = today.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground font-medium">
          {format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        <h1 className="text-2xl font-bold text-foreground mt-1">
          {greeting()}, {user?.name?.split(" ")[0] ?? "Usuário"} 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Bem-vindo ao sistema de agendamento do laboratório.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Aprovados</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.approved}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pendentes</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.pending}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Rejeitados</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.rejected}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supervisor alert */}
      {isSupervisor && pendingCount > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 card-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">
                  {pendingCount} agendamento{pendingCount > 1 ? "s" : ""} aguardando aprovação
                </p>
                <p className="text-sm text-amber-700">Revise e aprove ou rejeite os pedidos pendentes.</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0"
              onClick={() => navigate("/supervisor/approvals")}
            >
              Revisar <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate("/calendar")}
          className="group p-5 rounded-xl border border-border/60 bg-card card-shadow hover:card-shadow-hover transition-all duration-200 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center mb-3 group-hover:bg-primary/12 transition-colors">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <p className="font-semibold text-foreground">Ver Calendário</p>
          <p className="text-sm text-muted-foreground mt-1">Visualize disponibilidade dos equipamentos</p>
        </button>

        <button
          onClick={() => navigate("/my-bookings")}
          className="group p-5 rounded-xl border border-border/60 bg-card card-shadow hover:card-shadow-hover transition-all duration-200 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center mb-3 group-hover:bg-primary/12 transition-colors">
            <CalendarCheck className="w-5 h-5 text-primary" />
          </div>
          <p className="font-semibold text-foreground">Meus Agendamentos</p>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe o status dos seus pedidos</p>
        </button>

        <button
          onClick={() => navigate("/equipment")}
          className="group p-5 rounded-xl border border-border/60 bg-card card-shadow hover:card-shadow-hover transition-all duration-200 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center mb-3 group-hover:bg-primary/12 transition-colors">
            <Microscope className="w-5 h-5 text-primary" />
          </div>
          <p className="font-semibold text-foreground">Equipamentos</p>
          <p className="text-sm text-muted-foreground mt-1">Consulte os equipamentos disponíveis</p>
        </button>
      </div>

      {/* Recent bookings */}
      <Card className="card-shadow border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Agendamentos Recentes</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/my-bookings")}>
              Ver todos <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {recentBookings.length === 0 ? (
            <div className="py-10 text-center">
              <FlaskConical className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/calendar")}>
                Criar agendamento
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentBookings.map(({ booking, equip }) => {
                const status = statusConfig[booking.status];
                const StatusIcon = status.icon;
                return (
                  <div
                    key={booking.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                      <FlaskConical className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{equip.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(() => { const d = safeDate(booking.bookingDate); return d ? format(d, "dd/MM/yyyy") : String(booking.bookingDate); })()} · {shiftLabel[booking.shift]}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
