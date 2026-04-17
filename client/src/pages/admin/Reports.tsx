import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { BarChart3, Download, FlaskConical, Loader2, Users } from "lucide-react";
import { downloadCsv } from "@/lib/exportCsv";

const COLORS = ["#1e3a5f", "#2e6da4", "#4a9fd4", "#7bbfe8", "#b0d8f0", "#d4ecf7"];

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function getDateRange(period: string, year: number) {
  const now = new Date();
  if (period === "month") {
    const m = now.getMonth() + 1;
    return {
      startDate: `${year}-${String(m).padStart(2, "0")}-01`,
      endDate: `${year}-${String(m).padStart(2, "0")}-31`,
      label: `${MONTHS[m - 1]} ${year}`,
    };
  }
  if (period === "semester1") {
    return { startDate: `${year}-01-01`, endDate: `${year}-06-30`, label: `1º Semestre ${year}` };
  }
  if (period === "semester2") {
    return { startDate: `${year}-07-01`, endDate: `${year}-12-31`, label: `2º Semestre ${year}` };
  }
  return { startDate: `${year}-01-01`, endDate: `${year}-12-31`, label: `Ano ${year}` };
}

type StatusFilter = "all" | "approved" | "cancelled";

export default function AdminReports() {
  const currentYear = new Date().getFullYear();
  const [period, setPeriod] = useState("year");
  const [year, setYear] = useState(String(currentYear));
  const [equipmentFilter, setEquipmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { startDate, endDate, label } = useMemo(
    () => getDateRange(period, Number(year)),
    [period, year]
  );

  // Load equipment list for filter selector
  const { data: equipmentList } = trpc.equipment.list.useQuery();

  const queryInput = useMemo(() => ({
    startDate,
    endDate,
    equipmentId: equipmentFilter !== "all" ? Number(equipmentFilter) : undefined,
    statusFilter: statusFilter !== "all" ? statusFilter : undefined,
  }), [startDate, endDate, equipmentFilter, statusFilter]);

  const { data: byEquipment, isLoading: loadingEquip } = trpc.reports.byEquipment.useQuery(queryInput);
  const { data: byUser, isLoading: loadingUser } = trpc.reports.byUser.useQuery(queryInput);

  const equipChartData = useMemo(() =>
    (byEquipment ?? [])
      .slice(0, 10)
      .map((e) => ({
        name: e.equipmentName.length > 20 ? e.equipmentName.slice(0, 18) + "…" : e.equipmentName,
        fullName: e.equipmentName,
        total: Number(e.total),
        approved: Number(e.approved),
        pending: Number(e.pending),
      })),
    [byEquipment]
  );

  const totalBookings = useMemo(() =>
    (byEquipment ?? []).reduce((s, e) => s + Number(e.total), 0),
    [byEquipment]
  );
  const totalApproved = useMemo(() =>
    (byEquipment ?? []).reduce((s, e) => s + Number(e.approved), 0),
    [byEquipment]
  );
  const totalPending = useMemo(() =>
    (byEquipment ?? []).reduce((s, e) => s + Number(e.pending), 0),
    [byEquipment]
  );

  const pieData = useMemo(() => {
    if (!byEquipment) return [];
    return byEquipment.slice(0, 6).map((e) => ({
      name: e.equipmentName.length > 22 ? e.equipmentName.slice(0, 20) + "…" : e.equipmentName,
      value: Number(e.total),
    }));
  }, [byEquipment]);

  const years = [currentYear, currentYear - 1, currentYear - 2].map(String);

  const handleExportEquipment = () => {
    if (!byEquipment || byEquipment.length === 0) return;
    const headers = [
      { key: "equipmentName", label: "Equipamento" },
      { key: "total", label: "Total" },
      { key: "approved", label: "Aprovados" },
      { key: "pending", label: "Pendentes" },
    ];
    const rows = byEquipment.map((e) => ({
      equipmentName: e.equipmentName,
      total: Number(e.total),
      approved: Number(e.approved),
      pending: Number(e.pending),
    }));
    downloadCsv(`relatorio_equipamentos_${label.replace(/\s+/g, "_")}.csv`, headers, rows);
  };

  const handleExportUsers = () => {
    if (!byUser || byUser.length === 0) return;
    const headers = [
      { key: "userName", label: "Usuário" },
      { key: "total", label: "Total" },
      { key: "approved", label: "Aprovados" },
      { key: "approvalRate", label: "Taxa de Aprovação (%)" },
    ];
    const rows = byUser.map((u) => {
      const total = Number(u.total);
      const approved = Number(u.approved);
      return {
        userName: u.userName ?? "—",
        total,
        approved,
        approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      };
    });
    downloadCsv(`relatorio_usuarios_${label.replace(/\s+/g, "_")}.csv`, headers, rows);
  };

  const statusLabel: Record<StatusFilter, string> = {
    all: "Todos",
    approved: "Aprovados",
    cancelled: "Cancelados",
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios de Uso</h1>
          <p className="text-muted-foreground text-sm mt-1">Análise de ocupação e utilização dos equipamentos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportEquipment}
            disabled={!byEquipment || byEquipment.length === 0}
            className="gap-2 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar por Equipamento
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportUsers}
            disabled={!byUser || byUser.length === 0}
            className="gap-2 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar por Usuário
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period */}
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44 bg-card border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Mês atual</SelectItem>
            <SelectItem value="semester1">1º Semestre</SelectItem>
            <SelectItem value="semester2">2º Semestre</SelectItem>
            <SelectItem value="year">Ano completo</SelectItem>
          </SelectContent>
        </Select>

        {/* Year */}
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28 bg-card border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Equipment filter */}
        <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
          <SelectTrigger className="w-56 bg-card border-border/60">
            <SelectValue placeholder="Equipamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os equipamentos</SelectItem>
            {(equipmentList ?? []).map((eq) => (
              <SelectItem key={eq.id} value={String(eq.id)}>{eq.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-40 bg-card border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm font-medium text-muted-foreground">
          — {label}
          {equipmentFilter !== "all" && (
            <span className="ml-1 text-primary">
              · {(equipmentList ?? []).find(e => String(e.id) === equipmentFilter)?.name}
            </span>
          )}
          {statusFilter !== "all" && (
            <span className="ml-1 text-primary">· {statusLabel[statusFilter]}</span>
          )}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total de Agendamentos", value: totalBookings, color: "text-foreground" },
          { label: "Aprovados", value: totalApproved, color: "text-green-600" },
          { label: "Pendentes", value: totalPending, color: "text-amber-600" },
          { label: "Equipamentos com Uso", value: (byEquipment ?? []).filter((e) => Number(e.total) > 0).length, color: "text-primary" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="card-shadow border-border/60">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart - by equipment */}
        <Card className="card-shadow border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" />
              Agendamentos por Equipamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEquip ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : equipChartData.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Nenhum dado disponível</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={equipChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.008 240)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip
                    labelFormatter={(l: unknown, payload: unknown[]) =>
                      (payload as { payload?: { fullName?: string } }[])?.[0]?.payload?.fullName ?? String(l)
                    }
                  />
                  <Bar dataKey="approved" fill="#16a34a" radius={[0, 3, 3, 0]} name="Aprovados" />
                  <Bar dataKey="pending" fill="#d97706" radius={[0, 3, 3, 0]} name="Pendentes" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie chart - distribution */}
        <Card className="card-shadow border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Distribuição de Uso
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEquip ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : pieData.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Nenhum dado disponível</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Equipment table */}
      <Card className="card-shadow border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            Detalhamento por Equipamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingEquip ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (byEquipment ?? []).length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Nenhum dado disponível</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipamento</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Categoria</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aprovados</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pendentes</th>
                  </tr>
                </thead>
                <tbody>
                  {(byEquipment ?? []).map((e, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{e.equipmentName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.category}</td>
                      <td className="px-4 py-3 text-center">{Number(e.total)}</td>
                      <td className="px-4 py-3 text-center text-green-600 font-medium">{Number(e.approved)}</td>
                      <td className="px-4 py-3 text-center text-amber-600">{Number(e.pending)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* By user */}
      <Card className="card-shadow border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Agendamentos por Usuário
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingUser ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (byUser ?? []).length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Nenhum dado disponível</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Usuário</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aprovados</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Taxa de Aprovação</th>
                  </tr>
                </thead>
                <tbody>
                  {(byUser ?? []).map((u, i) => {
                    const total = Number(u.total);
                    const approved = Number(u.approved);
                    const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
                    return (
                      <tr key={i} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{u.userName ?? "—"}</td>
                        <td className="px-4 py-3 text-center">{total}</td>
                        <td className="px-4 py-3 text-center text-green-600 font-medium">{approved}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
