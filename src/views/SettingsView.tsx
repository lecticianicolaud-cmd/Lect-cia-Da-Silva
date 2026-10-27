import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { api } from '../services/api';
import { SmtpConfig, User, UserRole } from '../types';

interface SettingsViewProps {
  currentUser: User | null;
  onNavigateHome?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onNavigateHome,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  // Mensagens de feedback
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Visibilidade global ou individual dos PINs
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  // Modal Novo Funcionário
  const [newUserModalOpen, setNewUserModalOpen] = useState(false);
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('operador');
  const [newPin, setNewPin] = useState('');
  const [newAdminPin, setNewAdminPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [showNewAdminPin, setShowNewAdminPin] = useState(false);
  const [savingNewUser, setSavingNewUser] = useState(false);

  // Modal Editar Funcionário
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('operador');
  const [editPin, setEditPin] = useState('');
  const [editAdminPin, setEditAdminPin] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [showEditPin, setShowEditPin] = useState(false);
  const [showEditAdminPin, setShowEditAdminPin] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal Alterar Apenas PIN
  const [pinModalUser, setPinModalUser] = useState<User | null>(null);
  const [quickPin, setQuickPin] = useState('');
  const [confirmQuickPin, setConfirmQuickPin] = useState('');
  const [quickAdminPin, setQuickAdminPin] = useState('');
  const [showQuickPin, setShowQuickPin] = useState(false);
  const [showQuickAdminPin, setShowQuickAdminPin] = useState(false);
  const [savingQuickPin, setSavingQuickPin] = useState(false);

  // Modal de Confirmação com PIN Admin para Activar / Desactivar
  const [toggleConfirmUser, setToggleConfirmUser] = useState<User | null>(null);
  const [toggleAdminPin, setToggleAdminPin] = useState('');
  const [showToggleAdminPin, setShowToggleAdminPin] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'users' | 'smtp'>('users');

  // SMTP State
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    senderEmail: '',
    senderName: 'Gráfica Palanga',
    enabled: false,
  });
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [smtpAdminPin, setSmtpAdminPin] = useState('');
  const [showSmtpAdminPin, setShowSmtpAdminPin] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchUsers = async () => {
    if (currentUser?.role !== 'admin') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setActionError(null);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      setActionError(err.message || 'Falha ao carregar a lista de funcionários.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSmtp = async () => {
    try {
      setSmtpLoading(true);
      const data = await api.getSmtpSettings();
      if (data) {
        setSmtpConfig({
          host: data.host || '',
          port: data.port || 587,
          secure: Boolean(data.secure),
          user: data.user || '',
          pass: data.pass || '',
          senderEmail: data.senderEmail || '',
          senderName: data.senderName || 'Gráfica Palanga',
          enabled: Boolean(data.enabled),
        });
        if (currentUser?.email && !testEmailRecipient) {
          setTestEmailRecipient(currentUser.email);
        }
      }
    } catch (err: any) {
      console.warn('Erro ao carregar configurações SMTP:', err);
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setTestResult(null);

    if (!smtpAdminPin.trim()) {
      setActionError('É obrigatório introduzir o PIN de Administrador para gravar as configurações do servidor SMTP.');
      return;
    }

    const isValid = await api.verifyAdminPin(smtpAdminPin.trim());
    if (!isValid) {
      setActionError('PIN de Administrador incorreto. Operação não autorizada.');
      return;
    }

    setSavingSmtp(true);
    try {
      const updated = await api.updateSmtpSettings(smtpConfig);
      setSmtpConfig(updated);
      setSmtpAdminPin('');
      setActionSuccess('Configurações do servidor SMTP gravadas com sucesso!');
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setActionError(err.message || 'Falha ao gravar configurações SMTP.');
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    setActionError(null);
    setTestResult(null);

    if (!testEmailRecipient || !testEmailRecipient.includes('@')) {
      setActionError('Por favor, indique um endereço de email válido para o envio do teste.');
      return;
    }

    if (!smtpConfig.host || !smtpConfig.user) {
      setActionError('Preencha pelo menos o Servidor (Host) e o Utilizador antes de testar a ligação.');
      return;
    }

    setTestingSmtp(true);
    try {
      const result = await api.testSmtp(testEmailRecipient, smtpConfig);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Falha ao ligar ao servidor SMTP. Verifique o host, porta e credenciais.',
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSmtp();
  }, [currentUser]);

  const togglePinReveal = (userId: string) => {
    setRevealedPins((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Criar Novo Funcionário (Requer PIN Admin)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!newEmployeeId.trim() || !newName.trim() || !newPin.trim()) {
      setActionError('Todos os campos (ID, Nome do Funcionário, Cargo e PIN) são de preenchimento obrigatório.');
      return;
    }

    if (!newAdminPin.trim()) {
      setActionError('É obrigatório introduzir o PIN de Administrador para autorizar a criação.');
      return;
    }

    setSavingNewUser(true);
    try {
      await api.createUser({
        employeeId: newEmployeeId.trim().toUpperCase(),
        name: newName.trim(),
        role: newRole,
        pin: newPin.trim(),
        adminPin: newAdminPin.trim(),
      });

      setActionSuccess(`Funcionário "${newName.trim()}" (ID: ${newEmployeeId.trim().toUpperCase()}) registado com sucesso após validação de PIN Admin!`);
      setNewUserModalOpen(false);
      setNewEmployeeId('');
      setNewName('');
      setNewRole('operador');
      setNewPin('');
      setNewAdminPin('');
      setShowNewPin(false);
      setShowNewAdminPin(false);
      await fetchUsers();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Falha ao criar funcionário. Verifique o PIN do Administrador.');
    } finally {
      setSavingNewUser(false);
    }
  };

  // Abrir Modal de Edição
  const openEditModal = (u: User) => {
    setEditingUser(u);
    setEditEmployeeId(u.employeeId || '');
    setEditName(u.name || '');
    setEditRole(u.role);
    setEditPin('');
    setEditAdminPin('');
    setEditActive(u.active);
    setShowEditPin(false);
    setShowEditAdminPin(false);
  };

  // Guardar Edição Completa (Requer PIN Admin)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionError(null);

    if (!editEmployeeId.trim() || !editName.trim() || !editPin.trim()) {
      setActionError('Todos os campos são obrigatórios: ID de Funcionário, Nome, Cargo e PIN.');
      return;
    }

    if (!editAdminPin.trim()) {
      setActionError('É obrigatório introduzir o PIN de Administrador para autorizar as alterações.');
      return;
    }

    setSavingEdit(true);
    try {
      await api.updateUser(editingUser.id, {
        employeeId: editEmployeeId.trim().toUpperCase(),
        name: editName.trim(),
        role: editRole,
        pin: editPin.trim(),
        active: editActive,
        adminPin: editAdminPin.trim(),
      });

      setActionSuccess(`Alterações de "${editName.trim()}" guardadas com sucesso após validação do PIN de Administrador.`);
      setEditingUser(null);
      await fetchUsers();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Falha ao atualizar dados. Verifique o PIN de Administrador.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Alterar Apenas PIN (Requer PIN Admin)
  const handleSaveQuickPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinModalUser) return;
    setActionError(null);

    if (!quickPin.trim()) {
      setActionError('O novo PIN não pode estar vazio.');
      return;
    }

    if (quickPin.trim() !== confirmQuickPin.trim()) {
      setActionError('O novo PIN e a confirmação não coincidem.');
      return;
    }

    if (!quickAdminPin.trim()) {
      setActionError('É obrigatório introduzir o PIN de Administrador para confirmar a alteração.');
      return;
    }

    setSavingQuickPin(true);
    try {
      await api.updateUser(pinModalUser.id, {
        pin: quickPin.trim(),
        password: quickPin.trim(),
        adminPin: quickAdminPin.trim(),
      });

      setActionSuccess(`PIN de "${pinModalUser.name}" alterado com sucesso (autorizado por PIN Admin).`);
      setPinModalUser(null);
      setQuickPin('');
      setConfirmQuickPin('');
      setQuickAdminPin('');
      setShowQuickPin(false);
      setShowQuickAdminPin(false);
      await fetchUsers();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Falha ao alterar o PIN. Verifique o PIN de Administrador.');
    } finally {
      setSavingQuickPin(false);
    }
  };

  // Confirmar Activar / Desactivar com PIN Admin
  const handleConfirmToggleActive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toggleConfirmUser) return;
    setActionError(null);

    if (!toggleAdminPin.trim()) {
      setActionError('Introduza o PIN de Administrador para confirmar esta alteração de estado.');
      return;
    }

    setSavingToggle(true);
    try {
      await api.updateUser(toggleConfirmUser.id, {
        active: !toggleConfirmUser.active,
        adminPin: toggleAdminPin.trim(),
      });

      setActionSuccess(`Estado de "${toggleConfirmUser.name}" alterado para ${!toggleConfirmUser.active ? 'Activo' : 'Inactivo'} com autorização de Administrador.`);
      setToggleConfirmUser(null);
      setToggleAdminPin('');
      setShowToggleAdminPin(false);
      await fetchUsers();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Falha ao alterar estado. Verifique o PIN do Administrador.');
    } finally {
      setSavingToggle(false);
    }
  };

  // Restrição estrita de Administrador
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl border border-red-200 text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#1D2B68]">Acesso Exclusivo de Administrador</h2>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              As configurações do sistema contêm exclusivamente a gestão de <strong>IDs de funcionários e PINs de autenticação</strong>. Apenas utilizadores com perfil de Administrador têm autorização de acesso.
            </p>
          </div>
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="w-full bg-[#1D2B68] hover:bg-[#15204e] text-white text-xs font-bold py-2.5 rounded-lg transition-colors shadow-sm"
            >
              Voltar ao Início
            </button>
          )}
        </div>
      </div>
    );
  }

  // Filtragem de funcionários
  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (u.employeeId && u.employeeId.toLowerCase().includes(q)) ||
      u.name.toLowerCase().includes(q) ||
      (u.pin && u.pin.includes(q));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalUsers = users.length;
  const adminUsers = users.filter((u) => u.role === 'admin').length;
  const activeUsers = users.filter((u) => u.active).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Cabeçalho Principal */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#1D2B68] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
              <Shield className="w-3 h-3 text-[#78C6D8]" />
              Acesso de Administrador
            </span>
            <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              PIN Admin Requerido para Alterações
            </span>
          </div>
          <h1 className="text-xl font-black text-[#1D2B68] tracking-tight">
            Configurações do Sistema
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestão restrita de credenciais, funcionários e servidor de email (SMTP) para envio automático de documentos.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeTab === 'users' && (
            <button
              onClick={() => {
                setNewEmployeeId('');
                setNewName('');
                setNewRole('operador');
                setNewPin('');
                setNewAdminPin('');
                setShowNewPin(false);
                setShowNewAdminPin(false);
                setNewUserModalOpen(true);
              }}
              className="flex items-center gap-2 bg-[#1D2B68] hover:bg-[#15204e] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow"
            >
              <UserPlus className="w-4 h-4 text-[#78C6D8]" />
              <span>+ Novo Funcionário</span>
            </button>
          )}
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:text-[#1D2B68] hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            >
              Voltar ao Início
            </button>
          )}
        </div>
      </div>

      {/* Tabs de Seleção de Configuração */}
      <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
            activeTab === 'users'
              ? 'bg-white text-[#1D2B68] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Funcionários & PINs ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('smtp');
            fetchSmtp();
          }}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
            activeTab === 'smtp'
              ? 'bg-white text-[#1D2B68] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Servidor SMTP (Envio de Emails)</span>
          {smtpConfig.enabled && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
          )}
        </button>
      </div>

      {/* Alertas de Notificação */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {activeTab === 'smtp' ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 animate-in fade-in">
          {/* Cabeçalho do Bloco SMTP */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-[#1D2B68] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                  <Mail className="w-3 h-3 text-[#78C6D8]" />
                  Servidor de Envio (SMTP)
                </span>
                {smtpConfig.enabled ? (
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    Envio Automático Ativo
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    Envio Desativado
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-[#1D2B68] tracking-tight">
                Configuração do Servidor de Email (SMTP)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure o seu próprio servidor de email para o disparo automático de <strong>Facturas em PDF</strong>, <strong>Cotações/Orçamentos</strong> e comprovativos de pagamento diretamente para os clientes.
              </p>
            </div>

            {/* Toggle Switch de Ativação Geral */}
            <div className="shrink-0">
              <label className="inline-flex items-center gap-3 cursor-pointer p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors">
                <input
                  type="checkbox"
                  checked={smtpConfig.enabled}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, enabled: e.target.checked })}
                  className="w-4 h-4 text-[#1D2B68] rounded focus:ring-[#78C6D8]"
                />
                <span className="text-xs font-bold text-slate-800">
                  {smtpConfig.enabled ? 'Envio por Email Ativado' : 'Envio por Email Desativado'}
                </span>
              </label>
            </div>
          </div>

          {/* Atalhos Rápidos para Provedores Populares */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#78C6D8]" />
                <span>Preenchimento Rápido por Provedor</span>
              </label>
              <span className="text-[11px] text-slate-400">Clique para preencher as portas e hosts padrão</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  setSmtpConfig({
                    ...smtpConfig,
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false,
                  })
                }
                className="p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-all hover:border-[#78C6D8] shadow-2xs group"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-xs text-slate-800 group-hover:text-[#1D2B68]">Google Gmail</p>
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">Porta 587</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">smtp.gmail.com • STARTTLS</p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSmtpConfig({
                    ...smtpConfig,
                    host: 'smtp.office365.com',
                    port: 587,
                    secure: false,
                  })
                }
                className="p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-all hover:border-[#78C6D8] shadow-2xs group"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-xs text-slate-800 group-hover:text-[#1D2B68]">Microsoft Outlook / 365</p>
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">Porta 587</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">smtp.office365.com • STARTTLS</p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSmtpConfig({
                    ...smtpConfig,
                    port: 465,
                    secure: true,
                  })
                }
                className="p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-all hover:border-[#78C6D8] shadow-2xs group"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-xs text-slate-800 group-hover:text-[#1D2B68]">cPanel / Domínio Próprio</p>
                  <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold">Porta 465 SSL</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">mail.seudominio.ao • SSL Direto</p>
              </button>
            </div>
          </div>

          {/* Formulário Principal de Edição SMTP */}
          <form onSubmit={handleSaveSmtp} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Servidor SMTP (Host) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="smtp.gmail.com ou mail.graficapalanga.ao"
                  value={smtpConfig.host}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Porta SMTP *
                  </label>
                  <input
                    type="number"
                    required
                    value={smtpConfig.port}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, port: Number(e.target.value) })}
                    placeholder="587 ou 465"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8] font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Encriptação / Segurança
                  </label>
                  <select
                    value={smtpConfig.secure ? 'ssl' : 'tls'}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, secure: e.target.value === 'ssl' })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                  >
                    <option value="tls">STARTTLS (Recomendado 587)</option>
                    <option value="ssl">SSL Direto (Porta 465)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Utilizador / Email de Autenticação *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex.: contacto@graficapalanga.ao ou utilizador@gmail.com"
                  value={smtpConfig.user}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Palavra-passe / Chave de Aplicação (App Password) *
                </label>
                <div className="relative">
                  <input
                    type={showSmtpPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={smtpConfig.pass}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                    className="w-full pl-3 pr-10 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8] font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    title={showSmtpPassword ? 'Ocultar Palavra-passe' : 'Ver Palavra-passe'}
                  >
                    {showSmtpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Para contas Google/Microsoft com 2FA, gere uma "Palavra-passe de Aplicação" nas definições de segurança da conta.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email do Remetente (From Email) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="ex.: facturacao@graficapalanga.ao"
                  value={smtpConfig.senderEmail}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, senderEmail: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Remetente (From Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex.: Gráfica Palanga — Facturação"
                  value={smtpConfig.senderName}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, senderName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8] font-medium"
                />
              </div>
            </div>

            {/* Confirmação Obrigatória com PIN de Administrador */}
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 mt-4">
              <label className="block text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Autorização Obrigatória: PIN de Administrador *</span>
              </label>
              <p className="text-[11px] text-amber-800">
                A gravação das credenciais SMTP exige a validação do PIN de Administrador por motivos de segurança.
              </p>
              <div className="relative max-w-xs">
                <input
                  type={showSmtpAdminPin ? 'text' : 'password'}
                  required
                  value={smtpAdminPin}
                  onChange={(e) => setSmtpAdminPin(e.target.value)}
                  placeholder="••••"
                  className="w-full pl-3 pr-10 py-2 text-xs border border-amber-300 rounded-lg bg-white font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-[#1D2B68]"
                />
                <button
                  type="button"
                  onClick={() => setShowSmtpAdminPin(!showSmtpAdminPin)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  title={showSmtpAdminPin ? 'Ocultar PIN' : 'Ver PIN'}
                >
                  {showSmtpAdminPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingSmtp}
                className="px-5 py-2.5 bg-[#1D2B68] hover:bg-[#15204e] text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow disabled:opacity-50 flex items-center gap-2"
              >
                {savingSmtp ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 text-[#78C6D8]" />
                )}
                <span>Guardar Configurações SMTP</span>
              </button>
            </div>
          </form>

          {/* Secção de Teste de Envio em Tempo Real */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-[#1D2B68]" />
              <span>Testar Conexão e Envio de Email</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Envie um email de teste para verificar se o host, a porta e a autenticação estão a funcionar corretamente.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
              <input
                type="email"
                placeholder="Introduza um email para receber o teste..."
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8] font-medium"
              />
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={testingSmtp}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
              >
                {testingSmtp ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-[#78C6D8]" />
                )}
                <span>Enviar Teste</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`mt-3 p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 animate-in fade-in ${
                  testResult.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Cartões de Indicadores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Total de Funcionários</span>
            <Users className="w-4 h-4 text-[#1D2B68]" />
          </div>
          <p className="text-2xl font-black text-[#1D2B68] mt-1">{totalUsers}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Administradores</span>
            <Shield className="w-4 h-4 text-[#78C6D8]" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-1">{adminUsers}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Contas Activas</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1">{activeUsers}</p>
        </div>

        <div className="bg-gradient-to-br from-[#1D2B68] to-[#2a3c8f] text-white p-4 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-white/80 text-xs">
            <span>Segurança do Sistema</span>
            <KeyRound className="w-4 h-4 text-[#78C6D8]" />
          </div>
          <p className="text-base font-bold text-[#78C6D8] mt-1">Protegido com PIN</p>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por ID, nome ou PIN..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-slate-500 font-medium">Filtrar Cargo:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
          >
            <option value="all">Todos os Cargos</option>
            <option value="admin">Administrador</option>
            <option value="operador">Funcionário (Atendimento)</option>
            <option value="financeiro">Financeiro</option>
          </select>

          <button
            onClick={fetchUsers}
            title="Recarregar tabela"
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabela de Funcionários & PINs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#1D2B68] text-white text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">ID do Funcionário</th>
                <th className="py-3 px-4 font-bold">Nome do Funcionário</th>
                <th className="py-3 px-4 font-bold">Cargo / Perfil</th>
                <th className="py-3 px-4 font-bold">PIN de Acesso</th>
                <th className="py-3 px-4 font-bold text-center">Estado</th>
                <th className="py-3 px-4 font-bold text-center">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#78C6D8]" />
                    <span>A carregar lista de funcionários...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhum funcionário encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isRevealed = revealedPins[u.id];
                  const currentPin = u.pin || '0000';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* ID de Funcionário */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-[#1D2B68] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs">
                          {u.employeeId || 'SEM-ID'}
                        </span>
                      </td>

                      {/* Nome do Funcionário */}
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {u.name}
                      </td>

                      {/* Cargo / Perfil */}
                      <td className="py-3.5 px-4">
                        {u.role === 'admin' ? (
                          <span className="bg-[#78C6D8]/20 text-[#1D2B68] border border-[#78C6D8]/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                            Administrador
                          </span>
                        ) : u.role === 'financeiro' ? (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                            Financeiro
                          </span>
                        ) : (
                          <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                            Funcionário (Atendimento)
                          </span>
                        )}
                      </td>

                      {/* PIN de Acesso */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-2 bg-slate-100/90 border border-slate-200 px-2.5 py-1 rounded-lg">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono font-bold text-xs tracking-wider text-slate-800 min-w-[40px]">
                            {isRevealed ? currentPin : '••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePinReveal(u.id)}
                            title={isRevealed ? 'Ocultar PIN' : 'Ver PIN'}
                            className="text-slate-400 hover:text-[#1D2B68] transition-colors ml-1"
                          >
                            {isRevealed ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 text-center">
                        {u.active ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            Activo
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            Inactivo
                          </span>
                        )}
                      </td>

                      {/* Acções */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-amber-200 transition-colors"
                            title="Editar Dados Completos do Funcionário"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => {
                              setPinModalUser(u);
                              setQuickPin('');
                              setConfirmQuickPin('');
                              setQuickAdminPin('');
                              setShowQuickPin(false);
                              setShowQuickAdminPin(false);
                            }}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-blue-200 transition-colors flex items-center gap-1"
                            title="Alterar Apenas o PIN de Acesso"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>PIN</span>
                          </button>

                          <button
                            onClick={() => {
                              setToggleConfirmUser(u);
                              setToggleAdminPin('');
                              setShowToggleAdminPin(false);
                            }}
                            className={`text-xs font-bold px-2 py-1 rounded-lg border transition-colors ${
                              u.active
                                ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                                : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                            }`}
                          >
                            {u.active ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CRIAR NOVO FUNCIONÁRIO (COM PIN ADMIN OBRIGATÓRIO)*/}
      {/* ======================================================== */}
      {newUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1D2B68] text-[#78C6D8] flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1D2B68]">Registar Novo Funcionário</h3>
                  <p className="text-[11px] text-slate-500">Todos os campos e autorização de PIN Admin são obrigatórios.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ID do Funcionário * <span className="text-[10px] text-slate-400 font-normal">(ex.: FUNC-002, ATEND-01)</span>
                </label>
                <input
                  type="text"
                  required
                  value={newEmployeeId}
                  onChange={(e) => setNewEmployeeId(e.target.value.toUpperCase())}
                  placeholder="FUNC-002"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome Completo do Funcionário *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome e Sobrenome"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cargo / Perfil de Acesso *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                >
                  <option value="operador">Funcionário (Atendimento / Balcão)</option>
                  <option value="financeiro">Financeiro (Caixa / Cobranças)</option>
                  <option value="admin">Administrador (Acesso Total)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  PIN de Acesso para o Funcionário * <span className="text-[10px] text-slate-400 font-normal">(PIN pessoal de acesso)</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="••••"
                    className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Campo Obrigatório: PIN de Autorização do Administrador */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5 mt-2">
                <label className="block font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>PIN de Administrador (Autorização Obrigatória) *</span>
                </label>
                <p className="text-[11px] text-amber-700">
                  Introduza o PIN do Administrador para autorizar a criação desta nova conta.
                </p>
                <div className="relative mt-1">
                  <input
                    type={showNewAdminPin ? 'text' : 'password'}
                    required
                    value={newAdminPin}
                    onChange={(e) => setNewAdminPin(e.target.value)}
                    placeholder="••••"
                    className="w-full pl-3 pr-10 py-2 border border-amber-300 rounded-lg font-mono font-bold tracking-wider bg-white focus:outline-none focus:ring-2 focus:ring-[#1D2B68]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewAdminPin(!showNewAdminPin)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setNewUserModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNewUser}
                  className="px-5 py-2 font-bold bg-[#1D2B68] text-white hover:bg-[#15204e] rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {savingNewUser ? 'A validar...' : 'Confirmar com PIN Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: EDITAR FUNCIONÁRIO (COM PIN ADMIN OBRIGATÓRIO)    */}
      {/* ======================================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-black text-[#1D2B68]">Editar Funcionário: {editingUser.name}</h3>
                <p className="text-[11px] text-slate-500">Altere os dados e valide com o PIN do Administrador.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ID do Funcionário * (Editável)
                </label>
                <input
                  type="text"
                  required
                  value={editEmployeeId}
                  onChange={(e) => setEditEmployeeId(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome do Funcionário * (Editável)
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cargo / Perfil * (Editável)
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                >
                  <option value="operador">Funcionário (Atendimento / Balcão)</option>
                  <option value="financeiro">Financeiro (Caixa / Cobranças)</option>
                  <option value="admin">Administrador (Acesso Total)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  PIN de Acesso * (Editável)
                </label>
                <div className="relative">
                  <input
                    type={showEditPin ? 'text' : 'password'}
                    required
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPin(!showEditPin)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showEditPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Estado da Conta *
                </label>
                <select
                  value={editActive ? 'true' : 'false'}
                  onChange={(e) => setEditActive(e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                >
                  <option value="true">Activo (Pode iniciar sessão)</option>
                  <option value="false">Inactivo (Acesso bloqueado)</option>
                </select>
              </div>

              {/* Campo Obrigatório: PIN de Autorização do Administrador */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5 mt-2">
                <label className="block font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>PIN de Administrador (Autorização Obrigatória) *</span>
                </label>
                <p className="text-[11px] text-amber-700">
                  Introduza o PIN do Administrador para autorizar as alterações feitas a este funcionário.
                </p>
                <div className="relative mt-1">
                  <input
                    type={showEditAdminPin ? 'text' : 'password'}
                    required
                    value={editAdminPin}
                    onChange={(e) => setEditAdminPin(e.target.value)}
                    placeholder="••••"
                    className="w-full pl-3 pr-10 py-2 border border-amber-300 rounded-lg font-mono font-bold tracking-wider bg-white focus:outline-none focus:ring-2 focus:ring-[#1D2B68]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditAdminPin(!showEditAdminPin)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showEditAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 font-bold bg-[#1D2B68] text-white hover:bg-[#15204e] rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {savingEdit ? 'A validar...' : 'Confirmar com PIN Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ALTERAR APENAS O PIN (COM PIN ADMIN OBRIGATÓRIO) */}
      {/* ======================================================== */}
      {pinModalUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1D2B68]">Alterar PIN</h3>
                  <p className="text-[11px] text-slate-500">{pinModalUser.name} ({pinModalUser.employeeId})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPinModalUser(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickPin} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Novo PIN de Acesso *
                </label>
                <div className="relative">
                  <input
                    type={showQuickPin ? 'text' : 'password'}
                    required
                    value={quickPin}
                    onChange={(e) => setQuickPin(e.target.value)}
                    placeholder="••••"
                    className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowQuickPin(!showQuickPin)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showQuickPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Confirmar Novo PIN *
                </label>
                <input
                  type={showQuickPin ? 'text' : 'password'}
                  required
                  value={confirmQuickPin}
                  onChange={(e) => setConfirmQuickPin(e.target.value)}
                  placeholder="Repita o novo PIN"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
                />
              </div>

              {/* Campo Obrigatório: PIN do Administrador */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5 mt-2">
                <label className="block font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>PIN do Administrador (Autorização) *</span>
                </label>
                <p className="text-[11px] text-amber-700">
                  Introduza o PIN do Administrador para autorizar a alteração do PIN deste funcionário.
                </p>
                <div className="relative mt-1">
                  <input
                    type={showQuickAdminPin ? 'text' : 'password'}
                    required
                    value={quickAdminPin}
                    onChange={(e) => setQuickAdminPin(e.target.value)}
                    placeholder="••••"
                    className="w-full pl-3 pr-10 py-2 border border-amber-300 rounded-lg font-mono font-bold tracking-wider bg-white focus:outline-none focus:ring-2 focus:ring-[#1D2B68]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowQuickAdminPin(!showQuickAdminPin)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showQuickAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setPinModalUser(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingQuickPin}
                  className="px-5 py-2 font-bold bg-[#1D2B68] text-white hover:bg-[#15204e] rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {savingQuickPin ? 'A validar...' : 'Confirmar com PIN Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: CONFIRMAÇÃO DE ESTADO (ACTIVAR / DESACTIVAR)     */}
      {/* ======================================================== */}
      {toggleConfirmUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                toggleConfirmUser.active ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#1D2B68]">
                  {toggleConfirmUser.active ? 'Desactivar Funcionário' : 'Activar Funcionário'}
                </h3>
                <p className="text-[11px] text-slate-500">{toggleConfirmUser.name} ({toggleConfirmUser.employeeId})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Confirma a alteração do estado desta conta para <strong>{toggleConfirmUser.active ? 'Inactivo' : 'Activo'}</strong>? É necessária a confirmação com o PIN de Administrador.
            </p>

            <form onSubmit={handleConfirmToggleActive} className="space-y-3.5 text-xs">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                <label className="block font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>PIN do Administrador *</span>
                </label>
                <div className="relative mt-1">
                  <input
                    type={showToggleAdminPin ? 'text' : 'password'}
                    required
                    autoFocus
                    value={toggleAdminPin}
                    onChange={(e) => setToggleAdminPin(e.target.value)}
                    placeholder="••••"
                    className="w-full pl-3 pr-10 py-2 border border-amber-300 rounded-lg font-mono font-bold tracking-wider bg-white focus:outline-none focus:ring-2 focus:ring-[#1D2B68]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToggleAdminPin(!showToggleAdminPin)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showToggleAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setToggleConfirmUser(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingToggle}
                  className={`px-5 py-2 font-bold text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 ${
                    toggleConfirmUser.active ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {savingToggle ? 'A validar...' : 'Confirmar Alteração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
