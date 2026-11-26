/**
 * Gamified Plant feature state management for productivity.
 * Inspired by apps like Forest, Flora, and Plantie.
 * Persists plant growth progress per user and handles leveling.
 */

export const PLANT_STAGES = [
  {
    level: 1,
    name: 'Sprouting Seed',
    emoji: '🌱',
    tasksRequired: 2,
    description: 'A tiny green shoot taking root. Water it by finishing your habits and tasks!',
    quote: 'Great things have small beginnings.'
  },
  {
    level: 2,
    name: 'Baby Seedling',
    emoji: '🌿',
    tasksRequired: 3,
    description: 'Fresh leaves are unfurling. Your daily consistency is shining through!',
    quote: 'Consistency is the soil in which success grows.'
  },
  {
    level: 3,
    name: 'Thriving Foliage',
    emoji: '🪴',
    tasksRequired: 4,
    description: 'Strong stems and vibrant greenery. You have built unstoppable momentum!',
    quote: 'Focus on progress, not perfection.'
  },
  {
    level: 4,
    name: 'Blossoming Shrub',
    emoji: '🌸',
    tasksRequired: 5,
    description: 'Beautiful, fragrant blossoms have opened! Your dedication is flourishing!',
    quote: 'The reward of effort is blooming before your eyes.'
  },
  {
    level: 5,
    name: 'Mighty Tree',
    emoji: '🌳',
    tasksRequired: 0, // Fully grown
    description: 'A magnificent, fully grown tree! You are a master of productivity!',
    quote: 'You grew a whole tree! Ready to plant another and build your forest?'
  }
];

const STORAGE_PREFIX = 'productivity_plant_';

export function getStorageKey(username) {
  return `${STORAGE_PREFIX}${username || 'guest'}`;
}

export function getDefaultPlantState() {
  return {
    stageIndex: 0,
    tasksInCurrentStage: 0,
    totalTasksCompleted: 0,
    waterDrops: 0,
    treesGrown: 0,
    lastWatered: null
  };
}

export function getPlantState(username) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return getDefaultPlantState();
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(username));
    if (!raw) return getDefaultPlantState();
    const parsed = JSON.parse(raw);
    return {
      stageIndex: Math.min(Math.max(parsed.stageIndex || 0, 0), PLANT_STAGES.length - 1),
      tasksInCurrentStage: Math.max(parsed.tasksInCurrentStage || 0, 0),
      totalTasksCompleted: Math.max(parsed.totalTasksCompleted || 0, 0),
      waterDrops: Math.max(parsed.waterDrops || 0, 0),
      treesGrown: Math.max(parsed.treesGrown || 0, 0),
      lastWatered: parsed.lastWatered || null
    };
  } catch {
    return getDefaultPlantState();
  }
}

export function savePlantState(state, username) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(getStorageKey(username), JSON.stringify(state));
    window.dispatchEvent(
      new CustomEvent('plant-updated', {
        detail: { username, state }
      })
    );
  } catch {}
}

/**
 * Record a completed task, awarding plant growth and checking for level-up.
 */
export function recordTaskCompletion(username) {
  const current = getPlantState(username);
  const updated = { ...current };

  updated.totalTasksCompleted += 1;
  updated.waterDrops += 1;
  updated.lastWatered = new Date().toISOString();

  let leveledUp = false;
  const currentStage = PLANT_STAGES[updated.stageIndex];

  // If not yet at max stage
  if (updated.stageIndex < PLANT_STAGES.length - 1) {
    updated.tasksInCurrentStage += 1;

    if (updated.tasksInCurrentStage >= currentStage.tasksRequired) {
      updated.stageIndex += 1;
      updated.tasksInCurrentStage = 0;
      leveledUp = true;
    }
  }

  savePlantState(updated, username);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('plant-growth-celebration', {
        detail: {
          username,
          leveledUp,
          newStage: PLANT_STAGES[updated.stageIndex],
          totalTasks: updated.totalTasksCompleted
        }
      })
    );
  }

  return {
    state: updated,
    leveledUp,
    currentStage: PLANT_STAGES[updated.stageIndex]
  };
}

/**
 * Interactive manual watering bonus.
 */
export function waterPlant(username) {
  const current = getPlantState(username);
  const updated = {
    ...current,
    waterDrops: current.waterDrops + 1,
    lastWatered: new Date().toISOString()
  };
  savePlantState(updated, username);
  return updated;
}

/**
 * Plant a new seed when a tree reaches full maturity.
 */
export function plantNewSeed(username) {
  const current = getPlantState(username);
  const updated = {
    ...current,
    treesGrown: current.treesGrown + 1,
    stageIndex: 0,
    tasksInCurrentStage: 0
  };
  savePlantState(updated, username);
  return updated;
}
