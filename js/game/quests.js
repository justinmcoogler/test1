// Quest definitions + tracking. Stages auto-progress from game events.
import { on, emit } from '../core/events.js';
import { ITEMS } from './items.js';

// stage types:
//  talk {npc}            — talk to an NPC
//  collect {item, count} — hold N of an item (checked live)
//  gather {node, count}  — gather from a node type
//  craft {item, count}
//  place {count}         — place any blocks
//  cook {count}          — cook anything at a campfire
//  equip {}              — equip any weapon
//  defeat {enemy, count}
//  reach {marker, radius}
//  chest {id}            — open a specific chest
export const QUESTS = [
  {
    id: 'q_arrival', giver: 'maren', name: 'A Place to Land',
    intro: `Every pair of hands here earns its bread. Ours grow from the grove east of the square — take what the pines offer and put a workbench together. Wood remembers kindness; so do I.`,
    outro: `A workbench of your own! You're no stranger now. Here — coin for honest work.`,
    stages: [
      { type: 'reach', marker: 'grove', radius: 8, text: 'Visit the grove east of Brookhollow square' },
      { type: 'collect', item: 'pine_log', count: 5, text: 'Chop 5 Pine Logs (hold left click / action on a tree)' },
      { type: 'craft', item: 'workbench', count: 1, text: 'Craft a Workbench (open Crafting — no station needed)' },
      { type: 'talk', npc: 'maren', text: 'Return to Elder Maren' },
    ],
    rewards: { coins: 25, items: [{ item: 'travel_biscuit', qty: 2 }], xp: [['woodcutting', 60], ['construction', 30]] },
  },
  {
    id: 'q_sparks', giver: 'maren', name: 'Sparks and Stone', requires: 'q_arrival',
    intro: `The old mine north of the square still runs rich with copper — the first metal any smith learns. Craft yourself a pickaxe, bring up some ore, and coax copper bars out of the furnace at the workshop. Master copper and tin's your next step, then bronze; metal opens every other door.`,
    outro: `Warm copper in your hand — that's the valley taking to you. Add tin and you'll have bronze; the anvil at the workshop shapes it into whatever you need.`,
    stages: [
      { type: 'craft', item: 'crude_pickaxe', count: 1, text: 'Craft a Crude Pickaxe at the Workbench' },
      { type: 'reach', marker: 'mineChamber', radius: 8, text: 'Descend into the Brookhollow mine (stairs at the stone arch)' },
      { type: 'collect', item: 'copper_ore', count: 4, text: 'Mine 4 Copper Ore' },
      { type: 'craft', item: 'copper_bar', count: 2, text: 'Smelt 2 Copper Bars at the workshop Furnace' },
      { type: 'talk', npc: 'maren', text: 'Show Maren your copper' },
    ],
    rewards: { coins: 40, items: [{ item: 'minor_healing_tonic', qty: 1 }], xp: [['mining', 80], ['smithing', 60]] },
  },
  {
    id: 'q_roof', giver: 'maren', name: 'A Roof of One\'s Own', requires: 'q_sparks',
    intro: `The valley nights are colder than they look. Raise yourself a shelter — any walls you like, anywhere on the green — and set a campfire. A hot meal turns a shelter into a home.`,
    outro: `Smoke from a new chimney is the best sight an elder gets. Eat well, build often.`,
    stages: [
      { type: 'place', count: 12, text: 'Place 12 building blocks (craft Timber Walls, then right-click to place)' },
      { type: 'craft', item: 'campfire', count: 1, text: 'Craft a Campfire' },
      { type: 'cook', count: 1, text: 'Cook any food at a Campfire (fish from the pond works well)' },
    ],
    rewards: { coins: 30, items: [{ item: 'hearth_loaf', qty: 2 }], xp: [['construction', 80], ['cooking', 40]] },
  },
  {
    id: 'q_mettle', giver: 'maren', name: 'Prove Your Mettle', requires: 'q_roof',
    intro: `Strength you don't practice is strength you don't have. Arm yourself, batter the old training dummy, then — if your nerve holds — go and break up that scrap-goblin camp in the west meadow. They've been at the fences a fortnight.`,
    outro: `You move like someone the wilds should worry about. Take this jerkin — boarhide, and better on you than on a goblin.`,
    stages: [
      { type: 'craft', item: 'wooden_cudgel', count: 1, text: 'Craft a weapon (Wooden Cudgel at the Workbench)' },
      { type: 'equip', text: 'Equip your weapon (Inventory > click it > Equip)' },
      { type: 'defeat', enemy: 'practice_dummy', count: 1, marker: 'trainingYard', text: 'Defeat the training dummy (click it to start combat)' },
      { type: 'defeat', enemy: 'scrap_goblin', count: 1, marker: 'meadow', text: 'Break up the scrap-goblin camp in the west meadow' },
      { type: 'talk', npc: 'maren', text: 'Report to Elder Maren' },
    ],
    rewards: { coins: 50, items: [{ item: 'hide_jerkin', qty: 1 }], xp: [['hunting', 60], ['vitality', 40]] },
  },
  {
    id: 'q_rootgrave', giver: 'maren', name: 'Whispers Below', requires: 'q_mettle',
    intro: `Now the hard truth. Under our mine lies the Rootgrave — a ruin older than any map — and something has moved into it. The miners hear drums down there, and a big voice over the top of them. Gorrak, they're calling it. Descend past the ore chamber, clear the vermin, and face what's holding court in the deep hall. Put it down… and whatever the old ones left is yours.`,
    outro: `No drums under the floor for the first time in months. You've done Brookhollow a service it won't forget, deep-delver. Wear this charm with pride.`,
    stages: [
      { type: 'reach', marker: 'dungeonAntechamber', radius: 10, text: 'Descend below the mine into the Rootgrave' },
      { type: 'defeat', enemy: 'rat', count: 2, marker: 'dungeonAntechamber', text: 'Clear 2 rats from the Rootgrave antechamber' },
      { type: 'defeat', enemy: 'goblin_warchief', count: 1, marker: 'bossHall', text: 'Defeat Gorrak the Warchief in the deep hall' },
      { type: 'chest', id: 'rootgrave_chest', marker: 'bossHall', text: 'Claim the Rootgrave treasure' },
      { type: 'talk', npc: 'maren', text: 'Bring word (and proof) to Elder Maren' },
    ],
    rewards: { coins: 200, items: [{ item: 'veilcharm', qty: 1 }], xp: [['hunting', 150], ['archaeology', 100]] },
  },
  {
    id: 'q_stall', giver: 'tam', name: 'Stocking the Stall',
    intro: `Stock's thin. Bring me 5 tartberries and 2 silverfin and I'll make it worth the walk. Berries grow on the low bushes; the pond's right there.`,
    outro: `Plump and fresh! You've a forager's eye. Here's your cut.`,
    stages: [
      { type: 'collect', item: 'tartberries', count: 5, text: 'Gather 5 Tartberries' },
      { type: 'collect', item: 'silverfin', count: 2, text: 'Catch 2 Silverfin' },
      { type: 'talk', npc: 'tam', text: 'Deliver the goods to Tam' },
    ],
    turnInCost: [{ item: 'tartberries', qty: 5 }, { item: 'silverfin', qty: 2 }],
    rewards: { coins: 35, xp: [['foraging', 40], ['fishing', 40]] },
  },
  {
    id: 'q_clay', giver: 'tam', name: 'Clay for the Kiln', requires: 'q_stall',
    intro: `A potter upvalley pays silly money for good clay. Four lumps — check the pond margins and wet ground. Shovel helps.`,
    outro: `Heavy and damp, just how potters like it. Pleasure doing business.`,
    stages: [
      { type: 'collect', item: 'clay_lump', count: 4, text: 'Dig 4 Clay Lumps' },
      { type: 'talk', npc: 'tam', text: 'Deliver the clay to Tam' },
    ],
    turnInCost: [{ item: 'clay_lump', qty: 4 }],
    rewards: { coins: 30, xp: [['mining', 30]] },
  },
  {
    id: 'q_sowing', giver: 'tam', name: 'Seed Money', requires: 'q_clay',
    intro: `Grain sells, friend — steady as sunrise. Get yourself a hoe, rake open a patch of ground, put three seeds in it, and bring me the sheaves when they ripen. I even stock seeds, if the grass gives you none.`,
    outro: `Golden and heavy — that's the good stuff. Here: a proper bronze hoe, so you'll plant twice as fine.`,
    stages: [
      { type: 'craft', item: 'crude_hoe', count: 1, text: 'Craft a Crude Hoe at the Workbench' },
      { type: 'plant', count: 3, text: 'Till soil (right-click with the hoe) and plant 3 Grain Seeds' },
      { type: 'collect', item: 'grainsheaf', count: 3, text: 'Harvest 3 Grainsheaves once the crops ripen' },
      { type: 'talk', npc: 'tam', text: 'Deliver the grain to Tam' },
    ],
    turnInCost: [{ item: 'grainsheaf', qty: 3 }],
    rewards: { coins: 45, items: [{ item: 'bronze_hoe', qty: 1 }], xp: [['farming', 120]] },
  },
  // ---- the Frostwatch chain (opens after the Rootgrave falls) -------------
  {
    id: 'q_frontier', giver: 'maren', name: 'The Long Road North',
    requires: 'q_rootgrave',
    intro: `With the Rootgrave quiet, I can finally answer Warden Sylla's letters. She keeps the Frostwatch — a camp far to the east, where the snow starts and the goblins come down out of it. Follow the rising sun past the highlands until the grass goes white, and report to her. Pack food. Pack torches. Come back to us.`,
    outro: `Maren's seal, is it? Then you're the capable pair of hands she promised. Good — I'll use them.`,
    stages: [
      { type: 'reach', marker: 'frostwatch', radius: 14, text: 'Travel far east to the Frostwatch camp (follow the trail dots)' },
      { type: 'talk', npc: 'sylla', text: 'Report to Warden Sylla' },
    ],
    rewards: { coins: 60, items: [{ item: 'travel_biscuit', qty: 3 }], xp: [['hunting', 120]] },
  },
  {
    id: 'q_wolfcull', giver: 'sylla', name: 'Thin the Warband',
    requires: 'q_frontier',
    intro: `The one holding the Ironring feeds them faster than winter can starve them. Cull three frost goblins — the ring lies just north of camp, but you'll find them roaming the whole tundra. Watch the flanks: where you see one, two more are watching you.`,
    outro: `Three fewer, and quieter for it. You fight well for a lowlander. Rest by the fire — then we talk about the one giving the orders.`,
    stages: [
      { type: 'defeat', enemy: 'frost_goblin', count: 3, marker: 'ironring', text: 'Defeat 3 Frost Goblins near the Frostwatch' },
      { type: 'talk', npc: 'sylla', text: 'Report back to Warden Sylla' },
    ],
    rewards: { coins: 90, items: [{ item: 'cured_hide', qty: 2 }], xp: [['defense', 150], ['hunting', 100]] },
  },
  {
    id: 'q_rimehowl', giver: 'sylla', name: 'Vashk the Warlord',
    requires: 'q_wolfcull',
    intro: `Now the hard part. Vashk is old, enormous and unhurried — it took the broken stone ring north of camp for a warcamp and it does not share. Kill it, take whatever the ring hoards, and the frontier sleeps easier for a season. When it bellows, the rest come running: drop them fast or they'll bury you.`,
    outro: `I heard the bellow cut short from here. The Frostwatch owes you, deep-delver — wear that blade with pride, and tell Maren her faith was well spent.`,
    stages: [
      { type: 'defeat', enemy: 'goblin_warlord', count: 1, marker: 'ironring', text: 'Slay Vashk the Warlord at the Ironring north of camp' },
      { type: 'chest', id: 'ironring_chest', marker: 'ironring', text: 'Claim the warcamp hoard' },
      { type: 'talk', npc: 'sylla', text: 'Report to Warden Sylla' },
    ],
    rewards: { coins: 250, xp: [['strength', 220], ['vitality', 160], ['hunting', 120]] },
  },
];

export class QuestLog {
  constructor(inventory, skills) {
    this.inventory = inventory;
    this.skills = skills;
    this.state = {}; // id → {status:'active'|'done', stage, progress}
    this.unsubs = [];
    this.listen();
  }

  listen() {
    this.unsubs.push(
      on('itemGained', () => this.checkCollect()),
      on('crafted', ({ item }) => this.progressType('craft', (st) => st.item === item)),
      on('blockPlaced', () => this.progressType('place', () => true)),
      on('cropPlanted', () => this.progressType('plant', () => true)),
      on('cooked', () => this.progressType('cook', () => true)),
      on('equippedWeapon', () => this.progressType('equip', () => true, true)),
      on('combatEnd', (e) => {
        if (e.result !== 'won') return;
        for (const type of e.types || []) this.progressType('defeat', (st) => st.enemy === type);
      }),
      on('chestOpened', ({ id }) => this.progressType('chest', (st) => st.id === id, true)),
      on('inventoryChanged', () => this.retryPending()),
    );
  }

  retryPending() {
    for (const q of this.active()) {
      const st = this.state[q.id];
      if (st.pendingComplete && this.turnIn(q)) delete st.pendingComplete;
    }
  }

  quest(id) { return QUESTS.find((q) => q.id === id); }

  status(id) { return this.state[id]?.status || 'locked'; }

  isAvailable(q) {
    if (this.state[q.id]) return false;
    if (q.requires && this.state[q.requires]?.status !== 'done') return false;
    return true;
  }

  availableFrom(giver) {
    return QUESTS.filter((q) => q.giver === giver && this.isAvailable(q));
  }

  activeFrom(giver) {
    return QUESTS.filter((q) => q.giver === giver && this.state[q.id]?.status === 'active');
  }

  start(id) {
    const q = this.quest(id);
    if (!q || this.state[id]) return;
    this.state[id] = { status: 'active', stage: 0, progress: 0 };
    emit('questStarted', { quest: q });
    emit('questChanged');
    this.checkCollect();
  }

  active() {
    return QUESTS.filter((q) => this.state[q.id]?.status === 'active');
  }

  completed() {
    return QUESTS.filter((q) => this.state[q.id]?.status === 'done');
  }

  currentStage(q) {
    const st = this.state[q.id];
    if (!st || st.status !== 'active') return null;
    return q.stages[st.stage];
  }

  stageProgressText(q) {
    const st = this.state[q.id];
    const stage = this.currentStage(q);
    if (!stage) return '';
    if (stage.type === 'collect') return `${Math.min(this.inventory.count(stage.item), stage.count)}/${stage.count}`;
    if (stage.count) return `${st.progress}/${stage.count}`;
    return '';
  }

  // ready to hand in? (final stage is a talk to the giver)
  readyToTurnIn(q, npc) {
    const st = this.state[q.id];
    if (!st || st.status !== 'active') return false;
    const stage = q.stages[st.stage];
    if (!stage || stage.type !== 'talk' || stage.npc !== npc) return false;
    if (st.stage !== q.stages.length - 1) return false;
    if (q.turnInCost && !this.inventory.hasAll(q.turnInCost)) return false;
    return true;
  }

  rewardsFit(q) {
    return (q.rewards?.items || []).every((it) => this.inventory.canFit(it.item, it.qty));
  }

  // non-final talk stages advance on conversation
  talkedTo(npc) {
    for (const q of this.active()) {
      const st = this.state[q.id];
      const stage = q.stages[st.stage];
      if (stage?.type === 'talk' && stage.npc === npc && st.stage < q.stages.length - 1) {
        this.advance(q);
      }
    }
  }

  turnIn(q, skills = this.skills) {
    const st = this.state[q.id];
    if (!st || st.status !== 'active') return false;
    if (!this.rewardsFit(q)) { emit('questRewardsBlocked', { quest: q }); return false; }
    if (q.turnInCost) this.inventory.consumeAll(q.turnInCost);
    st.status = 'done';
    st.stage = q.stages.length;
    if (q.rewards?.coins) this.inventory.add('coin', q.rewards.coins);
    for (const it of q.rewards?.items || []) this.inventory.add(it.item, it.qty);
    for (const [skill, xp] of q.rewards?.xp || []) skills.addXp(skill, xp);
    emit('questCompleted', { quest: q });
    emit('questChanged');
    return true;
  }

  advance(q) {
    const st = this.state[q.id];
    st.stage++;
    st.progress = 0;
    emit('questChanged');
    if (st.stage < q.stages.length) {
      emit('questStageAdvanced', { quest: q, stage: q.stages[st.stage] });
      this.checkCollect();
    } else {
      // quests that don't end on a talk stage complete on their own
      st.stage = q.stages.length - 1; // keep index in range for turnIn
      if (!this.turnIn(q)) st.pendingComplete = true; // retried when pack space frees up
    }
  }

  progressType(type, match, instant = false) {
    for (const q of this.active()) {
      const st = this.state[q.id];
      const stage = q.stages[st.stage];
      if (!stage || stage.type !== type || !match(stage)) continue;
      if (instant || !stage.count) { this.advance(q); continue; }
      st.progress++;
      emit('questChanged');
      if (st.progress >= stage.count) this.advance(q);
    }
  }

  checkCollect() {
    for (const q of this.active()) {
      const st = this.state[q.id];
      const stage = q.stages[st.stage];
      if (stage?.type === 'collect' && this.inventory.count(stage.item) >= stage.count) {
        this.advance(q);
      } else if (stage?.type === 'collect') {
        emit('questChanged');
      }
    }
  }

  // reach-stages checked from the main loop with the player position
  checkReach(px, pz, py, markers) {
    for (const q of this.active()) {
      const st = this.state[q.id];
      const stage = q.stages[st.stage];
      if (stage?.type !== 'reach') continue;
      const m = markers[stage.marker];
      if (!m) continue;
      const d = Math.hypot(px - m[0], pz - m[2]) + Math.abs(py - m[1]) * 0.5;
      if (d <= stage.radius) this.advance(q);
    }
  }

  // map marker for the tracked quest's current objective
  trackedMarker(markers) {
    const act = this.active();
    if (!act.length) return null;
    const q = act[0];
    const stage = this.currentStage(q);
    if (!stage) return null;
    // A stage may name its own marker, whatever its type. Everything below this
    // line is a hand-built Brookhollow or Frostwatch landmark chosen by matching
    // on an npc id, an enemy type or an item — fine for the starter chain, wrong
    // for anything generated, and wrong SILENTLY: a `talk` stage for a villager
    // three thousand blocks up the road fell through to `markers.stall` and
    // pointed the compass back at the Brookhollow market. Procedural towns
    // publish `town_<d>_<n>` and tag their stages with it.
    // A stage that names a marker is answered by that marker ALONE. If the place
    // has not been published yet — a delivery to a town up the road you have not
    // walked to, whose marker appears when it generates — the honest answer is no
    // arrow, so `return` rather than fall through.
    if (stage.marker) return markers[stage.marker] ? { pos: markers[stage.marker], label: q.name } : null;
    if (stage.type === 'talk') {
      const npcPos = stage.npc === 'maren' ? markers.cottage : stage.npc === 'sylla' ? markers.frostwatch : markers.stall;
      return { pos: npcPos, label: q.name };
    }
    // `defeat` stages no longer infer a place from the mob TYPE. They cannot: the
    // roster is eight goblin liveries reused the whole world over, so a
    // scrap_goblin stage could point at the west meadow, the Rootgrave or a
    // warren three rings out. Every hand-built defeat/chest stage names its own
    // marker above, which is both unambiguous and one branch instead of six.
    if (stage.type === 'chest') return { pos: markers.bossHall, label: q.name };
    if (stage.type === 'collect' && ['copper_ore', 'tin_ore'].includes(stage.item)) return { pos: markers.mineChamber, label: q.name };
    if (stage.type === 'collect' && stage.item === 'pine_log') return { pos: markers.grove, label: q.name };
    if (stage.type === 'collect' && stage.item === 'silverfin') return { pos: markers.pond, label: q.name };
    if (stage.type === 'plant' || (stage.type === 'collect' && stage.item === 'grainsheaf')) return { pos: markers.farm, label: q.name };
    if (stage.type === 'craft') return { pos: markers.workshop, label: q.name };
    return null;
  }

  serialize() { return this.state; }
  deserialize(d) { this.state = d || {}; emit('questChanged'); }
}
