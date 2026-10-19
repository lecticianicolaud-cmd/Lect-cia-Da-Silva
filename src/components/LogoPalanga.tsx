import React from 'react';

interface LogoPalangaProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light-bg' | 'dark-bg';
  className?: string;
  showDetails?: boolean;
  logoUrl?: string;
}

export const LogoPalanga: React.FC<LogoPalangaProps> = ({
  size = 'md',
  variant = 'light-bg',
  className = '',
  showDetails = true,
  logoUrl,
}) => {
  let width = 260;
  let height = 82;

  if (size === 'sm') {
    width = 236;
    height = 75;
  } else if (size === 'md') {
    width = 280;
    height = 89;
  } else if (size === 'lg') {
    width = 380;
    height = 121;
  } else if (size === 'xl') {
    width = 520;
    height = 165;
  }

  // Se tiver um ficheiro de imagem original carregado, renderiza a imagem real directamente
  if (logoUrl) {
    return (
      <div className={`inline-flex items-center justify-center ${variant === 'dark-bg' ? 'bg-white rounded-lg p-1.5 shadow-xs' : ''} ${className}`}>
        <img
          src={logoUrl}
          alt="Logótipo Oficial Gráfica Palanga — P&Com"
          style={{ width, height: 'auto', maxHeight: height * 1.2 }}
          className="object-contain"
        />
      </div>
    );
  }

  const containerClasses =
    variant === 'dark-bg'
      ? 'bg-white rounded-lg p-2 shadow-xs'
      : 'bg-transparent';

  return (
    <div className={`inline-flex flex-col items-center justify-center select-none ${containerClasses} ${className}`}>
      <svg
        viewBox="0 0 520 165"
        width={width}
        height={height}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="max-w-full h-auto"
        aria-label="Logótipo Oficial Gráfica Palanga — P&Com"
      >
        <defs>
          {/* Gradiente Original Ciano-Azul Profundo com alto contraste desde a base */}
          <linearGradient id="palanga_primary_grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1A88C4" />
            <stop offset="30%" stopColor="#1075B0" />
            <stop offset="70%" stopColor="#08558C" />
            <stop offset="100%" stopColor="#023760" />
          </linearGradient>

          {/* Gradiente oficial para o [&] comercial */}
          <linearGradient id="ampersand_grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2198D6" />
            <stop offset="35%" stopColor="#147EB8" />
            <stop offset="75%" stopColor="#0A5B91" />
            <stop offset="100%" stopColor="#023B63" />
          </linearGradient>

          {/* Globo Terrestre no "o" */}
          <linearGradient id="globe_ocean" x1="25%" y1="20%" x2="80%" y2="85%">
            <stop offset="0%" stopColor="#3AB4EC" />
            <stop offset="45%" stopColor="#0D76B1" />
            <stop offset="85%" stopColor="#034571" />
            <stop offset="100%" stopColor="#012844" />
          </linearGradient>

          <radialGradient id="globe_light" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="30%" stopColor="#B3E5FC" stopOpacity="0.45" />
            <stop offset="65%" stopColor="#0C78B4" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
          </radialGradient>

          <filter id="clean_shadow" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="1" dy="2.5" stdDeviation="1.8" floodColor="#022B48" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* 1. Letra "P" MAIÚSCULA — Perfeitamente visível, com espessura marcante, contorno nítido e alto contraste */}
        <g filter="url(#clean_shadow)">
          <path
            d="M 12 14 L 74 14 C 95 14 106 25 106 45 C 106 65 95 76 74 76 L 42 76 L 42 100 L 12 100 Z M 42 34 L 42 56 L 68 56 C 75 56 80 52 80 45 C 80 38 75 34 68 34 Z"
            fill="url(#palanga_primary_grad)"
            stroke="#023760"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </g>

        {/* 2. O [&] autêntico comercial conforme solicitado expressamente pelo utilizador: [&] */}
        <g filter="url(#clean_shadow)">
          <text
            x="142"
            y="89"
            textAnchor="middle"
            fill="url(#ampersand_grad)"
            stroke="#023B63"
            strokeWidth="0.8"
            fontSize="94"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Arial Black', Arial, sans-serif"
          >
            &amp;
          </text>
        </g>

        {/* 3. Letra "C" — Sem alterações no desenho original */}
        <g filter="url(#clean_shadow)">
          <path
            d="M 284 37 C 274 21 257 14 238 14 C 204 14 178 35 178 63 C 178 91 204 104 238 104 C 257 104 275 96 284 80 L 263 68 C 257 78 249 83 238 83 C 220 83 206 73 206 58 C 206 43 220 34 238 34 C 249 34 257 39 263 48 Z"
            fill="url(#palanga_primary_grad)"
            stroke="#023760"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        </g>

        {/* 4. O Globo Terrestre no "o" com Órbitas e relevo — Sem alterações no desenho original */}
        <g transform="translate(332, 60)">
          {/* Órbita traseira */}
          <ellipse
            cx="0"
            cy="0"
            rx="48"
            ry="19"
            fill="none"
            stroke="#1988C2"
            strokeWidth="2.8"
            transform="rotate(-15)"
            strokeDasharray="95 15 25 15"
            opacity="0.75"
          />

          {/* Esfera Terrestre */}
          <circle cx="0" cy="0" r="35" fill="url(#globe_ocean)" />

          {/* Continentes detalhados em azul-celeste */}
          <g fill="#B8ECFF" opacity="0.9">
            {/* África e Europa */}
            <path d="M 6 -26 C 2 -25 -2 -22 1 -19 C 5 -16 9 -14 7 -9 C 5 -6 0 -5 1 2 C 2 9 9 15 9 22 C 7 26 3 28 2 30 C -2 29 -7 22 -5 17 C -3 10 -8 7 -6 1 C -5 -5 -1 -11 1 -16 C 0 -20 -4 -21 -1 -25 Z" />
            {/* Américas ao fundo */}
            <path d="M -20 -19 C -24 -15 -27 -8 -29 -1 C -30 7 -26 15 -20 22 C -23 16 -25 9 -24 1 C -23 -7 -19 -13 -16 -17 Z" />
            {/* Ásia */}
            <path d="M 13 -23 C 18 -21 24 -17 28 -11 C 25 -9 20 -10 18 -15 C 16 -14 14 -11 17 -8 C 22 -4 27 -6 30 1 C 29 6 25 11 21 15 C 19 11 20 7 17 3 C 15 0 12 -3 12 -10 C 12 -16 10 -19 13 -23 Z" />
          </g>

          {/* Brilho esférico radial tridimensional */}
          <circle cx="0" cy="0" r="35" fill="url(#globe_light)" />

          {/* Órbita dianteira proeminente */}
          <ellipse
            cx="0"
            cy="0"
            rx="48"
            ry="19"
            fill="none"
            stroke="#E1F5FE"
            strokeWidth="3.2"
            transform="rotate(-15)"
            strokeDasharray="70 145"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="48"
            ry="19"
            fill="none"
            stroke="#0C75AE"
            strokeWidth="2.2"
            transform="rotate(-15)"
            strokeDasharray="65 150"
          />
          {/* Ponto brilhante do satélite orbital */}
          <circle cx="39" cy="-15" r="3.2" fill="#FFFFFF" filter="url(#clean_shadow)" />
        </g>

        {/* 5. Letra "m" com arcos definidos — Sem alterações no desenho original */}
        <g filter="url(#clean_shadow)">
          <path
            d="M 390 31 L 415 31 L 415 44 C 421 34 431 31 441 31 C 452 31 460 35 464 45 C 472 34 483 31 494 31 C 511 31 520 42 520 60 L 520 100 L 495 100 L 495 64 C 495 55 491 50 484 50 C 477 50 472 55 472 64 L 472 100 L 447 100 L 447 64 C 447 55 443 50 436 50 C 429 50 424 55 424 64 L 424 100 L 399 100 L 399 50 L 390 50 Z"
            fill="url(#palanga_primary_grad)"
            stroke="#023760"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        </g>

        {/* 6. Linha horizontal com espaçamento harmonioso */}
        <line x1="10" y1="110" x2="512" y2="110" stroke="#0A5A8E" strokeWidth="2.5" strokeLinecap="round" />

        {showDetails && (
          <>
            {/* 7. Texto: Palanga - Comércio e Prestação de Serviços (SU), Lda. */}
            {/* O "P" de Palanga é destacado com ultra nitidez, peso extra e contraste máximo para total visibilidade */}
            <text
              x="18"
              y="137"
              textAnchor="start"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              letterSpacing="0.2"
            >
              <tspan fill="#001B33" fontWeight="950" fontSize="24">
                P
              </tspan>
              <tspan fill="#033257" fontWeight="750" fontSize="20">
                alanga - Comércio e Prestação de Serviços (SU), Lda.
              </tspan>
            </text>

            {/* 8. Lema: —— QUALIDADE • CONFIANÇA • SOLUÇÕES —— */}
            <g>
              <line x1="20" y1="153" x2="50" y2="153" stroke="#1889C5" strokeWidth="1.5" />
              <polygon points="50,153 45,151 45,155" fill="#1889C5" />

              <text
                x="260"
                y="157"
                textAnchor="middle"
                fill="#0E5E8F"
                fontSize="13"
                fontWeight="800"
                fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                letterSpacing="4.5"
              >
                QUALIDADE • CONFIANÇA • SOLUÇÕES
              </text>

              <line x1="470" y1="153" x2="500" y2="153" stroke="#1889C5" strokeWidth="1.5" />
              <polygon points="470,153 475,151 475,155" fill="#1889C5" />
            </g>
          </>
        )}
      </svg>
    </div>
  );
};
