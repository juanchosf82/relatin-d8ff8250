import { FileText } from "lucide-react";

const PortalReportes = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-3">
      <FileText className="h-5 w-5 text-primary" />
      <h1 className="text-xl font-bold text-foreground">Reportes</h1>
    </div>
    <div className="bg-card border border-border rounded-2xl p-12 text-center">
      <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">Los reportes de tus proyectos aparecerán aquí.</p>
    </div>
  </div>
);

export default PortalReportes;
