import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { NavigationTab, Client, LegalCase, DocumentTemplate, ScheduledEvent, FirmSettings } from './types';
import {
  INITIAL_CLIENTS,
  INITIAL_CASES,
  TEMPLATES,
  SCHEDULED_EVENTS,
  LOGO_IMAGE_URL,
  USER_AVATAR_URL,
} from './data/mockData';
import { auth, testConnection } from './lib/firebase';
import {
  seedInitialFirestoreData,
  subscribeToClients,
  subscribeToCases,
  subscribeToTemplates,
  subscribeToEvents,
  subscribeToSettings,
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
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { ClientsView } from './components/ClientsView';
import { CasesView } from './components/CasesView';
import { DocumentsView } from './components/DocumentsView';
import { CalendarView } from './components/CalendarView';
import { SettingsView } from './components/SettingsView';
import { LoginScreen } from './components/LoginScreen';
import { NewCaseModal } from './components/NewCaseModal';
import { DocumentGeneratorModal } from './components/DocumentGeneratorModal';
import { ClientSelectorDocumentModal } from './components/ClientSelectorDocumentModal';
import { VariablesGuideModal } from './components/VariablesGuideModal';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Branding & Lawyer settings state
  const [settings, setSettings] = useState<FirmSettings>({
    firmName: 'Bizerra Neto',
    firmSubtitle: 'Advocacia',
    logoUrl: LOGO_IMAGE_URL,
    lawyerName: 'Dr. Bizerra Neto',
    lawyerTitle: 'Advogado Sócio • OAB/SP',
    lawyerAvatarUrl: USER_AVATAR_URL,
    oabNumber: 'OAB/SP 412.001',
    practiceAreas: [
      'Contencioso Cível',
      'Direito Trabalhista',
      'Direito Previdenciário',
      'Direito de Família',
      'Direito Empresarial',
      'Direito Tributário',
      'Direito Penal',
    ],
    clientCategories: [
      'BPC Loas',
      'Auxílio Doença',
      'Aposentadoria',
      'Trabalhista',
      'Cível',
      'Empresarial',
      'Família / Sucessões',
    ],
  });

  // Data state
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [cases, setCases] = useState<LegalCase[]>(INITIAL_CASES);
  const [events, setEvents] = useState<ScheduledEvent[]>(SCHEDULED_EVENTS);
  const [templates, setTemplates] = useState<DocumentTemplate[]>(TEMPLATES);

  // Initialize and Sync Firebase Firestore
  useEffect(() => {
    testConnection();
    seedInitialFirestoreData().then(() => {
      const unsubClients = subscribeToClients((remoteClients) => {
        setClients(remoteClients);
      });
      const unsubCases = subscribeToCases((remoteCases) => {
        setCases(remoteCases);
      });
      const unsubTemplates = subscribeToTemplates((remoteTemplates) => {
        setTemplates(remoteTemplates);
      });
      const unsubEvents = subscribeToEvents((remoteEvents) => {
        setEvents(remoteEvents);
      });
      const unsubSettings = subscribeToSettings((remoteSettings) => {
        if (remoteSettings && remoteSettings.firmName) setSettings(remoteSettings);
      });

      return () => {
        unsubClients();
        unsubCases();
        unsubTemplates();
        unsubEvents();
        unsubSettings();
      };
    });
  }, []);

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
  const [selectedCaseId, setSelectedCaseId] = useState<string>(INITIAL_CASES[0]?.id || '');

  // Modals
  const [newCaseModalOpen, setNewCaseModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'case' | 'client'>('case');

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [clientSelectorModalOpen, setClientSelectorModalOpen] = useState(false);
  const [variablesGuideModalOpen, setVariablesGuideModalOpen] = useState(false);

  const [selectedTemplateForDoc, setSelectedTemplateForDoc] = useState<DocumentTemplate | null>(TEMPLATES[0] || null);
  const [docClientName, setDocClientName] = useState('João Silva e Oliveira');
  const [docClientCpf, setDocClientCpf] = useState('123.456.789-00');
  const [prefilledGeneratedText, setPrefilledGeneratedText] = useState<string | null>(null);

  // Handlers with Firestore Persistence
  const handleSaveSettings = (newSettings: FirmSettings) => {
    setSettings(newSettings);
    saveSettingsInFirestore(newSettings);
  };

  const handleSaveTemplate = (tpl: DocumentTemplate) => {
    const exists = templates.some((t) => t.id === tpl.id);
    if (exists) {
      setTemplates(templates.map((t) => (t.id === tpl.id ? tpl : t)));
    } else {
      setTemplates([tpl, ...templates]);
    }
    saveTemplateInFirestore(tpl);
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
    updated.filter((t) => t.category === newCat).forEach(saveTemplateInFirestore);
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
    updated.filter((t) => t.format === newFmt).forEach(saveTemplateInFirestore);
  };

  const handleDeleteFormat = (fmt: string) => {
    setDocFormats(docFormats.filter((f) => f !== fmt));
  };

  // Handlers
  const handleCaseCreated = (newCase: LegalCase) => {
    setCases([newCase, ...cases]);
    setSelectedCaseId(newCase.id);
    setCurrentTab('cases');
    saveCaseInFirestore(newCase);
  };

  const handleUpdateCase = (updatedCase: LegalCase) => {
    setCases(cases.map((c) => (c.id === updatedCase.id ? updatedCase : c)));
    saveCaseInFirestore(updatedCase);
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
    saveClientInFirestore(newClient);
  };

  const handleSaveClient = (updatedClient: Client) => {
    setClients(clients.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
    saveClientInFirestore(updatedClient);
  };

  const handleDeleteClient = (clientId: string) => {
    setClients(clients.filter((c) => c.id !== clientId));
    deleteClientFromFirestore(clientId);
  };

  const handleAddEvent = (newEv: ScheduledEvent) => {
    setEvents([newEv, ...events]);
    saveEventInFirestore(newEv);
  };

  const handleUpdateEvent = (updatedEv: ScheduledEvent) => {
    setEvents(events.map((e) => (e.id === updatedEv.id ? updatedEv : e)));
    saveEventInFirestore(updatedEv);
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
        saveClientInFirestore(target);
      }
      return updated;
    });
  };

  const handleSelectClientForDoc = (clientName: string, clientCpf: string) => {
    setDocClientName(clientName);
    setDocClientCpf(clientCpf);
    setSelectedTemplateForDoc(TEMPLATES[0]);
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
    return (
      <LoginScreen
        firmName={settings.firmName}
        firmSubtitle={settings.firmSubtitle}
        logoUrl={settings.logoUrl}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-body-md text-sm relative overflow-x-hidden">
      {/* Background Ambient Glow */}
      <div 
        className="fixed inset-0 z-[-1] pointer-events-none opacity-60"
        style={{
          background: 'radial-gradient(circle at 10% 20%, rgba(15, 43, 92, 0.03), transparent 40%), radial-gradient(circle at 90% 80%, rgba(30, 58, 138, 0.03), transparent 40%)',
        }}
      />

      {/* Persistent Navigation */}
      <Navigation
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenNewCaseModal={() => {
          setModalMode('case');
          setNewCaseModalOpen(true);
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
      {currentTab === 'dashboard' && (
        <DashboardView
          cases={cases}
          events={events}
          clients={clients}
          templates={templates}
          onNavigateToTab={setCurrentTab}
          onSelectCase={setSelectedCaseId}
          onOpenNewCaseModal={() => {
            setModalMode('case');
            setNewCaseModalOpen(true);
          }}
          onOpenNewClientModal={() => {
            setModalMode('client');
            setNewCaseModalOpen(true);
          }}
          onOpenDocModal={() => {
            setSelectedTemplateForDoc(TEMPLATES[0]);
            setDocModalOpen(true);
          }}
        />
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
            setSelectedTemplateForDoc(TEMPLATES[0]);
            setDocModalOpen(true);
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
          settings={settings}
          onUpdateSettings={handleSaveSettings}
        />
      )}

      {/* Support View */}
      {currentTab === 'support' && (
        <main className="md:ml-64 pt-16 md:pt-8 pb-12 px-4 sm:px-6 md:px-8 min-h-screen">
          <div className="max-w-3xl mx-auto glass-panel rounded-[24px] p-8 border border-slate-200/90 shadow-sm space-y-6">
            <h1 className="font-display-lg text-2xl font-extrabold text-slate-900">Suporte ao Advogado • {settings.firmName} {settings.firmSubtitle}</h1>
            <p className="text-sm text-slate-600">
              Caso tenha dúvidas sobre acompanhamento de prazos no PJe, e-SAJ ou Projudi, ou sobre a geração de minutas, entre em contato com nossa equipe dedicada.
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-medium text-slate-700">Atendimento Prioritário OAB</span>
                <span className="text-blue-900 font-bold">(11) 3000-8800</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-medium text-slate-700">E-mail de Suporte Técnico</span>
                <span className="text-blue-900 font-bold">suporte@bizerraneto.adv.br</span>
              </div>
            </div>
          </div>
        </main>
      )}


      {/* Modals */}
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

      <ClientSelectorDocumentModal
        isOpen={clientSelectorModalOpen}
        onClose={() => setClientSelectorModalOpen(false)}
        template={selectedTemplateForDoc}
        clients={clients}
        settings={settings}
        onConfirmGenerate={handleConfirmGenerateFromClientSelector}
        onUpdateClientField={handleUpdateClientField}
      />

      <VariablesGuideModal
        isOpen={variablesGuideModalOpen}
        onClose={() => setVariablesGuideModalOpen(false)}
      />

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
      />
    </div>
  );
}
