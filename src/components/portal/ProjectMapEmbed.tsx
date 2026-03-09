import { MapPin } from 'lucide-react';

const ProjectMapEmbed = ({ address }: { address: string | null }) => {
  if (!address) {
    return (
      <div className="w-full h-40 rounded-lg bg-muted flex items-center justify-center">
        <MapPin className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  const encoded = encodeURIComponent(address);
  const embedUrl = `https://maps.google.com/maps?q=${encoded}&output=embed`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

  return (
    <div className="space-y-1.5">
      <div className="w-full h-40 rounded-lg overflow-hidden border border-white/20">
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Ubicación del proyecto"
        />
      </div>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-[hsl(190,95%,45%)] hover:underline flex items-center gap-1"
      >
        <MapPin className="h-3 w-3" /> Ver en Google Maps
      </a>
    </div>
  );
};

export default ProjectMapEmbed;
