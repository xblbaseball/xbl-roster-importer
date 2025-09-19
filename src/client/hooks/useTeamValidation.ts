import { useMemo } from 'react';
import { League, Team } from '../../shared/models/league';

export function useTeamValidation(
  selectedBuiltInLeague: League | undefined,
  selectedBuiltInTeam: Team | undefined,
  customTeam: Team | undefined
) {
  return useMemo(() => {
    // If we don't have all required selections, validation is not applicable
    if (!selectedBuiltInLeague || !selectedBuiltInTeam || !customTeam) {
      return {
        hasDuplicateTeamName: false,
        duplicateTeamError: null,
        isTeamValidationPassed: true
      };
    }

    // Check if the custom team name would create a duplicate in the built-in league
    // We need to exclude the currently selected built-in team since it will be replaced
    const otherTeamsInBuiltInLeague = selectedBuiltInLeague.teams.filter(
      team => team.guid !== selectedBuiltInTeam.guid
    );

    const hasDuplicateTeamName = otherTeamsInBuiltInLeague.some(
      team => team.name.toLowerCase() === customTeam.name.toLowerCase()
    );

    const duplicateTeamError = hasDuplicateTeamName 
      ? `Team name "${customTeam.name}" already exists in the "${selectedBuiltInLeague.name}" league. Please select a different custom team to avoid duplicate names.`
      : null;

    const isTeamValidationPassed = !hasDuplicateTeamName;

    return {
      hasDuplicateTeamName,
      duplicateTeamError,
      isTeamValidationPassed
    };
  }, [selectedBuiltInLeague, selectedBuiltInTeam, customTeam]);
}
