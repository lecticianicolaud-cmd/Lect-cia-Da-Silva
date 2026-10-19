import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Package,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { api } from '../services/api';
import { formatKz } from '../utils/calculations';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  onNewQuote: () => void;
  onNewInvoice: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onNewQuote,
  onNewInvoice,
}) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar indicadores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-[#78C6D8]" />
        <span>A calcular indicadores reais a partir da base de dados...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <p className="font-bold mb-1">Não foi possível carregar os dados do painel:</p>
        <p>{error}</p>
        <button
          onClick={fetchStats}
          className="mt-3 px-3 py-1.5 bg-red-600 text-white rounded font-semibold text-xs"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta de Encomendas Atrasadas */}
      {stats.overdueOrdersCount > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg text-red-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-red-800">
                Atenção: Existem {stats.overdueOrdersCount} encomenda(s) com prazo de entrega ultrapassado!
              </h4>
              <p className="text-[11px] text-red-600">
                Consulte o módulo de encomendas e produção para regularizar o processo.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('orders')}
            className="text-xs font-bold bg-red-700 text-white px-3 py-1.5 rounded-lg hover:bg-red-800 transition-colors"
          >
            Ver Encomendas
          </button>
        </div>
      )}

      {/* Cartões de Indicadores Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Facturado no Mês */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500">Facturado no Mês</span>
            <div className="p-2 bg-[#1D2B68]/10 text-[#1D2B68] rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-[#1D2B68]">
              {formatKz(stats.totalInvoicedMonth)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span>Hoje:</span>
              <span className="font-bold text-slate-700">{formatKz(stats.totalInvoicedToday)}</span>
            </p>
          </div>
        </div>

        {/* Total Recebido Efectivamente */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500">Total Recebido</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-[#198754]">
              {formatKz(stats.totalReceived)}
            </h3>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">
              Pagamentos liquidados e validados
            </p>
          </div>
        </div>

        {/* Total de Dívidas Pendentes */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500">Saldos em Dívida</span>
            <div className="p-2 bg-rose-50 text-rose-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-[#DC3545]">
              {formatKz(stats.totalPendingDebt)}
            </h3>
            <button
              onClick={() => onNavigate('reports')}
              className="text-[11px] text-[#DC3545] hover:underline mt-1 font-medium block text-left"
            >
              Consultar lista de clientes devedores →
            </button>
          </div>
        </div>

        {/* Despesas & Resultado Estimado */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500">Resultado Estimado</span>
            <div className="p-2 bg-[#78C6D8]/20 text-[#1D2B68] rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3
              className={`text-2xl font-black ${
                stats.estimatedResult >= 0 ? 'text-[#1D2B68]' : 'text-red-600'
              }`}
            >
              {formatKz(stats.estimatedResult)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Despesas Totais: <span className="font-bold text-slate-700">{formatKz(stats.totalExpenses)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Indicadores Operacionais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('orders')}
          className="bg-white p-4 rounded-xl border border-slate-200 cursor-pointer hover:border-[#78C6D8] transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-[#F0A33A] rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Em Produção / Acabamento</p>
              <p className="text-xl font-bold text-slate-800">{stats.ordersInProduction} encomendas</p>
            </div>
          </div>
          <span className="text-xs text-[#1D2B68] font-bold">Ver</span>
        </div>

        <div
          onClick={() => onNavigate('orders')}
          className="bg-white p-4 rounded-xl border border-slate-200 cursor-pointer hover:border-[#78C6D8] transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-[#198754] rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Prontas para Entrega</p>
              <p className="text-xl font-bold text-slate-800">{stats.ordersReadyForPickup} encomendas</p>
            </div>
          </div>
          <span className="text-xs text-[#1D2B68] font-bold">Ver</span>
        </div>

        <div
          onClick={() => onNavigate('quotes')}
          className="bg-white p-4 rounded-xl border border-slate-200 cursor-pointer hover:border-[#78C6D8] transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-[#1D2B68] rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Cotações Pendentes</p>
              <p className="text-xl font-bold text-slate-800">{stats.pendingQuotesCount} propostas</p>
            </div>
          </div>
          <span className="text-xs text-[#1D2B68] font-bold">Ver</span>
        </div>
      </div>

      {/* Tabelas e Actividade Recente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Serviços Mais Vendidos */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-[#1D2B68]">Serviços Mais Vendidos</h3>
            <button
              onClick={() => onNavigate('catalog')}
              className="text-xs text-[#78C6D8] hover:text-[#1D2B68] font-bold"
            >
              Ver Tabela de Preços →
            </button>
          </div>

          {stats.topSellingServices.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Ainda não existem registos de vendas faturadas.
            </div>
          ) : (
            <div className="space-y-3">
              {stats.topSellingServices.map((service: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2.5 bg-[#F5F7FA] rounded-lg text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#1D2B68] text-white flex items-center justify-center font-bold text-[10px]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">{service.name}</p>
                      <p className="text-[11px] text-slate-500">{service.quantity} unidades vendidas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#1D2B68]">{formatKz(service.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actividade Financeira Recente */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-[#1D2B68]">Actividade Financeira Recente</h3>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs text-[#78C6D8] hover:text-[#1D2B68] font-bold"
            >
              Ver Facturas →
            </button>
          </div>

          {stats.recentActivity.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Nenhuma transação recente registada.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.recentActivity.map((act: any, idx: number) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-1.5 rounded-md ${
                        act.type === 'pagamento'
                          ? 'bg-emerald-50 text-[#198754]'
                          : 'bg-blue-50 text-[#1D2B68]'
                      }`}
                    >
                      {act.type === 'pagamento' ? (
                        <CreditCard className="w-3.5 h-3.5" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{act.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {act.client} • {act.date}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-bold ${
                      act.type === 'pagamento' ? 'text-[#198754]' : 'text-slate-800'
                    }`}
                  >
                    {formatKz(act.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
