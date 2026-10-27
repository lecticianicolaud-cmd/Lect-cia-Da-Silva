import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../src/types';
import { db } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'palanga-super-secret-production-key-2025';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sessão não autorizada. Inicie sessão para continuar.' });
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; role: UserRole };
    const user = db.getData().users.find((u) => u.id === payload.id);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Utilizador inativo ou não encontrado.' });
    }

    req.user = {
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Token de sessão inválido ou expirado.' });
  }
}

export function authorizeRoles(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acesso negado. Esta operação requer perfil: ${roles.join(', ')}. O seu perfil é: ${req.user.role}.`,
      });
    }
    next();
  };
}

export async function verifyUserCredentials(identifier: string, passwordPlain: string): Promise<User | null> {
  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanNoDash = cleanId.replace(/[^a-z0-9]/g, '');

  const user = db.getData().users.find((u) => {
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

  if (!user || !user.active) return null;

  // Verificar se o PIN corresponde diretamente ou por hash
  const isDirectPinMatch = Boolean(user.pin && user.pin === passwordPlain);
  let isHashMatch = false;
  if (!isDirectPinMatch && user.passwordHash) {
    try {
      isHashMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
    } catch {
      isHashMatch = false;
    }
  }

  if (!isDirectPinMatch && !isHashMatch) {
    return null;
  }

  user.lastLogin = new Date().toISOString();
  db.save();

  return {
    id: user.id,
    employeeId: user.employeeId,
    name: user.name,
    email: user.email,
    pin: user.pin || '0000',
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  };
}
