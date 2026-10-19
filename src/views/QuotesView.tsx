import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { PrintableDocument } from '../components/PrintableDocument';
import { SendEmailModal } from '../components/SendEmailModal';
import { api } from '../services/api';
import {
  CatalogService,
  Client,
  CompanySettings,
  DiscountType,
  Quote,
  QuoteStatus,
  User,
} from '../types';
import {
  calculateDocumentTotals,
  calculateItemSubtotal,
  formatKz,
} from '../utils/calculations';

interface QuotesViewProps {
  currentUser: User | null;
  settings: CompanySettings;
  onNavigateToInvoices?: () => void;
  onNavigateToOrders?: () => void;
  autoOpenCreateModal?: boolean;
  onClearAutoOpenCreateModal?: () => void;
}

export const QuotesView: React.FC<QuotesViewProps> = ({
  currentUser,
  settings,
  onNavigateToInvoices,
  onNavigateToOrders,
  autoOpenCreateModal,
  onClearAutoOpenCreateModal,
}) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Modais
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [emailModalQuote, setEmailModalQuote] = useState<Quote | null>(null);

  // Form State para Nova Cotação
  const [selectedClientId, setSelectedClientId] = useState('');
  const [autoSendEmail, setAutoSendEmail] = useState(true);
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [quoteNotes, setQuoteNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Pronto Pagamento (Numerário / TPA)');
  const [discountType, setDiscountType] = useState<DiscountType>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);

  // Itens da cotação
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
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [quotesData, clientsData, catalogData] = await Promise.all([
        api.getQuotes(),
        api.getClients(),
        api.getCatalog(),
      ]);
      setQuotes(quotesData);
      setClients(clientsData);
      setServices(catalogData);
      if (clientsData.length > 0 && !selectedClientId) {
        setSelectedClientId(clientsData[0].id);
      }
    } catch (err: any) {
      setFormError(err.message || 'Falha ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData().then(() => {
      if (autoOpenCreateModal) {
        handleOpenCreateModal();
        if (onClearAutoOpenCreateModal) onClearAutoOpenCreateModal();
      }
    });
  }, []);

  useEffect(() => {
    if (autoOpenCreateModal && clients.length > 0 && services.length > 0) {
      handleOpenCreateModal();
      if (onClearAutoOpenCreateModal) {
        onClearAutoOpenCreateModal();
      }
    }
  }, [autoOpenCreateModal, clients, services]);

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

  // Cálculo ao vivo dos totais no modal
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

  const handleOpenCreateModal = () => {
    setItems([]);
    handleAddItem();
    setDiscountType('none');
    setDiscountValue(0);
    setQuoteNotes('');
    setPaymentTerms('Pronto Pagamento (Numerário / TPA)');
    setFormError(null);
    setCreateModalOpen(true);
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setFormError('Por favor, selecione um cliente.');
      return;
    }
    if (items.length === 0) {
      setFormError('Adicione pelo menos um serviço à cotação.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const newQuote = await api.createQuote({
        clientId: selectedClientId,
        items: computedModalItems,
        discountType,
        discountValue,
        taxRate,
        paymentTerms,
        notes: quoteNotes,
        validUntil,
      });

      setCreateModalOpen(false);

      if (autoSendEmail) {
        const clientObj = clients.find((c) => c.id === selectedClientId);
        const targetEmail = clientObj?.email;
        if (targetEmail) {
          try {
            await api.sendQuoteEmail(newQuote.id, { recipientEmail: targetEmail });
            setActionSuccess(`Cotação ${newQuote.quoteNumber} criada e enviada por email para ${targetEmail}!`);
          } catch (emailErr: any) {
            setActionSuccess(`Cotação ${newQuote.quoteNumber} criada com sucesso. (Nota de envio: ${emailErr.message})`);
          }
        } else {
          setActionSuccess(`Cotação ${newQuote.quoteNumber} criada com sucesso! (Cliente sem email registado)`);
        }
      } else {
        setActionSuccess(`Cotação ${newQuote.quoteNumber} criada com sucesso!`);
      }

      await fetchData();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setFormError(err.message || 'Falha ao criar cotação.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (quoteId: string, status: QuoteStatus) => {
    try {
      await api.updateQuoteStatus(quoteId, status);
      setActionSuccess(`Cotação atualizada para: ${status}`);
      await fetchData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setFormError(err.message || 'Falha ao atualizar estado');
    }
  };

  const getQuoteStatusBadge = (status: QuoteStatus) => {
    switch (status) {
      case 'aprovada':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Aprovada</span>;
      case 'recusada':
        return <span className="bg-red-100 text-red-800 border border-red-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Recusada</span>;
      case 'expirada':
        return <span className="bg-slate-200 text-slate-700 border border-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Expirada</span>;
      case 'rascunho':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Rascunho</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Pendente</span>;
    }
  };

  const handleConvertToOrder = async (quote: Quote) => {
    if (!confirm(`Deseja converter a cotação ${quote.quoteNumber} na encomenda de produção?`)) return;
    try {
      const order = await api.convertQuoteToOrder(quote.id, {
        deadlineDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        technicalSpecs: quote.notes,
      });
      setActionSuccess(`Encomenda ${order.orderNumber} gerada com sucesso!`);
      await fetchData();
      if (onNavigateToOrders) onNavigateToOrders();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao converter para encomenda.');
    }
  };

  const handleConvertToInvoice = async (quote: Quote) => {
    if (!confirm(`Deseja gerar a factura interna correspondente à cotação ${quote.quoteNumber}?`)) return;
    try {
      const invoice = await api.convertQuoteToInvoice(quote.id);
      setActionSuccess(`Factura ${invoice.invoiceNumber} emitida com sucesso!`);
      await fetchData();
      if (onNavigateToInvoices) onNavigateToInvoices();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao converter para factura.');
    }
  };

  const filteredQuotes = quotes.filter((q) => {
    const matchesStatus = statusFilter === 'todos' || q.status === statusFilter;
    const matchesSearch =
      q.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
      q.clientName.toLowerCase().includes(search.toLowerCase()) ||
      q.clientPhone.includes(search);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Barra Superior */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs no-print">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar cotação ou cliente..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:outline-none"
          >
            <option value="todos">Todos os Estados</option>
            <option value="pendente">Pendente</option>
            <option value="aprovada">Aprovada</option>
            <option value="recusada">Recusada</option>
            <option value="expirada">Expirada</option>
          </select>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-1.5 bg-[#1D2B68] hover:bg-[#15204e] text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-[#78C6D8]" />
          <span>Criar Nova Cotação</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-xs font-semibold">
          {actionSuccess}
        </div>
      )}

      {formError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold">
          {formError}
        </div>
      )}

      {/* Tabela de Cotações */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#78C6D8]" />
            <span>A carregar cotações...</span>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Nenhuma cotação registada. Clique em "Criar Nova Cotação" para emitir uma proposta comercial.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1D2B68] text-white text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">N.º Proposta</th>
                  <th className="py-3 px-4 font-semibold">Cliente</th>
                  <th className="py-3 px-4 font-semibold">Data Emissão</th>
                  <th className="py-3 px-4 font-semibold">Validade</th>
                  <th className="py-3 px-4 font-semibold text-right">Total</th>
                  <th className="py-3 px-4 font-semibold text-center">Estado</th>
                  <th className="py-3 px-4 font-semibold text-center no-print">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredQuotes.map((quote, idx) => (
                  <tr key={quote.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-3 px-4 font-mono font-bold text-[#1D2B68]">
                      {quote.quoteNumber}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{quote.clientName}</p>
                      <p className="text-[11px] text-slate-500">{quote.clientPhone}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(quote.createdAt).toLocaleDateString('pt-AO')}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(quote.validUntil).toLocaleDateString('pt-AO')}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#1D2B68] text-sm">
                      {formatKz(quote.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {getQuoteStatusBadge(quote.status)}
                        <select
                          value={quote.status}
                          onChange={(e) => handleStatusChange(quote.id, e.target.value as QuoteStatus)}
                          className="text-[10px] border border-slate-300 rounded px-1.5 py-0.5 bg-white text-slate-700 focus:outline-none no-print"
                          title="Alterar Estado"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="aprovada">Aprovada</option>
                          <option value="recusada">Recusada</option>
                          <option value="expirada">Expirada</option>
                          <option value="rascunho">Rascunho</option>
                        </select>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center no-print">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingQuote(quote)}
                          className="p-1.5 text-slate-600 hover:text-[#1D2B68] hover:bg-slate-100 rounded transition-colors"
                          title="Visualizar e Imprimir Cotação"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setEmailModalQuote(quote)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Enviar Cotação por Email"
                        >
                          <Send className="w-4 h-4 text-[#1D2B68]" />
                        </button>

                        {quote.status === 'pendente' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(quote.id, 'aprovada')}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Aprovar Cotação"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(quote.id, 'recusada')}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Recusar Cotação"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {quote.status === 'aprovada' && !quote.convertedToOrderId && (
                          <button
                            onClick={() => handleConvertToOrder(quote)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Converter em Encomenda de Produção"
                          >
                            <Package className="w-4 h-4" />
                          </button>
                        )}

                        {quote.status === 'aprovada' && !quote.convertedToInvoiceId && (
                          <button
                            onClick={() => handleConvertToInvoice(quote)}
                            className="p-1.5 text-[#1D2B68] hover:bg-blue-50 rounded transition-colors"
                            title="Converter em Factura Interna"
                          >
                            <FileText className="w-4 h-4" />
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

      {/* Modal Criar Nova Cotação */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 border border-slate-200 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-[#1D2B68] flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#78C6D8]" />
                <span>Nova Cotação / Orçamento Comercial</span>
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuote} className="space-y-4">
              {/* Cliente e Validade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div>
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
                        {c.name} — {c.phone}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de Validade da Proposta
                  </label>
                  <input
                    type="date"
                    required
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              {/* Tabela de Itens com Cálculos Reactivos */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-700">
                    Serviços e Quantidades (Cálculo Automático)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-[#1D2B68] hover:text-[#78C6D8] flex items-center gap-1"
                  >
                    + Adicionar Outro Serviço
                  </button>
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {items.map((item, idx) => {
                    const currentSrv = services.find((s) => s.id === item.serviceId);
                    const calc = currentSrv
                      ? calculateItemSubtotal(currentSrv, item.quantity, {
                          materialProvidedByClient: item.materialProvidedByClient,
                          customConfirmedUnitPrice: item.customUnitPrice,
                        })
                      : { subtotal: 0, unitPrice: 0, isUnderConsultation: false };

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col md:flex-row gap-3 items-start md:items-center text-xs"
                      >
                        <div className="flex-1 w-full md:w-auto">
                          <label className="block text-[10px] text-slate-500 mb-0.5">Serviço do Catálogo</label>
                          <select
                            value={item.serviceId}
                            onChange={(e) => handleItemChange(idx, 'serviceId', e.target.value)}
                            className="w-full p-1.5 border border-slate-300 rounded bg-white text-xs"
                          >
                            {services.map((s) => (
                              <option key={s.id} value={s.id}>
                                [{s.category}] {s.name} ({s.pricingType === 'on_request' ? 'Sob Consulta' : formatKz(s.basePrice)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-24">
                          <label className="block text-[10px] text-slate-500 mb-0.5">
                            Quantidade ({currentSrv?.unit || 'unid'})
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                            className="w-full p-1.5 border border-slate-300 rounded text-center text-xs"
                          />
                        </div>

                        {currentSrv?.allowsCustomMaterial && (
                          <div className="flex items-center gap-1.5 pt-4">
                            <input
                              type="checkbox"
                              id={`mat_${idx}`}
                              checked={item.materialProvidedByClient}
                              onChange={(e) => handleItemChange(idx, 'materialProvidedByClient', e.target.checked)}
                              className="rounded border-slate-300"
                            />
                            <label htmlFor={`mat_${idx}`} className="text-[11px] text-slate-700">
                              Material do Cliente
                            </label>
                          </div>
                        )}

                        {calc.isUnderConsultation && (
                          <div className="w-32">
                            <label className="block text-[10px] text-amber-700 font-semibold mb-0.5">
                              Preço Autorizado *
                            </label>
                            <input
                              type="number"
                              min="1"
                              placeholder="Kz Unitário"
                              value={item.customUnitPrice || ''}
                              onChange={(e) => handleItemChange(idx, 'customUnitPrice', Number(e.target.value))}
                              className="w-full p-1.5 border border-amber-300 bg-amber-50 rounded text-xs"
                            />
                          </div>
                        )}

                        <div className="w-28 text-right">
                          <label className="block text-[10px] text-slate-500 mb-0.5">Subtotal</label>
                          <span className="font-bold text-slate-900 text-xs">
                            {calc.isUnderConsultation ? 'Sob Consulta' : formatKz(calc.subtotal)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded mt-3 md:mt-0"
                          title="Remover Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desconto, Imposto e Totais */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Desconto</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white"
                  >
                    <option value="none">Sem Desconto</option>
                    <option value="percentage">Percentual (%)</option>
                    <option value="fixed">Valor Fixo (Kz)</option>
                  </select>
                </div>

                {discountType !== 'none' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {discountType === 'percentage' ? 'Percentagem (0 - 100%)' : 'Valor do Desconto (Kz)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={discountType === 'percentage' ? 100 : totals.subtotal}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded"
                    />
                  </div>
                )}

                <div className="sm:col-start-3 text-right space-y-1">
                  <div className="text-slate-600 text-xs flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatKz(totals.subtotal)}</span>
                  </div>
                  {totals.discountAmount > 0 && (
                    <div className="text-emerald-700 text-xs flex justify-between">
                      <span>Desconto:</span>
                      <span className="font-semibold">- {formatKz(totals.discountAmount)}</span>
                    </div>
                  )}
                  <div className="text-sm font-black text-[#1D2B68] flex justify-between pt-1 border-t border-slate-200">
                    <span>Total Final:</span>
                    <span className="text-base">{formatKz(totals.total)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Modalidade / Condições de Pagamento *
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                  >
                    <option value="Pronto Pagamento (Numerário / TPA)">Pronto Pagamento (Numerário / TPA)</option>
                    <option value="50% Adiantamento + 50% na Entrega">50% Adiantamento + 50% na Entrega</option>
                    <option value="100% Pagamento Antecipado">100% Pagamento Antecipado</option>
                    <option value="Transferência Bancária">Transferência Bancária</option>
                    <option value="Multicaixa (TPA / POS)">Multicaixa (TPA / POS)</option>
                    <option value="Numerário / Dinheiro">Numerário / Dinheiro</option>
                    <option value="A Prazo (15 dias)">A Prazo (15 dias)</option>
                    <option value="A Prazo (30 dias)">A Prazo (30 dias)</option>
                    <option value="Outra Modalidade">Outra Modalidade</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Validade da Cotação
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações e Especificações Técnicas
                </label>
                <textarea
                  rows={2}
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  placeholder="Ex.: Entrega em rolo, acabamento com ilhós reforçado..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
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
                    <span>Enviar cotação automaticamente por email ao cliente após emissão</span>
                  </span>
                </label>
                {selectedClientId && (
                  <span className="text-[11px] text-slate-500 sm:text-right">
                    Destino: <strong className="text-slate-800">{clients.find((c) => c.id === selectedClientId)?.email || 'Sem email registado (poderá indicar depois)'}</strong>
                  </span>
                )}
              </div>

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
                  disabled={submitting || items.length === 0}
                  className="px-5 py-2 text-xs font-bold bg-[#1D2B68] text-white hover:bg-[#15204e] rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'A emitir cotação...' : 'Guardar e Emitir Cotação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visualização e Impressão da Cotação */}
      {viewingQuote && (
        <PrintableDocument
          type="quote"
          document={viewingQuote}
          settings={settings}
          onClose={() => setViewingQuote(null)}
        />
      )}

      {/* Modal Dedicado de Envio de Email */}
      {emailModalQuote && (
        <SendEmailModal
          isOpen={Boolean(emailModalQuote)}
          onClose={() => setEmailModalQuote(null)}
          documentType="quote"
          documentId={emailModalQuote.id}
          documentNumber={emailModalQuote.quoteNumber}
          clientName={emailModalQuote.clientName}
          defaultEmail={emailModalQuote.clientEmail || clients.find((c) => c.id === emailModalQuote.clientId)?.email || ''}
          onSuccess={(msg) => {
            setActionSuccess(msg);
            setTimeout(() => setActionSuccess(null), 4000);
          }}
        />
      )}
    </div>
  );
};
