import type {
  CharacterData,
  EnhancedCombatState,
  MythrasParsedAction,
  PendingAction,
  RuleSystem,
} from "../rules";

type CallLLM = (
  prompt: string,
  roll?: number,
  schema?: any,
  systemPrompt?: string
) => Promise<any>;

export type PendingResolution = {
  type: "damage" | "effect" | null;
  value: number | string;
};

// System-level guardrails for action parsing (LLM meta-instructions)
const GENERIC_ACTION_PARSING_SYSTEM_PROMPT = `You are a combat action parser. Your ONLY job is to parse and structure text into the provided JSON schema. Do not evaluate rules or apply game mechanics. Never invent values when the schema expects values present in the provided context; prefer null/omission over invention. Return strictly valid JSON conforming to the schema.`;

// Parse a Mythras action into structured form using the system-specific schema and prompt
export async function parseActionMythras(
  actionText: string,
  state: EnhancedCombatState,
  characterData: CharacterData | null,
  ruleSystem: RuleSystem,
  callLLM: CallLLM
): Promise<MythrasParsedAction | null> {
  const schema = ruleSystem.getActionParsingSchema();
  const domainPrompt = ruleSystem.getActionParsingPrompt();

  const enemiesBlock = state.enemies
    .filter((e) => e.alive)
    .map(
      (e) =>
        `- ${e.name} (${e.type}): weapon=${e.weapon}, AP=${e.actionPoints}, skills: parry=${e.skills.parry}%, evade=${e.skills.evade}%`
    )
    .join("\n");

  const skillsBlock = characterData?.skills
    ? characterData.skills
        .map((s: any) => `"${s.name}": ${s.value}%`)
        .join("\n")
    : "No skills available";

  const userPrompt = `Parse this combat action into the schema:\n"${actionText}"\n\n${domainPrompt}\n\nCurrent enemies:\n${enemiesBlock}\n\nCharacter skills:\n${skillsBlock}`;

  try {
    const parsed = await callLLM(
      userPrompt,
      undefined,
      schema,
      GENERIC_ACTION_PARSING_SYSTEM_PROMPT
    );
    // Normalize percentages that might be returned as fractions (e.g., 0.99 -> 99)
    const normalizePercent = (n: any): any => {
      if (typeof n !== "number" || Number.isNaN(n)) return n;
      if (n > 1) return Math.round(n);
      if (n > 0) return Math.round(n * 100);
      return n;
    };

    if (parsed && typeof parsed === "object") {
      if (typeof parsed.attackerSkillValue === "number") {
        parsed.attackerSkillValue = normalizePercent(parsed.attackerSkillValue);
      }
      if (Array.isArray(parsed.enemyDefenses)) {
        parsed.enemyDefenses.forEach((d: any) => {
          if (typeof d?.parrySkill === "number") {
            d.parrySkill = normalizePercent(d.parrySkill);
          }
          if (typeof d?.evadeSkill === "number") {
            d.evadeSkill = normalizePercent(d.evadeSkill);
          }
        });
      }

      // If not AoE, restrict to a single best target
      try {
        const isAoE = !!(parsed as any).isAoE;
        if (!isAoE) {
          const targetNames: string[] = Array.isArray((parsed as any).targetIds)
            ? ((parsed as any).targetIds as string[])
            : [];
          let chosenEnemyName: string | null = null;
          for (const enemy of state.enemies) {
            if (
              targetNames.some((t) =>
                enemy.name.toLowerCase().includes(String(t).toLowerCase())
              )
            ) {
              chosenEnemyName = enemy.name;
              break;
            }
          }

          if (!chosenEnemyName && targetNames.length > 0) {
            chosenEnemyName = String(targetNames[0]);
          }

          if (chosenEnemyName) {
            (parsed as any).targetIds = [chosenEnemyName];
            if (Array.isArray((parsed as any).enemyDefenses)) {
              (parsed as any).enemyDefenses = (
                parsed as any
              ).enemyDefenses.filter((d: any) =>
                String(d?.enemyId || "")
                  .toLowerCase()
                  .includes(chosenEnemyName!.toLowerCase())
              );
              // Fallback to the first if filtering removed all
              if ((parsed as any).enemyDefenses.length === 0) {
                (parsed as any).enemyDefenses = [
                  (parsed as any).enemyDefensesOriginal?.[0] ||
                    (parsed as any).enemyDefenses[0],
                ].filter(Boolean);
              }
            }
          }
        }
      } catch {}
    }

    return parsed as MythrasParsedAction;
  } catch {
    return null;
  }
}

// Parse resolution text for a pending action using tight schemas
export async function parsePendingResolution(
  pending: PendingAction,
  actionText: string,
  callLLM: CallLLM
): Promise<PendingResolution> {
  if (pending.type === "attack_result") {
    const count = pending.context.specialEffectCount || 0;
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
    const parryNote =
      pending.context.defenseType === "parry"
        ? ` Parry outcome: ${pending.context.parryFullyBlocked ? "fully blocked" : "partial block"}.`
        : "";
    const prompt = `Extract both damage (if provided) and up to ${count} lasting afflictions from: "${actionText}".${parryNote} Set bypassArmor=true ONLY if 'bypass armor' is stated.`;
    const system =
      "You extract both a damage integer and a list of lasting afflictions in one pass. Do not infer values not present.";
    const result = await callLLM(prompt, 0, schema, system);

    // Return a structured effect so caller can route accordingly
    if (
      typeof result?.damage === "number" ||
      (Array.isArray(result?.lastingAfflictions) &&
        result.lastingAfflictions.length > 0) ||
      typeof result?.extraDamage === "number"
    ) {
      return {
        type: "effect",
        value: {
          damage:
            typeof result?.damage === "number" ? result.damage : undefined,
          lastingAfflictions: Array.isArray(result?.lastingAfflictions)
            ? result.lastingAfflictions
            : [],
          extraDamage:
            typeof result?.extraDamage === "number" ? result.extraDamage : 0,
          bypassArmor: !!result?.bypassArmor,
        } as any,
      };
    }
    return { type: null, value: "" };
  }
  if (pending.type === "roll_damage") {
    const schema = {
      type: "OBJECT",
      properties: {
        damage: {
          type: "INTEGER",
          description: "The damage value the player rolled",
        },
      },
      required: ["damage"],
    };
    const prompt = `Extract just the damage value from: "${actionText}"`;
    const system = "You extract integer damage values and nothing else.";
    const result = await callLLM(prompt, 0, schema, system);
    const value = typeof result?.damage === "number" ? result.damage : NaN;
    return Number.isFinite(value)
      ? { type: "damage", value }
      : { type: null, value: "" };
  }

  if (pending.type === "choose_special_effect") {
    const count = pending.context.specialEffectCount || 1;
    const schema = {
      type: "OBJECT",
      properties: {
        lastingAfflictions: {
          type: "ARRAY",
          items: { type: "STRING" },
          description:
            "Lasting afflictions only (bleed, poison, impale, stunned, etc.)",
        },
        instantEffects: {
          type: "ARRAY",
          items: { type: "STRING" },
          nullable: true,
          description:
            "One-time/instant effects (bypass parry, choose location, knockback)",
        },
        extraDamage: {
          type: "INTEGER",
          nullable: true,
          description: "Any additional damage from the chosen effects",
        },
        bypassArmor: {
          type: "BOOLEAN",
          nullable: true,
          description: "true only if the chosen effects include 'bypass armor'",
        },
      },
      required: ["lastingAfflictions"],
    };
    const parryNote =
      pending.context.defenseType === "parry"
        ? ` Parry outcome: ${pending.context.parryFullyBlocked ? "fully blocked" : "partial block"}.`
        : "";
    const prompt = `Choose up to ${count} appropriate special effects for this situation and extract them from: "${actionText}".${parryNote} If extra damage applies from effects, include it as extraDamage. Set bypassArmor=true ONLY if 'bypass armor' is among the chosen effects.`;
    const system =
      "You select effects/afflictions based on context and return them as an array, with any additional damage as extraDamage.";
    const result = await callLLM(prompt, 0, schema, system);
    if (Array.isArray(result?.lastingAfflictions)) {
      return {
        type: "effect",
        value: {
          lastingAfflictions: result.lastingAfflictions,
          extraDamage: result.extraDamage || 0,
          bypassArmor: !!result.bypassArmor,
        },
      } as any;
    }
    return { type: null, value: "" };
  }

  return { type: null, value: "" };
}

// Create enemies for an encounter using the system prompt and schema
export async function createEnemiesViaLLM(
  text: string,
  ruleSystem: RuleSystem,
  callLLM: CallLLM,
  systemPrompt: string
): Promise<any> {
  const schema = ruleSystem.getEnemyCreationSchema();
  const domainPrompt = ruleSystem.getEnemyCreationPrompt();
  const userPrompt = `Create encounter: "${text}"\n${domainPrompt}`;
  return callLLM(userPrompt, undefined, schema, systemPrompt);
}
