import nodemailer from 'nodemailer';
import { CompanySettings, Invoice, Quote, SmtpConfig } from '../src/types';

export function createTransporter(config: SmtpConfig) {
  if (!config.host || !config.user) {
    throw new Error('Servidor SMTP não configurado. Por favor, aceda a Configurações > Servidor SMTP e configure as credenciais.');
  }

  return nodemailer.createTransport({
    host: config.host,
    port: Number(config.port) || 587,
    secure: Boolean(config.secure), // true for 465, false for 587/STARTTLS
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 12000,
  });
}

export async function testSmtpConnection(config: SmtpConfig, recipientEmail: string) {
  const transporter = createTransporter(config);
  
  // Verify credentials & connection
  await transporter.verify();

  const sender = `"${config.senderName || 'Gráfica Palanga'}" <${config.senderEmail || config.user}>`;

  const info = await transporter.sendMail({
    from: sender,
    to: recipientEmail,
    subject: 'Teste de Ligação SMTP — Gráfica Palanga',
    text: `Olá! Este é um email de teste enviado com sucesso a partir do sistema de gestão da Gráfica Palanga.\n\nServidor SMTP: ${config.host}:${config.port}\nRemetente: ${sender}\nData: ${new Date().toLocaleString('pt-AO')}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #1D2B68; padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 0.5px;">P&Com • Gráfica Palanga</h1>
          <p style="margin: 6px 0 0 0; font-size: 11px; color: #78C6D8; letter-spacing: 2px;">QUALIDADE • CONFIANÇA • SOLUÇÕES</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff; color: #334155;">
          <h2 style="color: #1D2B68; font-size: 16px; margin-top: 0;">Ligação SMTP Bem-Sucedida!</h2>
          <p style="font-size: 13px; line-height: 1.6;">
            Este email confirma que as configurações do seu servidor SMTP estão <strong>válidas e operacionais</strong>. O sistema está agora apto a enviar cotações, orçamentos e facturas diretamente aos seus clientes.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; margin: 20px 0; font-size: 12px;">
            <p style="margin: 4px 0;"><strong>Servidor (Host):</strong> ${config.host}</p>
            <p style="margin: 4px 0;"><strong>Porta:</strong> ${config.port} (${config.secure ? 'SSL/TLS' : 'STARTTLS'})</p>
            <p style="margin: 4px 0;"><strong>Utilizador:</strong> ${config.user}</p>
            <p style="margin: 4px 0;"><strong>Remetente Oficial:</strong> ${sender}</p>
            <p style="margin: 4px 0;"><strong>Hora do Envio:</strong> ${new Date().toLocaleString('pt-AO')}</p>
          </div>
          <p style="font-size: 11px; color: #64748b; margin-bottom: 0;">
            Mensagem gerada automaticamente pelo Sistema de Gestão Gráfica Palanga.
          </p>
        </div>
      </div>
    `,
  });

  return info;
}

export async function sendQuoteByEmail(
  quote: Quote,
  config: SmtpConfig,
  settings: CompanySettings,
  recipientEmail: string,
  customNotes?: string
) {
  const transporter = createTransporter(config);
  const sender = `"${config.senderName || settings.companyName || 'Gráfica Palanga'}" <${config.senderEmail || config.user}>`;

  const rows = (quote.items || [])
    .map(
      (item) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; font-size: 12px; color: #1e293b;">
            <strong>${item.description}</strong>
            ${item.notes ? `<br><span style="color: #64748b; font-size: 10px;">${item.notes}</span>` : ''}
          </td>
          <td style="padding: 10px; font-size: 12px; text-align: center; color: #475569;">${item.quantity} ${item.unit}</td>
          <td style="padding: 10px; font-size: 12px; text-align: right; color: #475569;">${item.unitPrice.toLocaleString('pt-AO')} Kz</td>
          <td style="padding: 10px; font-size: 12px; text-align: right; font-weight: bold; color: #1D2B68;">${item.subtotal.toLocaleString('pt-AO')} Kz</td>
        </tr>
      `
    )
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #1D2B68; padding: 24px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 0.5px;">${settings.companyName || 'Gráfica Palanga'}</h1>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #78C6D8; letter-spacing: 2px;">QUALIDADE • CONFIANÇA • SOLUÇÕES</p>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #cbd5e1;">Telefone / WhatsApp: ${settings.phone} • ${settings.address}</p>
      </div>

      <div style="padding: 24px; color: #334155;">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1D2B68; padding-bottom: 12px; margin-bottom: 18px;">
          <div>
            <h2 style="margin: 0; color: #1D2B68; font-size: 18px;">PROPOSTA / COTAÇÃO COMERCIAL</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: bold; color: #0284c7;">N.º ${quote.quoteNumber}</p>
          </div>
          <div style="text-align: right; font-size: 12px; color: #64748b;">
            <p style="margin: 0;"><strong>Data de Emissão:</strong> ${new Date(quote.createdAt).toLocaleDateString('pt-AO')}</p>
            <p style="margin: 4px 0 0 0;"><strong>Validade até:</strong> ${new Date(quote.validUntil).toLocaleDateString('pt-AO')}</p>
          </div>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; font-size: 12px;">
          <p style="margin: 0 0 4px 0; color: #64748b; text-transform: uppercase; font-size: 10px; font-weight: bold;">Exmo.(a) Cliente:</p>
          <p style="margin: 0; font-size: 14px; font-weight: bold; color: #1D2B68;">${quote.clientName}</p>
          <p style="margin: 4px 0 0 0; color: #475569;">Contacto: ${quote.clientPhone}${quote.clientNif ? ` • NIF: ${quote.clientNif}` : ''}</p>
        </div>

        ${customNotes ? `<div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 10px 14px; margin-bottom: 18px; font-size: 12px; color: #1e40af;">${customNotes}</div>` : ''}

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #1D2B68; color: white; font-size: 11px; text-transform: uppercase;">
              <th style="padding: 8px 10px; text-align: left;">Descrição do Serviço</th>
              <th style="padding: 8px 10px; text-align: center;">Qtd</th>
              <th style="padding: 8px 10px; text-align: right;">Preço Unit.</th>
              <th style="padding: 8px 10px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div style="margin-left: auto; width: 280px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 12px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #64748b;">
            <span>Subtotal:</span>
            <span style="font-weight: bold; color: #1e293b;">${quote.subtotal.toLocaleString('pt-AO')} Kz</span>
          </div>
          ${quote.discountAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #16a34a;">
              <span>Desconto:</span>
              <span style="font-weight: bold;">-${quote.discountAmount.toLocaleString('pt-AO')} Kz</span>
            </div>
          ` : ''}
          ${quote.taxAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #64748b;">
              <span>Imposto (${quote.taxRate}%):</span>
              <span style="font-weight: bold;">+${quote.taxAmount.toLocaleString('pt-AO')} Kz</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; border-top: 2px solid #cbd5e1; padding-top: 6px; font-size: 14px; font-weight: bold; color: #1D2B68;">
            <span>TOTAL:</span>
            <span>${quote.total.toLocaleString('pt-AO')} Kz</span>
          </div>
        </div>

        ${quote.paymentTerms ? `
          <div style="background-color: #f1f5f9; border-radius: 6px; padding: 10px 14px; font-size: 11px; color: #334155; margin-bottom: 18px;">
            <strong>Modalidade / Condições de Pagamento:</strong> ${quote.paymentTerms}
          </div>
        ` : ''}

        ${quote.notes ? `
          <div style="font-size: 11px; color: #64748b; margin-bottom: 20px;">
            <strong>Observações e Especificações:</strong> ${quote.notes}
          </div>
        ` : ''}

        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 11px; color: #64748b;">
          Agradecemos a sua preferência! Para aprovar este orçamento ou esclarecer dúvidas, contacte-nos pelo WhatsApp <strong>${settings.whatsapp}</strong>.
        </div>
      </div>
    </div>
  `;

  return transporter.sendMail({
    from: sender,
    to: recipientEmail,
    subject: `Cotação Comercial Nº ${quote.quoteNumber} — ${settings.companyName || 'Gráfica Palanga'}`,
    text: `Olá ${quote.clientName},\n\nSegue a sua Cotação Comercial Nº ${quote.quoteNumber}.\nTotal: ${quote.total.toLocaleString('pt-AO')} Kz\nValidade: ${new Date(quote.validUntil).toLocaleDateString('pt-AO')}\n\nObrigado pela preferência!\n${settings.companyName || 'Gráfica Palanga'} - ${settings.phone}`,
    html,
  });
}

export async function sendInvoiceByEmail(
  invoice: Invoice,
  config: SmtpConfig,
  settings: CompanySettings,
  recipientEmail: string,
  customNotes?: string
) {
  const transporter = createTransporter(config);
  const sender = `"${config.senderName || settings.companyName || 'Gráfica Palanga'}" <${config.senderEmail || config.user}>`;

  const rows = (invoice.items || [])
    .map(
      (item) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; font-size: 12px; color: #1e293b;">
            <strong>${item.description}</strong>
            ${item.notes ? `<br><span style="color: #64748b; font-size: 10px;">${item.notes}</span>` : ''}
          </td>
          <td style="padding: 10px; font-size: 12px; text-align: center; color: #475569;">${item.quantity} ${item.unit}</td>
          <td style="padding: 10px; font-size: 12px; text-align: right; color: #475569;">${item.unitPrice.toLocaleString('pt-AO')} Kz</td>
          <td style="padding: 10px; font-size: 12px; text-align: right; font-weight: bold; color: #1D2B68;">${item.subtotal.toLocaleString('pt-AO')} Kz</td>
        </tr>
      `
    )
    .join('');

  const statusLabel =
    invoice.paymentStatus === 'pago'
      ? '<span style="color: #16a34a; font-weight: bold;">TOTALMENTE PAGA</span>'
      : invoice.paymentStatus === 'parcialmente_pago'
      ? '<span style="color: #ea580c; font-weight: bold;">PARCIALMENTE PAGA</span>'
      : '<span style="color: #dc2626; font-weight: bold;">POR PAGAR</span>';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #1D2B68; padding: 24px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 0.5px;">${settings.companyName || 'Gráfica Palanga'}</h1>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #78C6D8; letter-spacing: 2px;">QUALIDADE • CONFIANÇA • SOLUÇÕES</p>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #cbd5e1;">Telefone / WhatsApp: ${settings.phone} • ${settings.address}</p>
      </div>

      <div style="padding: 24px; color: #334155;">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1D2B68; padding-bottom: 12px; margin-bottom: 18px;">
          <div>
            <h2 style="margin: 0; color: #1D2B68; font-size: 18px;">FACTURA INTERNA / DOCUMENTO COMERCIAL</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: bold; color: #0284c7;">N.º ${invoice.invoiceNumber}</p>
          </div>
          <div style="text-align: right; font-size: 12px; color: #64748b;">
            <p style="margin: 0;"><strong>Data de Emissão:</strong> ${new Date(invoice.createdAt).toLocaleDateString('pt-AO')}</p>
            <p style="margin: 4px 0 0 0;"><strong>Estado:</strong> ${statusLabel}</p>
          </div>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; font-size: 12px;">
          <p style="margin: 0 0 4px 0; color: #64748b; text-transform: uppercase; font-size: 10px; font-weight: bold;">Exmo.(a) Cliente:</p>
          <p style="margin: 0; font-size: 14px; font-weight: bold; color: #1D2B68;">${invoice.clientName}</p>
          <p style="margin: 4px 0 0 0; color: #475569;">Contacto: ${invoice.clientPhone}${invoice.clientNif ? ` • NIF: ${invoice.clientNif}` : ''}</p>
        </div>

        ${customNotes ? `<div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 10px 14px; margin-bottom: 18px; font-size: 12px; color: #1e40af;">${customNotes}</div>` : ''}

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #1D2B68; color: white; font-size: 11px; text-transform: uppercase;">
              <th style="padding: 8px 10px; text-align: left;">Descrição do Serviço</th>
              <th style="padding: 8px 10px; text-align: center;">Qtd</th>
              <th style="padding: 8px 10px; text-align: right;">Preço Unit.</th>
              <th style="padding: 8px 10px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div style="margin-left: auto; width: 280px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 12px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #64748b;">
            <span>Subtotal:</span>
            <span style="font-weight: bold; color: #1e293b;">${invoice.subtotal.toLocaleString('pt-AO')} Kz</span>
          </div>
          ${invoice.discountAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #16a34a;">
              <span>Desconto:</span>
              <span style="font-weight: bold;">-${invoice.discountAmount.toLocaleString('pt-AO')} Kz</span>
            </div>
          ` : ''}
          ${invoice.taxAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #64748b;">
              <span>Imposto (${invoice.taxRate}%):</span>
              <span style="font-weight: bold;">+${invoice.taxAmount.toLocaleString('pt-AO')} Kz</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; border-top: 2px solid #cbd5e1; padding-top: 6px; font-size: 14px; font-weight: bold; color: #1D2B68;">
            <span>TOTAL:</span>
            <span>${invoice.total.toLocaleString('pt-AO')} Kz</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 12px; color: #16a34a; font-weight: bold;">
            <span>Valor Pago:</span>
            <span>${invoice.paidAmount.toLocaleString('pt-AO')} Kz</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 12px; color: ${invoice.balance > 0 ? '#dc2626' : '#64748b'}; font-weight: bold;">
            <span>Saldo em Dívida:</span>
            <span>${invoice.balance.toLocaleString('pt-AO')} Kz</span>
          </div>
        </div>

        ${invoice.paymentMethod || invoice.paymentTerms ? `
          <div style="background-color: #f1f5f9; border-radius: 6px; padding: 10px 14px; font-size: 11px; color: #334155; margin-bottom: 18px;">
            ${invoice.paymentMethod ? `<strong>Modalidade de Pagamento:</strong> ${invoice.paymentMethod.toUpperCase()}<br>` : ''}
            ${invoice.paymentTerms ? `<strong>Condições de Pagamento:</strong> ${invoice.paymentTerms}` : ''}
          </div>
        ` : ''}

        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 11px; color: #64748b;">
          Agradecemos a sua preferência! Gráfica Palanga • Luanda, Angola • Tel: ${settings.phone}
        </div>
      </div>
    </div>
  `;

  return transporter.sendMail({
    from: sender,
    to: recipientEmail,
    subject: `Factura Interna Nº ${invoice.invoiceNumber} — ${settings.companyName || 'Gráfica Palanga'}`,
    text: `Olá ${invoice.clientName},\n\nSegue a Factura Interna Nº ${invoice.invoiceNumber}.\nTotal: ${invoice.total.toLocaleString('pt-AO')} Kz\nSaldo em Dívida: ${invoice.balance.toLocaleString('pt-AO')} Kz\n\nObrigado pela preferência!\n${settings.companyName || 'Gráfica Palanga'} - ${settings.phone}`,
    html,
  });
}
