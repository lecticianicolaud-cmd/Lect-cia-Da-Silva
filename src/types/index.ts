/**
 * Gráfica Palanga — Tipos e Modelos de Dados
 */

export type UserRole = 'admin' | 'operador' | 'financeiro';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  pin?: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface UserAuthSession {
  user: User;
  token: string;
}

export type PricingType = 'fixed' | 'tiers' | 'on_request';

export interface QuantityTier {
  min: number;
  max: number | null; // null represents infinity/more
  pricePerUnit: number;
  label: string;
}

export interface CatalogService {
  id: string;
  code: string;
  name: string;
  category: string;
  subcategory?: string;
  unit: string; // 'unid', 'página', 'lado', 'metro', 'folha', 'trabalho', etc.
  basePrice: number; // 0 if on_request
  pricingType: PricingType;
  tiers?: QuantityTier[];
  allowsCustomMaterial?: boolean;
  customMaterialPrice?: number;
  requiresConfirmation?: boolean; // For complex DTF or on_request
  notes?: string;
  active: boolean;
  effectiveDate: string; // '2025-07-28'
  updatedAt: string;
  stockQuantity?: number; // Quantidade atual em armazém/stock
  minStockThreshold?: number; // Nível mínimo definido para alerta de inventário
  trackStock?: boolean; // Se o item possui controlo de stock activo
}

export interface LowStockAlertItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  stockQuantity: number;
  minStockThreshold: number;
  isCritical: boolean;
}

export interface PriceAuditLog {
  id: string;
  serviceId: string;
  serviceName: string;
  previousPrice: number;
  newPrice: number;
  reason: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface Client {
  id: string;
  name: string;
  nif?: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemSnapshot {
  id: string;
  serviceId: string;
  serviceCode: string;
  description: string;
  category: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  isCustomPrice?: boolean;
  isUnderConsultation?: boolean;
  notes?: string;
  materialProvidedByClient?: boolean;
  extraComplexity?: boolean;
}

export type DiscountType = 'none' | 'percentage' | 'fixed';

export type QuoteStatus = 'rascunho' | 'pendente' | 'aprovada' | 'recusada' | 'expirada';

export interface Quote {
  id: string;
  quoteNumber: string; // e.g. COT-2025-0001
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientNif?: string;
  items: OrderItemSnapshot[];
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxRate: number; // default 0
  taxAmount: number; // default 0
  total: number;
  notes?: string;
  paymentTerms?: string;
  validUntil: string;
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  creatorName: string;
  convertedToOrderId?: string;
  convertedToInvoiceId?: string;
}

export type PaymentStatus = 'por_pagar' | 'parcialmente_pago' | 'pago' | 'anulado';

export type PaymentMethod = 'numerario' | 'transferencia' | 'multicaixa' | 'credito' | 'outro';

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. FAC-2025-0001
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientNif?: string;
  clientAddress?: string;
  items: OrderItemSnapshot[];
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  balance: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentTerms?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  creatorName: string;
  quoteId?: string;
  orderId?: string;
  isCancelled?: boolean;
  cancelReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
}

export interface PaymentReceipt {
  id: string;
  receiptNumber: string; // e.g. REC-2025-0001
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  registeredBy: string;
  registrarName: string;
  createdAt: string;
  isReversed?: boolean;
  reversedBy?: string;
  reversedAt?: string;
  reversalReason?: string;
}

export type ProductionStatus =
  | 'recebida'
  | 'aguardando_aprovacao'
  | 'aguardando_sinal'
  | 'em_producao'
  | 'em_acabamento'
  | 'pronta'
  | 'entregue'
  | 'cancelada';

export interface OrderCost {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  registeredBy: string;
}

export interface ProductionOrder {
  id: string;
  orderNumber: string; // e.g. ENC-2025-0001
  clientId: string;
  clientName: string;
  clientPhone: string;
  items: OrderItemSnapshot[];
  agreedValue: number;
  technicalSpecs?: string;
  dimensions?: string;
  entryDate: string;
  deadlineDate: string;
  responsibleUser: string;
  productionStatus: ProductionStatus;
  statusHistory: Array<{
    status: ProductionStatus;
    timestamp: string;
    userId: string;
    userName: string;
    note?: string;
  }>;
  directCosts: OrderCost[];
  notes?: string;
  quoteId?: string;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseCategory =
  | 'Papel'
  | 'Tintas'
  | 'Consumíveis'
  | 'Material para impressão'
  | 'Acabamentos'
  | 'Transporte'
  | 'Energia'
  | 'Internet'
  | 'Manutenção de equipamentos'
  | 'Outras despesas';

export interface Expense {
  id: string;
  expenseNumber: string; // e.g. DES-2025-0001
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  orderId?: string; // If associated to a specific order
  orderNumber?: string;
  registeredBy: string;
  registrarName: string;
  createdAt: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  senderEmail: string;
  senderName: string;
  enabled: boolean;
}

export interface CompanySettings {
  companyName: string;
  phone: string;
  whatsapp: string;
  email: string;
  nif: string;
  address: string;
  currency: string;
  priceTableEffectiveDate: string;
  defaultTaxRate: number; // 0 by default
  quoteValidityDays: number;
  allowCreditOnOverpayment: boolean;
  logoStatus: string;
  logoUrl?: string;
  smtp?: SmtpConfig;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: 'service' | 'client' | 'quote' | 'invoice' | 'payment' | 'order' | 'expense' | 'user' | 'settings' | 'backup';
  entityId: string;
  details: string;
}

export interface TestResult {
  id: string;
  code: string;
  name: string;
  description: string;
  expected: string;
  actual: string;
  passed: boolean;
  category: string;
  details?: string;
}
