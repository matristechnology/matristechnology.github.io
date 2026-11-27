// Takım sayfasının arayüz metinleri. Uzun anlatımlar icerik.yaml içinde (takim_sayfa, dal_anlatim).
import type { Dil } from './icerik';

const m = {
  semaAlan: { tr: 'Organizasyon şeması', en: 'Organisation chart' },
  turEkip: { tr: 'Ana ekip', en: 'Main group' },
  turDal: { tr: 'Dal', en: 'Branch' },
  kisi: { tr: 'kişi', en: 'people' },
  kisiTek: { tr: 'kişi', en: 'person' },
  gorevler: { tr: 'Buradaki görevler', en: 'Roles here' },
  uyeleriGoster: { tr: 'Üyeleri göster', en: 'Show members' },
  suz: { tr: 'Ekibe göre süz', en: 'Filter by group' },
  hepsi: { tr: 'Hepsi', en: 'All' },
  dal: { tr: 'Dal', en: 'Branch' },
  tumDallar: { tr: 'Tüm dallar', en: 'All branches' },
  ara: { tr: 'Ada ya da göreve göre ara', en: 'Search by name or role' },
  sonuc: { tr: '{t} üyeden {n} tanesi gösteriliyor.', en: 'Showing {n} of {t} members.' },
  bos: { tr: 'Bu süzgece uyan üye yok.', en: 'No member matches this filter.' },
  uye: { tr: 'Üye', en: 'Member' },
  isimYakinda: { tr: 'İsim yakında', en: 'Name coming soon' },
  profil: { tr: 'LinkedIn', en: 'LinkedIn' },
  github: { tr: 'GitHub', en: 'GitHub' },
  katilisYil: { tr: "{y} yılından beri takımda", en: 'On the team since {y}' },
  dallar: { tr: 'Dallar', en: 'Branches' },
} as const;

export type TAnahtar = keyof typeof m;
export const tm = (a: TAnahtar, dil: Dil): string => m[a][dil];
export const tPaket = (dil: Dil): string => JSON.stringify(Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v[dil]])));
