import {
  Banknote,
  Car,
  CircleDot,
  Clapperboard,
  CreditCard,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  Plane,
  ShoppingBag,
  Utensils,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { AccountType } from '../features/accounts/api/accountsApi';

export function categoryIcon(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (/(food|dining|meal|grocery|restaurant|swiggy|zomato)/.test(n)) return Utensils;
  if (/(shop|amazon|retail|cloth)/.test(n)) return ShoppingBag;
  if (/(travel|flight|hotel|trip)/.test(n)) return Plane;
  if (/(transport|uber|ola|fuel|petrol|cab)/.test(n)) return Car;
  if (/(entertain|movie|music|game)/.test(n)) return Clapperboard;
  if (/(software|subscr|saas|app)/.test(n)) return Laptop;
  if (/(rent|home|house|housing)/.test(n)) return Home;
  if (/(health|medic|doctor|pharmacy)/.test(n)) return HeartPulse;
  if (/(salary|income|wage|payroll)/.test(n)) return Banknote;
  if (/(utilit|electric|bill|internet)/.test(n)) return Zap;
  return CircleDot;
}

export function accountIcon(type: AccountType): LucideIcon {
  switch (type) {
    case 'BANK':
      return Landmark;
    case 'CASH':
      return Banknote;
    case 'CREDIT_CARD':
      return CreditCard;
    case 'WALLET':
      return Wallet;
  }
}

export function accountGroup(type: AccountType): string {
  switch (type) {
    case 'BANK':
    case 'CASH':
      return 'Cash';
    case 'CREDIT_CARD':
      return 'Credit';
    case 'WALLET':
      return 'Wallets';
  }
}
