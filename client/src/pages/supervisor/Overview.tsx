import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Search, Clock, CheckCircle2, XCircle, AlertCircle, Sun, Sunset, Calendar, Loader2 } from "lucide-react";

const statusConfig = {
  pending: { label: "Pendente", icon: Clock, className: "status-pending" },
  approved: { label: "Aprovado", icon: CheckCircle2, className: "status-approved" },
  rejected: { label: "Rejeitado", icon: XCircle, className: "status-rejected" },
  cancelled: { label: "Cancelado", icon: AlertCircle, className: "status-cancelled" },
};

const shiftConfig = {
  morning: { label: "Matutino", className: "shift-morning" },
  afternoon: { label: "Vespertino", className: "shift-afternoon" },
  full_day: { label: "Dia Todo", className: "shift-full_day" },
};

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

export default function SupervisorOverview() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEquipment, setFilterEquipment] = useState("all");
  const [search, setSearch] = useState("");

  const today = useMemo(() => new Date(), []);
  const startDate = `${today.getFullYear()}-01-01`;
  const endDate = `${today.getFullYear()}-12-31`;

  const { data: bookings, isLoading } = trpc.bookings.list.useQuery({ startDate, endDate });
  const { data: equipment } = trpc.equipment.list.useQuery();

  const filtered = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter(({ booking, equip }) => {
      const matchStatus = filterStatus === "all" || booking.status === filterStatus;
      const matchEquip = filterEquipment === "all" || booking.equipmentId === Number(filterEquipment);
      const matchSearch = !search ||
        equip.name.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchEquip && matchSearch;
    });
  }, [bookings, filterStatus, filterEquipment, search]);

  const stats = useMemo(() => {
    if (!bookings) return { total: 0, pending: 0, approved: 0, rejected: 0 };
    return {
      total: bookings.length,
      pending: bookings.filter((b) => b.booking.status === "pending").length,
      approved: bookings.filter((b) => b.booking.status === "approved").length,
      rejected: bookings.filter((b) => b.booking.status === "rejected").length,
    };
  }, [bookings]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Visão Geral dos Agendamentos</h1>
        <p className="text-muted-foreground text-sm mt-1">Todos os agendamentos do laboratório em {today.getFullYear()}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-foreground", bg: "bg-primary/8" },
          { label: "Pendentes", value: stats.pending, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Aprovados", value: stats.approved, color: "text-green-600", bg: "bg-green-50" },
          { label: "Rejeitados", value: stats.rejected, color: "text-red-500", bg: "bg-red-50" },
        ].map(({ label, value, color, bg }) => (
          <Card key={label} className="card-shadow border-border/60">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por equipamento ou usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border/60"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 bg-card border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="rejected">Rejeitados</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEquipment} onValueChange={setFilterEquipment}>
          <SelectTrigger className="w-56 bg-card border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os equipamentos</SelectItem>
            {equipment?.map((e) => (
              <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card className="card-shadow border-border/60">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipamento</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Usuário</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Turno</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                        Nenhum agendamento encontrado
                      </td>
                    </tr>
                  ) : (
                    filtered.map(({ booking, equip }) => {
                      const status = statusConfig[booking.status];
                      const shift = shiftConfig[booking.shift];
                      const StatusIcon = status.icon;
                      return (
                        <tr key={booking.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                                <FlaskConical className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground text-xs leading-tight">{equip.name}</p>
                                <p className="text-[10px] text-muted-foreground">{equip.category}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="text-xs font-medium text-foreground">ID: {booking.userId}</p>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-foreground">
                            {(() => { const d = safeDate(booking.bookingDate); return d ? format(d, "dd/MM/yyyy") : String(booking.bookingDate); })()}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${shift.className}`}>
                              {shift.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${status.className}`}>
                              <StatusIcon className="w-2.5 h-2.5" />
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
