import { useState, useCallback, useRef, useEffect } from "react";
import { GOOGLE_CLIENT_ID } from "@/lib/google-config";

const SCOPES = "https://www.googleapis.com/auth/drive.readonly";
const PICKER_API_KEY = ""; // Not needed for OAuth-based picker

let gapiLoaded = false;
let gisLoaded = false;
let gapiLoadPromise: Promise<void> | null = null;
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

async function ensureGapiLoaded() {
  if (gapiLoaded) return;
  if (!gapiLoadPromise) {
    gapiLoadPromise = loadScript("https://apis.google.com/js/api.js", "gapi-script").then(
      () => new Promise<void>((resolve) => {
        (window as any).gapi.load("picker", () => {
          gapiLoaded = true;
          resolve();
        });
      })
    );
  }
  await gapiLoadPromise;
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

interface UseGoogleDriveOptions {
  mimeFilter?: string[];
}

export function useGoogleDrive({ mimeFilter }: UseGoogleDriveOptions = {}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const accessTokenRef = useRef<string | null>(null);
  const tokenClientRef = useRef<any>(null);

  // Check if there's already a token stored in session
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
          resolve(accessTokenRef.current);
          return;
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
        tokenClientRef.current = client;
        client.requestAccessToken({ prompt: "" });
      } catch (err) {
        reject(err);
      }
    });
  }, []);

  const openPicker = useCallback((onFilePicked: (file: File) => void) => {
    setIsLoading(true);

    const doPick = async () => {
      try {
        await ensureGapiLoaded();
        const token = await authenticate();
        const google = (window as any).google;
        const gapi = (window as any).gapi;

        const docsView = new google.picker.DocsView()
          .setIncludeFolders(true)
          .setSelectFolderEnabled(false);

        if (mimeFilter && mimeFilter.length > 0) {
          docsView.setMimeTypes(mimeFilter.join(","));
        }

        const picker = new google.picker.PickerBuilder()
          .addView(docsView)
          .setOAuthToken(token)
          .setDeveloperKey("")
          .setCallback(async (data: any) => {
            if (data.action === google.picker.Action.PICKED) {
              const doc = data.docs[0];
              try {
                setIsLoading(true);
                const resp = await fetch(
                  `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
                const blob = await resp.blob();
                const file = new File([blob], doc.name, { type: doc.mimeType || blob.type });

                if (file.size > 10 * 1024 * 1024) {
                  throw new Error("FILE_TOO_LARGE");
                }

                onFilePicked(file);
              } catch (err: any) {
                if (err.message === "FILE_TOO_LARGE") {
                  throw err;
                }
                throw new Error("DOWNLOAD_FAILED");
              } finally {
                setIsLoading(false);
              }
            } else if (data.action === google.picker.Action.CANCEL) {
              setIsLoading(false);
            }
          })
          .setTitle("Seleccionar archivo de Google Drive")
          .build();

        picker.setVisible(true);
        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
        throw err;
      }
    };

    doPick().catch((err) => {
      setIsLoading(false);
      throw err;
    });
  }, [authenticate, mimeFilter]);

  const disconnect = useCallback(() => {
    accessTokenRef.current = null;
    sessionStorage.removeItem("gdrive_token");
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, isLoading, openPicker, authenticate, disconnect };
}
