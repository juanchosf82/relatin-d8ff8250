import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, BarChart3, AlertTriangle, Download } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Project = Tables<'projects'>;
type WeeklyReport = Tables<'weekly_reports'> & { projects?: { code: string } | null };

const statusColors: Record<string, string> = {
  on_track: 'bg-[hsl(190,95%,45%)] text-white',
  attention: 'bg-amber-500 text-white',
  critical: 'bg-red-500 text-white',
};

const PortalDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [openIssues, setOpenIssues] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [projRes, issuesRes, reportsRes] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('issues').select('id').eq('status', 'open'),
        supabase.from('weekly_reports').select('*, projects(code)').order('report_date', { ascending: false }).limit(5),
      ]);
      setProjects(projRes.data ?? []);
      setOpenIssues(issuesRes.data?.length ?? 0);
      setReports((reportsRes.data as WeeklyReport[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  const totalLoan = projects.reduce((s, p) => s + (p.loan_amount ?? 0), 0);
  const totalEac = projects.reduce((s, p) => s + (p.eac ?? 0), 0);
  const avgProgress = projects.length ? Math.round(projects.reduce((s, p) => s + (p.progress_pct ?? 0), 0) / projects.length) : 0;

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(190,95%,45%)]" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={DollarSign} label="Loan Total" value={fmt(totalLoan)} />
        <KPICard icon={TrendingUp} label="Ejecutado" value={fmt(totalEac)} />
        <KPICard icon={BarChart3} label="Avance Promedio" value={`${avgProgress}%`} />
        <KPICard icon={AlertTriangle} label="Issues Activos" value={String(openIssues)} accent={openIssues > 0} />
      </div>

      {/* Project Cards */}
      <div>
        <h2 className="text-lg font-semibold text-[hsl(220,60%,18%)] mb-3">Proyectos</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tienes proyectos asignados.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Card
                key={p.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm"
                onClick={() => navigate(`/portal/proyecto/${p.id}`)}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-[hsl(220,60%,18%)]">{p.code}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.address}</p>
                    </div>
                    <Badge className={statusColors[p.status ?? 'on_track'] ?? statusColors.on_track}>
                      {p.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Avance</span>
                      <span className="font-medium">{p.progress_pct ?? 0}%</span>
                    </div>
                    <Progress value={p.progress_pct ?? 0} className="h-2" />
                  </div>
                  {p.last_visit_date && (
                    <p className="text-xs text-muted-foreground">Última visita: {p.last_visit_date}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Reports */}
      {reports.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[hsl(220,60%,18%)] mb-3">Reportes Recientes</h2>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y">
                {reports.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        Semana {r.week_number} — {r.projects?.code}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.report_date} · {r.highlight_text}</p>
                    </div>
                    {r.pdf_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={r.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-1" /> PDF
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

const KPICard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) => (
  <Card className="border-0 shadow-sm">
    <CardContent className="p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent ? 'bg-red-100 text-red-600' : 'bg-[hsl(190,95%,45%)]/10 text-[hsl(190,95%,45%)]'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-[hsl(220,60%,18%)]">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default PortalDashboard;
