import RelatinLogo from "@/components/RelatinLogo";
import RelatinLogoAlt1 from "@/components/RelatinLogoAlt1";
import RelatinLogoAlt2 from "@/components/RelatinLogoAlt2";
import RelatinLogoAlt3 from "@/components/RelatinLogoAlt3";
import RelatinLogoAlt4 from "@/components/RelatinLogoAlt4";
import RelatinLogoAlt5 from "@/components/RelatinLogoAlt5";
import RelatinLogoAlt6 from "@/components/RelatinLogoAlt6";
import RelatinLogoAlt7 from "@/components/RelatinLogoAlt7";

const LogoShowcase = () => {
  return (
    <div className="min-h-screen bg-background p-8 pb-20">
      <h1 className="text-3xl font-bold text-center mb-4 text-foreground">
        Propuestas de Logo RELATIN
      </h1>
      <p className="text-center text-muted-foreground mb-12">Tecnología + Construcción</p>
      
      <div className="max-w-4xl mx-auto space-y-10">
        {/* NEW: Tech + Construction Logos */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-orange-vibrant">🔌 Alternativa 5: Digital Blueprint</h2>
          <div className="p-8 rounded-2xl border-2 border-orange-vibrant/30 bg-card flex items-center justify-center">
            <RelatinLogoAlt5 className="scale-150" />
          </div>
          <p className="text-sm text-muted-foreground">
            <strong>Concepto:</strong> Trazas de circuito electrónico formando un edificio. 
            Los nodos de conexión representan puntos de datos y la fusión de tecnología digital con estructura física.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-electric-blue">🧊 Alternativa 6: BIM Cube</h2>
          <div className="p-8 rounded-2xl border-2 border-electric-blue/30 bg-card flex items-center justify-center">
            <RelatinLogoAlt6 className="scale-150" />
          </div>
          <p className="text-sm text-muted-foreground">
            <strong>Concepto:</strong> Cubo isométrico 3D representando un modelo BIM. 
            Las capas visibles muestran los pisos del edificio y la capa flotante superior representa los datos digitales superpuestos.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-orange-vibrant">📡 Alternativa 7: Scan Construct</h2>
          <div className="p-8 rounded-2xl border-2 border-orange-vibrant/30 bg-card flex items-center justify-center">
            <RelatinLogoAlt7 className="scale-150" />
          </div>
          <p className="text-sm text-muted-foreground">
            <strong>Concepto:</strong> Radar/LiDAR escaneando con un edificio emergiendo de los datos. 
            Los círculos concéntricos representan el escaneo 360° y los puntos pulsantes son datos capturados en tiempo real.
          </p>
        </div>

        {/* Previous construction logos */}
        <div className="space-y-4 pt-8 border-t border-border">
          <h2 className="text-lg font-semibold text-muted-foreground">Anteriores: Construcción</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 rounded-xl border border-border bg-card flex flex-col items-center gap-2">
              <RelatinLogoAlt3 />
              <span className="text-xs text-muted-foreground">Building Blocks</span>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card flex flex-col items-center gap-2">
              <RelatinLogoAlt4 />
              <span className="text-xs text-muted-foreground">Blueprint Structural</span>
            </div>
          </div>
        </div>

        {/* Original and conceptual */}
        <div className="space-y-4 opacity-60">
          <h2 className="text-lg font-semibold text-muted-foreground">Anteriores: Conceptuales</h2>
          <div className="p-6 rounded-xl border border-border bg-card flex items-center justify-around gap-4 flex-wrap">
            <div className="flex flex-col items-center gap-2">
              <RelatinLogo />
              <span className="text-xs text-muted-foreground">Actual</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <RelatinLogoAlt1 />
              <span className="text-xs text-muted-foreground">Network Nodes</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <RelatinLogoAlt2 />
              <span className="text-xs text-muted-foreground">Scan Layers</span>
            </div>
          </div>
        </div>

        {/* Comparison on dark background */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Los 3 nuevos - Fondo oscuro</h2>
          <div className="p-8 rounded-2xl bg-navy-dark flex items-center justify-around gap-6 flex-wrap">
            <RelatinLogoAlt5 />
            <RelatinLogoAlt6 />
            <RelatinLogoAlt7 />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoShowcase;
