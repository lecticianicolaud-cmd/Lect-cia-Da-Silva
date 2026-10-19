import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle,
  CreditCard,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Undo2,
} from 'lucide-react';
import { PrintableDocument } from '../components/PrintableDocument';
import { api } from '../services/api';
import { CompanySettings, Invoice, PaymentMethod, PaymentReceipt, User } from '../types';
import { formatKz } from '../utils/calculations';

interface PaymentsViewProps {
  currentUser: User | null;
  settings: CompanySettings;
  preselectedInvoice?: Invoice | null;
  onClearPreselectedInvoice?: () => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  currentUser,
  settings,
  preselectedInvoice,
  onClearPreselectedInvoice,
}) => {
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modais
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<PaymentReceipt | null>(null);
  const [reversingPayment, setReversingPayment] = useState<PaymentReceipt | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('numerario');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [allowCredit, setAllowCredit] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [paymentsData, invoicesData] = await Promise.all([
        api.getPayments(),
        api.getInvoices(),
      ]);
      setPayments(paymentsData);
      setInvoices(invoicesData.filter((i) => !i.isCancelled && i.balance > 0));
    } catch (err: any) {
      setActionError(err.message || 'Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Se veio pré-selecionada uma factura de outra vista
  useEffect(() => {
    if (preselectedInvoice) {
      setSelectedInvoiceId(preselectedInvoice.id);
      setPaymentAmount(preselectedInvoice.balance);
      setRegisterModalOpen(true);
    }
  }, [preselectedInvoice]);

  const handleInvoiceSelect = (id: string) => {
    setSelectedInvoiceId(id);
    const inv = invoices.find((i) => i.id === id);
    if (inv) {
      setPaymentAmount(inv.balance);
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) {
      setActionError('Por favor, selecione uma factura em dívida.');
      return;
    }
    if (paymentAmount <= 0) {
      setActionError('O valor do pagamento deve ser superior a zero.');
      return;
    }

    setSubmitting(true);
    setActionError(null);

    try {
      const result = await api.registerPayment({
        invoiceId: selectedInvoiceId,
        amount: paymentAmount,
        paymentMethod,
        paymentDate,
        reference,
        notes: paymentNotes,
        allowCredit,
      });

      setActionSuccess(`Pagamento de ${formatKz(paymentAmount)} registado! Recibo: ${result.receipt.receiptNumber}`);
      setRegisterModalOpen(false);
      if (onClearPreselectedInvoice) onClearPreselectedInvoice();
      await fetchData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Falha ao registar pagamento.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingPayment) return;
    if (!reversalReason || reversalReason.trim().length === 0) {
      setActionError('O motivo do estorno é obrigatório para auditoria.');
      return;
    }

    setSubmitting(true);
    setActionError(null);

    try {
      await api.reversePayment(reversingPayment.id, reversalReason);
      setActionSuccess(`Pagamento ${reversingPayment.receiptNumber} estornado com sucesso.`);
      setReversingPayment(null);
      setReversalReason('');
      await fetchData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Falha ao estornar pagamento.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.receiptNumber.toLowerCase().includes(q) ||
      p.invoiceNumber.toLowerCase().includes(q) ||
      p.clientName.toLowerCase().includes(q) ||
      (p.reference && p.reference.toLowerCase().includes(q))
    );
  });

  const selectedInvoiceObj = invoices.find((i) => i.id === selectedInvoiceId);

  return (
    <div className="space-y-6">
      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs no-print">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar recibo, factura ou cliente..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
          />
        </div>

        {(currentUser?.role === 'admin' || currentUser?.role === 'financeiro') && (
          <button
            onClick={() => {
              setRegisterModalOpen(true);
              setActionError(null);
            }}
            className="flex items-center gap-1.5 bg-[#198754] hover:bg-[#157347] text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registar Novo Pagamento</span>
          </button>
        )}
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

      {/* Lista de Pagamentos / Recibos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#78C6D8]" />
            <span>A carregar histórico de pagamentos...</span>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Nenhum registo de pagamento encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1D2B68] text-white text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">N.º Recibo</th>
                  <th className="py-3 px-4 font-semibold">Factura</th>
                  <th className="py-3 px-4 font-semibold">Cliente</th>
                  <th className="py-3 px-4 font-semibold">Data</th>
                  <th className="py-3 px-4 font-semibold">Método</th>
                  <th className="py-3 px-4 font-semibold text-right">Valor Pago</th>
                  <th className="py-3 px-4 font-semibold text-center">Estado</th>
                  <th className="py-3 px-4 font-semibold text-center no-print">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPayments.map((p, idx) => (
                  <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-3 px-4 font-mono font-bold text-[#1D2B68]">
                      {p.receiptNumber}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-600">
                      {p.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {p.clientName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(p.paymentDate).toLocaleDateString('pt-AO')}
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-700">
                      {p.paymentMethod}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-[#198754] text-sm">
                      {formatKz(p.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {p.isReversed ? (
                        <span className="inline-block bg-red-100 text-[#DC3545] text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-red-200">
                          Estornado
                        </span>
                      ) : (
                        <span className="inline-block bg-green-100 text-[#198754] text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-green-200">
                          Confirmado
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center no-print">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingReceipt(p)}
                          className="p-1.5 text-slate-600 hover:text-[#1D2B68] hover:bg-slate-100 rounded transition-colors"
                          title="Imprimir Comprovativo / Recibo"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {!p.isReversed && (currentUser?.role === 'admin' || currentUser?.role === 'financeiro') && (
                          <button
                            onClick={() => {
                              setReversingPayment(p);
                              setReversalReason('');
                            }}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Estornar Pagamento (Auditoria Obrigatória)"
                          >
                            <Undo2 className="w-4 h-4" />
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

      {/* Modal Registar Pagamento */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-[#1D2B68] mb-1 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#198754]" />
              <span>Registar Pagamento / Amortização</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              O pagamento reduzirá automaticamente o saldo em dívida e actualizará o estado da factura.
            </p>

            <form onSubmit={handleRegisterPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Factura Interna *
                </label>
                {invoices.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-700" />
                      <span>Nenhuma factura com saldo em dívida</span>
                    </p>
                    <p className="text-[11px] text-amber-700">
                      Não existem facturas pendentes no momento. Todas as facturas emitidas estão liquidadas.
                    </p>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedInvoiceId}
                    onChange={(e) => handleInvoiceSelect(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78C6D8] font-medium"
                  >
                    <option value="" disabled>
                      Selecione uma factura com saldo em dívida ({invoices.length} disponível{invoices.length > 1 ? 'is' : ''})...
                    </option>
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {inv.clientName} (Dívida: {formatKz(inv.balance)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedInvoiceObj && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valor Total da Factura:</span>
                    <span className="font-semibold text-slate-800">{formatKz(selectedInvoiceObj.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Já Liquidado:</span>
                    <span className="font-semibold text-[#198754]">{formatKz(selectedInvoiceObj.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1">
                    <span className="font-bold text-red-700">Saldo Restante em Dívida:</span>
                    <span className="font-black text-red-700">{formatKz(selectedInvoiceObj.balance)}</span>
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-slate-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(selectedInvoiceObj.balance)}
                      className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded font-bold transition-colors"
                    >
                      Liquidar Total ({formatKz(selectedInvoiceObj.balance)})
                    </button>
                    {selectedInvoiceObj.balance > 1 && (
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(Math.round(selectedInvoiceObj.balance / 2))}
                        className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-bold transition-colors"
                      >
                        Pagar 50% ({formatKz(Math.round(selectedInvoiceObj.balance / 2))})
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor a Pagar (Kz) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Método de Pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="numerario">Numerário</option>
                    <option value="multicaixa">Multicaixa</option>
                    <option value="transferencia">Transferência Bancária</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data do Pagamento
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    N.º Transação / Comprovativo
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Ex.: MCX 908123"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setRegisterModalOpen(false);
                    if (onClearPreselectedInvoice) onClearPreselectedInvoice();
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedInvoiceId}
                  className="px-5 py-2 text-xs font-bold bg-[#198754] text-white hover:bg-[#157347] rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'A registar...' : 'Confirmar e Emitir Recibo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Estorno de Pagamento */}
      {reversingPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-sm font-bold text-red-700 mb-1 flex items-center gap-2">
              <Undo2 className="w-4 h-4" />
              <span>Estorno de Pagamento</span>
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Recibo: <strong>{reversingPayment.receiptNumber}</strong> • Valor: <strong>{formatKz(reversingPayment.amount)}</strong>
            </p>

            <form onSubmit={handleReverseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo Formal do Estorno <span className="text-red-500">* (Obrigatório)</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Ex.: Valor lançado em duplicado pelo operador / transferência não confirmada no extracto..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReversingPayment(null)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold bg-red-700 text-white hover:bg-red-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'A estornar...' : 'Confirmar Estorno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recibo Imprimível */}
      {viewingReceipt && (
        <PrintableDocument
          type="receipt"
          document={viewingReceipt}
          settings={settings}
          onClose={() => setViewingReceipt(null)}
        />
      )}
    </div>
  );
};
