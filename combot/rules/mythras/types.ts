// Common types for all rule systems
export interface ParsedAction {
  actionType: "attack" | "damage" | "special_effect" | "other";
  attackerSkillKey?: string; // Key from character sheet
  targetIds: string[]; // IDs of enemies being targeted
  isAoE: boolean;
  playerRoll?: number; // If player mentioned their roll
  damageRoll?: number; // If resolving damage
  specialEffect?: string; // If resolving a special effect
  description: string; // Original action text
}

// Mythras-specific parsed action from LLM
export interface MythrasParsedAction {
  attackerSkillName: string;
  attackerSkillValue: number;
  weaponUsed: string;
  weaponSize: "S" | "M" | "L" | "XL";
  isRanged: boolean;
  isEnergy: boolean;
  targetIds: string[];
  isAoE: boolean;
  playerRoll?: number;
  enemyDefenses: MythrasEnemyDefense[];
}

export interface MythrasEnemyDefense {
  enemyId: string;
  canParry: boolean;
  mustEvade: boolean;
  weaponSize?: "S" | "M" | "L" | "XL";
  parrySkill: number;
  evadeSkill: number;
  armorByLocation?: {
    [key: string]: number;
  };
}

export interface EnemyDefense {
  enemyId: string;
  defenseType: "parry" | "evade" | "none";
  weaponSize?: "S" | "M" | "L" | "XL"; // For parrying
  skill: number; // Skill percentage for defense
  canDefend: boolean; // False if no AP, stunned, etc.
}

export interface AttackResolution {
  attackerId: string;
  targetId: string;
  attackRoll: number;
  attackSkill: number;
  attackDegree: "critical" | "success" | "failure" | "fumble";
  defenseRoll: number;
  defenseSkill: number;
  defenseType: "parry" | "evade";
  defenseDegree: "critical" | "success" | "failure" | "fumble";
  levelsOfSuccess: number; // For special effects
  effectsAwardedTo?: "attacker" | "defender"; // Who gets to pick effects
  baseDamage: number; // Base weapon damage
  damageBlocked: number; // From parry/armor
  finalDamage: number;
  needsDamageRoll?: boolean; // Whether a damage roll is required
  hitLocation?: string; // For BOSS enemies
  locationRoll?: number;
  effects: string[]; // Applied effects (prone, etc.)
  weaponSize?: "S" | "M" | "L" | "XL"; // Attacker's weapon size
  enemyWeaponSize?: "S" | "M" | "L" | "XL"; // Defender's weapon size
  pendingChoices?: {
    type: "damage" | "special_effect";
    options?: string[]; // For special effects
  };
}

// Character data from sheet
export interface CharacterData {
  id?: string;
  name?: string;
  skills?: Array<{
    name: string;
    value: number;
  }>;
  [key: string]: any;
}

// Enemy data structure
export interface Enemy {
  id: string;
  name: string;
  type: "MOOK" | "COMBATANT" | "BOSS";
  weapon: string;
  actionPoints: number;
  damage: number;
  alive: boolean;
  afflictions: string[];
  skills: {
    parry: number;
    evade: number;
    [key: string]: number;
  };
  hitLocations?: {
    [key: string]: {
      currentHP: number;
      maxHP: number;
      armorPoints: number;
      disabled?: boolean;
    };
  };
  unconscious?: boolean;
}

export interface RuleSystem {
  name: string;

  // Schema for LLM to parse actions
  getActionParsingPrompt(): string;
  getActionParsingSchema(): any; // JSON schema for structured output

  // Schema for enemy creation
  getEnemyCreationPrompt(): string;
  getEnemyCreationSchema(): any;

  // Core rule evaluation
  evaluateAttack(
    action: ParsedAction | MythrasParsedAction,
    attackerData: CharacterData | null,
    enemies: Enemy[],
    rolls: { attack: number; defense: number[] }
  ): AttackResolution[];

  // Damage resolution
  resolveDamage(
    damageRoll: number,
    targetId: string,
    location?: string,
    weaponSize?: string
  ): number;

  // Special effect resolution
  resolveSpecialEffect(
    effect: string,
    attackerId: string,
    targetId: string
  ): void;

  // Optional system-specific logic
  calculateParryDamageReduction(
    attackerWeaponSize: string,
    defenderWeaponSize: string,
    baseDamage: number
  ): number;
}
