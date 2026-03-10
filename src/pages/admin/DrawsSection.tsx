import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  PAGE_TITLE, PAGE_SUBTITLE, TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE,
  DRAW_STATUS_BADGE, badgeClass, fmt, BTN_SUCCESS, BTN_PRIMARY, BTN_SECONDARY,
} from "@/lib/design-system";
import { sendNotification, getClientInfoForProject } from "@/lib/notifications";
import BankSovSetup from "@/components/admin/BankSovSetup";
import DrawPdfUpload from "@/components/admin/DrawPdfUpload";
import DrawComparison from "@/components/admin/DrawComparison";
import { Upload, Pencil, Bot, FileText } from "lucide-react";

const DrawsSection = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [draws, setDraws] = useState<any[]>([]);
  const [bankSovLines, setBankSovLines] = useState<any[]>([]);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  
  const [isPdfUploadOpen, setIsPdfUploadOpen] = useState(false);
  const [formData, setFormData] = useState({ draw_number: "", amount_requested: "", amount_certified: "", request_date: "", notes: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("draws");

  useEffect(() => { supabase.from("projects").select("id, code, address").then(({ data }) => { if (data) setProjects(data); }); }, []);

  const fetchDraws = useCallback(() => {
    if (selectedProjectId) {
      supabase.from("draws").select("*").eq("project_id", selectedProjectId).order("draw_number").then(({ data }) => { if (data) setDraws(data); });
    } else { setDraws([]); }
  }, [selectedProjectId]);

  const fetchBankSov = useCallback(() => {
    if (selectedProjectId) {
      supabase.from("bank_sov_lines").select("*").eq("project_id", selectedProjectId).order("line_number").then(({ data }) => { if (data) setBankSovLines(data); });
    } else { setBankSovLines([]); }
  }, [selectedProjectId]);

  useEffect(() => { fetchDraws(); fetchBankSov(); }, [fetchDraws, fetchBankSov]);

  const handleCreateDraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setUploading(true);
    try {
      let certificate_url = null;
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${selectedProjectId}-${Date.now()}.${fileExt}`;
        const { error: upErr } = await supabase.storage.from("project_files").upload(`draws/${fileName}`, file);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("project_files").getPublicUrl(`draws/${fileName}`);
        certificate_url = data.publicUrl;
      }
      const { error } = await supabase.from("draws").insert([{
        project_id: selectedProjectId, draw_number: parseInt(formData.draw_number),
        amount_requested: parseFloat(formData.amount_requested),
        amount_certified: formData.amount_certified ? parseFloat(formData.amount_certified) : null,
        request_date: formData.request_date, notes: formData.notes, certificate_url, status: "pending",
        source: "manual",
      }]);
      if (error) throw error;
      toast.success("Draw creado");
      setIsManualModalOpen(false);
      setFormData({ draw_number: "", amount_requested: "", amount_certified: "", request_date: "", notes: "" });
      setFile(null);
      fetchDraws();
    } catch (err: any) { toast.error("Error: " + err.message); }
    finally { setUploading(false); }
  };

  const handleStatusChange = async (drawId: string, newStatus: string) => {
    const draw = draws.find((d) => d.id === drawId);
    await supabase.from("draws").update({ status: newStatus }).eq("id", drawId);
    toast.success("Estado actualizado");
    fetchDraws();
    if (["review", "sent", "paid"].includes(newStatus) && selectedProjectId && draw) {
      const clientInfo = await getClientInfoForProject(selectedProjectId);
      if (clientInfo) {
        sendNotification({
          type: "draw_status_changed", to: clientInfo.email, userId: clientInfo.userId,
          projectId: selectedProjectId,
          subject: `Draw #${draw.draw_number} actualizado — ${clientInfo.projectCode}`,
          data: {
            client_name: clientInfo.clientName, project_code: clientInfo.projectCode,
            draw_number: String(draw.draw_number),
            amount: String(draw.amount_certified || draw.amount_requested || 0),
            status: newStatus, project_id: selectedProjectId,
          },
        });
      }
    }
  };

  const handlePdfDrawImported = () => {
    setIsPdfUploadOpen(false);
    fetchDraws();
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={PAGE_TITLE}>Draws</h2>
          <p className={PAGE_SUBTITLE}>Gestión de desembolsos y comparativo</p>
        </div>
      </div>

      <div className="w-full max-w-md">
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="bg-white"><SelectValue placeholder="Selecciona un proyecto" /></SelectTrigger>
          <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} - {p.address}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {selectedProjectId && (
        <>
          {/* Bank SOV Setup Banner */}
          <BankSovSetup
            projectId={selectedProjectId}
            bankSovLines={bankSovLines}
            onSaved={fetchBankSov}
          />

          {/* Sub-tabs */}
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
            <div className="flex items-center justify-between">
              <TabsList className="bg-white border border-gray-200">
                <TabsTrigger value="draws" className="text-[12px]">Draws</TabsTrigger>
                <TabsTrigger value="comparativo" className="text-[12px]">Comparativo mes a mes</TabsTrigger>
              </TabsList>
              {activeSubTab === "draws" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsPdfUploadOpen(true)}
                    disabled={bankSovLines.length === 0}
                    className={BTN_SUCCESS}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" /> Subir PDF
                  </Button>
                  <Button onClick={() => setIsManualModalOpen(true)} className={BTN_SECONDARY}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Manual
                  </Button>
                </div>
              )}
            </div>

            <TabsContent value="draws">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr>
                      <th className={TH_CLASS}>Nº</th>
                      <th className={TH_CLASS}>Fecha</th>
                      <th className={`${TH_CLASS} text-right`}>Solicitado</th>
                      <th className={`${TH_CLASS} text-right`}>Certificado</th>
                      <th className={TH_CLASS}>Origen</th>
                      <th className={TH_CLASS}>Archivo</th>
                      <th className={TH_CLASS}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draws.map((d, idx) => {
                      const status = DRAW_STATUS_BADGE[d.status ?? "pending"] || DRAW_STATUS_BADGE.pending;
                      const isPdf = d.source === "pdf";
                      return (
                        <tr key={d.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 transition-colors`}>
                          <td className={`${TD_CLASS} font-mono`}>#{d.draw_number}</td>
                          <td className={TD_CLASS}>{d.request_date}</td>
                          <td className={`${TD_CLASS} text-right font-mono`}>{fmt(d.amount_requested)}</td>
                          <td className={`${TD_CLASS} text-right font-mono`}>{d.amount_certified ? fmt(d.amount_certified) : "—"}</td>
                          <td className={TD_CLASS}>
                            {isPdf ? (
                              <Badge className="bg-[#E8F4F4] text-[#0D7377] border-0 text-[10px]">
                                <Bot className="h-3 w-3 mr-0.5" /> Auto-extraído
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px]">
                                <Pencil className="h-3 w-3 mr-0.5" /> Manual
                              </Badge>
                            )}
                          </td>
                          <td className={TD_CLASS}>
                            {(d.certificate_url || d.pdf_url) ? (
                              <a href={d.pdf_url || d.certificate_url} target="_blank" rel="noreferrer" className="text-[#0D7377] hover:underline text-[11px] flex items-center gap-1">
                                <FileText className="h-3 w-3" /> Ver
                              </a>
                            ) : "—"}
                          </td>
                          <td className={TD_CLASS}>
                            <Select value={d.status} onValueChange={(val) => handleStatusChange(d.id, val)}>
                              <SelectTrigger className="w-[120px] h-7 text-[11px] border-gray-200">
                                <Badge className={badgeClass(status.bg, status.text)}>{status.label}</Badge>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(DRAW_STATUS_BADGE).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                    {draws.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-[12px]">No hay draws</td></tr>}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="comparativo">
              <DrawComparison
                projectId={selectedProjectId}
                bankSovLines={bankSovLines}
                draws={draws}
              />
            </TabsContent>
          </Tabs>

          {/* PDF Upload Dialog */}
          <DrawPdfUpload
            open={isPdfUploadOpen}
            onOpenChange={setIsPdfUploadOpen}
            projectId={selectedProjectId}
            bankSovLines={bankSovLines}
            onImported={handlePdfDrawImported}
          />

          {/* Manual Draw Dialog */}
          <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Draw Manual</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateDraw} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-[11px] text-gray-400">Draw Nº</Label><Input type="number" required value={formData.draw_number} onChange={(e) => setFormData({ ...formData, draw_number: e.target.value })} /></div>
                  <div className="space-y-2"><Label className="text-[11px] text-gray-400">Fecha Solicitud</Label><Input type="date" required value={formData.request_date} onChange={(e) => setFormData({ ...formData, request_date: e.target.value })} /></div>
                  <div className="space-y-2"><Label className="text-[11px] text-gray-400">Monto Solicitado ($)</Label><Input type="number" required value={formData.amount_requested} onChange={(e) => setFormData({ ...formData, amount_requested: e.target.value })} /></div>
                  <div className="space-y-2"><Label className="text-[11px] text-gray-400">Monto Certificado ($)</Label><Input type="number" value={formData.amount_certified} onChange={(e) => setFormData({ ...formData, amount_certified: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label className="text-[11px] text-gray-400">Certificado / PDF</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
                <div className="space-y-2"><Label className="text-[11px] text-gray-400">Notas</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
                <Button type="submit" disabled={uploading} className={`w-full ${BTN_PRIMARY}`}>{uploading ? "Guardando..." : "Guardar Draw"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default DrawsSection;
