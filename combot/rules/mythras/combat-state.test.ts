import { describe, it, expect } from "bun:test";
import { CombatStateManager } from "../../rules";
import type { EnhancedCombatState } from "../../rules";

describe("formatPendingAction - parry outcome rendering", () => {
  const manager = new CombatStateManager();

  it("shows parry outcome when parry succeeded (fully blocked)", () => {
    const text = manager.formatPendingAction({
      id: "a",
      type: "choose_special_effect",
      userId: "u",
      targetId: "enemy_1",
      context: {
        specialEffectCount: 1,
        defenseType: "parry",
        defenseDegree: "success",
        parryFullyBlocked: true,
      },
    });
    expect(text).toContain("Parry outcome: fully blocked");
  });

  it("does not show parry outcome when parry failed", () => {
    const text = manager.formatPendingAction({
      id: "b",
      type: "choose_special_effect",
      userId: "u",
      targetId: "enemy_1",
      context: {
        specialEffectCount: 1,
        defenseType: "parry",
        defenseDegree: "failure",
        parryFullyBlocked: false,
      },
    });
    expect(text).not.toContain("Parry outcome:");
  });
});

describe("addPendingAction - allow multiple pending for same player", () => {
  const manager = new CombatStateManager();
  const baseState: EnhancedCombatState = {
    id: "c1",
    channelId: "ch",
    round: 1,
    currentTurn: 0,
    initiative: [
      {
        userId: "u1",
        name: "P1",
        roll: 10,
        actionPoints: 2,
        maxActionPoints: 2,
      },
    ],
    enemies: [],
    log: [],
    pendingActions: [],
  } as any;

  it("keeps one pending on player and queues additional globally", () => {
    const state = JSON.parse(JSON.stringify(baseState)) as EnhancedCombatState;
    manager.addPendingAction(state, {
      id: "a1",
      type: "roll_damage",
      userId: "u1",
      targetId: "e1",
      context: {},
    });
    manager.addPendingAction(state, {
      id: "a2",
      type: "choose_special_effect",
      userId: "u1",
      targetId: "e1",
      context: { specialEffectCount: 2 },
    });

    expect(state.initiative[0].pendingAction?.id).toBe("a1");
    expect(state.pendingActions.find((p) => p.id === "a2")).toBeTruthy();
  });
});
