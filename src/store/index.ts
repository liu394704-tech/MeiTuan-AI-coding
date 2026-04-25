import { create } from 'zustand';
import type {
  FollowUp,
  Inventory,
  Medication,
  MedicationEvent,
  Regimen,
  User,
  FamilyMember,
  FamilyFeedItem,
  VitalReading,
  MedicalReport,
} from '@/types';
import {
  eventService,
  familyService,
  followUpService,
  inventoryService,
  medicationService,
  userService,
  vitalService,
  reportService,
} from '@/services';
import { voiceService, type VoicePrefs } from '@/services/voice';

interface AppState {
  ready: boolean;
  user: User | null;
  medications: Medication[];
  regimens: Regimen[];
  inventories: Inventory[];
  events: MedicationEvent[];
  followUps: FollowUp[];
  familyMembers: FamilyMember[];
  familyFeed: FamilyFeedItem[];
  vitals: VitalReading[];
  reports: MedicalReport[];

  addVital: (input: Parameters<typeof vitalService.add>[0]) => Promise<void>;
  removeVital: (id: string) => Promise<void>;
  addReport: (input: Parameters<typeof reportService.add>[0]) => Promise<void>;
  removeReport: (id: string) => Promise<void>;

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

  addFamilyMember: (input: Parameters<typeof familyService.addMember>[0]) => Promise<void>;
  toggleFamilyNotify: (id: string, notify: boolean) => Promise<void>;
  removeFamilyMember: (id: string) => Promise<void>;
  pushFamilyFeed: (input: Parameters<typeof familyService.pushFeed>[0]) => Promise<void>;

  updateUser: (patch: Partial<User>) => Promise<void>;

  fontSize: 'normal' | 'large' | 'xlarge';
  setFontSize: (s: 'normal' | 'large' | 'xlarge') => void;

  voicePrefs: VoicePrefs;
  setVoicePrefs: (p: Partial<VoicePrefs>) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  user: null,
  medications: [],
  regimens: [],
  inventories: [],
  events: [],
  followUps: [],
  familyMembers: [],
  familyFeed: [],
  vitals: [],
  reports: [],
  fontSize: (localStorage.getItem('cmm.fontSize') as 'normal' | 'large' | 'xlarge') || 'normal',
  voicePrefs: voiceService.getPrefs(),

  setFontSize: (s) => {
    document.documentElement.dataset.size = s;
    localStorage.setItem('cmm.fontSize', s);
    set({ fontSize: s });
  },
  setVoicePrefs: (p) => {
    const next = voiceService.setPrefs(p);
    set({ voicePrefs: next });
  },

  bootstrap: async () => {
    document.documentElement.dataset.size = get().fontSize;
    await get().refresh();
    set({ ready: true });
  },

  refresh: async () => {
    const [user, meds, inv, fu, fm, ff, vt, rp] = await Promise.all([
      userService.getCurrent(),
      medicationService.list(),
      inventoryService.list(),
      followUpService.list(),
      familyService.listMembers(),
      familyService.listFeed(),
      vitalService.list(),
      reportService.list(),
    ]);
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
      familyMembers: fm,
      familyFeed: ff,
      vitals: vt,
      reports: rp,
    });
  },

  addVital: async (input) => { await vitalService.add(input); await get().refresh(); },
  removeVital: async (id) => { await vitalService.remove(id); await get().refresh(); },
  addReport: async (input) => { await reportService.add(input); await get().refresh(); },
  removeReport: async (id) => { await reportService.remove(id); await get().refresh(); },

  takeDose: async (eventId) => {
    const evt = get().events.find((e) => e.id === eventId);
    const med = get().medications.find((m) => m.id === evt?.medicationId);
    await eventService.setStatus(eventId, 'taken');
    if (evt && med) {
      await familyService.pushFeed({
        type: 'dose_taken',
        title: `${get().user?.name ?? '本人'} 已服 ${med.name} ${evt.dosage}${evt.unit}`,
        byMemberId: 'fm_self',
        relatedMedId: med.id,
      });
    }
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
    const med = get().medications.find((m) => m.id === medId);
    if (med) {
      await familyService.pushFeed({
        type: 'restock',
        title: `已补药：${med.name} +${amount}`,
        byMemberId: 'fm_self',
        relatedMedId: medId,
      });
    }
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

  addFamilyMember: async (input) => {
    await familyService.addMember(input);
    await get().refresh();
  },
  toggleFamilyNotify: async (id, notify) => {
    await familyService.toggleNotify(id, notify);
    await get().refresh();
  },
  removeFamilyMember: async (id) => {
    await familyService.removeMember(id);
    await get().refresh();
  },
  pushFamilyFeed: async (input) => {
    await familyService.pushFeed(input);
    await get().refresh();
  },

  updateUser: async (patch) => {
    await userService.update(patch);
    await get().refresh();
  },
}));
