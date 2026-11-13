import React from 'react';
import { FOOD_ICON_MAP } from '../constants/foodCatalog.js';

function SvgFoodArt({ iconKey }) {
  switch (iconKey) {
    case 'rice':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <defs>
            <linearGradient id="riceBowl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#DDD6FE" />
            </linearGradient>
          </defs>
          <path d="M12 32c0 12 8 20 20 20s20-8 20-20H12z" fill="url(#riceBowl)" stroke="#A78BFA" strokeWidth="2" />
          <ellipse cx="32" cy="30" rx="18" ry="8" fill="#FFFDF8" />
          <path d="M18 29c2-7 8-12 14-12s12 5 14 12" fill="#FFFBEB" />
          <ellipse cx="38" cy="25" rx="7" ry="4.5" fill="#EA580C" />
          <circle cx="25" cy="26" r="4" fill="#22C55E" />
          <circle cx="32" cy="22" r="3" fill="#FACC15" />
        </svg>
      );
    case 'seafood':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <path d="M16 38c0-10 9-18 20-18 8 0 14 4 16 10-4 2-7 5-8 9-3 6-10 9-17 9-6 0-11-4-11-10z" fill="#FB7185" />
          <path d="M22 36c4-8 14-12 22-9" stroke="#FDA4AF" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M48 26l8-6M49 31l9-1" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="44" cy="27" r="2" fill="#1F2937" />
          <path d="M14 42c-3 2-5 5-4 8 3 1 7-1 9-4" fill="#F43F5E" />
        </svg>
      );
    case 'steak':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <ellipse cx="32" cy="36" rx="24" ry="15" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
          <path d="M17 35c0-8 7-13 15-13 9 0 16 4 16 11 0 6-6 11-15 11-9 0-16-3-16-9z" fill="#9A3412" />
          <path d="M23 30l12 8M29 27l12 8" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="22" cy="40" r="3.5" fill="#22C55E" />
          <circle cx="42" cy="28" r="3" fill="#FACC15" />
        </svg>
      );
    case 'salad':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <path d="M11 33c0 12 9 20 21 20s21-8 21-20H11z" fill="#DCFCE7" stroke="#4ADE80" strokeWidth="2" />
          <circle cx="23" cy="29" r="7" fill="#4ADE80" />
          <circle cx="34" cy="26" r="8" fill="#22C55E" />
          <circle cx="42" cy="30" r="6" fill="#86EFAC" />
          <circle cx="28" cy="24" r="3.5" fill="#EF4444" />
          <circle cx="38" cy="29" r="3" fill="#F97316" />
          <ellipse cx="22" cy="32" rx="4" ry="2.5" fill="#A3E635" />
        </svg>
      );
    case 'friedchicken':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <rect x="16" y="24" width="32" height="24" rx="5" fill="#EF4444" />
          <path d="M16 32h32v5H16z" fill="#FEF2F2" />
          <path d="M20 24c0-7 6-12 12-12s12 5 12 12" fill="#F59E0B" />
          <circle cx="25" cy="19" r="4.5" fill="#D97706" />
          <circle cx="37" cy="18" r="5" fill="#FBBF24" />
          <circle cx="32" cy="15" r="4" fill="#F59E0B" />
        </svg>
      );
    case 'cantonese':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <ellipse cx="32" cy="40" rx="22" ry="11" fill="#E9D5FF" stroke="#A855F7" strokeWidth="2" />
          <path d="M18 38c0-9 6-16 14-16s14 7 14 16H18z" fill="#FFF7ED" />
          <path d="M24 26c3-3 13-3 16 0" stroke="#FDBA74" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="27" cy="34" r="2.5" fill="#FB7185" />
          <circle cx="37" cy="34" r="2.5" fill="#FB7185" />
        </svg>
      );
    case 'malatang':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <path d="M12 31c0 12 8 21 20 21s20-9 20-21H12z" fill="#DC2626" />
          <ellipse cx="32" cy="31" rx="20" ry="7" fill="#F97316" />
          <circle cx="24" cy="30" r="4" fill="#FDE047" />
          <circle cx="33" cy="28" r="4" fill="#22C55E" />
          <circle cx="40" cy="31" r="3.5" fill="#FEF2F2" />
          <path d="M22 14l5 12M42 14l-5 12" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'pho':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <path d="M11 32c0 12 9 20 21 20s21-8 21-20H11z" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
          <ellipse cx="32" cy="32" rx="19" ry="6" fill="#FDE68A" />
          <path d="M18 32c5-3 9 3 14 0s9-3 14 0" stroke="#FFFBEB" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="25" cy="29" r="3" fill="#EF4444" />
          <circle cx="38" cy="29" r="3" fill="#22C55E" />
        </svg>
      );
    case 'fruit':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <path d="M16 38c6-12 26-12 32 0l-16 14-16-14z" fill="#22C55E" />
          <path d="M19 37c5-9 21-9 26 0l-13 11-13-11z" fill="#FB7185" />
          <circle cx="28" cy="35" r="1.4" fill="#1F2937" />
          <circle cx="35" cy="36" r="1.4" fill="#1F2937" />
          <circle cx="32" cy="40" r="1.4" fill="#1F2937" />
          <circle cx="44" cy="20" r="7" fill="#FACC15" />
        </svg>
      );
    case 'coffee':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <path d="M18 24h24l-3 26H21l-3-26z" fill="#F5F3FF" stroke="#8B5CF6" strokeWidth="2" />
          <path d="M16 20h28v5H16z" fill="#DDD6FE" rx="2" />
          <path d="M22 14h20l-2 6H24l-2-6z" fill="#A78BFA" />
          <circle cx="30" cy="37" r="6" fill="#92400E" />
          <path d="M27 37c1.5-2 4.5-2 6 0" stroke="#FEF3C7" strokeWidth="1.5" fill="none" />
        </svg>
      );
    case 'bakery':
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <path d="M12 38c0-10 8-18 20-18s20 8 20 18c0 5-4 8-20 8s-20-3-20-8z" fill="#F59E0B" />
          <path d="M18 33c3-6 25-6 28 0" fill="#FCD34D" />
          <path d="M24 25l3 6M33 24l2 7M41 26l-2 6" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'shop':
    default:
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <rect x="14" y="28" width="36" height="24" rx="4" fill="#F5F3FF" stroke="#8B5CF6" strokeWidth="2" />
          <path d="M10 28l6-12h32l6 12c0 4-4 6-7 6s-6-2-7-5c-1 3-4 5-8 5s-7-2-8-5c-1 3-4 5-7 5s-7-2-7-6z" fill="#8B5CF6" />
          <rect x="26" y="37" width="12" height="15" rx="2" fill="#C4B5FD" />
          <circle cx="35" cy="44" r="1.5" fill="#6D28D9" />
        </svg>
      );
  }
}

export function FoodIcon({ iconKey, size = 32, className = '', alt = '' }) {
  const entry = FOOD_ICON_MAP[iconKey] || FOOD_ICON_MAP.shop;
  if (entry.type === 'image') {
    return (
      <img
        src={entry.src}
        alt={alt || entry.label}
        width={size}
        height={size}
        draggable={false}
        style={{ width: size, height: size }}
        className={`object-contain select-none pointer-events-none ${className}`}
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
    >
      <SvgFoodArt iconKey={entry.key} />
    </span>
  );
}
