import { getPasswordStrength, getPasswordRules } from '../utils/passwordStrength';

interface Props {
  password: string;
}

export default function PasswordStrengthMeter({ password }: Props) {
  if (password.length === 0) return null;

  const strength = getPasswordStrength(password);
  const rules     = getPasswordRules(password);

  return (
    <>
      <div style={styles.strengthContainer}>
        <div style={styles.strengthBar}>
          {[1, 2, 3, 4].map(level => (
            <div
              key={level}
              style={{
                ...styles.strengthSegment,
                background: strength.score >= level ? strength.color : '#e5e7eb',
              }}
            />
          ))}
        </div>
        {strength.label && (
          <span style={{ ...styles.strengthLabel, color: strength.color }}>
            {strength.label}
          </span>
        )}
      </div>

      <div style={styles.rulesBox}>
        {rules.map(rule => (
          <div key={rule.label} style={styles.rule}>
            <span style={{
              ...styles.ruleIcon,
              color: rule.met ? '#22c55e' : '#9ca3af',
            }}>
              {rule.met ? '✓' : '○'}
            </span>
            <span style={{
              ...styles.ruleLabel,
              color: rule.met ? '#166534' : '#6b7280',
            }}>
              {rule.label}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  strengthContainer: {
    display:    'flex',
    alignItems: 'center',
    gap:        '0.75rem',
    marginTop:  '0.5rem',
  },
  strengthBar: {
    display: 'flex',
    gap:     '4px',
    flex:    1,
  },
  strengthSegment: {
    flex:         1,
    height:       '4px',
    borderRadius: '2px',
    transition:   'background 0.3s',
  },
  strengthLabel: {
    fontSize:   '0.75rem',
    fontWeight: 500,
    minWidth:   '48px',
  },
  rulesBox: {
    background:    '#f9fafb',
    border:        '1px solid #e5e7eb',
    borderRadius:  '8px',
    padding:       '0.75rem',
    marginTop:     '0.5rem',
    display:       'flex',
    flexDirection: 'column',
    gap:           '0.4rem',
  },
  rule: {
    display:    'flex',
    alignItems: 'center',
    gap:        '0.5rem',
  },
  ruleIcon: {
    fontSize:   '0.875rem',
    fontWeight: 700,
    width:      '16px',
  },
  ruleLabel: {
    fontSize: '0.8rem',
  },
};