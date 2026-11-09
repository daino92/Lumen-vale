export type QuestState = "inactive" | "active" | "ready" | "done";

export interface QuestDef {
  id: string;
  title: string;
  giver: string;
  item: string;
  needed: number;
  rewardXp: number;
  rewardCoins: number;
  rewardAbility?: "sunspark" | "double-jump";
}

export const QUESTS: Record<string, QuestDef> = {
  cleanse: {
    id: "cleanse",
    title: "Shards of the Gloam",
    giver: "elder",
    item: "gloam-shard",
    needed: 5,
    rewardXp: 40,
    rewardCoins: 15,
    rewardAbility: "sunspark",
  },
};
