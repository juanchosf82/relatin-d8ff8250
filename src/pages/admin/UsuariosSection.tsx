import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, UserX, HardHat, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import ClientSidePanel from "@/components/admin/ClientSidePanel";
import TeamSidePanel from "@/components/admin/TeamSidePanel";
import GcSidePanel from "@/components/admin/GcSidePanel";
import { useAuth } from "@/hooks/useAuth";

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
  project_id: string;
  access_level: string;
}

interface DeleteTarget {
  id: string;
  name: string;
  email: string;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
  gc: "Contratista",
  user: "Cliente",
};

const UsuariosSection = () => {
  const { user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [accessMap, setAccessMap] = useState<Record<string, UserProjectAccess[]>>({});
  const [gcProfiles, setGcProfiles] = useState<any[]>([]);
  const [gcAccessMap, setGcAccessMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Profile | null>(null);
  const [selectedGc, setSelectedGc] = useState<any | null>(null);
  const [isNewGc, setIsNewGc] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [fadingOutId, setFadingOutId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, accessRes, gcRes, gcAccessRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("user_project_access").select("user_id, project_id, access_level"),
      supabase.from("gc_profiles" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("gc_project_access" as any).select("gc_user_id, project_id"),
    ]);

    if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
    if (rolesRes.data) {
      const map: Record<string, string> = {};
      rolesRes.data.forEach((r) => { map[r.user_id] = r.role; });
      setRoles(map);
    }
    if (accessRes.data) {
      const map: Record<string, UserProjectAccess[]> = {};
      accessRes.data.forEach((a: any) => {
        if (!map[a.user_id]) map[a.user_id] = [];
        map[a.user_id].push({ project_id: a.project_id, access_level: a.access_level });
      });
      setAccessMap(map);
    }
    if (gcRes.data) setGcProfiles(gcRes.data as any[]);
    if (gcAccessRes.data) {
      const map: Record<string, any[]> = {};
      (gcAccessRes.data as any[]).forEach((a: any) => {
        if (!map[a.gc_user_id]) map[a.gc_user_id] = [];
        map[a.gc_user_id].push(a);
      });
      setGcAccessMap(map);
    }
    setLoading(false);
  };

  const adminCount = Object.values(roles).filter((r) => r === "admin").length;

  const canDelete = (userId: string): boolean => {
    if (userId === currentUser?.id) return false;
    if (roles[userId] === "admin" && adminCount <= 1) return false;
    return true;
  };

  const handleDeleteClick = (e: React.MouseEvent, target: DeleteTarget) => {
    e.stopPropagation();
    if (!canDelete(target.id)) {
      if (target.id === currentUser?.id) {
        toast.error("No puedes eliminarte a ti mismo");
      } else {
        toast.error("No puedes eliminar el único administrador");
      }
      return;
    }
    setDeleteTarget(target);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const deletedName = deleteTarget.name;
    const deletedId = deleteTarget.id;

    const { data, error } = await supabase.rpc("delete_platform_user" as any, {
      target_user_id: deletedId,
    });

    if (error) {
      toast.error("Error al eliminar usuario: " + error.message);
      setDeleting(false);
      setDeleteTarget(null);
      return;
    }
    if (data && typeof data === "object" && !(data as any).success) {
      toast.error((data as any).error || "Error desconocido");
      setDeleting(false);
      setDeleteTarget(null);
      return;
    }

    // Fade-out animation then refresh
    setDeleteTarget(null);
    setDeleting(false);
    setFadingOutId(deletedId);
    setTimeout(() => {
      setFadingOutId(null);
      toast.success(`✓ ${deletedName} eliminado correctamente`);
      fetchData();
    }, 350);
  };

  const clients = profiles.filter((p) => !["admin", "editor", "viewer"].includes(roles[p.id] || ""));
  const team = profiles.filter((p) => ["admin", "editor", "viewer"].includes(roles[p.id] || ""));
  const activeClients = clients.filter((p) => (p.status || "active") === "active");
  const pendingClients = clients.filter((p) => !accessMap[p.id] || accessMap[p.id].length === 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D7377]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0F1B2D]">Usuarios</h1>
          <p className="text-[12px] text-gray-500 mt-1">Gestión de clientes y equipo</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[rgba(13,115,119,0.1)] rounded-lg flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-[#0D7377]" />
            </div>
            <div>
              <p className="text-[11px] uppercase text-gray-500 font-medium tracking-wide">Clientes Activos</p>
              <p className="text-xl font-bold text-[#0F1B2D]">{activeClients.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
              <UserX className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-[11px] uppercase text-gray-500 font-medium tracking-wide">Sin Acceso Aún</p>
              <p className="text-xl font-bold text-[#0F1B2D]">{pendingClients.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[rgba(15,27,45,0.08)] rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4 text-[#0F1B2D]" />
            </div>
            <div>
              <p className="text-[11px] uppercase text-gray-500 font-medium tracking-wide">Equipo Admin</p>
              <p className="text-xl font-bold text-[#0F1B2D]">{team.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="clientes">
        <TabsList className="bg-gray-100 mb-4">
          <TabsTrigger value="clientes" className="text-[12px]">Clientes ({clients.length})</TabsTrigger>
          <TabsTrigger value="equipo" className="text-[12px]">Equipo ({team.length})</TabsTrigger>
          <TabsTrigger value="contratistas" className="text-[12px]">
            <HardHat className="h-3.5 w-3.5 mr-1" />
            Contratistas ({gcProfiles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clientes">
          <UserTable
            users={clients}
            roles={roles}
            accessMap={accessMap}
            showAccess
            currentUserId={currentUser?.id}
            canDelete={canDelete}
            onDeleteClick={handleDeleteClick}
            onRowClick={(u) => setSelectedClient(u)}
            fadingOutId={fadingOutId}
          />
        </TabsContent>

        <TabsContent value="equipo">
          <UserTable
            users={team}
            roles={roles}
            accessMap={accessMap}
            currentUserId={currentUser?.id}
            canDelete={canDelete}
            onDeleteClick={handleDeleteClick}
            onRowClick={(u) => setSelectedTeam(u)}
            fadingOutId={fadingOutId}
          />
        </TabsContent>

        <TabsContent value="contratistas">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => { setSelectedGc(null); setIsNewGc(true); }} className="bg-[#E07B39] hover:bg-[#c96a2f] text-white text-[11px]">
              + Nuevo GC
            </Button>
          </div>
          {gcProfiles.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-[13px]">No hay contratistas registrados</div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#0F1B2D] text-white">
                    <th className="text-left text-[11px] uppercase tracking-wider font-semibold px-4 py-2.5">Empresa</th>
                    <th className="text-left text-[11px] uppercase tracking-wider font-semibold px-4 py-2.5">Licencia</th>
                    <th className="text-left text-[11px] uppercase tracking-wider font-semibold px-4 py-2.5">Contacto</th>
                    <th className="text-left text-[11px] uppercase tracking-wider font-semibold px-4 py-2.5">Email</th>
                    <th className="text-left text-[11px] uppercase tracking-wider font-semibold px-4 py-2.5">Proyectos</th>
                    <th className="text-left text-[11px] uppercase tracking-wider font-semibold px-4 py-2.5">Estado</th>
                    <th className="text-right text-[11px] uppercase tracking-wider font-semibold px-4 py-2.5 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {gcProfiles.map((gc: any, i: number) => {
                    const gcAccess = gcAccessMap[gc.user_id] || [];
                    const isSelf = gc.user_id === currentUser?.id;
                    return (
                      <tr
                        key={gc.id}
                        onClick={() => { setSelectedGc(gc); setIsNewGc(false); }}
                        className={`border-t border-gray-100 cursor-pointer hover:bg-[rgba(224,123,57,0.05)] transition-colors group ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                      >
                        <td className="px-4 py-2 text-[12px] font-medium text-[#0F1B2D]">{gc.company_name}</td>
                        <td className="px-4 py-2 text-[12px] text-gray-600">{gc.license_number || "—"}</td>
                        <td className="px-4 py-2 text-[12px] text-gray-600">{gc.contact_name || "—"}</td>
                        <td className="px-4 py-2 text-[12px] text-gray-600">{gc.email}</td>
                        <td className="px-4 py-2 text-[12px]">
                          {gcAccess.length > 0 ? (
                            <span className="text-[#E07B39] font-medium">{gcAccess.length} proyecto(s)</span>
                          ) : (
                            <span className="text-gray-400 text-[11px]">Sin asignar</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${gc.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                            {gc.status === "active" ? "Activo" : gc.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          {!isSelf && (
                            <button
                              onClick={(e) => handleDeleteClick(e, {
                                id: gc.user_id,
                                name: gc.company_name || gc.contact_name || "—",
                                email: gc.email,
                                role: "gc",
                              })}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                              title="Eliminar contratista"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Side Panels */}
      <ClientSidePanel
        open={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        user={selectedClient}
        onSaved={() => { fetchData(); }}
      />
      <TeamSidePanel
        open={!!selectedTeam}
        onClose={() => setSelectedTeam(null)}
        user={selectedTeam}
        currentRole={selectedTeam ? (roles[selectedTeam.id] || "viewer") : "viewer"}
        onSaved={() => { fetchData(); setSelectedTeam(null); }}
      />
      <GcSidePanel
        open={!!selectedGc || isNewGc}
        onClose={() => { setSelectedGc(null); setIsNewGc(false); }}
        gcProfile={selectedGc}
        isNew={isNewGc}
        onSaved={() => { fetchData(); setSelectedGc(null); setIsNewGc(false); }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[15px]">
              <span>⚠️</span> Eliminar usuario
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-[13px]">
                  ¿Estás seguro de que deseas eliminar a <strong>{deleteTarget?.name}</strong>?
                </p>
                <p className="text-[12px] text-gray-500">{deleteTarget?.email}</p>
                <ul className="text-[12px] text-gray-600 space-y-1 list-disc pl-4">
                  <li>Revoca su acceso inmediatamente</li>
                  <li>Elimina su perfil del sistema</li>
                  <li>No elimina datos del proyecto</li>
                </ul>
                <p className="text-[12px] text-red-600 font-medium">Esta acción no se puede deshacer.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="text-[12px]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white text-[12px]"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              {deleting ? "Eliminando..." : "Eliminar usuario"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const UserTable = ({
  users,
  roles,
  accessMap,
  showAccess = false,
  currentUserId,
  canDelete,
  onDeleteClick,
  onRowClick,
}: {
  users: Profile[];
  roles: Record<string, string>;
  accessMap: Record<string, UserProjectAccess[]>;
  showAccess?: boolean;
  currentUserId?: string;
  canDelete: (userId: string) => boolean;
  onDeleteClick: (e: React.MouseEvent, target: DeleteTarget) => void;
  onRowClick?: (user: Profile) => void;
}) => {
  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-[13px]">
        No hay usuarios en esta categoría
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-[#0F1B2D] text-white">
            <th className="text-left text-[11px] uppercase tracking-wider font-semibold px-4 py-2.5">Nombre</th>
            <th className="text-left text-[11px] uppercase tracking-wider font-semibold px-4 py-2.5">Email</th>
            <th className="text-left text-[11px] uppercase tracking-wider font-semibold px-4 py-2.5">Empresa</th>
            <th className="text-left text-[11px] uppercase tracking-wider font-semibold px-4 py-2.5">Teléfono</th>
            <th className="text-left text-[11px] uppercase tracking-wider font-semibold px-4 py-2.5">Estado</th>
            {showAccess && (
              <th className="text-left text-[11px] uppercase tracking-wider font-semibold px-4 py-2.5">Proyectos</th>
            )}
            <th className="text-left text-[11px] uppercase tracking-wider font-semibold px-4 py-2.5">Rol</th>
            <th className="text-right text-[11px] uppercase tracking-wider font-semibold px-4 py-2.5 w-16"></th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, i) => {
            const access = accessMap[user.id] || [];
            const status = user.status || "active";
            const isSelf = user.id === currentUserId;
            const deletable = canDelete(user.id);
            return (
              <tr
                key={user.id}
                onClick={() => onRowClick?.(user)}
                className={`border-t border-gray-100 cursor-pointer hover:bg-[rgba(13,115,119,0.05)] transition-colors group ${
                  i % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}
              >
                <td className="px-4 py-2 text-[12px] font-medium text-[#0F1B2D]">
                  {user.full_name || "—"}
                </td>
                <td className="px-4 py-2 text-[12px] text-gray-600">{user.email || "—"}</td>
                <td className="px-4 py-2 text-[12px] text-gray-600">{user.company || "—"}</td>
                <td className="px-4 py-2 text-[12px] text-gray-600">{user.phone || "—"}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-block text-[10px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded-full ${
                      status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {status === "active" ? "Activo" : status}
                  </span>
                </td>
                {showAccess && (
                  <td className="px-4 py-2 text-[12px] text-gray-600">
                    {access.length > 0 ? (
                      <span className="text-[#0D7377] font-medium">{access.length} proyecto(s)</span>
                    ) : (
                      <span className="text-orange-500 text-[11px]">Sin acceso</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-2">
                  <span className="text-[10px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded-full bg-[rgba(13,115,119,0.1)] text-[#0D7377]">
                    {roles[user.id] || "user"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  {!isSelf && deletable && (
                    <button
                      onClick={(e) => onDeleteClick(e, {
                        id: user.id,
                        name: user.full_name || "—",
                        email: user.email || "—",
                      })}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                      title="Eliminar usuario"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default UsuariosSection;
