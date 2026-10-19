import React, { useState } from 'react';
import { AlertCircle, Download, Mail, Printer, X } from 'lucide-react';
import { CompanySettings, Invoice, PaymentReceipt, Quote } from '../types';
import { formatKz } from '../utils/calculations';
import { LogoReservedBox } from './LogoReservedBox';
import { handlePrintElement } from '../utils/printHelper';
import { SendEmailModal } from './SendEmailModal';

interface PrintableDocumentProps {
  type: 'quote' | 'invoice' | 'receipt';
  document: Quote | Invoice | PaymentReceipt;
  settings: CompanySettings;
  onClose: () => void;
}

export const PrintableDocument: React.FC<PrintableDocumentProps> = ({
  type,
  document,
  settings,
  onClose,
}) => {
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const isQuote = type === 'quote';
  const isInvoice = type === 'invoice';
  const isReceipt = type === 'receipt';

  const docTitle = isQuote ? 'COTAÇÃO / ORÇAMENTO' : isInvoice ? 'FACTURA INTERNA' : 'RECIBO DE PAGAMENTO';
  const docNumber = isQuote
    ? (document as Quote).quoteNumber
    : isInvoice
    ? (document as Invoice).invoiceNumber
    : (document as PaymentReceipt).receiptNumber;

  const docDate = isQuote
    ? new Date((document as Quote).createdAt).toLocaleDateString('pt-AO')
    : isInvoice
    ? new Date((document as Invoice).createdAt).toLocaleDateString('pt-AO')
    : new Date((document as PaymentReceipt).paymentDate).toLocaleDateString('pt-AO');

  const docClientName = isQuote
    ? (document as Quote).clientName
    : isInvoice
    ? (document as Invoice).clientName
    : (document as PaymentReceipt).clientName;

  const handlePrint = () => {
    const el = window.document.getElementById('printable-document-sheet');
    if (el) {
      handlePrintElement(el.innerHTML, `${docTitle} — ${docNumber}`);
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Controles no topo (visíveis apenas no ecrã) */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col my-8 border border-slate-200">
        <div className="bg-[#1D2B68] text-white px-6 py-3 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-wide">
              {docTitle} — {docNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(isQuote || isInvoice) && (
              <button
                onClick={() => setEmailModalOpen(true)}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1.5 rounded-md text-xs transition-colors border border-white/20"
              >
                <Mail className="w-3.5 h-3.5 text-[#78C6D8]" />
                <span>Enviar por Email</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-[#78C6D8] hover:bg-[#65bacc] text-[#1D2B68] font-bold px-3 py-1.5 rounded-md text-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Guardar como PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Folha Oficial A4 */}
        <div id="printable-document-sheet" className="p-8 sm:p-12 bg-white print-page text-slate-800 text-xs">
          {/* Aviso Legal Mandatório da Secção 10 */}
          <div className="mb-6 p-2.5 bg-amber-50 border border-amber-300 rounded text-center text-[11px] font-semibold text-amber-900 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>DOCUMENTO DE GESTÃO INTERNA — NÃO CERTIFICADO PARA FINS FISCAIS</span>
          </div>

          {/* Cabeçalho da Empresa */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-[#1D2B68] pb-6 mb-6 gap-4">
            <div className="space-y-2">
              <LogoReservedBox size="lg" className="w-72 mb-2" logoUrl={settings.logoUrl} />
              <div>
                <h1 className="text-lg font-black text-[#1D2B68] tracking-tight">
                  {settings.companyName || 'Gráfica Palanga'}
                </h1>
                <p className="text-[11px] font-semibold text-slate-700">Palanga - Comércio e Prestação de Serviços (SU), Lda.</p>
                <p className="text-[10px] text-slate-500 italic">Qualidade • Confiança • Soluções</p>
                <p className="text-[11px] text-slate-600">Serviços Gráficos, Impressão e Brindes</p>
                <p className="text-[11px] text-slate-600">WhatsApp / Telefone: {settings.whatsapp || '945 562 287'}</p>
                {settings.email && <p className="text-[11px] text-slate-600">E-mail: {settings.email}</p>}
                {settings.address && <p className="text-[11px] text-slate-600">Endereço: {settings.address}</p>}
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="inline-block bg-[#1D2B68] text-white font-bold px-3 py-1 rounded text-xs tracking-wider uppercase">
                {docTitle}
              </span>
              <p className="text-sm font-black text-[#1D2B68] pt-1">{docNumber}</p>
              <p className="text-slate-600">Data de Emissão: <span className="font-semibold text-slate-800">{docDate}</span></p>
              {isQuote && (document as Quote).validUntil && (
                <p className="text-slate-600">Válido até: <span className="font-semibold text-slate-800">{new Date((document as Quote).validUntil).toLocaleDateString('pt-AO')}</span></p>
              )}
              {isInvoice && (
                <div className="pt-1">
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      (document as Invoice).paymentStatus === 'pago'
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : (document as Invoice).paymentStatus === 'parcialmente_pago'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : (document as Invoice).paymentStatus === 'anulado'
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-slate-100 text-slate-800 border border-slate-300'
                    }`}
                  >
                    Estado: {(document as Invoice).paymentStatus.replace('_', ' ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="bg-[#F5F7FA] border border-slate-200 rounded-lg p-4 mb-6">
            <h3 className="text-[11px] font-bold text-[#1D2B68] uppercase tracking-wider mb-2">Dados do Cliente</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-slate-500">Nome / Razão Social:</p>
                <p className="font-bold text-slate-800">
                  {isReceipt
                    ? (document as PaymentReceipt).clientName
                    : isInvoice
                    ? (document as Invoice).clientName
                    : (document as Quote).clientName}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Contacto Telefónico:</p>
                <p className="font-semibold text-slate-800">
                  {isInvoice
                    ? (document as Invoice).clientPhone
                    : isQuote
                    ? (document as Quote).clientPhone
                    : 'N/A'}
                </p>
              </div>
              {(document as any).clientNif && (
                <div>
                  <p className="text-slate-500">NIF:</p>
                  <p className="font-semibold text-slate-800">{(document as any).clientNif}</p>
                </div>
              )}
              {(document as any).clientAddress && (
                <div>
                  <p className="text-slate-500">Endereço:</p>
                  <p className="font-semibold text-slate-800">{(document as any).clientAddress}</p>
                </div>
              )}
            </div>
          </div>

          {isQuote && (document as Quote).paymentTerms && (
            <div className="mb-4 text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 inline-block">
              <span className="font-semibold text-slate-500">Modalidade / Condições de Pagamento: </span>
              <span className="font-bold text-[#1D2B68]">{(document as Quote).paymentTerms}</span>
            </div>
          )}

          {isInvoice && (
            <div className="mb-4 text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 inline-flex flex-wrap items-center gap-3">
              {(document as Invoice).paymentMethod && (
                <div>
                  <span className="font-semibold text-slate-500">Modalidade de Pagamento: </span>
                  <span className="font-bold text-[#1D2B68] uppercase">
                    {(document as Invoice).paymentMethod === 'numerario' ? 'Numerário' :
                     (document as Invoice).paymentMethod === 'multicaixa' ? 'Multicaixa (POS)' :
                     (document as Invoice).paymentMethod === 'transferencia' ? 'Transferência Bancária' :
                     (document as Invoice).paymentMethod === 'credito' ? 'Crédito / A Prazo' : 'Outro'}
                  </span>
                </div>
              )}
              {(document as Invoice).paymentTerms && (
                <div className="border-l border-slate-300 pl-3">
                  <span className="font-semibold text-slate-500">Condições: </span>
                  <span className="font-bold text-[#1D2B68]">{(document as Invoice).paymentTerms}</span>
                </div>
              )}
            </div>
          )}

          {/* Tabela de Serviços para Cotação ou Factura */}
          {(isQuote || isInvoice) && (
            <div className="mb-6 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1D2B68] text-white text-[11px]">
                    <th className="py-2.5 px-3 font-semibold">Código</th>
                    <th className="py-2.5 px-3 font-semibold">Descrição do Serviço</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Unid.</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Qtd.</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Preço Unit.</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {((document as Quote | Invoice).items || []).map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{item.serviceCode}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {item.description}
                        {item.materialProvidedByClient && (
                          <span className="block text-[10px] text-[#1D2B68] font-normal">Material fornecido pelo cliente</span>
                        )}
                        {item.notes && <span className="block text-[10px] text-slate-500 italic">{item.notes}</span>}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-600">{item.unit}</td>
                      <td className="py-2 px-3 text-center font-bold text-slate-800">{item.quantity}</td>
                      <td className="py-2 px-3 text-right text-slate-700">{formatKz(item.unitPrice)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{formatKz(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Dados Específicos para Recibo de Pagamento */}
          {isReceipt && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-6 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Factura Liquidada:</span>
                  <span className="font-bold text-[#1D2B68] text-sm">{(document as PaymentReceipt).invoiceNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Método de Pagamento:</span>
                  <span className="font-semibold text-slate-800 uppercase">{(document as PaymentReceipt).paymentMethod}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Referência / Comprovativo:</span>
                  <span className="font-mono text-slate-800">{(document as PaymentReceipt).reference || 'Pagamento Direto'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Operador Responsável:</span>
                  <span className="font-semibold text-slate-800">{(document as PaymentReceipt).registrarName}</span>
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded text-center">
                <span className="text-xs text-green-800 font-medium block">Valor Recebido e Confirmado:</span>
                <span className="text-2xl font-black text-[#198754]">
                  {formatKz((document as PaymentReceipt).amount)}
                </span>
              </div>
            </div>
          )}

          {/* Resumo Financeiro (Totais) */}
          {(isQuote || isInvoice) && (
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t border-slate-200 pt-4 mb-6">
              <div className="space-y-2 max-w-sm text-[11px] text-slate-500">
                <p><span className="font-semibold text-slate-700">Observações:</span> {(document as Quote | Invoice).notes || 'Sem observações adicionais.'}</p>
                <p>Valores expressos em Kwanzas Angolanos (AOA / Kz). Pagamento por Numerário ou Multicaixa.</p>
              </div>

              <div className="w-full sm:w-72 bg-slate-50 rounded-lg p-3.5 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-medium text-slate-800">{formatKz((document as Quote | Invoice).subtotal)}</span>
                </div>

                {(document as Quote | Invoice).discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Desconto Aplicado:</span>
                    <span className="font-semibold">- {formatKz((document as Quote | Invoice).discountAmount)}</span>
                  </div>
                )}

                {(document as Quote | Invoice).taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Imposto:</span>
                    <span>{formatKz((document as Quote | Invoice).taxAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-black text-[#1D2B68] border-t border-slate-300 pt-2">
                  <span>TOTAL:</span>
                  <span className="text-base text-[#1D2B68]">{formatKz((document as Quote | Invoice).total)}</span>
                </div>

                {isInvoice && (
                  <>
                    <div className="flex justify-between text-xs text-slate-700 border-t border-slate-200 pt-2">
                      <span>Valor Pago:</span>
                      <span className="font-bold text-[#198754]">{formatKz((document as Invoice).paidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-800 font-bold bg-amber-50 p-1.5 rounded border border-amber-200">
                      <span>Saldo em Dívida:</span>
                      <span className="text-red-700 font-black">{formatKz((document as Invoice).balance)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Assinatura e Carimbo */}
          <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-dashed border-slate-300 text-center text-[11px] text-slate-600">
            <div>
              <div className="border-b border-slate-400 h-10 mb-1 w-3/4 mx-auto"></div>
              <p className="font-bold text-slate-800">Gráfica Palanga</p>
              <p className="text-[10px] text-slate-500">Operador / Responsável</p>
            </div>
            <div>
              <div className="border-b border-slate-400 h-10 mb-1 w-3/4 mx-auto"></div>
              <p className="font-bold text-slate-800">Assinatura do Cliente</p>
              <p className="text-[10px] text-slate-500">Confirmação de Recepção</p>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 mt-8 pt-4 border-t border-slate-100">
            Obrigado pela preferência! • Gráfica Palanga • Luanda, Angola
          </div>
        </div>

        {/* Barra de Fecho Inferior (Visível apenas no ecrã) */}
        <div className="bg-slate-100 px-6 py-4 flex flex-wrap justify-between items-center gap-2 border-t border-slate-200 no-print">
          <div className="flex items-center gap-2">
            {(isQuote || isInvoice) && (
              <button
                onClick={() => setEmailModalOpen(true)}
                className="flex items-center gap-1.5 bg-[#1D2B68] hover:bg-[#15204e] text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-xs"
              >
                <Mail className="w-4 h-4 text-[#78C6D8]" />
                <span>Enviar por Email</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-[#78C6D8] hover:bg-[#65bacc] text-[#1D2B68] font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar como PDF</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-lg text-xs transition-colors shadow-sm"
          >
            <X className="w-4 h-4 text-slate-300" />
            <span>Fechar / Sair</span>
          </button>
        </div>
      </div>

      {emailModalOpen && (isQuote || isInvoice) && (
        <SendEmailModal
          isOpen={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          documentType={isQuote ? 'quote' : 'invoice'}
          documentId={document.id}
          documentNumber={docNumber}
          clientName={docClientName}
          defaultEmail={(document as any).clientEmail || ''}
        />
      )}
    </div>
  );
};
