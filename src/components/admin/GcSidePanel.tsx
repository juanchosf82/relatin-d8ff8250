import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { HardHat, Key } from "lucide-react";

interface GcProfileData {
  id?: string;
  user_id?: string;
  company_name: string;
  license_number: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  status: string;
}

interface ProjectOption {
  id: string;
  code: string;
  address: string;
}

interface GcAccess {
  id: string;
  project_id: string;
  permissions: Record<string, boolean>;
}

const PERM_LABELS: { key: string; label: string }[] = [
  { key: "sov_update", label: "Actualizar SOV" },
  { key: "photos_upload", label: "Subir fotos" },
  { key: "issues_manage", label: "Gestionar issues" },
  { key: "invoices_upload", label: "Subir invoices" },
  { key: "visits_report", label: "Reportar visitas" },
  { key: "waivers_upload", label: "Subir waivers" },
];

const DEFAULT_PERMS = { sov_update: true, photos_upload: true, issues_manage: true, invoices_upload: true, visits_report: true, waivers_upload: true };

interface Props {
  open: boolean;
  onClose: () => void;
  gcProfile: GcProfileData | null;
  isNew: boolean;
  onSaved: () => void;
}

const GcSidePanel = ({ open, onClose, gcProfile, isNew, onSaved }: Props) => {
  const [form, setForm] = useState<GcProfileData>({
    company_name: "", license_number: "", contact_name: "", email: "", phone: "", address: "", notes: "", status: "active",
  });
  const [allProjects, setAllProjects] = useState<ProjectOption[]>([]);
  const [gcAccessList, setGcAccessList] = useState<GcAccess[]>([]);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchProjects();
      if (gcProfile && !isNew) {
        setForm({
          id: gcProfile.id,
          user_id: gcProfile.user_id,
          company_name: gcProfile.company_name || "",
          license_number: gcProfile.license_number || "",
          contact_name: gcProfile.contact_name || "",
          email: gcProfile.email || "",
          phone: gcProfile.phone || "",
          address: gcProfile.address || "",
          notes: gcProfile.notes || "",
          status: gcProfile.status || "active",
        });
        if (gcProfile.user_id) fetchGcAccess(gcProfile.user_id);
      } else {
        setForm({ company_name: "", license_number: "", contact_name: "", email: "", phone: "", address: "", notes: "", status: "active" });
        setGcAccessList([]);
      }
    }
  }, [open, gcProfile, isNew]);

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("id, code, address").order("code");
    if (data) setAllProjects(data);
  };

  const fetchGcAccess = async (userId: string) => {
    const { data } = await supabase.from("gc_project_access" as any).select("id, project_id, permissions").eq("gc_user_id", userId);
    if (data) setGcAccessList(data as any);
  };

  const handleSave = async () => {
    if (!form.company_name.trim() || !form.email.trim()) {
      toast.error("Nombre de empresa y email son requeridos");
      return;
    }
    setSaving(true);

    if (isNew) {
      // For new GC, just save the profile info — invite will create the auth user
      // First check if user already exists by trying to create profile directly
      // We'll handle user creation in the invite step
      toast.success("✓ Perfil preparado. Usa 'Enviar invitación' para crear la cuenta.");
      setSaving(false);
      return;
    }

    // Update existing
    if (form.id) {
      const { error } = await supabase.from("gc_profiles" as any).update({
        company_name: form.company_name,
        license_number: form.license_number || null,
        contact_name: form.contact_name || null,
        email: form.email,
        phone: form.phone || null,
        address: form.address || null,
        notes: form.notes || null,
        status: form.status,
      } as any).eq("id", form.id);

      if (error) {
        toast.error("Error: " + error.message);
      } else {
        toast.success("✓ GC actualizado");
        onSaved();
      }
    }
    setSaving(false);
  };

  const extractInviteErrorMessage = async (res: any): Promise<string> => {
    if (res?.data?.error) return String(res.data.error);

    if (!res?.error) return "Error desconocido";

    const context = (res.error as any).context as Response | undefined;
    if (context) {
      try {
        const payload = await context.clone().json();
        if (payload?.error) return String(payload.error);
        if (payload?.message) return String(payload.message);
      } catch {
        try {
          const rawText = await context.text();
          if (rawText) return rawText;
        } catch {
          // no-op fallback
        }
      }
    }

    return res.error.message || "Error desconocido";
  };

  const handleInvite = async () => {
    if (!form.email.trim() || !form.company_name.trim() || !form.contact_name.trim()) {
      toast.error("Completa empresa, nombre y email primero");
      return;
    }
    setInviting(true);

    try {
      const res = await supabase.functions.invoke("create-gc-user", {
        body: {
          email: form.email,
          full_name: form.contact_name,
          company_name: form.company_name,
          license_number: form.license_number,
          phone: form.phone,
          address: form.address,
          notes: form.notes,
        },
      });

      if (res.error || res.data?.error || res.data?.success === false) {
        const errMsg = await extractInviteErrorMessage(res);
        const normalized = errMsg.toLowerCase();

        if (normalized.includes("already") || normalized.includes("exists") || normalized.includes("email_exists") || normalized.includes("registered")) {
          toast.error(`Este email ya tiene una cuenta registrada. ${errMsg}`);
        } else if (normalized.includes("invalid") && normalized.includes("email")) {
          toast.error(`Email inválido. ${errMsg}`);
        } else {
          toast.error(`Error al crear la cuenta. Verifica los datos e intenta de nuevo. ${errMsg}`);
        }

        setInviting(false);
        return;
      }

      if (res.data?.warning) {
        toast.warning(`Cuenta creada, pero no se pudo enviar el enlace de recuperación: ${res.data.warning}`);
      }

      toast.success(`✓ Cuenta GC creada para ${form.email}. Revisa el correo para definir contraseña.`);
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
    setInviting(false);
  };

  const handleToggleProject = async (projectId: string, currentlyAssigned: boolean) => {
    if (!form.user_id) return;

    if (currentlyAssigned) {
      const access = gcAccessList.find((a) => a.project_id === projectId);
      if (access) {
        await supabase.from("gc_project_access" as any).delete().eq("id", access.id);
        setGcAccessList((prev) => prev.filter((a) => a.id !== access.id));
        toast.success("Proyecto removido");
      }
    } else {
      const { data, error } = await supabase.from("gc_project_access" as any).insert({
        gc_user_id: form.user_id,
        project_id: projectId,
        permissions: DEFAULT_PERMS,
      } as any).select().single();

      if (error) {
        toast.error("Error: " + error.message);
      } else {
        setGcAccessList((prev) => [...prev, data as any]);
        toast.success("Proyecto asignado");
      }
    }
  };

  const handlePermToggle = async (accessId: string, key: string, value: boolean) => {
    const access = gcAccessList.find((a) => a.id === accessId);
    if (!access) return;
    const newPerms = { ...access.permissions, [key]: value };
    await supabase.from("gc_project_access" as any).update({ permissions: newPerms } as any).eq("id", accessId);
    setGcAccessList((prev) => prev.map((a) => a.id === accessId ? { ...a, permissions: newPerms } : a));
  };

  const assignedProjectIds = new Set(gcAccessList.map((a) => a.project_id));

  const initials = (form.company_name || "GC").slice(0, 2).toUpperCase();

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[440px] sm:max-w-[440px] overflow-y-auto p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>{isNew ? "Nuevo GC" : "Editar GC"}</SheetTitle>
          <SheetDescription>Panel de gestión de contratista</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200 bg-[#E07B39]/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#E07B39] text-white flex items-center justify-center text-[16px] font-bold shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-bold text-[#0F1B2D] truncate">{form.company_name || "Nuevo Contratista"}</p>
                <p className="text-[12px] text-gray-500 truncate">{form.email || "—"}</p>
              </div>
              <HardHat className="h-5 w-5 text-[#E07B39]" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Company Info */}
            <div>
              <p className="text-[11px] uppercase text-[#E07B39] font-bold tracking-wider mb-3">Empresa</p>
              <div className="space-y-3">
                <div>
                  <Label className="text-[11px] text-gray-500">Nombre de empresa *</Label>
                  <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="text-[12px] h-9" />
                </div>
                <div>
                  <Label className="text-[11px] text-gray-500">Número de licencia</Label>
                  <Input value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} className="text-[12px] h-9" />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200" />

            {/* Contact */}
            <div>
              <p className="text-[11px] uppercase text-[#E07B39] font-bold tracking-wider mb-3">Contacto principal</p>
              <div className="space-y-3">
                <div>
                  <Label className="text-[11px] text-gray-500">Nombre completo *</Label>
                  <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="text-[12px] h-9" />
                </div>
                <div>
                  <Label className="text-[11px] text-gray-500">Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="text-[12px] h-9" disabled={!isNew && !!form.user_id} />
                </div>
                <div>
                  <Label className="text-[11px] text-gray-500">Teléfono</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="text-[12px] h-9" />
                </div>
                <div>
                  <Label className="text-[11px] text-gray-500">Dirección</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="text-[12px] h-9" />
                </div>
              </div>
            </div>

            {/* Credentials - only for new */}
            {isNew && (
              <>
                <div className="border-t border-gray-200" />
                <div>
                  <p className="text-[11px] uppercase text-[#E07B39] font-bold tracking-wider mb-3">Credenciales</p>
                  <Button onClick={handleInvite} disabled={inviting} size="sm" className="bg-[#E07B39] hover:bg-[#c96a2f] text-white text-[11px]">
                    <Key className="h-3.5 w-3.5 mr-1" />
                    {inviting ? "Creando cuenta..." : "Crear cuenta e invitar"}
                  </Button>
                  <p className="text-[10px] text-gray-400 mt-2">Se creará una cuenta con contraseña temporal. El GC podrá acceder en /gc/login</p>
                </div>
              </>
            )}

            {/* Project Access - only for existing */}
            {!isNew && form.user_id && (
              <>
                <div className="border-t border-gray-200" />
                <div>
                  <p className="text-[11px] uppercase text-[#E07B39] font-bold tracking-wider mb-3">Acceso a proyectos</p>
                  <div className="space-y-3">
                    {allProjects.map((proj) => {
                      const assigned = assignedProjectIds.has(proj.id);
                      const access = gcAccessList.find((a) => a.project_id === proj.id);
                      return (
                        <div key={proj.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[12px] font-semibold text-[#0F1B2D]">{proj.code}</p>
                              <p className="text-[10px] text-gray-400">{proj.address}</p>
                            </div>
                            <Switch
                              checked={assigned}
                              onCheckedChange={() => handleToggleProject(proj.id, assigned)}
                              className="data-[state=checked]:bg-[#E07B39]"
                            />
                          </div>
                          {assigned && access && (
                            <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-2 gap-1">
                              {PERM_LABELS.map((p) => (
                                <div key={p.key} className="flex items-center gap-1.5">
                                  <Checkbox
                                    checked={access.permissions[p.key] !== false}
                                    onCheckedChange={(v) => handlePermToggle(access.id, p.key, !!v)}
                                    className="h-3.5 w-3.5 data-[state=checked]:bg-[#E07B39] data-[state=checked]:border-[#E07B39]"
                                  />
                                  <span className="text-[10px] text-gray-600">{p.label}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="border-t border-gray-200" />

            {/* Notes */}
            <div>
              <p className="text-[11px] uppercase text-[#E07B39] font-bold tracking-wider mb-3">Notas internas</p>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="text-[12px] min-h-[60px]" placeholder="Solo visible para admin..." />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-[11px]">Cancelar</Button>
            {!isNew && (
              <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#E07B39] hover:bg-[#c96a2f] text-white text-[11px]">
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default GcSidePanel;
