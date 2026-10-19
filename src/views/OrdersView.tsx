import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { ProductionOrder, ProductionStatus, User } from '../types';
import { formatKz } from '../utils/calculations';

interface OrdersViewProps {
  currentUser: User | null;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ currentUser }) => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Modais
  const [costModalOrder, setCostModalOrder] = useState<ProductionOrder | null>(null);
  const [costCategory, setCostCategory] = useState('Material para impressão');
  const [costDescription, setCostDescription] = useState('');
  const [costAmount, setCostAmount] = useState<number>(0);

  const [statusModalOrder, setStatusModalOrder] = useState<ProductionOrder | null>(null);
  const [newStatus, setNewStatus] = useState<ProductionStatus>('em_producao');
  const [statusNote, setStatusNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (err: any) {
      setActionError(err.message || 'Erro ao carregar encomendas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalOrder) return;
    setSubmitting(true);
    setActionError(null);

    try {
      await api.updateOrderStatus(statusModalOrder.id, newStatus, statusNote);
      setActionSuccess(`Estado da encomenda ${statusModalOrder.orderNumber} atualizado para ${newStatus.replace('_', ' ')}.`);
      setStatusModalOrder(null);
      setStatusNote('');
      await fetchOrders();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Falha ao atualizar estado da encomenda.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!costModalOrder) return;
    if (costAmount <= 0) {
      setActionError('O valor do custo direto deve ser positivo.');
      return;
    }

    setSubmitting(true);
    setActionError(null);

    try {
      await api.addOrderCost(costModalOrder.id, {
        category: costCategory,
        description: costDescription,
        amount: costAmount,
      });
      setActionSuccess(`Custo direto registado na encomenda ${costModalOrder.orderNumber}.`);
      setCostModalOrder(null);
      setCostDescription('');
      setCostAmount(0);
      await fetchOrders();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Falha ao registar custo.');
    } finally {
      setSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'todos' || o.productionStatus === statusFilter;
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.clientName.toLowerCase().includes(search.toLowerCase()) ||
      o.clientPhone.includes(search);
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: ProductionStatus, deadline: string) => {
    const isOverdue = deadline < todayStr && status !== 'entregue' && status !== 'cancelada';

    let colorClasses = 'bg-slate-100 text-slate-700 border-slate-300';
    if (status === 'recebida') colorClasses = 'bg-blue-100 text-blue-800 border-blue-300';
    if (status === 'em_producao') colorClasses = 'bg-amber-100 text-amber-800 border-amber-300';
    if (status === 'em_acabamento') colorClasses = 'bg-indigo-100 text-indigo-800 border-indigo-300';
    if (status === 'pronta') colorClasses = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (status === 'entregue') colorClasses = 'bg-green-100 text-[#198754] border-green-300';
    if (status === 'cancelada') colorClasses = 'bg-red-100 text-[#DC3545] border-red-300';

    return (
      <div className="flex flex-col items-center gap-1">
        <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded uppercase border ${colorClasses}`}>
          {status.replace(/_/g, ' ')}
        </span>
        {isOverdue && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-red-600 bg-red-50 px-1 rounded">
            <AlertTriangle className="w-2.5 h-2.5" /> Prazo Ultrapassado
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs no-print">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar número, cliente ou telefone..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:outline-none"
          >
            <option value="todos">Todos os Estados</option>
            <option value="recebida">Recebida</option>
            <option value="aguardando_aprovacao">Aguardando Aprovação</option>
            <option value="aguardando_sinal">Aguardando Sinal</option>
            <option value="em_producao">Em Produção</option>
            <option value="em_acabamento">Em Acabamento</option>
            <option value="pronta">Pronta para Entrega</option>
            <option value="entregue">Entregue</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-xs font-semibold">
          {actionSuccess}
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold">
          {actionError}
        </div>
      )}

      {/* Tabela de Encomendas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#78C6D8]" />
            <span>A carregar encomendas de produção...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Nenhuma encomenda em produção. Converta uma cotação aprovada para iniciar a produção.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1D2B68] text-white text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">N.º Encomenda</th>
                  <th className="py-3 px-4 font-semibold">Cliente</th>
                  <th className="py-3 px-4 font-semibold">Prazo de Entrega</th>
                  <th className="py-3 px-4 font-semibold text-right">Valor Acordado</th>
                  <th className="py-3 px-4 font-semibold text-right">Custos Directos</th>
                  <th className="py-3 px-4 font-semibold text-right">Margem Estimada</th>
                  <th className="py-3 px-4 font-semibold text-center">Estado Produção</th>
                  <th className="py-3 px-4 font-semibold text-center no-print">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOrders.map((order: any, idx: number) => {
                  const directCostsTotal = (order.directCosts || []).reduce(
                    (sum: number, c: any) => sum + c.amount,
                    0
                  );
                  const marginInfo = order.marginInfo;

                  return (
                    <tr key={order.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="py-3 px-4 font-mono font-bold text-[#1D2B68]">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800">{order.clientName}</p>
                        <p className="text-[11px] text-slate-500">
                          {order.items?.length || 0} serviço(s) • Resp: {order.responsibleUser}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {new Date(order.deadlineDate).toLocaleDateString('pt-AO')}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-[#1D2B68]">
                        {formatKz(order.agreedValue)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">
                        {directCostsTotal > 0 ? (
                          <span className="font-semibold text-amber-700">{formatKz(directCostsTotal)}</span>
                        ) : (
                          <span className="text-slate-400 italic">0 Kz</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {marginInfo?.hasCosts ? (
                          <span className="font-bold text-emerald-700">
                            {formatKz(marginInfo.margin)} ({marginInfo.marginPercent}%)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Custos não registados
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(order.productionStatus, order.deadlineDate)}
                      </td>
                      <td className="py-3 px-4 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setStatusModalOrder(order);
                              setNewStatus(order.productionStatus);
                              setStatusNote('');
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Atualizar Estado de Produção"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setCostModalOrder(order);
                              setCostDescription('');
                              setCostAmount(0);
                            }}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title="Registar Custo Direto (Margem)"
                          >
                            <DollarSign className="w-4 h-4" />
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
      </div>

      {/* Modal Atualizar Estado de Produção */}
      {statusModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-sm font-bold text-[#1D2B68] mb-1">
              Atualizar Estado: {statusModalOrder.orderNumber}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Cliente: <strong>{statusModalOrder.clientName}</strong>
            </p>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Novo Estado de Produção
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ProductionStatus)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="recebida">Recebida</option>
                  <option value="aguardando_aprovacao">Aguardando Aprovação</option>
                  <option value="aguardando_sinal">Aguardando Sinal</option>
                  <option value="em_producao">Em Produção</option>
                  <option value="em_acabamento">Em Acabamento</option>
                  <option value="pronta">Pronta para Entrega</option>
                  <option value="entregue">Entregue</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observação do Estado (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Ex.: Material impresso, a aguardar secagem e acabamento..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalOrder(null)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold bg-[#1D2B68] text-white hover:bg-[#15204e] rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'A guardar...' : 'Confirmar Estado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registar Custo Direto */}
      {costModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-sm font-bold text-[#1D2B68] mb-1">
              Registar Custo Direto de Produção
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Encomenda: <strong>{costModalOrder.orderNumber}</strong> • Valor da Receita: <strong>{formatKz(costModalOrder.agreedValue)}</strong>
            </p>

            <form onSubmit={handleAddCost} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoria do Custo
                </label>
                <select
                  value={costCategory}
                  onChange={(e) => setCostCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Papel">Papel</option>
                  <option value="Tintas">Tintas</option>
                  <option value="Consumíveis">Consumíveis</option>
                  <option value="Material para impressão">Material para impressão</option>
                  <option value="Acabamentos">Acabamentos (Ilhós, Espirais, Capas)</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Outras despesas">Outras Despesas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição do Custo
                </label>
                <input
                  type="text"
                  required
                  value={costDescription}
                  onChange={(e) => setCostDescription(e.target.value)}
                  placeholder="Ex.: Compra de 2 metros de lona branca 510g"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor do Custo (Kz)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={costAmount}
                  onChange={(e) => setCostAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCostModalOrder(null)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold bg-[#1D2B68] text-white hover:bg-[#15204e] rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'A registar...' : 'Alocar Custo à Encomenda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
