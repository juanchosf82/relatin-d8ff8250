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
          // Validate token is still good
          try {
            const r = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
              headers: { Authorization: `Bearer ${accessTokenRef.current}` },
            });
            if (r.ok) {
              resolve(accessTokenRef.current);
              return;
            }
          } catch {}
          // Token invalid, clear it
          accessTokenRef.current = null;
          sessionStorage.removeItem("gdrive_token");
          setIsAuthenticated(false);
        }

        const client = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: (response: any) => {
            if (response.error) {
              reject(new Error(response.error));
              return;
            }
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
  }, []);

  const listFiles = useCallback(async (folderId?: string, query?: string): Promise<DriveFile[]> => {
    const token = await authenticate();
    let q = "trashed=false";
    if (folderId) {
      q += ` and '${folderId}' in parents`;
    }
    if (query) {
      q += ` and name contains '${query.replace(/'/g, "\\'")}'`;
    }
    if (mimeFilter && mimeFilter.length > 0 && !query) {
      // Don't filter mime when searching to show folders too
    }

    const params = new URLSearchParams({
      q,
      fields: "files(id,name,mimeType,modifiedTime,size,iconLink,parents)",
      orderBy: "folder,name",
      pageSize: "100",
    });

    const resp = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (resp.status === 403 || resp.status === 401) {
      accessTokenRef.current = null;
      sessionStorage.removeItem("gdrive_token");
      setIsAuthenticated(false);
      throw new Error("DRIVE_AUTH_ERROR");
    }

    if (!resp.ok) throw new Error(`Drive API error: ${resp.status}`);
    const data = await resp.json();
    return data.files || [];
  }, [authenticate, mimeFilter]);

  const downloadFile = useCallback(async (fileId: string, fileName: string, fileMimeType: string): Promise<File> => {
    const token = await authenticate();

    // Google Docs types need export
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
      url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    }

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (resp.status === 403 || resp.status === 401) {
      accessTokenRef.current = null;
      sessionStorage.removeItem("gdrive_token");
      setIsAuthenticated(false);
      throw new Error("DRIVE_AUTH_ERROR");
    }

    if (!resp.ok) throw new Error("DOWNLOAD_FAILED");
    const blob = await resp.blob();
    const file = new File([blob], fileName, { type: exportMime || blob.type });

    if (file.size > 10 * 1024 * 1024) {
      throw new Error("FILE_TOO_LARGE");
    }

    return file;
  }, [authenticate]);

  const disconnect = useCallback(() => {
    accessTokenRef.current = null;
    sessionStorage.removeItem("gdrive_token");
    setIsAuthenticated(false);
  }, []);

  // Legacy openPicker — now opens the custom modal via a callback pattern
  // This is kept for backward compat but the new approach uses listFiles + downloadFile
  const openPicker = useCallback((onFilePicked: (file: File) => void) => {
    // No-op: components should use the DriveBrowserModal instead
    console.warn("openPicker is deprecated. Use DriveBrowserModal with listFiles/downloadFile.");
  }, []);

  return { isAuthenticated, isLoading, setIsLoading, openPicker, authenticate, disconnect, listFiles, downloadFile };
}
