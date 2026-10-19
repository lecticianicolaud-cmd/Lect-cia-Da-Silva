import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle,
  Download,
  FileText,
  Filter,
  Printer,
  Receipt,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import { LogoReservedBox } from '../components/LogoReservedBox';
import { api } from '../services/api';
import { CompanySettings, User } from '../types';
import { formatKz } from '../utils/calculations';
import { handlePrintElement } from '../utils/printHelper';

interface ReportsViewProps {
  currentUser: User | null;
  settings: CompanySettings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ currentUser, settings }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodPreset, setPeriodPreset] = useState('este_mes');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const computePresetDates = (preset: string) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'hoje') {
      return { start: todayStr, end: todayStr };
    }
    if (preset === 'esta_semana') {
      const dayOfWeek = now.getDay(); // 0 is Sunday
      const diffToMonday = (dayOfWeek + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      return { start: monday.toISOString().split('T')[0], end: todayStr };
    }
    if (preset === 'este_mes') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      return { start: `${year}-${month}-01`, end: todayStr };
    }
    if (preset === 'este_ano') {
      const year = now.getFullYear();
      return { start: `${year}-01-01`, end: todayStr };
    }
    return { start: '', end: '' };
  };

  const fetchReports = async (start?: string, end?: string) => {
    setLoading(true);
    try {
      const res = await api.getReports(start, end);
      setData(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { start, end } = computePresetDates(periodPreset);
    setStartDate(start);
    setEndDate(end);
    fetchReports(start, end);
  }, [periodPreset]);

  const handleApplyCustomFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReports(startDate, endDate);
  };

  const handleExportCSV = () => {
    if (!data) return;

    let csvContent = '\uFEFF'; // BOM for Excel UTF-8 support
    csvContent += 'RELATÓRIO FINANCEIRO DA GRÁFICA PALANGA\n';
    csvContent += `Período: ${startDate || 'Início'} a ${endDate || 'Hoje'}\n\n`;

    csvContent += 'RESUMO DO PERÍODO\n';
    csvContent += `Total Facturado;${data.periodSummary.totalInvoiced};Kz\n`;
    csvContent += `Total Efectivamente Recebido;${data.periodSummary.totalReceived};Kz\n`;
    csvContent += `Total de Dívidas Pendentes;${data.periodSummary.totalPendingDebt};Kz\n`;
    csvContent += `Total de Despesas Registadas;${data.periodSummary.totalExpenses};Kz\n`;
    csvContent += `Resultado Operacional Estimado;${data.periodSummary.netOperatingResult};Kz\n\n`;

    csvContent += 'DESPESAS POR CATEGORIA\n';
    csvContent += 'Categoria;Montante (Kz)\n';
    Object.entries(data.expensesByCategory).forEach(([cat, val]) => {
      csvContent += `${cat};${val}\n`;
    });
    csvContent += '\n';

    csvContent += 'LISTA DE CLIENTES DEVEDORES\n';
    csvContent += 'Cliente;Telefone;Facturas em Aberto;Saldo Devedor (Kz)\n';
    data.debtorClients.forEach((d: any) => {
      csvContent += `"${d.clientName}";"${d.phone}";${d.invoiceCount};${d.balance}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-palanga-${startDate || 'geral'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros de Período */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-600 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#1D2B68]" />
            Período:
          </span>
          <button
            onClick={() => setPeriodPreset('hoje')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              periodPreset === 'hoje'
                ? 'bg-[#1D2B68] text-white font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setPeriodPreset('esta_semana')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              periodPreset === 'esta_semana'
                ? 'bg-[#1D2B68] text-white font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => setPeriodPreset('este_mes')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              periodPreset === 'este_mes'
                ? 'bg-[#1D2B68] text-white font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Este Mês
          </button>
          <button
            onClick={() => setPeriodPreset('este_ano')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              periodPreset === 'este_ano'
                ? 'bg-[#1D2B68] text-white font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Este Ano
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-slate-300"
          >
            <Download className="w-3.5 h-3.5 text-[#1D2B68]" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('report-printable-area');
              if (el) {
                handlePrintElement(el.innerHTML, 'Relatório Financeiro e Operacional — Gráfica Palanga');
              } else {
                window.print();
              }
            }}
            className="flex items-center gap-1.5 bg-[#1D2B68] hover:bg-[#15204e] text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-[#78C6D8]" />
            <span>Exportar PDF</span>
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('report-printable-area');
              if (el) {
                handlePrintElement(el.innerHTML, 'Relatório Financeiro e Operacional — Gráfica Palanga');
              } else {
                window.print();
              }
            }}
            className="flex items-center gap-1.5 bg-[#78C6D8] hover:bg-[#65bacc] text-[#1D2B68] text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* Explicação Didática Obrigatória da Secção 14 */}
      <div className="bg-[#1D2B68]/5 border border-[#1D2B68]/20 rounded-xl p-4 text-xs text-slate-700 no-print">
        <h4 className="font-bold text-[#1D2B68] mb-1 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-[#1D2B68]" />
          <span>Regras de Auditoria e Coerência Financeira:</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-2 text-[11px]">
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <strong className="text-[#1D2B68] block mb-0.5">Facturação:</strong>
            Representa o somatório de facturas internas emitidas e válidas no período filtrado.
          </div>
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <strong className="text-[#198754] block mb-0.5">Recebimentos:</strong>
            Representa apenas o dinheiro efectivamente recebido e confirmado via pagamentos válidos.
          </div>
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <strong className="text-[#DC3545] block mb-0.5">Dívidas Pendentes:</strong>
            Representa a soma dos saldos em aberto dos clientes devedores que ainda não liquidaram.
          </div>
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <strong className="text-amber-800 block mb-0.5">Resultado Operacional:</strong>
            Receita do período deduzida das despesas operacionais e custos directos registados.
          </div>
        </div>
      </div>

      <div id="report-printable-area">
        {loading || !data ? (
          <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#78C6D8]" />
            <span>A compilar relatórios e indicadores da base de dados...</span>
          </div>
        ) : (
          <div className="space-y-6 print-page">
          {/* Cabeçalho de Impressão */}
          <div className="hidden print-only mb-6 border-b-2 border-[#1D2B68] pb-4">
            <LogoReservedBox size="md" className="w-64 mb-3" />
            <h1 className="text-xl font-bold text-[#1D2B68]">Relatório Financeiro e Operacional</h1>
            <p className="text-xs text-slate-600">
              Gráfica Palanga • Luanda, Angola • Período: {startDate || 'Desde o início'} até {endDate || 'Hoje'}
            </p>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Facturação do Período</span>
              <p className="text-2xl font-black text-[#1D2B68] mt-2">
                {formatKz(data.periodSummary.totalInvoiced)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{data.invoicesCount} facturas emitidas</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Recebimentos Efectivos</span>
              <p className="text-2xl font-black text-[#198754] mt-2">
                {formatKz(data.periodSummary.totalReceived)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{data.paymentsCount} pagamentos registados</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Despesas Operacionais</span>
              <p className="text-2xl font-black text-rose-700 mt-2">
                {formatKz(data.periodSummary.totalExpenses)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{data.expensesCount} despesas lançadas</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Resultado Operacional Estimado</span>
              <p
                className={`text-2xl font-black mt-2 ${
                  data.periodSummary.netOperatingResult >= 0 ? 'text-[#1D2B68]' : 'text-red-600'
                }`}
              >
                {formatKz(data.periodSummary.netOperatingResult)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Facturação líquida menos despesas</p>
            </div>
          </div>

          {/* Duas Tabelas Detalhadas: Devedores e Despesas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Clientes Devedores */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              <h3 className="text-sm font-bold text-[#DC3545] mb-3 flex items-center justify-between">
                <span>Lista de Clientes Devedores (Saldos em Aberto)</span>
                <span className="text-xs font-semibold text-slate-500">
                  Total: {formatKz(data.periodSummary.totalPendingDebt)}
                </span>
              </h3>

              {data.debtorClients.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Excelente: Não existem dívidas pendentes de clientes no momento.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {data.debtorClients.map((client: any, idx: number) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800">{client.clientName}</p>
                        <p className="text-[11px] text-slate-500">
                          {client.phone} • {client.invoiceCount} factura(s) por liquidar
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-[#DC3545]">{formatKz(client.balance)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Despesas por Categoria */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              <h3 className="text-sm font-bold text-[#1D2B68] mb-3 flex items-center justify-between">
                <span>Despesas por Categoria</span>
                <span className="text-xs font-semibold text-slate-500">
                  Total: {formatKz(data.periodSummary.totalExpenses)}
                </span>
              </h3>

              {Object.keys(data.expensesByCategory).length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Nenhuma despesa registada para o período.
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {Object.entries(data.expensesByCategory).map(([cat, amount]: [string, any], idx) => {
                    const percent =
                      data.periodSummary.totalExpenses > 0
                        ? Math.round((amount / data.periodSummary.totalExpenses) * 100)
                        : 0;

                    return (
                      <div key={idx} className="p-2.5 bg-[#F5F7FA] rounded-lg">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-800">{cat}</span>
                          <span className="font-black text-slate-800">{formatKz(amount)} ({percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#1D2B68] h-1.5 rounded-full"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
