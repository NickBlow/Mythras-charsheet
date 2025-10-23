// Refactored start-combat using the rules engine
import {
  rulesEngine,
  CombatStateManager,
  mythrasRules,
  type EnhancedCombatState,
} from "../rules";
import { createEnemiesViaLLM } from "../llm/parser";

const ENEMY_CREATION_SYSTEM_PROMPT = `You are creating enemies for a Star Wars Mythras encounter.
Rules:
- Use EXACT numbers if specified ("2 stormtroopers" = exactly 2)
- Do not embellish the names, use the names as given in the prompt. But mark them as X 1, X 2, etc. where X is the name (e.g. stormtrooper)
- Default to 4-5 mooks if no specifics given
- Specify weapon for each enemy (determines size)
- Specify armor type if any

ACTION POINTS (MUST BE WHOLE NUMBERS):
- MOOKs: 2 action points (or 1 if civilian)
- COMBATANTs: 2 action points (standard)
- BOSSes: 3 or more action points
- Elite/Named enemies: 3+ action points
- NEVER use fractions (no 0.5, 1.5, etc.)
- actionPoints MUST be an integer (1, 2, 3, 4, etc.)

Common enemies:
- Stormtrooper: COMBATANT, blaster_rifle, durasteel armor, 2 AP
- Battle Droid: MOOK, blaster_rifle, common armor, 2 AP
- Dark Trooper: COMBATANT, heavy_repeater, durasteel armor, 2 AP
- Sith Apprentice: BOSS, lightsaber, common armor, 3 AP
- Bounty Hunter: COMBATANT, various weapons, durasteel armor, 2 AP
- Thug/Pirate: MOOK, blaster_pistol, no armor, 2 AP`;

export async function createCombatEncounter(
  text: string,
  channelId: string,
  callGemini: (
    prompt: string,
    roll?: number,
    schema?: any,
    system?: string
  ) => Promise<any>
): Promise<EnhancedCombatState> {
  // Get enemy creation schema from rules engine
  let enemyData;
  try {
    enemyData = await createEnemiesViaLLM(
      text,
      mythrasRules,
      callGemini,
      ENEMY_CREATION_SYSTEM_PROMPT
    );
  } catch (error) {
    console.error("Failed to create enemies:", error);
    // Fallback to default enemies
    enemyData = {
      enemies: [
        {
          name: "Stormtrooper 1",
          type: "MOOK",
          weapon: "blaster_rifle",
          actionPoints: 2,
        },
        {
          name: "Stormtrooper 2",
          type: "MOOK",
          weapon: "blaster_rifle",
          actionPoints: 2,
        },
        {
          name: "Stormtrooper 3",
          type: "MOOK",
          weapon: "blaster_rifle",
          actionPoints: 2,
        },
      ],
    };
  }

  // Create enhanced combat state
  const combatId = Math.random().toString(36).substring(7);
  const stateManager = new CombatStateManager();

  // Convert enemies to enhanced format
  const enemies = enemyData.enemies.map((e: any, index: number) => {
    const weaponSize = getWeaponSize(e.weapon);
    // Use skills from Gemini or fall back to defaults
    const skills = e.skills || stateManager.generateEnemySkills(e.type);

    // Ensure action points are whole numbers
    const ap = Math.max(1, Math.round(e.actionPoints || 2));

    const enemy: any = {
      id: `enemy_${index}`,
      name: e.name,
      type: e.type,
      weapon: e.weapon,
      weaponSize,
      armorType: e.armorType || "none",
      actionPoints: ap,
      maxActionPoints: ap,
      damage: 0,
      afflictions: [],
      engaged: [],
      alive: true,
      skills,
    };

    // Add hit locations for all enemies (uniform logic)
    // Use Gemini-provided hit locations or generate defaults
    if (e.hitLocations) {
      const armorValues = stateManager.getArmorValues(e.armorType);
      enemy.hitLocations = {
        rightLeg: {
          maxHP: e.hitLocations.rightLeg || 6,
          currentHP: e.hitLocations.rightLeg || 6,
          armorPoints: armorValues.limbs,
          disabled: false,
        },
        leftLeg: {
          maxHP: e.hitLocations.leftLeg || 6,
          currentHP: e.hitLocations.leftLeg || 6,
          armorPoints: armorValues.limbs,
          disabled: false,
        },
        abdomen: {
          maxHP: e.hitLocations.abdomen || 7,
          currentHP: e.hitLocations.abdomen || 7,
          armorPoints: armorValues.torso,
          disabled: false,
        },
        chest: {
          maxHP: e.hitLocations.chest || 8,
          currentHP: e.hitLocations.chest || 8,
          armorPoints: armorValues.torso,
          disabled: false,
        },
        rightArm: {
          maxHP: e.hitLocations.rightArm || 5,
          currentHP: e.hitLocations.rightArm || 5,
          armorPoints: armorValues.limbs,
          disabled: false,
        },
        leftArm: {
          maxHP: e.hitLocations.leftArm || 5,
          currentHP: e.hitLocations.leftArm || 5,
          armorPoints: armorValues.limbs,
          disabled: false,
        },
        head: {
          maxHP: e.hitLocations.head || 6,
          currentHP: e.hitLocations.head || 6,
          armorPoints: armorValues.head,
          disabled: false,
        },
      };
    } else {
      enemy.hitLocations = stateManager.initializeBossHitLocations(e.armorType);
    }
    if (e.type === "BOSS") {
      enemy.unconscious = false;
    }

    return enemy;
  });

  const state: EnhancedCombatState = {
    id: combatId,
    channelId,
    round: 1,
    currentTurn: 0,
    initiative: [],
    enemies,
    log: [],
    pendingActions: [],
  };

  return state;
}

function getWeaponSize(weapon: string): "S" | "M" | "L" | "XL" {
  const weaponSizes: Record<string, "S" | "M" | "L" | "XL"> = {
    knife: "S",
    dagger: "S",
    vibroblade: "S",
    shoto: "M",
    blaster_pistol: "M",
    blaster_rifle: "M",
    lightsaber: "L",
    doublesaber: "L",
    electrostaff: "L",
    heavy_repeater: "L",
    sniper_rifle: "L",
    rocket: "XL",
    rancor_claw: "XL",
  };

  return weaponSizes[weapon.toLowerCase()] || "M";
}

// Format the enhanced state for display
export function formatEnhancedRoundTracker(state: EnhancedCombatState): {
  content: string;
  embeds: any[];
} {
  const embed = {
    title: `⚔️ Combat Round ${state.round}`,
    description: `**Combat ID:** \`${state.id}\``,
    fields: [
      {
        name: "📊 Initiative Order",
        value:
          state.initiative.length > 0
            ? state.initiative
                .map((p, i) => {
                  const marker = i === state.currentTurn ? "➤" : "　";
                  const ap = `${p.actionPoints}/${p.maxActionPoints} AP`;
                  const status = p.damage ? ` [${p.damage} dmg]` : "";
                  const pending = p.pendingAction ? " ⏳" : "";
                  return `${marker} **${p.name}** - ${ap}${status}${pending}`;
                })
                .join("\n")
            : "⚔️ **Combat Ready** - Players: Use `/combot initiative` to join!",
        inline: false,
      },
      {
        name: "👾 Enemies",
        value:
          state.enemies
            .filter((e) => e.alive)
            .map((e) => {
              const ap = `${e.actionPoints}/${e.maxActionPoints} AP`;
              const armor = e.armorType !== "none" ? ` [${e.armorType}]` : "";
              const afflictions =
                e.afflictions.length > 0
                  ? ` (${e.afflictions.join(", ")})`
                  : "";
              const damage = e.damage > 0 ? ` -${e.damage} HP` : "";

              let health = "";
              if (e.type === "BOSS" && e.hitLocations) {
                const disabled = Object.entries(e.hitLocations)
                  .filter(([_, loc]) => loc.disabled)
                  .map(([name]) => name);
                if (disabled.length > 0) {
                  health = ` [Disabled: ${disabled.join(", ")}]`;
                }
              }

              return `**${e.name}** (${e.type}) - ${e.weapon} ${ap}${armor}${damage}${afflictions}${health}`;
            })
            .join("\n") || "*None*",
        inline: false,
      },
    ],
    color: 0xff0000,
    footer: {
      text:
        state.initiative.length > 0
          ? `Current Turn: ${state.initiative[state.currentTurn]?.name || "Unknown"}`
          : "Waiting for players to join",
    },
  };

  // Add recent actions if any
  if (state.log.length > 0) {
    embed.fields.push({
      name: "📝 Recent Actions",
      value: state.log.join("\n") || "*None*",
      inline: false,
    });
  }

  // Add pending actions if any
  const allPending = [
    ...state.pendingActions,
    ...state.initiative
      .filter((p) => p.pendingAction)
      .map((p) => p.pendingAction!),
  ];

  if (allPending.length > 0) {
    const stateManager = new CombatStateManager();
    embed.fields.push({
      name: "⏳ Pending Actions",
      value: allPending
        .map((action) => {
          const player = state.initiative.find(
            (p) => p.userId === action.userId
          );
          const displayName =
            action.userId === "__GM__" ? "GM" : player?.name || "Unknown";
          return `**${displayName}**: ${stateManager.formatPendingAction(action)}`;
        })
        .join("\n\n"),
      inline: false,
    });
  }

  // Content with player ping
  let content = "";
  const currentPlayer = state.initiative[state.currentTurn];
  if (state.initiative.length > 0 && currentPlayer?.userId) {
    if (currentPlayer.pendingAction) {
      content = `<@${currentPlayer.userId}> complete your pending action!`;
    } else {
      content = `<@${currentPlayer.userId}> it's your turn!`;
    }
  } else if (state.initiative.length === 0) {
    content = "⚔️ **Combat Started!** Roll initiative to join the fight!";
  }

  // If any GM pending actions exist, append GM placeholder mention for replacement upstream
  const hasGmPending = allPending.some((a) => a.userId === "__GM__");
  if (hasGmPending) {
    content = content
      ? `${content} • @GM choose special effects`
      : `@GM choose special effects`;
  }

  return {
    content,
    embeds: [embed],
  };
}
