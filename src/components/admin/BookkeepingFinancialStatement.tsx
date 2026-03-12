import { useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface Entry {
  id: string;
  entry_date: string;
  entry_type: string;
  category: string;
  subcategory: string | null;
  description: string;
  vendor_payee: string | null;
  amount: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  entries: Entry[];
  projectName: string;
  projectAddress: string;
  gcName: string;
  dateFrom: string;
  dateTo: string;
}

const fmtD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const BookkeepingFinancialStatement = ({ open, onClose, entries, projectName, projectAddress, gcName, dateFrom, dateTo }: Props) => {
  const filtered = useMemo(() =>
    entries.filter(e => e.entry_date >= dateFrom && e.entry_date <= dateTo),
    [entries, dateFrom, dateTo]
  );

  const sumByCat = (type: string, cat: string) =>
    filtered.filter(e => e.entry_type === type && e.category === cat).reduce((s, e) => s + e.amount, 0);

  const sumByCatSub = (cat: string, sub: string) =>
    filtered.filter(e => e.entry_type === "expense" && e.category === cat && (e.subcategory || "").toLowerCase().includes(sub.toLowerCase())).reduce((s, e) => s + e.amount, 0);

  const sumCatTotal = (cat: string) =>
    filtered.filter(e => e.entry_type === "expense" && e.category === cat).reduce((s, e) => s + e.amount, 0);

  // Income
  const drawBank = sumByCat("income", "draw_bank");
  const equity = sumByCat("income", "equity");
  const otherIncome = sumByCat("income", "other_income");
  const totalIncome = drawBank + equity + otherIncome;

  // Expenses
  const construction = sumCatTotal("construction");
  const softCosts = sumCatTotal("soft_costs");
  const softArch = sumByCatSub("soft_costs", "arq");
  const softEng = sumByCatSub("soft_costs", "ing");
  const softOther = softCosts - softArch - softEng;
  const permits = sumCatTotal("permits");
  const financing = sumCatTotal("financing");
  const finInterest = sumByCatSub("financing", "inter");
  const finFees = sumByCatSub("financing", "fee");
  const finOther = financing - finInterest - finFees;
  const insurance = sumCatTotal("insurance");
  const marketing = sumCatTotal("marketing");
  const operating = sumCatTotal("operating");
  const opUtilities = sumByCatSub("operating", "util");
  const opHoa = sumByCatSub("operating", "hoa");
  const opOther = operating - opUtilities - opHoa;
  const closingCosts = sumCatTotal("closing_costs");
  const clTitle = sumByCatSub("closing_costs", "title");
  const clLegal = sumByCatSub("closing_costs", "legal");
  const clOther = closingCosts - clTitle - clLegal;
  const otherExpense = sumCatTotal("other_expense");
  const totalExpenses = construction + softCosts + permits + financing + insurance + marketing + operating + closingCosts + otherExpense;
  const netBalance = totalIncome - totalExpenses;

  // Monthly income summary
  const monthlyIncome = useMemo(() => {
    const months: Record<string, number> = {};
    filtered.filter(e => e.entry_type === "income").forEach(e => {
      const m = parseInt(e.entry_date.slice(5, 7));
      const key = m.toString();
      months[key] = (months[key] || 0) + e.amount;
    });
    return months;
  }, [filtered]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const year = dateTo.slice(0, 4);

  const Line = ({ label, amount, bold, indent, border }: { label: string; amount: number; bold?: boolean; indent?: boolean; border?: boolean }) => {
    if (amount === 0 && !bold) return null;
    return (
      <div className={`flex justify-between py-0.5 ${bold ? "font-bold" : ""} ${indent ? "pl-6" : ""} ${border ? "border-t border-black pt-1 mt-1" : ""}`}>
        <span>{label}</span>
        <span className="font-mono">{fmtD(amount)}</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto p-0">
        {/* Print-only controls */}
        <div className="flex justify-end gap-2 p-4 print:hidden border-b">
          <Button size="sm" variant="outline" onClick={() => window.print()} className="text-[11px]">
            <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
          </Button>
          <Button size="sm" variant="outline" onClick={onClose} className="text-[11px]">Cerrar</Button>
        </div>

        {/* A4 Statement */}
        <div id="financial-statement-print" className="px-10 py-8 font-serif text-[12px] leading-relaxed print:px-[1in] print:py-[0.75in]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          {/* Title */}
          <div className="text-center border-b-2 border-black pb-4 mb-6">
            <h1 className="text-[18px] font-bold uppercase tracking-wider">Project Expense Statement</h1>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[11px] mb-6 border-b border-black pb-4">
            <div><span className="font-bold">Project:</span> {projectName}</div>
            <div><span className="font-bold">Tax Year:</span> {year}</div>
            <div><span className="font-bold">Address:</span> {projectAddress}</div>
            <div><span className="font-bold">Period:</span> {dateFrom} — {dateTo}</div>
            <div><span className="font-bold">GC:</span> {gcName || "N/A"}</div>
            <div><span className="font-bold">Date:</span> {new Date().toLocaleDateString("en-US")}</div>
          </div>

          {/* GROSS INCOME */}
          <div className="mb-6">
            <h2 className="font-bold uppercase text-[13px] mb-2 border-b border-gray-400 pb-1">Gross Income</h2>
            <Line label="Draw del banco" amount={drawBank} indent />
            <Line label="Equity del developer" amount={equity} indent />
            <Line label="Otros ingresos" amount={otherIncome} indent />
            <Line label="TOTAL INCOME" amount={totalIncome} bold border />
          </div>

          {/* OPERATING EXPENSES */}
          <div className="mb-6">
            <h2 className="font-bold uppercase text-[13px] mb-2 border-b border-gray-400 pb-1">Operating Expenses</h2>

            {construction > 0 && <Line label="Construction (GC & Materials)" amount={construction} />}

            {softCosts > 0 && (
              <>
                <Line label="Soft Costs" amount={softCosts} />
                <Line label="Architecture" amount={softArch} indent />
                <Line label="Engineering" amount={softEng} indent />
                {softOther > 0 && <Line label="Other soft costs" amount={softOther} indent />}
              </>
            )}

            {permits > 0 && <Line label="Permits & Licenses" amount={permits} />}

            {financing > 0 && (
              <>
                <Line label="Financing Costs" amount={financing} />
                <Line label="Interest" amount={finInterest} indent />
                <Line label="Bank fees" amount={finFees} indent />
                {finOther > 0 && <Line label="Other financing" amount={finOther} indent />}
              </>
            )}

            {insurance > 0 && <Line label="Insurance & Taxes" amount={insurance} />}
            {marketing > 0 && <Line label="Marketing & Sales" amount={marketing} />}

            {operating > 0 && (
              <>
                <Line label="Operating Costs" amount={operating} />
                <Line label="Utilities" amount={opUtilities} indent />
                <Line label="HOA" amount={opHoa} indent />
                {opOther > 0 && <Line label="Other operating" amount={opOther} indent />}
              </>
            )}

            {closingCosts > 0 && (
              <>
                <Line label="Closing Costs" amount={closingCosts} />
                <Line label="Title" amount={clTitle} indent />
                <Line label="Legal" amount={clLegal} indent />
                {clOther > 0 && <Line label="Other closing" amount={clOther} indent />}
              </>
            )}

            {otherExpense > 0 && <Line label="Other Expenses" amount={otherExpense} />}

            <Line label="TOTAL OPERATING EXPENSES" amount={totalExpenses} bold border />
          </div>

          {/* NET BALANCE */}
          <div className="mb-6 border-2 border-black p-3">
            <div className="flex justify-between font-bold text-[14px]">
              <span>NET BALANCE</span>
              <span className="font-mono">{fmtD(netBalance)}</span>
            </div>
            <p className="text-[10px] text-gray-600 mt-1">(Total Income − Total Expenses)</p>
          </div>

          {/* MONTHLY INCOME SUMMARY */}
          <div className="mb-6">
            <h2 className="font-bold uppercase text-[13px] mb-2 border-b border-gray-400 pb-1">Monthly Income Summary</h2>
            {monthNames.map((m, i) => {
              const val = monthlyIncome[(i + 1).toString()] || 0;
              if (val === 0) return null;
              return (
                <div key={m} className="flex justify-between py-0.5 pl-6">
                  <span>{m}</span>
                  <span className="font-mono">{fmtD(val)}</span>
                </div>
              );
            })}
            <div className="flex justify-between font-bold border-t border-black pt-1 mt-1">
              <span>ENDING BALANCE</span>
              <span className="font-mono">{fmtD(netBalance)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-black pt-4 mt-8 text-[10px] text-gray-600 space-y-2">
            <p>This report was generated by 360lateral</p>
            <p>Platform: relatin.co</p>
            <p>Date: {new Date().toLocaleDateString("en-US")}</p>
            <div className="mt-6 space-y-3">
              <div className="flex items-end gap-2">
                <span>Prepared by:</span>
                <span className="flex-1 border-b border-gray-400" />
              </div>
              <div className="flex items-end gap-2">
                <span>Title:</span>
                <span className="flex-1 border-b border-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookkeepingFinancialStatement;
