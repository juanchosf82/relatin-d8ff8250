import RelatinLogo from "@/components/RelatinLogo";
import RelatinLogoAlt1 from "@/components/RelatinLogoAlt1";
import RelatinLogoAlt2 from "@/components/RelatinLogoAlt2";
import RelatinLogoAlt3 from "@/components/RelatinLogoAlt3";
import RelatinLogoAlt4 from "@/components/RelatinLogoAlt4";

const LogoShowcase = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold text-center mb-12 text-foreground">
        Propuestas de Logo RELATIN
      </h1>
      
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Original Logo */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">Logo Actual</h2>
          <div className="p-8 rounded-2xl border border-border bg-card flex items-center justify-center">
            <RelatinLogo className="scale-150" />
          </div>
        </div>

        {/* Alternative 3 - Building Blocks */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-orange-vibrant">🏗️ Alternativa 3: Building Blocks</h2>
          <div className="p-8 rounded-2xl border border-border bg-card flex items-center justify-center">
            <RelatinLogoAlt3 className="scale-150" />
          </div>
          <p className="text-sm text-muted-foreground">
            <strong>Concepto:</strong> Bloques de construcción apilados formando la "R". 
            Representa edificación modular, progreso vertical y la esencia de construir. 
            Incluye un gancho de grúa como guiño a obra activa.
          </p>
        </div>

        {/* Alternative 4 - Blueprint Structural */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-electric-blue">📐 Alternativa 4: Blueprint Structural</h2>
          <div className="p-8 rounded-2xl border border-border bg-card flex items-center justify-center">
            <RelatinLogoAlt4 className="scale-150" />
          </div>
          <p className="text-sm text-muted-foreground">
            <strong>Concepto:</strong> "R" formada por vigas I-beam sobre fondo de plano técnico. 
            Los pernos de conexión y líneas de medición evocan ingeniería estructural y precisión. 
            La regla en el tagline refuerza la exactitud técnica.
          </p>
        </div>

        {/* Previous Alternatives */}
        <div className="space-y-4 opacity-60">
          <h2 className="text-lg font-semibold text-muted-foreground">Anteriores: Network Nodes & Scan Layers</h2>
          <div className="p-6 rounded-2xl border border-border bg-card flex items-center justify-around gap-4 flex-wrap">
            <RelatinLogoAlt1 />
            <RelatinLogoAlt2 />
          </div>
        </div>

        {/* Comparison on dark background */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Comparación - Fondo oscuro</h2>
          <div className="p-8 rounded-2xl bg-navy-dark flex items-center justify-around gap-6 flex-wrap">
            <RelatinLogo />
            <RelatinLogoAlt3 />
            <RelatinLogoAlt4 />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoShowcase;
