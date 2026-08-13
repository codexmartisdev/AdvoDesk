import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { Client, GoogleDriveFile, GoogleDriveAbout } from '../types';
import {
  loginGoogleDrive,
  logoutGoogleDrive,
  getDriveAccessToken,
  getCachedDriveUser,
  listDriveFiles,
  createDriveFolder,
  uploadBinaryFileToDrive,
  getDriveAbout,
  getOrCreateJurisControlRootFolder,
  getOrCreateClientFolder,
  deleteDriveFile,
} from '../services/googleDriveService';

interface DriveViewProps {
  user: User | null;
  clients: Client[];
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

export const DriveView: React.FC<DriveViewProps> = ({ user, clients }) => {
  const [accessToken, setAccessToken] = useState<string | null>(getDriveAccessToken());
  const [driveUser, setDriveUser] = useState<User | null>(getCachedDriveUser() || user);
  const [aboutData, setAboutData] = useState<GoogleDriveAbout | null>(null);

  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Navigation / Folder State
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Meu Google Drive' },
  ]);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals & Actions State
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [creatingFolder, setCreatingFolder] = useState<boolean>(false);

  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [syncingClients, setSyncingClients] = useState<boolean>(false);

  // Delete Confirmation Modal
  const [fileToDelete, setFileToDelete] = useState<GoogleDriveFile | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Load files when token or folder changes
  useEffect(() => {
    if (accessToken) {
      loadFiles(currentFolderId);
      loadDriveAbout();
    }
  }, [accessToken, currentFolderId, activeFilter]);

  const loadDriveAbout = async () => {
    if (!accessToken) return;
    try {
      const about = await getDriveAbout(accessToken);
      setAboutData(about);
    } catch (err) {
      console.warn('Erro ao carregar dados da conta Drive:', err);
    }
  };

  const loadFiles = async (folderId: string = currentFolderId, query: string = searchQuery) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const mimeFilter = activeFilter === 'all' ? undefined : activeFilter;
      const res = await listDriveFiles(
        {
          folderId: folderId,
          searchQuery: query,
          mimeTypeFilter: mimeFilter,
          pageSize: 60,
        },
        accessToken
      );
      setFiles(res.files || []);
    } catch (err: any) {
      console.error('Erro ao listar arquivos do Drive:', err);
      setError(err.message || 'Falha ao carregar arquivos do Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loginGoogleDrive();
      setAccessToken(result.accessToken);
      setDriveUser(result.user);
      setSuccessMessage(`Google Drive conectado com sucesso para ${result.user.email}!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao conectar ao Google Drive:', err);
      setError(err.message || 'Erro ao autenticar com o Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await logoutGoogleDrive();
    setAccessToken(null);
    setFiles([]);
    setAboutData(null);
  };

  const handleOpenFolder = (folder: GoogleDriveFile) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSearchQuery('');
  };

  const handleBreadcrumbClick = (index: number) => {
    const target = breadcrumbs[index];
    const newCrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newCrumbs);
    setCurrentFolderId(target.id);
    setSearchQuery('');
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !accessToken) return;
    setCreatingFolder(true);
    try {
      await createDriveFolder(newFolderName.trim(), currentFolderId, accessToken);
      setNewFolderName('');
      setCreateFolderModalOpen(false);
      setSuccessMessage('Pasta criada com sucesso no Google Drive!');
      setTimeout(() => setSuccessMessage(null), 3500);
      loadFiles(currentFolderId);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar pasta no Google Drive.');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0 || !accessToken) return;

    setUploading(true);
    setError(null);
    let successCount = 0;

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      setUploadProgressText(`Enviando ${file.name} (${i + 1}/${uploadedFiles.length})...`);
      try {
        await uploadBinaryFileToDrive(
          {
            fileName: file.name,
            fileBlob: file,
            mimeType: file.type || 'application/octet-stream',
            parentFolderId: currentFolderId,
          },
          accessToken
        );
        successCount++;
      } catch (err: any) {
        console.error(`Erro ao enviar ${file.name}:`, err);
        setError(`Falha ao enviar ${file.name}: ${err.message}`);
      }
    }

    setUploading(false);
    setUploadProgressText('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (successCount > 0) {
      setSuccessMessage(`${successCount} arquivo(s) salvo(s) no Google Drive com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 4000);
      loadFiles(currentFolderId);
    }
  };

  const handleSyncClientFolders = async () => {
    if (!accessToken) return;
    setSyncingClients(true);
    setError(null);
    try {
      const rootFolder = await getOrCreateJurisControlRootFolder(accessToken);
      let count = 0;
      for (const client of clients) {
        await getOrCreateClientFolder(client.name, client.cpf, accessToken);
        count++;
      }
      setSuccessMessage(`Estrutura sincronizada! ${count} pastas de clientes organizadas em "${rootFolder.name}".`);
      setTimeout(() => setSuccessMessage(null), 5000);
      // Navigate to the root JurisControl folder
      setCurrentFolderId(rootFolder.id);
      setBreadcrumbs([
        { id: 'root', name: 'Meu Google Drive' },
        { id: rootFolder.id, name: rootFolder.name },
      ]);
    } catch (err: any) {
      console.error('Erro ao sincronizar pastas:', err);
      setError(err.message || 'Erro ao sincronizar pastas de clientes.');
    } finally {
      setSyncingClients(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete || !accessToken) return;
    setDeleting(true);
    try {
      await deleteDriveFile(fileToDelete.id, accessToken);
      setSuccessMessage(`"${fileToDelete.name}" foi removido do Google Drive.`);
      setTimeout(() => setSuccessMessage(null), 3500);
      setFileToDelete(null);
      loadFiles(currentFolderId);
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir item do Google Drive.');
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '—';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '—';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
    return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatQuota = (usageBytes?: string, limitBytes?: string) => {
    if (!usageBytes) return '';
    const usedMb = (parseInt(usageBytes, 10) / (1024 * 1024 * 1024)).toFixed(1);
    if (!limitBytes) return `${usedMb} GB utilizados`;
    const limitGb = (parseInt(limitBytes, 10) / (1024 * 1024 * 1024)).toFixed(0);
    return `${usedMb} GB de ${limitGb} GB utilizados`;
  };

  const getFileIconInfo = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return { icon: 'folder', color: 'text-amber-500', bg: 'bg-amber-50' };
    }
    if (mimeType.includes('pdf')) {
      return { icon: 'picture_as_pdf', color: 'text-red-600', bg: 'bg-red-50' };
    }
    if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text')) {
      return { icon: 'description', color: 'text-blue-600', bg: 'bg-blue-50' };
    }
    if (mimeType.includes('spreadsheet') || mimeType.includes('sheet') || mimeType.includes('excel')) {
      return { icon: 'table_chart', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    }
    if (mimeType.includes('image')) {
      return { icon: 'image', color: 'text-purple-600', bg: 'bg-purple-50' };
    }
    return { icon: 'draft', color: 'text-slate-500', bg: 'bg-slate-100' };
  };

  const connectedEmail = driveUser?.email || user?.email || 'codex.martis.dev@gmail.com';

  return (
    <main className="md:ml-64 pt-16 md:pt-8 pb-12 px-4 sm:px-6 md:px-8 min-h-screen relative z-10 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Drive Account Connection */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center space-x-4">
          {/* Google Drive Logo Icon */}
          <div className="w-14 h-14 rounded-2xl bg-white p-2.5 border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
            <svg viewBox="0 0 87.3 78" className="w-full h-full">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
              <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44C.4 49.95 0 51.5 0 53.05h27.5z" fill="#00ac47"/>
              <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.15z" fill="#ea4335"/>
              <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.95 0H34.35c-1.55 0-3.1.4-4.45 1.2z" fill="#00832d"/>
              <path d="M59.8 53.05H87.3c0-1.55-.4-3.1-1.2-4.5l-25.4-44c-.8-1.4-1.95-2.5-3.3-3.35L43.65 25z" fill="#ffba00"/>
              <path d="m73.55 76.8-13.75-23.75H27.5L13.75 76.8c1.35.8 2.9 1.2 4.45 1.2h50.9c1.55 0 3.1-.4 4.45-1.2z" fill="#2684fc"/>
            </svg>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display-lg text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Google Drive
              </h1>
              {accessToken ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Sincronizado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Desconectado
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Conta do Google conectada:{' '}
              <strong className="text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {connectedEmail}
              </strong>
            </p>

            {aboutData?.storageQuota && (
              <p className="text-[11px] text-slate-500 font-semibold mt-1">
                {formatQuota(aboutData.storageQuota.usage, aboutData.storageQuota.limit)}
              </p>
            )}
          </div>
        </div>

        {/* Connect / Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {!accessToken ? (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="glass-btn-primary px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{loading ? 'Conectando...' : 'Conectar ao Google Drive'}</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleSyncClientFolders}
                disabled={syncingClients}
                className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
                title="Cria e organiza pastas de todos os clientes no Google Drive"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {syncingClients ? 'sync' : 'create_new_folder'}
                </span>
                <span>{syncingClients ? 'Organizando...' : 'Organizar Pastas de Clientes'}</span>
              </button>

              <button
                onClick={() => setCreateFolderModalOpen(true)}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <span className="material-symbols-outlined text-[18px] text-amber-600">folder_open</span>
                <span>Nova Pasta</span>
              </button>

              <label className="cursor-pointer glass-btn-primary px-4 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all">
                <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                <span>{uploading ? 'Enviando...' : 'Fazer Upload'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => loadFiles(currentFolderId)}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors border border-slate-200"
                title="Recarregar Arquivos"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>

              <button
                onClick={handleDisconnect}
                className="p-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl transition-colors border border-red-200"
                title="Desconectar Google Drive"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-red-600">error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-800">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {uploadProgressText && (
        <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold flex items-center gap-2 animate-pulse">
          <span className="material-symbols-outlined text-blue-700 animate-spin">progress_activity</span>
          <span>{uploadProgressText}</span>
        </div>
      )}

      {/* Explorer Controls: Breadcrumbs, Search & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        {/* Breadcrumb Path Navigation */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs font-bold text-slate-700">
          <span className="material-symbols-outlined text-slate-400 text-[18px]">folder_shared</span>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id + idx}>
              {idx > 0 && <span className="text-slate-400">/</span>}
              <button
                onClick={() => handleBreadcrumbClick(idx)}
                className={`px-2 py-1 rounded-lg transition-colors truncate max-w-[200px] ${
                  idx === breadcrumbs.length - 1
                    ? 'bg-slate-100 text-slate-900 font-extrabold border border-slate-200'
                    : 'text-blue-900 hover:bg-blue-50'
                }`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'Todos os Arquivos' },
              { id: 'folder', label: 'Pastas' },
              { id: 'document', label: 'Documentos' },
              { id: 'pdf', label: 'PDFs' },
              { id: 'spreadsheet', label: 'Planilhas' },
              { id: 'image', label: 'Imagens' },
            ].map((filt) => (
              <button
                key={filt.id}
                onClick={() => setActiveFilter(filt.id)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                  activeFilter === filt.id
                    ? 'bg-blue-900 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {filt.label}
              </button>
            ))}
          </div>

          {/* Search & View Mode */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar no Drive..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadFiles(currentFolderId, searchQuery);
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              />
            </div>

            <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-400'}`}
                title="Visualização em Grade"
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded-lg ${viewMode === 'list' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-400'}`}
                title="Visualização em Lista"
              >
                <span className="material-symbols-outlined text-[18px]">view_list</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Files Display */}
      {!accessToken ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto border border-blue-100 shadow-xs">
            <span className="material-symbols-outlined text-3xl">cloud_sync</span>
          </div>
          <div>
            <h3 className="font-display-lg text-lg font-black text-slate-900">
              Conecte sua conta do Google Drive
            </h3>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto leading-relaxed font-medium">
              Sincronize petições, contratos, laudos e documentos dos clientes diretamente na nuvem do Google Drive associada ao seu e-mail (<strong className="text-slate-900">{connectedEmail}</strong>).
            </p>
          </div>
          <button
            onClick={handleConnect}
            className="glass-btn-primary px-6 py-3 rounded-2xl text-white font-bold text-xs inline-flex items-center gap-2 shadow-md"
          >
            <span className="material-symbols-outlined text-lg">login</span>
            <span>Autorizar Acesso ao Google Drive</span>
          </button>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-2xs space-y-3">
          <div className="w-10 h-10 border-3 border-blue-900/20 border-t-blue-900 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Carregando arquivos do Google Drive...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-2xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
            <span className="material-symbols-outlined text-3xl">folder_open</span>
          </div>
          <p className="text-sm font-bold text-slate-800">Esta pasta está vazia.</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Faça upload de arquivos ou crie pastas para organizar os documentos processuais.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setCreateFolderModalOpen(true)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold"
            >
              Criar Nova Pasta
            </button>
            <label className="cursor-pointer px-4 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold">
              Enviar Arquivos
              <input type="file" multiple onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => {
            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
            const iconInfo = getFileIconInfo(file.mimeType);

            return (
              <div
                key={file.id}
                onDoubleClick={() => {
                  if (isFolder) handleOpenFolder(file);
                }}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between space-y-3 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    onClick={() => {
                      if (isFolder) handleOpenFolder(file);
                    }}
                    className={`w-10 h-10 rounded-xl ${iconInfo.bg} ${iconInfo.color} flex items-center justify-center shrink-0 border border-slate-200/60`}
                  >
                    <span className="material-symbols-outlined text-xl">{iconInfo.icon}</span>
                  </div>

                  <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100">
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-slate-400 hover:text-blue-900 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Abrir no Google Drive"
                      >
                        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                      </a>
                    )}
                    {file.webContentLink && (
                      <a
                        href={file.webContentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Baixar Arquivo"
                      >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                      </a>
                    )}
                    <button
                      onClick={() => setFileToDelete(file)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Excluir"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>

                <div
                  onClick={() => {
                    if (isFolder) handleOpenFolder(file);
                  }}
                  className="flex-1"
                >
                  <h4
                    className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug group-hover:text-blue-900 transition-colors"
                    title={file.name}
                  >
                    {file.name}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mt-2">
                    <span>{isFolder ? 'Pasta' : formatFileSize(file.size)}</span>
                    <span>
                      {file.modifiedTime
                        ? new Date(file.modifiedTime).toLocaleDateString('pt-BR')
                        : ''}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3 hidden sm:table-cell">Tipo</th>
                <th className="px-4 py-3 hidden md:table-cell">Tamanho</th>
                <th className="px-4 py-3 hidden lg:table-cell">Modificado</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {files.map((file) => {
                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                const iconInfo = getFileIconInfo(file.mimeType);

                return (
                  <tr
                    key={file.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    <td
                      onClick={() => {
                        if (isFolder) handleOpenFolder(file);
                      }}
                      className="px-4 py-3 flex items-center space-x-2.5 min-w-0"
                    >
                      <span className={`material-symbols-outlined ${iconInfo.color} text-lg shrink-0`}>
                        {iconInfo.icon}
                      </span>
                      <span className="font-bold text-slate-900 truncate group-hover:text-blue-900 transition-colors max-w-xs md:max-w-md">
                        {file.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell font-medium">
                      {isFolder ? 'Pasta' : file.mimeType.split('/').pop()}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell font-mono text-[11px]">
                      {isFolder ? '—' : formatFileSize(file.size)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                      {file.modifiedTime
                        ? new Date(file.modifiedTime).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-blue-900 rounded-lg hover:bg-slate-100"
                            title="Abrir no Google Drive"
                          >
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                          </a>
                        )}
                        {file.webContentLink && (
                          <a
                            href={file.webContentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                            title="Baixar"
                          >
                            <span className="material-symbols-outlined text-[18px]">download</span>
                          </a>
                        )}
                        <button
                          onClick={() => setFileToDelete(file)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Excluir"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------- MODAL: CRIAR NOVA PASTA ------------------- */}
      {createFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl relative space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                <span className="material-symbols-outlined text-2xl">create_new_folder</span>
              </div>
              <div>
                <h3 className="font-title-md font-black text-slate-900 text-base">Nova Pasta</h3>
                <p className="text-xs text-slate-500">
                  Criar subpasta dentro de "{breadcrumbs[breadcrumbs.length - 1]?.name}"
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Nome da Pasta *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: Laudos Médicos - Perícia 2025"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateFolderModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder}
                  className="glass-btn-primary px-4 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  <span>{creatingFolder ? 'Criando...' : 'Criar Pasta'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------- MODAL: CONFIRMAR EXCLUSÃO ------------------- */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl relative space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center border border-red-100 shrink-0">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <div>
                <h3 className="font-title-md font-black text-slate-900 text-base">Excluir do Google Drive</h3>
                <p className="text-xs text-slate-500 font-medium">Confirmação obrigatória de segurança</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              Tem certeza que deseja remover o item <strong className="text-slate-900">"{fileToDelete.name}"</strong> do seu Google Drive?
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                <span>{deleting ? 'Excluindo...' : 'Excluir Item'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
