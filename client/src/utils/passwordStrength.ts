export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export interface PasswordRule {
  label: string;
  met:   boolean;
}

const STRENGTH_LEVELS: PasswordStrength[] = [
  { score: 0, label: '',       color: '#e5e7eb' },
  { score: 1, label: 'Weak',   color: '#ef4444' },
  { score: 2, label: 'Fair',   color: '#f97316' },
  { score: 3, label: 'Good',   color: '#eab308' },
  { score: 4, label: 'Strong', color: '#22c55e' },
];

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8)          score++;
  if (/[A-Z]/.test(password))        score++;
  if (/[0-9]/.test(password))        score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  return STRENGTH_LEVELS.find(l => l.score === score) ?? STRENGTH_LEVELS[0];
}

export function getPasswordRules(password: string): PasswordRule[] {
  return [
    { label: 'At least 8 characters',         met: password.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'At least one number',           met: /[0-9]/.test(password) },
    { label: 'At least one special character', met: /[^A-Za-z0-9]/.test(password) },
  ];
}