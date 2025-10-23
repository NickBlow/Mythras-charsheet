// Main rules engine that coordinates between LLM and rule evaluation
import { mythrasRules } from "./mythras/rules";
import {
  CombatStateManager,
  type EnhancedCombatState,
  type PendingAction,
} from "./mythras/combat-state";
import type {
  RuleSystem,
  AttackResolution,
  MythrasParsedAction,
  CharacterData,
} from "./mythras/types";

export * from "./mythras/types";
export * from "./mythras/combat-state";
export { mythrasRules } from "./mythras/rules";
export { sotdlRules } from "./sotdl";
export { CombatStateManager } from "./mythras/combat-state";

export class RulesEngine {
  private ruleSystem: RuleSystem;
  public stateManager: CombatStateManager;

  constructor(ruleSystem: RuleSystem = mythrasRules) {
    this.ruleSystem = ruleSystem;
    this.stateManager = new CombatStateManager();
  }

  // Get prompts for LLM
  getActionParsingPrompt(): string {
    return this.ruleSystem.getActionParsingPrompt();
  }

  getActionParsingSchema(): any {
    return this.ruleSystem.getActionParsingSchema();
  }

  getEnemyCreationPrompt(): string {
    return this.ruleSystem.getEnemyCreationPrompt();
  }

  getEnemyCreationSchema(): any {
    return this.ruleSystem.getEnemyCreationSchema();
  }

  // Process a combat action
  async processAction(
    actionText: string,
    userId: string,
    state: EnhancedCombatState,
    characterData: CharacterData | null,
    parsedAction: MythrasParsedAction | null
  ): Promise<{
    resolutions: AttackResolution[];
    updatedState: EnhancedCombatState;
    message: string;
    pendingActions?: PendingAction[];
    isError?: boolean;
  }> {
    // If no parsed action, can't proceed with attack
    if (!parsedAction) {
      return {
        resolutions: [],
        updatedState: state,
        message: "❌ Unable to parse action",
        pendingActions: [],
        isError: true,
      };
    }

    // Generate rolls
    const attackRoll = parsedAction.playerRoll || this.rollD100();
    const defenseRolls = parsedAction.enemyDefenses.map(() => this.rollD100());

    // Evaluate the attack using rule system
    const resolutions = this.ruleSystem.evaluateAttack(
      parsedAction,
      characterData,
      state.enemies,
      { attack: attackRoll, defense: defenseRolls }
    );

    // Apply resolutions to state
    const updatedState = this.applyResolutions(state, resolutions, userId);

    // Generate message
    const message = this.formatResolutions(resolutions, parsedAction);

    // Create pending actions if needed
    const pendingActions = this.createPendingActions(resolutions, userId);

    return {
      resolutions,
      updatedState,
      message,
      pendingActions,
    };
  }

  // Resolve a pending action (deterministic)
  async processPendingResolution(
    actionText: string,
    userId: string,
    state: EnhancedCombatState,
    pendingAction: PendingAction,
    resolution: {
      type: "damage" | "effect" | null;
      value:
        | string
        | number
        | { damage?: number; bypassArmor?: boolean }
        | { effects?: string[]; extraDamage?: number; bypassArmor?: boolean }
        | {
            lastingAfflictions?: string[];
            extraDamage?: number;
            bypassArmor?: boolean;
          };
    }
  ): Promise<any> {
    let message = "";
    const updatedState = { ...state };

    switch (pendingAction.type) {
      case "attack_result": {
        if (
          resolution.type !== "effect" ||
          typeof resolution.value !== "object"
        ) {
          message = "❌ Invalid response for attack result.";
          break;
        }
        const v: any = resolution.value || {};
        const damage: number | undefined =
          typeof v.damage === "number" ? v.damage : undefined;
        const effects: string[] = Array.isArray(v.lastingAfflictions)
          ? (v.lastingAfflictions as string[])
          : Array.isArray(v.effects)
            ? (v.effects as string[])
            : [];
        const extraDamage: number =
          typeof v.extraDamage === "number" ? v.extraDamage : 0;
        const bypassArmor: boolean = !!v.bypassArmor;

        let parts: string[] = [];

        // Target enemy
        let enemy = pendingAction.targetId
          ? updatedState.enemies.find((e) => e.id === pendingAction.targetId)
          : undefined;
        if (!enemy && pendingAction.targetId) {
          const searchTerm = pendingAction.targetId.toLowerCase();
          enemy = updatedState.enemies.find(
            (e) =>
              e.name.toLowerCase().includes(searchTerm) ||
              e.id.toLowerCase().includes(searchTerm)
          );
        }

        // Apply main damage
        const applyDamage = (amount: number): string => {
          if (!enemy || amount <= 0) return "";
          let finalDamage = amount;
          let loc: string | undefined;
          let armorReduced = false;

          if (enemy.hitLocations) {
            const locRoll = this.rollD20();
            loc = this.getHitLocation(locRoll);
            const key = this.getHitLocationKey(loc || "Body");
            const segment = enemy.hitLocations[key];
            if (segment) {
              if (!bypassArmor) {
                const ap = segment.armorPoints || 0;
                if (ap > 0) {
                  finalDamage = Math.max(0, finalDamage - ap);
                  armorReduced = finalDamage !== amount;
                }
              }
              segment.currentHP -= finalDamage;
              if (segment.currentHP <= 0) {
                segment.disabled = true;
                if (enemy.type === "BOSS") {
                  if (["head", "chest", "abdomen"].includes(key)) {
                    enemy.unconscious = true;
                    enemy.alive = false;
                  }
                } else {
                  enemy.alive = false;
                }
              }
            }
          } else {
            enemy.damage += finalDamage;
            if (enemy.type === "MOOK") enemy.alive = false;
          }

          const locLower = (loc || "").toLowerCase();
          let line = `${finalDamage} damage${locLower ? ` ${locLower}` : ""} to ${enemy.name}`;
          if (armorReduced) line += " (armor)";
          if (enemy && enemy.alive === false) line += ", defeated";
          return line;
        };

        if (typeof damage === "number") {
          const line = applyDamage(damage);
          if (line) parts.push(line);
        }

        if (extraDamage > 0) {
          const line = applyDamage(extraDamage);
          if (line) parts.push(line);
        }

        // Apply effects
        if (enemy && effects.length > 0) {
          effects.forEach((eff) => {
            if (eff && !enemy!.afflictions.includes(eff))
              enemy!.afflictions.push(eff);
          });
          parts.push(`+ ${effects.join(", ")}`);
        }

        message = parts.join(" \n");
        break;
      }

      default:
        message = "❌ Unsupported pending action.";
        break;
    }

    // Remove the pending action
    this.stateManager.resolvePendingAction(updatedState, pendingAction.id);

    // Update log
    updatedState.log.push(message);

    // Determine if this was an error based on resolution type
    const isError =
      !resolution.type ||
      (resolution.type === "damage" && typeof resolution.value !== "number") ||
      (resolution.type === "effect" && typeof resolution.value !== "string");

    return {
      resolutions: [],
      updatedState,
      message,
      pendingActions: [],
      isError,
    };
  }

  // Apply attack resolutions to combat state
  private applyResolutions(
    state: EnhancedCombatState,
    resolutions: AttackResolution[],
    userId: string
  ): EnhancedCombatState {
    const updatedState = { ...state };

    resolutions.forEach((resolution) => {
      // Try exact match first, then fuzzy match
      let enemy = updatedState.enemies.find(
        (e) => e.id === resolution.targetId
      );
      if (!enemy) {
        // Try matching by name (case-insensitive, partial match)
        const searchTerm = resolution.targetId.toLowerCase();
        enemy = updatedState.enemies.find(
          (e) =>
            e.name.toLowerCase().includes(searchTerm) ||
            e.id.toLowerCase().includes(searchTerm)
        );
      }
      if (!enemy) return;

      // Apply damage
      if (resolution.finalDamage > 0) {
        if (enemy.hitLocations && resolution.hitLocation) {
          // Apply to specific location
          const locationKey = this.getHitLocationKey(resolution.hitLocation);
          if (enemy.hitLocations[locationKey]) {
            enemy.hitLocations[locationKey].currentHP -= resolution.finalDamage;

            // Check for serious wound
            if (enemy.hitLocations[locationKey].currentHP <= 0) {
              enemy.hitLocations[locationKey].disabled = true;
              if (enemy.type === "BOSS") {
                // Check if vital location
                if (["head", "chest", "abdomen"].includes(locationKey)) {
                  enemy.unconscious = true;
                  enemy.alive = false;
                }
              } else {
                // For COMBATANT and other types with hit locations
                enemy.alive = false;
              }
            }
          }
        } else {
          // Simple damage
          enemy.damage += resolution.finalDamage;

          // Check death conditions
          if (enemy.type === "MOOK") {
            enemy.alive = false;
          }
        }
      }

      // Apply effects
      resolution.effects.forEach((effect) => {
        if (!enemy.afflictions.includes(effect)) {
          enemy.afflictions.push(effect);
        }
      });
    });

    // Update action points for acting player
    const player = updatedState.initiative.find((p) => p.userId === userId);
    if (player) {
      player.actionPoints = Math.max(0, player.actionPoints - 1);

      // Move to next turn if no AP
      if (player.actionPoints === 0) {
        updatedState.currentTurn =
          (updatedState.currentTurn + 1) % updatedState.initiative.length;
      }
    }

    return updatedState;
  }

  // Format resolutions into a message
  private formatResolutions(
    resolutions: AttackResolution[],
    parsedAction: MythrasParsedAction
  ): string {
    if (!resolutions || resolutions.length === 0) {
      return "⚔️ Action processed";
    }

    const lines: string[] = [];
    resolutions.forEach((r) => {
      const enemyId = r.targetId;
      const ad = r.attackDegree.toLowerCase();
      const dd = r.defenseDegree.toLowerCase();
      let line = `${r.attackRoll} vs ${r.defenseRoll} (${ad} vs ${dd})`;
      if (r.finalDamage > 0) {
        line += `, ${r.finalDamage} damage to ${enemyId}`;
      } else if (r.pendingChoices?.type === "damage") {
        line += `, hit`;
      }
      if (r.effects.includes("prone")) {
        line += `, prone`;
      }
      lines.push(line);
    });

    return lines.join("\n");
  }

  // Create pending actions from resolutions
  private createPendingActions(
    resolutions: AttackResolution[],
    userId: string
  ): PendingAction[] {
    const pendingActions: PendingAction[] = [];

    resolutions.forEach((resolution) => {
      const defenseSucceeded =
        (resolution.defenseType === "parry" ||
          resolution.defenseType === "evade") &&
        (resolution.defenseDegree === "success" ||
          resolution.defenseDegree === "critical");
      const attackSucceeded =
        resolution.attackDegree === "success" ||
        resolution.attackDegree === "critical";
      const parryBlocksCritDamage =
        resolution.defenseType === "parry" &&
        defenseSucceeded &&
        resolution.attackDegree === "critical";

      const wantDamage =
        resolution.needsDamageRoll === true ||
        (attackSucceeded && !defenseSucceeded && !parryBlocksCritDamage) ||
        (attackSucceeded &&
          resolution.defenseType === "parry" &&
          !parryBlocksCritDamage);

      const effectCount = Math.max(0, resolution.levelsOfSuccess || 0);

      if (wantDamage || effectCount > 0) {
        pendingActions.push({
          id: Math.random().toString(36).substring(7),
          type: "attack_result",
          userId,
          targetId: resolution.targetId,
          context: {
            specialEffectCount: effectCount,
            weaponDamage: resolution.pendingChoices?.options?.[0] || "1d8",
            attackRoll: resolution.attackRoll,
            defenseRoll: resolution.defenseRoll,
            defenseType: resolution.defenseType,
            defenseDegree: resolution.defenseDegree,
            weaponSize: resolution.weaponSize,
            enemyWeaponSize: resolution.enemyWeaponSize,
            parryFullyBlocked:
              resolution.defenseType === "parry" &&
              (resolution.defenseDegree === "success" ||
                resolution.defenseDegree === "critical") &&
              !resolution.needsDamageRoll,
            wantDamage,
          },
        });
      }
    });

    return pendingActions;
  }

  // Helper functions
  private rollD100(): number {
    return Math.floor(Math.random() * 100) + 1;
  }

  private rollD20(): number {
    return Math.floor(Math.random() * 20) + 1;
  }

  private rollDice(count: number, sides: number, modifier: number = 0): number {
    let total = modifier;
    for (let i = 0; i < count; i++) {
      total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
  }

  private parseSpecialEffectChoice(
    text: string,
    availableEffects: string[]
  ): string | null {
    // Try to match effect name
    const normalized = text.toLowerCase();
    for (const effect of availableEffects) {
      if (
        normalized.includes(effect.toLowerCase()) ||
        effect.toLowerCase().includes(normalized)
      ) {
        return effect;
      }
    }

    // Try to match by number
    const numberMatch = text.match(/\d+/);
    if (numberMatch) {
      const index = parseInt(numberMatch[0]) - 1;
      if (index >= 0 && index < availableEffects.length) {
        return availableEffects[index];
      }
    }

    return null;
  }

  private getHitLocation(roll: number): string {
    const locations = [
      { min: 1, max: 3, name: "Right Leg" },
      { min: 4, max: 6, name: "Left Leg" },
      { min: 7, max: 9, name: "Abdomen" },
      { min: 10, max: 12, name: "Chest" },
      { min: 13, max: 15, name: "Right Arm" },
      { min: 16, max: 18, name: "Left Arm" },
      { min: 19, max: 20, name: "Head" },
    ];

    const location = locations.find((l) => roll >= l.min && roll <= l.max);
    return location?.name || "Body";
  }

  private getHitLocationKey(name: string | undefined): string {
    const map: Record<string, string> = {
      "right leg": "rightLeg",
      "left leg": "leftLeg",
      abdomen: "abdomen",
      chest: "chest",
      "right arm": "rightArm",
      "left arm": "leftArm",
      head: "head",
      body: "chest",
    };
    if (!name) return "chest";
    const key = map[name.toLowerCase()] || "chest";
    return key;
  }
}

export const rulesEngine = new RulesEngine();
