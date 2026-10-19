import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Mail, RefreshCw, Send, X } from 'lucide-react';
import { api } from '../services/api';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'quote' | 'invoice';
  documentId: string;
  documentNumber: string;
  clientName: string;
  defaultEmail?: string;
  onSuccess?: (msg: string) => void;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  onClose,
  documentType,
  documentId,
  documentNumber,
  clientName,
  defaultEmail = '',
  onSuccess,
}) => {
  const [recipientEmail, setRecipientEmail] = useState(defaultEmail);
  const [customNotes, setCustomNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setError('Por favor, introduza um endereço de email válido.');
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      let res;
      if (documentType === 'quote') {
        res = await api.sendQuoteEmail(documentId, {
          recipientEmail,
          customNotes: customNotes.trim() ? customNotes.trim() : undefined,
        });
      } else {
        res = await api.sendInvoiceEmail(documentId, {
          recipientEmail,
          customNotes: customNotes.trim() ? customNotes.trim() : undefined,
        });
      }

      setSuccess(res.message || 'Email enviado com sucesso!');
      if (onSuccess) onSuccess(res.message);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Falha ao enviar email. Verifique as configurações de SMTP.');
    } finally {
      setSending(false);
    }
  };

  const typeLabel = documentType === 'quote' ? 'Cotação / Orçamento' : 'Factura Interna';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-[#1D2B68] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#78C6D8]" />
            <h3 className="text-sm font-bold tracking-wide">
              Enviar {typeLabel} por Email
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSend} className="p-5 space-y-4 text-xs text-slate-700">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Documento:</span>
              <span className="font-bold text-[#1D2B68]">{documentNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Cliente:</span>
              <span className="font-semibold text-slate-800">{clientName}</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Email do Destinatário *
            </label>
            <input
              type="email"
              required
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="cliente@exemplo.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Mensagem Personalizada / Nota Adicional (Opcional)
            </label>
            <textarea
              rows={3}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Ex.: Estimado cliente, segue a cotação comercial solicitada. Ficamos ao dispor para qualquer esclarecimento..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#78C6D8]"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Erro no envio</p>
                <p className="text-[11px] mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="font-semibold">{success}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              disabled={sending}
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 bg-[#1D2B68] hover:bg-[#15204e] text-white font-bold px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {sending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#78C6D8]" />
                  <span>A enviar email...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-[#78C6D8]" />
                  <span>Enviar Agora</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
