// Keeps the room map in step with the server: my request's status, and beds other students hold.
import { api } from './api.js';
import { B, S, placeMe, refresh, roomAt, toast } from './store.js';

const ACTIVE = ['pending', 'approved'];

export async function syncRooms(first) {
  const [mine, occ] = await Promise.all([api('room-requests/mine'), api('room-requests/occupancy')]);

  if (occ.ok) {
    const live = new Set(occ.data.map((o) => o.id));
    for (const x of B) for (const blk of x.blocks) for (const fl of blk) for (const rm of fl) rm.ppl = rm.ppl.filter((p) => !p.rid || live.has(p.rid));
    occ.data.forEach((o) => {
      const rm = roomAt(o.building, o.room);
      if (rm && !rm.ppl.some((p) => p.rid === o.id) && rm.ppl.length < rm.cap) rm.ppl.push({ n: o.name, g: o.g, c: o.c, y: 1, f: 'Student', rid: o.id });
    });
  }

  if (mine.ok) {
    const prev = S.roomReqs;
    S.roomReqs = mine.data;
    S.roomReq = mine.data.find((r) => ACTIVE.includes(r.status)) || null;
    const a = S.roomReq;
    if (a?.status === 'approved') { const rm = roomAt(a.building, a.room); if (rm && S.myRoom !== rm) placeMe(rm); }
    if (!first) mine.data.forEach((r) => {
      const p = prev.find((x) => x.id === r.id);
      if (p?.status === 'pending' && r.status === 'approved') toast('🎉 Approved! Room ' + r.room + ' is yours. Pick up your key card at reception.');
      if (p?.status === 'pending' && r.status === 'rejected') toast('Your request for ' + r.room + ' was rejected. See Requests for the reason.');
    });
  }
  refresh();
}
