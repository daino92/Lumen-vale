import { describe, expect, it } from "vitest";
import { newGameState } from "../src/game/systems/GameState";
import { addXp, calcDamage, computeStats, xpToNext, MAX_LEVEL } from "../src/game/systems/progression";
import { addItem, equip, listInventory, removeItem, useItem } from "../src/game/systems/inventory";
import { acceptQuest, completeQuest, questOf, syncQuest, wantsQuestDrop } from "../src/game/systems/quests";
import { loadGame, saveGame, type StorageLike } from "../src/game/systems/save";
import { JumpController } from "../src/game/systems/platformerTimers";
import { buildLevel, CHEST_LOOT } from "../src/game/data/level";
import { ITEMS } from "../src/game/data/items";
import { SAVE_KEY, MOVE } from "../src/game/config/constants";

const spawn = { id: "start", x: 0, y: 0 };
const mem = (): StorageLike & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

describe("progression", () => {
  it("levels up, carries XP over and heals", () => {
    const s = newGameState(spawn);
    s.hp = 3;
    const need = xpToNext(1);
    expect(addXp(s, need + 5)).toBe(1);
    expect(s.level).toBe(2);
    expect(s.xp).toBe(5);
    expect(s.hp).toBe(computeStats(s).maxHp);
  });
  it("can gain several levels at once and caps at MAX_LEVEL", () => {
    const s = newGameState(spawn);
    expect(addXp(s, 100000)).toBe(MAX_LEVEL - 1);
    expect(s.level).toBe(MAX_LEVEL);
  });
  it("equipment changes stats", () => {
    const s = newGameState(spawn);
    const before = computeStats(s);
    addItem(s, "ruin-blade");
    expect(equip(s, "ruin-blade")).toBe(true);
    expect(computeStats(s).attack).toBe(before.attack + 2);
    addItem(s, "moss-ring");
    equip(s, "moss-ring");
    expect(computeStats(s).maxHp).toBe(before.maxHp + 3);
  });
  it("damage respects defense and never drops below 1", () => {
    expect(calcDamage(5, 0)).toBe(5);
    expect(calcDamage(1, 50)).toBe(1);
    expect(calcDamage(4, 0, 1.6)).toBe(6);
  });
});

describe("inventory", () => {
  it("respects stack limits and removal", () => {
    const s = newGameState(spawn);
    expect(addItem(s, "berry-tonic", 20)).toBe(ITEMS["berry-tonic"].stack - 1);
    expect(removeItem(s, "berry-tonic", 100)).toBe(false);
    expect(addItem(s, "nope")).toBe(0);
  });
  it("tonics heal but not at full HP; cannot equip unowned items", () => {
    const s = newGameState(spawn);
    expect(useItem(s, "berry-tonic")).toBe(false);
    s.hp = 2;
    expect(useItem(s, "berry-tonic")).toBe(true);
    expect(s.hp).toBe(6);
    expect(equip(s, "knight-plate")).toBe(false);
    expect(listInventory(s)[0].id).toBe("twig-sword");
  });
});

describe("quest", () => {
  it("runs inactive -> active -> ready -> done and pays out", () => {
    const s = newGameState(spawn);
    expect(questOf(s, "cleanse").state).toBe("inactive");
    acceptQuest(s, "cleanse");
    expect(questOf(s, "cleanse").state).toBe("active");
    expect(completeQuest(s, "cleanse")).toBeNull();
    addItem(s, "gloam-shard", 5);
    syncQuest(s, "cleanse");
    expect(questOf(s, "cleanse").state).toBe("ready");
    expect(wantsQuestDrop(s, "cleanse")).toBe(false);
    const coins = s.coins;
    const r = completeQuest(s, "cleanse")!;
    expect(r.ability).toBe("sunspark");
    expect(s.abilities).toContain("sunspark");
    expect(s.coins).toBe(coins + r.coins);
    expect(s.inventory["gloam-shard"]).toBeUndefined();
    expect(questOf(s, "cleanse").state).toBe("done");
  });
});

describe("save", () => {
  it("round-trips state", () => {
    const store = mem(), s = newGameState(spawn);
    s.coins = 42; s.level = 3; acceptQuest(s, "cleanse"); s.abilities.push("double-jump");
    s.checkpoint = { id: "shrine:H@1", x: 100, y: 200 };
    expect(saveGame(s, store)).toBe(true);
    const r = loadGame(spawn, store);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.coins).toBe(42);
      expect(r.state.level).toBe(3);
      expect(r.state.quests.cleanse.state).toBe("active");
      expect(r.state.abilities).toEqual(["double-jump"]);
      expect(r.state.checkpoint.x).toBe(100);
    }
  });
  it("rejects corrupt or future saves without throwing", () => {
    const store = mem();
    store.m.set(SAVE_KEY, "{not json");
    expect(loadGame(spawn, store)).toEqual({ ok: false, reason: "corrupt" });
    store.m.set(SAVE_KEY, JSON.stringify({ version: 999, state: {} }));
    expect(loadGame(spawn, store).ok).toBe(false);
    expect(loadGame(spawn, mem())).toEqual({ ok: false, reason: "none" });
  });
  it("migrates v1 saves and sanitises bad fields", () => {
    const store = mem();
    store.m.set(SAVE_KEY, JSON.stringify({ version: 1, state: { level: 99, hp: -5, coins: "lots", abilities: ["fly", "sunspark"], inventory: { "berry-tonic": 2, x: -1 } } }));
    const r = loadGame(spawn, store);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.level).toBe(10);
      expect(r.state.hp).toBe(1);
      expect(r.state.coins).toBe(0);
      expect(r.state.abilities).toEqual(["sunspark"]);
      expect(r.state.inventory).toEqual({ "berry-tonic": 2 });
      expect(r.state.flags).toEqual({});
    }
  });
});

describe("jump feel", () => {
  const dt = 1 / 60;
  it("allows a coyote jump just after leaving a ledge, not long after", () => {
    const j = new JumpController();
    j.tick(dt, true, false);
    expect(j.tick(MOVE.coyoteTime * 0.5, false, true)).toBe("ground");
    const k = new JumpController();
    k.tick(dt, true, false);
    k.tick(MOVE.coyoteTime + 0.05, false, false);
    expect(k.tick(dt, false, true)).toBeNull();
  });
  it("buffers a press made just before landing", () => {
    const j = new JumpController();
    j.tick(dt, false, false);
    expect(j.tick(dt, false, true)).toBeNull();
    expect(j.tick(dt, true, false)).toBe("ground");
  });
  it("double jump only with the ability, once per airtime", () => {
    const j = new JumpController(1);
    j.tick(dt, true, true);
    j.tick(0.3, false, false);
    expect(j.tick(dt, false, true)).toBe("air");
    expect(j.tick(dt, false, true)).toBeNull();
    const n = new JumpController(0);
    n.tick(dt, true, true);
    n.tick(0.3, false, false);
    expect(n.tick(dt, false, true)).toBeNull();
  });
});

describe("level data", () => {
  const L = buildLevel();
  it("has one spawn, an NPC, a boss, a feather, shrines and every chest", () => {
    const count = (ch: string) => L.spawns.filter((s) => s.ch === ch).length;
    expect(count("P")).toBe(1);
    expect(count("N")).toBe(1);
    expect(count("X")).toBe(1);
    expect(count("Z")).toBe(1);
    expect(count("H")).toBeGreaterThanOrEqual(3);
    for (const k of Object.keys(CHEST_LOOT)) expect(count(k)).toBe(1);
  });
  it("has enough corrupted creatures for the quest", () => {
    expect(L.spawns.filter((s) => "SWK".includes(s.ch)).length).toBeGreaterThanOrEqual(8);
  });
  it("spawns stand on something or fly", () => {
    for (const s of L.spawns) {
      if (!"SKPNH123Z".includes(s.ch)) continue;
      const below = L.grid[s.ty + 1][s.tx];
      expect("#B=-".includes(below), `${s.id} floats over '${below}'`).toBe(true);
    }
  });
  it("the wall before the boss needs the double jump", () => {
    const single = (MOVE.jumpVelocity ** 2) / (2 * MOVE.gravity);
    const dbl = single + (MOVE.doubleJumpVelocity ** 2) / (2 * MOVE.gravity);
    const z = L.spawns.find((s) => s.ch === "Z")!;
    let wall = z.tx;
    while (L.grid[11][wall] === "B") wall++; // off the feather's own block
    while (L.grid[11][wall] !== "B") wall++; // across the gap to the wall
    let top = 11;
    while (L.grid[top - 1][wall] === "B") top--;
    const blockTop = (z.ty + 1) * 16, wallTop = top * 16;
    expect(blockTop - wallTop).toBeGreaterThan(single);
    expect(blockTop - wallTop).toBeLessThan(dbl - 8);
  });
});
