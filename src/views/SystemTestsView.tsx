import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Play,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { TestResult } from '../types';

export const SystemTestsView: React.FC = () => {
  const [results, setResults] = useState<{
    summary: { total: number; passed: number; failed: number };
    tests: TestResult[];
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunTests = async () => {
    setRunning(true);
    setError(null);
    try {
      const data = await api.runSystemTests();
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Falha ao executar suite de testes da Secção 19.');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    handleRunTests();
  }, []);

  return (
    <div className="space-y-6">
      {/* Banner de Testes Mandatórios */}
      <div className="bg-[#1D2B68] text-white p-5 rounded-xl shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#78C6D8] text-[#1D2B68] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              Secção 19 dos Requisitos
            </span>
            <span className="text-xs text-white/80">Validação Automatizada de Regras de Negócio</span>
          </div>
          <h2 className="text-lg font-bold">Suite de Verificação da Gráfica Palanga (Testes A ao R)</h2>
          <p className="text-xs text-white/70 mt-0.5">
            Executa a verificação completa de cálculos unitários, escalonamento por faixas, pagamentos parciais, estornos, persistência e auditoria.
          </p>
        </div>

        <button
          onClick={handleRunTests}
          disabled={running}
          className="flex items-center gap-2 bg-[#78C6D8] hover:bg-[#65bacc] text-[#1D2B68] text-xs font-bold px-4 py-2.5 rounded-lg transition-colors shadow-sm shrink-0 disabled:opacity-50"
        >
          {running ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>A executar testes no servidor...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Executar Todos os Testes Agora</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Resumo do Status de Conformidade */}
      {results && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-500 font-semibold">Total de Testes Executados</p>
              <p className="text-2xl font-black text-[#1D2B68] mt-1">{results.summary.total} Testes</p>
            </div>
            <div className="p-2.5 bg-blue-50 text-[#1D2B68] rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-500 font-semibold">Testes com Sucesso (100% Pass)</p>
              <p className="text-2xl font-black text-[#198754] mt-1">{results.summary.passed} Aprovados</p>
            </div>
            <div className="p-2.5 bg-green-50 text-[#198754] rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-500 font-semibold">Falhas Detectadas</p>
              <p className={`text-2xl font-black mt-1 ${results.summary.failed > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                {results.summary.failed} Falhas
              </p>
            </div>
            <div className={`p-2.5 rounded-lg ${results.summary.failed > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Lista Detalhada de Cada Teste */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <h3 className="text-sm font-bold text-[#1D2B68] mb-4">Resultados Detalhados por Critério de Aceitação</h3>

        {running && !results ? (
          <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#78C6D8]" />
            <span>A validar regras financeiras contra o backend e dados em disco...</span>
          </div>
        ) : !results ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Nenhum teste executado ainda. Clique em "Executar Todos os Testes Agora".
          </div>
        ) : (
          <div className="space-y-3">
            {results.tests.map((test) => (
              <div
                key={test.id}
                className={`p-4 rounded-lg border text-xs transition-colors ${
                  test.passed
                    ? 'bg-green-50/40 border-green-200'
                    : 'bg-red-50/50 border-red-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2.5">
                    {test.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-[#198754] shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[#DC3545] shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#1D2B68] bg-[#1D2B68]/10 px-2 py-0.5 rounded text-[10px]">
                          {test.code}
                        </span>
                        <h4 className="font-bold text-slate-800 text-xs">{test.name}</h4>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {test.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">{test.description}</p>
                    </div>
                  </div>

                  <span
                    className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider shrink-0 ${
                      test.passed
                        ? 'bg-[#198754] text-white'
                        : 'bg-[#DC3545] text-white'
                    }`}
                  >
                    {test.passed ? 'PASSOU' : 'FALHOU'}
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 font-medium">Resultado Esperado:</span>
                    <p className="font-bold text-slate-800 font-mono mt-0.5">{test.expected}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Resultado Obtido no Sistema:</span>
                    <p
                      className={`font-bold font-mono mt-0.5 ${
                        test.passed ? 'text-[#198754]' : 'text-[#DC3545]'
                      }`}
                    >
                      {test.actual}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
