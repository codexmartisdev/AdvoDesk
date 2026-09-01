import React, { lazy, Suspense, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { NavigationTab, Client, LegalCase, DocumentTemplate, ScheduledEvent, FirmSettings, UserProfile } from './types';
import {
  INITIAL_CLIENTS,
  INITIAL_CASES,
  SCHEDULED_EVENTS,
} from './data/mockData';
import { auth, testConnection } from './lib/firebase';
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
  deleteClientFromFirestore,
  saveCaseInFirestore,
  deleteCaseFromFirestore,
  saveTemplateInFirestore,
  deleteTemplateFromFirestore,
  saveEventInFirestore,
  deleteEventFromFirestore,
  saveSettingsInFirestore,
} from './services/firestoreService';
import { INITIAL_WORKFLOWS } from './data/defaultWorkflows';
import { Navigation } from './components/Navigation';
const RegisterCaseWizard = lazy(() => import('./components/RegisterCaseWizard').then((module) => ({ default: module.RegisterCaseWizard })));
const DashboardView = lazy(() => import('./components/DashboardView').then((module) => ({ default: module.DashboardView })));
const ClientsView = lazy(() => import('./components/ClientsView').then((module) => ({ default: module.ClientsView })));
const CasesView = lazy(() => import('./components/CasesView').then((module) => ({ default: module.CasesView })));
const DocumentsView = lazy(() => import('./components/DocumentsView').then((module) => ({ default: module.DocumentsView })));
const CalendarView = lazy(() => import('./components/CalendarView').then((module) => ({ default: module.CalendarView })));
const SettingsView = lazy(() => import('./components/SettingsView').then((module) => ({ default: module.SettingsView })));
import { LoginScreen } from './components/LoginScreen';
const NewCaseModal = lazy(() => import('./components/NewCaseModal').then((module) => ({ default: module.NewCaseModal })));
const DocumentGeneratorModal = lazy(() => import('./components/DocumentGeneratorModal').then((module) => ({ default: module.DocumentGeneratorModal })));
const ClientSelectorDocumentModal = lazy(() => import('./components/ClientSelectorDocumentModal').then((module) => ({ default: module.ClientSelectorDocumentModal })));
const VariablesGuideModal = lazy(() => import('./components/VariablesGuideModal').then((module) => ({ default: module.VariablesGuideModal })));

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Firebase Auth State Listener & Profile Resolution
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAuthLoading(true);
        setUserProfile(null);

        // Subscribe to real-time updates on user profile
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
        unsubProfile = subscribeToUserProfile(currentUser.uid, (updatedProfile) => {
          if (updatedProfile) {
            setUserProfile(updatedProfile);
          }
        });

        // Ensure and resolve persisted user profile in Firestore
        try {
          const persistedProfile = await ensureUserProfileInFirestore(currentUser);
          if (persistedProfile) {
            setUserProfile(persistedProfile);
          }
        } catch (err) {
          console.error('Error resolving user profile in Firestore:', err);
        } finally {
          setAuthLoading(false);
        }
      } else {
        setUserProfile(null);
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
        setAuthLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Branding & Lawyer settings state
  const [settings, setSettings] = useState<FirmSettings>(() => ({
    ...DEFAULT_SETTINGS,
    practiceAreas: [...DEFAULT_SETTINGS.practiceAreas],
    clientCategories: [...DEFAULT_SETTINGS.clientCategories],
  }));

  // Data state
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [cases, setCases] = useState<LegalCase[]>(INITIAL_CASES);
  const [events, setEvents] = useState<ScheduledEvent[]>(SCHEDULED_EVENTS);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [workflows, setWorkflows] = useState<any[]>(INITIAL_WORKFLOWS);

  // Initialize and Sync Firebase Firestore only after User Profile & Firm ID are fully resolved
  useEffect(() => {
    if (!user || !userProfile || !userProfile.firmId) return;

    const firmId = userProfile.firmId;
    let isMounted = true;
    let unsubClients: (() => void) | null = null;
    let unsubCases: (() => void) | null = null;
    let unsubTemplates: (() => void) | null = null;
    let unsubEvents: (() => void) | null = null;
    let unsubSettings: (() => void) | null = null;
    let unsubWorkflows: (() => void) | null = null;

    // 1. Immediately launch private multitenant real-time subscriptions in parallel
    unsubClients = subscribeToClients(firmId, (remoteClients) => {
      if (isMounted) setClients(remoteClients);
    });
    unsubCases = subscribeToCases(firmId, (remoteCases) => {
      if (isMounted) setCases(remoteCases);
    });
    unsubTemplates = subscribeToTemplates(firmId, (remoteTemplates) => {
      if (isMounted) setTemplates(remoteTemplates);
    });
    unsubEvents = subscribeToEvents(firmId, (remoteEvents) => {
      if (isMounted) setEvents(remoteEvents);
    });
    unsubSettings = subscribeToSettings(firmId, (remoteSettings) => {
      if (isMounted && remoteSettings) setSettings(remoteSettings);
    });
    unsubWorkflows = subscribeToWorkflowTemplates(firmId, (remoteWorkflows) => {
      if (isMounted && remoteWorkflows && remoteWorkflows.length > 0) {
        setWorkflows(remoteWorkflows);
      }
    });

    // 2. Perform administrative data seed asynchronously in the background without blocking render
    if (userProfile?.role === 'admin' || userProfile?.permissions?.canManageWorkflows) {
      seedInitialFirestoreData(userProfile).catch((err) => {
        console.warn('Background seed check notice:', err);
      });
    }

    return () => {
      isMounted = false;
      if (unsubClients) unsubClients();
      if (unsubCases) unsubCases();
      if (unsubTemplates) unsubTemplates();
      if (unsubEvents) unsubEvents();
      if (unsubSettings) unsubSettings();
      if (unsubWorkflows) unsubWorkflows();
    };
  }, [user, userProfile?.uid, userProfile?.firmId]);

  // Document Categories & Formats
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

  // Active selections
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // Modals
  const [newCaseModalOpen, setNewCaseModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'case' | 'client'>('case');

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [clientSelectorModalOpen, setClientSelectorModalOpen] = useState(false);
  const [variablesGuideModalOpen, setVariablesGuideModalOpen] = useState(false);

  const [selectedTemplateForDoc, setSelectedTemplateForDoc] = useState<DocumentTemplate | null>(null);
  const [docClientName, setDocClientName] = useState('');
  const [docClientCpf, setDocClientCpf] = useState('');
  const [prefilledGeneratedText, setPrefilledGeneratedText] = useState<string | null>(null);

  const openDefaultTenantTemplate = (
    clientName?: string,
    clientCpf?: string
  ) => {
    const tenantTemplate = templates[0];

    if (!tenantTemplate) {
      console.warn(
        '[Documents] No tenant template available. Redirecting to Documents.'
      );

      setSelectedTemplateForDoc(null);
      setPrefilledGeneratedText(null);
      setDocClientName('');
      setDocClientCpf('');
      setDocModalOpen(false);
      setCurrentTab('documents');
      return;
    }

    setSelectedTemplateForDoc(tenantTemplate);
    setPrefilledGeneratedText(null);
    setDocClientName(clientName || '');
    setDocClientCpf(clientCpf || '');
    setDocModalOpen(true);
  };

  // Handlers with Firestore Persistence
  const handleSaveSettings = (newSettings: FirmSettings) => {
    setSettings(newSettings);
    if (!userProfile?.firmId) {
      console.error('[Firestore Write Error] Cannot save settings: userProfile.firmId is not defined.');
      return;
    }
    saveSettingsInFirestore(newSettings, userProfile.firmId);
  };

  const handleSaveTemplate = (tpl: DocumentTemplate) => {
    const exists = templates.some((t) => t.id === tpl.id);
    if (exists) {
      setTemplates(templates.map((t) => (t.id === tpl.id ? tpl : t)));
    } else {
      setTemplates([tpl, ...templates]);
    }
    if (!userProfile?.firmId) {
      console.error('[Firestore Write Error] Cannot save template: userProfile.firmId is not defined.');
      return;
    }
    saveTemplateInFirestore(tpl, userProfile.firmId);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter((t) => t.id !== id));
    deleteTemplateFromFirestore(id);
  };

  const handleAddCategory = (cat: string) => {
    if (!docCategories.includes(cat)) {
      setDocCategories([...docCategories, cat]);
    }
  };

  const handleEditCategory = (oldCat: string, newCat: string) => {
    setDocCategories(docCategories.map((c) => (c === oldCat ? newCat : c)));
    const updated = templates.map((t) => (t.category === oldCat ? { ...t, category: newCat } : t));
    setTemplates(updated);
    if (!userProfile?.firmId) {
      console.error('[Firestore Write Error] Cannot save templates for updated category: userProfile.firmId is not defined.');
      return;
    }
    const firmId = userProfile.firmId;
    updated.filter((t) => t.category === newCat).forEach((t) => saveTemplateInFirestore(t, firmId));
  };

  const handleDeleteCategory = (cat: string) => {
    setDocCategories(docCategories.filter((c) => c !== cat));
  };

  const handleAddFormat = (fmt: string) => {
    if (!docFormats.includes(fmt)) {
      setDocFormats([...docFormats, fmt]);
    }
  };

  const handleEditFormat = (oldFmt: string, newFmt: string) => {
    setDocFormats(docFormats.map((f) => (f === oldFmt ? newFmt : f)));
    const updated = templates.map((t) => (t.format === oldFmt ? { ...t, format: newFmt } : t));
    setTemplates(updated);
    if (!userProfile?.firmId) {
      console.error('[Firestore Write Error] Cannot save templates for updated format: userProfile.firmId is not defined.');
      return;
    }
    const firmId = userProfile.firmId;
    updated.filter((t) => t.format === newFmt).forEach((t) => saveTemplateInFirestore(t, firmId));
  };

  const handleDeleteFormat = (fmt: string) => {
    setDocFormats(docFormats.filter((f) => f !== fmt));
  };

  // Handlers
  const handleCaseCreated = (newCase: LegalCase) => {
    setCases([newCase, ...cases]);
    setSelectedCaseId(newCase.id);
    setCurrentTab('cases');
    if (!userProfile?.firmId) {
      console.error('[Firestore Write Error] Cannot save new case: userProfile.firmId is not defined.');
      return;
    }
    saveCaseInFirestore(newCase, userProfile.firmId);
  };

  const handleUpdateCase = (updatedCase: LegalCase) => {
    setCases(cases.map((c) => (c.id === updatedCase.id ? updatedCase : c)));
    if (!userProfile?.firmId) {
      console.error('[Firestore Write Error] Cannot save updated case: userProfile.firmId is not defined.');
      return;
    }
    saveCaseInFirestore(updatedCase, userProfile.firmId);
  };

  const handleDeleteCase = (caseId: string) => {
    const remaining = cases.filter((c) => c.id !== caseId);
    setCases(remaining);
    if (remaining.length > 0) {
      setSelectedCaseId(remaining[0].id);
    }
    deleteCaseFromFirestore(caseId);
  };

  const handleClientCreated = (newClient: Client) => {
    setClients([newClient, ...clients]);
    setCurrentTab('clients');
    if (!userProfile?.firmId) {
      console.error('[Firestore Write Error] Cannot save new client: userProfile.firmId is not defined.');
      return;
    }
    saveClientInFirestore(newClient, userProfile.firmId);
  };

  const handleSaveClient = (updatedClient: Client) => {
    setClients(clients.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
    if (!userProfile?.firmId) {
      console.error('[Firestore Write Error] Cannot save client: userProfile.firmId is not defined.');
      return;
    }
    saveClientInFirestore(updatedClient, userProfile.firmId);
  };

  const handleDeleteClient = (clientId: string) => {
    setClients(clients.filter((c) => c.id !== clientId));
    deleteClientFromFirestore(clientId);
  };

  const handleAddEvent = (newEv: ScheduledEvent) => {
    setEvents([newEv, ...events]);
    if (!userProfile?.firmId) {
      console.error('[Firestore Write Error] Cannot save new event: userProfile.firmId is not defined.');
      return;
    }
    saveEventInFirestore(newEv, userProfile.firmId);
  };

  const handleUpdateEvent = (updatedEv: ScheduledEvent) => {
    setEvents(events.map((e) => (e.id === updatedEv.id ? updatedEv : e)));
    if (!userProfile?.firmId) {
      console.error('[Firestore Write Error] Cannot save updated event: userProfile.firmId is not defined.');
      return;
    }
    saveEventInFirestore(updatedEv, userProfile.firmId);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(events.filter((e) => e.id !== eventId));
    deleteEventFromFirestore(eventId);
  };

  const handleOpenDocModalForTemplate = (template: DocumentTemplate) => {
    setSelectedTemplateForDoc(template);
    setClientSelectorModalOpen(true);
  };

  const handleConfirmGenerateFromClientSelector = (
    generatedText: string,
    client: Client,
    template: DocumentTemplate
  ) => {
    setDocClientName(client.name);
    setDocClientCpf(client.cpf);
    setSelectedTemplateForDoc(template);
    setPrefilledGeneratedText(generatedText);
    setClientSelectorModalOpen(false);
    setDocModalOpen(true);
  };

  const handleUpdateClientField = (clientId: string, fieldKey: keyof Client, value: any) => {
    setClients((prev) => {
      const updated = prev.map((c) => (c.id === clientId ? { ...c, [fieldKey]: value } : c));
      const target = updated.find((c) => c.id === clientId);
      if (target) {
        if (!userProfile?.firmId) {
          console.error('[Firestore Write Error] Cannot update client field: userProfile.firmId is not defined.');
        } else {
          saveClientInFirestore(target, userProfile.firmId);
        }
      }
      return updated;
    });
  };

  const handleSelectClientForDoc = (clientName: string, clientCpf: string) => {
    openDefaultTenantTemplate(clientName, clientCpf);
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
    return (
      <LoginScreen
        firmName={settings.firmName}
        firmSubtitle={settings.firmSubtitle}
        logoUrl={settings.logoUrl}
      />
    );
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
            <p className="text-xs text-slate-600 leading-relaxed">
              Seu usuário foi autenticado, mas ainda não possui acesso a um escritório no AdvoDesk. Solicite ao administrador que cadastre ou autorize seu perfil.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            <span>Sair</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0D0D0D] font-body-md text-sm relative overflow-x-hidden">
      {/* Background Ambient Glow */}
      <div 
        className="fixed inset-0 z-[-1] pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(circle at 10% 20%, rgba(201, 162, 39, 0.05), transparent 45%), radial-gradient(circle at 90% 80%, rgba(13, 13, 13, 0.03), transparent 45%)',
        }}
      />

      {/* Persistent Navigation */}
      <Navigation
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenNewCaseModal={() => {
          setCurrentTab('create-case');
        }}
        onOpenAddEntryModal={() => {
          setModalMode('client');
          setNewCaseModalOpen(true);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        settings={settings}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main View Router */}
      <Suspense fallback={<main className="md:ml-64 pt-24 text-center text-sm text-slate-500">Carregando...</main>}>
      {currentTab === 'dashboard' && (
        <DashboardView
          cases={cases}
          events={events}
          clients={clients}
          templates={templates}
          onNavigateToTab={setCurrentTab}
          onSelectCase={setSelectedCaseId}
          onOpenNewCaseModal={() => {
            setCurrentTab('create-case');
          }}
          onOpenNewClientModal={() => {
            setModalMode('client');
            setNewCaseModalOpen(true);
          }}
          onOpenDocModal={() => {
            openDefaultTenantTemplate();
          }}
        />
      )}

      {currentTab === 'create-case' && (
        <main className="pl-0 md:pl-64 pt-16 md:pt-6 pb-12 transition-all">
          <RegisterCaseWizard
            clients={clients}
            onCaseCreated={handleCaseCreated}
            onNavigateToTab={setCurrentTab}
            onSelectCaseId={setSelectedCaseId}
            onOpenDocModalForCase={(caseItem) => {
              openDefaultTenantTemplate();
            }}
            settings={{ ...settings, workflows }}
          />
        </main>
      )}

      {currentTab === 'clients' && (
        <ClientsView
          clients={clients}
          searchQuery={searchQuery}
          onOpenAddClientModal={() => {
            setModalMode('client');
            setNewCaseModalOpen(true);
          }}
          onSelectClientForDoc={handleSelectClientForDoc}
          onSaveClient={handleSaveClient}
          onDeleteClient={handleDeleteClient}
          clientCategories={settings.clientCategories}
        />
      )}

      {currentTab === 'cases' && (
        <CasesView
          cases={cases}
          clients={clients}
          selectedCaseId={selectedCaseId}
          onSelectCaseId={setSelectedCaseId}
          onOpenDocModal={() => {
            openDefaultTenantTemplate();
          }}
          onUpdateCase={handleUpdateCase}
          onDeleteCase={handleDeleteCase}
          practiceAreas={settings.practiceAreas}
          clientCategories={settings.clientCategories}
        />
      )}

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

      {/* Settings View */}
      {currentTab === 'settings' && (
        <SettingsView
          settings={{ ...settings, workflows }}
          onUpdateSettings={handleSaveSettings}
        />
      )}

      {/* Support View */}
      {currentTab === 'support' && (
        <main className="md:ml-64 pt-16 md:pt-8 pb-12 px-4 sm:px-6 md:px-8 min-h-screen">
          <div className="max-w-3xl mx-auto glass-panel rounded-[24px] p-8 border border-slate-200/90 shadow-sm space-y-6">
            <h1 className="font-display-lg text-2xl font-extrabold text-slate-900">Suporte Técnico • {settings.firmName} {settings.firmSubtitle}</h1>
            <p className="text-sm text-slate-600">
              Caso tenha dúvidas sobre o sistema ou para suporte no desenvolvimento, entre em contato através dos canais abaixo:
            </p>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-xl">chat</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-sm block">WhatsApp do Desenvolvedor do Sistema</span>
                    <span className="text-slate-500 text-xs">Contato direto via WhatsApp para suporte técnico</span>
                  </div>
                </div>
                <a
                  href="https://wa.me/55991503232"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm">chat</span>
                  <span>(55) 99150-3232</span>
                </a>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0A1F44] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-xl">mail</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-sm block">E-mail de Suporte Técnico</span>
                    <span className="text-slate-500 text-xs">Canal oficial para dúvidas, melhorias e chamados</span>
                  </div>
                </div>
                <a
                  href="mailto:codex.martis.dev@gmail.com"
                  className="px-4 py-2 bg-[#0A1F44] hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm">mail</span>
                  <span>codex.martis.dev@gmail.com</span>
                </a>
              </div>
            </div>
          </div>
        </main>
      )}


      </Suspense>
      {/* Modals */}
      <Suspense fallback={null}>
      {newCaseModalOpen && (
      <NewCaseModal
        isOpen={newCaseModalOpen}
        onClose={() => setNewCaseModalOpen(false)}
        clients={clients}
        onCaseCreated={handleCaseCreated}
        onClientCreated={handleClientCreated}
        initialMode={modalMode}
        practiceAreas={settings.practiceAreas}
        clientCategories={settings.clientCategories}
      />
      )}

      {clientSelectorModalOpen && (
      <ClientSelectorDocumentModal
        isOpen={clientSelectorModalOpen}
        onClose={() => setClientSelectorModalOpen(false)}
        template={selectedTemplateForDoc}
        clients={clients}
        settings={settings}
        onConfirmGenerate={handleConfirmGenerateFromClientSelector}
        onUpdateClientField={handleUpdateClientField}
      />
      )}

      {variablesGuideModalOpen && (
      <VariablesGuideModal
        isOpen={variablesGuideModalOpen}
        onClose={() => setVariablesGuideModalOpen(false)}
      />
      )}

      {docModalOpen && (
      <DocumentGeneratorModal
        isOpen={docModalOpen}
        onClose={() => {
          setDocModalOpen(false);
          setPrefilledGeneratedText(null);
        }}
        template={selectedTemplateForDoc}
        clients={clients}
        initialClientName={docClientName}
        initialClientCpf={docClientCpf}
        initialGeneratedText={prefilledGeneratedText || undefined}
        settings={settings}
        onSaveTemplate={handleSaveTemplate}
      />
      )}
      </Suspense>
    </div>
  );
}
