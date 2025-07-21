
declare const gapi: any;

// Type definitions for Google Identity Services
declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenClient {
        requestAccessToken: (overrideConfig?: { prompt: string }) => void;
      }
      interface TokenClientConfig {
        client_id: string;
        scope: string;
        callback: (tokenResponse: any) => void;
      }
      function initTokenClient(config: TokenClientConfig): TokenClient;
    }
  }
}

import type { Scene } from '../types';

// Module-level variables to hold credentials, populated by initClient.
let API_KEY: string | null = null;
let CLIENT_ID: string | null = null;

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const APP_FOLDER_NAME = 'AI Reel Generator';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let onAuthChange: (isReady: boolean, isSignedIn: boolean, error?: string) => void;

/**
 * Initializes the Google API client and the OAuth token client.
 */
export function initClient(apiKey: string, clientId: string, callback: (isReady: boolean, isSignedIn: boolean, error?: string) => void) {
  onAuthChange = callback;
  
  API_KEY = apiKey;
  CLIENT_ID = clientId;

  if (typeof gapi === 'undefined' || typeof google === 'undefined' || !API_KEY || !CLIENT_ID) {
    return;
  }
  
  gapi.load('client', async () => {
    try {
      await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      });
      
      tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID!,
          scope: SCOPES,
          callback: (tokenResponse: any) => {
              if (tokenResponse.error) {
                  console.error("Token Error:", tokenResponse);
                  const errorMessage = tokenResponse.error_description || `Token error: ${tokenResponse.error}`;
                  onAuthChange(true, false, errorMessage);
              } else {
                  onAuthChange(true, true);
              }
          },
      });

      // Client is ready, but user is not signed in yet.
      onAuthChange(true, false);
    } catch (e) {
      console.error("Error initializing GAPI client", e);
      onAuthChange(false, false, (e as Error).message || "Failed to initialize Google API client. Check API Key.");
    }
  });
}

/**
 * Initiates the Google Sign-In flow.
 */
export function signIn() {
  if (tokenClient) {
    if (gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  } else {
    console.error("Token client not initialized.");
    if (onAuthChange) {
        onAuthChange(false, false, "Google Drive client is not initialized. Please provide valid credentials.");
    }
  }
}

/**
 * Finds a folder by name within a parent folder, or creates it if it doesn't exist.
 * @param name The name of the folder to find or create.
 * @param parentId The ID of the parent folder. Defaults to 'root'.
 * @returns The ID of the found or created folder.
 */
async function findOrCreateFolder(name: string, parentId: string = 'root'): Promise<string> {
    const query = `mimeType='application/vnd.google-apps.folder' and name='${name}' and '${parentId}' in parents and trashed=false`;
    const response = await gapi.client.drive.files.list({ q: query, fields: 'files(id)' });
    
    if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0].id!;
    }
    
    const fileMetadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
    };
    const createResponse = await gapi.client.drive.files.create({ resource: fileMetadata, fields: 'id' });
    return createResponse.result.id!;
}

/**
 * Converts a base64 data URL to a Blob.
 * @param dataUrl The base64 data URL.
 * @returns A Promise that resolves to a Blob.
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return response.blob();
}

/**
 * Uploads a single file to a specified parent folder in Google Drive.
 * @param fileData The file content as a Blob or File.
 * @param fileName The desired name for the file in Google Drive.
 * @param parentId The ID of the parent folder.
 */
async function uploadFile(fileData: Blob, fileName: string, parentId: string): Promise<void> {
    const metadata = {
        name: fileName,
        parents: [parentId],
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', fileData);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({ 'Authorization': `Bearer ${gapi.client.getToken().access_token}` }),
        body: form,
    });
    
    if (!response.ok) {
        const errorBody = await response.json();
        console.error("File upload failed:", errorBody);
        throw new Error(`Failed to upload ${fileName}.`);
    }
}

/**
 * Uploads the entire reel to Google Drive.
 * @param reelTitle The title of the reel, used for the subfolder name.
 * @param scenes The array of scenes to upload.
 * @param onProgress Callback to report progress.
 */
export async function uploadReelToDrive(reelTitle: string, scenes: Scene[], onProgress?: (progress: string) => void) {
    if (!gapi.client.getToken()) {
        throw new Error("You are not signed in. Please connect to Google Drive first.");
    }
    
    onProgress?.('Creating folders...');
    const appFolderId = await findOrCreateFolder(APP_FOLDER_NAME);
    const reelFolderId = await findOrCreateFolder(reelTitle, appFolderId);

    const filesToUpload: { data: Blob | File; name: string }[] = [];
    for (const scene of scenes) {
        // Voiceover text
        filesToUpload.push({
            data: new Blob([scene.voiceover], { type: 'text/plain' }),
            name: `scene_${scene.sceneNumber}_voiceover.txt`
        });
        // Image
        if (scene.imageUrl) {
            filesToUpload.push({
                data: await dataUrlToBlob(scene.imageUrl),
                name: `scene_${scene.sceneNumber}_image.jpeg`
            });
        }
        // Video
        if (scene.videoFile) {
            filesToUpload.push({
                data: scene.videoFile,
                name: `scene_${scene.sceneNumber}_${scene.videoFile.name}`
            });
        }
        // Audio
        if (scene.audioFile) {
            filesToUpload.push({
                data: scene.audioFile,
                name: `scene_${scene.sceneNumber}_${scene.audioFile.name}`
            });
        }
    }

    for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        onProgress?.(`Uploading ${i + 1} of ${filesToUpload.length}: ${file.name}`);
        await uploadFile(file.data, file.name, reelFolderId);
    }
}