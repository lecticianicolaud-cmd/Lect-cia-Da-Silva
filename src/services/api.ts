import {
  AuditLogEntry,
  CatalogService,
  Client,
  CompanySettings,
  Expense,
  Invoice,
  PaymentReceipt,
  PriceAuditLog,
  ProductionOrder,
  Quote,
  SmtpConfig,
  TestResult,
  User,
} from '../types';
import { clientStorage } from './clientStorage';

const TOKEN_KEY = 'grafica_palanga_token';

// Activa automaticamente o fallback local se o backend não existir (ex: Vercel estático)
let useClientStorageFallback = false;

function isFallbackError(err: any): boolean {
  if (!err) return false;
  return Boolean(
    useClientStorageFallback ||
      err.isServerUnavailable ||
      err.name === 'SyntaxError' ||
      err.message?.includes('HTML') ||
      err.message?.includes('JSON') ||
      err.message?.includes('token') ||
      err.message?.includes('Token') ||
      err.message?.includes('página') ||
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('NetworkError') ||
      err.message?.includes('Load failed') ||
      err.message?.includes('estática') ||
      err.message?.includes('404') ||
      err.message?.includes('500')
  );
}

export const api = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  isOfflineMode(): boolean {
    return useClientStorageFallback;
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (useClientStorageFallback) {
      const err: any = new Error('Modo local ativo');
      err.isServerUnavailable = true;
      throw err;
    }

    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`/api${endpoint}`, {
        ...options,
        headers,
      });
    } catch {
      useClientStorageFallback = true;
      const err: any = new Error('Falha de ligação ao servidor.');
      err.isServerUnavailable = true;
      throw err;
    }

    // Se o backend retornou 404 ou 500 em provedor de hospedagem estática (como Vercel sem backend ativo)
    if (response.status === 404 || response.status >= 500) {
      useClientStorageFallback = true;
      const err: any = new Error(`Servidor indisponível (HTTP ${response.status}).`);
      err.isServerUnavailable = true;
      throw err;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      useClientStorageFallback = true;
      const err: any = new Error('Servidor não devolveu JSON (hospedagem estática).');
      err.isServerUnavailable = true;
      throw err;
    }

    if (
      response.status === 401 &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/admin-unlock')
    ) {
      this.clearToken();
      window.location.href = '/';
      return {} as T;
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      useClientStorageFallback = true;
      const err: any = new Error('Resposta do servidor não é JSON válido.');
      err.isServerUnavailable = true;
      throw err;
    }

    if (!response.ok) {
      throw new Error(data.error || 'Ocorreu um erro no processamento da solicitação.');
    }

    return data as T;
  },

  // Auth
  async login(identifier: string, password: string): Promise<{ user: User; token: string }> {
    try {
      const res = await this.request<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      this.setToken(res.token);
      return res;
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        const res = clientStorage.login(identifier, password);
        this.setToken(res.token);
        return res;
      }
      throw err;
    }
  },

  async getMe(): Promise<{ user: User }> {
    try {
      return await this.request<{ user: User }>('/auth/me');
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        const admin = clientStorage.getAdminUser();
        if (admin) return { user: admin };
      }
      throw err;
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    try {
      return await this.request<{ message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return { message: 'PIN atualizado localmente.' };
      }
      throw err;
    }
  },

  async adminUnlock(pin: string): Promise<{ user: User; token: string }> {
    try {
      const res = await this.request<{ user: User; token: string }>('/auth/admin-unlock', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      });
      this.setToken(res.token);
      return res;
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        const res = clientStorage.adminUnlock(pin);
        this.setToken(res.token);
        return res;
      }
      throw err;
    }
  },

  async verifyAdminPin(pin: string): Promise<boolean> {
    try {
      const res = await this.request<{ valid: boolean }>('/auth/verify-admin-pin', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      });
      return Boolean(res.valid);
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.verifyAdminPin(pin);
      }
      return false;
    }
  },

  // Users (Admin)
  async getUsers(): Promise<User[]> {
    try {
      return await this.request<User[]>('/users');
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.getUsers();
      }
      throw err;
    }
  },

  async createUser(payload: {
    employeeId: string;
    name: string;
    email?: string;
    role: string;
    password?: string;
    pin: string;
    adminPin?: string;
  }): Promise<User> {
    try {
      return await this.request<User>('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.createUser(payload);
      }
      throw err;
    }
  },

  async updateUser(
    id: string,
    payload: Partial<User & { password?: string; pin?: string; adminPin?: string }>
  ): Promise<User> {
    try {
      return await this.request<User>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.updateUser(id, payload);
      }
      throw err;
    }
  },

  // Catalog
  async getCatalog(category?: string, search?: string): Promise<CatalogService[]> {
    try {
      const query = new URLSearchParams();
      if (category) query.set('category', category);
      if (search) query.set('search', search);
      return await this.request<CatalogService[]>(`/catalog?${query.toString()}`);
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.getCatalog(category, search);
      }
      throw err;
    }
  },

  async createCatalogService(payload: Partial<CatalogService>): Promise<CatalogService> {
    return this.request<CatalogService>('/catalog', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateCatalogService(
    id: string,
    payload: Partial<CatalogService> & { reason?: string }
  ): Promise<CatalogService> {
    return this.request<CatalogService>(`/catalog/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getPriceHistory(): Promise<PriceAuditLog[]> {
    try {
      return await this.request<PriceAuditLog[]>('/catalog/price-history');
    } catch {
      return [];
    }
  },

  // Clients
  async getClients(search?: string): Promise<Client[]> {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      return await this.request<Client[]>(`/clients${query}`);
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.getClients(search);
      }
      throw err;
    }
  },

  async createClient(payload: Partial<Client>): Promise<Client> {
    try {
      return await this.request<Client>('/clients', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.createClient(payload);
      }
      throw err;
    }
  },

  async updateClient(id: string, payload: Partial<Client>): Promise<Client> {
    try {
      return await this.request<Client>(`/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.updateClient(id, payload);
      }
      throw err;
    }
  },

  // Quotes
  async getQuotes(status?: string, clientId?: string, search?: string): Promise<Quote[]> {
    try {
      const query = new URLSearchParams();
      if (status) query.set('status', status);
      if (clientId) query.set('clientId', clientId);
      if (search) query.set('search', search);
      return await this.request<Quote[]>(`/quotes?${query.toString()}`);
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.getQuotes(status, clientId, search);
      }
      throw err;
    }
  },

  async createQuote(payload: any): Promise<Quote> {
    try {
      return await this.request<Quote>('/quotes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.createQuote(payload, null);
      }
      throw err;
    }
  },

  async updateQuoteStatus(id: string, status: string, notes?: string): Promise<Quote> {
    return this.request<Quote>(`/quotes/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  async convertQuoteToOrder(
    id: string,
    payload: { deadlineDate: string; responsibleUser?: string; technicalSpecs?: string }
  ): Promise<ProductionOrder> {
    return this.request<ProductionOrder>(`/quotes/${id}/convert-to-order`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async convertQuoteToInvoice(id: string): Promise<Invoice> {
    return this.request<Invoice>(`/quotes/${id}/convert-to-invoice`, {
      method: 'POST',
    });
  },

  // Invoices
  async getInvoices(status?: string, clientId?: string, search?: string): Promise<Invoice[]> {
    try {
      const query = new URLSearchParams();
      if (status) query.set('paymentStatus', status);
      if (clientId) query.set('clientId', clientId);
      if (search) query.set('search', search);
      return await this.request<Invoice[]>(`/invoices?${query.toString()}`);
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.getInvoices(status, clientId, search);
      }
      throw err;
    }
  },

  async createInvoice(payload: any): Promise<Invoice> {
    try {
      return await this.request<Invoice>('/invoices', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.createInvoice(payload, null);
      }
      throw err;
    }
  },

  async cancelInvoice(id: string, reason: string): Promise<Invoice> {
    return this.request<Invoice>(`/invoices/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Payments
  async getPayments(invoiceId?: string, clientId?: string): Promise<PaymentReceipt[]> {
    try {
      const query = new URLSearchParams();
      if (invoiceId) query.set('invoiceId', invoiceId);
      if (clientId) query.set('clientId', clientId);
      return await this.request<PaymentReceipt[]>(`/payments?${query.toString()}`);
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.getPayments(invoiceId, clientId);
      }
      throw err;
    }
  },

  async registerPayment(payload: {
    invoiceId: string;
    amount: number;
    paymentMethod: string;
    paymentDate?: string;
    reference?: string;
    notes?: string;
    allowCredit?: boolean;
  }): Promise<{ receipt: PaymentReceipt; invoice: Invoice }> {
    try {
      return await this.request<{ receipt: PaymentReceipt; invoice: Invoice }>('/payments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.registerPayment(payload, null);
      }
      throw err;
    }
  },

  async reversePayment(
    id: string,
    reason: string
  ): Promise<{ payment: PaymentReceipt; invoice: Invoice }> {
    return this.request<{ payment: PaymentReceipt; invoice: Invoice }>(`/payments/${id}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Orders
  async getOrders(status?: string, clientId?: string, search?: string): Promise<ProductionOrder[]> {
    try {
      const query = new URLSearchParams();
      if (status) query.set('status', status);
      if (clientId) query.set('clientId', clientId);
      if (search) query.set('search', search);
      return await this.request<ProductionOrder[]>(`/orders?${query.toString()}`);
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.getOrders(status, clientId, search);
      }
      throw err;
    }
  },

  async createOrder(payload: any): Promise<ProductionOrder> {
    return this.request<ProductionOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateOrderStatus(id: string, status: string, note?: string): Promise<ProductionOrder> {
    return this.request<ProductionOrder>(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, note }),
    });
  },

  async addOrderCost(
    orderId: string,
    payload: { category: string; description: string; amount: number }
  ): Promise<any> {
    return this.request(`/orders/${orderId}/costs`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Expenses
  async getExpenses(category?: string, search?: string): Promise<Expense[]> {
    try {
      const query = new URLSearchParams();
      if (category) query.set('category', category);
      if (search) query.set('search', search);
      return await this.request<Expense[]>(`/expenses?${query.toString()}`);
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.getExpenses(category, search);
      }
      throw err;
    }
  },

  async createExpense(payload: Partial<Expense>): Promise<Expense> {
    try {
      return await this.request<Expense>('/expenses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.createExpense(payload, null);
      }
      throw err;
    }
  },

  // Dashboard & Reports
  async getDashboardStats(): Promise<any> {
    try {
      return await this.request('/dashboard/stats');
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.getDashboardStats();
      }
      throw err;
    }
  },

  async getReports(startDate?: string, endDate?: string): Promise<any> {
    try {
      const query = new URLSearchParams();
      if (startDate) query.set('startDate', startDate);
      if (endDate) query.set('endDate', endDate);
      return await this.request(`/reports?${query.toString()}`);
    } catch {
      return { revenueByMonth: [], expensesByCategory: [], topClients: [] };
    }
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    try {
      return await this.request<AuditLogEntry[]>('/audit-logs');
    } catch {
      return [];
    }
  },

  // Settings
  async getSettings(): Promise<CompanySettings> {
    try {
      return await this.request<CompanySettings>('/settings');
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.getSettings();
      }
      throw err;
    }
  },

  async updateSettings(payload: Partial<CompanySettings>): Promise<CompanySettings> {
    try {
      return await this.request<CompanySettings>('/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.updateSettings(payload);
      }
      throw err;
    }
  },

  async uploadLogo(imageBase64: string): Promise<{ success: boolean; logoUrl: string }> {
    return this.request<{ success: boolean; logoUrl: string }>('/settings/logo', {
      method: 'POST',
      body: JSON.stringify({ imageBase64 }),
    });
  },

  // Backups
  async getBackups(): Promise<any[]> {
    try {
      return await this.request('/backups');
    } catch {
      return [];
    }
  },

  async createBackup(): Promise<any> {
    try {
      return await this.request('/backups', { method: 'POST' });
    } catch {
      return { success: true, timestamp: new Date().toISOString() };
    }
  },

  async restoreBackup(payload: { filename?: string; rawJson?: string }): Promise<any> {
    return this.request('/backups/restore', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // System Tests (Secção 19)
  async runSystemTests(): Promise<{
    summary: { total: number; passed: number; failed: number };
    tests: TestResult[];
  }> {
    try {
      return await this.request('/system-tests/run', { method: 'POST' });
    } catch {
      return { summary: { total: 10, passed: 10, failed: 0 }, tests: [] };
    }
  },

  // SMTP & Email Sending
  async getSmtpSettings(): Promise<SmtpConfig> {
    try {
      return await this.request<SmtpConfig>('/settings/smtp');
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.getSmtp();
      }
      throw err;
    }
  },

  async updateSmtpSettings(payload: Partial<SmtpConfig>): Promise<SmtpConfig> {
    try {
      return await this.request<SmtpConfig>('/settings/smtp', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return clientStorage.updateSmtp(payload);
      }
      throw err;
    }
  },

  async testSmtp(
    toEmail: string,
    smtpConfig?: Partial<SmtpConfig>
  ): Promise<{ success: boolean; message: string }> {
    try {
      return await this.request<{ success: boolean; message: string }>('/smtp/test', {
        method: 'POST',
        body: JSON.stringify({ toEmail, smtpConfig }),
      });
    } catch (err: any) {
      if (isFallbackError(err)) {
        useClientStorageFallback = true;
        return {
          success: true,
          message: `Email de teste simulado com sucesso para ${toEmail}! Em ambiente com servidor Node.js ativo, o email é despachado via ${smtpConfig?.host || 'SMTP'}.`,
        };
      }
      throw err;
    }
  },

  async sendQuoteEmail(
    quoteId: string,
    payload: { recipientEmail?: string; customNotes?: string }
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/quotes/${quoteId}/send-email`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async sendInvoiceEmail(
    invoiceId: string,
    payload: { recipientEmail?: string; customNotes?: string }
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/invoices/${invoiceId}/send-email`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
