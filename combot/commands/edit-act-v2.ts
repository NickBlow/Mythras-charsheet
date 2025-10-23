// Edit-act command that unwinds the previous action
import {
  rulesEngine,
  CombatStateManager,
  type EnhancedCombatState,
} from "../rules";
import { processActV2 } from "./act-v2";

// Find and unwind the user's last action
function unwindLastAction(
  state: EnhancedCombatState,
  userId: string,
  username: string
): {
  unwoundState: EnhancedCombatState;
  lastActionIndex: number;
  undidChanges: string[];
} {
  // Deep clone the state
  const newState = JSON.parse(JSON.stringify(state)) as EnhancedCombatState;
  const undidChanges: string[] = [];

  // Find the last action by this user in the log
  let lastActionIndex = -1;
  for (let i = newState.log.length - 1; i >= 0; i--) {
    if (newState.log[i].includes(`**${username}**:`)) {
      lastActionIndex = i;
      break;
    }
  }

  if (lastActionIndex === -1) {
    // No previous action to unwind
    return { unwoundState: newState, lastActionIndex: -1, undidChanges: [] };
  }

  // Try to parse what happened from the log entries after the action
  const removedEntries: string[] = [];
  if (lastActionIndex >= 0) {
    // Collect the action and any immediately following system messages
    removedEntries.push(newState.log[lastActionIndex]);
    let checkIndex = lastActionIndex + 1;

    // Collect related system messages (damage, effects, etc.)
    while (
      checkIndex < newState.log.length &&
      (newState.log[checkIndex].startsWith("💥") || // Damage
        newState.log[checkIndex].startsWith("🎲") || // Rolls
        newState.log[checkIndex].startsWith("🛡️") || // Defense
        newState.log[checkIndex].startsWith("⚔️") || // Combat
        newState.log[checkIndex].startsWith("⚡") || // Special effects
        newState.log[checkIndex].startsWith("✨") || // Effects
        newState.log[checkIndex].startsWith("📌") || // Applied effects
        newState.log[checkIndex].includes("DEFEATED") || // Enemy defeated
        !newState.log[checkIndex].includes("**")) // Not a user action
    ) {
      removedEntries.push(newState.log[checkIndex]);
      checkIndex++;
    }

    // Parse damage dealt from log entries to attempt restoration
    removedEntries.forEach((entry) => {
      // Look for damage dealt
      const damageMatch = entry.match(/(\w+) takes (\d+) damage/);
      if (damageMatch) {
        const enemyName = damageMatch[1];
        const damage = parseInt(damageMatch[2]);
        // Find the enemy and restore HP
        const enemy = newState.enemies.find((e) => e.name.includes(enemyName));
        if (enemy) {
          enemy.damage = Math.max(0, enemy.damage - damage);
          undidChanges.push(`Restored ${damage} HP to ${enemyName}`);
        }
      }

      // Look for defeated enemies and resurrect them
      if (entry.includes("DEFEATED")) {
        const defeatedMatch = entry.match(/(\w+).*DEFEATED/);
        if (defeatedMatch) {
          const enemyName = defeatedMatch[1];
          const enemy = newState.enemies.find((e) =>
            e.name.includes(enemyName)
          );
          if (enemy && !enemy.alive) {
            enemy.alive = true;
            undidChanges.push(`Resurrected ${enemyName}`);
          }
        }
      }
    });

    // Remove all the related log entries
    newState.log.splice(lastActionIndex, removedEntries.length);
  }

  // Reset player's action points if they used any
  const player = newState.initiative.find((p) => p.userId === userId);
  if (player && player.actionPoints < player.maxActionPoints) {
    player.actionPoints = Math.min(
      player.maxActionPoints,
      player.actionPoints + 1
    );
    undidChanges.push(`Restored 1 action point to ${username}`);
  }

  console.log("Unwound entries:", removedEntries);
  console.log("Undid changes:", undidChanges);

  return { unwoundState: newState, lastActionIndex, undidChanges };
}

export async function processEditActV2(
  interaction: any,
  actionText: string,
  state: EnhancedCombatState,
  characterData: any,
  callGemini: (
    prompt: string,
    roll?: number,
    schema?: any,
    system?: string
  ) => Promise<any>
): Promise<{
  message: string;
  updatedState: EnhancedCombatState;
  needsFollowUp: boolean;
  isError?: boolean;
}> {
  const user = interaction.member?.user || interaction.user;

  // First, unwind the last action
  const { unwoundState, lastActionIndex, undidChanges } = unwindLastAction(
    state,
    user.id,
    user.username
  );

  if (lastActionIndex === -1) {
    return {
      message: "❌ No previous action found to edit.",
      updatedState: state,
      needsFollowUp: false,
      isError: true,
    };
  }

  // Now process the new action with the unwound state
  const result = await processActV2(
    interaction,
    actionText,
    unwoundState,
    characterData,
    callGemini
  );

  // Add a note that this was an edit
  const editNote = `📝 *Action edited by ${user.username}*`;
  result.updatedState.log.splice(lastActionIndex, 0, editNote);

  // Prepend edit notice to the response with details of what was unwound
  let editHeader = `✏️ **Previous action unwound**`;
  if (undidChanges.length > 0) {
    editHeader += `\n🔄 Reverted: ${undidChanges.join(", ")}`;
  }
  result.message = `${editHeader}\n\n${result.message}`;

  return result;
}
