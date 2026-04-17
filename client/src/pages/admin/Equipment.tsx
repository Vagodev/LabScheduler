import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FlaskConical, Plus, Pencil, Search, Loader2, Power } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "Microscopia", "Espectroscopia", "Ensaios Mecânicos", "Ensaios Térmicos",
  "Análise Térmica", "Dureza", "Preparação de Amostras", "Tratamentos Térmicos",
  "Caracterização", "Ensaios Ambientais", "Eletroquímica",
];

interface EquipmentForm {
  name: string;
  category: string;
  description: string;
  location: string;
  requiresApproval: boolean;
  isRestrictedAccess: boolean;
}

const emptyForm: EquipmentForm = {
  name: "", category: "", description: "", location: "",
  requiresApproval: true, isRestrictedAccess: false,
};

export default function AdminEquipment() {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EquipmentForm>(emptyForm);

  const { data: equipment, refetch, isLoading } = trpc.equipment.list.useQuery({ includeInactive: true });
  const create = trpc.equipment.create.useMutation({
    onSuccess: () => { toast.success("Equipamento criado!"); refetch(); setIsModalOpen(false); },
    onError: (err) => toast.error(err.message),
  });
  const update = trpc.equipment.update.useMutation({
    onSuccess: () => { toast.success("Equipamento atualizado!"); refetch(); setIsModalOpen(false); },
    onError: (err) => toast.error(err.message),
  });
  const toggleActive = trpc.equipment.update.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const filtered = equipment?.filter((e) =>
    !search ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setIsModalOpen(true); };
  const openEdit = (e: typeof equipment extends (infer T)[] | undefined ? T : never) => {
    if (!e) return;
    setForm({
      name: e.name, category: e.category,
      description: e.description ?? "", location: e.location ?? "",
      requiresApproval: e.requiresApproval, isRestrictedAccess: e.isRestrictedAccess,
    });
    setEditingId(e.id);
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.category) return toast.error("Nome e categoria são obrigatórios.");
    if (editingId) {
      update.mutate({ id: editingId, ...form });
    } else {
      create.mutate(form);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Equipamentos</h1>
          <p className="text-muted-foreground text-sm mt-1">{equipment?.length ?? 0} equipamentos cadastrados</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Equipamento
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar equipamento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card border-border/60"
        />
      </div>

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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipamento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Categoria</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aprovação</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Restrito</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ativo</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className={`border-b border-border/30 hover:bg-muted/30 transition-colors ${!e.isActive ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                          <FlaskConical className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-foreground">{e.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{e.category}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${e.requiresApproval ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-500"}`}>
                        {e.requiresApproval ? "Sim" : "Não"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${e.isRestrictedAccess ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-500"}`}>
                        {e.isRestrictedAccess ? "Sim" : "Não"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Switch
                        checked={e.isActive}
                        onCheckedChange={(v) => toggleActive.mutate({ id: e.id, isActive: v })}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(e)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Equipamento" : "Novo Equipamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border-border/60" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Categoria *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="border-border/60">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Localização</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="border-border/60" placeholder="Ex: Sala 101, Bloco A" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="resize-none border-border/60" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30">
              <div>
                <p className="text-sm font-medium text-foreground">Requer aprovação</p>
                <p className="text-xs text-muted-foreground">Agendamentos precisam de aprovação do supervisor</p>
              </div>
              <Switch checked={form.requiresApproval} onCheckedChange={(v) => setForm({ ...form, requiresApproval: v })} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30">
              <div>
                <p className="text-sm font-medium text-foreground">Acesso restrito</p>
                <p className="text-xs text-muted-foreground">Apenas usuários autorizados podem agendar</p>
              </div>
              <Switch checked={form.isRestrictedAccess} onCheckedChange={(v) => setForm({ ...form, isRestrictedAccess: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={create.isPending || update.isPending}>
              {(create.isPending || update.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? "Salvar alterações" : "Criar equipamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
