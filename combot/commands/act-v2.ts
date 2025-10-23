// Refactored act command using the rules engine
import {
  RulesEngine,
  mythrasRules,
  type EnhancedCombatState,
  type CharacterData,
} from "../rules";
import { parseActionMythras, parsePendingResolution } from "../llm/parser";

export async function processActV2(
  interaction: any,
  actionText: string,
  state: EnhancedCombatState,
  characterData: CharacterData | null,
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
  console.log("=== processActV2 START ===");
  console.log("Action text:", actionText);

  const user = interaction.member?.user || interaction.user;
  console.log("User ID:", user.id);

  const rulesEngine = new RulesEngine(mythrasRules);

  // Check for pending actions first
  const pendingAction = rulesEngine.stateManager.hasPendingAction(
    state,
    user.id
  );
  console.log("Pending action:", pendingAction);

  if (pendingAction) {
    console.log("Processing pending action type:", pendingAction.type);
    try {
      if (pendingAction.type === "attack_result") {
        const resolution = await parsePendingResolution(
          pendingAction,
          actionText,
          callGemini
        );
        if (resolution.type) {
          const res = await rulesEngine.processPendingResolution(
            actionText,
            user.id,
            state,
            pendingAction,
            resolution as any
          );
          return {
            message: res.message,
            updatedState: res.updatedState,
            needsFollowUp: false,
            isError: res.isError || false,
          };
        }
        return {
          message: `❌ Invalid response for pending action.\n${rulesEngine.stateManager.formatPendingAction(pendingAction)}`,
          updatedState: state,
          needsFollowUp: true,
          isError: true,
        };
      }
      // Check for combined pending actions (damage + effects)
      const playerPending = state.initiative.find(
        (p) => p.userId === user.id
      )?.pendingAction;
      const globalPendings = state.pendingActions.filter(
        (p) => p.userId === user.id
      );
      const allPendings = [pendingAction]
        .concat(
          playerPending && playerPending.id !== pendingAction.id
            ? [playerPending]
            : []
        )
        .concat(globalPendings)
        .filter(
          (p, idx, arr) => p && arr.findIndex((q) => q.id === p.id) === idx
        ) as any[];

      const damagePending = allPendings.find((p) => p.type === "roll_damage");
      const effectPending = allPendings.find(
        (p) => p.type === "choose_special_effect"
      );

      if (damagePending && effectPending) {
        const schema = {
          type: "OBJECT",
          properties: {
            damage: { type: "INTEGER", nullable: true },
            lastingAfflictions: {
              type: "ARRAY",
              items: { type: "STRING" },
              nullable: true,
            },
            extraDamage: { type: "INTEGER", nullable: true },
            bypassArmor: { type: "BOOLEAN", nullable: true },
          },
        };
        const prompt = `Extract both damage and any lasting afflictions from: "${actionText}". If none provided, omit fields.`;
        const systemPrompt =
          "You extract both damage (integer) and a list of lasting afflictions in one pass. Don't infer; only return what's stated.";

        const combined = await callGemini(prompt, 0, schema, systemPrompt);

        let updatedStateLocal = state;
        let messages: string[] = [];

        if (typeof combined?.damage === "number") {
          const res = await rulesEngine.processPendingResolution(
            actionText,
            user.id,
            updatedStateLocal,
            damagePending,
            {
              type: "damage",
              value: {
                damage: combined.damage,
                bypassArmor: !!combined?.bypassArmor,
              } as any,
            }
          );
          updatedStateLocal = res.updatedState;
          messages.push(res.message);
        }

        if (
          (Array.isArray(combined?.lastingAfflictions) &&
            combined.lastingAfflictions.length > 0) ||
          typeof combined?.extraDamage === "number"
        ) {
          const res = await rulesEngine.processPendingResolution(
            actionText,
            user.id,
            updatedStateLocal,
            effectPending,
            {
              type: "effect",
              value: {
                lastingAfflictions: combined.lastingAfflictions || [],
                extraDamage: combined.extraDamage || 0,
              } as any,
            }
          );
          updatedStateLocal = res.updatedState;
          messages.push(res.message);
        }

        return {
          message:
            messages.join("\n") ||
            `❌ Could not extract damage/effects from your response.`,
          updatedState: updatedStateLocal,
          needsFollowUp: false,
          isError: messages.length === 0,
        };
      }

      const resolution = await parsePendingResolution(
        pendingAction,
        actionText,
        callGemini
      );

      if (!resolution.type) {
        return {
          message: `❌ Invalid response for pending action.\n${rulesEngine.stateManager.formatPendingAction(pendingAction)}`,
          updatedState: state,
          needsFollowUp: true,
          isError: true,
        };
      }

      const result = await rulesEngine.processPendingResolution(
        actionText,
        user.id,
        state,
        pendingAction,
        resolution
      );

      return {
        message: result.message,
        updatedState: result.updatedState,
        needsFollowUp:
          (result.pendingActions && result.pendingActions.length > 0) || false,
        isError: result.isError || false,
      };
    } catch (error) {
      console.error("Error parsing pending action with LLM:", error);
      return {
        message: `❌ Failed to understand your response.\n${rulesEngine.stateManager.formatPendingAction(pendingAction)}`,
        updatedState: state,
        needsFollowUp: true,
        isError: true,
      };
    }
  }

  // Parse the action with LLM
  let parsedAction = await parseActionMythras(
    actionText,
    state,
    characterData,
    mythrasRules,
    callGemini
  );

  // Check if parsing failed
  if (
    !parsedAction ||
    !parsedAction.targetIds ||
    parsedAction.targetIds.length === 0
  ) {
    console.log("Debug: Parsing failed - no valid targets found");
    console.log("Debug: parsedAction structure:", {
      exists: !!parsedAction,
      targetIds: parsedAction?.targetIds,
      targetIdsLength: parsedAction?.targetIds?.length,
    });
    // If no valid combat action was parsed, check if there's a pending action
    const pendingMsg = pendingAction
      ? `\n\n**You have a pending action:**\n${rulesEngine.stateManager.formatPendingAction(pendingAction)}`
      : "";
    return {
      message: `❌ Could not understand that action. Try something like:\n• \`attack [enemy name]\`${pendingMsg}`,
      updatedState: state,
      needsFollowUp: !!pendingAction,
      isError: true,
    };
  }

  // Process the action through rules engine
  const result = await rulesEngine.processAction(
    actionText,
    user.id,
    state,
    characterData,
    parsedAction
  );

  // Add to combat log
  const logEntry = `**${user.username}**: ${actionText}`;
  result.updatedState.log.push(logEntry);

  // Add the combat resolution to the log
  if (result.message && result.message.trim() !== "") {
    result.updatedState.log.push(result.message);
  }

  // Format response message (ensure non-empty)
  let responseMessage = result.message || "⚔️ Action processed";

  // Add pending actions if any
  if (result.pendingActions && result.pendingActions.length > 0) {
    responseMessage += "\n\n**⏳ Action Required:**\n";
    result.pendingActions.forEach((action) => {
      // Map GM placeholder to visible text
      const line = rulesEngine.stateManager.formatPendingAction(action);
      responseMessage += line + "\n";
      // Store the pending action
      rulesEngine.stateManager.addPendingAction(result.updatedState, action);
    });

    responseMessage += "\n*Reply with your choice to continue*";
  }

  return {
    message: responseMessage,
    updatedState: result.updatedState,
    needsFollowUp:
      (result.pendingActions && result.pendingActions.length > 0) || false,
    isError: result.isError || false,
  };
}
