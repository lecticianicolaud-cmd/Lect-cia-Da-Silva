import React from 'react';
import {
  BarChart3,
  BookOpen,
  CheckCheck,
  CreditCard,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  Receipt,
  Settings,
  Users,
} from 'lucide-react';
import { CompanySettings, User } from '../types';
import { LogoReservedBox } from './LogoReservedBox';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  settings?: CompanySettings;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onLogout,
  settings,
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Painel Principal', icon: LayoutDashboard },
    { id: 'quotes', label: 'Cotações & Orçamentos', icon: FileSpreadsheet },
    { id: 'invoices', label: 'Facturação Interna', icon: FileText },
    { id: 'orders', label: 'Encomendas & Produção', icon: PackageCheck },
    { id: 'payments', label: 'Pagamentos & Recibos', icon: CreditCard },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'catalog', label: 'Catálogo & Preços', icon: BookOpen },
    { id: 'expenses', label: 'Despesas & Custos', icon: Receipt },
    { id: 'reports', label: 'Relatórios Financeiros', icon: BarChart3 },
    { id: 'tests', label: 'Testes do Sistema (Sec. 19)', icon: CheckCheck },
    ...(currentUser?.role === 'admin'
      ? [{ id: 'settings', label: 'Funcionários & PINs', icon: Settings }]
      : []),
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-[#78C6D8] text-[#1D2B68] text-[10px] font-bold px-2 py-0.5 rounded uppercase">Admin</span>;
      case 'financeiro':
        return <span className="bg-[#198754] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Financeiro</span>;
      default:
        return <span className="bg-slate-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Funcionário</span>;
    }
  };

  return (
    <aside className="w-68 bg-[#1D2B68] text-white flex flex-col h-screen shrink-0 border-r border-[#1D2B68]/40 no-print">
      {/* Cabeçalho da Barra Lateral */}
      <div className="p-4 border-b border-white/10 flex flex-col gap-2.5">
        <LogoReservedBox
          size="sm"
          variant="dark-bg"
          className="w-full mb-1"
          showDetails={true}
          logoUrl={settings?.logoUrl}
        />
        <div>
          <h1 className="text-base font-bold tracking-tight text-white leading-tight">
            Gráfica Palanga
          </h1>
          <p className="text-[10px] text-white/70 font-normal leading-tight">
            Palanga - Comércio e Serv. (SU), Lda.
          </p>
          <p className="text-[11px] text-[#78C6D8] font-medium leading-tight mt-0.5">
            Sistema de Gestão e Facturação
          </p>
        </div>
      </div>

      {/* Navegação Principal */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                isActive
                  ? 'bg-[#78C6D8] text-[#1D2B68] font-semibold shadow-sm'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#1D2B68]' : 'text-[#78C6D8]'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Rodapé do Utilizador Autenticado */}
      {currentUser && (
        <div className="p-3.5 border-t border-white/10 bg-black/15 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                {currentUser.name}
              </span>
              {getRoleBadge(currentUser.role)}
            </div>
            <p className="text-[11px] text-white/60 truncate">{currentUser.email}</p>
          </div>
          <button
            onClick={onLogout}
            title="Terminar Sessão"
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <LogOut className="w-4 h-4 text-red-300 hover:text-red-200" />
          </button>
        </div>
      )}
    </aside>
  );
};
