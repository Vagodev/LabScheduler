import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Clock, FlaskConical, User, Calendar, Sun, Sunset, Loader2 } from "lucide-react";
import { toast } from "sonner";

const shiftConfig = {
  morning: { label: "Matutino", time: "08:00–12:00", icon: Sun, className: "shift-morning" },
  afternoon: { label: "Vespertino", time: "13:00–17:00", icon: Sunset, className: "shift-afternoon" },
  full_day: { label: "Dia Todo", time: "08:00–17:00", icon: Calendar, className: "shift-full_day" },
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

export default function SupervisorApprovals() {
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: pending, refetch, isLoading } = trpc.bookings.pending.useQuery();
  const approve = trpc.bookings.approve.useMutation({
    onSuccess: () => { toast.success("Agendamento aprovado com sucesso!"); refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const reject = trpc.bookings.reject.useMutation({
    onSuccess: () => { toast.success("Agendamento rejeitado."); refetch(); setRejectId(null); setRejectReason(""); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Aprovações Pendentes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {pending?.length ?? 0} agendamento{(pending?.length ?? 0) !== 1 ? "s" : ""} aguardando sua revisão
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !pending || pending.length === 0 ? (
        <Card className="card-shadow border-border/60">
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Tudo em dia!</p>
            <p className="text-xs text-muted-foreground mt-1">Não há agendamentos pendentes de aprovação.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map(({ booking, user, equip }) => {
            const shift = shiftConfig[booking.shift];
            const ShiftIcon = shift.icon;

            return (
              <Card key={booking.id} className="card-shadow border-border/60 hover:card-shadow-hover transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                      <FlaskConical className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-foreground">{equip.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{equip.category}</p>
                        </div>
                        <span className="status-pending inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0">
                          <Clock className="w-3 h-3" /> Pendente
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-foreground">{user.name}</p>
                            <p className="text-[10px] text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-foreground">
                              {(() => { const d = safeDate(booking.bookingDate); return d ? format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : String(booking.bookingDate); })()}
                            </p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${shift.className}`}>
                              {shift.label} · {shift.time}
                            </span>
                          </div>
                        </div>
                      </div>

                      {booking.purpose && (
                        <div className="mt-2 p-2.5 rounded-lg bg-muted/50 border border-border/40">
                          <p className="text-xs text-muted-foreground italic">"{booking.purpose}"</p>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Solicitado {(() => { const d = safeDate(booking.createdAt); return d ? format(d, "dd/MM/yyyy 'às' HH:mm") : "—"; })()}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => { setRejectId(booking.id); setRejectReason(""); }}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Rejeitar
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => approve.mutate({ bookingId: booking.id })}
                            disabled={approve.isPending}
                          >
                            {approve.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Aprovar</>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={rejectId !== null} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar Agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-sm font-medium">Motivo da rejeição *</Label>
            <Textarea
              placeholder="Informe o motivo da rejeição para o colaborador..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="resize-none border-border/60"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => rejectId && reject.mutate({ bookingId: rejectId, reason: rejectReason })}
              disabled={!rejectReason.trim() || reject.isPending}
            >
              {reject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
