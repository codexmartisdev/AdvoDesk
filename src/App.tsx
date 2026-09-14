import React, { lazy, Suspense, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from '@firebase/auth';
import {
  NavigationTab,
  Client,
  LegalCase,
  DocumentTemplate,
  ScheduledEvent,
  FirmSettings,
  UserProfile,
} from './types';
import { INITIAL_CLIENTS, INITIAL_CASES, SCHEDULED_EVENTS } from './data/mockData';
import { auth } from './lib/firebase';
import {
  DEFAULT_SETTINGS,
  seedInitialFirestoreData,
  subscribeToClients,
  subscribeToCases,
  subscribeToTemplates,
  subscribeToEvents,
  subscribeToSettings,
  subscribeToWorkflowTemplates,
  ensureUserProfileInFirestore,
  subscribeToUserProfile,
  saveClientInFirestore,
  saveTemplateInFirestore,
  deleteTemplateFromFirestore,
  saveEventInFirestore,
  deleteEventFromFirestore,
  saveSettingsInFirestore,
} from './services/firestoreService';
import { INITIAL_WORKFLOWS } from './data/defaultWorkflows';
import { Navigation } from './components/Navigation';
import { LoginScreen } from './components/LoginScreen';

const DashboardView = lazy(() => import('./components/DashboardView').then((module) => ({ default: module.DashboardView })));
const BpcLoasView = lazy(() => import('./components/bpc/BpcLoasView').then((module) => ({ default: module.BpcLoasView })));
const ClientsView = lazy(() => import('./components/ClientsView').then((module) => ({ default: module.ClientsView })));
const CasesWorkspaceView = lazy(() => import('./components/cases/CasesWorkspaceView').then((module) => ({ default: module.CasesWorkspaceView })));
const DocumentsView = lazy(() => import('./components/DocumentsView').then((module) => ({ default: module.DocumentsView })));
const CalendarView = lazy(() => import('./components/CalendarView').then((module) => ({ default: module.CalendarView })));
const SettingsView = lazy(() => import('./components/SettingsView').then((module) => ({ default: module.SettingsView })));
const NewCaseModal = lazy(() => import('./components/NewCaseModal').then((module) => ({ default: module.NewCaseModal })));
const DocumentGeneratorModal = lazy(() => import('./components/DocumentGeneratorModal').then((module) => ({ default: module.DocumentGeneratorModal })));
const ClientSelectorDocumentModal = lazy(() => import('./components/ClientSelectorDocumentModal').then((module) => ({ default: module.ClientSelectorDocumentModal })));

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const [settings, setSettings] = useState<FirmSettings>(() => ({
    ...DEFAULT_SETTINGS,
    practiceAreas: [...DEFAULT_SETTINGS.practiceAreas],
    clientCategories: [...DEFAULT_SETTINGS.clientCategories],
  }));
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [cases, setCases] = useState<LegalCase[]>(INITIAL_CASES);
  const [events, setEvents] = useState<ScheduledEvent[]>(SCHEDULED_EVENTS);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [workflows, setWorkflows] = useState<any[]>(INITIAL_WORKFLOWS);

  const [docCategories, setDocCategories] = useState<string[]>([
    'Todos',
    'Previdenciário',
    'Contratos',
    'Representação',
    'Assistência Judiciária',
    'Petições',
    'Acordos',
    'Notificações',
  ]);
  const [docFormats, setDocFormats] = useState<string[]>([
    'Todos',
    'Petição Inicial',
    'Requerimento Administrativo',
    'Procuração / Declaração',
    'Contrato de Honorários',
    'Recurso / Contestação',
    'Notificação / Termo',
    'Outro',
  ]);

  const [newCaseModalOpen, setNewCaseModalOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [clientSelectorModalOpen, setClientSelectorModalOpen] = useState(false);
  const [selectedTemplateForDoc, setSelectedTemplateForDoc] = useState<DocumentTemplate | null>(null);
  const [selectedClientForDoc, setSelectedClientForDoc] = useState<Client | null>(null);
  const [docClientName, setDocClientName] = useState('');
  const [docClientCpf, setDocClientCpf] = useState('');
  const [prefilledGeneratedText, setPrefilledGeneratedText] = useState<string | null>(null);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserProfile(null);
        unsubProfile?.();
        unsubProfile = null;
        setAuthLoading(false);
        return;
      }

      setAuthLoading(true);
      setUserProfile(null);
      unsubProfile?.();
      unsubProfile = subscribeToUserProfile(currentUser.uid, (profile) => {
        if (profile) setUserProfile(profile);
      });

      try {
        const profile = await ensureUserProfileInFirestore(currentUser);
        if (profile) setUserProfile(profile);
      } catch (error) {
        console.error('Error resolving user profile in Firestore:', error);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => {
      unsubscribe();
      unsubProfile?.();
    };
  }, []);

  useEffect(() => {
    if (!user || !userProfile?.firmId) return;

    const firmId = userProfile.firmId;
    let mounted = true;
    const unsubscribeClients = subscribeToClients(firmId, (items) => mounted && setClients(items));
    const unsubscribeCases = subscribeToCases(firmId, (items) => mounted && setCases(items));
    const unsubscribeTemplates = subscribeToTemplates(firmId, (items) => mounted && setTemplates(items));
    const unsubscribeEvents = subscribeToEvents(firmId, (items) => mounted && setEvents(items));
    const unsubscribeSettings = subscribeToSettings(firmId, (value) => mounted && value && setSettings(value));
    const unsubscribeWorkflows = subscribeToWorkflowTemplates(firmId, (items) => {
      if (mounted && items?.length) setWorkflows(items);
    });

    if (userProfile.role === 'admin' || userProfile.permissions?.canManageWorkflows) {
      seedInitialFirestoreData(userProfile).catch((error) => console.warn('Background seed check notice:', error));
    }

    return () => {
      mounted = false;
      unsubscribeClients();
      unsubscribeCases();
      unsubscribeTemplates();
      unsubscribeEvents();
      unsubscribeSettings();
      unsubscribeWorkflows();
    };
  }, [user, userProfile?.uid, userProfile?.firmId]);

  const documentEligibleClients = clients.filter((client) => String(client.status) !== 'Arquivado');

  useEffect(() => {
    if (!selectedClientForDoc) return;
    const currentClient = clients.find((client) => client.id === selectedClientForDoc.id);
    if (!currentClient || String(currentClient.status) === 'Arquivado') {
      setSelectedClientForDoc(null);
      setDocClientName('');
      setDocClientCpf('');
      setPrefilledGeneratedText(null);
      setDocModalOpen(false);
      return;
    }
    if (currentClient !== selectedClientForDoc) {
      setSelectedClientForDoc(currentClient);
      setDocClientName(currentClient.name);
      setDocClientCpf(currentClient.cpf);
    }
  }, [clients, selectedClientForDoc?.id]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSaveSettings = (newSettings: FirmSettings) => {
    setSettings(newSettings);
    if (!userProfile?.firmId) return;
    void saveSettingsInFirestore(newSettings, userProfile.firmId);
  };

  const handleSaveTemplate = (template: DocumentTemplate) => {
    setTemplates((current) => {
      const exists = current.some((item) => item.id === template.id);
      return exists
        ? current.map((item) => item.id === template.id ? template : item)
        : [template, ...current];
    });
    if (!userProfile?.firmId) return;
    void saveTemplateInFirestore(template, userProfile.firmId);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates((current) => current.filter((item) => item.id !== id));
    void deleteTemplateFromFirestore(id);
  };

  const handleAddCategory = (category: string) => {
    setDocCategories((current) => current.includes(category) ? current : [...current, category]);
  };

  const handleEditCategory = (oldCategory: string, newCategory: string) => {
    setDocCategories((current) => current.map((item) => item === oldCategory ? newCategory : item));
    setTemplates((current) => current.map((template) => {
      if (template.category !== oldCategory) return template;
      const updated = { ...template, category: newCategory };
      if (userProfile?.firmId) void saveTemplateInFirestore(updated, userProfile.firmId);
      return updated;
    }));
  };

  const handleDeleteCategory = (category: string) => {
    setDocCategories((current) => current.filter((item) => item !== category));
  };

  const handleAddFormat = (format: string) => {
    setDocFormats((current) => current.includes(format) ? current : [...current, format]);
  };

  const handleEditFormat = (oldFormat: string, newFormat: string) => {
    setDocFormats((current) => current.map((item) => item === oldFormat ? newFormat : item));
    setTemplates((current) => current.map((template) => {
      if (template.format !== oldFormat) return template;
      const updated = { ...template, format: newFormat };
      if (userProfile?.firmId) void saveTemplateInFirestore(updated, userProfile.firmId);
      return updated;
    }));
  };

  const handleDeleteFormat = (format: string) => {
    setDocFormats((current) => current.filter((item) => item !== format));
  };

  const handleClientCreated = (newClient: Client) => {
    setClients((current) => [newClient, ...current]);
    setCurrentTab('clients');
    if (!userProfile?.firmId) return;
    void saveClientInFirestore(newClient, userProfile.firmId);
  };

  const handleSaveClient = (updatedClient: Client) => {
    setClients((current) => current.map((client) => client.id === updatedClient.id ? updatedClient : client));
    if (!userProfile?.firmId) return;
    void saveClientInFirestore(updatedClient, userProfile.firmId);
  };

  const handleAddEvent = (event: ScheduledEvent) => {
    setEvents((current) => [event, ...current]);
    if (!userProfile?.firmId) return;
    void saveEventInFirestore(event, userProfile.firmId);
  };

  const handleUpdateEvent = (updatedEvent: ScheduledEvent) => {
    setEvents((current) => current.map((event) => event.id === updatedEvent.id ? updatedEvent : event));
    if (!userProfile?.firmId) return;
    void saveEventInFirestore(updatedEvent, userProfile.firmId);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents((current) => current.filter((event) => event.id !== eventId));
    void deleteEventFromFirestore(eventId);
  };

  const handleUpdateClientField = (clientId: string, fieldKey: keyof Client, value: any) => {
    setClients((current) => current.map((client) => {
      if (client.id !== clientId) return client;
      const updated = { ...client, [fieldKey]: value };
      if (userProfile?.firmId) void saveClientInFirestore(updated, userProfile.firmId);
      return updated;
    }));
  };

  const handleSelectClientForDoc = (client: Client) => {
    if (String(client.status) === 'Arquivado') return;
    setSelectedClientForDoc(client);
    setDocClientName(client.name);
    setDocClientCpf(client.cpf);
    setSelectedTemplateForDoc(null);
    setPrefilledGeneratedText(null);
    setClientSelectorModalOpen(false);
    setDocModalOpen(false);
    setCurrentTab('documents');
  };

  const handleOpenDocModalForTemplate = (template: DocumentTemplate) => {
    setSelectedTemplateForDoc(template);
    const selected = selectedClientForDoc
      ? documentEligibleClients.find((client) => client.id === selectedClientForDoc.id)
      : null;
    if (selected) {
      setSelectedClientForDoc(selected);
      setDocClientName(selected.name);
      setDocClientCpf(selected.cpf);
      setPrefilledGeneratedText(null);
      setClientSelectorModalOpen(false);
      setDocModalOpen(true);
      return;
    }
    setSelectedClientForDoc(null);
    setDocClientName('');
    setDocClientCpf('');
    setPrefilledGeneratedText(null);
    setClientSelectorModalOpen(true);
  };

  const handleConfirmGenerateFromClientSelector = (
    generatedText: string,
    client: Client,
    template: DocumentTemplate
  ) => {
    if (String(client.status) === 'Arquivado') return;
    setSelectedClientForDoc(client);
    setDocClientName(client.name);
    setDocClientCpf(client.cpf);
    setSelectedTemplateForDoc(template);
    setPrefilledGeneratedText(generatedText);
    setClientSelectorModalOpen(false);
    setDocModalOpen(true);
  };

  const openDefaultTenantTemplate = () => {
    const template = templates.find((item) => item.status !== 'Arquivado') || templates[0];
    setSelectedClientForDoc(null);
    if (!template) {
      setSelectedTemplateForDoc(null);
      setCurrentTab('documents');
      return;
    }
    setSelectedTemplateForDoc(template);
    setPrefilledGeneratedText(null);
    setDocClientName('');
    setDocClientCpf('');
    setDocModalOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
        <p className="text-white text-xs font-bold uppercase tracking-widest">Carregando Sistema Jurídico...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen firmName={settings.firmName} firmSubtitle={settings.firmSubtitle} logoUrl={settings.logoUrl} />;
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">lock_person</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-extrabold text-slate-900">Acesso Não Provisionado</h2>
            <p className="text-xs text-slate-600 leading-relaxed">Seu usuário foi autenticado, mas ainda não possui acesso a um escritório no AdvoDesk.</p>
          </div>
          <button type="button" onClick={handleLogout} className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold">Sair</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0D0D0D] font-body-md text-sm relative overflow-x-hidden">
      <div className="fixed inset-0 z-[-1] pointer-events-none opacity-40" style={{ background: 'radial-gradient(circle at 10% 20%, rgba(201, 162, 39, 0.05), transparent 45%), radial-gradient(circle at 90% 80%, rgba(13, 13, 13, 0.03), transparent 45%)' }} />

      <Navigation
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        settings={settings}
        user={user}
        onLogout={handleLogout}
      />

      <Suspense fallback={<main className="md:ml-64 pt-24 text-center text-sm text-slate-500">Carregando...</main>}>
        {currentTab === 'dashboard' && (
          <DashboardView
            events={events}
            clients={clients}
            templates={templates}
            onNavigateToTab={setCurrentTab}
            onOpenNewClientModal={() => setNewCaseModalOpen(true)}
            onOpenDocModal={openDefaultTenantTemplate}
            onSelectClientForDoc={handleSelectClientForDoc}
          />
        )}

        {currentTab === 'bpc-loas' && <BpcLoasView clients={clients} />}

        {currentTab === 'clients' && (
          <ClientsView
            clients={clients}
            searchQuery={searchQuery}
            onOpenAddClientModal={() => setNewCaseModalOpen(true)}
            onSelectClientForDoc={handleSelectClientForDoc}
            onSaveClient={handleSaveClient}
            clientCategories={settings.clientCategories}
          />
        )}

        {String(currentTab) === 'cases' && <CasesWorkspaceView searchQuery={searchQuery} />}

        {currentTab === 'documents' && (
          <DocumentsView
            templates={templates}
            searchQuery={searchQuery}
            docCategories={docCategories}
            docFormats={docFormats}
            onSelectTemplateToGenerate={handleOpenDocModalForTemplate}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onAddCategory={handleAddCategory}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddFormat={handleAddFormat}
            onEditFormat={handleEditFormat}
            onDeleteFormat={handleDeleteFormat}
          />
        )}

        {currentTab === 'calendar' && (
          <CalendarView
            events={events}
            cases={cases}
            clients={clients}
            searchQuery={searchQuery}
            onAddEvent={handleAddEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView settings={{ ...settings, workflows }} onUpdateSettings={handleSaveSettings} />
        )}

        {currentTab === 'support' && (
          <main className="md:ml-64 pt-16 md:pt-8 pb-12 px-4 sm:px-6 md:px-8 min-h-screen">
            <div className="max-w-3xl mx-auto glass-panel rounded-[24px] p-8 border border-slate-200/90 shadow-sm space-y-6">
              <h1 className="font-display-lg text-2xl font-extrabold text-slate-900">Suporte Técnico • {settings.firmName}</h1>
              <p className="text-sm text-slate-600">Canais de suporte técnico do AdvoDesk.</p>
              <div className="space-y-3 text-xs">
                <a href="https://wa.me/55991503232" target="_blank" rel="noopener noreferrer" className="block p-4 rounded-xl bg-emerald-50 border border-emerald-200 font-bold text-emerald-800">WhatsApp: (55) 99150-3232</a>
                <a href="mailto:codex.martis.dev@gmail.com" className="block p-4 rounded-xl bg-blue-50 border border-blue-200 font-bold text-blue-900">codex.martis.dev@gmail.com</a>
              </div>
            </div>
          </main>
        )}
      </Suspense>

      <Suspense fallback={null}>
        {newCaseModalOpen && (
          <NewCaseModal
            isOpen={newCaseModalOpen}
            onClose={() => setNewCaseModalOpen(false)}
            clients={clients}
            onClientCreated={handleClientCreated}
            clientCategories={settings.clientCategories}
          />
        )}

        {clientSelectorModalOpen && (
          <ClientSelectorDocumentModal
            isOpen={clientSelectorModalOpen}
            onClose={() => setClientSelectorModalOpen(false)}
            template={selectedTemplateForDoc}
            clients={documentEligibleClients}
            settings={settings}
            onConfirmGenerate={handleConfirmGenerateFromClientSelector}
            onUpdateClientField={handleUpdateClientField}
          />
        )}

        {docModalOpen && (
          <DocumentGeneratorModal
            isOpen={docModalOpen}
            onClose={() => {
              setDocModalOpen(false);
              setSelectedClientForDoc(null);
              setDocClientName('');
              setDocClientCpf('');
              setPrefilledGeneratedText(null);
            }}
            template={selectedTemplateForDoc}
            clients={documentEligibleClients}
            initialClientName={docClientName}
            initialClientCpf={docClientCpf}
            initialGeneratedText={prefilledGeneratedText || undefined}
            settings={settings}
          />
        )}
      </Suspense>
    </div>
  );
}
