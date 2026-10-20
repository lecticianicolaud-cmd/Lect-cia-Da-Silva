import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Lock, Shield, ShieldAlert, Sparkles, Users } from 'lucide-react';
import { LogoReservedBox } from '../components/LogoReservedBox';
import { api } from '../services/api';
import { User } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  onAccessSettings: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onAccessSettings }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal para desbloquear Configurações com PIN de Administrador
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login(identifier, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Falha ao iniciar sessão. Verifique as credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminLoading(true);

    try {
      const res = await api.adminUnlock(adminPin.trim());
      onLoginSuccess(res.user);
      setAdminModalOpen(false);
      onAccessSettings();
    } catch (err: any) {
      setAdminError(err.message || 'PIN de Administrador incorreto.');
    } finally {
      setAdminLoading(false);
    }
  };

  const fillQuick = (userIdentifier: string) => {
    setIdentifier(userIdentifier);
    setPassword('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Top Header */}
        <div className="bg-[#1D2B68] p-6 text-center text-white flex flex-col items-center">
          <LogoReservedBox size="md" variant="dark-bg" className="mb-3 w-72" />
          <h1 className="text-xl font-bold tracking-tight">Gráfica Palanga</h1>
          <p className="text-xs text-[#78C6D8] font-medium mt-0.5">
            Sistema Integrado de Gestão e Facturação
          </p>
        </div>

        {/* Formulário */}
        <div className="p-6 sm:p-8">
          <h2 className="text-sm font-bold text-slate-800 mb-1">Acesso ao Sistema</h2>
          <p className="text-xs text-slate-500 mb-6">
            Introduza o seu Nome ou ID de Funcionário e o PIN de acesso.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome ou ID de Funcionário
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8] focus:border-transparent font-medium"
                  placeholder="Ex.: ADM-001 ou Administrador"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PIN de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8] focus:border-transparent font-mono font-bold tracking-wider"
                  placeholder="••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  title={showPassword ? 'Ocultar PIN' : 'Ver PIN'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1D2B68] hover:bg-[#15204e] text-white py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <span>A verificar credenciais...</span>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5 text-[#78C6D8]" />
                  <span>Iniciar Sessão</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setAdminError(null);
                setAdminPin('');
                setAdminModalOpen(true);
              }}
              className="w-full mt-2 text-xs text-slate-500 hover:text-[#1D2B68] font-semibold transition-colors flex items-center justify-center gap-1.5 py-1"
            >
              <Shield className="w-3.5 h-3.5 text-[#78C6D8]" />
              <span>Configurações do Sistema (Apenas Admin)</span>
            </button>
          </form>

          {/* Atalhos para Teste Rápido */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-[11px] font-semibold text-slate-600 mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#78C6D8]" />
              <span>Contas de demonstração:</span>
            </p>
            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
              <button
                type="button"
                onClick={() => fillQuick('ADM-001')}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-center transition-colors border border-slate-200"
              >
                Admin (ADM-001)
              </button>
              <button
                type="button"
                onClick={() => fillQuick('OP-001')}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-center transition-colors border border-slate-200"
              >
                Funcionário (OP-001)
              </button>
              <button
                type="button"
                onClick={() => fillQuick('FIN-001')}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-center transition-colors border border-slate-200"
              >
                Financeiro (FIN-001)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Acesso Restrito às Configurações com PIN de Administrador */}
      {adminModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#1D2B68] text-[#78C6D8] flex items-center justify-center font-black">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#1D2B68]">Acesso às Configurações</h3>
                <p className="text-[11px] text-slate-500">Exclusivo para Administradores</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              As configurações contêm a gestão confidencial de <strong>IDs de funcionários e PINs de autenticação</strong>. Introduza o PIN de Administrador para aceder:
            </p>

            {adminError && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{adminError}</span>
              </div>
            )}

            <form onSubmit={handleAdminUnlock} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  PIN do Administrador *
                </label>
                <div className="relative">
                  <input
                    type={showAdminPin ? 'text' : 'password'}
                    required
                    autoFocus
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="••••"
                    className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-lg font-mono font-bold tracking-wider text-sm focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPin(!showAdminPin)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    title={showAdminPin ? 'Ocultar PIN' : 'Ver PIN'}
                  >
                    {showAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdminModalOpen(false)}
                  className="px-3.5 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adminLoading}
                  className="px-4 py-2 font-bold bg-[#1D2B68] text-white hover:bg-[#15204e] rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {adminLoading ? 'A validar...' : 'Entrar nas Configurações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
