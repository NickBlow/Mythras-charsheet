import { describe, it, expect } from "bun:test";
import { mythrasRules } from "./rules";

describe("Mythras rules - evaluateAttack", () => {
  it("hits when attack succeeds and defense fails, requiring damage roll", () => {
    const action = {
      attackerSkillName: "Lightsaber Combat Style",
      attackerSkillValue: 80,
      weaponUsed: "lightsaber",
      weaponSize: "L" as const,
      isRanged: false,
      isEnergy: true,
      targetIds: ["enemy_1"],
      isAoE: false,
      playerRoll: 45,
      enemyDefenses: [
        {
          enemyId: "enemy_1",
          canParry: true,
          mustEvade: false,
          weaponSize: "L" as const,
          parrySkill: 50,
          evadeSkill: 50,
        },
      ],
    };

    const enemies = [
      {
        id: "enemy_1",
        name: "Stormtrooper",
        type: "COMBATANT" as const,
        weapon: "blaster_rifle",
        actionPoints: 2,
        damage: 0,
        alive: true,
        afflictions: [],
        skills: { parry: 50, evade: 50 },
      },
    ];

    const results = mythrasRules.evaluateAttack(
      action as any,
      null,
      enemies as any,
      { attack: 45, defense: [90] }
    );

    expect(results.length).toBe(1);
    const r = results[0];
    expect(r.attackDegree === "success" || r.attackDegree === "critical").toBe(
      true
    );
    expect(r.pendingChoices?.type).toBe("damage");
  });

  it("uses evade defense when mustEvade is true", () => {
    const action = {
      attackerSkillName: "Blaster Combat",
      attackerSkillValue: 70,
      weaponUsed: "blaster_rifle",
      weaponSize: "M" as const,
      isRanged: true,
      isEnergy: true,
      targetIds: ["droid"],
      isAoE: false,
      playerRoll: 30,
      enemyDefenses: [
        {
          enemyId: "droid",
          canParry: false,
          mustEvade: true,
          parrySkill: 0,
          evadeSkill: 50,
        },
      ],
    };

    const enemies = [
      {
        id: "droid",
        name: "Battle Droid",
        type: "MOOK" as const,
        weapon: "blaster_rifle",
        actionPoints: 2,
        damage: 0,
        alive: true,
        afflictions: [],
        skills: { parry: 50, evade: 50 },
      },
    ];

    const results = mythrasRules.evaluateAttack(
      action as any,
      null,
      enemies as any,
      { attack: 30, defense: [40] }
    );

    expect(results.length).toBe(1);
    const r = results[0];
    expect(r.defenseType).toBe("evade");
  });

  it("parry fumble + attack success => 2 special effects and damage needed", () => {
    const action = {
      attackerSkillName: "Melee Combat",
      attackerSkillValue: 70,
      weaponUsed: "vibroblade",
      weaponSize: "M" as const,
      isRanged: false,
      isEnergy: false,
      targetIds: ["guard"],
      isAoE: false,
      playerRoll: 40,
      enemyDefenses: [
        {
          enemyId: "guard",
          canParry: true,
          mustEvade: false,
          weaponSize: "S" as const,
          parrySkill: 60,
          evadeSkill: 50,
        },
      ],
    };

    const enemies = [
      {
        id: "guard",
        name: "Guard",
        type: "COMBATANT" as const,
        weapon: "knife",
        actionPoints: 2,
        damage: 0,
        alive: true,
        afflictions: [],
        skills: { parry: 60, evade: 50 },
      },
    ];

    const results = mythrasRules.evaluateAttack(
      action as any,
      null,
      enemies as any,
      { attack: 40, defense: [99] } // defense fumble
    );

    const r = results[0];
    expect(r.levelsOfSuccess).toBe(2);
    expect(r.needsDamageRoll).toBe(true);
  });

  it("defense fumble + attack failure => nothing happens", () => {
    const action = {
      attackerSkillName: "Melee Combat",
      attackerSkillValue: 40,
      weaponUsed: "vibroblade",
      weaponSize: "M" as const,
      isRanged: false,
      isEnergy: false,
      targetIds: ["guard"],
      isAoE: false,
      playerRoll: 95,
      enemyDefenses: [
        {
          enemyId: "guard",
          canParry: true,
          mustEvade: false,
          weaponSize: "S" as const,
          parrySkill: 60,
          evadeSkill: 50,
        },
      ],
    };

    const enemies = [
      {
        id: "guard",
        name: "Guard",
        type: "COMBATANT" as const,
        weapon: "knife",
        actionPoints: 2,
        damage: 0,
        alive: true,
        afflictions: [],
        skills: { parry: 60, evade: 50 },
      },
    ];

    const results = mythrasRules.evaluateAttack(
      action as any,
      null,
      enemies as any,
      { attack: 95, defense: [99] }
    );
    const r = results[0];
    expect(r.levelsOfSuccess).toBe(0);
    expect(r.needsDamageRoll).toBeFalsy();
    expect(r.pendingChoices).toBeUndefined();
  });

  it("parry success + attack critical => prompt special effect and no damage", () => {
    const action = {
      attackerSkillName: "Lightsaber Combat Style",
      attackerSkillValue: 90,
      weaponUsed: "lightsaber",
      weaponSize: "L" as const,
      isRanged: false,
      isEnergy: true,
      targetIds: ["trooper"],
      isAoE: false,
      playerRoll: 3, // crit
      enemyDefenses: [
        {
          enemyId: "trooper",
          canParry: true,
          mustEvade: false,
          weaponSize: "M" as const,
          parrySkill: 60,
          evadeSkill: 50,
        },
      ],
    };

    const enemies = [
      {
        id: "trooper",
        name: "Stormtrooper",
        type: "COMBATANT" as const,
        weapon: "blaster_rifle",
        actionPoints: 2,
        damage: 0,
        alive: true,
        afflictions: [],
        skills: { parry: 60, evade: 50 },
      },
    ];

    const results = mythrasRules.evaluateAttack(
      action as any,
      null,
      enemies as any,
      { attack: 3, defense: [40] }
    );
    const r = results[0];
    expect(r.needsDamageRoll).toBe(false);
    expect(r.levelsOfSuccess).toBeGreaterThan(0);
    expect(r.pendingChoices?.type).toBe("special_effect");
  });

  it("parry success + attack success (equal size) => no damage roll, no specials", () => {
    const action = {
      attackerSkillName: "Melee Combat",
      attackerSkillValue: 80,
      weaponUsed: "vibroblade",
      weaponSize: "M" as const,
      isRanged: false,
      isEnergy: false,
      targetIds: ["guard"],
      isAoE: false,
      playerRoll: 60, // success
      enemyDefenses: [
        {
          enemyId: "guard",
          canParry: true,
          mustEvade: false,
          weaponSize: "M" as const,
          parrySkill: 70,
          evadeSkill: 50,
        },
      ],
    };
    const enemies = [
      {
        id: "guard",
        name: "Guard",
        type: "COMBATANT" as const,
        weapon: "vibroblade",
        actionPoints: 2,
        damage: 0,
        alive: true,
        afflictions: [],
        skills: { parry: 70, evade: 50 },
      },
    ];
    const results = mythrasRules.evaluateAttack(
      action as any,
      null,
      enemies as any,
      { attack: 60, defense: [65] } // both success, equal size parry
    );
    const r = results[0];
    expect(r.needsDamageRoll).toBe(false);
    expect(r.pendingChoices).toBeUndefined();
    expect(r.levelsOfSuccess).toBe(0);
  });

  it("parry with small vs large => full damage; medium vs large => half damage", () => {
    const base = 10;
    const full = mythrasRules.calculateParryDamageReduction("L", "S", base);
    const half = mythrasRules.calculateParryDamageReduction("L", "M", base);
    expect(full).toBe(base);
    expect(half).toBe(Math.floor(base / 2));
  });

  it("evade results in prone effect", () => {
    const action = {
      attackerSkillName: "Blaster Combat",
      attackerSkillValue: 70,
      weaponUsed: "blaster_rifle",
      weaponSize: "M" as const,
      isRanged: true,
      isEnergy: true,
      targetIds: ["dodgey"],
      isAoE: false,
      playerRoll: 20,
      enemyDefenses: [
        {
          enemyId: "dodgey",
          canParry: false,
          mustEvade: true,
          parrySkill: 0,
          evadeSkill: 60,
        },
      ],
    };

    const enemies = [
      {
        id: "dodgey",
        name: "Dodgey",
        type: "COMBATANT" as const,
        weapon: "blaster_pistol",
        actionPoints: 2,
        damage: 0,
        alive: true,
        afflictions: [],
        skills: { parry: 0, evade: 60 },
      },
    ];

    const results = mythrasRules.evaluateAttack(
      action as any,
      null,
      enemies as any,
      { attack: 20, defense: [30] } // successful evade
    );
    const r = results[0];
    expect(r.effects).toContain("prone");
    expect(r.needsDamageRoll).toBeFalsy();
  });
});
