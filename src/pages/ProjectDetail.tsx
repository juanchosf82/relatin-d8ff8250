import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, AlertTriangle, FileText, ExternalLink, Calendar, AlertCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import ProjectQuickLinks from '@/components/portal/ProjectQuickLinks';
import ProjectMapEmbed from '@/components/portal/ProjectMapEmbed';

type Project = Tables<'projects'>;
type SovLine = Tables<'sov_lines'>;
type CashflowRow = Tables<'cashflow'>;
type Draw = Tables<'draws'>;
type Document = Tables<'documents'>;

const fmt = (n: number | null) =>
  n != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n) : '—';

const drawStatusColors: Record<string, string> = {
  pending: 'bg-gray-400 text-white',
  review: 'bg-amber-500 text-white',
  sent: 'bg-[hsl(190,95%,45%)] text-white',
  paid: 'bg-green-500 text-white',
};

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [sovLines, setSovLines] = useState<SovLine[]>([]);
  const [cashflow, setCashflow] = useState<CashflowRow[]>([]);
  const [draws, setDraws] = useState<Draw[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [issuesCount, setIssuesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      setLoading(true);
      const [projRes, sovRes, cfRes, drawRes, docRes, issuesRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).single(),
        supabase.from('sov_lines').select('*').eq('project_id', id).order('line_number'),
        supabase.from('cashflow').select('*').eq('project_id', id).order('week_order'),
        supabase.from('draws').select('*').eq('project_id', id).order('draw_number'),
        supabase.from('documents').select('*').eq('project_id', id).eq('visible_to_client', true),
        supabase.from('issues').select('id', { count: 'exact', head: true }).eq('project_id', id).eq('status', 'open'),
      ]);
      setProject(projRes.data);
      setSovLines(sovRes.data ?? []);
      setCashflow(cfRes.data ?? []);
      setDraws(drawRes.data ?? []);
      setDocs(docRes.data ?? []);
      setIssuesCount(issuesRes.count ?? 0);
      setLoading(false);
    };
    load();
  }, [user, id]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(190,95%,45%)]" /></div>;
  }

  if (!project) {
    return <p className="text-center text-muted-foreground py-16">Proyecto no encontrado.</p>;
  }

  const eacWarning = (project.eac ?? 0) > (project.loan_amount ?? 0);

  // Calculate budget progress from sov_lines
  const _totalBudget = sovLines.reduce((s, l) => s + (l.budget ?? 0), 0);
  const budgetProgressSum = sovLines.reduce((s, l) => s + (l.budget_progress_pct ?? 0), 0);

  const docsByCategory = docs.reduce<Record<string, Document[]>>((acc, d) => {
    const cat = d.category ?? 'General';
    (acc[cat] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/portal')} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver
      </Button>

      {/* Two-column project header */}
      <div className="rounded-xl bg-[hsl(220,60%,18%)] text-white p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT COLUMN — 60% */}
          <div className="lg:col-span-3 space-y-4">
            <div>
              <h1 className="text-2xl font-bold">{project.code}</h1>
              <p className="text-white/70 text-sm">{project.address}</p>
              {project.gc_name && <p className="text-white/50 text-xs mt-1">GC: {project.gc_name}</p>}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className={project.permit_status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}>
                Permiso: {project.permit_status}
              </Badge>
              {(project.liens_count ?? 0) > 0 && (
                <Badge className="bg-red-500/20 text-red-300">{project.liens_count} Liens</Badge>
              )}
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <KPI label="Av. Físico" value={`${project.progress_pct ?? 0}%`} />
              <KPI label="Av. Presupuesto" value={`${Math.round(budgetProgressSum)}%`} className="text-orange-400" />
              <KPI label="Loan Amount" value={fmt(project.loan_amount)} />
              <KPI label="EAC" value={fmt(project.eac)} className={eacWarning ? 'text-orange-400' : ''} />
              <KPI label="CO Target" value={project.co_target_date ?? '—'} />
            </div>

            {/* Progress bars */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-white/50 text-[10px] mb-1">Avance Físico</p>
                <Progress value={project.progress_pct ?? 0} className="h-2 bg-white/20" />
              </div>
              <div>
                <p className="text-white/50 text-[10px] mb-1">Avance Presupuesto</p>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.min(budgetProgressSum, 100)}%` }} />
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <p className="text-white/50 text-[10px] mb-1.5">Enlaces del Proyecto</p>
              <ProjectQuickLinks projectId={project.id} />
            </div>
          </div>

          {/* RIGHT COLUMN — 40% */}
          <div className="lg:col-span-2 space-y-4">
            <ProjectMapEmbed address={project.address} />

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-white/50 text-[10px] mb-1">
                  <Calendar className="h-3 w-3" /> Última Visita
                </div>
                <p className="text-sm font-medium">{project.last_visit_date ?? '—'}</p>
              </div>
              <div className={`rounded-lg p-3 ${issuesCount > 0 ? 'bg-red-500/20' : 'bg-white/10'}`}>
                <div className="flex items-center gap-1.5 text-white/50 text-[10px] mb-1">
                  <AlertCircle className="h-3 w-3" /> Issues Abiertos
                </div>
                <p className={`text-sm font-bold ${issuesCount > 0 ? 'text-red-300' : ''}`}>{issuesCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sov">
        <TabsList className="bg-white border">
          <TabsTrigger value="sov">Avance SOV</TabsTrigger>
          <TabsTrigger value="financiero">Financiero</TabsTrigger>
          <TabsTrigger value="draws">Draws</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="sov">
          <SovTab sovLines={sovLines} />
        </TabsContent>

        <TabsContent value="financiero">
          <FinancieroTab project={project} cashflow={cashflow} eacWarning={eacWarning} />
        </TabsContent>

        <TabsContent value="draws">
          <DrawsTab draws={draws} />
        </TabsContent>

        <TabsContent value="documentos">
          <DocumentosTab docsByCategory={docsByCategory} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ── Sub-components ── */

const KPI = ({ label, value, className }: { label: string; value: string; className?: string }) => (
  <div>
    <p className="text-white/50 text-[10px]">{label}</p>
    <p className={`text-base font-bold ${className ?? ''}`}>{value}</p>
  </div>
);

const FinRow = ({ label, value, className }: { label: string; value: string; className?: string }) => (
  <div className="flex justify-between">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={`text-sm font-medium ${className ?? ''}`}>{value}</span>
  </div>
);

const SovTab = ({ sovLines }: { sovLines: SovLine[] }) => {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">#</TableHead>
              <TableHead>Partida</TableHead>
              <TableHead className="text-right">Presupuesto</TableHead>
              <TableHead className="w-48">Avance</TableHead>
              <TableHead className="text-right w-20">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sovLines.map((line) => {
              const pct = line.progress_pct ?? 0;
              const color = pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-[hsl(190,95%,45%)]' : 'bg-gray-300';
              return (
                <TableRow key={line.id}>
                  <TableCell className="font-mono text-xs">{line.line_number}</TableCell>
                  <TableCell>{line.name}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(line.budget)}</TableCell>
                  <TableCell>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{pct}%</TableCell>
                </TableRow>
              );
            })}
            {sovLines.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin partidas</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const FinancieroTab = ({ project, cashflow, eacWarning }: { project: Project; cashflow: CashflowRow[]; eacWarning: boolean }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <h3 className="font-semibold text-[hsl(220,60%,18%)] mb-4">Resumen Financiero</h3>
        <div className="space-y-3">
          <FinRow label="Loan Amount" value={fmt(project.loan_amount)} />
          <FinRow label="Ejecutado (EAC)" value={fmt(project.eac)} className={eacWarning ? 'text-orange-500 font-bold' : ''} />
          <FinRow label="Disponible" value={fmt((project.loan_amount ?? 0) - (project.eac ?? 0))} />
          <FinRow label="CO Target Date" value={project.co_target_date ?? '—'} />
        </div>
      </CardContent>
    </Card>
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        <h3 className="font-semibold text-[hsl(220,60%,18%)] p-5 pb-2">Cashflow</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Semana</TableHead>
              <TableHead className="text-right">Ingresos</TableHead>
              <TableHead className="text-right">Egresos</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cashflow.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.week_label}</TableCell>
                <TableCell className="text-right text-green-600 font-mono">{fmt(c.inflows)}</TableCell>
                <TableCell className="text-right text-red-500 font-mono">{fmt(c.outflows)}</TableCell>
                <TableCell className="text-right font-mono flex items-center justify-end gap-1">
                  {(c.balance ?? 0) < 10000 && <AlertTriangle className="h-3 w-3 text-red-500" />}
                  {fmt(c.balance)}
                </TableCell>
              </TableRow>
            ))}
            {cashflow.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sin datos</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
);

const DrawsTab = ({ draws }: { draws: Draw[] }) => (
  <Card className="border-0 shadow-sm">
    <CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">#</TableHead>
            <TableHead>Fecha Solicitud</TableHead>
            <TableHead className="text-right">Monto Certificado</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Certificado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {draws.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-mono">{d.draw_number}</TableCell>
              <TableCell>{d.request_date}</TableCell>
              <TableCell className="text-right font-mono">{fmt(d.amount_certified)}</TableCell>
              <TableCell>
                <Badge className={drawStatusColors[d.status ?? 'pending'] ?? drawStatusColors.pending}>
                  {d.status}
                </Badge>
              </TableCell>
              <TableCell>
                {d.status === 'paid' && d.certificate_url ? (
                  <a href={d.certificate_url} target="_blank" rel="noopener noreferrer" className="text-[hsl(190,95%,45%)] hover:underline text-sm flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> Ver
                  </a>
                ) : '—'}
              </TableCell>
            </TableRow>
          ))}
          {draws.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin draws</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

const DocumentosTab = ({ docsByCategory }: { docsByCategory: Record<string, Document[]> }) => (
  Object.keys(docsByCategory).length === 0 ? (
    <p className="text-muted-foreground text-sm py-8 text-center">Sin documentos disponibles.</p>
  ) : (
    <div className="space-y-4">
      {Object.entries(docsByCategory).map(([cat, items]) => (
        <Card key={cat} className="border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="font-semibold text-[hsl(220,60%,18%)] mb-3">{cat}</h3>
            <div className="divide-y">
              {items.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{doc.name}</span>
                  </div>
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-[hsl(190,95%,45%)] hover:underline text-sm flex items-center gap-1">
                      Ver PDF <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
);


export default ProjectDetail;
