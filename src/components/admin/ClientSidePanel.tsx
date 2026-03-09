import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Send, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  status: string | null;
  preferred_language: string | null;
  notes: string | null;
  last_login_at: string | null;
  created_at: string;
}

interface UserProjectAccess {
  id: string;
  project_id: string;
  access_level: string;
  permissions: any;
  project_code?: string;
  project_address?: string;
}

interface ProjectOption {
  id: string;
  code: string;
  address: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  user: Profile | null;
  onSaved: () => void;
}

const ClientSidePanel = ({ open, onClose, user, onSaved }: Props) => {
  const [form, setForm] = useState({
    full_name: "",
    company: "",
    phone: "",
    preferred_language: "es",
    notes: "",
    status: "active",
  });
  const [access, setAccess] = useState<UserProjectAccess[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);

  useEffect(() => {
    if (user && open) {
      setForm({
        full_name: user.full_name || "",
        company: user.company || "",
        phone: user.phone || "",
        preferred_language: user.preferred_language || "es",
        notes: (user as any).notes || "",
        status: user.status || "active",
      });
      fetchAccess(user.id);
      fetchProjects();
    }
  }, [user, open]);

  const fetchAccess = async (userId: string) => {
    const { data } = await supabase
      .from("user_project_access")
      .select("id, project_id, access_level, permissions")
      .eq("user_id", userId);

    if (data) {
      // Fetch project details for each access
      const projectIds = data.map((a) => a.project_id);
      const { data: projects } = await supabase
        .from("projects")
        .select("id, code, address")
        .in("id", projectIds.length > 0 ? projectIds : ["none"]);

      const enriched = data.map((a) => {
        const proj = projects?.find((p) => p.id === a.project_id);
        return {
          ...a,
          permissions: a.permissions || { view_financials: true, download_reports: true, view_draws: true },
          project_code: proj?.code || "—",
          project_address: proj?.address || "",
        };
      });
      setAccess(enriched);
    }
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("id, code, address").order("code");
    if (data) setAllProjects(data);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name || null,
        company: form.company || null,
        phone: form.phone || null,
        preferred_language: form.preferred_language,
        notes: form.notes || null,
        status: form.status,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success("✓ Guardado");
      onSaved();
    }
  };

  const handleResendLink = async () => {
    if (!user?.email) return;
    setSendingLink(true);
    const { error } = await supabase.auth.signInWithOtp({ email: user.email });
    setSendingLink(false);
    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success(`Link enviado a ${user.email}`);
    }
  };

  const handleToggleAccess = async (accessItem: UserProjectAccess) => {
    const newLevel = accessItem.access_level === "suspended" ? "client" : "suspended";
    const { error } = await supabase
      .from("user_project_access")
      .update({ access_level: newLevel })
      .eq("id", accessItem.id);
    if (error) {
      toast.error("Error: " + error.message);
    } else {
      setAccess((prev) =>
        prev.map((a) => (a.id === accessItem.id ? { ...a, access_level: newLevel } : a))
      );
      toast.success("✓ Actualizado");
    }
  };

  const handleRevokeAccess = async (accessItem: UserProjectAccess) => {
    const { error } = await supabase
      .from("user_project_access")
      .delete()
      .eq("id", accessItem.id);
    if (error) {
      toast.error("Error: " + error.message);
    } else {
      // Also clear client_user_id on the project
      await supabase
        .from("projects")
        .update({ client_user_id: null })
        .eq("id", accessItem.project_id)
        .eq("client_user_id", user?.id || "");
      setAccess((prev) => prev.filter((a) => a.id !== accessItem.id));
      toast.success("Acceso revocado");
      onSaved();
    }
  };

  const handleAddProject = async (projectId: string) => {
    if (!user) return;
    // Insert user_project_access
    const { error: accessErr } = await supabase.from("user_project_access").insert({
      user_id: user.id,
      project_id: projectId,
      access_level: "client",
    });
    if (accessErr) {
      toast.error("Error: " + accessErr.message);
      return;
    }
    // Update project client_user_id
    await supabase.from("projects").update({ client_user_id: user.id }).eq("id", projectId);
    toast.success("✓ Proyecto asignado");
    fetchAccess(user.id);
    onSaved();
  };

  const handlePermissionToggle = async (accessItem: UserProjectAccess, key: string, value: boolean) => {
    const newPerms = { ...accessItem.permissions, [key]: value };
    const { error } = await supabase
      .from("user_project_access")
      .update({ permissions: newPerms })
      .eq("id", accessItem.id);
    if (error) {
      toast.error("Error: " + error.message);
    } else {
      setAccess((prev) =>
        prev.map((a) => (a.id === accessItem.id ? { ...a, permissions: newPerms } : a))
      );
    }
  };

  const assignedProjectIds = new Set(access.map((a) => a.project_id));
  const availableProjects = allProjects.filter((p) => !assignedProjectIds.has(p.id));

  const initials = (user?.full_name || user?.email || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[440px] sm:max-w-[440px] overflow-y-auto p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Editar cliente</SheetTitle>
          <SheetDescription>Panel de edición de cliente</SheetDescription>
        </SheetHeader>

        {user && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#0D7377] text-white flex items-center justify-center text-[16px] font-bold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-bold text-[#0F1B2D] truncate">{user.full_name || "Sin nombre"}</p>
                  <p className="text-[12px] text-gray-500 truncate">{user.email}</p>
                </div>
                <span
                  className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                    form.status === "active"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {form.status === "active" ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendLink}
                  disabled={sendingLink}
                  className="text-[11px]"
                >
                  <Send className="h-3 w-3 mr-1" />
                  {sendingLink ? "Enviando..." : "Reenviar magic link"}
                </Button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* Profile Fields */}
              <div>
                <p className="text-[11px] uppercase text-[#0D7377] font-bold tracking-wider mb-3">Información</p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-[11px] text-gray-500">Nombre completo</Label>
                    <Input
                      value={form.full_name}
                      onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                      className="text-[12px] border-gray-200 focus:border-[#0D7377] h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-gray-500">Empresa</Label>
                    <Input
                      value={form.company}
                      onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                      className="text-[12px] border-gray-200 focus:border-[#0D7377] h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-gray-500">Teléfono</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      className="text-[12px] border-gray-200 focus:border-[#0D7377] h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-gray-500">Idioma preferido</Label>
                    <div className="flex gap-2 mt-1">
                      {["es", "en"].map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setForm((f) => ({ ...f, preferred_language: lang }))}
                          className={`px-3 py-1.5 rounded text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                            form.preferred_language === lang
                              ? "bg-[#0D7377] text-white"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px] text-gray-500">Estado</Label>
                    <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                      <SelectTrigger className="text-[12px] h-9 border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-gray-500">Notas</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      className="text-[12px] border-gray-200 focus:border-[#0D7377] min-h-[60px]"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200" />

              {/* Project Permissions */}
              <div>
                <p className="text-[11px] uppercase text-[#0D7377] font-bold tracking-wider mb-3">Proyectos Asignados</p>
                {access.length === 0 ? (
                  <p className="text-[12px] text-gray-400">Sin proyectos asignados</p>
                ) : (
                  <div className="space-y-3">
                    {access.map((a) => (
                      <div key={a.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-[12px] font-semibold text-[#0F1B2D]">{a.project_code}</p>
                            <p className="text-[11px] text-gray-400">{a.project_address}</p>
                          </div>
                          <span
                            className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                              a.access_level === "suspended"
                                ? "bg-orange-50 text-orange-600"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {a.access_level === "suspended" ? "Suspendido" : "Cliente"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={a.access_level !== "suspended"}
                              onCheckedChange={() => handleToggleAccess(a)}
                              className="data-[state=checked]:bg-[#0D7377]"
                            />
                            <span className="text-[11px] text-gray-500">
                              {a.access_level === "suspended" ? "Suspendido" : "Activo"}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeAccess(a)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 text-[11px] h-7 px-2"
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Revocar
                          </Button>
                        </div>

                        {/* Per-project permissions */}
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                          {[
                            { key: "view_financials", label: "Ver avance financiero" },
                            { key: "download_reports", label: "Descargar reportes PDF" },
                            { key: "view_draws", label: "Ver información de draws" },
                          ].map((perm) => (
                            <div key={perm.key} className="flex items-center justify-between">
                              <span className="text-[11px] text-gray-600">{perm.label}</span>
                              <Switch
                                checked={a.permissions?.[perm.key] !== false}
                                onCheckedChange={(v) => handlePermissionToggle(a, perm.key, v)}
                                className="data-[state=checked]:bg-[#0D7377] h-5 w-9"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Project */}
                {availableProjects.length > 0 && (
                  <div className="mt-3">
                    <Select onValueChange={handleAddProject}>
                      <SelectTrigger className="text-[12px] h-9 border-gray-200 border-dashed">
                        <SelectValue placeholder="+ Asignar proyecto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProjects.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-[12px]">
                            {p.code} — {p.address}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200" />

              {/* Access Control */}
              <div>
                <p className="text-[11px] uppercase text-[#0D7377] font-bold tracking-wider mb-3">Permisos</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[12px] font-medium text-[#0F1B2D]">Acceso al portal activo</p>
                      <p className="text-[11px] text-gray-400">Si se desactiva, no podrá iniciar sesión</p>
                    </div>
                    <Switch
                      checked={form.status === "active"}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, status: v ? "active" : "inactive" }))}
                      className="data-[state=checked]:bg-[#0D7377]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-white flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#0F1B2D] text-white hover:bg-[#0F1B2D]/90 text-[12px] font-semibold uppercase tracking-wider"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="text-[12px]"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ClientSidePanel;
