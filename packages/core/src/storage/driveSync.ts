import fs from 'fs';
import path from 'path';
import { loadCredentials } from '../auth/authManager.js';
import { loadConfig } from '../config/configManager.js';
import { SyncedProjectInfo } from '../types/index.js';

declare const __non_webpack_require__: any;

export interface DriveSyncOptions {
  dbPath: string;
  rootDir?: string;
  driveFolderName?: string;
}

function loadGoogleApisModule(): any {
  try {
    const req = typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : require;
    return req('googleapis');
  } catch {
    return null;
  }
}

function getDriveClient(): any {
  const googleapis = loadGoogleApisModule();
  if (!googleapis) {
    throw new Error('[dbci sync] Optional package "googleapis" is required for Drive sync. Run `npm install googleapis` to use this feature.');
  }

  const creds = loadCredentials();
  if (!creds || (!creds.refresh_token && !creds.access_token)) {
    throw new Error('[dbci sync] Not authenticated. Run `dbci login` or set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN in environment.');
  }

  const { google } = googleapis;
  const cid = creds.client_id || process.env.GOOGLE_CLIENT_ID || '628619648587-psiirstkfp691tucfag14daskceglgs4.apps.googleusercontent.com';
  const csecret = creds.client_secret || process.env.GOOGLE_CLIENT_SECRET || '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';

  const oauth2Client = new google.auth.OAuth2(cid, csecret);
  oauth2Client.setCredentials({
    access_token: creds.access_token,
    refresh_token: creds.refresh_token
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

async function getOrCreateFolder(drive: any, folderName: string, parentFolderId?: string): Promise<string> {
  const parentQuery = parentFolderId ? `'${parentFolderId}' in parents and ` : '';
  const query = `${parentQuery}name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const listRes = await drive.files.list({
    q: query,
    fields: 'files(id, name)'
  });

  if (listRes.data.files && listRes.data.files.length > 0) {
    return listRes.data.files[0].id!;
  }

  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : []
    },
    fields: 'id'
  });

  return createRes.data.id!;
}

export async function listProjectsInDrive(rootDriveFolderName: string = 'dbci'): Promise<SyncedProjectInfo[]> {
  const drive = getDriveClient();

  const mainFolderId = await getOrCreateFolder(drive, rootDriveFolderName);
  const subFoldersRes = await drive.files.list({
    q: `'${mainFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name, modifiedTime)'
  });

  const projects: SyncedProjectInfo[] = [];
  const folders = subFoldersRes.data.files || [];

  for (const folder of folders) {
    const fileRes = await drive.files.list({
      q: `'${folder.id}' in parents and name = 'index.sqlite' and trashed = false`,
      fields: 'files(id, modifiedTime)'
    });

    const file = fileRes.data.files && fileRes.data.files.length > 0 ? fileRes.data.files[0] : null;

    // Folder names are formatted as: "projectName [projectId]" or "projectId"
    let name = folder.name!;
    let id = folder.name!;
    if (folder.name!.includes(' [')) {
      const parts = folder.name!.split(' [');
      name = parts[0];
      id = parts[1].replace(']', '');
    }

    projects.push({
      id,
      name,
      folderId: folder.id!,
      fileId: file?.id,
      lastModified: file?.modifiedTime || folder.modifiedTime
    });
  }

  return projects;
}

export async function pushIndexToDrive(options: DriveSyncOptions): Promise<{ success: boolean; message: string }> {
  const rootDir = options.rootDir || path.dirname(path.dirname(options.dbPath));
  const config = loadConfig(rootDir);

  const dbPath = path.resolve(options.dbPath);
  if (!fs.existsSync(dbPath)) {
    return { success: false, message: `Index file not found at ${dbPath}. Run dbci scan first.` };
  }

  const rootDriveFolder = options.driveFolderName || config.driveFolderName || 'dbci';
  const projectFolderName = `${config.projectName} [${config.projectId}]`;

  try {
    const drive = getDriveClient();

    const mainFolderId = await getOrCreateFolder(drive, rootDriveFolder);
    const projectFolderId = await getOrCreateFolder(drive, projectFolderName, mainFolderId);

    const existingFileRes = await drive.files.list({
      q: `'${projectFolderId}' in parents and name = 'index.sqlite' and trashed = false`,
      fields: 'files(id)'
    });

    const fileStream = fs.createReadStream(dbPath);

    if (existingFileRes.data.files && existingFileRes.data.files.length > 0) {
      const fileId = existingFileRes.data.files[0].id!;
      await drive.files.update({
        fileId,
        media: {
          mimeType: 'application/x-sqlite3',
          body: fileStream
        }
      });
    } else {
      await drive.files.create({
        requestBody: {
          name: 'index.sqlite',
          parents: [projectFolderId]
        },
        media: {
          mimeType: 'application/x-sqlite3',
          body: fileStream
        }
      });
    }

    return {
      success: true,
      message: `Successfully pushed index to Google Drive at '${rootDriveFolder}/${projectFolderName}/index.sqlite'`
    };
  } catch (err: any) {
    return { success: false, message: `[dbci sync] Drive push failed: ${err.message}` };
  }
}

export async function pullIndexFromDrive(options: DriveSyncOptions): Promise<{ success: boolean; message: string }> {
  const rootDir = options.rootDir || path.dirname(path.dirname(options.dbPath));
  const config = loadConfig(rootDir);

  const dbPath = path.resolve(options.dbPath);
  const rootDriveFolder = options.driveFolderName || config.driveFolderName || 'dbci';
  const projectFolderName = `${config.projectName} [${config.projectId}]`;

  try {
    const drive = getDriveClient();

    const mainFolderId = await getOrCreateFolder(drive, rootDriveFolder);
    const listRes = await drive.files.list({
      q: `'${mainFolderId}' in parents and (name = '${projectFolderName}' or name = '${config.projectId}') and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)'
    });

    if (!listRes.data.files || listRes.data.files.length === 0) {
      return { success: false, message: `Google Drive project folder '${projectFolderName}' not found under '${rootDriveFolder}'.` };
    }

    const projectFolderId = listRes.data.files[0].id!;
    const fileRes = await drive.files.list({
      q: `'${projectFolderId}' in parents and name = 'index.sqlite' and trashed = false`,
      fields: 'files(id)'
    });

    if (!fileRes.data.files || fileRes.data.files.length === 0) {
      return { success: false, message: `index.sqlite not found in Drive folder '${projectFolderName}'.` };
    }

    const driveFileId = fileRes.data.files[0].id!;
    const destDir = path.dirname(dbPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const response = await drive.files.get({ fileId: driveFileId, alt: 'media' }, { responseType: 'stream' });
    const writer = fs.createWriteStream(dbPath);

    return new Promise((resolve) => {
      response.data
        .pipe(writer)
        .on('finish', () => resolve({ success: true, message: `Successfully pulled index from Drive to ${dbPath}` }))
        .on('error', (err: any) => resolve({ success: false, message: `Error writing pulled file: ${err.message}` }));
    });
  } catch (err: any) {
    return { success: false, message: `[dbci sync] Drive pull failed: ${err.message}` };
  }
}

export async function fetchProjectFromDrive(
  targetQuery?: string,
  destDbPath: string = '.dbci/index.sqlite'
): Promise<{ success: boolean; message: string; projects?: SyncedProjectInfo[]; localPath?: string }> {
  try {
    const projects = await listProjectsInDrive();

    if (!targetQuery) {
      return {
        success: true,
        message: projects.length > 0 ? `Found ${projects.length} synced project(s) in Drive:` : 'No synced projects found in Google Drive.',
        projects
      };
    }

    const matched = projects.find(
      (p) => p.name.toLowerCase() === targetQuery.toLowerCase() || p.id.toLowerCase() === targetQuery.toLowerCase()
    );

    if (!matched || !matched.fileId) {
      return {
        success: false,
        message: `Project '${targetQuery}' not found in Drive or has no index.sqlite. Available: ${projects.map((p) => p.name).join(', ')}`,
        projects
      };
    }

    const drive = getDriveClient();
    const destPath = path.resolve(destDbPath);
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const response = await drive.files.get({ fileId: matched.fileId, alt: 'media' }, { responseType: 'stream' });
    const writer = fs.createWriteStream(destPath);

    return new Promise((resolve) => {
      response.data
        .pipe(writer)
        .on('finish', () =>
          resolve({
            success: true,
            message: `Successfully fetched index for project '${matched.name}' [${matched.id}] to ${destPath}`,
            localPath: destPath
          })
        )
        .on('error', (err: any) => resolve({ success: false, message: `Error writing fetched file: ${err.message}` }));
    });
  } catch (err: any) {
    return { success: false, message: `[dbci fetch] Failed: ${err.message}` };
  }
}
