import { getTeamFlag } from '../utils/teamFlags';
import '../styles/teamFlag.css';

function TeamFlag({ teamName, size = 'md', showFallback = true }) {
  const flagSrc = getTeamFlag(teamName);

  if (!flagSrc && !showFallback) {
    return null;
  }

  if (!flagSrc) {
    return (
      <span
        className={`team-flag team-flag-${size} team-flag-fallback`}
        title={teamName || 'Seleção'}
        aria-label={teamName || 'Seleção'}
      >
        ?
      </span>
    );
  }

  return (
    <img
      src={flagSrc}
      alt={`Bandeira de ${teamName}`}
      title={teamName}
      className={`team-flag team-flag-${size}`}
      loading="lazy"
    />
  );
}

export default TeamFlag;