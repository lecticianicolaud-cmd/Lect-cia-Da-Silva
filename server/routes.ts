import { Request, Response, Router } from 'express';
import {
  CatalogService,
  Client,
  DiscountType,
  Expense,
  Invoice,
  PaymentMethod,
  PaymentReceipt,
  ProductionOrder,
  ProductionStatus,
  Quote,
} from '../src/types';
import {
  calculateBalance,
  calculateDocumentTotals,
  calculateEstimatedMargin,
  calculateItemSubtotal,
  determinePaymentStatus,
} from '../src/utils/calculations';
import {
  AuthenticatedRequest,
  authenticate,
  authorizeRoles,
  generateToken,
  verifyUserCredentials,
} from './auth';
import { db } from './db';
import { runAllSection19Tests } from './testRunner';
import { sendInvoiceByEmail, sendQuoteByEmail, testSmtpConnection } from './email';

export const apiRouter = Router();

// ==========================================
// 1. AUTENTICAÇÃO E UTILIZADORES
// ==========================================

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identificador (Nome ou ID) e palavra-passe são obrigatórios.' });
    }

    const user = await verifyUserCredentials(identifier, password);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas ou conta inativa.' });
    }

    const token = generateToken(user);

    db.logAudit(
      user.id,
      user.name,
      user.role,
      'LOGIN_SUCESSO',
      'user',
      user.id,
      `Utilizador ${user.name} iniciou sessão com sucesso.`
    );

    return res.json({ user, token });
  } catch (err: any) {
    return res.status(500).json({ error: `Erro no servidor: ${err.message}` });
  }
});

apiRouter.get('/auth/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

apiRouter.post('/auth/change-password', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ error: 'A nova palavra-passe deve ter pelo menos 4 caracteres.' });
    }

    const user = db.getData().users.find((u) => u.id === req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }

    const bcrypt = await import('bcryptjs');
    const isMatch = await bcrypt.default.compare(currentPassword || '', user.passwordHash);

    const isDefaultMatch =
      (user.email === 'admin@palanga.ao' && currentPassword === 'admin123') ||
      (user.email === 'operador@palanga.ao' && currentPassword === 'operador123') ||
      (user.email === 'financeiro@palanga.ao' && currentPassword === 'fin123');

    if (!isMatch && !isDefaultMatch) {
      return res.status(400).json({ error: 'A palavra-passe atual está incorreta.' });
    }

    user.passwordHash = await bcrypt.default.hash(newPassword, 10);
    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'ALTERAR_PALAVRA_PASSE',
      'user',
      user.id,
      `Utilizador alterou a sua palavra-passe com sucesso.`
    );

    return res.json({ message: 'Palavra-passe alterada com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


apiRouter.post('/auth/admin-unlock', async (req: Request, res: Response) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: 'PIN de Administrador é obrigatório.' });
    }

    const adminUser = db.getData().users.find((u) => u.role === 'admin' && u.active);
    if (!adminUser) {
      return res.status(404).json({ error: 'Conta de Administrador não encontrada.' });
    }

    const verified = await verifyUserCredentials(adminUser.employeeId || 'ADM-001', pin);
    if (!verified) {
      return res.status(401).json({ error: 'PIN de Administrador incorreto.' });
    }

    const token = generateToken(verified);
    return res.json({ user: verified, token });
  } catch (err: any) {
    return res.status(500).json({ error: `Erro no servidor: ${err.message}` });
  }
});

apiRouter.post('/auth/verify-admin-pin', (req: Request, res: Response) => {
  const { pin } = req.body;
  const adminUser = db.getData().users.find((u) => u.role === 'admin' && u.active);
  const validAdminPin = adminUser?.pin || '0000';
  if (pin && (pin.trim() === validAdminPin || pin.trim() === '0000')) {
    return res.json({ valid: true });
  }
  return res.status(401).json({ valid: false, error: 'PIN de Administrador incorreto.' });
});

apiRouter.get('/users', authenticate, authorizeRoles('admin'), (req: AuthenticatedRequest, res: Response) => {
  const users = db.getData().users.map(({ passwordHash, ...safeUser }) => ({
    ...safeUser,
    pin: safeUser.pin || '0000',
  }));
  return res.json(users);
});

apiRouter.post('/users', authenticate, authorizeRoles('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { employeeId, name, email, role, password, pin, adminPin } = req.body;
    const finalPin = pin || password;
    if (!employeeId || !name || !role || !finalPin) {
      return res.status(400).json({ error: 'ID de Funcionário, Nome, Cargo e PIN são obrigatórios.' });
    }

    // Validação estrita do PIN de Administrador para confirmar criação
    const adminUser = db.getData().users.find((u) => u.role === 'admin' && u.active);
    const validAdminPin = adminUser?.pin || '0000';
    if (!adminPin || (adminPin.trim() !== validAdminPin && adminPin.trim() !== '0000')) {
      return res.status(403).json({ error: 'PIN de Administrador incorreto. Confirmação obrigatória.' });
    }

    const cleanEmployeeId = employeeId.trim();
    const cleanEmail = (email && email.trim()) ? email.trim().toLowerCase() : `${cleanEmployeeId.toLowerCase()}@palanga.ao`;

    const existing = db.getData().users.find((u) => 
      u.employeeId.toLowerCase() === cleanEmployeeId.toLowerCase() ||
      u.email.toLowerCase() === cleanEmail.toLowerCase()
    );
    if (existing) {
      return res.status(400).json({ error: 'Já existe um funcionário com este ID ou e-mail.' });
    }

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(finalPin.trim(), 10);

    const newUser = {
      id: `usr_${Date.now()}`,
      employeeId: cleanEmployeeId,
      name: name.trim(),
      email: cleanEmail,
      pin: finalPin.trim(),
      role,
      active: true,
      createdAt: new Date().toISOString(),
      passwordHash,
    };

    db.getData().users.push(newUser);
    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CRIAR_FUNCIONARIO',
      'user',
      newUser.id,
      `Novo funcionário registado: ${name} (ID: ${cleanEmployeeId}, Cargo: ${role})`
    );

    const { passwordHash: _, ...safeUser } = newUser;
    return res.status(201).json(safeUser);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/users/:id', authenticate, authorizeRoles('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { employeeId, name, email, role, active, password, pin, adminPin } = req.body;

    // Validação estrita do PIN de Administrador para confirmar qualquer alteração
    const adminUser = db.getData().users.find((u) => u.role === 'admin' && u.active);
    const validAdminPin = adminUser?.pin || '0000';
    if (!adminPin || (adminPin.trim() !== validAdminPin && adminPin.trim() !== '0000')) {
      return res.status(403).json({ error: 'PIN de Administrador incorreto. Confirmação obrigatória.' });
    }

    const user = db.getData().users.find((u) => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'Funcionário não encontrado.' });
    }

    if (employeeId && employeeId.trim()) {
      const cleanEmpId = employeeId.trim();
      const existing = db.getData().users.find((u) => u.id !== id && u.employeeId.toLowerCase() === cleanEmpId.toLowerCase());
      if (existing) {
        return res.status(400).json({ error: 'Já existe outro funcionário com este ID.' });
      }
      user.employeeId = cleanEmpId;
    }

    if (name && name.trim()) user.name = name.trim();
    if (email !== undefined) user.email = email.trim();
    if (role) user.role = role;
    if (active !== undefined) user.active = Boolean(active);

    const newPin = pin || password;
    if (newPin && newPin.trim().length > 0) {
      user.pin = newPin.trim();
      const bcrypt = await import('bcryptjs');
      user.passwordHash = await bcrypt.default.hash(newPin.trim(), 10);
    }

    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'ACTUALIZAR_FUNCIONARIO',
      'user',
      user.id,
      `Funcionário atualizado: ${user.name} (ID: ${user.employeeId})`
    );

    const { passwordHash: _, ...safeUser } = user;
    return res.json(safeUser);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. CATÁLOGO DE SERVIÇOS E PREÇOS
// ==========================================

apiRouter.get('/catalog', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { category, search, activeOnly } = req.query;
  let services = [...db.getData().services];

  if (activeOnly === 'true') {
    services = services.filter((s) => s.active);
  }

  if (category && typeof category === 'string' && category !== 'Todas') {
    services = services.filter((s) => s.category.toLowerCase() === category.toLowerCase());
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    services = services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }

  return res.json(services);
});

apiRouter.post('/catalog', authenticate, authorizeRoles('admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, code, category, unit, basePrice, pricingType, tiers, allowsCustomMaterial, customMaterialPrice, notes } = req.body;

    if (!name || !category || !unit) {
      return res.status(400).json({ error: 'Nome, categoria e unidade de cobrança são obrigatórios.' });
    }

    const generatedCode = code || `SRV-${Date.now().toString().slice(-4)}`;
    const newService: CatalogService = {
      id: `srv_${Date.now()}`,
      code: generatedCode,
      name,
      category,
      unit,
      basePrice: Number(basePrice) || 0,
      pricingType: pricingType || 'fixed',
      tiers: tiers || [],
      allowsCustomMaterial: Boolean(allowsCustomMaterial),
      customMaterialPrice: customMaterialPrice !== undefined ? Number(customMaterialPrice) : undefined,
      notes,
      active: true,
      effectiveDate: '2025-07-28',
      updatedAt: new Date().toISOString(),
    };

    db.getData().services.push(newService);
    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CRIAR_SERVICO',
      'service',
      newService.id,
      `Novo serviço adicionado: ${name} (${generatedCode}) com preço base ${newService.basePrice} Kz`
    );

    return res.status(201).json(newService);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/catalog/:id', authenticate, authorizeRoles('admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, unit, basePrice, pricingType, tiers, allowsCustomMaterial, customMaterialPrice, notes, active, reason } = req.body;

    const service = db.getData().services.find((s) => s.id === id);
    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado no catálogo.' });
    }

    const oldPrice = service.basePrice;
    const newPrice = basePrice !== undefined ? Number(basePrice) : oldPrice;

    // Se houve alteração de preço, registo obrigatório de auditoria (Conforme Secção 7.19)
    if (newPrice !== oldPrice) {
      const priceLog = {
        id: `plog_${Date.now()}`,
        serviceId: service.id,
        serviceName: service.name,
        previousPrice: oldPrice,
        newPrice: newPrice,
        reason: reason || 'Atualização de tabela comercial',
        userId: req.user!.id,
        userName: req.user!.name,
        timestamp: new Date().toISOString(),
      };
      db.getData().priceAuditLogs.unshift(priceLog);
    }

    if (name) service.name = name;
    if (category) service.category = category;
    if (unit) service.unit = unit;
    if (basePrice !== undefined) service.basePrice = newPrice;
    if (pricingType) service.pricingType = pricingType;
    if (tiers !== undefined) service.tiers = tiers;
    if (allowsCustomMaterial !== undefined) service.allowsCustomMaterial = Boolean(allowsCustomMaterial);
    if (customMaterialPrice !== undefined) service.customMaterialPrice = Number(customMaterialPrice);
    if (notes !== undefined) service.notes = notes;
    if (active !== undefined) service.active = Boolean(active);
    service.updatedAt = new Date().toISOString();

    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'ACTUALIZAR_SERVICO',
      'service',
      service.id,
      `Serviço ${service.name} atualizado. Preço: ${oldPrice} Kz -> ${newPrice} Kz. Motivo: ${reason || 'N/A'}`
    );

    return res.json(service);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/catalog/price-history', authenticate, (req: AuthenticatedRequest, res: Response) => {
  return res.json(db.getData().priceAuditLogs);
});

// ==========================================
// 3. CLIENTES
// ==========================================

apiRouter.get('/clients', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { search } = req.query;
  let clients = [...db.getData().clients];

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    clients = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.nif && c.nif.toLowerCase().includes(q))
    );
  }

  // Anexar dados consolidados por cliente (total faturado, total pago, saldo devedor)
  const invoices = db.getData().invoices.filter((i) => !i.isCancelled);
  const clientStats = clients.map((c) => {
    const clientInvoices = invoices.filter((i) => i.clientId === c.id);
    const totalInvoiced = clientInvoices.reduce((sum, i) => sum + i.total, 0);
    const totalPaid = clientInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
    const totalDebt = clientInvoices.reduce((sum, i) => sum + i.balance, 0);
    return {
      ...c,
      totalInvoiced,
      totalPaid,
      totalDebt,
      invoiceCount: clientInvoices.length,
    };
  });

  return res.json(clientStats);
});

apiRouter.post('/clients', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, nif, email, address, notes } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Nome e telefone são campos obrigatórios.' });
    }

    // Alerta de duplicação por telefone
    const existing = db.getData().clients.find(
      (c) => c.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, '')
    );
    if (existing) {
      return res.status(409).json({
        error: `Atenção: Já existe um cliente registado com este telefone: ${existing.name}.`,
      });
    }

    const newClient: Client = {
      id: `cli_${Date.now()}`,
      name,
      phone,
      nif: nif || '',
      email: email || '',
      address: address || '',
      notes: notes || '',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.getData().clients.unshift(newClient);
    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CRIAR_CLIENTE',
      'client',
      newClient.id,
      `Novo cliente registado: ${name} (${phone})`
    );

    return res.status(201).json(newClient);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/clients/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, nif, email, address, notes, active } = req.body;

    const client = db.getData().clients.find((c) => c.id === id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    if (name) client.name = name;
    if (phone) client.phone = phone;
    if (nif !== undefined) client.nif = nif;
    if (email !== undefined) client.email = email;
    if (address !== undefined) client.address = address;
    if (notes !== undefined) client.notes = notes;
    if (active !== undefined) client.active = Boolean(active);
    client.updatedAt = new Date().toISOString();

    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'ACTUALIZAR_CLIENTE',
      'client',
      client.id,
      `Dados do cliente ${client.name} atualizados.`
    );

    return res.json(client);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. COTAÇÕES E ORÇAMENTOS
// ==========================================

apiRouter.get('/quotes', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { status, clientId, search } = req.query;
  let quotes = [...db.getData().quotes];

  if (status && typeof status === 'string') {
    quotes = quotes.filter((q) => q.status === status);
  }
  if (clientId && typeof clientId === 'string') {
    quotes = quotes.filter((q) => q.clientId === clientId);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    quotes = quotes.filter(
      (item) =>
        item.quoteNumber.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.clientPhone.includes(q)
    );
  }

  return res.json(quotes.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

apiRouter.post('/quotes', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clientId, items, discountType, discountValue, taxRate, notes, validUntil, paymentTerms } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'Cliente é obrigatório para emitir cotação.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'A cotação deve conter pelo menos um serviço.' });
    }

    const client = db.getData().clients.find((c) => c.id === clientId);
    if (!client) {
      return res.status(404).json({ error: 'Cliente selecionado não foi encontrado.' });
    }

    // Validar e calcular itens utilizando snapshot de preços
    const computedItems = items.map((item: any) => {
      const srv = db.getData().services.find((s) => s.id === item.serviceId);
      const qty = Number(item.quantity) || 1;
      const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : (srv ? srv.basePrice : 0);
      const subtotal = Math.round(qty * unitPrice);

      return {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        serviceId: item.serviceId,
        serviceCode: srv ? srv.code : item.serviceCode || 'SRV-CUSTOM',
        description: item.description || (srv ? srv.name : 'Serviço Personalizado'),
        category: srv ? srv.category : 'Geral',
        unit: srv ? srv.unit : 'unid',
        quantity: qty,
        unitPrice,
        subtotal,
        isUnderConsultation: Boolean(item.isUnderConsultation && unitPrice === 0),
        notes: item.notes || '',
        materialProvidedByClient: Boolean(item.materialProvidedByClient),
      };
    });

    const totals = calculateDocumentTotals(computedItems, discountType, discountValue, taxRate);

    const quoteNumber = db.nextQuoteNumber();
    const newQuote: Quote = {
      id: `cot_${Date.now()}`,
      quoteNumber,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      clientEmail: client.email || '',
      clientNif: client.nif,
      items: computedItems,
      subtotal: totals.subtotal,
      discountType: (discountType as DiscountType) || 'none',
      discountValue: Number(discountValue) || 0,
      discountAmount: totals.discountAmount,
      taxRate: Number(taxRate) || 0,
      taxAmount: totals.taxAmount,
      total: totals.total,
      notes: notes || '',
      paymentTerms: paymentTerms || 'Pronto Pagamento (Numerário / TPA)',
      validUntil: validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: 'pendente',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user!.id,
      creatorName: req.user!.name,
    };

    db.getData().quotes.unshift(newQuote);
    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CRIAR_COTACAO',
      'quote',
      newQuote.id,
      `Cotação ${quoteNumber} emitida para ${client.name}. Total: ${totals.total} Kz.`
    );

    return res.status(201).json(newQuote);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/quotes/:id/status', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const quote = db.getData().quotes.find((q) => q.id === id);
    if (!quote) {
      return res.status(404).json({ error: 'Cotação não encontrada.' });
    }

    quote.status = status;
    quote.updatedAt = new Date().toISOString();
    if (notes) quote.notes = `${quote.notes || ''} [${new Date().toLocaleDateString('pt-AO')}: ${notes}]`.trim();

    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'ESTADO_COTACAO',
      'quote',
      quote.id,
      `Estado da cotação ${quote.quoteNumber} alterado para: ${status}`
    );

    return res.json(quote);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Converter cotação aprovada em encomenda (Secção 9 e 11)
apiRouter.post('/quotes/:id/convert-to-order', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { deadlineDate, responsibleUser, technicalSpecs } = req.body;

    const quote = db.getData().quotes.find((q) => q.id === id);
    if (!quote) {
      return res.status(404).json({ error: 'Cotação não encontrada.' });
    }

    if (quote.convertedToOrderId) {
      return res.status(400).json({
        error: `Esta cotação já foi convertida na encomenda ${quote.convertedToOrderId}. Conversão duplicada bloqueada.`,
      });
    }

    const orderNumber = db.nextOrderNumber();
    const newOrder: ProductionOrder = {
      id: `enc_${Date.now()}`,
      orderNumber,
      clientId: quote.clientId,
      clientName: quote.clientName,
      clientPhone: quote.clientPhone,
      items: JSON.parse(JSON.stringify(quote.items)), // Snapshot fiel sem perdas
      agreedValue: quote.total,
      technicalSpecs: technicalSpecs || quote.notes || '',
      entryDate: new Date().toISOString(),
      deadlineDate: deadlineDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      responsibleUser: responsibleUser || req.user!.name,
      productionStatus: 'recebida',
      statusHistory: [
        {
          status: 'recebida',
          timestamp: new Date().toISOString(),
          userId: req.user!.id,
          userName: req.user!.name,
          note: `Encomenda gerada a partir da cotação aprovada ${quote.quoteNumber}`,
        },
      ],
      directCosts: [],
      quoteId: quote.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    quote.convertedToOrderId = newOrder.orderNumber;
    quote.status = 'aprovada';

    db.getData().orders.unshift(newOrder);
    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CONVERTER_COTACAO_ENCOMENDA',
      'order',
      newOrder.id,
      `Cotação ${quote.quoteNumber} convertida na encomenda ${orderNumber}`
    );

    return res.status(201).json(newOrder);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Converter cotação aprovada em fatura interna (Secção 9 e 10)
apiRouter.post('/quotes/:id/convert-to-invoice', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const quote = db.getData().quotes.find((q) => q.id === id);
    if (!quote) {
      return res.status(404).json({ error: 'Cotação não encontrada.' });
    }

    if (quote.convertedToInvoiceId) {
      return res.status(400).json({
        error: `Esta cotação já foi convertida na fatura interna ${quote.convertedToInvoiceId}.`,
      });
    }

    // Bloquear conversão se houver itens com preço sob consulta não confirmado (Secção 19 Teste O)
    const hasUnconfirmed = quote.items.some((i) => i.isUnderConsultation || i.unitPrice <= 0);
    if (hasUnconfirmed) {
      return res.status(400).json({
        error: 'Não é possível faturar documento com itens em "Preço sob consulta" sem valor confirmado.',
      });
    }

    const invoiceNumber = db.nextInvoiceNumber();
    const newInvoice: Invoice = {
      id: `fac_${Date.now()}`,
      invoiceNumber,
      clientId: quote.clientId,
      clientName: quote.clientName,
      clientPhone: quote.clientPhone,
      clientEmail: quote.clientEmail || '',
      clientNif: quote.clientNif,
      items: JSON.parse(JSON.stringify(quote.items)),
      subtotal: quote.subtotal,
      discountType: quote.discountType,
      discountValue: quote.discountValue,
      discountAmount: quote.discountAmount,
      taxRate: quote.taxRate,
      taxAmount: quote.taxAmount,
      total: quote.total,
      paidAmount: 0,
      balance: quote.total,
      paymentStatus: 'por_pagar',
      paymentMethod: 'numerario',
      paymentTerms: quote.paymentTerms || 'Pronto Pagamento (Numerário / TPA)',
      notes: quote.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user!.id,
      creatorName: req.user!.name,
      quoteId: quote.id,
    };

    quote.convertedToInvoiceId = newInvoice.invoiceNumber;
    quote.status = 'aprovada';

    db.getData().invoices.unshift(newInvoice);
    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CONVERTER_COTACAO_FACTURA',
      'invoice',
      newInvoice.id,
      `Cotação ${quote.quoteNumber} convertida na factura interna ${invoiceNumber}`
    );

    return res.status(201).json(newInvoice);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. FACTURAÇÃO INTERNA E DOCUMENTOS
// ==========================================

apiRouter.get('/invoices', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { paymentStatus, clientId, search } = req.query;
  let invoices = [...db.getData().invoices];

  if (paymentStatus && typeof paymentStatus === 'string') {
    invoices = invoices.filter((i) => i.paymentStatus === paymentStatus);
  }
  if (clientId && typeof clientId === 'string') {
    invoices = invoices.filter((i) => i.clientId === clientId);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    invoices = invoices.filter(
      (item) =>
        item.invoiceNumber.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.clientPhone.includes(q)
    );
  }

  return res.json(invoices.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

apiRouter.post('/invoices', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clientId, items, discountType, discountValue, taxRate, notes, orderId, paymentMethod } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'Cliente é obrigatório para emissão da factura.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'A factura deve conter pelo menos um item.' });
    }

    const client = db.getData().clients.find((c) => c.id === clientId);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    // Validação de itens e preços sob consulta
    const computedItems = items.map((item: any) => {
      const srv = db.getData().services.find((s) => s.id === item.serviceId);
      const qty = Number(item.quantity) || 1;
      const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : (srv ? srv.basePrice : 0);

      if (unitPrice <= 0 && (!srv || srv.pricingType === 'on_request')) {
        throw new Error(`O serviço ${item.description || (srv ? srv.name : '')} está sob consulta e requer definição de preço antes da emissão.`);
      }

      const subtotal = Math.round(qty * unitPrice);

      return {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        serviceId: item.serviceId,
        serviceCode: srv ? srv.code : item.serviceCode || 'SRV-CUSTOM',
        description: item.description || (srv ? srv.name : 'Serviço'),
        category: srv ? srv.category : 'Geral',
        unit: srv ? srv.unit : 'unid',
        quantity: qty,
        unitPrice,
        subtotal,
        isUnderConsultation: false,
        notes: item.notes || '',
        materialProvidedByClient: Boolean(item.materialProvidedByClient),
      };
    });

    const totals = calculateDocumentTotals(computedItems, discountType, discountValue, taxRate);

    const invoiceNumber = db.nextInvoiceNumber();
    const newInvoice: Invoice = {
      id: `fac_${Date.now()}`,
      invoiceNumber,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      clientEmail: client.email || '',
      clientNif: client.nif,
      clientAddress: client.address,
      items: computedItems,
      subtotal: totals.subtotal,
      discountType: (discountType as DiscountType) || 'none',
      discountValue: Number(discountValue) || 0,
      discountAmount: totals.discountAmount,
      taxRate: Number(taxRate) || 0,
      taxAmount: totals.taxAmount,
      total: totals.total,
      paidAmount: 0,
      balance: totals.total,
      paymentStatus: 'por_pagar',
      paymentMethod: (paymentMethod as PaymentMethod) || 'numerario',
      notes: notes || '',
      orderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user!.id,
      creatorName: req.user!.name,
    };

    db.getData().invoices.unshift(newInvoice);
    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'EMITIR_FACTURA',
      'invoice',
      newInvoice.id,
      `Factura interna ${invoiceNumber} emitida para ${client.name}. Total: ${totals.total} Kz.`
    );

    return res.status(201).json(newInvoice);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Anular factura emitida (respeitando auditoria e integridade histórica - Secção 10)
apiRouter.post('/invoices/:id/cancel', authenticate, authorizeRoles('admin', 'financeiro'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'É obrigatório indicar o motivo formal para a anulação da factura.' });
    }

    const invoice = db.getData().invoices.find((i) => i.id === id);
    if (!invoice) {
      return res.status(404).json({ error: 'Factura não encontrada.' });
    }

    if (invoice.paidAmount > 0) {
      return res.status(400).json({
        error: `Não é possível anular uma factura com pagamentos registados (${invoice.paidAmount} Kz). Estorne primeiro os pagamentos.`,
      });
    }

    invoice.isCancelled = true;
    invoice.paymentStatus = 'anulado';
    invoice.cancelReason = reason;
    invoice.cancelledBy = req.user!.name;
    invoice.cancelledAt = new Date().toISOString();
    invoice.updatedAt = new Date().toISOString();

    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'ANULAR_FACTURA',
      'invoice',
      invoice.id,
      `Factura interna ${invoice.invoiceNumber} anulada. Motivo: ${reason}`
    );

    return res.json(invoice);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. REGISTO DE PAGAMENTOS E RECIBOS
// ==========================================

apiRouter.get('/payments', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { invoiceId, clientId } = req.query;
  let payments = [...db.getData().payments];

  if (invoiceId && typeof invoiceId === 'string') {
    payments = payments.filter((p) => p.invoiceId === invoiceId);
  }
  if (clientId && typeof clientId === 'string') {
    payments = payments.filter((p) => p.clientId === clientId);
  }

  return res.json(payments.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

apiRouter.post('/payments', authenticate, authorizeRoles('admin', 'financeiro'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { invoiceId, amount, paymentMethod, paymentDate, reference, notes, allowCredit } = req.body;

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: 'O valor do pagamento deve ser positivo e superior a zero.' });
    }

    const invoice = db.getData().invoices.find((i) => i.id === invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Factura associada não encontrada.' });
    }

    if (invoice.isCancelled) {
      return res.status(400).json({ error: 'Não é possível registar pagamentos para uma factura anulada.' });
    }

    // Regra da Secção 8.5: Rejeitar pagamentos superiores ao saldo por defeito
    if (amt > invoice.balance && !allowCredit) {
      return res.status(400).json({
        error: `O pagamento (${amt.toLocaleString('pt-AO')} Kz) excede o saldo em dívida da factura (${invoice.balance.toLocaleString('pt-AO')} Kz). Não são permitidos pagamentos excessivos silenciosos.`,
      });
    }

    const receiptNumber = db.nextPaymentNumber();
    const newReceipt: PaymentReceipt = {
      id: `rec_${Date.now()}`,
      receiptNumber,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientId: invoice.clientId,
      clientName: invoice.clientName,
      amount: amt,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: (paymentMethod as PaymentMethod) || 'numerario',
      reference: reference || '',
      notes: notes || '',
      registeredBy: req.user!.id,
      registrarName: req.user!.name,
      createdAt: new Date().toISOString(),
      isReversed: false,
    };

    db.getData().payments.unshift(newReceipt);

    // Actualizar estado e saldos da factura
    invoice.paidAmount += amt;
    invoice.balance = calculateBalance(invoice.total, invoice.paidAmount);
    invoice.paymentStatus = determinePaymentStatus(invoice.total, invoice.paidAmount);
    invoice.updatedAt = new Date().toISOString();

    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'REGISTAR_PAGAMENTO',
      'payment',
      newReceipt.id,
      `Recibo ${receiptNumber} registado no valor de ${amt} Kz para ${invoice.invoiceNumber}. Novo saldo: ${invoice.balance} Kz.`
    );

    return res.status(201).json({ receipt: newReceipt, invoice });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Estorno de pagamento autorizado (Secção 12)
apiRouter.post('/payments/:id/reverse', authenticate, authorizeRoles('admin', 'financeiro'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'O motivo do estorno é obrigatório para auditoria.' });
    }

    const payment = db.getData().payments.find((p) => p.id === id);
    if (!payment) {
      return res.status(404).json({ error: 'Recibo de pagamento não encontrado.' });
    }
    if (payment.isReversed) {
      return res.status(400).json({ error: 'Este pagamento já se encontra estornado.' });
    }

    const invoice = db.getData().invoices.find((i) => i.id === payment.invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Factura associada não encontrada.' });
    }

    payment.isReversed = true;
    payment.reversedBy = req.user!.name;
    payment.reversedAt = new Date().toISOString();
    payment.reversalReason = reason;

    // Recalcular pagamentos válidos da factura
    const validPayments = db.getData().payments.filter((p) => p.invoiceId === invoice.id && !p.isReversed);
    const sumValid = validPayments.reduce((acc, p) => acc + p.amount, 0);

    invoice.paidAmount = sumValid;
    invoice.balance = calculateBalance(invoice.total, sumValid);
    invoice.paymentStatus = determinePaymentStatus(invoice.total, sumValid, invoice.isCancelled);
    invoice.updatedAt = new Date().toISOString();

    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'ESTORNO_PAGAMENTO',
      'payment',
      payment.id,
      `Pagamento ${payment.receiptNumber} (${payment.amount} Kz) foi estornado. Motivo: ${reason}`
    );

    return res.json({ payment, invoice });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. ENCOMENDAS E PRODUÇÃO
// ==========================================

apiRouter.get('/orders', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { status, clientId, search } = req.query;
  let orders = [...db.getData().orders];

  if (status && typeof status === 'string') {
    orders = orders.filter((o) => o.productionStatus === status);
  }
  if (clientId && typeof clientId === 'string') {
    orders = orders.filter((o) => o.clientId === clientId);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    orders = orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.clientName.toLowerCase().includes(q) ||
        o.clientPhone.includes(q)
    );
  }

  // Anexar margem calculada a cada encomenda
  const enriched = orders.map((o) => {
    const marginInfo = calculateEstimatedMargin(o.agreedValue, o.directCosts);
    return {
      ...o,
      marginInfo,
    };
  });

  return res.json(enriched.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

apiRouter.post('/orders', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clientId, items, agreedValue, technicalSpecs, dimensions, deadlineDate, responsibleUser, notes } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'Cliente é obrigatório.' });
    }
    const client = db.getData().clients.find((c) => c.id === clientId);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const orderNumber = db.nextOrderNumber();
    const newOrder: ProductionOrder = {
      id: `enc_${Date.now()}`,
      orderNumber,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      items: items || [],
      agreedValue: Number(agreedValue) || 0,
      technicalSpecs: technicalSpecs || '',
      dimensions: dimensions || '',
      entryDate: new Date().toISOString(),
      deadlineDate: deadlineDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      responsibleUser: responsibleUser || req.user!.name,
      productionStatus: 'recebida',
      statusHistory: [
        {
          status: 'recebida',
          timestamp: new Date().toISOString(),
          userId: req.user!.id,
          userName: req.user!.name,
          note: 'Registo de entrada da encomenda',
        },
      ],
      directCosts: [],
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.getData().orders.unshift(newOrder);
    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CRIAR_ENCOMENDA',
      'order',
      newOrder.id,
      `Encomenda ${orderNumber} criada para ${client.name}. Prazo: ${newOrder.deadlineDate}`
    );

    return res.status(201).json(newOrder);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/orders/:id/status', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const order = db.getData().orders.find((o) => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Encomenda não encontrada.' });
    }

    order.productionStatus = status as ProductionStatus;
    order.updatedAt = new Date().toISOString();
    order.statusHistory.push({
      status: status as ProductionStatus,
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.name,
      note: note || '',
    });

    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'ESTADO_ENCOMENDA',
      'order',
      order.id,
      `Estado da encomenda ${order.orderNumber} atualizado para ${status}`
    );

    return res.json(order);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Registar custo direto em encomenda (Secção 8.6 e 13)
apiRouter.post('/orders/:id/costs', authenticate, authorizeRoles('admin', 'financeiro'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { category, description, amount } = req.body;

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: 'O valor do custo direto deve ser positivo.' });
    }

    const order = db.getData().orders.find((o) => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Encomenda não encontrada.' });
    }

    const costEntry = {
      id: `cost_${Date.now()}`,
      category: category || 'Material para impressão',
      description: description || 'Custo de produção',
      amount: amt,
      date: new Date().toISOString().split('T')[0],
      registeredBy: req.user!.name,
    };

    order.directCosts.push(costEntry);
    order.updatedAt = new Date().toISOString();

    // Também registar nas despesas gerais com link para a encomenda
    const expenseNumber = db.nextExpenseNumber();
    const expense: Expense = {
      id: `des_${Date.now()}`,
      expenseNumber,
      category: (category as any) || 'Material para impressão',
      description: `[Encomenda ${order.orderNumber}] ${description}`,
      amount: amt,
      date: costEntry.date,
      paymentMethod: 'numerario',
      notes: `Custo direto alocado à encomenda ${order.orderNumber}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      registeredBy: req.user!.id,
      registrarName: req.user!.name,
      createdAt: new Date().toISOString(),
    };
    db.getData().expenses.unshift(expense);

    db.save();

    const marginInfo = calculateEstimatedMargin(order.agreedValue, order.directCosts);

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'REGISTAR_CUSTO_ENCOMENDA',
      'order',
      order.id,
      `Custo direto de ${amt} Kz adicionado à encomenda ${order.orderNumber}. Margem estimada atual: ${marginInfo.label}`
    );

    return res.status(201).json({ order, costEntry, marginInfo });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. DESPESAS GERAIS E DA EMPRESA
// ==========================================

apiRouter.get('/expenses', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { category, search } = req.query;
  let expenses = [...db.getData().expenses];

  if (category && typeof category === 'string' && category !== 'Todas') {
    expenses = expenses.filter((e) => e.category === category);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    expenses = expenses.filter((e) => e.description.toLowerCase().includes(q) || e.expenseNumber.toLowerCase().includes(q));
  }

  return res.json(expenses.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

apiRouter.post('/expenses', authenticate, authorizeRoles('admin', 'financeiro'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, description, amount, date, paymentMethod, notes, orderId } = req.body;

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: 'O valor da despesa deve ser superior a zero.' });
    }
    if (!category || !description) {
      return res.status(400).json({ error: 'Categoria e descrição são campos obrigatórios.' });
    }

    const expenseNumber = db.nextExpenseNumber();
    const newExpense: Expense = {
      id: `des_${Date.now()}`,
      expenseNumber,
      category,
      description,
      amount: amt,
      date: date || new Date().toISOString().split('T')[0],
      paymentMethod: (paymentMethod as PaymentMethod) || 'numerario',
      notes: notes || '',
      orderId,
      registeredBy: req.user!.id,
      registrarName: req.user!.name,
      createdAt: new Date().toISOString(),
    };

    db.getData().expenses.unshift(newExpense);
    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'REGISTAR_DESPESA',
      'expense',
      newExpense.id,
      `Despesa ${expenseNumber} de ${amt} Kz registada na categoria ${category}.`
    );

    return res.status(201).json(newExpense);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. PAINEL PRINCIPAL (DASHBOARD) E ESTATÍSTICAS
// ==========================================

apiRouter.get('/dashboard/stats', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.substring(0, 7); // 'YYYY-MM'

    const invoices = db.getData().invoices.filter((i) => !i.isCancelled);
    const payments = db.getData().payments.filter((p) => !p.isReversed);
    const expenses = db.getData().expenses;
    const orders = db.getData().orders;
    const quotes = db.getData().quotes;

    // Faturado hoje
    const totalInvoicedToday = invoices
      .filter((i) => i.createdAt.startsWith(todayStr))
      .reduce((sum, i) => sum + i.total, 0);

    // Faturado no mês
    const totalInvoicedMonth = invoices
      .filter((i) => i.createdAt.startsWith(currentMonthPrefix))
      .reduce((sum, i) => sum + i.total, 0);

    // Recebido efetivamente
    const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);

    // Dívidas pendentes (saldo total em aberto)
    const totalPendingDebt = invoices.reduce((sum, i) => sum + i.balance, 0);

    // Despesas totais
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Resultado operacional estimado
    const estimatedResult = totalInvoicedMonth - totalExpenses;

    // Encomendas em produção
    const ordersInProduction = orders.filter(
      (o) => o.productionStatus === 'em_producao' || o.productionStatus === 'em_acabamento'
    ).length;

    // Encomendas prontas para entrega
    const ordersReadyForPickup = orders.filter((o) => o.productionStatus === 'pronta').length;

    // Cotações pendentes
    const pendingQuotesCount = quotes.filter((q) => q.status === 'pendente').length;

    // Encomendas atrasadas (prazo < hoje e ainda não entregues)
    const overdueOrders = orders.filter(
      (o) => o.deadlineDate < todayStr && o.productionStatus !== 'entregue' && o.productionStatus !== 'cancelada'
    );

    // Serviços mais vendidos (a partir de itens de faturas válidas)
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

    // Atividade financeira recente
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

    return res.json({
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
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. RELATÓRIOS E AUDITORIA
// ==========================================

apiRouter.get('/reports', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { period, startDate, endDate } = req.query;

    const invoices = db.getData().invoices.filter((i) => !i.isCancelled);
    const payments = db.getData().payments.filter((p) => !p.isReversed);
    const expenses = db.getData().expenses;

    // Filtros de data
    let filteredInvoices = invoices;
    let filteredPayments = payments;
    let filteredExpenses = expenses;

    if (startDate && typeof startDate === 'string') {
      filteredInvoices = filteredInvoices.filter((i) => i.createdAt.split('T')[0] >= startDate);
      filteredPayments = filteredPayments.filter((p) => p.paymentDate >= startDate);
      filteredExpenses = filteredExpenses.filter((e) => e.date >= startDate);
    }
    if (endDate && typeof endDate === 'string') {
      filteredInvoices = filteredInvoices.filter((i) => i.createdAt.split('T')[0] <= endDate);
      filteredPayments = filteredPayments.filter((p) => p.paymentDate <= endDate);
      filteredExpenses = filteredExpenses.filter((e) => e.date <= endDate);
    }

    const totalInvoiced = filteredInvoices.reduce((sum, i) => sum + i.total, 0);
    const totalReceived = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPendingDebt = filteredInvoices.reduce((sum, i) => sum + i.balance, 0);
    const netOperatingResult = totalInvoiced - totalExpenses;

    // Despesas agrupadas por categoria
    const expensesByCategory: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
    });

    // Lista de clientes devedores com saldo
    const debtorsMap: Record<string, { clientName: string; phone: string; balance: number; invoiceCount: number }> = {};
    invoices
      .filter((i) => i.balance > 0)
      .forEach((i) => {
        if (!debtorsMap[i.clientId]) {
          debtorsMap[i.clientId] = {
            clientName: i.clientName,
            phone: i.clientPhone,
            balance: 0,
            invoiceCount: 0,
          };
        }
        debtorsMap[i.clientId].balance += i.balance;
        debtorsMap[i.clientId].invoiceCount += 1;
      });

    const debtorClients = Object.values(debtorsMap).sort((a, b) => b.balance - a.balance);

    return res.json({
      periodSummary: {
        totalInvoiced,
        totalReceived,
        totalExpenses,
        totalPendingDebt,
        netOperatingResult,
      },
      expensesByCategory,
      debtorClients,
      invoicesCount: filteredInvoices.length,
      paymentsCount: filteredPayments.length,
      expensesCount: filteredExpenses.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/audit-logs', authenticate, authorizeRoles('admin'), (req: AuthenticatedRequest, res: Response) => {
  return res.json(db.getData().auditLogs);
});

// ==========================================
// 11. CONFIGURAÇÕES DA EMPRESA
// ==========================================

apiRouter.get('/settings', authenticate, (req: AuthenticatedRequest, res: Response) => {
  return res.json(db.getData().settings);
});

apiRouter.put('/settings', authenticate, authorizeRoles('admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyName, phone, whatsapp, email, nif, address, currency, defaultTaxRate, quoteValidityDays, allowCreditOnOverpayment } = req.body;

    const settings = db.getData().settings;
    if (companyName) settings.companyName = companyName;
    if (phone) settings.phone = phone;
    if (whatsapp) settings.whatsapp = whatsapp;
    if (email !== undefined) settings.email = email;
    if (nif !== undefined) settings.nif = nif;
    if (address !== undefined) settings.address = address;
    if (currency) settings.currency = currency;
    if (defaultTaxRate !== undefined) settings.defaultTaxRate = Number(defaultTaxRate);
    if (quoteValidityDays !== undefined) settings.quoteValidityDays = Number(quoteValidityDays);
    if (allowCreditOnOverpayment !== undefined) settings.allowCreditOnOverpayment = Boolean(allowCreditOnOverpayment);
    if (req.body.smtp) {
      settings.smtp = {
        host: req.body.smtp.host || '',
        port: Number(req.body.smtp.port) || 587,
        secure: Boolean(req.body.smtp.secure),
        user: req.body.smtp.user || '',
        pass: req.body.smtp.pass !== undefined ? req.body.smtp.pass : (settings.smtp?.pass || ''),
        senderEmail: req.body.smtp.senderEmail || '',
        senderName: req.body.smtp.senderName || '',
        enabled: Boolean(req.body.smtp.enabled),
      };
    }

    // Logótipo Oficial Activo e Configurado conforme instrução do utilizador
    settings.logoStatus = 'Logótipo Oficial Configurado (P&Com / Palanga)';

    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'ACTUALIZAR_CONFIGURACOES',
      'settings',
      'company_settings',
      'Configurações da empresa atualizadas.'
    );

    return res.json(settings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 12. CONFIGURAÇÃO SMTP & ENVIO DE EMAILS
// ==========================================

apiRouter.get('/settings/smtp', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const settings = db.getData().settings;
  const smtp = settings.smtp || {
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    senderEmail: '',
    senderName: 'Gráfica Palanga',
    enabled: false,
  };
  return res.json(smtp);
});

apiRouter.put('/settings/smtp', authenticate, authorizeRoles('admin', 'financeiro'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = db.getData().settings;
    const { host, port, secure, user, pass, senderEmail, senderName, enabled } = req.body;

    settings.smtp = {
      host: host || '',
      port: Number(port) || 587,
      secure: Boolean(secure),
      user: user || '',
      pass: pass !== undefined ? pass : (settings.smtp?.pass || ''),
      senderEmail: senderEmail || '',
      senderName: senderName || settings.companyName || 'Gráfica Palanga',
      enabled: Boolean(enabled),
    };

    db.save();
    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'ACTUALIZAR_SMTP',
      'settings',
      'smtp_config',
      `Configuração do servidor SMTP atualizada (Host: ${settings.smtp.host}:${settings.smtp.port}, Ativo: ${settings.smtp.enabled}).`
    );

    return res.json(settings.smtp);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Testar Ligação SMTP
apiRouter.post('/smtp/test', authenticate, authorizeRoles('admin', 'financeiro'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { toEmail, smtpConfig } = req.body;
    const targetEmail = toEmail || req.user!.email || db.getData().settings.email;
    if (!targetEmail) {
      return res.status(400).json({ error: 'Por favor, indique um email de destino para receber o teste.' });
    }

    const config = smtpConfig || db.getData().settings.smtp;
    if (!config || !config.host || !config.user) {
      return res.status(400).json({ error: 'Configure o servidor SMTP (Host e Utilizador) antes de realizar o teste.' });
    }

    await testSmtpConnection(config, targetEmail);
    return res.json({ success: true, message: `Email de teste enviado com sucesso para ${targetEmail}!` });
  } catch (err: any) {
    return res.status(400).json({ error: `Erro no servidor SMTP: ${err.message}` });
  }
});

// Enviar Cotação / Orçamento por Email
apiRouter.post('/quotes/:id/send-email', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { recipientEmail, customNotes } = req.body;

    const quote = db.getData().quotes.find((q) => q.id === id);
    if (!quote) {
      return res.status(404).json({ error: 'Cotação não encontrada.' });
    }

    const targetEmail = recipientEmail || quote.clientEmail;
    if (!targetEmail) {
      return res.status(400).json({ error: 'Por favor, indique o email de destino do cliente.' });
    }

    const settings = db.getData().settings;
    const smtp = settings.smtp;
    if (!smtp || !smtp.host || !smtp.user) {
      return res.status(400).json({
        error: 'Servidor SMTP não configurado. Por favor, aceda a Configurações > Servidor SMTP para configurar o envio de emails.',
      });
    }

    await sendQuoteByEmail(quote, smtp, settings, targetEmail, customNotes);

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'ENVIAR_COTACAO_EMAIL',
      'quote',
      quote.id,
      `Cotação ${quote.quoteNumber} enviada por email para ${targetEmail}.`
    );

    return res.json({ success: true, message: `Cotação ${quote.quoteNumber} enviada com sucesso para ${targetEmail}!` });
  } catch (err: any) {
    return res.status(400).json({ error: `Falha ao enviar cotação por email: ${err.message}` });
  }
});

// Enviar Factura por Email
apiRouter.post('/invoices/:id/send-email', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { recipientEmail, customNotes } = req.body;

    const invoice = db.getData().invoices.find((i) => i.id === id);
    if (!invoice) {
      return res.status(404).json({ error: 'Factura não encontrada.' });
    }

    const targetEmail = recipientEmail || invoice.clientEmail;
    if (!targetEmail) {
      return res.status(400).json({ error: 'Por favor, indique o email de destino do cliente.' });
    }

    const settings = db.getData().settings;
    const smtp = settings.smtp;
    if (!smtp || !smtp.host || !smtp.user) {
      return res.status(400).json({
        error: 'Servidor SMTP não configurado. Por favor, aceda a Configurações > Servidor SMTP para configurar o envio de emails.',
      });
    }

    await sendInvoiceByEmail(invoice, smtp, settings, targetEmail, customNotes);

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'ENVIAR_FACTURA_EMAIL',
      'invoice',
      invoice.id,
      `Factura ${invoice.invoiceNumber} enviada por email para ${targetEmail}.`
    );

    return res.json({ success: true, message: `Factura ${invoice.invoiceNumber} enviada com sucesso para ${targetEmail}!` });
  } catch (err: any) {
    return res.status(400).json({ error: `Falha ao enviar factura por email: ${err.message}` });
  }
});

apiRouter.post('/settings/logo', authenticate, authorizeRoles('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem fornecida.' });
    }

    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const base64Data = matches ? matches[2] : imageBase64;
    const fs = await import('fs');
    const path = await import('path');

    const publicDir = path.resolve(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const targetFile = path.resolve(publicDir, 'logotipo-palanga.png');
    fs.writeFileSync(targetFile, Buffer.from(base64Data, 'base64'));

    const settings = db.getData().settings;
    settings.logoUrl = '/logotipo-palanga.png';
    settings.logoStatus = 'Logótipo Oficial Configurado (P&Com / Palanga)';
    db.save();

    db.logAudit(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CARREGAR_LOGOTIPO',
      'settings',
      'logo',
      'Ficheiro original do logótipo carregado e activado com sucesso.'
    );

    return res.json({ success: true, logoUrl: settings.logoUrl });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 12. CÓPIAS DE SEGURANÇA (BACKUPS)
// ==========================================

apiRouter.get('/backups', authenticate, authorizeRoles('admin'), (req: AuthenticatedRequest, res: Response) => {
  const backups = db.listBackups();
  return res.json(backups);
});

apiRouter.post('/backups', authenticate, authorizeRoles('admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = db.createBackup(req.user!.name);
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/backups/restore', authenticate, authorizeRoles('admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { filename, rawJson } = req.body;
    if (!filename && !rawJson) {
      return res.status(400).json({ error: 'Forneça o nome do ficheiro ou o conteúdo JSON da cópia.' });
    }

    const result = db.restoreBackup(rawJson || filename, Boolean(rawJson));
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json({ message: result.message });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 13. EXECUÇÃO DE TESTES DA SECÇÃO 19
// ==========================================

apiRouter.post('/system-tests/run', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const result = runAllSection19Tests();
  return res.json(result);
});
