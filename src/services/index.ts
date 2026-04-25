import { db } from '@/mock/db';
import { uid } from '@/utils/id';
import { dayjs } from '@/utils/date';
import { generateScheduledEvents } from '@/utils/eventGenerator';
import type {
  FollowUp,
  Inventory,
  Medication,
  MedicationEvent,
  Regimen,
  User,
} from '@/types';

// Simulate async latency for nicer UX (await tokens)
const delay = <T>(v: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(v), 60));

export const userService = {
  async getCurrent(): Promise<User> {
    const d = db.read();
    const u = d.users.find((x) => x.id === d.currentUserId)!;
    return delay(u);
  },
  async update(patch: Partial<User>): Promise<User> {
    const next = db.write((d) => {
      d.users = d.users.map((u) =>
        u.id === d.currentUserId ? { ...u, ...patch } : u
      );
    });
    return delay(next.users.find((u) => u.id === next.currentUserId)!);
  },
};

export const medicationService = {
  async list(): Promise<{ medications: Medication[]; regimens: Regimen[] }> {
    const d = db.read();
    return delay({ medications: d.medications, regimens: d.regimens });
  },
  async create(input: {
    medication: Omit<Medication, 'id' | 'userId' | 'createdAt'>;
    regimen: Omit<Regimen, 'id' | 'medicationId'>;
    initialQuantity: number;
    lowStockThresholdDays: number;
  }): Promise<Medication> {
    const newMedId = uid('med');
    const newRegId = uid('reg');
    const newInvId = uid('inv');
    const userId = db.read().currentUserId;
    const med: Medication = {
      id: newMedId,
      userId,
      createdAt: dayjs().toISOString(),
      ...input.medication,
    };
    const reg: Regimen = {
      id: newRegId,
      medicationId: newMedId,
      ...input.regimen,
    };
    const inv: Inventory = {
      id: newInvId,
      medicationId: newMedId,
      quantity: input.initialQuantity,
      unit: input.regimen.unit,
      lowStockThresholdDays: input.lowStockThresholdDays,
      lastRestockedAt: dayjs().format('YYYY-MM-DD'),
      lastRestockAmount: input.initialQuantity,
    };

    db.write((d) => {
      d.medications.push(med);
      d.regimens.push(reg);
      d.inventories.push(inv);
      // generate events for the next 14 days for this med
      const newEvents = generateScheduledEvents({
        userId,
        medications: [med],
        regimens: [reg],
        from: dayjs().subtract(0, 'day').toDate(),
        to: dayjs().add(14, 'day').toDate(),
      });
      // dedupe by id
      const known = new Set(d.events.map((e) => e.id));
      for (const e of newEvents) if (!known.has(e.id)) d.events.push(e);
    });
    return delay(med);
  },
  async remove(id: string): Promise<void> {
    db.write((d) => {
      d.medications = d.medications.filter((m) => m.id !== id);
      d.regimens = d.regimens.filter((r) => r.medicationId !== id);
      d.inventories = d.inventories.filter((i) => i.medicationId !== id);
      d.events = d.events.filter((e) => e.medicationId !== id);
    });
    return delay(undefined);
  },
};

export const eventService = {
  async listRange(from: Date, to: Date): Promise<MedicationEvent[]> {
    const d = db.read();
    const a = from.toISOString();
    const b = to.toISOString();
    return delay(
      d.events.filter((e) => e.scheduledAt >= a && e.scheduledAt <= b)
    );
  },
  async setStatus(
    eventId: string,
    status: 'taken' | 'skipped' | 'pending'
  ): Promise<MedicationEvent> {
    let updated!: MedicationEvent;
    db.write((d) => {
      d.events = d.events.map((e) => {
        if (e.id !== eventId) return e;
        const prev = e.status;
        const next: MedicationEvent = {
          ...e,
          status,
          takenAt: status === 'taken' ? dayjs().toISOString() : null,
        };
        // inventory side-effect
        const inv = d.inventories.find((i) => i.medicationId === e.medicationId);
        if (inv) {
          if (prev !== 'taken' && status === 'taken') {
            inv.quantity = Math.max(0, inv.quantity - e.dosage);
          } else if (prev === 'taken' && status !== 'taken') {
            inv.quantity = inv.quantity + e.dosage;
          }
        }
        updated = next;
        return next;
      });
    });
    return delay(updated);
  },
};

export const inventoryService = {
  async list(): Promise<Inventory[]> {
    return delay(db.read().inventories);
  },
  async restock(medicationId: string, amount: number): Promise<Inventory> {
    let result!: Inventory;
    db.write((d) => {
      d.inventories = d.inventories.map((i) => {
        if (i.medicationId !== medicationId) return i;
        const next: Inventory = {
          ...i,
          quantity: i.quantity + amount,
          lastRestockedAt: dayjs().format('YYYY-MM-DD'),
          lastRestockAmount: amount,
        };
        result = next;
        return next;
      });
    });
    return delay(result);
  },
  async setThreshold(medicationId: string, days: number): Promise<void> {
    db.write((d) => {
      d.inventories = d.inventories.map((i) =>
        i.medicationId === medicationId ? { ...i, lowStockThresholdDays: days } : i
      );
    });
    return delay(undefined);
  },
};

export const followUpService = {
  async list(): Promise<FollowUp[]> {
    return delay(db.read().followUps);
  },
  async create(input: Omit<FollowUp, 'id' | 'userId'>): Promise<FollowUp> {
    let res!: FollowUp;
    db.write((d) => {
      const f: FollowUp = { id: uid('fu'), userId: d.currentUserId, ...input };
      d.followUps.push(f);
      res = f;
    });
    return delay(res);
  },
  async update(id: string, patch: Partial<FollowUp>): Promise<FollowUp> {
    let res!: FollowUp;
    db.write((d) => {
      d.followUps = d.followUps.map((f) => {
        if (f.id !== id) return f;
        res = { ...f, ...patch };
        return res;
      });
    });
    return delay(res);
  },
  async remove(id: string): Promise<void> {
    db.write((d) => {
      d.followUps = d.followUps.filter((f) => f.id !== id);
    });
    return delay(undefined);
  },
};

export const adminService = {
  async resetDemo(): Promise<void> {
    db.reset();
    return delay(undefined);
  },
};
