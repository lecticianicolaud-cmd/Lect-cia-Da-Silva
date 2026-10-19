import React, { useEffect, useState } from 'react';
import {
  Building2,
  Clock,
  CreditCard,
  Edit2,
  FileSpreadsheet,
  FileText,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  Users,
} from 'lucide-react';
import { api } from '../services/api';
import { Client, Invoice, Quote, User } from '../types';
import { formatKz } from '../utils/calculations';

interface ClientsViewProps {
  currentUser: User | null;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ currentUser }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modais
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClientHistory, setSelectedClientHistory] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nif, setNif] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const data = await api.getClients(search);
      setClients(data);
    } catch (err: any) {
      setActionError(err.message || 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search]);

  const handleOpenCreate = () => {
    setEditingClient(null);
    setName('');
    setPhone('');
    setNif('');
    setEmail('');
    setAddress('');
    setNotes('');
    setActionError(null);
    setClientModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setPhone(client.phone);
    setNif(client.nif || '');
    setEmail(client.email || '');
    setAddress(client.address || '');
    setNotes(client.notes || '');
    setActionError(null);
    setClientModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      setActionError('Nome e telefone são campos obrigatórios.');
      return;
    }

    setSubmitting(true);
    setActionError(null);

    try {
      if (editingClient) {
        await api.updateClient(editingClient.id, {
          name,
          phone,
          nif,
          email,
          address,
          notes,
        });
        setActionSuccess(`Dados do cliente ${name} atualizados com sucesso.`);
      } else {
        await api.createClient({
          name,
          phone,
          nif,
          email,
          address,
          notes,
        });
        setActionSuccess(`Novo cliente ${name} registado com sucesso.`);
      }
      setClientModalOpen(false);
      await fetchClients();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Falha ao gravar cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenHistory = async (client: any) => {
    try {
      const [invoices, quotes] = await Promise.all([
        api.getInvoices(undefined, client.id),
        api.getQuotes(undefined, client.id),
      ]);
      setSelectedClientHistory({
        client,
        invoices,
        quotes,
      });
    } catch (err: any) {
      setActionError('Falha ao obter histórico do cliente.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Pesquisa e Novo Cliente */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs no-print">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome, telefone ou NIF..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
          />
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 bg-[#1D2B68] hover:bg-[#15204e] text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-[#78C6D8]" />
          <span>Registar Novo Cliente</span>
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

      {/* Lista de Clientes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#78C6D8]" />
            <span>A carregar clientes...</span>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Nenhum cliente registado. Clique em "Registar Novo Cliente" para adicionar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1D2B68] text-white text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Nome / Razão Social</th>
                  <th className="py-3 px-4 font-semibold">Telefone</th>
                  <th className="py-3 px-4 font-semibold">NIF</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Facturado</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Pago</th>
                  <th className="py-3 px-4 font-semibold text-right">Saldo em Dívida</th>
                  <th className="py-3 px-4 font-semibold text-center no-print">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {clients.map((c, idx) => (
                  <tr key={c.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{c.name}</p>
                      {c.email && <p className="text-[11px] text-slate-500">{c.email}</p>}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {c.phone}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {c.nif || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#1D2B68]">
                      {formatKz(c.totalInvoiced)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#198754]">
                      {formatKz(c.totalPaid)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {c.totalDebt > 0 ? (
                        <span className="font-black text-[#DC3545]">{formatKz(c.totalDebt)}</span>
                      ) : (
                        <span className="text-slate-400">Regularizado</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center no-print">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenHistory(c)}
                          className="px-2 py-1 text-slate-600 hover:text-[#1D2B68] hover:bg-slate-100 rounded text-[11px] font-semibold transition-colors"
                          title="Consultar Histórico Completo"
                        >
                          Histórico
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 text-slate-500 hover:text-[#1D2B68] hover:bg-slate-100 rounded transition-colors"
                          title="Editar Dados do Cliente"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Criar / Editar Cliente */}
      {clientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-sm font-bold text-[#1D2B68] mb-1">
              {editingClient ? `Editar Cliente: ${editingClient.name}` : 'Registar Novo Cliente'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Preencha os dados do cliente para associar a orçamentos, encomendas e facturação.
            </p>

            <form onSubmit={handleSaveClient} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nome ou Denominação Social *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: António Manuel ou Gráfica Parceira Lda"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex.: 923 000 000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NIF (Opcional)
                  </label>
                  <input
                    type="text"
                    value={nif}
                    onChange={(e) => setNif(e.target.value)}
                    placeholder="Ex.: 5401234567"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  E-mail (Opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@exemplo.ao"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Endereço / Localização (Opcional)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex.: Luanda, Maianga"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Preferências, descontos acordados ou tipo de trabalho frequente..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setClientModalOpen(false)}
                  className="px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 font-bold bg-[#1D2B68] text-white hover:bg-[#15204e] rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'A guardar...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Histórico do Cliente */}
      {selectedClientHistory && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#1D2B68]">
                  Histórico do Cliente: {selectedClientHistory.client.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Telefone: {selectedClientHistory.client.phone} • NIF: {selectedClientHistory.client.nif || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setSelectedClientHistory(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Facturas do Cliente */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#1D2B68]" />
                  <span>Facturas Emitidas ({selectedClientHistory.invoices.length})</span>
                </h4>
                {selectedClientHistory.invoices.length === 0 ? (
                  <p className="text-slate-400 italic">Nenhuma factura emitida para este cliente.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedClientHistory.invoices.map((inv: Invoice) => (
                      <div key={inv.id} className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between items-center">
                        <div>
                          <span className="font-mono font-bold text-[#1D2B68]">{inv.invoiceNumber}</span>
                          <span className="text-[11px] text-slate-500 ml-2">{new Date(inv.createdAt).toLocaleDateString('pt-AO')}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-800">{formatKz(inv.total)}</span>
                          <span className="text-[11px] text-slate-500 ml-2">Saldo: {formatKz(inv.balance)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cotações do Cliente */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#78C6D8]" />
                  <span>Cotações Registadas ({selectedClientHistory.quotes.length})</span>
                </h4>
                {selectedClientHistory.quotes.length === 0 ? (
                  <p className="text-slate-400 italic">Nenhuma cotação registada para este cliente.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedClientHistory.quotes.map((q: Quote) => (
                      <div key={q.id} className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between items-center">
                        <div>
                          <span className="font-mono font-bold text-[#1D2B68]">{q.quoteNumber}</span>
                          <span className="text-[11px] text-slate-500 ml-2">{new Date(q.createdAt).toLocaleDateString('pt-AO')}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-800">{formatKz(q.total)}</span>
                          <span className="text-[10px] font-bold uppercase ml-2 text-slate-600">[{q.status}]</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
