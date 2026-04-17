import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Users, Search, ShieldCheck, User, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const roleConfig = {
  collaborator: { label: "Colaborador", icon: User, color: "bg-blue-50 text-blue-700 border-blue-100" },
  supervisor: { label: "Supervisor", icon: ShieldCheck, color: "bg-purple-50 text-purple-700 border-purple-100" },
  admin: { label: "Administrador", icon: Crown, color: "bg-amber-50 text-amber-700 border-amber-100" },
};

export default function AdminUsers() {
  const { data: currentUser } = trpc.auth.me.useQuery();
  const [search, setSearch] = useState("");

  const { data: users, refetch, isLoading } = trpc.users.list.useQuery();
  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => { toast.success("Papel atualizado com sucesso!"); refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const setActive = trpc.users.setActive.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const filtered = users?.filter((u) =>
    !search ||
    (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Usuários</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie papéis e permissões dos colaboradores
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(roleConfig).map(([role, config]) => {
          const count = users?.filter((u) => u.role === role).length ?? 0;
          const Icon = config.icon;
          return (
            <Card key={role} className="card-shadow border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground">{config.label}{count !== 1 ? "s" : ""}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card border-border/60"
        />
      </div>

      {/* Users table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card className="card-shadow border-border/60">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Usuário</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Papel</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Último acesso</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ativo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-muted-foreground text-sm">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const role = roleConfig[u.role as keyof typeof roleConfig] ?? roleConfig.collaborator;
                    const RoleIcon = role.icon;
                    const initials = (u.name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
                    const isSelf = u.id === currentUser?.id;

                    return (
                      <tr key={u.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {u.name ?? "—"}
                                {isSelf && <span className="ml-2 text-[10px] text-muted-foreground">(você)</span>}
                              </p>
                              <p className="text-xs text-muted-foreground">{u.email ?? "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <Select
                            value={u.role}
                            onValueChange={(val) =>
                              updateRole.mutate({ userId: u.id, role: val as "collaborator" | "supervisor" | "admin" })
                            }
                            disabled={isSelf}
                          >
                            <SelectTrigger className={`w-40 h-8 text-xs border ${role.color}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="collaborator">Colaborador</SelectItem>
                              <SelectItem value="supervisor">Supervisor</SelectItem>
                              <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          {format(new Date(u.lastSignedIn), "dd/MM/yyyy HH:mm")}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <Switch
                            checked={u.isActive}
                            onCheckedChange={(v) => setActive.mutate({ userId: u.id, isActive: v })}
                            disabled={isSelf}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
