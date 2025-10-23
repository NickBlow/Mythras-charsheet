import type {
  RuleSystem,
  ParsedAction,
  EnemyDefense,
  AttackResolution,
  MythrasParsedAction,
  MythrasEnemyDefense,
  CharacterData,
  Enemy,
} from "./types";

// Weapon sizes and their parry capabilities
const WEAPON_SIZES = {
  // Melee weapons
  unarmed: "S",
  knife: "S",
  dagger: "S",
  vibroblade: "S",
  shoto: "M",
  lightsaber: "L",
  doublesaber: "L",
  pike: "L",
  electrostaff: "L",
  greataxe: "XL",
  rancor_claw: "XL",

  // Ranged weapon force (for damage reduction)
  pistol: "M",
  blaster_pistol: "M",
  blaster_rifle: "M",
  heavy_repeater: "L",
  sniper_rifle: "L",
  bowcaster: "L",
  rocket: "XL",
} as const;

// Armor values by location and type
const ARMOR_VALUES = {
  common: { default: 2 },
  durasteel: { torso: 6, head: 6, limbs: 2 },
  beskar: { all: 8 },
} as const;

// Hit locations for humanoid BOSS enemies
const HIT_LOCATIONS = [
  { range: [1, 3], location: "rightLeg", name: "Right Leg" },
  { range: [4, 6], location: "leftLeg", name: "Left Leg" },
  { range: [7, 9], location: "abdomen", name: "Abdomen" },
  { range: [10, 12], location: "chest", name: "Chest" },
  { range: [13, 15], location: "rightArm", name: "Right Arm" },
  { range: [16, 18], location: "leftArm", name: "Left Arm" },
  { range: [19, 20], location: "head", name: "Head" },
];

// Special effects by level difference
const SPECIAL_EFFECTS = {
  offensive: [
    "Maximize Damage",
    "Bypass Armor",
    "Choose Location",
    "Disarm Opponent",
    "Trip Opponent",
    "Bleed",
    "Stun Location",
    "Compel Surrender",
  ],
  defensive: ["Enhance Parry", "Ward Location", "Prepare Counter", "Withdraw"],
};

export class MythrasRules implements RuleSystem {
  name = "Mythras Star Wars";

  private normalizePercent(
    value: number | undefined,
    fallback: number = 50
  ): number {
    if (typeof value !== "number" || Number.isNaN(value)) return fallback;
    if (value > 1) return Math.round(value);
    if (value > 0) return Math.round(value * 100);
    return fallback;
  }

  getActionParsingPrompt(): string {
    return `Parse this combat action into structured data. You are ONLY parsing, not evaluating rules.
    
Extract:
- What skill is being used (match to character's actual skill name)
- Which enemies are targeted (by name)
- Weapon being used and its size category
- Defense determination:
  * Battle Droids with blaster_rifles CANNOT parry energy attacks - they must EVADE
  * Only lightsaber-wielding enemies OR Beskar weapons can PARRY melee energy attacks. Only lightsabers can parry blasters.
  * All other enemies MUST EVADE energy attacks
- Enemy defense skills are INTEGERS: MOOK: 50%, COMBATANT: 60%, BOSS: 75%
- Do NOT use decimal values like 1.23 for skills - use proper percentages

Critical playerRoll extraction rules (d100):
- Extract the exact dice roll digits from text like "99 to hit", "01 to hit", "00".
- Preserve all digits; do NOT drop leading zeros. "01" => 1, "09" => 9, "99" => 99.
- Treat "00" as 100.
- Never convert the roll into a percentage; do not normalize it.
- Set this value in playerRoll and do not compute success/failure.

Targeting rules:
- If the action is NOT AoE, select exactly ONE target, even if the name matches multiple enemies (e.g., "kinrath"). Use the best single match.
`;
  }

  getActionParsingSchema(): any {
    return {
      type: "OBJECT",
      properties: {
        attackerSkillName: {
          type: "STRING",
          description:
            "EXACT skill name from character sheet - DO NOT INVENT (e.g., 'Lightsaber Combat Style' not 'Blaster Combat')",
        },
        attackerSkillValue: {
          type: "NUMBER",
          description:
            "Skill value from CHARACTER SHEET NOT from action text (e.g., 99 not 9)",
        },
        weaponUsed: {
          type: "STRING",
          description: "Weapon name (lightsaber, blaster_rifle, etc.)",
        },
        weaponSize: {
          type: "STRING",
          enum: ["S", "M", "L", "XL"],
        },
        isRanged: { type: "BOOLEAN" },
        isEnergy: { type: "BOOLEAN" },
        targetIds: {
          type: "ARRAY",
          items: { type: "STRING" },
        },
        isAoE: { type: "BOOLEAN" },
        playerRoll: {
          type: "NUMBER",
          nullable: true,
          description:
            "The dice roll from action text (e.g., 9 from '09 to hit') - NOT the skill value",
        },
        enemyDefenses: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              enemyId: { type: "STRING" },
              canParry: {
                type: "BOOLEAN",
                description: "Can they parry this attack?",
              },
              mustEvade: {
                type: "BOOLEAN",
                description:
                  "Must they evade (no AP, can't parry ranged, etc)?",
              },
              weaponSize: {
                type: "STRING",
                enum: ["S", "M", "L", "XL"],
                nullable: true,
              },
              parrySkill: {
                type: "NUMBER",
                description:
                  "Integer percentage (50, 60, 75, etc. NOT decimals)",
              },
              evadeSkill: {
                type: "NUMBER",
                description:
                  "Integer percentage (50, 60, 75, etc. NOT decimals)",
              },
              armorByLocation: {
                type: "OBJECT",
                properties: {
                  head: { type: "NUMBER", nullable: true },
                  chest: { type: "NUMBER", nullable: true },
                  abdomen: { type: "NUMBER", nullable: true },
                  rightArm: { type: "NUMBER", nullable: true },
                  leftArm: { type: "NUMBER", nullable: true },
                  rightLeg: { type: "NUMBER", nullable: true },
                  leftLeg: { type: "NUMBER", nullable: true },
                },
              },
            },
          },
        },
      },
      required: [
        "attackerSkillName",
        "attackerSkillValue",
        "weaponUsed",
        "weaponSize",
        "isRanged",
        "isEnergy",
        "targetIds",
        "enemyDefenses",
      ],
    };
  }

  getEnemyCreationPrompt(): string {
    return `Create enemies for this Star Wars encounter. For each enemy specify:
- Name and type (MOOK/COMBATANT/BOSS)
- Weapon (determines size: lightsaber=L, blaster=M, etc)
- Armor type if any (none/common/durasteel/beskar)
- Action Points (turns per round): MUST be whole numbers (1, 2, 3, etc.)
  * MOOKs: typically 1-2 action points
  * COMBATANTs: typically 2 action points
  * BOSSes: typically 3+ action points
- Skills based on type and specifics:
  * MOOK: Basic 40-60% skills
  * COMBATANT: Competent 50-70% skills  
  * BOSS: Elite 60-90% skills
  * Adjust based on description (elite stormtrooper > regular)
- Hit points for BOSS locations (if BOSS)

NOTE: Action Points = turns per round. NOT armor points (which reduce damage).`;
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
              type: {
                type: "STRING",
                enum: ["MOOK", "COMBATANT", "BOSS"],
              },
              weapon: {
                type: "STRING",
                description:
                  "Weapon name (lightsaber, blaster_rifle, vibroblade, etc)",
              },
              armorType: {
                type: "STRING",
                enum: ["none", "common", "durasteel", "beskar"],
                nullable: true,
              },
              actionPoints: {
                type: "NUMBER",
                description:
                  "Action Points = turns per round (MUST be whole number: 1, 2, 3, etc. No fractions!)",
              },
              skills: {
                type: "OBJECT",
                description: "Skill percentages for this enemy",
                properties: {
                  parry: {
                    type: "NUMBER",
                    description: "Parry skill % (melee defense)",
                  },
                  evade: {
                    type: "NUMBER",
                    description: "Evade skill % (dodge attacks)",
                  },
                  combat: {
                    type: "NUMBER",
                    description: "Primary combat skill %",
                  },
                  endurance: {
                    type: "NUMBER",
                    description: "Endurance % (resist wounds)",
                  },
                  willpower: {
                    type: "NUMBER",
                    description: "Willpower % (mental resistance)",
                  },
                },
                required: ["parry", "evade", "combat"],
              },
              hitLocations: {
                type: "OBJECT",
                nullable: true,
                description:
                  "Hit location HP (Hit Points, not Action/Armor Points) for BOSS enemies only",
                properties: {
                  head: {
                    type: "NUMBER",
                    description: "Hit Points for head (typically 6)",
                  },
                  chest: {
                    type: "NUMBER",
                    description: "Hit Points for chest (typically 8)",
                  },
                  abdomen: {
                    type: "NUMBER",
                    description: "Hit Points for abdomen (typically 7)",
                  },
                  rightArm: {
                    type: "NUMBER",
                    description: "Hit Points for right arm (typically 5)",
                  },
                  leftArm: {
                    type: "NUMBER",
                    description: "Hit Points for left arm (typically 5)",
                  },
                  rightLeg: {
                    type: "NUMBER",
                    description: "Hit Points for right leg (typically 6)",
                  },
                  leftLeg: {
                    type: "NUMBER",
                    description: "Hit Points for left leg (typically 6)",
                  },
                },
              },
            },
            required: ["name", "type", "weapon", "actionPoints", "skills"],
          },
        },
      },
      required: ["enemies"],
    };
  }

  calculateDegreeOfSuccess(
    roll: number,
    skill: number
  ): "critical" | "success" | "failure" | "fumble" {
    // Critical: <= one tenth of skill, rounded up
    const critThreshold = Math.max(1, Math.ceil(skill / 10));
    // Fumble: if skill > 100 then only 100 is fumble (00), otherwise 99 or 100
    if (roll === 100 && skill > 100) return "fumble";
    if (roll >= 99 && skill <= 100) return "fumble";

    if (roll <= critThreshold) return "critical";
    if (roll <= skill) return "success";
    return "failure";
  }

  calculateLevelsOfSuccess(
    attackDegree: string,
    defenseDegree: string
  ): number {
    // If the attack fails, no special effects are awarded
    if (attackDegree === "failure" || attackDegree === "fumble") return 0;
    const degrees = ["fumble", "failure", "success", "critical"];
    const attackLevel = degrees.indexOf(attackDegree);
    const defenseLevel = degrees.indexOf(defenseDegree);

    if (attackLevel < 0 || defenseLevel < 0) return 0;

    const difference = attackLevel - defenseLevel;
    return Math.max(0, difference);
  }

  calculateParryDamageReduction(
    attackerWeaponSize: string,
    defenderWeaponSize: string,
    baseDamage: number
  ): number {
    const sizes = ["S", "M", "L", "XL"];
    const attackSize = sizes.indexOf(attackerWeaponSize);
    const defenseSize = sizes.indexOf(defenderWeaponSize);

    if (defenseSize < 0 || attackSize < 0) return baseDamage;

    const sizeDiff = defenseSize - attackSize;

    if (sizeDiff >= 0) return 0; // Equal or greater size blocks all
    if (sizeDiff === -1) return Math.floor(baseDamage / 2); // One size smaller blocks half
    return baseDamage; // Two+ sizes smaller blocks nothing
  }

  evaluateAttack(
    action: MythrasParsedAction,
    attackerData: CharacterData | null,
    enemies: Enemy[],
    rolls: { attack: number; defense: number[] }
  ): AttackResolution[] {
    const results: AttackResolution[] = [];

    // Normalize skill percentages (LLM may return 0.99 instead of 99)
    const attackSkill = this.normalizePercent(action.attackerSkillValue, 50);
    const attackRoll = action.playerRoll || rolls.attack;
    const attackDegree = this.calculateDegreeOfSuccess(attackRoll, attackSkill);

    console.log(
      `Evaluating attack: skill=${attackSkill}%, roll=${attackRoll}, degree=${attackDegree}`
    );

    // Process each target (if not AoE, restrict to the first defense)
    const defenses = action.isAoE
      ? action.enemyDefenses
      : action.enemyDefenses.slice(0, 1);

    defenses.forEach((defense: MythrasEnemyDefense, index: number) => {
      // Try exact match first, then fuzzy match
      let enemy = enemies.find((e) => e.id === defense.enemyId);
      if (!enemy) {
        // Try matching by name (case-insensitive, partial match)
        const searchTerm = defense.enemyId.toLowerCase();
        enemy = enemies.find(
          (e) =>
            e.name.toLowerCase().includes(searchTerm) ||
            e.id.toLowerCase().includes(searchTerm)
        );
      }
      if (!enemy) return;

      const defenseRoll = rolls.defense[index];
      const defenseType: "evade" | "parry" = defense.mustEvade
        ? "evade"
        : "parry";
      let defenseSkill = this.normalizePercent(
        defense.mustEvade ? defense.evadeSkill : defense.parrySkill,
        50
      );
      // If attempting to defend without AP, auto-fail the defense
      if (
        (defenseType === "parry" || defenseType === "evade") &&
        enemy.actionPoints <= 0
      ) {
        defenseSkill = 0;
      }
      const defenseDegree = this.calculateDegreeOfSuccess(
        defenseRoll,
        defenseSkill
      );

      // Reduce enemy AP for defending
      if (enemy.actionPoints > 0) {
        enemy.actionPoints -= 1;
      }

      const levelsOfSuccessRaw = this.calculateLevelsOfSuccess(
        attackDegree,
        defenseDegree
      );
      let levelsOfSuccess = levelsOfSuccessRaw;
      let effectsAwardedTo: "attacker" | "defender" | undefined = undefined;
      const degrees = ["fumble", "failure", "success", "critical"] as const;
      const aL = degrees.indexOf(attackDegree as any);
      const dL = degrees.indexOf(defenseDegree as any);
      if (aL > dL) {
        effectsAwardedTo = "attacker";
        levelsOfSuccess = aL - dL;
      } else if (dL > aL) {
        effectsAwardedTo = "defender";
        levelsOfSuccess = dL - aL;
      } else {
        levelsOfSuccess = 0;
      }

      // Calculate if hit
      let hit = false;
      let needsDamageRoll = false;
      let damageBlocked = 0;
      let finalDamage = 0;
      let hitLocation: string | undefined;
      let locationRoll: number | undefined;

      if (attackDegree === "success" || attackDegree === "critical") {
        // Hit! Check defense
        if (
          defenseType === "parry" &&
          (defenseDegree === "success" || defenseDegree === "critical")
        ) {
          // Successful parry
          // Critical attack vs successful parry: NO damage, only specials
          if (attackDegree === "critical") {
            hit = false;
            needsDamageRoll = false;
          } else {
            // For non-crit attacks, check weapon size to decide if any damage can get through
            const sizes = ["S", "M", "L", "XL"] as const;
            const atkIdx = sizes.indexOf(action.weaponSize as any);
            const defIdx = sizes.indexOf((defense.weaponSize || "M") as any);
            const sizeDiff = defIdx - atkIdx; // >=0 means defender equal/larger
            if (sizeDiff >= 0) {
              // Equal or larger parry blocks all damage → no damage roll
              hit = false;
              needsDamageRoll = false;
            } else {
              // Smaller parrying weapon: reduced or full damage → need damage roll
              hit = true;
              needsDamageRoll = true;
            }
          }
        } else if (
          defenseType === "evade" &&
          (defenseDegree === "success" || defenseDegree === "critical")
        ) {
          // Successful evade = no damage but prone
          hit = false;
        } else {
          // Failed defense or no defense
          hit = true;
          needsDamageRoll = true;
        }
      }

      // Determine effects
      const effects: string[] = [];
      if (defenseType === "evade") {
        effects.push("prone");
      }

      // Get suggested damage dice for weapon
      const weaponDamageDice: { [key: string]: string } = {
        lightsaber: "1d10",
        blaster_rifle: "1d8",
        blaster_pistol: "1d6",
        vibroblade: "1d8",
        knife: "1d4",
      };
      const suggestedDamage = weaponDamageDice[action.weaponUsed] || "1d8";

      // Build resolution
      const resolution = {
        attackerId: attackerData?.id || "player",
        // Use the resolved enemy's exact id so downstream pending actions target correctly
        targetId: enemy.id,
        attackRoll,
        attackSkill,
        attackDegree,
        defenseRoll,
        defenseSkill,
        defenseType,
        defenseDegree,
        levelsOfSuccess,
        effectsAwardedTo,
        baseDamage: 0, // Will be set when damage is rolled
        damageBlocked,
        finalDamage,
        needsDamageRoll,
        hitLocation,
        locationRoll,
        effects,
        weaponSize: action.weaponSize,
        enemyWeaponSize: defense.weaponSize,
        pendingChoices: needsDamageRoll
          ? {
              type: "damage" as const,
              options: [`Roll ${suggestedDamage} damage`],
            }
          : levelsOfSuccess > 0
            ? {
                type: "special_effect" as const,
              }
            : undefined,
      };

      console.log("Resolution built:", resolution);
      results.push(resolution);
    });

    return results;
  }

  resolveDamage(
    damageRoll: number,
    targetId: string,
    location?: string,
    weaponSize?: string
  ): number {
    // This would be called when damage needs to be rolled
    // For now, return the roll
    return damageRoll;
  }

  resolveSpecialEffect(
    effect: string,
    attackerId: string,
    targetId: string
  ): void {
    // Apply the chosen special effect
    // This would modify the combat state
    console.log(`Applying ${effect} from ${attackerId} to ${targetId}`);
  }
}

export const mythrasRules = new MythrasRules();
