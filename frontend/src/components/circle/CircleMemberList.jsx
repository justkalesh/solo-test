import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import Badge from '../common/Badge';

/**
 * CircleMemberList — SoloSaathi Circle
 *
 * Renders the circle roster: members, Captain badge, gender ratio,
 * and current user indicator.
 */
export function CircleMemberList({
  members = [],
  captainId = null,
  currentUserId = null,
  maxCapacity = 24,
  level = 'intermediate',
}) {
  const theme = useTheme();
  const matchedLevel = theme.levels.find((l) => l.id === level) || theme.levels[1];

  return (
    <div style={{ width: '100%' }}>
      {/* Roster Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <span
          style={{
            fontFamily: theme.fonts.body,
            fontSize: '11.5px',
            fontWeight: 700,
            color: theme.colors.textLabel,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Circle Members ({members.length}/{maxCapacity})
        </span>

        <Badge color={matchedLevel.color} size="sm">
          {matchedLevel.label}
        </Badge>
      </div>

      {/* Member Cards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {members.map((member, idx) => {
          const isCaptain = member.isCaptain || member.registrationId === captainId;
          const isSelf = member.registrationId === currentUserId;

          return (
            <div
              key={member.registrationId || idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '12px',
                background: isSelf
                  ? 'rgba(227, 165, 66, 0.12)'
                  : isCaptain
                  ? 'rgba(245, 179, 1, 0.08)'
                  : 'rgba(36, 29, 61, 0.5)',
                border: isSelf
                  ? `0.5px solid ${theme.colors.amber}`
                  : isCaptain
                  ? `0.5px solid ${theme.colors.gold}66`
                  : theme.borders.subtle,
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isCaptain ? theme.gradients.goldPink : '#3A3257',
                    color: isCaptain ? '#1B1730' : theme.colors.textPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '13px',
                  }}
                >
                  {isCaptain ? '👑' : (member.name || 'Dancer')[0]?.toUpperCase()}
                </div>

                <div>
                  <div
                    style={{
                      fontFamily: theme.fonts.body,
                      fontWeight: 600,
                      fontSize: '13px',
                      color: theme.colors.textPrimary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{member.name || `Dancer ${idx + 1}`}</span>
                    {isSelf && (
                      <span style={{ fontSize: '11px', color: theme.colors.amber, fontWeight: 700 }}>
                        (You)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: theme.colors.textSecondary }}>
                    {isCaptain ? 'Circle Captain • Starting first round' : 'Solo Dancer'}
                  </div>
                </div>
              </div>

              {/* Status / Tag */}
              {isCaptain && (
                <Badge color={theme.colors.gold} size="sm">
                  Captain
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CircleMemberList;
