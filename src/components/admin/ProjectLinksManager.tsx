import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';

const ICON_OPTIONS = ['📷', '📐', '📋', '🏛️', '📊', '📁', '🔗', '📍', '💰', '⚠️'];

interface LinkRow {
  id?: string;
  label: string;
  url: string;
  icon: string;
  color: string;
  sort_order: number;
}

const ProjectLinksManager = ({ projectId }: { projectId: string }) => {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [newLink, setNewLink] = useState<LinkRow>({ label: '', url: '', icon: '🔗', color: '0D7377', sort_order: 0 });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('project_links')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');
      if (data) setLinks(data as LinkRow[]);
    };
    load();
  }, [projectId]);

  const handleAdd = async () => {
    if (!newLink.label || !newLink.url) return;
    const payload = { ...newLink, project_id: projectId, sort_order: links.length };
    const { data, error } = await supabase.from('project_links').insert([payload]).select().single();
    if (error) { toast.error(error.message); return; }
    setLinks([...links, data as LinkRow]);
    setNewLink({ label: '', url: '', icon: '🔗', color: '0D7377', sort_order: 0 });
    toast.success('Enlace agregado');
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('project_links').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setLinks(links.filter(l => l.id !== id));
    toast.success('Enlace eliminado');
  };

  const moveLink = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= links.length) return;
    const updated = [...links];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    const reordered = updated.map((l, i) => ({ ...l, sort_order: i }));
    setLinks(reordered);
    // Save order
    for (const l of reordered) {
      if (l.id) await supabase.from('project_links').update({ sort_order: l.sort_order }).eq('id', l.id);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm">Enlaces del Proyecto</h4>

      {/* Existing links */}
      <div className="space-y-2">
        {links.map((link, idx) => (
          <div key={link.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <div className="flex flex-col gap-0.5">
              <button type="button" onClick={() => moveLink(idx, -1)} className="text-xs text-muted-foreground hover:text-foreground" disabled={idx === 0}>▲</button>
              <button type="button" onClick={() => moveLink(idx, 1)} className="text-xs text-muted-foreground hover:text-foreground" disabled={idx === links.length - 1}>▼</button>
            </div>
            <span className="text-lg">{link.icon}</span>
            <span className="text-sm font-medium flex-1">{link.label}</span>
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{link.url}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => link.id && handleDelete(link.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
        {links.length === 0 && <p className="text-xs text-muted-foreground">Sin enlaces</p>}
      </div>

      {/* Add new link */}
      <div className="border rounded-md p-3 space-y-3">
        <p className="text-xs font-semibold">Agregar enlace</p>
        <div className="flex gap-2 flex-wrap">
          {ICON_OPTIONS.map(icon => (
            <button
              key={icon}
              type="button"
              onClick={() => setNewLink({ ...newLink, icon })}
              className={`text-xl p-1 rounded ${newLink.icon === icon ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-muted'}`}
            >
              {icon}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input value={newLink.label} onChange={e => setNewLink({ ...newLink, label: e.target.value })} placeholder="Fotos de Campo" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">URL</Label>
            <Input value={newLink.url} onChange={e => setNewLink({ ...newLink, url: e.target.value })} placeholder="https://..." />
          </div>
        </div>
        <Button type="button" size="sm" onClick={handleAdd} disabled={!newLink.label || !newLink.url} className="bg-[hsl(190,80%,26%)] text-white hover:bg-[hsl(190,80%,26%)]/90">
          <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
        </Button>
      </div>
    </div>
  );
};

export default ProjectLinksManager;
