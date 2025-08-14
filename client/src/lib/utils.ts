import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency
// Parse currency (converter texto para número)
export function parseCurrency(value: string | number): number {
  if (typeof value === 'number') return value;
  
  // Remove todos os caracteres que não são números, ponto ou vírgula
  const cleaned = value.replace(/[^\d.,]/g, '');
  
  // Converte virgula para ponto (padrão brasileiro para decimal)
  const normalized = cleaned.replace(/,/g, '.');
  
  // Converte para número
  const numValue = parseFloat(normalized);
  
  return isNaN(numValue) ? 0 : numValue;
}

export function formatCurrency(value: number | string, options: Intl.NumberFormatOptions = {}): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return 'R$ 0,00';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  }).format(numValue);
}

// Format short currency (for charts and compact displays)
export function formatShortCurrency(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return 'R$ 0';
  }
  
  if (Math.abs(numValue) >= 1_000_000) {
    return `R$ ${(numValue / 1_000_000).toFixed(1)}M`;
  } else if (Math.abs(numValue) >= 1_000) {
    return `R$ ${(numValue / 1_000).toFixed(1)}k`;
  } else {
    return `R$ ${numValue.toFixed(0)}`;
  }
}

// Format percentage
export function formatPercentage(value: number | string, options: Intl.NumberFormatOptions = {}): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0%';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  }).format(numValue / 100);
}

// Format percentage specifically for asset appreciation - 
// doesn't divide by 100 since values come directly from database
export function formatAppreciationPercentage(value: number | string, options: Intl.NumberFormatOptions = {}): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0%';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options
  }).format(numValue);
}

// Format date
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(dateObj);
}

// Calculate monthly payment with amortization
export function calculateMonthlyPayment(
  principal: number,
  downPaymentPercentage: number,
  numberOfMonths: number,
  monthlyInterestRate: number
): number {
  const downPayment = principal * (downPaymentPercentage / 100);
  const loanAmount = principal - downPayment;
  
  // Simple amortization (equal principal payments)
  const monthlyPrincipal = loanAmount / numberOfMonths;
  
  return monthlyPrincipal;
}

// Calculate future value with compound interest
export function calculateFutureValue(
  presentValue: number,
  interestRate: number,
  periods: number
): number {
  // Convert percentage to decimal
  const rate = interestRate / 100;
  
  // Calculate future value: PV * (1 + r)^n
  return presentValue * Math.pow(1 + rate, periods);
}

// Calculate IRR (Internal Rate of Return)
export function calculateIRR(cashflows: number[], maxIterations = 1000, precision = 0.000001): number {
  let guess = 0.1; // Initial guess
  
  for (let i = 0; i < maxIterations; i++) {
    const npv = calculateNPV(cashflows, guess);
    const derivative = calculateNPVDerivative(cashflows, guess);
    
    // Newton-Raphson method
    const newGuess = guess - npv / derivative;
    
    if (Math.abs(newGuess - guess) < precision) {
      return newGuess * 100; // Convert to percentage
    }
    
    guess = newGuess;
  }
  
  // If no convergence, return the last guess
  return guess * 100;
}

// Calculate NPV (Net Present Value)
function calculateNPV(cashflows: number[], rate: number): number {
  return cashflows.reduce((npv, cf, t) => npv + cf / Math.pow(1 + rate, t), 0);
}

// Calculate derivative of NPV for Newton-Raphson method
function calculateNPVDerivative(cashflows: number[], rate: number): number {
  return cashflows.reduce((d, cf, t) => d - (t * cf) / Math.pow(1 + rate, t + 1), 0);
}

// Calculate ROI (Return on Investment)
export function calculateROI(initialInvestment: number, finalValue: number): number {
  return ((finalValue - initialInvestment) / initialInvestment) * 100;
}

// Calculate payback period (in months)
export function calculatePayback(initialInvestment: number, monthlyCashflow: number[]): number {
  let cumulativeCashflow = -initialInvestment;
  let month = 0;
  
  for (let i = 0; i < monthlyCashflow.length; i++) {
    cumulativeCashflow += monthlyCashflow[i];
    
    if (cumulativeCashflow >= 0) {
      month = i + 1;
      break;
    }
  }
  
  return month;
}
