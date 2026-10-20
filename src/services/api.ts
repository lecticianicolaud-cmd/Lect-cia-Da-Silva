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

const TOKEN_KEY = 'grafica_palanga_token';

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

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      this.clearToken();
      window.location.href = '/';
      return {} as T; // Return empty to avoid downstream errors during redirect
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      await response.text();
      throw new Error(
        `O servidor da API não respondeu em formato JSON (Código HTTP ${response.status}). Certifique-se de que o backend da API está ativo.`
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Ocorreu um erro no processamento da solicitação.');
    }

    return data as T;
  },

  // Auth
  async login(identifier: string, password: string):Promise<{ user: User; token: string }> {
    const res = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    this.setToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },


  async adminUnlock(pin: string): Promise<{ user: User; token: string }> {
    const res = await this.request<{ user: User; token: string }>('/auth/admin-unlock', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
    this.setToken(res.token);
    return res;
  },

  async verifyAdminPin(pin: string): Promise<boolean> {
    try {
      const res = await this.request<{ valid: boolean }>('/auth/verify-admin-pin', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      });
      return Boolean(res.valid);
    } catch {
      return false;
    }
  },

  // Users (Admin)
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/users');
  },

  async createUser(payload: { employeeId: string; name: string; email?: string; role: string; password?: string; pin: string; adminPin?: string }): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateUser(id: string, payload: Partial<User & { password?: string; pin?: string; adminPin?: string }>): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // Catalog
  async getCatalog(category?: string, search?: string): Promise<CatalogService[]> {
    const query = new URLSearchParams();
    if (category) query.set('category', category);
    if (search) query.set('search', search);
    return this.request<CatalogService[]>(`/catalog?${query.toString()}`);
  },

  async createCatalogService(payload: Partial<CatalogService>): Promise<CatalogService> {
    return this.request<CatalogService>('/catalog', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateCatalogService(id: string, payload: Partial<CatalogService> & { reason?: string }): Promise<CatalogService> {
    return this.request<CatalogService>(`/catalog/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getPriceHistory(): Promise<PriceAuditLog[]> {
    return this.request<PriceAuditLog[]>('/catalog/price-history');
  },

  // Clients
  async getClients(search?: string): Promise<Client[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<Client[]>(`/clients${query}`);
  },

  async createClient(payload: Partial<Client>): Promise<Client> {
    return this.request<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateClient(id: string, payload: Partial<Client>): Promise<Client> {
    return this.request<Client>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // Quotes
  async getQuotes(status?: string, clientId?: string, search?: string): Promise<Quote[]> {
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    if (clientId) query.set('clientId', clientId);
    if (search) query.set('search', search);
    return this.request<Quote[]>(`/quotes?${query.toString()}`);
  },

  async createQuote(payload: any): Promise<Quote> {
    return this.request<Quote>('/quotes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateQuoteStatus(id: string, status: string, notes?: string): Promise<Quote> {
    return this.request<Quote>(`/quotes/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  async convertQuoteToOrder(id: string, payload: { deadlineDate: string; responsibleUser?: string; technicalSpecs?: string }): Promise<ProductionOrder> {
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
    const query = new URLSearchParams();
    if (status) query.set('paymentStatus', status);
    if (clientId) query.set('clientId', clientId);
    if (search) query.set('search', search);
    return this.request<Invoice[]>(`/invoices?${query.toString()}`);
  },

  async createInvoice(payload: any): Promise<Invoice> {
    return this.request<Invoice>('/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async cancelInvoice(id: string, reason: string): Promise<Invoice> {
    return this.request<Invoice>(`/invoices/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Payments
  async getPayments(invoiceId?: string, clientId?: string): Promise<PaymentReceipt[]> {
    const query = new URLSearchParams();
    if (invoiceId) query.set('invoiceId', invoiceId);
    if (clientId) query.set('clientId', clientId);
    return this.request<PaymentReceipt[]>(`/payments?${query.toString()}`);
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
    return this.request<{ receipt: PaymentReceipt; invoice: Invoice }>('/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async reversePayment(id: string, reason: string): Promise<{ payment: PaymentReceipt; invoice: Invoice }> {
    return this.request<{ payment: PaymentReceipt; invoice: Invoice }>(`/payments/${id}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Orders
  async getOrders(status?: string, clientId?: string, search?: string): Promise<ProductionOrder[]> {
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    if (clientId) query.set('clientId', clientId);
    if (search) query.set('search', search);
    return this.request<ProductionOrder[]>(`/orders?${query.toString()}`);
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

  async addOrderCost(orderId: string, payload: { category: string; description: string; amount: number }): Promise<any> {
    return this.request(`/orders/${orderId}/costs`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Expenses
  async getExpenses(category?: string, search?: string): Promise<Expense[]> {
    const query = new URLSearchParams();
    if (category) query.set('category', category);
    if (search) query.set('search', search);
    return this.request<Expense[]>(`/expenses?${query.toString()}`);
  },

  async createExpense(payload: Partial<Expense>): Promise<Expense> {
    return this.request<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Dashboard & Reports
  async getDashboardStats(): Promise<any> {
    return this.request('/dashboard/stats');
  },

  async getReports(startDate?: string, endDate?: string): Promise<any> {
    const query = new URLSearchParams();
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);
    return this.request(`/reports?${query.toString()}`);
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    return this.request<AuditLogEntry[]>('/audit-logs');
  },

  // Settings
  async getSettings(): Promise<CompanySettings> {
    return this.request<CompanySettings>('/settings');
  },

  async updateSettings(payload: Partial<CompanySettings>): Promise<CompanySettings> {
    return this.request<CompanySettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async uploadLogo(imageBase64: string): Promise<{ success: boolean; logoUrl: string }> {
    return this.request<{ success: boolean; logoUrl: string }>('/settings/logo', {
      method: 'POST',
      body: JSON.stringify({ imageBase64 }),
    });
  },

  // Backups
  async getBackups(): Promise<any[]> {
    return this.request('/backups');
  },

  async createBackup(): Promise<any> {
    return this.request('/backups', { method: 'POST' });
  },

  async restoreBackup(payload: { filename?: string; rawJson?: string }): Promise<any> {
    return this.request('/backups/restore', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // System Tests (Secção 19)
  async runSystemTests(): Promise<{ summary: { total: number; passed: number; failed: number }; tests: TestResult[] }> {
    return this.request('/system-tests/run', { method: 'POST' });
  },

  // SMTP & Email Sending
  async getSmtpSettings(): Promise<SmtpConfig> {
    return this.request<SmtpConfig>('/settings/smtp');
  },

  async updateSmtpSettings(payload: Partial<SmtpConfig>): Promise<SmtpConfig> {
    return this.request<SmtpConfig>('/settings/smtp', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async testSmtp(toEmail: string, smtpConfig?: Partial<SmtpConfig>): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/smtp/test', {
      method: 'POST',
      body: JSON.stringify({ toEmail, smtpConfig }),
    });
  },

  async sendQuoteEmail(quoteId: string, payload: { recipientEmail?: string; customNotes?: string }): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/quotes/${quoteId}/send-email`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async sendInvoiceEmail(invoiceId: string, payload: { recipientEmail?: string; customNotes?: string }): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/invoices/${invoiceId}/send-email`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
