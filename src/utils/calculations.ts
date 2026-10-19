/**
 * Gráfica Palanga — Motor de Cálculos Financeiros
 * Autoridade centralizada para regras financeiras e cálculos em conformidade com o prompt.
 */

import {
  CatalogService,
  DiscountType,
  OrderItemSnapshot,
  PaymentStatus,
} from '../types';

export interface CalculationOptions {
  materialProvidedByClient?: boolean;
  extraComplexity?: boolean;
  customConfirmedUnitPrice?: number;
}

/**
 * Determina o preço unitário aplicável a um serviço e quantidade,
 * aplicando regras de escalonamento (faixas de quantidade) e opções de material.
 */
export function getServiceUnitPrice(
  service: CatalogService,
  quantity: number,
  options?: CalculationOptions
): { unitPrice: number; isUnderConsultation: boolean; note?: string } {
  const qty = Math.max(0, Number(quantity) || 0);

  // Se o cliente fornece o material e o serviço suporta essa opção
  if (options?.materialProvidedByClient && service.allowsCustomMaterial && service.customMaterialPrice !== undefined) {
    return {
      unitPrice: service.customMaterialPrice,
      isUnderConsultation: false,
      note: 'Material fornecido pelo cliente',
    };
  }

  // Preço sob consulta (on_request)
  if (service.pricingType === 'on_request') {
    if (options?.customConfirmedUnitPrice !== undefined && options.customConfirmedUnitPrice > 0) {
      return {
        unitPrice: Math.round(options.customConfirmedUnitPrice),
        isUnderConsultation: false,
        note: 'Preço sob consulta confirmado manualmente',
      };
    }
    return {
      unitPrice: 0,
      isUnderConsultation: true,
      note: 'Preço sob consulta — requer confirmação prévia',
    };
  }

  // Preço por faixas (Tiers — ex: T-shirts sublimação / DTF)
  if (service.pricingType === 'tiers' && service.tiers && service.tiers.length > 0) {
    const matchedTier = service.tiers.find((tier) => {
      if (tier.max === null) {
        return qty >= tier.min;
      }
      return qty >= tier.min && qty <= tier.max;
    });

    if (matchedTier) {
      return {
        unitPrice: matchedTier.pricePerUnit,
        isUnderConsultation: false,
        note: matchedTier.label,
      };
    }
  }

  // Se o utilizador forneceu um preço unitário confirmado para um caso especial
  if (options?.customConfirmedUnitPrice !== undefined && options.customConfirmedUnitPrice > 0) {
    return {
      unitPrice: Math.round(options.customConfirmedUnitPrice),
      isUnderConsultation: false,
    };
  }

  // Preço fixo padrão
  return {
    unitPrice: service.basePrice,
    isUnderConsultation: false,
  };
}

/**
 * Calcula o subtotal de um item com base na quantidade e serviço
 */
export function calculateItemSubtotal(
  service: CatalogService,
  quantity: number,
  options?: CalculationOptions
): {
  unitPrice: number;
  quantity: number;
  subtotal: number;
  isUnderConsultation: boolean;
  notes?: string;
} {
  const qty = Number(quantity);
  if (isNaN(qty) || qty < 0) {
    throw new Error('A quantidade não pode ser negativa ou inválida.');
  }

  const { unitPrice, isUnderConsultation, note } = getServiceUnitPrice(service, qty, options);

  if (isUnderConsultation) {
    return {
      unitPrice: 0,
      quantity: qty,
      subtotal: 0,
      isUnderConsultation: true,
      notes: note,
    };
  }

  const subtotal = Math.round(qty * unitPrice);

  return {
    unitPrice,
    quantity: qty,
    subtotal,
    isUnderConsultation: false,
    notes: note,
  };
}

/**
 * Calcula os totais de um documento comercial ou cotação
 */
export function calculateDocumentTotals(
  items: Array<Pick<OrderItemSnapshot, 'subtotal' | 'isUnderConsultation'>>,
  discountType: DiscountType = 'none',
  discountValue: number = 0,
  taxRate: number = 0
): {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  hasUnconfirmedConsultationItems: boolean;
} {
  // Somatório dos itens
  const subtotal = items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);

  const hasUnconfirmedConsultationItems = items.some((item) => Boolean(item.isUnderConsultation));

  // Validação e cálculo de desconto
  let discountAmount = 0;
  const dVal = Number(discountValue) || 0;

  if (dVal < 0) {
    throw new Error('O desconto não pode ser um valor negativo.');
  }

  if (discountType === 'percentage') {
    if (dVal > 100) {
      throw new Error('O desconto percentual não pode ser superior a 100%.');
    }
    discountAmount = Math.round(subtotal * (dVal / 100));
  } else if (discountType === 'fixed') {
    if (dVal > subtotal) {
      throw new Error('O desconto fixo não pode exceder o subtotal elegível.');
    }
    discountAmount = Math.round(dVal);
  }

  discountAmount = Math.min(subtotal, Math.max(0, discountAmount));
  const baseAfterDiscount = Math.max(0, subtotal - discountAmount);

  // Impostos (opcional e desativado por defeito)
  let taxAmount = 0;
  const tRate = Number(taxRate) || 0;
  if (tRate < 0) {
    throw new Error('A taxa de imposto não pode ser negativa.');
  }
  if (tRate > 0) {
    taxAmount = Math.round(baseAfterDiscount * (tRate / 100));
  }

  const total = Math.max(0, baseAfterDiscount + taxAmount);

  return {
    subtotal,
    discountAmount,
    taxAmount,
    total,
    hasUnconfirmedConsultationItems,
  };
}

/**
 * Calcula o saldo em dívida
 */
export function calculateBalance(total: number, validPaymentsTotal: number): number {
  const t = Math.max(0, Number(total) || 0);
  const p = Math.max(0, Number(validPaymentsTotal) || 0);
  return Math.max(0, t - p);
}

/**
 * Determina o estado de pagamento de um documento
 */
export function determinePaymentStatus(
  total: number,
  validPaymentsTotal: number,
  isCancelled: boolean = false
): PaymentStatus {
  if (isCancelled) {
    return 'anulado';
  }

  const t = Math.max(0, Number(total) || 0);
  const p = Math.max(0, Number(validPaymentsTotal) || 0);

  if (p >= t && t > 0) {
    return 'pago';
  }
  if (p > 0 && p < t) {
    return 'parcialmente_pago';
  }
  if (t === 0 && p === 0) {
    return 'pago';
  }
  return 'por_pagar';
}

/**
 * Calcula a margem bruta estimada de uma encomenda
 */
export function calculateEstimatedMargin(
  revenue: number,
  costs: Array<{ amount: number }> | null | undefined
): {
  hasCosts: boolean;
  totalCosts: number;
  margin: number | null;
  marginPercent: number | null;
  label: string;
} {
  const rev = Math.max(0, Number(revenue) || 0);

  if (!costs || costs.length === 0) {
    return {
      hasCosts: false,
      totalCosts: 0,
      margin: null,
      marginPercent: null,
      label: 'Custos não registados (Dados insuficientes)',
    };
  }

  const totalCosts = costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const margin = rev - totalCosts;
  const marginPercent = rev > 0 ? Number(((margin / rev) * 100).toFixed(1)) : 0;

  return {
    hasCosts: true,
    totalCosts,
    margin,
    marginPercent,
    label: `${margin.toLocaleString('pt-AO')} Kz (${marginPercent}%)`,
  };
}

/**
 * Formatação de moeda no padrão oficial de Angola
 */
export function formatKz(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 Kz';
  }
  return `${Math.round(amount).toLocaleString('pt-AO')} Kz`;
}
