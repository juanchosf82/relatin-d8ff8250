import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronRight, ArrowLeft, AlertTriangle, FolderOpen, RefreshCw } from "lucide-react";
import type { DriveFile, SharedDrive, DriveSection } from "@/hooks/useGoogleDrive";
import { cn } from "@/lib/utils";

const FOLDER_MIME = "application/vnd.google-apps.folder";

function fileIcon(mimeType: string, name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (mimeType === FOLDER_MIME) return { emoji: "📁", color: "text-blue-500" };
  if (mimeType.includes("pdf") || ext === "pdf") return { emoji: "📄", color: "text-red-500" };
  if (mimeType.includes("sheet") || mimeType.includes("excel") || ["xlsx", "xls", "csv"].includes(ext))
    return { emoji: "📊", color: "text-green-600" };
  if (mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext))
    return { emoji: "🖼", color: "text-purple-500" };
  if (mimeType.includes("document") || mimeType.includes("word") || ["doc", "docx"].includes(ext))
    return { emoji: "📝", color: "text-blue-600" };
  return { emoji: "📎", color: "text-gray-400" };
}

function formatSize(bytes?: string) {
  if (!bytes) return "";
  const b = parseInt(bytes, 10);
  if (isNaN(b)) return "";
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)}KB`;
  return `${(b / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es", { month: "short", day: "numeric" });
  } catch { return ""; }
}

const DriveIcon = () => (
  <svg width="18" height="16" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-20.4 35.3c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 13.8z" fill="#ea4335"/>
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
    <path d="m73.4 26.5-10.1-17.5c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 23.5h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
  </svg>
);

interface BreadcrumbItem { id: string; name: string; }

interface DriveBrowserModalProps {
  open: boolean;
  onClose: () => void;
  onFileSelected: (file: File) => void;
  listFiles: (folderId?: string, query?: string, section?: DriveSection, driveId?: string) => Promise<DriveFile[]>;
  listSharedDrives: () => Promise<SharedDrive[]>;
  downloadFile: (id: string, name: string, mime: string) => Promise<File>;
  onReconnect: () => void;
  onFallbackLaptop: () => void;
}

export default function DriveBrowserModal({
  open, onClose, onFileSelected,
  listFiles, listSharedDrives, downloadFile,
  onReconnect, onFallbackLaptop,
}: DriveBrowserModalProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<DriveSection>("my-drive");
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: "root", name: "Mi Drive" }]);
  const [selected, setSelected] = useState<DriveFile | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Shared drives state
  const [sharedDrives, setSharedDrives] = useState<SharedDrive[]>([]);
  const [sharedDrivesLoaded, setSharedDrivesLoaded] = useState(false);
  const [activeDriveId, setActiveDriveId] = useState<string | undefined>();

  const currentFolder = breadcrumb[breadcrumb.length - 1];

  const fetchFiles = useCallback(async (folderId?: string, query?: string, sec?: DriveSection, driveId?: string) => {
    setLoading(true);
    setError(null);
    setAuthError(false);
    setSelected(null);
    try {
      const result = await listFiles(
        folderId === "root" ? undefined : folderId,
        query || undefined,
        sec ?? section,
        driveId ?? activeDriveId,
      );
      setFiles(result);
    } catch (err: any) {
      if (err.message === "DRIVE_AUTH_ERROR") setAuthError(true);
      else setError(err.message || "Error loading files");
    } finally {
      setLoading(false);
    }
  }, [listFiles, section, activeDriveId]);

  const loadSharedDrives = useCallback(async () => {
    try {
      const drives = await listSharedDrives();
      setSharedDrives(drives);
    } catch {
      setSharedDrives([]);
    }
    setSharedDrivesLoaded(true);
  }, [listSharedDrives]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSearch("");
      setSection("my-drive");
      setBreadcrumb([{ id: "root", name: "Mi Drive" }]);
      setSelected(null);
      setAuthError(false);
      setError(null);
      setActiveDriveId(undefined);
      setSharedDrivesLoaded(false);
      fetchFiles(undefined, undefined, "my-drive", undefined);
    }
  }, [open]); // intentionally minimal deps — only trigger on open change

  const switchSection = (sec: DriveSection, driveId?: string, driveName?: string) => {
    setSection(sec);
    setSearch("");
    setSelected(null);
    setActiveDriveId(driveId);

    if (sec === "my-drive") {
      setBreadcrumb([{ id: "root", name: "Mi Drive" }]);
      fetchFiles(undefined, undefined, sec, undefined);
    } else if (sec === "shared-with-me") {
      setBreadcrumb([{ id: "shared", name: "Compartido conmigo" }]);
      fetchFiles(undefined, undefined, sec, undefined);
    } else if (sec === "shared-drives") {
      if (driveId && driveName) {
        setBreadcrumb([{ id: driveId, name: driveName }]);
        fetchFiles(driveId, undefined, sec, driveId);
      } else {
        // Load shared drives list
        if (!sharedDrivesLoaded) loadSharedDrives();
        setFiles([]);
        setBreadcrumb([{ id: "drives", name: "Unidades compartidas" }]);
      }
    }
  };

  const handleFolderClick = (folder: DriveFile) => {
    setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }]);
    setSearch("");
    fetchFiles(folder.id);
  };

  const handleBreadcrumbClick = (index: number) => {
    const newBc = breadcrumb.slice(0, index + 1);
    setBreadcrumb(newBc);
    setSearch("");
    const target = newBc[newBc.length - 1];
    if (section === "shared-with-me" && target.id === "shared") {
      fetchFiles(undefined, undefined, "shared-with-me");
    } else {
      fetchFiles(target.id);
    }
  };

  const handleBack = () => {
    if (breadcrumb.length <= 1) return;
    handleBreadcrumbClick(breadcrumb.length - 2);
  };

  const handleSearch = (q: string) => {
    setSearch(q);
    if (q.length >= 2) fetchFiles(undefined, q);
    else if (q.length === 0) fetchFiles(currentFolder.id);
  };

  const handleSelect = async () => {
    if (!selected) return;
    setDownloading(true);
    try {
      const file = await downloadFile(selected.id, selected.name, selected.mimeType);
      onFileSelected(file);
      onClose();
    } catch (err: any) {
      if (err.message === "DRIVE_AUTH_ERROR") setAuthError(true);
      else if (err.message === "FILE_TOO_LARGE") setError("Archivo muy grande (máx 10MB).");
      else setError("Error al descargar el archivo.");
    } finally {
      setDownloading(false);
    }
  };

  const folders = files.filter(f => f.mimeType === FOLDER_MIME);
  const docs = files.filter(f => f.mimeType !== FOLDER_MIME);

  // Shared drives list view (when section=shared-drives and no driveId selected)
  const showDrivesList = section === "shared-drives" && !activeDriveId;

  const sidebarItems: { key: DriveSection; icon: string; label: string }[] = [
    { key: "my-drive", icon: "📁", label: "Mi Drive" },
    { key: "shared-with-me", icon: "👥", label: "Compartido conmigo" },
    { key: "shared-drives", icon: "🏢", label: "Unidades compartidas" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[680px] p-0 gap-0 rounded-2xl overflow-hidden" style={{ height: 520 }}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2.5 text-[15px] font-bold text-[#0F1B2D]">
              <DriveIcon /> Google Drive
            </DialogTitle>
          </DialogHeader>

          {authError ? (
            <div className="flex flex-col items-center gap-4 py-10 px-6 flex-1 justify-center">
              <AlertTriangle className="h-10 w-10 text-amber-500" />
              <div className="text-center space-y-1">
                <p className="text-[14px] font-semibold text-[#0F1B2D]">No se pudo abrir Google Drive</p>
                <p className="text-[12px] text-gray-500">Tu sesión de Google expiró o el acceso fue revocado.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => { onClose(); onFallbackLaptop(); }} className="gap-1.5 text-[12px]">
                  💻 Subir desde laptop
                </Button>
                <Button size="sm" onClick={() => { onReconnect(); setAuthError(false); fetchFiles(); }} className="gap-1.5 text-[12px] bg-[#0D7377] hover:bg-[#0D7377]/90 text-white">
                  🔄 Reconectar con Google
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 min-h-0">
              {/* Left sidebar */}
              <div className="w-40 border-r border-gray-200 bg-gray-50/50 flex-shrink-0 py-3 px-2 space-y-1">
                {sidebarItems.map(item => (
                  <button
                    key={item.key}
                    onClick={() => switchSection(item.key)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-colors text-left",
                      section === item.key
                        ? "bg-[#0F1B2D] text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Main panel */}
              <div className="flex-1 flex flex-col min-h-0 min-w-0">
                {/* Search */}
                <div className="px-4 pt-3 pb-2 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar archivos en Drive..."
                      value={search}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-9 h-9 text-[13px] rounded-lg border-gray-200"
                    />
                  </div>
                </div>

                {/* Breadcrumb */}
                {!search && !showDrivesList && (
                  <div className="px-4 pb-2 flex items-center gap-1 flex-shrink-0">
                    {breadcrumb.length > 1 && (
                      <button onClick={handleBack} className="p-1 rounded hover:bg-gray-100 mr-1">
                        <ArrowLeft className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                    )}
                    {breadcrumb.map((bc, i) => (
                      <span key={bc.id + i} className="flex items-center gap-1">
                        {i > 0 && <ChevronRight className="h-3 w-3 text-gray-300" />}
                        <button
                          onClick={() => handleBreadcrumbClick(i)}
                          className={cn(
                            "text-[11px] hover:text-[#0D7377] transition-colors",
                            i === breadcrumb.length - 1 ? "text-[#0F1B2D] font-medium" : "text-gray-500"
                          )}
                        >
                          {bc.name}
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* File list */}
                <div className="flex-1 overflow-y-auto min-h-0 border-t border-gray-100">
                  {showDrivesList ? (
                    /* Shared drives list */
                    !sharedDrivesLoaded ? (
                      <div className="p-4 space-y-2.5">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex items-center gap-3">
                            <Skeleton className="h-5 w-5 rounded" />
                            <Skeleton className="h-4 flex-1 rounded" />
                          </div>
                        ))}
                      </div>
                    ) : sharedDrives.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-10">
                        <FolderOpen className="h-8 w-8 text-gray-300" />
                        <p className="text-[12px] text-gray-400">No tienes unidades compartidas</p>
                      </div>
                    ) : (
                      <div>
                        <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Unidades compartidas</p>
                        {sharedDrives.map(drive => (
                          <button
                            key={drive.id}
                            onClick={() => switchSection("shared-drives", drive.id, drive.name)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#E8F4F4]/40 transition-colors text-left"
                          >
                            <span className="text-base">🏢</span>
                            <span className="text-[13px] font-medium text-[#0F1B2D] flex-1 truncate">{drive.name}</span>
                            <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                          </button>
                        ))}
                      </div>
                    )
                  ) : loading ? (
                    <div className="p-4 space-y-2.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-5 w-5 rounded" />
                          <Skeleton className="h-4 flex-1 rounded" />
                          <Skeleton className="h-3 w-12 rounded" />
                        </div>
                      ))}
                      <p className="text-center text-[11px] text-gray-400 pt-2">Cargando contenido...</p>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center gap-3 py-10">
                      <AlertTriangle className="h-8 w-8 text-amber-500" />
                      <p className="text-[12px] text-gray-500">{error}</p>
                      <button onClick={() => fetchFiles(currentFolder.id)} className="text-[12px] text-[#0D7377] hover:underline flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" /> Reintentar
                      </button>
                    </div>
                  ) : folders.length === 0 && docs.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10">
                      <FolderOpen className="h-8 w-8 text-gray-300" />
                      <p className="text-[12px] text-gray-400">
                        {section === "shared-with-me" ? "No hay archivos compartidos contigo" : "Carpeta vacía"}
                      </p>
                    </div>
                  ) : (
                    <div>
                      {folders.length > 0 && (
                        <div>
                          {!search && <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Carpetas</p>}
                          {folders.map(f => (
                            <button
                              key={f.id}
                              onClick={() => handleFolderClick(f)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#E8F4F4]/40 transition-colors text-left"
                            >
                              <span className="text-blue-500 text-base">📁</span>
                              <span className="text-[13px] font-medium text-[#0F1B2D] flex-1 truncate">{f.name}</span>
                              <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                            </button>
                          ))}
                        </div>
                      )}
                      {docs.length > 0 && (
                        <div>
                          {!search && <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Archivos</p>}
                          {docs.map(f => {
                            const icon = fileIcon(f.mimeType, f.name);
                            const isSelected = selected?.id === f.id;
                            return (
                              <button
                                key={f.id}
                                onClick={() => setSelected(isSelected ? null : f)}
                                className={cn(
                                  "w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left",
                                  isSelected
                                    ? "bg-[#E8F4F4] border-l-[3px] border-l-[#0D7377]"
                                    : "hover:bg-gray-50 border-l-[3px] border-l-transparent"
                                )}
                              >
                                <span className={cn("text-base", icon.color)}>{icon.emoji}</span>
                                <span className="text-[13px] text-[#0F1B2D] flex-1 truncate">{f.name}</span>
                                <span className="text-[11px] text-gray-400 shrink-0">{formatDate(f.modifiedTime)}</span>
                                <span className="text-[11px] text-gray-400 shrink-0 w-12 text-right">{formatSize(f.size)}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3 bg-white flex-shrink-0">
                  <div className="flex-1 truncate text-[13px] text-gray-500">
                    {selected ? (
                      <span className="flex items-center gap-1.5">
                        <span className={fileIcon(selected.mimeType, selected.name).color}>
                          {fileIcon(selected.mimeType, selected.name).emoji}
                        </span>
                        <span className="text-[#0F1B2D] font-medium truncate">{selected.name}</span>
                        {selected.size && <span className="text-[11px] text-gray-400 shrink-0 ml-1">{formatSize(selected.size)}</span>}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-[12px]">Selecciona un archivo</span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={onClose} className="text-[12px]">Cancelar</Button>
                  <Button
                    size="sm"
                    disabled={!selected || downloading}
                    onClick={handleSelect}
                    className="text-[12px] bg-[#0D7377] hover:bg-[#0D7377]/90 text-white gap-1.5"
                  >
                    {downloading ? "Descargando..." : "Seleccionar archivo →"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
