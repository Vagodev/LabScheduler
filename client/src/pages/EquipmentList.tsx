import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlaskConical, Search, Calendar, Microscope, Zap, Thermometer, Wrench, Beaker } from "lucide-react";

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "Microscopia": Microscope,
  "Espectroscopia": Zap,
  "Ensaios Mecânicos": Wrench,
  "Ensaios Térmicos": Thermometer,
  "Análise Térmica": Thermometer,
  "Dureza": Beaker,
  "Preparação de Amostras": Beaker,
  "Tratamentos Térmicos": Thermometer,
  "Caracterização": Beaker,
  "Ensaios Ambientais": Beaker,
  "Eletroquímica": Zap,
};

const categoryColors: Record<string, string> = {
  "Microscopia": "bg-blue-50 text-blue-700 border-blue-100",
  "Espectroscopia": "bg-purple-50 text-purple-700 border-purple-100",
  "Ensaios Mecânicos": "bg-orange-50 text-orange-700 border-orange-100",
  "Ensaios Térmicos": "bg-red-50 text-red-700 border-red-100",
  "Análise Térmica": "bg-red-50 text-red-700 border-red-100",
  "Dureza": "bg-teal-50 text-teal-700 border-teal-100",
  "Preparação de Amostras": "bg-cyan-50 text-cyan-700 border-cyan-100",
  "Tratamentos Térmicos": "bg-amber-50 text-amber-700 border-amber-100",
  "Caracterização": "bg-indigo-50 text-indigo-700 border-indigo-100",
  "Ensaios Ambientais": "bg-green-50 text-green-700 border-green-100",
  "Eletroquímica": "bg-violet-50 text-violet-700 border-violet-100",
};

export default function EquipmentList() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [, navigate] = useLocation();

  const { data: equipment, isLoading } = trpc.equipment.list.useQuery();

  const categories = Array.from(new Set(equipment?.map((e) => e.category) ?? [])).sort();

  const filtered = equipment?.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === "all" || e.category === selectedCategory;
    return matchSearch && matchCategory;
  }) ?? [];

  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, e) => {
    if (!acc[e.category]) acc[e.category] = [];
    acc[e.category]!.push(e);
    return acc;
  }, {});

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Equipamentos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {equipment?.length ?? 0} equipamentos disponíveis no laboratório
        </p>
      </div>

      {/* Search & filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar equipamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border/60"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment grid by category */}
      {Object.entries(grouped).map(([category, items]) => {
        const Icon = categoryIcons[category] ?? FlaskConical;
        const colorClass = categoryColors[category] ?? "bg-gray-50 text-gray-700 border-gray-100";

        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClass}`}>
                <Icon className="w-3.5 h-3.5" />
                {category}
              </span>
              <span className="text-xs text-muted-foreground">{items.length} equipamento{items.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((equip) => (
                <Card
                  key={equip.id}
                  className="card-shadow border-border/60 hover:card-shadow-hover transition-all duration-200 group cursor-pointer"
                  onClick={() => navigate("/calendar")}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/12 transition-colors">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">{equip.name}</p>
                        {equip.location && (
                          <p className="text-xs text-muted-foreground mt-0.5">{equip.location}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {equip.isRestrictedAccess && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium border border-amber-100">
                              Acesso Restrito
                            </span>
                          )}
                          {equip.requiresApproval && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-100">
                              Requer Aprovação
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/40">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-7 text-xs text-muted-foreground hover:text-primary group-hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); navigate("/calendar"); }}
                      >
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        Ver disponibilidade
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
