import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle,
  Clock,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { PrintableDocument } from '../components/PrintableDocument';
import { SendEmailModal } from '../components/SendEmailModal';
import { api } from '../services/api';
import { CatalogService, Client, CompanySettings, DiscountType, Invoice, PaymentMethod, PaymentStatus, User } from '../types';
import { calculateDocumentTotals, calculateItemSubtotal, formatKz } from '../utils/calculations';

interface InvoicesViewProps {
  currentUser: User | null;
  settings: CompanySettings;
  onOpenPaymentForInvoice?: (invoice: Invoice) => void;
  autoOpenCreateModal?: boolean;
  onClearAutoOpenCreateModal?: () => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  currentUser,
  settings,
  onOpenPaymentForInvoice,
  autoOpenCreateModal,
  onClearAutoOpenCreateModal,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);

  // Modais
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [emailModalInvoice, setEmailModalInvoice] = useState<Invoice | null>(null);
  const [cancellingInvoice, setCancellingInvoice] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [autoSendEmail, setAutoSendEmail] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await api.getInvoices();
      setInvoices(data);
    } catch (err: any) {
      setActionError(err.message || 'Erro ao carregar facturas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    api.getClients().then((cls) => {
      setClients(cls);
      if (autoOpenCreateModal && cls.length > 0) {
        handleOpenCreateModal();
        if (onClearAutoOpenCreateModal) onClearAutoOpenCreateModal();
      }
    }).catch(() => {});
    api.getCatalog().then(setServices).catch(() => {});
  }, []);

  useEffect(() => {
    if (autoOpenCreateModal && clients.length > 0) {
      handleOpenCreateModal();
      if (onClearAutoOpenCreateModal) {
        onClearAutoOpenCreateModal();
      }
    }
  }, [autoOpenCreateModal, clients]);

  // New Invoice Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('numerario');
  const [discountType, setDiscountType] = useState<DiscountType>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [items, setItems] = useState<
    Array<{
      serviceId: string;
      quantity: number;
      unitPrice: number;
      customUnitPrice?: number;
      materialProvidedByClient?: boolean;
      notes?: string;
    }>
  >([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenCreateModal = () => {
    setItems([]);
    if (services.length > 0) {
      setItems([{
        serviceId: services[0].id,
        quantity: 1,
        unitPrice: services[0].basePrice,
        materialProvidedByClient: false,
        notes: '',
      }]);
    }
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
    setDiscountType('none');
    setDiscountValue(0);
    setTaxRate(0);
    setPaymentMethod('numerario');
    setInvoiceNotes('');
    setFormError(null);
    setCreateModalOpen(true);
  };

  const handleAddItem = () => {
    if (services.length === 0) return;
    const defaultSrv = services[0];
    setItems((prev) => [
      ...prev,
      {
        serviceId: defaultSrv.id,
        quantity: 1,
        unitPrice: defaultSrv.basePrice,
        materialProvidedByClient: false,
        notes: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      const srv = services.find((s) => s.id === item.serviceId);
      if (srv) {
        const calc = calculateItemSubtotal(srv, item.quantity, {
          materialProvidedByClient: item.materialProvidedByClient,
          customConfirmedUnitPrice: item.customUnitPrice,
        });
        item.unitPrice = calc.unitPrice;
      }

      updated[index] = item;
      return updated;
    });
  };

  const computedModalItems = items.map((item) => {
    const srv = services.find((s) => s.id === item.serviceId);
    if (!srv) {
      return {
        subtotal: 0,
        unitPrice: 0,
        description: 'Serviço',
        isUnderConsultation: false,
      };
    }
    const calc = calculateItemSubtotal(srv, item.quantity, {
      materialProvidedByClient: item.materialProvidedByClient,
      customConfirmedUnitPrice: item.customUnitPrice,
    });
    return {
      serviceId: srv.id,
      serviceCode: srv.code,
      description: srv.name,
      category: srv.category,
      unit: srv.unit,
      quantity: item.quantity,
      unitPrice: calc.unitPrice,
      subtotal: calc.subtotal,
      isUnderConsultation: calc.isUnderConsultation,
      materialProvidedByClient: item.materialProvidedByClient,
      notes: item.notes,
    };
  });

  const totals = calculateDocumentTotals(
    computedModalItems,
    discountType,
    discountValue,
    taxRate
  );

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setFormError('Por favor, selecione um cliente.');
      return;
    }
    if (items.length === 0) {
      setFormError('Adicione pelo menos um item à factura.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const newInv = await api.createInvoice({
        clientId: selectedClientId,
        items: computedModalItems,
        discountType,
        discountValue,
        taxRate,
        paymentMethod,
        notes: invoiceNotes,
      });

      setCreateModalOpen(false);

      if (autoSendEmail) {
        const clientObj = clients.find((c) => c.id === selectedClientId);
        const targetEmail = clientObj?.email;
        if (targetEmail) {
          try {
            await api.sendInvoiceEmail(newInv.id, { recipientEmail: targetEmail });
            setActionSuccess(`Factura ${newInv.invoiceNumber} emitida e enviada por email para ${targetEmail}!`);
          } catch (emailErr: any) {
            setActionSuccess(`Factura ${newInv.invoiceNumber} emitida com sucesso. (Nota de envio: ${emailErr.message})`);
          }
        } else {
          setActionSuccess(`Factura ${newInv.invoiceNumber} emitida com sucesso! (Cliente sem email registado)`);
        }
      } else {
        setActionSuccess(`Factura ${newInv.invoiceNumber} emitida com sucesso!`);
      }

      await fetchInvoices();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao emitir factura.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingInvoice) return;
    if (!cancelReason || cancelReason.trim().length === 0) {
      setActionError('O motivo da anulação é obrigatório para auditoria.');
      return;
    }

    setCancelling(true);
    setActionError(null);

    try {
      await api.cancelInvoice(cancellingInvoice.id, cancelReason);
      setActionSuccess(`Factura interna ${cancellingInvoice.invoiceNumber} anulada com sucesso.`);
      setCancellingInvoice(null);
      setCancelReason('');
      await fetchInvoices();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Falha ao anular factura.');
    } finally {
      setCancelling(false);
    }
  };

  const filteredInvoices = invoices.filter((i) => {
    const matchesStatus = statusFilter === 'todos' || i.paymentStatus === statusFilter;
    const matchesSearch =
      i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      i.clientName.toLowerCase().includes(search.toLowerCase()) ||
      i.clientPhone.includes(search);
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'pago':
        return (
          <span className="inline-flex items-center gap-1 bg-green-100 text-[#198754] text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-green-300">
            <CheckCircle className="w-3 h-3" />
            <span>Pago</span>
          </span>
        );
      case 'parcialmente_pago':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-amber-300">
            <Clock className="w-3 h-3" />
            <span>Parcialmente Pago</span>
          </span>
        );
      case 'anulado':
        return (
          <span className="inline-flex items-center gap-1 bg-red-100 text-[#DC3545] text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-red-300">
            <Ban className="w-3 h-3" />
            <span>Anulado</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-slate-300">
            <span>Por Pagar</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Alerta de Documentos de Gestão Interna */}
      <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center gap-3 text-xs text-[#1D2B68] no-print">
        <AlertCircle className="w-5 h-5 text-[#1D2B68] shrink-0" />
        <div>
          <strong className="font-bold">Regra de Conformidade:</strong> Todos os documentos comerciais emitidos neste módulo são para
          <strong> controlo de gestão interna da Gráfica Palanga</strong> e não substituem facturas fiscais oficiais certificadas.
        </div>
      </div>

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
            <option value="por_pagar">Por Pagar</option>
            <option value="parcialmente_pago">Parcialmente Pago</option>
            <option value="pago">Pago</option>
            <option value="anulado">Anulado</option>
          </select>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-1.5 bg-[#1D2B68] hover:bg-[#15204e] text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-[#78C6D8]" />
          <span>Emitir Nova Factura</span>
        </button>
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

      {/* Lista de Facturas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#78C6D8]" />
            <span>A carregar facturas internas...</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Nenhuma factura interna encontrada. As facturas podem ser geradas a partir de cotações aprovadas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1D2B68] text-white text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">N.º Factura</th>
                  <th className="py-3 px-4 font-semibold">Cliente</th>
                  <th className="py-3 px-4 font-semibold">Data Emissão</th>
                  <th className="py-3 px-4 font-semibold text-right">Total</th>
                  <th className="py-3 px-4 font-semibold text-right">Valor Pago</th>
                  <th className="py-3 px-4 font-semibold text-right">Saldo em Dívida</th>
                  <th className="py-3 px-4 font-semibold text-center">Estado</th>
                  <th className="py-3 px-4 font-semibold text-center no-print">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredInvoices.map((inv, idx) => (
                  <tr key={inv.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-3 px-4 font-mono font-bold text-[#1D2B68]">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{inv.clientName}</p>
                      <p className="text-[11px] text-slate-500">{inv.clientPhone}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(inv.createdAt).toLocaleDateString('pt-AO')}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#1D2B68]">
                      {formatKz(inv.total)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#198754]">
                      {formatKz(inv.paidAmount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {inv.balance > 0 ? (
                        <span className="font-black text-[#DC3545]">{formatKz(inv.balance)}</span>
                      ) : (
                        <span className="font-semibold text-slate-400">Liquidado</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(inv.paymentStatus)}
                    </td>
                    <td className="py-3 px-4 text-center no-print">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingInvoice(inv)}
                          className="p-1.5 text-slate-600 hover:text-[#1D2B68] hover:bg-slate-100 rounded transition-colors"
                          title="Visualizar e Imprimir Factura"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setEmailModalInvoice(inv)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Enviar Factura por Email"
                        >
                          <Send className="w-4 h-4 text-[#1D2B68]" />
                        </button>

                        {inv.balance > 0 && !inv.isCancelled && onOpenPaymentForInvoice && (
                          <button
                            onClick={() => onOpenPaymentForInvoice(inv)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                            title="Registar Pagamento / Amortização"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}

                        {!inv.isCancelled && (currentUser?.role === 'admin' || currentUser?.role === 'financeiro') && (
                          <button
                            onClick={() => {
                              setCancellingInvoice(inv);
                              setCancelReason('');
                              setActionError(null);
                            }}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Anular Factura (com motivo formal)"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Anulação de Factura */}
      {cancellingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-sm font-bold text-red-700 mb-1 flex items-center gap-2">
              <Ban className="w-4 h-4" />
              <span>Anulação Formal de Factura</span>
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Factura: <strong>{cancellingInvoice.invoiceNumber}</strong> • Cliente: <strong>{cancellingInvoice.clientName}</strong>
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo da Anulação <span className="text-red-500">* (Obrigatório para Auditoria)</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex.: Emissão duplicada / cancelamento da encomenda a pedido do cliente..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingInvoice(null)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-4 py-2 text-xs font-bold bg-red-700 text-white hover:bg-red-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  {cancelling ? 'A processar anulação...' : 'Confirmar Anulação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Emitir Nova Factura */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 border border-slate-200 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-[#1D2B68] flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#78C6D8]" />
                <span>Emitir Factura Interna / Venda Direta</span>
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              {/* Cliente */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Selecionar Cliente *
                </label>
                <select
                  required
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.phone} {c.nif ? `(NIF: ${c.nif})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Itens */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-700">
                    Serviços e Quantidades (Cálculo Automático)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 bg-[#1D2B68] text-white px-2.5 py-1 rounded text-xs font-semibold hover:bg-[#15204e]"
                  >
                    <Plus className="w-3 h-3 text-[#78C6D8]" />
                    <span>Adicionar Serviço</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {items.map((item, idx) => {
                    const srv = services.find((s) => s.id === item.serviceId);
                    const calc = srv
                      ? calculateItemSubtotal(srv, item.quantity, {
                          materialProvidedByClient: item.materialProvidedByClient,
                          customConfirmedUnitPrice: item.customUnitPrice,
                        })
                      : { unitPrice: item.unitPrice, subtotal: item.quantity * item.unitPrice, isUnderConsultation: false };

                    return (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-5">
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Serviço</label>
                            <select
                              value={item.serviceId}
                              onChange={(e) => handleItemChange(idx, 'serviceId', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
                            >
                              {services.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.code} - {s.name} ({formatKz(s.basePrice)}/{s.unit})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Qtd / Unid</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
                            />
                          </div>

                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Subtotal Estimado</label>
                            <div className="text-xs font-bold text-[#1D2B68] py-1.5">
                              {formatKz(calc.subtotal)} ({formatKz(calc.unitPrice)}/{srv?.unit || 'un'})
                            </div>
                          </div>

                          <div className="sm:col-span-1 text-right">
                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded mt-4"
                                title="Remover item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {srv?.pricingType === 'on_request' && (
                          <div>
                            <label className="block text-[10px] font-semibold text-amber-700 mb-0.5">Preço Confirmado sob Consulta (Kz) *</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="Insira o valor negociado..."
                              value={item.customUnitPrice || ''}
                              onChange={(e) => handleItemChange(idx, 'customUnitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-xs border border-amber-300 bg-amber-50 rounded"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs pt-1">
                          {srv?.allowsCustomMaterial && (
                            <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.materialProvidedByClient || false}
                                onChange={(e) => handleItemChange(idx, 'materialProvidedByClient', e.target.checked)}
                                className="rounded border-slate-300 text-[#1D2B68]"
                              />
                              <span>Material fornecido pelo cliente (desconto aplicável)</span>
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desconto, Imposto e Totais */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Desconto</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                  >
                    <option value="none">Sem Desconto</option>
                    <option value="percentage">Percentagem (%)</option>
                    <option value="fixed">Valor Fixo (Kz)</option>
                  </select>
                </div>

                {discountType !== 'none' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Valor do Desconto ({discountType === 'percentage' ? '%' : 'Kz'})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Imposto / IVA (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>

              {/* Resumo Financeiro */}
              <div className="bg-[#1D2B68]/5 border border-[#1D2B68]/20 p-3.5 rounded-lg flex flex-col sm:flex-row justify-between items-center text-xs gap-2">
                <div className="space-y-0.5 text-slate-700">
                  <p>Subtotal: <strong>{formatKz(totals.subtotal)}</strong></p>
                  {totals.discountAmount > 0 && <p className="text-emerald-700">Desconto: -{formatKz(totals.discountAmount)}</p>}
                  {totals.taxAmount > 0 && <p>Imposto ({taxRate}%): +{formatKz(totals.taxAmount)}</p>}
                </div>
                <div className="text-right">
                  <span className="text-slate-500 uppercase text-[10px] block">Total a Pagar</span>
                  <span className="text-lg font-black text-[#1D2B68]">{formatKz(totals.total)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Modalidade de Pagamento *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="numerario">Numerário</option>
                  <option value="multicaixa">Multicaixa (POS)</option>
                  <option value="transferencia">Transferência Bancária</option>
                  <option value="credito">Crédito / A Prazo</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notas / Observações</label>
                <textarea
                  rows={2}
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="Condições de pagamento, prazos ou dados bancários..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              {/* Opção de Envio Automático por Email */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={autoSendEmail}
                    onChange={(e) => setAutoSendEmail(e.target.checked)}
                    className="rounded border-slate-300 text-[#1D2B68] focus:ring-[#78C6D8]"
                  />
                  <span className="flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-[#1D2B68]" />
                    <span>Enviar factura automaticamente por email ao cliente após emissão</span>
                  </span>
                </label>
                {selectedClientId && (
                  <span className="text-[11px] text-slate-500 sm:text-right">
                    Destino: <strong className="text-slate-800">{clients.find((c) => c.id === selectedClientId)?.email || 'Sem email registado (poderá indicar depois)'}</strong>
                  </span>
                )}
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-[#1D2B68] text-white hover:bg-[#15204e] rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'A emitir factura...' : 'Emitir Factura Interna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Documento Imprimível */}
      {viewingInvoice && (
        <PrintableDocument
          type="invoice"
          document={viewingInvoice}
          settings={settings}
          onClose={() => setViewingInvoice(null)}
        />
      )}

      {/* Modal Dedicado de Envio de Email */}
      {emailModalInvoice && (
        <SendEmailModal
          isOpen={Boolean(emailModalInvoice)}
          onClose={() => setEmailModalInvoice(null)}
          documentType="invoice"
          documentId={emailModalInvoice.id}
          documentNumber={emailModalInvoice.invoiceNumber}
          clientName={emailModalInvoice.clientName}
          defaultEmail={emailModalInvoice.clientEmail || clients.find((c) => c.id === emailModalInvoice.clientId)?.email || ''}
          onSuccess={(msg) => {
            setActionSuccess(msg);
            setTimeout(() => setActionSuccess(null), 4000);
          }}
        />
      )}
    </div>
  );
};
