import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Package,
  PlusCircle,
  RefreshCw,
  TrendingUp,
  X,
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

  // Estados da Gestão e Alerta de Stock
  const [stockFilter, setStockFilter] = useState<'all' | 'critical'>('all');
  const [restockModalItem, setRestockModalItem] = useState<any | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(20);
  const [restockMode, setRestockMode] = useState<'add' | 'set'>('add');
  const [restockMinThreshold, setRestockMinThreshold] = useState<number>(0);
  const [restockSubmitting, setRestockSubmitting] = useState(false);
  const [restockSuccess, setRestockSuccess] = useState<string | null>(null);
  const [restockError, setRestockError] = useState<string | null>(null);

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

  const openRestockModal = (item: any) => {
    setRestockModalItem(item);
    const deficit = Math.max(10, (item.minStockThreshold || 0) - (item.stockQuantity || 0));
    setRestockAmount(deficit);
    setRestockMode('add');
    setRestockMinThreshold(item.minStockThreshold || 10);
    setRestockError(null);
  };

  const handleConfirmRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockModalItem) return;
    setRestockSubmitting(true);
    setRestockError(null);

    const currentQty = restockModalItem.stockQuantity || 0;
    const finalQty =
      restockMode === 'add' ? currentQty + Number(restockAmount) : Number(restockAmount);

    if (finalQty < 0) {
      setRestockError('A quantidade em stock não pode ser negativa.');
      setRestockSubmitting(false);
      return;
    }

    try {
      await api.updateCatalogService(restockModalItem.id, {
        stockQuantity: finalQty,
        minStockThreshold: Number(restockMinThreshold),
        reason: `Reabastecimento rápido via Dashboard (${
          restockMode === 'add' ? `+${restockAmount}` : `Total definido: ${finalQty}`
        } ${restockModalItem.unit})`,
      });

      setRestockSuccess(
        `Stock de "${restockModalItem.name}" atualizado com sucesso para ${finalQty} ${restockModalItem.unit}!`
      );
      setRestockModalItem(null);
      await fetchStats();
      setTimeout(() => setRestockSuccess(null), 4000);
    } catch (err: any) {
      setRestockError(err.message || 'Falha ao atualizar stock.');
    } finally {
      setRestockSubmitting(false);
    }
  };

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

  const lowStockItems = stats.lowStockItems || [];
  const filteredLowStockItems =
    stockFilter === 'critical'
      ? lowStockItems.filter((i: any) => i.isCritical)
      : lowStockItems;

  return (
    <div className="space-y-6">
      {/* Toast de Sucesso na Reposição de Stock */}
      {restockSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{restockSuccess}</span>
          </div>
          <button
            onClick={() => setRestockSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

      {/* ======================================================== */}
      {/* SECÇÃO DE ALERTAS DE INVENTÁRIO & STOCK MÍNIMO (CATÁLOGO)*/}
      {/* ======================================================== */}
      {lowStockItems.length > 0 ? (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50/80 to-red-500/10 border-2 border-amber-300 rounded-2xl p-5 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">
                    Alertas de Inventário & Stock Mínimo
                  </h3>
                  <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                    {lowStockItems.length} {lowStockItems.length === 1 ? 'Item em Alerta' : 'Itens em Alerta'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Materiais e consumíveis gráficos com stock abaixo do nível mínimo de segurança. Reponha o stock para garantir o cumprimento dos prazos.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <div className="inline-flex rounded-lg bg-white p-1 border border-amber-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setStockFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    stockFilter === 'all'
                      ? 'bg-amber-500 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({lowStockItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter('critical')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    stockFilter === 'critical'
                      ? 'bg-red-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Críticos ({lowStockItems.filter((i: any) => i.isCritical).length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('catalog')}
                className="text-xs font-bold text-[#1D2B68] hover:text-[#15204e] bg-white hover:bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <span>Ver Catálogo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Grid de Itens em Alerta */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredLowStockItems.map((item: any) => {
              const currentQty = item.stockQuantity || 0;
              const minThreshold = item.minStockThreshold || 1;
              const percentage = Math.min(100, Math.round((currentQty / minThreshold) * 100));
              const missingQty = Math.max(0, minThreshold - currentQty);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-amber-200 p-3.5 shadow-2xs hover:shadow-sm transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 bg-slate-100 text-[#1D2B68] rounded border border-slate-200">
                        {item.code}
                      </span>
                      {item.isCritical ? (
                        <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                          <AlertOctagon className="w-3 h-3 text-red-600" />
                          Crítico
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Stock Baixo
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1 mb-0.5" title={item.name}>
                      {item.name}
                    </h4>
                    <span className="text-[10px] text-slate-500 block mb-2">{item.category}</span>

                    {/* Barra de Progresso e Nível de Stock */}
                    <div className="space-y-1 my-2">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-semibold text-slate-600">
                          Stock Atual:{' '}
                          <strong
                            className={
                              item.isCritical
                                ? 'text-red-700 font-black'
                                : 'text-amber-700 font-black'
                            }
                          >
                            {currentQty} {item.unit}
                          </strong>
                        </span>
                        <span className="text-slate-400">
                          Mínimo: <strong>{minThreshold} {item.unit}</strong>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.isCritical ? 'bg-red-600' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.max(6, percentage)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                        <span>Falta repor: <strong className="text-slate-700">{missingQty} {item.unit}</strong></span>
                        <span>{percentage}% do mínimo</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => onNavigate('catalog')}
                      className="text-[11px] font-semibold text-slate-500 hover:text-[#1D2B68] transition-colors"
                    >
                      Ver detalhes
                    </button>
                    <button
                      type="button"
                      onClick={() => openRestockModal(item)}
                      className="px-2.5 py-1 bg-[#1D2B68] hover:bg-[#15204e] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-[#78C6D8]" />
                      <span>Repor Stock</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Inventário Seguro:</strong> Todos os materiais do catálogo com monitorização de stock encontram-se acima do limite mínimo definido.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className="text-[11px] font-bold text-emerald-900 underline hover:text-emerald-700"
          >
            Ver Catálogo
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

      {/* ======================================================== */}
      {/* MODAL: REABASTECIMENTO RÁPIDO DE STOCK VIA DASHBOARD     */}
      {/* ======================================================== */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    Repor Stock: {restockModalItem.code}
                  </h3>
                  <p className="text-[11px] text-slate-500">{restockModalItem.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestockModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {restockError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{restockError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmRestock} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Stock Atual
                  </span>
                  <span className="text-base font-extrabold text-slate-800">
                    {restockModalItem.stockQuantity || 0} {restockModalItem.unit}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Mínimo Definido
                  </span>
                  <span className="text-base font-extrabold text-amber-700">
                    {restockModalItem.minStockThreshold || 0} {restockModalItem.unit}
                  </span>
                </div>
              </div>

              {/* Modo de Reposição */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">Modo de Atualização</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestockMode('add')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors ${
                      restockMode === 'add'
                        ? 'bg-[#1D2B68] text-white border-[#1D2B68]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    + Adicionar Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestockMode('set')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors ${
                      restockMode === 'set'
                        ? 'bg-[#1D2B68] text-white border-[#1D2B68]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    = Definir Novo Total
                  </button>
                </div>
              </div>

              {/* Quantidade */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {restockMode === 'add'
                    ? `Quantidade a Adicionar (${restockModalItem.unit}) *`
                    : `Nova Quantidade Total (${restockModalItem.unit}) *`}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  autoFocus
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Resultado:{' '}
                  <strong className="text-emerald-700">
                    {restockMode === 'add'
                      ? (restockModalItem.stockQuantity || 0) + Number(restockAmount)
                      : Number(restockAmount)}{' '}
                    {restockModalItem.unit}
                  </strong>{' '}
                  em stock após confirmação.
                </p>
              </div>

              {/* Limite Mínimo de Alerta */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nível Mínimo para Alerta de Stock ({restockModalItem.unit})
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={restockMinThreshold}
                  onChange={(e) => setRestockMinThreshold(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                />
                <span className="text-[10px] text-slate-400">
                  O painel emitirá alerta automático sempre que o stock for igual ou inferior a este valor.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRestockModalItem(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={restockSubmitting}
                  className="px-5 py-2 font-bold bg-[#1D2B68] hover:bg-[#15204e] text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {restockSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>A registar...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#78C6D8]" />
                      <span>Confirmar Entrada</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
