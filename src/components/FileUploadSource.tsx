import { useState, useRef, useCallback, DragEvent } from "react";
import { Monitor, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import DriveBrowserModal from "@/components/DriveBrowserModal";

// Google Drive icon SVG inline
const DriveIcon = () => (
  <svg width="20" height="18" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-20.4 35.3c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 13.8z" fill="#ea4335"/>
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
    <path d="m73.4 26.5-10.1-17.5c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 23.5h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
  </svg>
);

export type FileUploadAccept = "pdf" | "excel" | "images" | "pdf+images" | "any";

const MIME_MAP: Record<FileUploadAccept, string[]> = {
  pdf: ["application/pdf"],
  excel: [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ],
  images: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  "pdf+images": ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"],
  any: [],
};

const ACCEPT_MAP: Record<FileUploadAccept, string> = {
  pdf: ".pdf",
  excel: ".xls,.xlsx,.csv",
  images: "image/*",
  "pdf+images": ".pdf,image/*",
  any: "*",
};

interface FileUploadSourceProps {
  accept?: FileUploadAccept;
  onFileSelected: (file: File) => void;
  multiple?: boolean;
  onMultipleFiles?: (files: File[]) => void;
  maxSizeMb?: number;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
}

export default function FileUploadSource({
  accept = "any",
  onFileSelected,
  multiple = false,
  onMultipleFiles,
  maxSizeMb = 10,
  disabled = false,
  compact = false,
  label,
}: FileUploadSourceProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [driveOpen, setDriveOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mimeFilter = MIME_MAP[accept].length > 0 ? MIME_MAP[accept] : undefined;
  const { isLoading: driveLoading, authenticate, disconnect, listFiles, listSharedDrives, downloadFile } = useGoogleDrive({
    mimeFilter,
  });

  const validateFile = useCallback(
    (file: File): boolean => {
      if (file.size > maxSizeMb * 1024 * 1024) {
        toast.error(`Archivo muy grande (máx ${maxSizeMb}MB).`);
        return false;
      }
      return true;
    },
    [maxSizeMb]
  );

  const handleLaptopClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(validateFile);
    if (multiple && onMultipleFiles) {
      onMultipleFiles(valid);
    } else if (valid.length > 0) {
      onFileSelected(valid[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDriveClick = async () => {
    try {
      await authenticate();
      setDriveOpen(true);
    } catch (err: any) {
      toast.error("No se pudo conectar con Google Drive.");
    }
  };

  const handleDriveFileSelected = (file: File) => {
    if (!validateFile(file)) return;
    onFileSelected(file);
  };

  const handleReconnect = () => {
    disconnect();
    authenticate().then(() => {
      setDriveOpen(true);
    }).catch(() => {
      toast.error("No se pudo reconectar con Google Drive.");
    });
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOut = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const valid = files.filter(validateFile);
    if (multiple && onMultipleFiles) {
      onMultipleFiles(valid);
    } else if (valid.length > 0) {
      onFileSelected(valid[0]);
    }
  };

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLaptopClick}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-[11px] font-medium text-gray-600 hover:border-[#0D7377] hover:bg-[#E8F4F4] transition-colors disabled:opacity-50"
          >
            <Monitor className="h-3.5 w-3.5" />
            Laptop
          </button>
          <button
            type="button"
            onClick={handleDriveClick}
            disabled={disabled || driveLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-gray-200 bg-white text-[11px] font-medium text-gray-600 hover:border-[#0D7377] hover:bg-[#E8F4F4] transition-colors disabled:opacity-50"
          >
            {driveLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DriveIcon />}
            Drive
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={ACCEPT_MAP[accept]}
            multiple={multiple}
            onChange={handleFileChange}
          />
        </div>
        <DriveBrowserModal
          open={driveOpen}
          onClose={() => setDriveOpen(false)}
          onFileSelected={handleDriveFileSelected}
          listFiles={listFiles}
          downloadFile={downloadFile}
          onReconnect={handleReconnect}
          onFallbackLaptop={() => { setDriveOpen(false); handleLaptopClick(); }}
        />
      </>
    );
  }

  return (
    <>
      <div
        className={`rounded-xl border-2 border-dashed transition-colors ${
          isDragging
            ? "border-[#0D7377] bg-[#E8F4F4]"
            : "border-gray-300 bg-gray-50"
        } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
        onDragOver={handleDrag}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-center gap-4 py-5 px-4">
          {/* Laptop card */}
          <button
            type="button"
            onClick={handleLaptopClick}
            disabled={disabled}
            className="flex flex-col items-center gap-2.5 px-6 py-4 rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:border-[#0D7377] hover:bg-[#E8F4F4] hover:shadow-sm hover:scale-[1.02] transition-all cursor-pointer"
          >
            <span className="text-2xl">🖥</span>
            <div className="text-center">
              <span className="text-[13px] font-medium text-[#0F1B2D] block">Desde laptop</span>
              <span className="text-[11px] text-gray-400">Arrastra o elige</span>
            </div>
          </button>

          {/* Drive card */}
          <button
            type="button"
            onClick={handleDriveClick}
            disabled={disabled || driveLoading}
            className="flex flex-col items-center gap-2.5 px-6 py-4 rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:border-[#0D7377] hover:bg-[#E8F4F4] hover:shadow-sm hover:scale-[1.02] transition-all cursor-pointer"
          >
            {driveLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-[#0D7377]" />
            ) : (
              <DriveIcon />
            )}
            <div className="text-center">
              <span className="text-[13px] font-medium text-[#0F1B2D] block">
                {driveLoading ? "Conectando..." : "Desde Drive"}
              </span>
              <span className="text-[11px] text-gray-400">Google Drive</span>
            </div>
          </button>
        </div>

        {/* Drag zone text */}
        <p className="text-center text-[11px] text-gray-400 pb-3">
          {isDragging ? "Suelta el archivo aquí" : label || "— o arrastra el archivo aquí —"}
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={ACCEPT_MAP[accept]}
          multiple={multiple}
          onChange={handleFileChange}
        />
      </div>

      <DriveBrowserModal
        open={driveOpen}
        onClose={() => setDriveOpen(false)}
        onFileSelected={handleDriveFileSelected}
        listFiles={listFiles}
        downloadFile={downloadFile}
        onReconnect={handleReconnect}
        onFallbackLaptop={() => { setDriveOpen(false); handleLaptopClick(); }}
      />
    </>
  );
}
