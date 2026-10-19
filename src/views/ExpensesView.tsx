import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  Filter,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  Search,
} from 'lucide-react';
import { api } from '../services/api';
import { Expense, ExpenseCategory, PaymentMethod, User } from '../types';
import { formatKz } from '../utils/calculations';

interface ExpensesViewProps {
  currentUser: User | null;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Papel',
  'Tintas',
  'Consumíveis',
  'Material para impressão',
  'Acabamentos',
  'Transporte',
  'Energia',
  'Internet',
  'Manutenção de equipamentos',
  'Outras despesas',
];

export const ExpensesView: React.FC<ExpensesViewProps> = ({ currentUser }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('Papel');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('numerario');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const data = await api.getExpenses();
      setExpenses(data);
    } catch (err: any) {
      setActionError(err.message || 'Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setActionError('O valor da despesa deve ser superior a zero.');
      return;
    }
    if (!description.trim()) {
      setActionError('A descrição da despesa é obrigatória.');
      return;
    }

    setSubmitting(true);
    setActionError(null);

    try {
      await api.createExpense({
        category,
        description,
        amount,
        date,
        paymentMethod,
        notes,
      });

      setActionSuccess('Despesa registada com sucesso.');
      setModalOpen(false);
      setDescription('');
      setAmount(0);
      setNotes('');
      await fetchExpenses();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Falha ao registar despesa.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesCat = selectedCategory === 'Todas' || e.category === selectedCategory;
    const matchesSearch =
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.expenseNumber.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Resumo de Despesas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-500 font-semibold">Total Geral de Despesas</p>
            <p className="text-xl font-black text-[#1D2B68] mt-1">{formatKz(totalFilteredAmount)}</p>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-700 rounded-lg">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-500 font-semibold">Despesas Registadas</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{filteredExpenses.length} registos</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-[#1D2B68] rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
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
              placeholder="Pesquisar despesa ou número..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:outline-none"
          >
            <option value="Todas">Todas as Categorias</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {(currentUser?.role === 'admin' || currentUser?.role === 'financeiro') && (
          <button
            onClick={() => {
              setModalOpen(true);
              setActionError(null);
            }}
            className="flex items-center gap-1.5 bg-[#1D2B68] hover:bg-[#15204e] text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-[#78C6D8]" />
            <span>Registar Despesa</span>
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

      {/* Lista de Despesas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#78C6D8]" />
            <span>A carregar despesas...</span>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Nenhuma despesa registada na categoria selecionada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1D2B68] text-white text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">N.º Despesa</th>
                  <th className="py-3 px-4 font-semibold">Categoria</th>
                  <th className="py-3 px-4 font-semibold">Descrição</th>
                  <th className="py-3 px-4 font-semibold">Data</th>
                  <th className="py-3 px-4 font-semibold">Método</th>
                  <th className="py-3 px-4 font-semibold text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredExpenses.map((exp, idx) => (
                  <tr key={exp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {exp.expenseNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block bg-[#1D2B68]/10 text-[#1D2B68] font-medium px-2 py-0.5 rounded text-[10px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {exp.description}
                      {exp.orderNumber && (
                        <span className="block text-[10px] text-amber-700 font-normal">
                          Alocado à encomenda: {exp.orderNumber}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(exp.date).toLocaleDateString('pt-AO')}
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-700">
                      {exp.paymentMethod}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-red-700 text-sm">
                      {formatKz(exp.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registar Despesa */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-sm font-bold text-[#1D2B68] mb-1">
              Registar Despesa / Saída de Caixa
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Introduza a categoria e o montante da despesa para controlo de resultados operacionais.
            </p>

            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Categoria da Despesa *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Descrição da Despesa *
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex.: Resmas de papel A4 80g / Factura de energia..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Valor (Kz) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Método de Pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="numerario">Numerário</option>
                    <option value="multicaixa">Multicaixa</option>
                    <option value="transferencia">Transferência</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Fornecedor, número da fatura ou outros detalhes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 font-bold bg-[#1D2B68] text-white hover:bg-[#15204e] rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'A registar...' : 'Gravar Despesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
