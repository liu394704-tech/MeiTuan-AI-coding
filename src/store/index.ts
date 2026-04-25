import { create } from 'zustand';
import type {
  FollowUp,
  Inventory,
  Medication,
  MedicationEvent,
  Regimen,
  User,
} from '@/types';
import {
  eventService,
  followUpService,
  inventoryService,
  medicationService,
  userService,
} from '@/services';

interface AppState {
  ready: boolean;
  user: User | null;
  medications: Medication[];
  regimens: Regimen[];
  inventories: Inventory[];
  events: MedicationEvent[];
  followUps: FollowUp[];

  bootstrap: () => Promise<void>;
  refresh: () => Promise<void>;

  takeDose: (eventId: string) => Promise<void>;
  skipDose: (eventId: string) => Promise<void>;
  revertDose: (eventId: string) => Promise<void>;

  addMedication: (
    input: Parameters<typeof medicationService.create>[0]
  ) => Promise<Medication>;
  removeMedication: (id: string) => Promise<void>;

  restock: (medId: string, amount: number) => Promise<void>;
  setThreshold: (medId: string, days: number) => Promise<void>;

  addFollowUp: (input: Parameters<typeof followUpService.create>[0]) => Promise<void>;
  updateFollowUp: (id: string, patch: Partial<FollowUp>) => Promise<void>;
  removeFollowUp: (id: string) => Promise<void>;

  updateUser: (patch: Partial<User>) => Promise<void>;

  // UI prefs
  fontSize: 'normal' | 'large' | 'xlarge';
  setFontSize: (s: 'normal' | 'large' | 'xlarge') => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  user: null,
  medications: [],
  regimens: [],
  inventories: [],
  events: [],
  followUps: [],
  fontSize: (localStorage.getItem('cmm.fontSize') as 'normal' | 'large' | 'xlarge') || 'normal',

  setFontSize: (s) => {
    document.documentElement.dataset.size = s;
    localStorage.setItem('cmm.fontSize', s);
    set({ fontSize: s });
  },

  bootstrap: async () => {
    document.documentElement.dataset.size = get().fontSize;
    await get().refresh();
    set({ ready: true });
  },

  refresh: async () => {
    const [user, meds, inv, fu] = await Promise.all([
      userService.getCurrent(),
      medicationService.list(),
      inventoryService.list(),
      followUpService.list(),
    ]);
    // events: pull a wide range (last 30d ~ next 30d)
    const from = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const to = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const events = await eventService.listRange(from, to);
    set({
      user,
      medications: meds.medications,
      regimens: meds.regimens,
      inventories: inv,
      events,
      followUps: fu,
    });
  },

  takeDose: async (eventId) => {
    await eventService.setStatus(eventId, 'taken');
    await get().refresh();
  },
  skipDose: async (eventId) => {
    await eventService.setStatus(eventId, 'skipped');
    await get().refresh();
  },
  revertDose: async (eventId) => {
    await eventService.setStatus(eventId, 'pending');
    await get().refresh();
  },

  addMedication: async (input) => {
    const m = await medicationService.create(input);
    await get().refresh();
    return m;
  },
  removeMedication: async (id) => {
    await medicationService.remove(id);
    await get().refresh();
  },

  restock: async (medId, amount) => {
    await inventoryService.restock(medId, amount);
    await get().refresh();
  },
  setThreshold: async (medId, days) => {
    await inventoryService.setThreshold(medId, days);
    await get().refresh();
  },

  addFollowUp: async (input) => {
    await followUpService.create(input);
    await get().refresh();
  },
  updateFollowUp: async (id, patch) => {
    await followUpService.update(id, patch);
    await get().refresh();
  },
  removeFollowUp: async (id) => {
    await followUpService.remove(id);
    await get().refresh();
  },

  updateUser: async (patch) => {
    await userService.update(patch);
    await get().refresh();
  },
}));
