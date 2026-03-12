import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Plus, FileText, Loader2, Pencil, Trash2, Download, Search, X, Upload } from "lucide-react";
import { TH_CLASS, TD_CLASS, TR_HOVER, TR_STRIPE, fmt, BTN_SUCCESS } from "@/lib/design-system";
import FileUploadSource from "@/components/FileUploadSource";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import * as XLSX from "xlsx";

interface BookkeepingEntry {
  id: string;
  project_id: string | null;
  entry_date: string;
  entry_type: string;
  category: string;
  subcategory: string | null;
  description: string;
  vendor_payee: string | null;
  amount: number;
  payment_method: string | null;
  reference_number: string | null;
  file_url: string | null;
  file_filename: string | null;
  extraction_method: string | null;
  linked_draw_id: string | null;
  linked_invoice_id: string | null;
  linked_wire_id: string | null;
  status: string | null;
  notes: string | null;
  visible_to_client: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

const EXPENSE_CATEGORIES = [
  { value: "construction", label: "🏗 Construcción", color: "#0D7377" },
  { value: "soft_costs", label: "📋 Costos Soft", color: "#6366F1" },
  { value: "permits", label: "📜 Permisos", color: "#F59E0B" },
  { value: "closing_costs", label: "🏛 Costos de cierre", color: "#8B5CF6" },
  { value: "financing", label: "🏦 Financiamiento", color: "#E07B39" },
  { value: "insurance", label: "🛡 Seguros", color: "#EC4899" },
  { value: "marketing", label: "📣 Marketing", color: "#14B8A6" },
  { value: "operating", label: "⚙️ Operativos", color: "#64748B" },
  { value: "other_expense", label: "📦 Otros gastos", color: "#9CA3AF" },
];

const INCOME_CATEGORIES = [
  { value: "draw_bank", label: "🏦 Draw del banco", color: "#16A34A" },
  { value: "equity", label: "💰 Equity", color: "#0D7377" },
  { value: "other_income", label: "💵 Otros ingresos", color: "#6366F1" },
];

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
const getCatInfo = (val: string) => ALL_CATEGORIES.find(c => c.value === val) || { label: val, color: "#9CA3AF" };

const emptyForm = {
  entry_date: new Date().toISOString().slice(0, 10),
  entry_type: "expense",
  category: "construction",
  subcategory: "",
  description: "",
  vendor_payee: "",
  amount: "",
  payment_method: "",
  reference_number: "",
  notes: "",
  visible_to_client: true,
  linked_draw_id: "",
  linked_invoice_id: "",
  linked_wire_id: "",
};

const BookkeepingAdmin = ({ projectId }: { projectId: string }) => {
  const [entries, setEntries] = useState<BookkeepingEntry[]>([]);
  const [draws, setDraws] = useState<{ id: string; draw_number: number }[]>([]);
  const [invoices, setInvoices] = useState<{ id: string; invoice_number: string | null }[]>([]);
  const [wires, setWires] = useState<{ id: string; wire_number: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedFields, setExtractedFields] = useState<Set<string>>(new Set());
  const [confidence, setConfidence] = useState<string | null>(null);
  const [extractionMethod, setExtractionMethod] = useState("manual");
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "monthly">("list");

  const load = async () => {
    setLoading(true);
    const [eRes, dRes, iRes, wRes] = await Promise.all([
      supabase.from("bookkeeping_entries").select("*").eq("project_id", projectId).order("entry_date", { ascending: false }),
      supabase.from("draws").select("id, draw_number").eq("project_id", projectId).order("draw_number"),
      supabase.from("gc_invoices").select("id, invoice_number").eq("project_id", projectId),
      supabase.from("developer_wires").select("id, wire_number").eq("project_id", projectId),
    ]);
    setEntries((eRes.data ?? []) as BookkeepingEntry[]);
    setDraws(dRes.data ?? []);
    setInvoices(iRes.data ?? []);
    setWires((wRes.data ?? []) as { id: string; wire_number: string | null }[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectId]);

  const filtered = useMemo(() => {
    let result = entries;
    if (filterType === "income") result = result.filter(e => e.entry_type === "income");
    else if (filterType === "expense") result = result.filter(e => e.entry_type === "expense");
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.description.toLowerCase().includes(q) ||
        (e.vendor_payee || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [entries, filterType, searchQuery]);

  const totalIncome = useMemo(() => filtered.filter(e => e.entry_type === "income").reduce((s, e) => s + e.amount, 0), [filtered]);
  const totalExpense = useMemo(() => filtered.filter(e => e.entry_type === "expense").reduce((s, e) => s + e.amount, 0), [filtered]);
  const netBalance = totalIncome - totalExpense;
  const incomeCount = filtered.filter(e => e.entry_type === "income").length;
  const expenseCount = filtered.filter(e => e.entry_type === "expense").length;

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.filter(e => e.entry_type === "expense").forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).map(([cat, amount]) => ({
      name: getCatInfo(cat).label,
      value: amount,
      color: getCatInfo(cat).color,
    })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const topCategories = useMemo(() => expenseByCategory.slice(0, 3), [expenseByCategory]);

  // Monthly grouping
  const monthlyGroups = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
    const groups: Record<string, BookkeepingEntry[]> = {};
    sorted.forEach(e => {
      const key = e.entry_date.slice(0, 7);
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const monthlyChartData = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    entries.forEach(e => {
      const key = e.entry_date.slice(0, 7);
      if (!map[key]) map[key] = { income: 0, expense: 0 };
      if (e.entry_type === "income") map[key].income += e.amount;
      else map[key].expense += e.amount;
    });
    let cumulative = 0;
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => {
      cumulative += data.income - data.expense;
      const d = new Date(month + "-01");
      return {
        month: d.toLocaleDateString("es", { month: "short", year: "2-digit" }),
        balance: cumulative,
      };
    });
  }, [entries]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleUploadExtract = async (file: File) => {
    setPendingFile(file);
    setExtracting(true);
    setExtractedFields(new Set());
    setConfidence(null);
    setExtractionMethod("manual");
    setForm({ ...emptyForm });
    setEditingId(null);
    setFormOpen(true);

    try {
      const base64 = await fileToBase64(file);
      const fileType = file.type.includes("pdf") ? "pdf" : "image";

      const { data, error } = await supabase.functions.invoke("extract-receipt", {
        body: { file_base64: base64, file_type: fileType, project_id: projectId },
      });

      if (error || data?.error) {
        toast.error("⚠️ No se pudo extraer automáticamente. Completa los datos manualmente.");
        setExtracting(false);
        return;
      }

      const fields = new Set<string>();
      const newForm = { ...emptyForm };

      if (data.entry_date) { newForm.entry_date = data.entry_date; fields.add("entry_date"); }
      if (data.entry_type) { newForm.entry_type = data.entry_type; fields.add("entry_type"); }
      if (data.description) { newForm.description = data.description; fields.add("description"); }
      if (data.vendor_payee) { newForm.vendor_payee = data.vendor_payee; fields.add("vendor_payee"); }
      if (data.amount != null) { newForm.amount = String(data.amount); fields.add("amount"); }
      if (data.payment_method) { newForm.payment_method = data.payment_method; fields.add("payment_method"); }
      if (data.reference_number) { newForm.reference_number = data.reference_number; fields.add("reference_number"); }
      if (data.suggested_category) {
        const match = ALL_CATEGORIES.find(c => c.value === data.suggested_category);
        if (match) { newForm.category = match.value; fields.add("category"); }
      }

      setForm(newForm);
      setExtractedFields(fields);
      setConfidence(data.confidence || "medium");
      setExtractionMethod(fileType === "pdf" ? "pdf_auto" : "image_auto");
    } catch {
      toast.error("⚠️ Error de extracción. Completa manualmente.");
    }
    setExtracting(false);
  };

  const openManualEntry = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setPendingFile(null);
    setExtractedFields(new Set());
    setConfidence(null);
    setExtractionMethod("manual");
    setFormOpen(true);
  };

  const openEdit = (entry: BookkeepingEntry) => {
    setEditingId(entry.id);
    setForm({
      entry_date: entry.entry_date,
      entry_type: entry.entry_type,
      category: entry.category,
      subcategory: entry.subcategory || "",
      description: entry.description,
      vendor_payee: entry.vendor_payee || "",
      amount: String(entry.amount),
      payment_method: entry.payment_method || "",
      reference_number: entry.reference_number || "",
      notes: entry.notes || "",
      visible_to_client: entry.visible_to_client ?? true,
      linked_draw_id: entry.linked_draw_id || "",
      linked_invoice_id: entry.linked_invoice_id || "",
      linked_wire_id: entry.linked_wire_id || "",
    });
    setPendingFile(null);
    setExtractedFields(new Set());
    setConfidence(null);
    setExtractionMethod(entry.extraction_method || "manual");
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.description || !form.amount || !form.entry_date) {
      toast.error("Fecha, descripción y monto son requeridos.");
      return;
    }
    setUploading(true);

    let fileUrl = editingId ? entries.find(e => e.id === editingId)?.file_url || null : null;
    let fileFilename = editingId ? entries.find(e => e.id === editingId)?.file_filename || null : null;

    if (pendingFile) {
      const path = `bookkeeping/${projectId}/${Date.now()}_${pendingFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("project_files").upload(path, pendingFile);
      if (uploadErr) { toast.error("Error subiendo archivo"); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from("project_files").getPublicUrl(path);
      fileUrl = urlData.publicUrl;
      fileFilename = pendingFile.name;
    }

    const record: any = {
      project_id: projectId,
      entry_date: form.entry_date,
      entry_type: form.entry_type,
      category: form.category,
      subcategory: form.subcategory || null,
      description: form.description,
      vendor_payee: form.vendor_payee || null,
      amount: parseFloat(form.amount),
      payment_method: form.payment_method || null,
      reference_number: form.reference_number || null,
      file_url: fileUrl,
      file_filename: fileFilename,
      extraction_method: extractionMethod,
      linked_draw_id: form.linked_draw_id || null,
      linked_invoice_id: form.linked_invoice_id || null,
      linked_wire_id: form.linked_wire_id || null,
      notes: form.notes || null,
      visible_to_client: form.visible_to_client,
    };

    if (editingId) {
      const { error } = await supabase.from("bookkeeping_entries").update(record).eq("id", editingId);
      if (error) { toast.error("Error al actualizar"); setUploading(false); return; }
      toast.success("✓ Entrada actualizada");
    } else {
      const { error } = await supabase.from("bookkeeping_entries").insert([record]);
      if (error) { toast.error("Error al guardar"); setUploading(false); return; }
      toast.success("✓ Entrada guardada");
    }

    setFormOpen(false);
    setUploading(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("bookkeeping_entries").delete().eq("id", deleteId);
    toast.success("Entrada eliminada");
    setDeleteId(null);
    load();
  };

  const handleExport = () => {
    const data = filtered.map(e => ({
      Fecha: e.entry_date,
      Tipo: e.entry_type === "income" ? "Ingreso" : "Gasto",
      Categoría: getCatInfo(e.category).label,
      Descripción: e.description,
      "Vendor/Pagador": e.vendor_payee || "",
      Monto: e.entry_type === "income" ? e.amount : -e.amount,
      "Método Pago": e.payment_method || "",
      Referencia: e.reference_number || "",
    }));
    const catSummary = expenseByCategory.map(c => ({
      Categoría: c.name,
      Total: c.value,
      "%": totalExpense > 0 ? Math.round(c.value / totalExpense * 100) : 0,
    }));
    const monthlySummary = monthlyGroups.map(([month, items]) => {
      const inc = items.filter(e => e.entry_type === "income").reduce((s, e) => s + e.amount, 0);
      const exp = items.filter(e => e.entry_type === "expense").reduce((s, e) => s + e.amount, 0);
      return { Mes: month, Ingresos: inc, Gastos: exp, Balance: inc - exp };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Transacciones");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(catSummary), "Por Categoría");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthlySummary), "Por Mes");
    XLSX.writeFile(wb, `bookkeeping_${projectId.slice(0, 8)}.xlsx`);
  };

  const categories = form.entry_type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const AutoBadge = ({ field }: { field: string }) =>
    extractedFields.has(field) ? <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#E8F4F4] text-[#0D7377] text-[9px] font-medium">🤖 Auto</span> : null;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#0D7377]" /></div>;

  // Running balance for sorted entries
  const sortedForBalance = [...filtered].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const runningBalances: Record<string, number> = {};
  let cumBal = 0;
  sortedForBalance.forEach(e => {
    cumBal += e.entry_type === "income" ? e.amount : -e.amount;
    runningBalances[e.id] = cumBal;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[#0F1B2D]">Bookkeeping del Proyecto</h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleExport} variant="outline" className="h-8 text-[11px]">
            <Download className="h-3.5 w-3.5 mr-1" /> Exportar
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={openManualEntry}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Entrada manual
          </Button>
          <Button size="sm" className={`h-8 text-[11px] ${BTN_SUCCESS}`} onClick={() => {
            setEditingId(null);
            setForm({ ...emptyForm });
            setPendingFile(null);
            setExtractedFields(new Set());
            setConfidence(null);
            setExtractionMethod("manual");
            setFormOpen(true);
          }}>
            <Upload className="h-3.5 w-3.5 mr-1" /> Subir comprobante
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-[10px] uppercase text-gray-400 mb-1">💰 Ingresos totales</p>
          <p className="text-[18px] font-bold text-green-600">{fmt(totalIncome)}</p>
          <p className="text-[10px] text-gray-400">{incomeCount} entradas</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-[10px] uppercase text-gray-400 mb-1">💸 Gastos totales</p>
          <p className="text-[18px] font-bold text-red-600">{fmt(totalExpense)}</p>
          <p className="text-[10px] text-gray-400">{expenseCount} entradas</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-[10px] uppercase text-gray-400 mb-1">📊 Balance neto</p>
          <p className={`text-[18px] font-bold ${netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(netBalance)}</p>
        </div>
      </div>

      {/* Top 3 expense categories */}
      {topCategories.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {topCategories.map(cat => (
            <div key={cat.name} className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-[10px] text-gray-400 mb-1">{cat.name}</p>
              <p className="text-[14px] font-bold" style={{ color: cat.color }}>{fmt(cat.value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Donut chart */}
      {expenseByCategory.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-[12px] font-semibold text-[#0F1B2D] mb-3">Desglose de gastos por categoría</p>
          <div className="flex items-center gap-6">
            <div className="w-48 h-48">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={expenseByCategory} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {expenseByCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5">
              {expenseByCategory.map(cat => (
                <div key={cat.name} className="flex items-center gap-2 text-[11px]">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cat.color }} />
                  <span className="flex-1">{cat.name}</span>
                  <span className="font-mono font-medium">{fmt(cat.value)}</span>
                  <span className="text-gray-400 w-10 text-right">{totalExpense > 0 ? Math.round(cat.value / totalExpense * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters + view toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar descripción/vendor" className="pl-8 h-9 text-[12px]" />
        </div>
        <div className="flex gap-1">
          {[
            { v: "all", l: "📋 Todas" },
            { v: "income", l: "💰 Ingresos" },
            { v: "expense", l: "💸 Gastos" },
          ].map(t => (
            <button key={t.v} onClick={() => setFilterType(t.v)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${filterType === t.v ? "bg-[#0F1B2D] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >{t.l}</button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          <button onClick={() => setViewMode("list")} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${viewMode === "list" ? "bg-[#0F1B2D] text-white" : "bg-gray-100 text-gray-600"}`}>📋 Línea por línea</button>
          <button onClick={() => setViewMode("monthly")} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${viewMode === "monthly" ? "bg-[#0F1B2D] text-white" : "bg-gray-100 text-gray-600"}`}>📅 Por mes</button>
        </div>
      </div>

      {/* Transaction Table or Monthly View */}
      {viewMode === "list" ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  <th className={TH_CLASS}>Fecha</th>
                  <th className={TH_CLASS}>Tipo</th>
                  <th className={TH_CLASS}>Categoría</th>
                  <th className={TH_CLASS}>Descripción</th>
                  <th className={TH_CLASS}>Vendor</th>
                  <th className={`${TH_CLASS} text-right`}>Monto</th>
                  <th className={TH_CLASS}>Comprobante</th>
                  <th className={TH_CLASS}>Vinculado</th>
                  <th className={`${TH_CLASS} text-right`}>Balance</th>
                  <th className={TH_CLASS}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, idx) => {
                  const cat = getCatInfo(e.category);
                  return (
                    <tr key={e.id} className={`${TR_STRIPE(idx)} ${TR_HOVER} border-b border-gray-100 ${e.entry_type === "income" ? "bg-green-50/50" : ""}`}>
                      <td className={TD_CLASS}>{e.entry_date}</td>
                      <td className={TD_CLASS}>
                        <Badge className={e.entry_type === "income" ? "bg-green-100 text-green-700 border-0 text-[10px]" : "bg-red-100 text-red-700 border-0 text-[10px]"}>
                          {e.entry_type === "income" ? "↑ Ingreso" : "↓ Gasto"}
                        </Badge>
                      </td>
                      <td className={TD_CLASS}>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white" style={{ backgroundColor: cat.color }}>
                          {cat.label}
                        </span>
                      </td>
                      <td className={`${TD_CLASS} max-w-[180px] truncate`}>{e.description}</td>
                      <td className={`${TD_CLASS} text-gray-500`}>{e.vendor_payee || "—"}</td>
                      <td className={`${TD_CLASS} text-right font-mono font-medium ${e.entry_type === "income" ? "text-green-600" : "text-red-600"}`}>
                        {e.entry_type === "income" ? "+" : "-"}{fmt(e.amount)}
                      </td>
                      <td className={TD_CLASS}>
                        {e.file_url ? (
                          <a href={e.file_url} target="_blank" rel="noopener noreferrer" className="text-[#0D7377] hover:underline"><FileText className="h-4 w-4" /></a>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className={TD_CLASS}>
                        {e.linked_draw_id && <Badge variant="outline" className="text-[9px] mr-1">Draw</Badge>}
                        {e.linked_invoice_id && <Badge variant="outline" className="text-[9px] mr-1">Invoice</Badge>}
                        {e.linked_wire_id && <Badge variant="outline" className="text-[9px]">Wire</Badge>}
                        {!e.linked_draw_id && !e.linked_invoice_id && !e.linked_wire_id && <span className="text-gray-300">—</span>}
                      </td>
                      <td className={`${TD_CLASS} text-right font-mono font-medium ${(runningBalances[e.id] ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {fmt(runningBalances[e.id] ?? 0)}
                      </td>
                      <td className={TD_CLASS}>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(e)} className="p-1 rounded hover:bg-gray-100"><Pencil className="h-3.5 w-3.5 text-gray-400" /></button>
                          <button onClick={() => setDeleteId(e.id)} className="p-1 rounded hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-8 text-gray-400">Sin entradas</td></tr>
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="bg-[#0F1B2D] text-white font-medium">
                    <td className="px-3 py-2" colSpan={5}>TOTAL</td>
                    <td className="px-3 py-2 text-right font-mono">
                      <span className="text-green-400">+{fmt(totalIncome)}</span>{" / "}
                      <span className="text-red-400">-{fmt(totalExpense)}</span>
                    </td>
                    <td colSpan={2}></td>
                    <td className={`px-3 py-2 text-right font-mono ${netBalance >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {fmt(netBalance)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {monthlyChartData.length > 1 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-[12px] font-semibold text-[#0F1B2D] mb-3">Balance acumulado por mes</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Area type="monotone" dataKey="balance" stroke="#0D7377" fill="#E8F4F4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <Accordion type="multiple" defaultValue={monthlyGroups.slice(0, 2).map(([m]) => m)}>
            {monthlyGroups.map(([month, items]) => {
              const inc = items.filter(e => e.entry_type === "income").reduce((s, e) => s + e.amount, 0);
              const exp = items.filter(e => e.entry_type === "expense").reduce((s, e) => s + e.amount, 0);
              const d = new Date(month + "-01");
              const label = d.toLocaleDateString("es", { month: "long", year: "numeric" });
              return (
                <AccordionItem key={month} value={month}>
                  <AccordionTrigger className="text-[12px] font-semibold text-[#0F1B2D] hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="capitalize">{label}</span>
                      <span className="text-green-600 font-mono">↑{fmt(inc)}</span>
                      <span className="text-red-600 font-mono">↓{fmt(exp)}</span>
                      <span className={`font-mono ${inc - exp >= 0 ? "text-green-600" : "text-red-600"}`}>Balance: {fmt(inc - exp)}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1">
                      {items.map(e => {
                        const cat = getCatInfo(e.category);
                        return (
                          <div key={e.id} className={`flex items-center gap-3 px-3 py-2 rounded text-[11px] ${e.entry_type === "income" ? "bg-green-50" : "bg-gray-50"}`}>
                            <span className="w-20 text-gray-500">{e.entry_date}</span>
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] text-white" style={{ backgroundColor: cat.color }}>{cat.label}</span>
                            <span className="flex-1 truncate">{e.description}</span>
                            <span className={`font-mono font-medium ${e.entry_type === "income" ? "text-green-600" : "text-red-600"}`}>
                              {e.entry_type === "income" ? "+" : "-"}{fmt(e.amount)}
                            </span>
                            <div className="flex gap-1">
                              <button onClick={() => openEdit(e)} className="p-0.5 hover:bg-gray-200 rounded"><Pencil className="h-3 w-3 text-gray-400" /></button>
                              <button onClick={() => setDeleteId(e.id)} className="p-0.5 hover:bg-red-100 rounded"><Trash2 className="h-3 w-3 text-red-400" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}

      {/* Entry Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar entrada" : "Nueva entrada"}</DialogTitle>
          </DialogHeader>

          {extracting ? (
            <div className="bg-[#0F1B2D] rounded-lg p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-3" />
              <p className="text-white font-medium text-[13px]">🔍 Extrayendo datos del comprobante...</p>
              <p className="text-white/60 text-[11px] mt-1">Analizando el documento</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* File upload area (for new entries without pending file) */}
              {!editingId && !pendingFile && (
                <div>
                  <Label className="text-[11px] text-gray-400">Comprobante (opcional)</Label>
                  <FileUploadSource accept="pdf+images" maxSizeMb={10} onFileSelected={handleUploadExtract} label="Adjuntar comprobante para extracción automática" />
                </div>
              )}

              {pendingFile && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#E8F4F4] rounded-lg text-[11px]">
                  <FileText className="h-4 w-4 text-[#0D7377]" />
                  <span className="font-medium text-[#0D7377]">{pendingFile.name}</span>
                  <button onClick={() => setPendingFile(null)} className="ml-auto"><X className="h-3.5 w-3.5 text-gray-400" /></button>
                </div>
              )}

              {/* Confidence */}
              {confidence && (
                <div className={`px-3 py-2 rounded-lg text-[11px] font-medium ${
                  confidence === "high" ? "bg-green-50 text-green-700" :
                  confidence === "medium" ? "bg-orange-50 text-orange-700" :
                  "bg-red-50 text-red-700"
                }`}>
                  {confidence === "high" ? "✓ Extracción confiable" :
                   confidence === "medium" ? "⚠️ Revisa los datos" :
                   "⚠️ Baja confianza — verifica todo"}
                </div>
              )}

              {/* Type */}
              <div>
                <Label className="text-[11px] text-gray-400">Tipo <AutoBadge field="entry_type" /></Label>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setForm({ ...form, entry_type: "expense", category: "construction" })}
                    className={`flex-1 py-2 rounded-lg text-[12px] font-medium border-2 transition-colors ${form.entry_type === "expense" ? "border-red-400 bg-red-50 text-red-700" : "border-gray-200 text-gray-500"}`}>
                    💸 Gasto
                  </button>
                  <button onClick={() => setForm({ ...form, entry_type: "income", category: "draw_bank" })}
                    className={`flex-1 py-2 rounded-lg text-[12px] font-medium border-2 transition-colors ${form.entry_type === "income" ? "border-green-400 bg-green-50 text-green-700" : "border-gray-200 text-gray-500"}`}>
                    💰 Ingreso
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-gray-400">Fecha <AutoBadge field="entry_date" /></Label>
                  <Input type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })}
                    className={`h-9 text-[12px] ${!extractedFields.has("entry_date") && extractedFields.size > 0 ? "bg-yellow-50" : ""}`} />
                </div>
                <div>
                  <Label className="text-[11px] text-gray-400">Categoría <AutoBadge field="category" /></Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-[11px] text-gray-400">Descripción <AutoBadge field="description" /></Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder={!extractedFields.has("description") && extractedFields.size > 0 ? "No encontrado — completar manualmente" : ""}
                  className={`h-9 text-[12px] ${!extractedFields.has("description") && extractedFields.size > 0 ? "bg-yellow-50" : ""}`} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-gray-400">Vendor/Pagador <AutoBadge field="vendor_payee" /></Label>
                  <Input value={form.vendor_payee} onChange={e => setForm({ ...form, vendor_payee: e.target.value })} className="h-9 text-[12px]" />
                </div>
                <div>
                  <Label className="text-[11px] text-gray-400">Monto <AutoBadge field="amount" /></Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                    className={`h-9 text-[12px] ${!extractedFields.has("amount") && extractedFields.size > 0 ? "bg-yellow-50" : ""}`} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-gray-400">Método pago <AutoBadge field="payment_method" /></Label>
                  <Input value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="h-9 text-[12px]" />
                </div>
                <div>
                  <Label className="text-[11px] text-gray-400">Referencia <AutoBadge field="reference_number" /></Label>
                  <Input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} className="h-9 text-[12px]" />
                </div>
              </div>

              {/* Link to existing records */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[11px] text-gray-400">Vincular Draw</Label>
                  <Select value={form.linked_draw_id || "none"} onValueChange={v => setForm({ ...form, linked_draw_id: v === "none" ? "" : v })}>
                    <SelectTrigger className="h-8 text-[11px]"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {draws.map(d => <SelectItem key={d.id} value={d.id}>Draw #{d.draw_number}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] text-gray-400">Vincular Invoice</Label>
                  <Select value={form.linked_invoice_id || "none"} onValueChange={v => setForm({ ...form, linked_invoice_id: v === "none" ? "" : v })}>
                    <SelectTrigger className="h-8 text-[11px]"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {invoices.map(i => <SelectItem key={i.id} value={i.id}>Inv {i.invoice_number || "—"}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] text-gray-400">Vincular Wire</Label>
                  <Select value={form.linked_wire_id || "none"} onValueChange={v => setForm({ ...form, linked_wire_id: v === "none" ? "" : v })}>
                    <SelectTrigger className="h-8 text-[11px]"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {wires.map(w => <SelectItem key={w.id} value={w.id}>Wire {w.wire_number || "—"}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-[11px] text-gray-400">Notas</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="text-[12px] min-h-[60px]" />
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={form.visible_to_client} onCheckedChange={v => setForm({ ...form, visible_to_client: v })} />
                <Label className="text-[11px]">Visible para cliente</Label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={uploading} className={`flex-1 ${BTN_SUCCESS}`}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {editingId ? "Guardar cambios" : "✓ Guardar entrada"}
                </Button>
                <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>¿Eliminar esta entrada?</DialogTitle></DialogHeader>
          <p className="text-[12px] text-gray-500">Esta acción no se puede deshacer.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="destructive" onClick={handleDelete} className="flex-1">Eliminar</Button>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookkeepingAdmin;
