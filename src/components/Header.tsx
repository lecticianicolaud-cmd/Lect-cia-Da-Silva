import React from 'react';
import { Calendar, FileSpreadsheet, LogOut, PlusCircle } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  currentTab: string;
  onNewQuote?: () => void;
  onNewInvoice?: () => void;
  currentUser: User | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNewQuote,
  onNewInvoice,
  currentUser,
  onLogout,
}) => {
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return { title: 'Painel Principal', subtitle: 'Visão geral financeira e operacional da gráfica' };
      case 'quotes':
        return { title: 'Cotações & Orçamentos', subtitle: 'Emissão, aprovação e conversão de propostas' };
      case 'invoices':
        return { title: 'Facturação Interna', subtitle: 'Documentos de gestão comercial e controlo de saldos' };
      case 'orders':
        return { title: 'Encomendas & Produção', subtitle: 'Acompanhamento do estado produtivo e prazos de entrega' };
      case 'payments':
        return { title: 'Pagamentos & Recibos', subtitle: 'Registo de pagamentos parciais, liquidações e estornos' };
      case 'clients':
        return { title: 'Gestão de Clientes', subtitle: 'Registo, histórico financeiro e contacto de clientes' };
      case 'catalog':
        return { title: 'Catálogo & Tabela Oficial de Preços', subtitle: 'Em vigor desde 28/07/2025 • Contacto: 945 562 287' };
      case 'expenses':
        return { title: 'Despesas & Custos de Produção', subtitle: 'Registo de saídas operacionais e materiais consumidos' };
      case 'reports':
        return { title: 'Relatórios Financeiros', subtitle: 'Análise de facturação, cobrança, dívidas e resultados' };
      case 'tests':
        return { title: 'Testes do Sistema — Secção 19', subtitle: 'Validação e verificação das regras financeiras e integridade' };
      case 'settings':
        return { title: 'Configurações & Auditoria', subtitle: 'Parâmetros da empresa, contas de utilizadores e cópias de segurança' };
      default:
        return { title: 'Gráfica Palanga', subtitle: 'Sistema de Gestão e Facturação' };
    }
  };

  const { title, subtitle } = getTabTitle(currentTab);
  const todayFormatted = new Intl.DateTimeFormat('pt-AO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
      <div>
        <h2 className="text-xl font-bold text-[#1D2B68] leading-tight">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-[#1D2B68]" />
          <span className="capitalize">{todayFormatted}</span>
        </div>

        {onNewQuote && (
          <button
            onClick={onNewQuote}
            className="flex items-center gap-1.5 bg-[#1D2B68] hover:bg-[#15204e] text-white text-xs font-semibold px-3 py-2 rounded-md transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#78C6D8]" />
            <span>Novo Orçamento</span>
          </button>
        )}

        {onNewInvoice && (
          <button
            onClick={onNewInvoice}
            className="flex items-center gap-1.5 bg-[#78C6D8] hover:bg-[#68b5c7] text-[#1D2B68] text-xs font-semibold px-3 py-2 rounded-md transition-colors shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Emitir Factura</span>
          </button>
        )}

        {onLogout && (
          <button
            onClick={onLogout}
            title="Sair / Terminar Sessão"
            className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold px-3 py-2 rounded-md transition-colors border border-red-200 shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        )}
      </div>
    </header>
  );
};
