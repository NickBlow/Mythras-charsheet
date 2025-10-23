// Enhanced combat state to handle pending actions
export type PendingActionType =
  | "roll_damage"
  | "choose_special_effect"
  | "attack_result";

export interface PendingAction {
  id: string;
  type: PendingActionType;
  userId: string;
  targetId?: string;
  context: {
    weaponDamage?: string; // e.g., "1d8+2"
    specialEffectCount?: number;
    availableEffects?: string[];
    attackRoll?: number;
    defenseRoll?: number;
    defenseType?: "parry" | "evade";
    defenseDegree?: "critical" | "success" | "failure" | "fumble";
    weaponSize?: "S" | "M" | "L" | "XL";
    enemyWeaponSize?: "S" | "M" | "L" | "XL";
    parryFullyBlocked?: boolean;
    wantDamage?: boolean;
  };
  expiresAt?: number; // Timestamp for timeout
}

export interface EnhancedCombatState {
  id: string;
  channelId: string;
  messageId?: string;
  round: number;
  currentTurn: number;

  // Player data
  initiative: Array<{
    userId: string;
    name: string;
    roll: number;
    actionPoints: number;
    maxActionPoints: number;
    damage?: number;
    afflictions?: string[];
    lastAction?: string;
    pendingAction?: PendingAction; // Unresolved action for this player
  }>;

  // Enemy data
  enemies: Array<{
    id: string;
    name: string;
    type: "MOOK" | "COMBATANT" | "BOSS";
    weapon: string;
    weaponSize: "S" | "M" | "L" | "XL";
    armorType?: "none" | "common" | "durasteel" | "beskar";
    actionPoints: number;
    maxActionPoints: number;
    damage: number;
    afflictions: string[];
    engaged: string[]; // Player IDs engaged with
    alive: boolean;

    // BOSS-specific hit locations
    hitLocations?: {
      [key: string]: {
        maxHP: number; // Maximum Hit Points for this location
        currentHP: number; // Current Hit Points for this location
        armorPoints: number; // Armor Points (damage reduction) for this location
        disabled: boolean;
        shockTurns?: number;
      };
    };
    unconscious?: boolean;

    // Combat stats (auto-generated based on type)
    skills: {
      parry: number;
      evade: number;
      [key: string]: number; // Other skills as needed
    };
  }>;

  // Combat log
  log: string[];

  // Global pending actions (not tied to a specific player's turn)
  pendingActions: PendingAction[];
}

export class CombatStateManager {
  // Check if a player has pending actions
  hasPendingAction(
    state: EnhancedCombatState,
    userId: string
  ): PendingAction | null {
    const player = state.initiative.find((p) => p.userId === userId);
    if (player?.pendingAction) return player.pendingAction;

    return state.pendingActions.find((p) => p.userId === userId) || null;
  }

  // Add a pending action
  addPendingAction(state: EnhancedCombatState, action: PendingAction): void {
    const player = state.initiative.find((p) => p.userId === action.userId);
    if (player) {
      if (player.pendingAction) {
        // Already has one pending; queue additional in global list
        state.pendingActions.push(action);
      } else {
        player.pendingAction = action;
      }
    } else {
      state.pendingActions.push(action);
    }
  }

  // Resolve a pending action
  resolvePendingAction(state: EnhancedCombatState, actionId: string): void {
    // Remove from player
    const player = state.initiative.find(
      (p) => p.pendingAction?.id === actionId
    );
    if (player) {
      player.pendingAction = undefined;
      return;
    }

    // Remove from global
    state.pendingActions = state.pendingActions.filter(
      (a) => a.id !== actionId
    );
  }

  // Generate default skills for enemy based on type
  generateEnemySkills(
    type: "MOOK" | "COMBATANT" | "BOSS"
  ): Record<string, number> {
    const baseSkill = type === "MOOK" ? 50 : type === "COMBATANT" ? 60 : 75;

    return {
      parry: baseSkill,
      evade: baseSkill - 10, // Evade is typically lower
      endurance: baseSkill,
      willpower: baseSkill,
      perception: baseSkill,
      athletics: baseSkill - 5,
    };
  }

  // Initialize hit locations for BOSS
  initializeBossHitLocations(armorType?: string): any {
    const armorValues = this.getArmorValues(armorType);

    return {
      rightLeg: {
        maxHP: 6,
        currentHP: 6,
        armorPoints: armorValues.limbs,
        disabled: false,
      },
      leftLeg: {
        maxHP: 6,
        currentHP: 6,
        armorPoints: armorValues.limbs,
        disabled: false,
      },
      abdomen: {
        maxHP: 7,
        currentHP: 7,
        armorPoints: armorValues.torso,
        disabled: false,
      },
      chest: {
        maxHP: 8,
        currentHP: 8,
        armorPoints: armorValues.torso,
        disabled: false,
      },
      rightArm: {
        maxHP: 5,
        currentHP: 5,
        armorPoints: armorValues.limbs,
        disabled: false,
      },
      leftArm: {
        maxHP: 5,
        currentHP: 5,
        armorPoints: armorValues.limbs,
        disabled: false,
      },
      head: {
        maxHP: 6,
        currentHP: 6,
        armorPoints: armorValues.head,
        disabled: false,
      },
    };
  }

  // Get armor values by type
  getArmorValues(armorType?: string): {
    head: number;
    torso: number;
    limbs: number;
  } {
    switch (armorType) {
      case "durasteel":
        return { head: 6, torso: 6, limbs: 2 };
      case "beskar":
        return { head: 8, torso: 8, limbs: 8 };
      case "common":
        return { head: 2, torso: 3, limbs: 2 };
      default:
        return { head: 0, torso: 0, limbs: 0 };
    }
  }

  // Format pending action for display
  formatPendingAction(action: PendingAction): string {
    switch (action.type) {
      case "attack_result":
        return (
          `⚔️ Resolve attack` +
          (action.context.wantDamage
            ? `\n   Roll damage (e.g., "8 damage")`
            : "") +
          (action.context.specialEffectCount
            ? `\n   Choose ${action.context.specialEffectCount} special effect(s) (e.g., "bleed, impale")`
            : "") +
          `\n   You can reply in one message (e.g., "8 damage, bleed")`
        );
      case "roll_damage":
        return (
          `⚔️ **Roll damage**: ${action.context.weaponDamage || "weapon damage"}\n` +
          `   Use: \`/combot act [damage]\` (e.g., "/combot act 8 damage")`
        );
      case "choose_special_effect":
        return (
          `✨ **Choose ${action.context.specialEffectCount} special effect(s)**` +
          (action.context.defenseType === "parry" &&
          (action.context.defenseDegree === "success" ||
            action.context.defenseDegree === "critical")
            ? `\n   Parry outcome: ${action.context.parryFullyBlocked ? "fully blocked" : "partial block"}`
            : "") +
          `\n   Describe the effects and any extra damage (e.g., "Trip and 2 extra damage")`
        );
      default:
        return "❓ Pending action";
    }
  }

  // This is now handled by LLM parsing in act-v2.ts
  parsePendingResolution(actionText: string): {
    type: "damage" | "effect" | null;
    value: string | number;
  } {
    // This method is overridden in act-v2.ts with LLM parsing
    return { type: null, value: "" };
  }
}
