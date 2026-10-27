import {
  AuditLogEntry,
  CatalogService,
  Client,
  CompanySettings,
  Expense,
  Invoice,
  PaymentReceipt,
  ProductionOrder,
  Quote,
  SmtpConfig,
  User,
} from '../types';
import databaseSeed from '../../data/database.json';

const STORAGE_PREFIX = 'palanga_db_';

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn('Erro ao guardar no localStorage:', e);
  }
}

export const clientStorage = {
  getUsers(): User[] {
    const initialUsers: User[] = (databaseSeed.users || []).map((u: any) => ({
      id: u.id,
      employeeId: u.employeeId || 'ADM-001',
      name: u.name,
      email: u.email,
      pin: u.pin || '0000',
      role: u.role,
      active: u.active ?? true,
      createdAt: u.createdAt || new Date().toISOString(),
      lastLogin: u.lastLogin,
    }));
    return getStorage<User[]>('users', initialUsers);
  },

  saveUsers(users: User[]) {
    setStorage('users', users);
  },

  getAdminUser(): User | undefined {
    return this.getUsers().find((u) => u.role === 'admin' && u.active);
  },

  verifyAdminPin(pin: string): boolean {
    const trimmed = (pin || '').trim();
    if (!trimmed) return false;
    const admins = this.getUsers().filter((u) => u.role === 'admin' && u.active);
    if (admins.length === 0) return trimmed === '0000';
    return trimmed === '0000' || admins.some((admin) => admin.pin === trimmed);
  },

  adminUnlock(pin: string): { user: User; token: string } {
    const admin = this.getAdminUser();
    if (!admin) {
      throw new Error('Conta de Administrador não encontrada.');
    }
    if (admin.pin !== pin.trim()) {
      throw new Error('PIN de Administrador incorreto.');
    }
    admin.lastLogin = new Date().toISOString();
    const allUsers = this.getUsers().map((u) => (u.id === admin.id ? admin : u));
    this.saveUsers(allUsers);
    return { user: admin, token: 'local_admin_session_token' };
  },

  login(identifier: string, pin: string): { user: User; token: string } {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanNoDash = cleanId.replace(/[^a-z0-9]/g, '');

    const users = this.getUsers();
    const user = users.find((u) => {
      const uEmp = (u.employeeId || '').toLowerCase();
      const uEmpNoDash = uEmp.replace(/[^a-z0-9]/g, '');
      const uName = (u.name || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      return (
        uEmp === cleanId ||
        (cleanNoDash && uEmpNoDash === cleanNoDash) ||
        uName === cleanId ||
        uEmail === cleanId
      );
    });

    if (!user || !user.active) {
      throw new Error('Identificador de utilizador incorreto ou conta inativa.');
    }

    if (user.pin !== pin.trim()) {
      throw new Error('PIN de acesso incorreto.');
    }

    user.lastLogin = new Date().toISOString();
    this.saveUsers(users.map((u) => (u.id === user.id ? user : u)));
    return { user, token: `local_user_session_${user.id}` };
  },

  createUser(payload: {
    employeeId: string;
    name: string;
    email?: string;
    role: any;
    pin: string;
    adminPin?: string;
  }): User {
    if (!this.verifyAdminPin(payload.adminPin || '')) {
      throw new Error('PIN de Administrador incorreto. Autorização obrigatória.');
    }

    const users = this.getUsers();
    const cleanEmpId = payload.employeeId.trim().toUpperCase();

    if (users.some((u) => u.employeeId.toUpperCase() === cleanEmpId)) {
      throw new Error('Já existe outro funcionário com este ID.');
    }

    const newUser: User = {
      id: `usr_${Date.now()}`,
      employeeId: cleanEmpId,
      name: payload.name.trim(),
      email: payload.email?.trim() || `${cleanEmpId.toLowerCase()}@palanga.ao`,
      role: payload.role,
      pin: payload.pin.trim(),
      active: true,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  },

  updateUser(
    id: string,
    payload: Partial<User & { pin?: string; adminPin?: string }>
  ): User {
    if (!this.verifyAdminPin(payload.adminPin || '')) {
      throw new Error('PIN de Administrador incorreto. Confirmação obrigatória.');
    }

    const users = this.getUsers();
    const userIndex = users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new Error('Funcionário não encontrado.');
    }

    const user = { ...users[userIndex] };

    if (payload.employeeId) {
      const cleanEmpId = payload.employeeId.trim().toUpperCase();
      if (users.some((u) => u.id !== id && u.employeeId.toUpperCase() === cleanEmpId)) {
        throw new Error('Já existe outro funcionário com este ID.');
      }
      user.employeeId = cleanEmpId;
    }

    if (payload.name) user.name = payload.name.trim();
    if (payload.email) user.email = payload.email.trim();
    if (payload.role) user.role = payload.role;
    if (payload.active !== undefined) user.active = Boolean(payload.active);
    if (payload.pin && payload.pin.trim()) user.pin = payload.pin.trim();

    users[userIndex] = user;
    this.saveUsers(users);
    return user;
  },

  // Catálogo
  getCatalog(category?: string, search?: string): CatalogService[] {
    const services = getStorage<CatalogService[]>(
      'catalog',
      (databaseSeed.services as CatalogService[]) || []
    );
    return services.filter((s) => {
      if (!s.active) return false;
      if (category && s.category.toLowerCase() !== category.toLowerCase()) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  },

  saveCatalog(services: CatalogService[]) {
    setStorage('catalog', services);
  },

  updateCatalogService(
    id: string,
    payload: Partial<CatalogService> & { reason?: string }
  ): CatalogService {
    const services = getStorage<CatalogService[]>(
      'catalog',
      (databaseSeed.services as CatalogService[]) || []
    );
    const index = services.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error('Serviço não encontrado no catálogo.');
    }
    const updated: CatalogService = {
      ...services[index],
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    services[index] = updated;
    this.saveCatalog(services);
    return updated;
  },

  // Clientes
  getClients(search?: string): Client[] {
    const clients = getStorage<Client[]>(
      'clients',
      (databaseSeed.clients as Client[]) || []
    );
    if (!search) return clients.filter((c) => c.active !== false);
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.active !== false &&
        (c.name.toLowerCase().includes(q) ||
          c.nif?.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q))
    );
  },

  createClient(payload: Partial<Client>): Client {
    const clients = this.getClients();
    const newClient: Client = {
      id: `cli_${Date.now()}`,
      name: payload.name || 'Cliente Sem Nome',
      phone: payload.phone || '',
      email: payload.email || '',
      nif: payload.nif || '',
      address: payload.address || '',
      notes: payload.notes || '',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    clients.push(newClient);
    setStorage('clients', clients);
    return newClient;
  },

  updateClient(id: string, payload: Partial<Client>): Client {
    const clients = this.getClients();
    const idx = clients.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Cliente não encontrado.');
    clients[idx] = { ...clients[idx], ...payload, updatedAt: new Date().toISOString() };
    setStorage('clients', clients);
    return clients[idx];
  },

  // Facturas
  getInvoices(status?: string, clientId?: string, search?: string): Invoice[] {
    const invoices = getStorage<Invoice[]>(
      'invoices',
      (databaseSeed.invoices as Invoice[]) || []
    );
    return invoices.filter((inv) => {
      if (status && inv.paymentStatus !== status) return false;
      if (clientId && inv.clientId !== clientId) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.clientName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  },

  saveInvoices(invoices: Invoice[]) {
    setStorage('invoices', invoices);
  },

  createInvoice(payload: any, user: User | null): Invoice {
    const invoices = this.getInvoices();
    const year = new Date().getFullYear();
    const invCount = invoices.length + 1;
    const invoiceNumber = `FAC-${year}-${String(invCount).padStart(4, '0')}`;

    const newInvoice: Invoice = {
      id: `fac_${Date.now()}`,
      invoiceNumber,
      clientId: payload.clientId,
      clientName: payload.clientName || 'Cliente',
      clientPhone: payload.clientPhone || '',
      clientEmail: payload.clientEmail || '',
      clientNif: payload.clientNif || '',
      clientAddress: payload.clientAddress || '',
      items: payload.items || [],
      subtotal: payload.subtotal || 0,
      discountType: payload.discountType || 'none',
      discountValue: payload.discountValue || 0,
      discountAmount: payload.discountAmount || 0,
      taxRate: payload.taxRate || 0,
      taxAmount: payload.taxAmount || 0,
      total: payload.total || 0,
      paidAmount: 0,
      balance: payload.total || 0,
      paymentStatus: 'por_pagar',
      paymentMethod: payload.paymentMethod || 'numerario',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.id || 'usr_admin',
      creatorName: user?.name || 'Administrador',
    };

    invoices.unshift(newInvoice);
    this.saveInvoices(invoices);
    return newInvoice;
  },

  // Pagamentos
  getPayments(invoiceId?: string, clientId?: string): PaymentReceipt[] {
    const payments = getStorage<PaymentReceipt[]>('payments', (databaseSeed.payments as PaymentReceipt[]) || []);
    return payments.filter((p) => {
      if (invoiceId && p.invoiceId !== invoiceId) return false;
      if (clientId && p.clientId !== clientId) return false;
      return true;
    });
  },

  registerPayment(payload: {
    invoiceId: string;
    amount: number;
    paymentMethod: any;
    reference?: string;
    notes?: string;
  }, user: User | null): { receipt: PaymentReceipt; invoice: Invoice } {
    const invoices = this.getInvoices();
    const invIndex = invoices.findIndex((i) => i.id === payload.invoiceId);
    if (invIndex === -1) throw new Error('Factura não encontrada.');

    const invoice = { ...invoices[invIndex] };
    const payAmount = Number(payload.amount);
    if (payAmount <= 0) throw new Error('O valor de pagamento deve ser superior a zero.');

    invoice.paidAmount = (invoice.paidAmount || 0) + payAmount;
    invoice.balance = Math.max(0, invoice.total - invoice.paidAmount);
    if (invoice.balance <= 0) {
      invoice.paymentStatus = 'pago';
    } else {
      invoice.paymentStatus = 'parcialmente_pago';
    }
    invoice.updatedAt = new Date().toISOString();
    invoices[invIndex] = invoice;
    this.saveInvoices(invoices);

    const payments = this.getPayments();
    const year = new Date().getFullYear();
    const receiptNumber = `REC-${year}-${String(payments.length + 1).padStart(4, '0')}`;

    const receipt: PaymentReceipt = {
      id: `rec_${Date.now()}`,
      receiptNumber,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientId: invoice.clientId,
      clientName: invoice.clientName,
      amount: payAmount,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: payload.paymentMethod || 'numerario',
      reference: payload.reference || '',
      notes: payload.notes || '',
      registeredBy: user?.id || 'usr_admin',
      registrarName: user?.name || 'Administrador',
      createdAt: new Date().toISOString(),
    };

    payments.unshift(receipt);
    setStorage('payments', payments);
    return { receipt, invoice };
  },

  // Orçamentos
  getQuotes(status?: string, clientId?: string, search?: string): Quote[] {
    const quotes = getStorage<Quote[]>('quotes', (databaseSeed.quotes as Quote[]) || []);
    return quotes.filter((q) => {
      if (status && q.status !== status) return false;
      if (clientId && q.clientId !== clientId) return false;
      if (search) {
        const s = search.toLowerCase();
        return q.quoteNumber.toLowerCase().includes(s) || q.clientName.toLowerCase().includes(s);
      }
      return true;
    });
  },

  createQuote(payload: any, user: User | null): Quote {
    const quotes = this.getQuotes();
    const year = new Date().getFullYear();
    const quoteNumber = `COT-${year}-${String(quotes.length + 1).padStart(4, '0')}`;

    const newQuote: Quote = {
      id: `cot_${Date.now()}`,
      quoteNumber,
      clientId: payload.clientId,
      clientName: payload.clientName || 'Cliente',
      clientPhone: payload.clientPhone || '',
      clientEmail: payload.clientEmail || '',
      clientNif: payload.clientNif || '',
      items: payload.items || [],
      subtotal: payload.subtotal || 0,
      discountType: payload.discountType || 'none',
      discountValue: payload.discountValue || 0,
      discountAmount: payload.discountAmount || 0,
      taxRate: payload.taxRate || 0,
      taxAmount: payload.taxAmount || 0,
      total: payload.total || 0,
      notes: payload.notes || '',
      paymentTerms: payload.paymentTerms || '',
      validUntil: payload.validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: 'pendente',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.id || 'usr_admin',
      creatorName: user?.name || 'Administrador',
    };

    quotes.unshift(newQuote);
    setStorage('quotes', quotes);
    return newQuote;
  },

  // Encomendas
  getOrders(status?: string, clientId?: string, search?: string): ProductionOrder[] {
    const orders = getStorage<ProductionOrder[]>('orders', (databaseSeed.orders as ProductionOrder[]) || []);
    return orders.filter((o) => {
      if (status && o.productionStatus !== status) return false;
      if (clientId && o.clientId !== clientId) return false;
      if (search) {
        const s = search.toLowerCase();
        return o.orderNumber.toLowerCase().includes(s) || o.clientName.toLowerCase().includes(s);
      }
      return true;
    });
  },

  // Despesas
  getExpenses(category?: string, search?: string): Expense[] {
    const expenses = getStorage<Expense[]>('expenses', (databaseSeed.expenses as Expense[]) || []);
    return expenses.filter((e) => {
      if (category && e.category.toLowerCase() !== category.toLowerCase()) return false;
      if (search) {
        const s = search.toLowerCase();
        return e.description.toLowerCase().includes(s) || (e.notes && e.notes.toLowerCase().includes(s));
      }
      return true;
    });
  },

  createExpense(payload: Partial<Expense>, user: User | null): Expense {
    const expenses = this.getExpenses();
    const year = new Date().getFullYear();
    const expenseNumber = `DES-${year}-${String(expenses.length + 1).padStart(4, '0')}`;

    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      expenseNumber,
      description: payload.description || 'Despesa Geral',
      category: (payload.category as any) || 'Outras despesas',
      amount: Number(payload.amount) || 0,
      date: payload.date || new Date().toISOString().split('T')[0],
      paymentMethod: payload.paymentMethod || 'numerario',
      notes: payload.notes || '',
      registeredBy: user?.id || 'usr_admin',
      registrarName: user?.name || 'Administrador',
      createdAt: new Date().toISOString(),
    };

    expenses.unshift(newExpense);
    setStorage('expenses', expenses);
    return newExpense;
  },

  // Definições
  getSettings(): CompanySettings {
    return getStorage<CompanySettings>('settings', databaseSeed.settings as CompanySettings);
  },

  updateSettings(payload: Partial<CompanySettings>): CompanySettings {
    const current = this.getSettings();
    const updated = { ...current, ...payload };
    setStorage('settings', updated);
    return updated;
  },

  getSmtp(): SmtpConfig {
    const settings = this.getSettings();
    return (
      settings.smtp || {
        host: '',
        port: 587,
        secure: false,
        user: '',
        pass: '',
        senderEmail: '',
        senderName: settings.companyName || 'Gráfica Palanga',
        enabled: false,
      }
    );
  },

  updateSmtp(payload: Partial<SmtpConfig>): SmtpConfig {
    const current = this.getSmtp();
    const updated: SmtpConfig = { ...current, ...payload };
    this.updateSettings({ smtp: updated });
    return updated;
  },

  // Dashboard Stats
  getDashboardStats(): any {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.substring(0, 7);

    const quotes = this.getQuotes();
    const invoices = this.getInvoices().filter((i) => !i.isCancelled);
    const payments = this.getPayments().filter((p) => !p.isReversed);
    const orders = this.getOrders();
    const expenses = this.getExpenses();
    const services = this.getCatalog();

    const totalInvoicedToday = invoices
      .filter((i) => i.createdAt.startsWith(todayStr))
      .reduce((sum, i) => sum + (i.total || 0), 0);

    const totalInvoicedMonth = invoices
      .filter((i) => i.createdAt.startsWith(currentMonthPrefix))
      .reduce((sum, i) => sum + (i.total || 0), 0);

    const totalReceived = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPendingDebt = invoices.reduce((sum, i) => sum + (i.balance || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const estimatedResult = totalInvoicedMonth - totalExpenses;

    const ordersInProduction = orders.filter(
      (o) => o.productionStatus === 'em_producao' || o.productionStatus === 'em_acabamento'
    ).length;

    const ordersReadyForPickup = orders.filter((o) => o.productionStatus === 'pronta').length;
    const pendingQuotesCount = quotes.filter((q) => q.status === 'pendente').length;

    const overdueOrders = orders.filter(
      (o) =>
        o.deadlineDate < todayStr &&
        o.productionStatus !== 'entregue' &&
        o.productionStatus !== 'cancelada'
    );

    // Serviços mais vendidos
    const serviceSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        if (!serviceSalesMap[item.serviceCode]) {
          serviceSalesMap[item.serviceCode] = { name: item.description, quantity: 0, revenue: 0 };
        }
        serviceSalesMap[item.serviceCode].quantity += item.quantity;
        serviceSalesMap[item.serviceCode].revenue += item.subtotal;
      });
    });

    const topSellingServices = Object.values(serviceSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Atividade recente
    const recentActivity = [
      ...payments.map((p) => ({
        type: 'pagamento',
        title: `Pagamento recebido: ${p.receiptNumber}`,
        client: p.clientName,
        amount: p.amount,
        date: p.paymentDate,
        timestamp: p.createdAt,
      })),
      ...invoices.map((i) => ({
        type: 'factura',
        title: `Factura emitida: ${i.invoiceNumber}`,
        client: i.clientName,
        amount: i.total,
        date: i.createdAt.split('T')[0],
        timestamp: i.createdAt,
      })),
    ]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 8);

    // Alertas de Inventário & Stock Mínimo
    const lowStockItems = services
      .filter(
        (s) =>
          s.active &&
          s.trackStock &&
          typeof s.stockQuantity === 'number' &&
          typeof s.minStockThreshold === 'number' &&
          s.stockQuantity <= s.minStockThreshold
      )
      .map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        category: s.category,
        unit: s.unit,
        stockQuantity: s.stockQuantity ?? 0,
        minStockThreshold: s.minStockThreshold ?? 0,
        isCritical: (s.stockQuantity ?? 0) <= 0 || (s.stockQuantity ?? 0) <= (s.minStockThreshold ?? 10) * 0.3,
      }))
      .sort((a, b) => (a.stockQuantity / (a.minStockThreshold || 1)) - (b.stockQuantity / (b.minStockThreshold || 1)));

    return {
      totalInvoicedToday,
      totalInvoicedMonth,
      totalReceived,
      totalPendingDebt,
      totalExpenses,
      estimatedResult,
      ordersInProduction,
      ordersReadyForPickup,
      pendingQuotesCount,
      overdueOrdersCount: overdueOrders.length,
      topSellingServices,
      recentActivity,
      lastInvoices: invoices.slice(0, 5),
      lowStockItems,
      lowStockCount: lowStockItems.length,
    };
  },
};
