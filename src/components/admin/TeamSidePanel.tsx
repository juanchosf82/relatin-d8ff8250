import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  user: Profile | null;
  currentRole: string;
  onSaved: () => void;
}

const ROLE_OPTIONS = [
  {
    value: "admin",
    label: "Admin completo",
    desc: "Crear/editar/eliminar proyectos, cargar SOV, gestionar draws, subir reportes, gestionar usuarios",
  },
  {
    value: "editor",
    label: "Editor",
    desc: "Editar SOV, gestionar draws, subir reportes. No puede crear/eliminar proyectos ni gestionar usuarios",
  },
  {
    value: "viewer",
    label: "Viewer",
    desc: "Ver todo en /admin. No puede editar nada",
  },
];

const PERMISSIONS_MATRIX = [
  { feature: "Crear proyectos", admin: true, editor: false, viewer: false },
  { feature: "Editar proyectos", admin: true, editor: true, viewer: false },
  { feature: "Cargar SOV", admin: true, editor: true, viewer: false },
  { feature: "Gestionar draws", admin: true, editor: true, viewer: false },
  { feature: "Subir reportes", admin: true, editor: true, viewer: false },
  { feature: "Gestionar usuarios", admin: true, editor: false, viewer: false },
  { feature: "Ver todo (solo)", admin: true, editor: true, viewer: true },
];

const TeamSidePanel = ({ open, onClose, user, currentRole, onSaved }: Props) => {
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSelectedRole(currentRole);
  }, [open, currentRole]);

  const handleSaveRole = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("user_roles")
      .update({ role: selectedRole as any })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success("✓ Rol actualizado");
      onSaved();
    }
  };

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
          <SheetTitle>Editar miembro del equipo</SheetTitle>
          <SheetDescription>Panel de edición de rol</SheetDescription>
        </SheetHeader>

        {user && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#0F1B2D] text-white flex items-center justify-center text-[16px] font-bold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-bold text-[#0F1B2D] truncate">{user.full_name || "Sin nombre"}</p>
                  <p className="text-[12px] text-gray-500 truncate">{user.email}</p>
                </div>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-[rgba(13,115,119,0.1)] text-[#0D7377]">
                  {currentRole}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* Role Selector */}
              <div>
                <p className="text-[11px] uppercase text-[#0D7377] font-bold tracking-wider mb-3">Rol</p>
                <RadioGroup value={selectedRole} onValueChange={setSelectedRole} className="space-y-3">
                  {ROLE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedRole === opt.value
                          ? "border-[#0D7377] bg-[rgba(13,115,119,0.05)]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <RadioGroupItem value={opt.value} className="mt-0.5" />
                      <div>
                        <p className="text-[12px] font-semibold text-[#0F1B2D]">{opt.label}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="border-t border-gray-200" />

              {/* Permissions Matrix */}
              <div>
                <p className="text-[11px] uppercase text-[#0D7377] font-bold tracking-wider mb-3">Matriz de Permisos</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left text-[11px] font-semibold text-gray-600 px-3 py-2">Funcionalidad</th>
                        {["admin", "editor", "viewer"].map((role) => (
                          <th
                            key={role}
                            className={`text-center text-[11px] font-semibold px-3 py-2 uppercase tracking-wide ${
                              selectedRole === role
                                ? "bg-[rgba(13,115,119,0.1)] text-[#0D7377]"
                                : "text-gray-500"
                            }`}
                          >
                            {role === "admin" ? "Admin" : role === "editor" ? "Editor" : "Viewer"}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSIONS_MATRIX.map((row, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="text-[11px] text-gray-700 px-3 py-2">{row.feature}</td>
                          {(["admin", "editor", "viewer"] as const).map((role) => (
                            <td
                              key={role}
                              className={`text-center px-3 py-2 ${
                                selectedRole === role ? "bg-[rgba(13,115,119,0.05)]" : ""
                              }`}
                            >
                              {row[role] ? (
                                <Check className="h-3.5 w-3.5 text-[#0D7377] mx-auto" />
                              ) : (
                                <X className="h-3.5 w-3.5 text-gray-300 mx-auto" />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-white flex gap-2">
              <Button
                onClick={handleSaveRole}
                disabled={saving || selectedRole === currentRole}
                className="flex-1 bg-[#0F1B2D] text-white hover:bg-[#0F1B2D]/90 text-[12px] font-semibold uppercase tracking-wider"
              >
                {saving ? "Guardando..." : "Guardar rol"}
              </Button>
              <Button variant="outline" onClick={onClose} className="text-[12px]">
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default TeamSidePanel;
