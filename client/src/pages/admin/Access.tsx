import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FlaskConical, KeyRound, Loader2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

export default function AdminAccess() {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>("");

  const { data: equipment } = trpc.equipment.list.useQuery({ includeInactive: true });
  const { data: users } = trpc.users.list.useQuery();
  const { data: accessList, refetch, isLoading: loadingAccess } = trpc.equipment.getAccessList.useQuery(
    { equipmentId: Number(selectedEquipmentId) },
    { enabled: !!selectedEquipmentId }
  );
  const setAccess = trpc.equipment.setAccess.useMutation({
    onSuccess: () => { toast.success("Permissão atualizada!"); refetch(); },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const selectedEquip = equipment?.find((e) => e.id === Number(selectedEquipmentId));
  const accessUserIds = new Set((accessList ?? []).map((a) => a.access.userId));

  const handleToggle = (userId: number, hasAccess: boolean) => {
    if (!selectedEquipmentId) return;
    setAccess.mutate({
      equipmentId: Number(selectedEquipmentId),
      userId,
      canBook: !hasAccess,
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Controle de Acesso</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure quais usuários podem agendar cada equipamento restrito
        </p>
      </div>

      {/* Equipment selector */}
      <Card className="card-shadow border-border/60">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground mb-1">Selecione o equipamento</p>
              <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
                <SelectTrigger className="border-border/60 max-w-sm">
                  <SelectValue placeholder="Escolha um equipamento..." />
                </SelectTrigger>
                <SelectContent>
                  {equipment?.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      <div className="flex items-center gap-2">
                        <FlaskConical className="w-3.5 h-3.5 text-muted-foreground" />
                        {e.name}
                        {e.isRestrictedAccess && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">Restrito</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User access list */}
      {!selectedEquipmentId ? (
        <div className="py-12 text-center">
          <KeyRound className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Selecione um equipamento para gerenciar o acesso</p>
        </div>
      ) : (
        <Card className="card-shadow border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Permissões — {selectedEquip?.name}
              </CardTitle>
              {!selectedEquip?.isRestrictedAccess && (
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                  Acesso livre — todos podem agendar
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingAccess ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {users?.map((u) => {
                  const hasAccess = !selectedEquip?.isRestrictedAccess || accessUserIds.has(u.id);
                  const initials = (u.name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{u.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{u.email ?? "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium flex items-center gap-1 ${hasAccess ? "text-green-600" : "text-muted-foreground"}`}>
                          {hasAccess ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                          {hasAccess ? "Com acesso" : "Sem acesso"}
                        </span>
                        <Switch
                          checked={hasAccess}
                          onCheckedChange={() => handleToggle(u.id, hasAccess)}
                          disabled={!selectedEquip?.isRestrictedAccess}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
