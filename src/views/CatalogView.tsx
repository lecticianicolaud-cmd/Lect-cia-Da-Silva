import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Edit2,
  Filter,
  History,
  Layers,
  Phone,
  Printer,
  RefreshCw,
  Search,
  Tag,
} from 'lucide-react';
import { api } from '../services/api';
import { CatalogService, PriceAuditLog, User } from '../types';
import { formatKz } from '../utils/calculations';
import { handlePrintElement } from '../utils/printHelper';

interface CatalogViewProps {
  currentUser: User | null;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ currentUser }) => {
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [editingService, setEditingService] = useState<CatalogService | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editReason, setEditReason] = useState<string>('');
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<PriceAuditLog[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const data = await api.getCatalog();
      setServices(data);
    } catch (err: any) {
      setActionError(err.message || 'Erro ao carregar catálogo');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const logs = await api.getPriceHistory();
      setAuditLogs(logs);
      setHistoryModalOpen(true);
    } catch (err: any) {
      setActionError('Falha ao carregar histórico de auditoria de preços.');
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const categories = ['Todas', ...Array.from(new Set(services.map((s) => s.category)))];

  const filteredServices = services.filter((s) => {
    const matchesCategory = selectedCategory === 'Todas' || s.category === selectedCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.notes && s.notes.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleEditClick = (service: CatalogService) => {
    setEditingService(service);
    setEditPrice(service.basePrice);
    setEditReason('');
    setActionError(null);
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    if (editPrice < 0) {
      setActionError('O preço não pode ser negativo.');
      return;
    }
    if (editPrice !== editingService.basePrice && (!editReason || editReason.trim().length === 0)) {
      setActionError('O motivo da alteração de preço é obrigatório para auditoria interna.');
      return;
    }

    setSubmitting(true);
    setActionError(null);

    try {
      await api.updateCatalogService(editingService.id, {
        basePrice: editPrice,
        reason: editReason,
      });
      setActionSuccess(`Preço do serviço "${editingService.name}" atualizado com sucesso!`);
      setEditingService(null);
      await fetchCatalog();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Falha ao atualizar preço.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Oficial da Tabela de Preços */}
      <div className="bg-[#1D2B68] text-white p-5 rounded-xl shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#78C6D8] text-[#1D2B68] text-[10px] font-bold px-2.5 py-0.5 rounded uppercase">
              Tabela Oficial
            </span>
            <span className="text-xs text-white/80 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#78C6D8]" />
              Em vigor desde: <strong className="text-white">28/07/2025</strong>
            </span>
          </div>
          <h2 className="text-lg font-bold">Catálogo de Serviços da Gráfica Palanga</h2>
          <p className="text-xs text-white/70 flex items-center gap-1.5 mt-0.5">
            <Phone className="w-3.5 h-3.5 text-[#78C6D8]" />
            Contacto WhatsApp Oficial: <strong className="text-white">945 562 287</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser?.role === 'admin' && (
            <button
              onClick={fetchHistory}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-white/20"
            >
              <History className="w-3.5 h-3.5 text-[#78C6D8]" />
              <span>Histórico de Preços</span>
            </button>
          )}

          <button
            onClick={() => {
              const el = document.getElementById('catalog-printable-area');
              if (el) {
                handlePrintElement(el.innerHTML, 'Catálogo e Tabela Oficial de Preços — Gráfica Palanga');
              } else {
                window.print();
              }
            }}
            className="flex items-center gap-1.5 bg-[#78C6D8] hover:bg-[#65bacc] text-[#1D2B68] text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Tabela</span>
          </button>
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

      {/* Barra de Pesquisa e Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between no-print">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar serviço por nome ou código..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 shrink-0">Categoria:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de Preços */}
      <div id="catalog-printable-area" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#78C6D8]" />
            <span>A carregar catálogo oficial...</span>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            Nenhum serviço encontrado com os filtros actuais.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1D2B68] text-white text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Código</th>
                  <th className="py-3 px-4 font-semibold">Categoria</th>
                  <th className="py-3 px-4 font-semibold">Nome do Serviço</th>
                  <th className="py-3 px-4 font-semibold text-center">Unidade</th>
                  <th className="py-3 px-4 font-semibold text-right">Preço Oficial</th>
                  <th className="py-3 px-4 font-semibold text-left">Regras & Condições</th>
                  {currentUser?.role === 'admin' && (
                    <th className="py-3 px-4 font-semibold text-center no-print">Acções</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredServices.map((service, idx) => (
                  <tr key={service.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-600">
                      {service.code}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-block bg-[#1D2B68]/10 text-[#1D2B68] font-medium px-2 py-0.5 rounded text-[10px]">
                        {service.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">
                      {service.name}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-600 capitalize">
                      {service.unit}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {service.pricingType === 'on_request' ? (
                        <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          Sob Consulta
                        </span>
                      ) : (
                        <span className="font-extrabold text-[#1D2B68] text-sm">
                          {formatKz(service.basePrice)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                      {service.tiers && service.tiers.length > 0 && (
                        <div className="space-y-0.5 mb-1">
                          {service.tiers.map((t, tidx) => (
                            <span
                              key={tidx}
                              className="inline-block mr-1 bg-blue-50 text-[#1D2B68] px-1.5 py-0.5 rounded text-[10px] border border-blue-200"
                            >
                              {t.label}
                            </span>
                          ))}
                        </div>
                      )}
                      {service.allowsCustomMaterial && (
                        <span className="block text-emerald-700 font-medium text-[10px]">
                          Material do Cliente: {formatKz(service.customMaterialPrice)}
                        </span>
                      )}
                      {service.notes && <span className="block text-slate-500 italic">{service.notes}</span>}
                    </td>
                    {currentUser?.role === 'admin' && (
                      <td className="py-2.5 px-4 text-center no-print">
                        <button
                          onClick={() => handleEditClick(service)}
                          className="p-1.5 text-slate-500 hover:text-[#1D2B68] hover:bg-slate-100 rounded-md transition-colors"
                          title="Editar Preço (Registo Auditado)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Edição de Preço (Admin) */}
      {editingService && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-sm font-bold text-[#1D2B68] mb-1">
              Editar Preço: {editingService.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Código: <span className="font-mono">{editingService.code}</span> • Preço Atual: <strong className="text-slate-800">{formatKz(editingService.basePrice)}</strong>
            </p>

            <form onSubmit={handleSavePrice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Novo Preço ({editingService.unit}) em Kwanzas (Kz)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo da Alteração <span className="text-red-500">* (Obrigatório para Auditoria)</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Ex.: Ajuste de custo de papel / autorização da gerência..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Conforme a Secção 7.19, este registo ficará associado ao seu utilizador e as facturas antigas emitidas permanecerão intactas.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold bg-[#1D2B68] text-white hover:bg-[#15204e] rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'A guardar...' : 'Confirmar e Auditar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Histórico de Auditoria de Preços */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#1D2B68]" />
                <h3 className="text-sm font-bold text-[#1D2B68]">
                  Histórico de Auditoria de Preços
                </h3>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {auditLogs.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400">
                  Nenhuma alteração de preço registada até ao momento. Todos os serviços mantêm os preços originais de 28/07/2025.
                </p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">{log.serviceName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString('pt-AO')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>Preço Anterior: <del>{formatKz(log.previousPrice)}</del></span>
                      <span>→</span>
                      <span className="font-bold text-[#1D2B68]">Novo Preço: {formatKz(log.newPrice)}</span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      <strong>Motivo:</strong> {log.reason}
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      Responsável: {log.userName}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
