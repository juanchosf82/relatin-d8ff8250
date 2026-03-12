import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, UserX, HardHat } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ClientSidePanel from "@/components/admin/ClientSidePanel";
import TeamSidePanel from "@/components/admin/TeamSidePanel";
import GcSidePanel from "@/components/admin/GcSidePanel";

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

const UsuariosSection = () => {
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

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, accessRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("user_project_access").select("user_id, project_id, access_level"),
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
    setLoading(false);
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
        </TabsList>

        <TabsContent value="clientes">
          <UserTable
            users={clients}
            roles={roles}
            accessMap={accessMap}
            showAccess
            onRowClick={(u) => setSelectedClient(u)}
          />
        </TabsContent>

        <TabsContent value="equipo">
          <UserTable
            users={team}
            roles={roles}
            accessMap={accessMap}
            onRowClick={(u) => setSelectedTeam(u)}
          />
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
    </div>
  );
};

const UserTable = ({
  users,
  roles,
  accessMap,
  showAccess = false,
  onRowClick,
}: {
  users: Profile[];
  roles: Record<string, string>;
  accessMap: Record<string, UserProjectAccess[]>;
  showAccess?: boolean;
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
          </tr>
        </thead>
        <tbody>
          {users.map((user, i) => {
            const access = accessMap[user.id] || [];
            const status = user.status || "active";
            return (
              <tr
                key={user.id}
                onClick={() => onRowClick?.(user)}
                className={`border-t border-gray-100 cursor-pointer hover:bg-[rgba(13,115,119,0.05)] transition-colors ${
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default UsuariosSection;
