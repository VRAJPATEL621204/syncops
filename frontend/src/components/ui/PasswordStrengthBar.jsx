import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Very Weak', color: 'bg-red-500', textColor: 'text-red-400' };
  if (score === 2) return { score, label: 'Weak', color: 'bg-orange-500', textColor: 'text-orange-400' };
  if (score === 3) return { score, label: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-400' };
  if (score === 4) return { score, label: 'Strong', color: 'bg-green-500', textColor: 'text-green-400' };
  return { score, label: 'Very Strong', color: 'bg-emerald-500', textColor: 'text-emerald-400' };
};

export const passwordRequirements = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const PasswordStrengthBar = ({ password, showRequirements = true }) => {
  if (!password) return null;

  const { score, label, color, textColor } = getPasswordStrength(password);
  const filledBars = Math.max(1, score);

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bars */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= filledBars ? color : 'bg-[hsl(217,33%,15%)]'
              }`}
            />
          ))}
        </div>
        <span className={`text-xs font-medium ${textColor} min-w-[72px] text-right`}>
          {label}
        </span>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <div className="grid grid-cols-2 gap-1">
          {passwordRequirements.map((req) => {
            const passed = req.test(password);
            return (
              <div key={req.label} className="flex items-center gap-1.5">
                {passed ? (
                  <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                ) : (
                  <XCircle className="w-3 h-3 text-[hsl(215,20%,40%)] shrink-0" />
                )}
                <span className={`text-xs ${passed ? 'text-green-400' : 'text-[hsl(215,20%,45%)]'}`}>
                  {req.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthBar;
