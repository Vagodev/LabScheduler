import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isToday, isBefore, startOfDay } from "date-fns";
import { getBrazilianHolidays, getHolidayName } from "@/lib/holidays";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Plus, Sun, Sunset, Calendar, FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SHIFTS = [
  { value: "morning", label: "Matutino", time: "08:00 – 12:00", icon: Sun, className: "shift-morning" },
  { value: "afternoon", label: "Vespertino", time: "13:00 – 17:00", icon: Sunset, className: "shift-afternoon" },
  { value: "full_day", label: "Dia Todo", time: "08:00 – 17:00", icon: Calendar, className: "shift-full_day" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-400",
  approved: "bg-green-500",
  rejected: "bg-red-400",
  cancelled: "bg-gray-300",
};

export default function CalendarPage() {
  const { data: user } = trpc.auth.me.useQuery();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookingEquipmentId, setBookingEquipmentId] = useState<string>("");
  const [bookingShift, setBookingShift] = useState<"morning" | "afternoon" | "full_day">("morning");
  const [bookingPurpose, setBookingPurpose] = useState("");

  const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const { data: equipment } = trpc.equipment.list.useQuery();
  const { data: bookings, refetch } = trpc.bookings.calendarView.useQuery({ startDate, endDate });
  const utils = trpc.useUtils();

  const createBooking = trpc.bookings.create.useMutation({
    onSuccess: () => {
      toast.success("Agendamento solicitado com sucesso! Aguardando aprovação.");
      setIsModalOpen(false);
      setBookingPurpose("");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Sunday-first: getDay() already returns 0=Sun, 1=Mon, ..., 6=Sat
  const firstDayOfWeek = useMemo(() => {
    return getDay(startOfMonth(currentMonth));
  }, [currentMonth]);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, typeof bookings> = {};
    if (!bookings) return map;
    for (const b of bookings) {
      const dateStr = typeof b.booking.bookingDate === "string"
        ? b.booking.bookingDate
        : format(new Date(b.booking.bookingDate), "yyyy-MM-dd");
      if (!map[dateStr]) map[dateStr] = [];
      if (
        selectedEquipmentId === "all" ||
        b.booking.equipmentId === Number(selectedEquipmentId)
      ) {
        map[dateStr]!.push(b);
      }
    }
    return map;
  }, [bookings, selectedEquipmentId]);

  const selectedDateBookings = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return bookingsByDate[dateStr] ?? [];
  }, [selectedDate, bookingsByDate]);

  const isWeekend = (day: Date) => {
    const d = getDay(day);
    return d === 0 || d === 6; // 0=Sunday, 6=Saturday
  };

  // Feriados nacionais para o mês atual (e adjacentes para navegação)
  const holidaysThisYear = useMemo(() => getBrazilianHolidays(currentMonth.getFullYear()), [currentMonth]);
  const holidaysNextYear = useMemo(() => {
    const y = currentMonth.getFullYear();
    return currentMonth.getMonth() >= 11 ? getBrazilianHolidays(y + 1) : new Set<string>();
  }, [currentMonth]);
  const allHolidays = useMemo(() => new Set([...Array.from(holidaysThisYear), ...Array.from(holidaysNextYear)]), [holidaysThisYear, holidaysNextYear]);

  const isHoliday = (day: Date) => {
    const key = format(day, "yyyy-MM-dd");
    return allHolidays.has(key);
  };

  const handleDayClick = useCallback((day: Date) => {
    if (isBefore(startOfDay(day), startOfDay(new Date()))) return;
    if (isWeekend(day)) return;
    if (isHoliday(day)) return;
    setSelectedDate(day);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allHolidays]);

  const handleCreateBooking = () => {
    if (!selectedDate || !bookingEquipmentId) return;
    createBooking.mutate({
      equipmentId: Number(bookingEquipmentId),
      bookingDate: format(selectedDate, "yyyy-MM-dd"),
      shift: bookingShift,
      purpose: bookingPurpose || undefined,
    });
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendário de Agendamentos</h1>
          <p className="text-muted-foreground text-sm mt-1">Visualize e solicite agendamentos de equipamentos</p>
        </div>
        {selectedDate && (
          <Button
            onClick={() => { setBookingEquipmentId(""); setIsModalOpen(true); }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
          <SelectTrigger className="w-72 bg-card border-border/60">
            <SelectValue placeholder="Todos os equipamentos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os equipamentos</SelectItem>
            {equipment?.map((e) => (
              <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2 card-shadow border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCurrentMonth(new Date())}>
                  Hoje
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Week headers */}
            <div className="grid grid-cols-7 mb-2">
              {weekDays.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayBookings = bookingsByDate[dateStr] ?? [];
                const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
                const isWknd = isWeekend(day);
                const isHolidayDay = isHoliday(day);
                const holidayName = isHolidayDay ? getHolidayName(day) : null;
                const isDisabled = isPast || isWknd || isHolidayDay;
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const isTodayDay = isToday(day);

                return (
                  <button
                    key={dateStr}
                    onClick={() => handleDayClick(day)}
                    disabled={isDisabled}
                    title={holidayName ?? undefined}
                    className={`
                      relative p-2 rounded-lg min-h-[64px] flex flex-col items-start text-left transition-all duration-150
                      ${isWknd ? "opacity-30 cursor-not-allowed bg-muted/40" : ""}
                      ${isHolidayDay && !isWknd ? "opacity-50 cursor-not-allowed bg-orange-50 border border-orange-200/60" : ""}
                      ${isPast && !isWknd && !isHolidayDay ? "opacity-35 cursor-not-allowed" : ""}
                      ${!isDisabled ? "hover:bg-accent cursor-pointer" : ""}
                      ${isSelected ? "bg-primary/8 ring-1 ring-primary/30" : ""}
                      ${isTodayDay && !isSelected ? "bg-primary/5" : ""}
                    `}
                  >
                    <span className={`
                      text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1
                      ${isTodayDay ? "bg-primary text-primary-foreground" : isWknd ? "text-muted-foreground" : isHolidayDay ? "text-orange-500" : "text-foreground"}
                    `}>
                      {format(day, "d")}
                    </span>
                    {isHolidayDay && holidayName && (
                      <span className="text-[8px] leading-tight text-orange-500 font-medium line-clamp-2 w-full">
                        {holidayName}
                      </span>
                    )}
                    {!isHolidayDay && (
                      <div className="flex flex-wrap gap-0.5">
                        {dayBookings.slice(0, 3).map((b, i) => (
                          <span
                            key={i}
                            className={`w-2 h-2 rounded-full ${STATUS_COLORS[b.booking.status] ?? "bg-gray-300"}`}
                            title={`${b.equip.name} - ${b.booking.shift}`}
                          />
                        ))}
                        {dayBookings.length > 3 && (
                          <span className="text-[9px] text-muted-foreground">+{dayBookings.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/40">
              {[
                { color: "bg-amber-400", label: "Pendente" },
                { color: "bg-green-500", label: "Aprovado" },
                { color: "bg-red-400", label: "Rejeitado" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border/40">
                <span className="w-2.5 h-2.5 rounded-sm bg-orange-200 border border-orange-300" />
                <span className="text-xs text-muted-foreground">Feriado</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Day detail */}
        <Card className="card-shadow border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              {selectedDate
                ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })
                : "Selecione um dia"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {!selectedDate ? (
              <div className="py-8 text-center">
                <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Clique em um dia para ver os agendamentos</p>
              </div>
            ) : selectedDateBookings.length === 0 ? (
              <div className="py-8 text-center">
                <FlaskConical className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum agendamento neste dia</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => { setBookingEquipmentId(""); setIsModalOpen(true); }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agendar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateBookings.map(({ booking, equip, user: bookingUser }) => {
                  const shift = SHIFTS.find((s) => s.value === booking.shift);
                  return (
                    <div key={booking.id} className="p-3 rounded-lg border border-border/50 bg-muted/30">
                      <p className="text-sm font-semibold text-foreground truncate">{equip.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{bookingUser.name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${shift?.className}`}>
                          {shift?.label} · {shift?.time}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium status-${booking.status}`}>
                          {booking.status === "pending" ? "Pendente" :
                           booking.status === "approved" ? "Aprovado" :
                           booking.status === "rejected" ? "Rejeitado" : "Cancelado"}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => { setBookingEquipmentId(""); setIsModalOpen(true); }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Novo Agendamento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Booking Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Data</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }) : "—"}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Equipamento *</Label>
              <Select value={bookingEquipmentId} onValueChange={setBookingEquipmentId}>
                <SelectTrigger className="border-border/60">
                  <SelectValue placeholder="Selecione o equipamento" />
                </SelectTrigger>
                <SelectContent>
                  {equipment?.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Turno *</Label>
              <div className="grid grid-cols-3 gap-2">
                {SHIFTS.map((shift) => {
                  const Icon = shift.icon;
                  return (
                    <button
                      key={shift.value}
                      onClick={() => setBookingShift(shift.value)}
                      className={`
                        p-3 rounded-lg border text-left transition-all duration-150
                        ${bookingShift === shift.value
                          ? "border-primary bg-primary/8 ring-1 ring-primary/20"
                          : "border-border/60 hover:border-border hover:bg-muted/50"
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 mb-1 text-muted-foreground" />
                      <p className="text-xs font-semibold text-foreground">{shift.label}</p>
                      <p className="text-[10px] text-muted-foreground">{shift.time}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Finalidade / Observações</Label>
              <Textarea
                placeholder="Descreva brevemente o objetivo do uso..."
                value={bookingPurpose}
                onChange={(e) => setBookingPurpose(e.target.value)}
                rows={3}
                className="resize-none border-border/60"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleCreateBooking}
              disabled={!bookingEquipmentId || createBooking.isPending}
            >
              {createBooking.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Solicitar Agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
