import { useState, useCallback, useRef, useEffect } from "react";
import { GOOGLE_CLIENT_ID } from "@/lib/google-config";

const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

let gisLoaded = false;
let gisLoadPromise: Promise<void> | null = null;

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) { resolve(); return; }
    const s = document.createElement("script");
    s.id = id;
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function ensureGisLoaded() {
  if (gisLoaded) return;
  if (!gisLoadPromise) {
    gisLoadPromise = loadScript("https://accounts.google.com/gsi/client", "gis-script").then(() => {
      gisLoaded = true;
    });
  }
  await gisLoadPromise;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  iconLink?: string;
  parents?: string[];
}

export interface SharedDrive {
  id: string;
  name: string;
}

export type DriveSection = "my-drive" | "shared-with-me" | "shared-drives";

interface UseGoogleDriveOptions {
  mimeFilter?: string[];
}

export function useGoogleDrive({ mimeFilter }: UseGoogleDriveOptions = {}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const accessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("gdrive_token");
    if (stored) {
      accessTokenRef.current = stored;
      setIsAuthenticated(true);
    }
  }, []);

  const clearToken = useCallback(() => {
    accessTokenRef.current = null;
    sessionStorage.removeItem("gdrive_token");
    setIsAuthenticated(false);
  }, []);

  const authenticate = useCallback((): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        await ensureGisLoaded();
        const google = (window as any).google;
        if (!google?.accounts?.oauth2) {
          reject(new Error("Google Identity Services not loaded"));
          return;
        }

        if (accessTokenRef.current) {
          try {
            const r = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
              headers: { Authorization: `Bearer ${accessTokenRef.current}` },
            });
            if (r.ok) { resolve(accessTokenRef.current); return; }
          } catch { /* token invalid */ }
          clearToken();
        }

        const client = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: (response: any) => {
            if (response.error) { reject(new Error(response.error)); return; }
            accessTokenRef.current = response.access_token;
            sessionStorage.setItem("gdrive_token", response.access_token);
            setIsAuthenticated(true);
            resolve(response.access_token);
          },
        });
        client.requestAccessToken({ prompt: "" });
      } catch (err) {
        reject(err);
      }
    });
  }, [clearToken]);

  const apiGet = useCallback(async (url: string) => {
    const token = await authenticate();
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (resp.status === 401 || resp.status === 403) {
      clearToken();
      throw new Error("DRIVE_AUTH_ERROR");
    }
    if (!resp.ok) throw new Error(`Drive API error: ${resp.status}`);
    return resp.json();
  }, [authenticate, clearToken]);

  const listFiles = useCallback(async (
    folderId?: string,
    query?: string,
    section: DriveSection = "my-drive",
    driveId?: string,
  ): Promise<DriveFile[]> => {
    const parts: string[] = ["trashed=false"];

    if (section === "shared-with-me") {
      parts.push("sharedWithMe=true");
    } else if (folderId) {
      parts.push(`'${folderId}' in parents`);
    }

    if (query) {
      parts.push(`name contains '${query.replace(/'/g, "\\'")}'`);
    }

    const q = parts.join(" and ");
    const params = new URLSearchParams({
      q,
      fields: "files(id,name,mimeType,modifiedTime,size,iconLink,parents)",
      orderBy: "folder,name",
      pageSize: "100",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });

    if (section === "shared-drives" && driveId) {
      params.set("driveId", driveId);
      params.set("corpora", "drive");
    }

    const data = await apiGet(`https://www.googleapis.com/drive/v3/files?${params}`);
    return data.files || [];
  }, [apiGet]);

  const listSharedDrives = useCallback(async (): Promise<SharedDrive[]> => {
    const data = await apiGet("https://www.googleapis.com/drive/v3/drives?pageSize=100");
    return (data.drives || []).map((d: any) => ({ id: d.id, name: d.name }));
  }, [apiGet]);

  const downloadFile = useCallback(async (fileId: string, fileName: string, fileMimeType: string): Promise<File> => {
    const token = await authenticate();
    const isGoogleDoc = fileMimeType.startsWith("application/vnd.google-apps.");
    let url: string;
    let exportMime = fileMimeType;

    if (isGoogleDoc) {
      const exportMap: Record<string, string> = {
        "application/vnd.google-apps.document": "application/pdf",
        "application/vnd.google-apps.spreadsheet": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.google-apps.presentation": "application/pdf",
      };
      exportMime = exportMap[fileMimeType] || "application/pdf";
      url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`;
    } else {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;
    }

    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (resp.status === 401 || resp.status === 403) {
      clearToken();
      throw new Error("DRIVE_AUTH_ERROR");
    }
    if (!resp.ok) throw new Error("DOWNLOAD_FAILED");
    const blob = await resp.blob();
    const file = new File([blob], fileName, { type: exportMime || blob.type });
    if (file.size > 10 * 1024 * 1024) throw new Error("FILE_TOO_LARGE");
    return file;
  }, [authenticate, clearToken]);

  const disconnect = useCallback(() => { clearToken(); }, [clearToken]);

  const openPicker = useCallback((_onFilePicked: (file: File) => void) => {
    console.warn("openPicker is deprecated. Use DriveBrowserModal.");
  }, []);

  return {
    isAuthenticated, isLoading, setIsLoading,
    openPicker, authenticate, disconnect,
    listFiles, listSharedDrives, downloadFile,
  };
}
