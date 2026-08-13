import { signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { GoogleDriveFile, GoogleDriveAbout } from '../types';

let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

const driveProvider = new GoogleAuthProvider();
SCOPES.forEach((scope) => driveProvider.addScope(scope));
driveProvider.setCustomParameters({ prompt: 'consent' });

export function getCachedDriveUser(): User | null {
  return cachedUser || auth.currentUser;
}

export function getDriveAccessToken(): string | null {
  return cachedAccessToken;
}

export function setDriveAccessToken(token: string | null) {
  cachedAccessToken = token;
}

/**
 * Autentica com o Google Drive via Firebase Popup
 */
export async function loginGoogleDrive(): Promise<{ user: User; accessToken: string }> {
  try {
    const result = await signInWithPopup(auth, driveProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google Drive.');
    }
    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user') {
      throw new Error('A janela de login do Google foi fechada antes da conclusão.');
    }
    console.error('Erro na autenticação Google Drive:', error);
    throw error;
  }
}

export async function logoutGoogleDrive(): Promise<void> {
  cachedAccessToken = null;
  cachedUser = null;
}

/**
 * Obtém informações sobre a conta e a cota de armazenamento do Google Drive
 */
export async function getDriveAbout(accessToken?: string): Promise<GoogleDriveAbout> {
  const token = accessToken || cachedAccessToken;
  if (!token) {
    throw new Error('Usuário não autenticado no Google Drive. Faça login com o Google.');
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('Sessão do Google expirada. Por favor, conecte novamente ao Google Drive.');
    }
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Falha ao carregar dados do Google Drive (${response.status})`);
  }

  return response.json();
}

/**
 * Lista arquivos e pastas do Google Drive
 */
export interface ListDriveFilesOptions {
  folderId?: string; // 'root' ou ID de pasta específica
  searchQuery?: string;
  mimeTypeFilter?: string; // e.g. 'folder', 'document', 'pdf', 'image'
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
}

export async function listDriveFiles(
  options: ListDriveFilesOptions = {},
  accessToken?: string
): Promise<{ files: GoogleDriveFile[]; nextPageToken?: string }> {
  const token = accessToken || cachedAccessToken;
  if (!token) {
    throw new Error('Autenticação necessária. Conecte sua conta do Google Drive.');
  }

  const folderId = options.folderId || 'root';
  const queryParts: string[] = ['trashed = false'];

  if (folderId && folderId !== 'all') {
    queryParts.push(`'${folderId}' in parents`);
  }

  if (options.searchQuery?.trim()) {
    const q = options.searchQuery.trim().replace(/'/g, "\\'");
    queryParts.push(`name contains '${q}'`);
  }

  if (options.mimeTypeFilter) {
    if (options.mimeTypeFilter === 'folder') {
      queryParts.push("mimeType = 'application/vnd.google-apps.folder'");
    } else if (options.mimeTypeFilter === 'document') {
      queryParts.push("(mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/pdf' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType = 'text/plain')");
    } else if (options.mimeTypeFilter === 'pdf') {
      queryParts.push("mimeType = 'application/pdf'");
    } else if (options.mimeTypeFilter === 'spreadsheet') {
      queryParts.push("(mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')");
    } else if (options.mimeTypeFilter === 'image') {
      queryParts.push("mimeType contains 'image/'");
    }
  }

  const qString = encodeURIComponent(queryParts.join(' and '));
  const fields = encodeURIComponent('nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, iconLink, thumbnailLink, size, modifiedTime, createdTime, parents, owners, shared, trashed)');
  const pageSize = options.pageSize || 50;
  const orderBy = encodeURIComponent(options.orderBy || 'folder, modifiedTime desc');

  let url = `https://www.googleapis.com/drive/v3/files?q=${qString}&fields=${fields}&pageSize=${pageSize}&orderBy=${orderBy}`;
  if (options.pageToken) {
    url += `&pageToken=${encodeURIComponent(options.pageToken)}`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('Sessão expirada do Google Drive. Conecte novamente.');
    }
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Erro ao listar arquivos (${response.status})`);
  }

  return response.json();
}

/**
 * Cria uma nova pasta no Google Drive
 */
export async function createDriveFolder(
  folderName: string,
  parentFolderId: string = 'root',
  accessToken?: string
): Promise<GoogleDriveFile> {
  const token = accessToken || cachedAccessToken;
  if (!token) {
    throw new Error('Autenticação necessária no Google Drive.');
  }

  const payload: any = {
    name: folderName.trim(),
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentFolderId && parentFolderId !== 'root') {
    payload.parents = [parentFolderId];
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink,parents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Erro ao criar pasta (${response.status})`);
  }

  return response.json();
}

/**
 * Procura ou cria uma pasta raiz para o escritório (ex: 'JurisControl - Processos & Clientes')
 */
export async function getOrCreateJurisControlRootFolder(accessToken?: string): Promise<GoogleDriveFile> {
  const token = accessToken || cachedAccessToken;
  if (!token) throw new Error('Não autenticado.');

  const folderName = 'JurisControl - Processos Previdenciários';
  const query = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and 'root' in parents and trashed = false`);
  
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,webViewLink)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0];
    }
  }

  // Cria se não existir
  return createDriveFolder(folderName, 'root', token);
}

/**
 * Cria ou obtém a pasta do cliente no Google Drive
 */
export async function getOrCreateClientFolder(
  clientName: string,
  clientCpf?: string,
  accessToken?: string
): Promise<GoogleDriveFile> {
  const token = accessToken || cachedAccessToken;
  if (!token) throw new Error('Não autenticado.');

  const rootFolder = await getOrCreateJurisControlRootFolder(token);
  const cleanCpf = clientCpf ? ` - ${clientCpf.replace(/[^\d]/g, '')}` : '';
  const folderName = `${clientName.trim()}${cleanCpf}`;

  const query = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and '${rootFolder.id}' in parents and trashed = false`);
  
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,webViewLink)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0];
    }
  }

  return createDriveFolder(folderName, rootFolder.id, token);
}

/**
 * Faz upload de um documento de texto formatado (Petição, Contrato, Procuração) para o Google Drive
 */
export async function uploadTextDocumentToDrive(
  options: {
    fileName: string;
    content: string;
    parentFolderId?: string;
    asGoogleDoc?: boolean; // Se true, converte em Google Docs editável
  },
  accessToken?: string
): Promise<GoogleDriveFile> {
  const token = accessToken || cachedAccessToken;
  if (!token) throw new Error('Não autenticado.');

  const metadata: any = {
    name: options.fileName,
    mimeType: options.asGoogleDoc ? 'application/vnd.google-apps.document' : 'text/plain',
  };

  if (options.parentFolderId && options.parentFolderId !== 'root') {
    metadata.parents = [options.parentFolderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
    options.content +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Erro no upload para o Google Drive (${response.status})`);
  }

  return response.json();
}

/**
 * Faz upload de um arquivo binário (PDF, Imagem, DOCX) para o Google Drive
 */
export async function uploadBinaryFileToDrive(
  options: {
    fileName: string;
    fileBlob: Blob;
    mimeType: string;
    parentFolderId?: string;
  },
  accessToken?: string
): Promise<GoogleDriveFile> {
  const token = accessToken || cachedAccessToken;
  if (!token) throw new Error('Não autenticado.');

  const metadata: any = {
    name: options.fileName,
    mimeType: options.mimeType,
  };

  if (options.parentFolderId && options.parentFolderId !== 'root') {
    metadata.parents = [options.parentFolderId];
  }

  const boundary = '-------314159265358979323846';
  const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' });

  // Constrói o corpo multipart com Blobs
  const headerBlob = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`]);
  const fileHeaderBlob = new Blob([`\r\n--${boundary}\r\nContent-Type: ${options.mimeType}\r\n\r\n`]);
  const footerBlob = new Blob([`\r\n--${boundary}--`]);

  const multipartBlob = new Blob([
    headerBlob,
    metadataBlob,
    fileHeaderBlob,
    options.fileBlob,
    footerBlob
  ], { type: `multipart/related; boundary=${boundary}` });

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: multipartBlob,
    }
  );

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Erro no upload do arquivo para o Google Drive (${response.status})`);
  }

  return response.json();
}

/**
 * Remove um arquivo ou pasta do Google Drive (move para a lixeira)
 */
export async function deleteDriveFile(fileId: string, accessToken?: string): Promise<void> {
  const token = accessToken || cachedAccessToken;
  if (!token) throw new Error('Não autenticado.');

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Erro ao excluir arquivo no Google Drive (${response.status})`);
  }
}
