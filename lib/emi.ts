/**
 * EMI / loan amortization math. All amounts in integer paise, all rates in basis
 * points (1% = 100 bps) per annum. Reducing-balance method, the standard for
 * Indian loans.
 */

/** Monthly interest on the current outstanding balance. */
export function monthlyInterest(balancePaise: number, annualRateBps: number): number {
  const monthlyRate = annualRateBps / 10000 / 12;
  return Math.round(balancePaise * monthlyRate);
}

/**
 * Split a given EMI payment into interest + principal for the current balance.
 * Principal is capped at the outstanding balance (last EMI may be smaller).
 */
export function splitEmi(
  balancePaise: number,
  annualRateBps: number,
  emiPaise: number,
): { interestPaise: number; principalPaise: number } {
  const interestPaise = monthlyInterest(balancePaise, annualRateBps);
  let principalPaise = emiPaise - interestPaise;
  if (principalPaise < 0) principalPaise = 0;
  if (principalPaise > balancePaise) principalPaise = balancePaise;
  return { interestPaise, principalPaise };
}

/**
 * Compute the EMI for a loan from principal, annual rate (bps) and tenure months.
 * Useful when the user knows principal+rate+tenure but not the EMI.
 * EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 */
export function computeEmi(
  principalPaise: number,
  annualRateBps: number,
  tenureMonths: number,
): number {
  if (tenureMonths <= 0) return 0;
  const r = annualRateBps / 10000 / 12;
  if (r === 0) return Math.round(principalPaise / tenureMonths);
  const pow = Math.pow(1 + r, tenureMonths);
  return Math.round((principalPaise * r * pow) / (pow - 1));
}

/**
 * How many months until a loan is paid off, given the current balance, rate and
 * EMI (tenure-reduction mode, EMI held constant). Returns 0 if already cleared.
 * Returns Infinity if the EMI doesn't even cover monthly interest.
 */
export function monthsToPayoff(
  balancePaise: number,
  annualRateBps: number,
  emiPaise: number,
): number {
  if (balancePaise <= 0) return 0;
  const r = annualRateBps / 10000 / 12;
  if (r === 0) return Math.ceil(balancePaise / emiPaise);
  if (emiPaise <= balancePaise * r) return Infinity; // never amortizes
  // n = -ln(1 - P*r/EMI) / ln(1+r)
  const n = -Math.log(1 - (balancePaise * r) / emiPaise) / Math.log(1 + r);
  return Math.ceil(n);
}
