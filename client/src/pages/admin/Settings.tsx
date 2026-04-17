import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings, Bell, Clock, Loader2, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface SettingField {
  key: string;
  label: string;
  description: string;
  type: "text" | "number" | "boolean";
  placeholder?: string;
}

const SETTINGS_CONFIG: SettingField[] = [
  {
    key: "teams_webhook_url",
    label: "URL do Webhook do Teams",
    description: "URL do webhook para enviar notificações automáticas ao Microsoft Teams",
    type: "text",
    placeholder: "https://outlook.office.com/webhook/...",
  },
  {
    key: "lab_start_hour",
    label: "Horário de abertura",
    description: "Hora de início do funcionamento do laboratório (ex: 8)",
    type: "number",
    placeholder: "8",
  },
  {
    key: "lab_end_hour",
    label: "Horário de encerramento",
    description: "Hora de encerramento do laboratório (ex: 20)",
    type: "number",
    placeholder: "20",
  },
  {
    key: "max_consecutive_days",
    label: "Máximo de dias consecutivos",
    description: "Número máximo de dias consecutivos que um usuário pode agendar",
    type: "number",
    placeholder: "2",
  },
  {
    key: "notify_on_booking",
    label: "Notificar no agendamento",
    description: "Enviar notificação ao Teams quando um novo agendamento for solicitado",
    type: "boolean",
  },
  {
    key: "notify_on_approval",
    label: "Notificar na aprovação",
    description: "Enviar notificação ao Teams quando um agendamento for aprovado ou rejeitado",
    type: "boolean",
  },
];

export default function AdminSettings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const { data: settings, isLoading } = trpc.settings.getAll.useQuery();
  const setSetting = trpc.settings.set.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {};
      for (const s of settings) {
        map[s.key] = s.value ?? "";
      }
      setValues(map);
    }
  }, [settings]);

  const handleSave = async () => {
    for (const field of SETTINGS_CONFIG) {
      const value = values[field.key];
      if (value !== undefined) {
        await setSetting.mutateAsync({ key: field.key, value, description: field.description });
      }
    }
  };

  const getValue = (key: string, defaultVal = "") => values[key] ?? defaultVal;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações do Sistema</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure os parâmetros de funcionamento do laboratório
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Teams Integration */}
          <Card className="card-shadow border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                Integração com Microsoft Teams
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {SETTINGS_CONFIG.filter((s) => s.key.startsWith("teams") || s.key.startsWith("notify")).map((field) => (
                <div key={field.key}>
                  {field.type === "boolean" ? (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
                      <div>
                        <p className="text-sm font-medium text-foreground">{field.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
                      </div>
                      <Switch
                        checked={getValue(field.key, "false") === "true"}
                        onCheckedChange={(v) => setValues((prev) => ({ ...prev, [field.key]: String(v) }))}
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">{field.label}</Label>
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                      <Input
                        value={getValue(field.key)}
                        onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="border-border/60"
                        type={field.type === "number" ? "number" : "text"}
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Lab Hours */}
          <Card className="card-shadow border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Horários e Limites
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {SETTINGS_CONFIG.filter((s) => s.key.startsWith("lab") || s.key.startsWith("max")).map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-sm font-medium">{field.label}</Label>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                  <Input
                    value={getValue(field.key)}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="border-border/60 max-w-32"
                    type="number"
                    min={0}
                    max={field.key === "lab_end_hour" ? 24 : field.key === "lab_start_hour" ? 12 : 30}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={setSetting.isPending}
              className="gap-2 min-w-36"
            >
              {setSetting.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saved ? "Salvo!" : "Salvar configurações"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
