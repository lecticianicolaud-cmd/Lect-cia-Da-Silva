import React from 'react';
import { LogoPalanga } from './LogoPalanga';

interface LogoReservedBoxProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light-bg' | 'dark-bg';
  className?: string;
  showDetails?: boolean;
  logoUrl?: string;
}

/**
 * Logótipo Oficial da Gráfica Palanga / P&Com — Activo e Integrado
 * Renderiza o logótipo oficial autorizado com o símbolo comercial [&] e o "P" de Palanga destacado com total nitidez.
 */
export const LogoReservedBox: React.FC<LogoReservedBoxProps> = ({
  size = 'md',
  variant = 'light-bg',
  className = '',
  showDetails = true,
  logoUrl,
}) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <LogoPalanga
        size={size}
        variant={variant}
        showDetails={showDetails}
        logoUrl={logoUrl}
      />
    </div>
  );
};
