import type { QuestState } from "./quests";

export interface DialogueLine {
  speaker: string;
  text: string;
}

export const ELDER_DIALOGUE: Record<QuestState | "boss", DialogueLine[]> = {
  inactive: [
    { speaker: "ELDER MOSS", text: "Pip! Thank the roots you're awake. The Gloam crept out of the old ruins last night." },
    { speaker: "ELDER MOSS", text: "It twists the forest creatures. Strike them down and they leave Gloam Shards behind." },
    { speaker: "ELDER MOSS", text: "Bring me five shards. I can turn their power into sunfire for you." },
    { speaker: "PIP", text: "Five shards. I'm on it!" },
  ],
  active: [{ speaker: "ELDER MOSS", text: "Five Gloam Shards, Pip. The Enchanted Forest lies east. Mind the water." }],
  ready: [
    { speaker: "ELDER MOSS", text: "Five shards! Hold still..." },
    { speaker: "ELDER MOSS", text: "There. The SUNSPARK is yours. Press K to hurl it." },
    { speaker: "ELDER MOSS", text: "The Warden sleeps past the ruins, on a ledge too high to climb. Find the Zephyr Feather." },
  ],
  done: [{ speaker: "ELDER MOSS", text: "The Warden waits beyond the ruins. Shrines will remember you if you fall." }],
  boss: [{ speaker: "ELDER MOSS", text: "The light is back in the vale. You did it, Pip." }],
};

export const SIGN_TEXT: DialogueLine[] = [
  { speaker: "SIGN", text: "EAST: Enchanted Forest, Old Ruins. Press E at glowing shrines to save." },
];
