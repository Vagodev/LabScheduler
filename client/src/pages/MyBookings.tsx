import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CalendarCheck, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, FlaskConical, Sun, Sunset, Calendar } from "lucide-react";
import { toast } from "sonner";

const statusConfig = {
  pending: { label: "Pendente", icon: Clock, className: "status-pending" },
  approved: { label: "Aprovado", icon: CheckCircle2, className: "status-approved" },
  rejected: { label: "Rejeitado", icon: XCircle, className: "status-rejected" },
  cancelled: { label: "Cancelado", icon: AlertCircle, className: "status-cancelled" },
};

const shiftConfig = {
  morning: { label: "Matutino", time: "08:00–12:00", icon: Sun, className: "shift-morning" },
  afternoon: { label: "Vespertino", time: "13:00–17:00", icon: Sunset, className: "shift-afternoon" },
  full_day: { label: "Dia Todo", time: "08:00–17:00", icon: Calendar, className: "shift-full_day" },
};

// Safely parse any date value (Date object, ISO string, or YYYY-MM-DD string)
function safeDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    // Handle YYYY-MM-DD (date-only) without timezone shift
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export default function MyBookings() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [cancelId, setCancelId] = useState<number | null>(null);

  const { data: bookings, refetch, isLoading } = trpc.bookings.myBookings.useQuery();
  const cancel = trpc.bookings.cancel.useMutation({
    onSuccess: () => { toast.success("Agendamento cancelado."); refetch(); setCancelId(null); },
    onError: (err) => toast.error(err.message),
  });

  const filtered = bookings?.filter((b) =>
    filterStatus === "all" ? true : b.booking.status === filterStatus
  ) ?? [];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meus Agendamentos</h1>
        <p className="text-muted-foreground text-sm mt-1">Acompanhe o status de todos os seus pedidos</p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48 bg-card border-border/60">
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
        <span className="text-sm text-muted-foreground">{filtered.length} agendamento{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="card-shadow border-border/60">
          <CardContent className="py-16 text-center">
            <CalendarCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum agendamento encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ booking, equip }) => {
            const status = statusConfig[booking.status];
            const shift = shiftConfig[booking.shift];
            const StatusIcon = status.icon;
            const ShiftIcon = shift.icon;
            const canCancel = booking.status === "pending" || booking.status === "approved";

            return (
              <Card key={booking.id} className="card-shadow border-border/60 hover:card-shadow-hover transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                        <FlaskConical className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{equip.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{equip.category}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-sm text-foreground font-medium">
                            {(() => { const d = safeDate(booking.bookingDate); return d ? format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : String(booking.bookingDate); })()}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${shift.className}`}>
                            <ShiftIcon className="w-3 h-3" />
                            {shift.label} · {shift.time}
                          </span>
                        </div>
                        {booking.purpose && (
                          <p className="text-xs text-muted-foreground mt-1.5 italic">"{booking.purpose}"</p>
                        )}
                        {booking.rejectionReason && (
                          <p className="text-xs text-red-600 mt-1.5">Motivo: {booking.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                      {canCancel && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground hover:text-destructive h-7"
                          onClick={() => setCancelId(booking.id)}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Solicitado em {(() => { const d = safeDate(booking.createdAt); return d ? format(d, "dd/MM/yyyy 'às' HH:mm") : "—"; })()}
                    </p>
                    {booking.approvedAt && (
                      <p className="text-xs text-muted-foreground">
                        {booking.status === "approved" ? "Aprovado" : "Rejeitado"} em{" "}{(() => { const d = safeDate(booking.approvedAt); return d ? format(d, "dd/MM/yyyy") : "—"; })()} </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={cancelId !== null} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O agendamento será marcado como cancelado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cancelId && cancel.mutate({ bookingId: cancelId })}
            >
              {cancel.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar cancelamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
