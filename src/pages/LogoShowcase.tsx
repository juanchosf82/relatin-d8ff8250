import RelatinLogo from "@/components/RelatinLogo";
import RelatinLogoAlt1 from "@/components/RelatinLogoAlt1";
import RelatinLogoAlt2 from "@/components/RelatinLogoAlt2";

const LogoShowcase = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold text-center mb-12 text-foreground">
        Propuestas de Logo RELATIN
      </h1>
      
      <div className="max-w-4xl mx-auto space-y-16">
        {/* Original Logo */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">Logo Actual</h2>
          <div className="p-8 rounded-2xl border border-border bg-card flex items-center justify-center">
            <RelatinLogo className="scale-150" />
          </div>
          <p className="text-sm text-muted-foreground">
            Diseño actual con "R" en caja con gradiente y punto de acento.
          </p>
        </div>

        {/* Alternative 1 - Network Nodes */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-orange-vibrant">Alternativa 1: Network Nodes</h2>
          <div className="p-8 rounded-2xl border border-border bg-card flex items-center justify-center">
            <RelatinLogoAlt1 className="scale-150" />
          </div>
          <p className="text-sm text-muted-foreground">
            <strong>Concepto:</strong> Nodos conectados que forman una estructura abstracta. 
            Representa la inteligencia relacional, la conexión de datos y puntos de captura (drones, 360°, BIM). 
            La forma sugiere tanto una "R" como una red de información.
          </p>
        </div>

        {/* Alternative 2 - Scan Layers */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-electric-blue">Alternativa 2: Scan Layers</h2>
          <div className="p-8 rounded-2xl border border-border bg-card flex items-center justify-center">
            <RelatinLogoAlt2 className="scale-150" />
          </div>
          <p className="text-sm text-muted-foreground">
            <strong>Concepto:</strong> Líneas horizontales estilo escaneo que forman la "R". 
            Evoca el escaneo láser, las capas BIM y la digitalización de obras. 
            Los puntos pulsantes representan captura de datos en tiempo real.
          </p>
        </div>

        {/* Comparison on dark background */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Comparación en fondo oscuro</h2>
          <div className="p-8 rounded-2xl bg-navy-dark flex items-center justify-around gap-8 flex-wrap">
            <RelatinLogo />
            <RelatinLogoAlt1 />
            <RelatinLogoAlt2 />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoShowcase;
