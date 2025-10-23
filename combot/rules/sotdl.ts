import type {
  ParsedAction,
  RuleSystem,
  CharacterData,
  Enemy,
  AttackResolution,
} from "./types";

export class SotdlRules implements RuleSystem {
  name = "Shadow of the Demon Lord";

  getActionParsingPrompt(): string {
    return `Parse a Shadow of the Demon Lord combat action. Extract the attack attribute/skill (e.g., Strength for melee, Agility for ranged), any boons/banes mentioned, the target(s), and whether the attack is melee or ranged.`;
  }

  getActionParsingSchema(): any {
    return {
      type: "OBJECT",
      properties: {
        attackerAttribute: {
          type: "STRING",
          enum: ["Strength", "Agility", "Intellect", "Will"],
        },
        attackBonus: {
          type: "NUMBER",
          description: "Total attack modifier before boons/banes",
        },
        boons: { type: "NUMBER", nullable: true },
        banes: { type: "NUMBER", nullable: true },
        isRanged: { type: "BOOLEAN" },
        targetIds: { type: "ARRAY", items: { type: "STRING" } },
        playerRoll: {
          type: "NUMBER",
          nullable: true,
          description: "d20 result if provided",
        },
      },
      required: ["attackerAttribute", "attackBonus", "isRanged", "targetIds"],
    };
  }

  getEnemyCreationPrompt(): string {
    return `Create SotDL enemies with Defense, Health, and relevant attack traits. Use simple stat blocks suitable for quick play.`;
  }

  getEnemyCreationSchema(): any {
    return {
      type: "OBJECT",
      properties: {
        enemies: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              type: { type: "STRING", enum: ["MOOK", "COMBATANT", "BOSS"] },
              weapon: { type: "STRING" },
              actionPoints: { type: "NUMBER" },
              defense: { type: "NUMBER" },
              health: { type: "NUMBER" },
              skills: { type: "OBJECT" },
            },
            required: [
              "name",
              "type",
              "weapon",
              "actionPoints",
              "defense",
              "health",
            ],
          },
        },
      },
      required: ["enemies"],
    };
  }

  evaluateAttack(
    action: ParsedAction,
    attackerData: CharacterData | null,
    enemies: Enemy[],
    rolls: { attack: number; defense: number[] }
  ): AttackResolution[] {
    // Placeholder to satisfy interface; actual SotDL implementation will normalize to AttackResolution
    return [];
  }

  resolveDamage(
    damageRoll: number,
    targetId: string,
    location?: string,
    weaponSize?: string
  ): number {
    return damageRoll;
  }

  resolveSpecialEffect(
    effect: string,
    attackerId: string,
    targetId: string
  ): void {
    // No-op placeholder for now
  }

  calculateParryDamageReduction(
    attackerWeaponSize: string,
    defenderWeaponSize: string,
    baseDamage: number
  ): number {
    // SotDL doesn't use this mechanic; return base damage (no reduction)
    return baseDamage;
  }
}

export const sotdlRules = new SotdlRules();
