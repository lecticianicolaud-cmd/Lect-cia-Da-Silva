import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ShieldAlert } from 'lucide-react';
import { api } from './services/api';
import { CompanySettings, Invoice, User } from './types';
import { CatalogView } from './views/CatalogView';
import { ClientsView } from './views/ClientsView';
import { DashboardView } from './views/DashboardView';
import { ExpensesView } from './views/ExpensesView';
import { InvoicesView } from './views/InvoicesView';
import { LoginView } from './views/LoginView';
import { OrdersView } from './views/OrdersView';
import { PaymentsView } from './views/PaymentsView';
import { QuotesView } from './views/QuotesView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { SystemTestsView } from './views/SystemTestsView';

const DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'Gráfica Palanga',
  phone: '945 562 287',
  whatsapp: '945 562 287',
  email: '',
  nif: '',
  address: 'Luanda, Angola',
  currency: 'Kz',
  priceTableEffectiveDate: '2025-07-28',
  defaultTaxRate: 0,
  quoteValidityDays: 15,
  allowCreditOnOverpayment: false,
  logoStatus: 'Logótipo da empresa — configuração pendente',
  smtp: {
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    senderEmail: '',
    senderName: 'Gráfica Palanga',
    enabled: false,
  },
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);

  // Cross-view state (ex: paying an invoice directly from invoices list)
  const [preselectedInvoice, setPreselectedInvoice] = useState<Invoice | null>(null);
  const [autoOpenInvoiceModal, setAutoOpenInvoiceModal] = useState(false);
  const [autoOpenQuoteModal, setAutoOpenQuoteModal] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      const token = api.getToken();
      if (!token) {
        setCheckingAuth(false);
        return;
      }

      try {
        const { user } = await api.getMe();
        setCurrentUser(user);
        const settingsData = await api.getSettings();
        setSettings(settingsData);
      } catch (err) {
        api.clearToken();
        setCurrentUser(null);
      } finally {
        setCheckingAuth(false);
      }
    };

    initApp();
  }, []);

  const handleLogout = () => {
    api.clearToken();
    setCurrentUser(null);
    setCurrentTab('dashboard');
  };

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    try {
      const settingsData = await api.getSettings();
      setSettings(settingsData);
    } catch {
      // keep default
    }
  };

  const handleOpenPaymentForInvoice = (invoice: Invoice) => {
    setPreselectedInvoice(invoice);
    setCurrentTab('payments');
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#1D2B68] border-t-[#78C6D8] rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-[#1D2B68]">
            A inicializar Gráfica Palanga — Sistema de Gestão e Facturação...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} onAccessSettings={() => setCurrentTab('settings')} />;
  }

  if (currentTab === 'settings' && currentUser && currentUser.role !== 'admin') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F7FA]">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1D2B68] mb-2">Acesso Negado</h2>
          <p className="text-slate-600 mb-6">Apenas administradores podem aceder às configurações.</p>
          <button
            onClick={() => setCurrentTab('dashboard')}
            className="bg-[#1D2B68] text-white px-4 py-2 rounded-lg font-bold"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F5F7FA] text-[#343A40] overflow-hidden">
      {/* Menu Lateral Fixo */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        settings={settings}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          currentTab={currentTab}
          onNewQuote={() => {
            setAutoOpenQuoteModal(true);
            setCurrentTab('quotes');
          }}
          onNewInvoice={() => {
            setAutoOpenInvoiceModal(true);
            setCurrentTab('invoices');
          }}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigate={(tab) => setCurrentTab(tab)}
              onNewQuote={() => {
                setAutoOpenQuoteModal(true);
                setCurrentTab('quotes');
              }}
              onNewInvoice={() => {
                setAutoOpenInvoiceModal(true);
                setCurrentTab('invoices');
              }}
            />
          )}

          {currentTab === 'quotes' && (
            <QuotesView
              currentUser={currentUser}
              settings={settings}
              onNavigateToInvoices={() => setCurrentTab('invoices')}
              onNavigateToOrders={() => setCurrentTab('orders')}
              autoOpenCreateModal={autoOpenQuoteModal}
              onClearAutoOpenCreateModal={() => setAutoOpenQuoteModal(false)}
            />
          )}

          {currentTab === 'invoices' && (
            <InvoicesView
              currentUser={currentUser}
              settings={settings}
              onOpenPaymentForInvoice={handleOpenPaymentForInvoice}
              autoOpenCreateModal={autoOpenInvoiceModal}
              onClearAutoOpenCreateModal={() => setAutoOpenInvoiceModal(false)}
            />
          )}

          {currentTab === 'orders' && (
            <OrdersView currentUser={currentUser} />
          )}

          {currentTab === 'payments' && (
            <PaymentsView
              currentUser={currentUser}
              settings={settings}
              preselectedInvoice={preselectedInvoice}
              onClearPreselectedInvoice={() => setPreselectedInvoice(null)}
            />
          )}

          {currentTab === 'clients' && (
            <ClientsView currentUser={currentUser} />
          )}

          {currentTab === 'catalog' && (
            <CatalogView currentUser={currentUser} />
          )}

          {currentTab === 'expenses' && (
            <ExpensesView currentUser={currentUser} />
          )}

          {currentTab === 'reports' && (
            <ReportsView currentUser={currentUser} settings={settings} />
          )}

          {currentTab === 'tests' && (
            <SystemTestsView />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              onNavigateHome={() => setCurrentTab('dashboard')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
