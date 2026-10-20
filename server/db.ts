import fs from 'fs';
import path from 'path';
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
  User,
} from '../src/types';
import {
  INITIAL_COMPANY_SETTINGS,
  INITIAL_USERS,
  OFFICIAL_CATALOG_SERVICES,
} from './initialData';

export interface StoredUser extends Omit<User, 'lastLogin'> {
  passwordHash: string;
  lastLogin?: string;
}

export interface DatabaseSchema {
  version: number;
  services: CatalogService[];
  priceAuditLogs: PriceAuditLog[];
  users: StoredUser[];
  clients: Client[];
  quotes: Quote[];
  invoices: Invoice[];
  payments: PaymentReceipt[];
  orders: ProductionOrder[];
  expenses: Expense[];
  settings: CompanySettings;
  auditLogs: AuditLogEntry[];
  counters: {
    quotes: number;
    invoices: number;
    orders: number;
    payments: number;
    expenses: number;
  };
}

const isVercel = Boolean(process.env.VERCEL);
const ROOT_DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_DIR = isVercel ? path.resolve('/tmp', 'data') : ROOT_DATA_DIR;
const BACKUPS_DIR = path.resolve(DATA_DIR, 'backups');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

class DatabaseManager {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDirectories();
    this.data = this.loadOrCreate();
  }

  private ensureDirectories() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      }
      // No Vercel Serverless, copiar base de dados inicial do repositório para a pasta temporária gravável (/tmp)
      if (isVercel && !fs.existsSync(DB_FILE)) {
        const rootDbFile = path.resolve(ROOT_DATA_DIR, 'database.json');
        if (fs.existsSync(rootDbFile)) {
          fs.copyFileSync(rootDbFile, DB_FILE);
        }
      }
    } catch (err) {
      console.warn('Aviso ao configurar diretórios de dados:', err);
    }
  }

  private loadOrCreate(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseSchema;
        let modified = false;
        parsed.users.forEach((u) => {
          if (!u.employeeId) {
            if (u.id === 'usr_admin') u.employeeId = 'ADM-001';
            else if (u.id === 'usr_operador') u.employeeId = 'OP-001';
            else if (u.id === 'usr_financeiro') u.employeeId = 'FIN-001';
            else u.employeeId = `FUNC-${u.id.replace('usr_', '')}`;
            modified = true;
          }
          if (!u.pin) {
            u.pin = '0000';
            modified = true;
          }
        });
        if (modified) {
          try {
            fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
          } catch {
            // ignore write error
          }
        }
        return parsed;
      } catch (err) {
        console.error('Erro ao ler base de dados existente, criando cópia de segurança de emergência e reiniciando...', err);
        const corruptBackup = path.resolve(BACKUPS_DIR, `corrupted-${Date.now()}.json`);
        try {
          fs.copyFileSync(DB_FILE, corruptBackup);
        } catch {
          // ignore
        }
      }
    }

    // Criação inicial
    const initialDb: DatabaseSchema = {
      version: 1,
      services: [...OFFICIAL_CATALOG_SERVICES],
      priceAuditLogs: [],
      users: [...INITIAL_USERS],
      clients: [
        {
          id: 'cli_exemplo_1',
          name: 'Colégio Nova Esperança',
          nif: '5412984012',
          phone: '923 445 670',
          email: 'secretaria@novaesperanca.co.ao',
          address: 'Luanda, Angola',
          notes: 'Cliente institucional — trabalhos escolares e encadernações',
          active: true,
          createdAt: '2025-07-28T10:00:00.000Z',
          updatedAt: '2025-07-28T10:00:00.000Z',
        },
        {
          id: 'cli_exemplo_2',
          name: 'Agência de Publicidade Criativa Lda',
          nif: '5401928374',
          phone: '912 300 450',
          email: 'contacto@criativa.co.ao',
          address: 'Talatona, Luanda',
          notes: 'Cliente regular — vinis, lonas e personalização DTF',
          active: true,
          createdAt: '2025-07-29T14:30:00.000Z',
          updatedAt: '2025-07-29T14:30:00.000Z',
        },
      ],
      quotes: [],
      invoices: [
        {
          id: 'fac_exemplo_1',
          invoiceNumber: 'FAC-2025-0001',
          clientId: 'cli_exemplo_1',
          clientName: 'Colégio Nova Esperança',
          clientPhone: '923 445 670',
          clientEmail: 'secretaria@novaesperanca.co.ao',
          clientNif: '5412984012',
          clientAddress: 'Luanda, Angola',
          items: [
            {
              id: 'item_fac_1',
              serviceId: 'srv_copia_pb_fv',
              serviceCode: 'CPB-03',
              description: 'Cópia P&B — Frente e Verso (Testes Escolares)',
              category: 'Cópia P&B',
              unit: 'unid',
              quantity: 500,
              unitPrice: 50,
              subtotal: 25000,
              isUnderConsultation: false,
              notes: '',
              materialProvidedByClient: false,
            },
          ],
          subtotal: 25000,
          discountType: 'none',
          discountValue: 0,
          discountAmount: 0,
          taxRate: 0,
          taxAmount: 0,
          total: 25000,
          paidAmount: 10000,
          balance: 15000,
          paymentStatus: 'parcialmente_pago',
          paymentMethod: 'transferencia',
          createdAt: '2025-07-29T10:00:00.000Z',
          updatedAt: '2025-07-29T10:00:00.000Z',
          createdBy: 'usr_admin',
          creatorName: 'Administrador do Sistema',
        },
        {
          id: 'fac_exemplo_2',
          invoiceNumber: 'FAC-2025-0002',
          clientId: 'cli_exemplo_2',
          clientName: 'Agência de Publicidade Criativa Lda',
          clientPhone: '912 300 450',
          clientEmail: 'contacto@criativa.co.ao',
          clientNif: '5401928374',
          clientAddress: 'Talatona, Luanda',
          items: [
            {
              id: 'item_fac_2',
              serviceId: 'srv_lona_impressa',
              serviceCode: 'LON-01',
              description: 'Lona Publicitária com Ilhós — Evento Anual',
              category: 'Grandes Formatos',
              unit: 'metro',
              quantity: 10,
              unitPrice: 4500,
              subtotal: 45000,
              isUnderConsultation: false,
              notes: '',
              materialProvidedByClient: false,
            },
          ],
          subtotal: 45000,
          discountType: 'none',
          discountValue: 0,
          discountAmount: 0,
          taxRate: 0,
          taxAmount: 0,
          total: 45000,
          paidAmount: 0,
          balance: 45000,
          paymentStatus: 'por_pagar',
          paymentMethod: 'multicaixa',
          createdAt: '2025-07-30T14:00:00.000Z',
          updatedAt: '2025-07-30T14:00:00.000Z',
          createdBy: 'usr_admin',
          creatorName: 'Administrador do Sistema',
        },
      ],
      payments: [],
      orders: [],
      expenses: [],
      settings: { ...INITIAL_COMPANY_SETTINGS },
      auditLogs: [
        {
          id: 'log_init',
          timestamp: new Date().toISOString(),
          userId: 'usr_admin',
          userName: 'Administrador do Sistema',
          userRole: 'admin',
          action: 'SISTEMA_INICIALIZADO',
          entityType: 'settings',
          entityId: 'system',
          details: 'Sistema da Gráfica Palanga inicializado com tabela de preços de 28/07/2025.',
        },
      ],
      counters: {
        quotes: 0,
        invoices: 2,
        orders: 0,
        payments: 0,
        expenses: 0,
      },
    };

    this.saveDataDirect(initialDb);
    return initialDb;
  }

  private saveDataDirect(data: DatabaseSchema) {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      const serialized = JSON.stringify(data, null, 2);
      fs.writeFileSync(tmpFile, serialized, 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.warn('[DB] Aviso: Não foi possível persistir base de dados no disco (mantida em memória):', err);
    }
  }

  public save() {
    this.saveDataDirect(this.data);
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  // Sequenciadores seguros
  public nextQuoteNumber(): string {
    this.data.counters.quotes += 1;
    this.save();
    const currentYear = new Date().getFullYear();
    return `COT-${currentYear}-${String(this.data.counters.quotes).padStart(4, '0')}`;
  }

  public nextInvoiceNumber(): string {
    this.data.counters.invoices += 1;
    this.save();
    const currentYear = new Date().getFullYear();
    return `FAC-${currentYear}-${String(this.data.counters.invoices).padStart(4, '0')}`;
  }

  public nextOrderNumber(): string {
    this.data.counters.orders += 1;
    this.save();
    const currentYear = new Date().getFullYear();
    return `ENC-${currentYear}-${String(this.data.counters.orders).padStart(4, '0')}`;
  }

  public nextPaymentNumber(): string {
    this.data.counters.payments += 1;
    this.save();
    const currentYear = new Date().getFullYear();
    return `REC-${currentYear}-${String(this.data.counters.payments).padStart(4, '0')}`;
  }

  public nextExpenseNumber(): string {
    this.data.counters.expenses += 1;
    this.save();
    const currentYear = new Date().getFullYear();
    return `DES-${currentYear}-${String(this.data.counters.expenses).padStart(4, '0')}`;
  }

  public logAudit(
    userId: string,
    userName: string,
    userRole: StoredUser['role'],
    action: string,
    entityType: AuditLogEntry['entityType'],
    entityId: string,
    details: string
  ) {
    const entry: AuditLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      userRole,
      action,
      entityType,
      entityId,
      details,
    };
    this.data.auditLogs.unshift(entry);
    // Keep last 1000 logs
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs.pop();
    }
    this.save();
  }

  // Cópias de segurança (Backups)
  public createBackup(creatorName: string = 'Administrador'): { filename: string; path: string; sizeBytes: number; timestamp: string } {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-palanga-${timestamp}.json`;
    const destPath = path.resolve(BACKUPS_DIR, filename);

    const snapshot = JSON.stringify(this.data, null, 2);
    fs.writeFileSync(destPath, snapshot, 'utf-8');
    const stat = fs.statSync(destPath);

    this.logAudit(
      'system',
      creatorName,
      'admin',
      'CRIAR_BACKUP',
      'backup',
      filename,
      `Cópia de segurança criada com sucesso (${stat.size} bytes).`
    );

    return {
      filename,
      path: destPath,
      sizeBytes: stat.size,
      timestamp: new Date().toISOString(),
    };
  }

  public listBackups(): Array<{ filename: string; sizeBytes: number; createdAt: string }> {
    if (!fs.existsSync(BACKUPS_DIR)) return [];
    const files = fs.readdirSync(BACKUPS_DIR);
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const filePath = path.resolve(BACKUPS_DIR, f);
        const stat = fs.statSync(filePath);
        return {
          filename: f,
          sizeBytes: stat.size,
          createdAt: stat.birthtime.toISOString(),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public restoreBackup(filenameOrContent: string, isRawJson: boolean = false): { success: boolean; message: string } {
    try {
      let raw: string;
      if (isRawJson) {
        raw = filenameOrContent;
      } else {
        const filePath = path.resolve(BACKUPS_DIR, filenameOrContent);
        if (!fs.existsSync(filePath)) {
          return { success: false, message: 'Ficheiro de cópia de segurança não encontrado.' };
        }
        raw = fs.readFileSync(filePath, 'utf-8');
      }

      const parsed = JSON.parse(raw) as DatabaseSchema;
      // Validação de integridade mínima
      if (!parsed.services || !parsed.users || !parsed.clients || !parsed.settings) {
        return { success: false, message: 'O ficheiro não contém uma estrutura de dados válida da Gráfica Palanga.' };
      }

      // Criar cópia de segurança do estado actual antes de restaurar
      this.createBackup('Sistema (Pré-Restauração)');

      this.data = parsed;
      this.save();

      this.logAudit(
        'system',
        'Administrador',
        'admin',
        'RESTAURAR_BACKUP',
        'backup',
        'restore_operation',
        'Base de dados restaurada com sucesso a partir de cópia de segurança.'
      );

      return { success: true, message: 'Base de dados restaurada com sucesso.' };
    } catch (err: any) {
      return { success: false, message: `Falha ao restaurar: ${err.message || 'Erro desconhecido'}` };
    }
  }
}

export const db = new DatabaseManager();
