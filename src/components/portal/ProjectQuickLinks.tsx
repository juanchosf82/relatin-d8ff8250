import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink } from 'lucide-react';

interface ProjectLink {
  id: string;
  label: string;
  url: string;
  icon: string;
  color: string;
  sort_order: number;
}

const ProjectQuickLinks = ({ projectId }: { projectId: string }) => {
  const [links, setLinks] = useState<ProjectLink[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('project_links')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');
      if (data) setLinks(data as ProjectLink[]);
    };
    load();
  }, [projectId]);

  if (links.length === 0) {
    return <p className="text-xs text-muted-foreground">Sin enlaces configurados</p>;
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border-2 whitespace-nowrap hover:opacity-80 transition-opacity bg-white/10"
          style={{ borderColor: `#${link.color}`, color: `#${link.color}` }}
        >
          <span>{link.icon}</span>
          <span>{link.label}</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      ))}
    </div>
  );
};

export default ProjectQuickLinks;
