// Matris sayfası ve "İHA'nın içi" benzetiminin arayüz metinleri. Uzun anlatımlar icerik.yaml içinde (iha, matris_sayfa).
import type { Dil } from './icerik';

const m = {
  alan: { tr: 'Takımın İHA’sının döndürülebilen üç boyutlu çizimi. Parçalar aşağıdaki düğmelerle de seçilebilir.', en: 'A rotatable 3D drawing of the team’s UAV. Parts can also be picked with the buttons below.' },
  ayir: { tr: 'Parçalara ayır', en: 'Take apart' },
  topla: { tr: 'Topla', en: 'Put together' },
  hatlar: { tr: 'Bağlantıları göster', en: 'Show connections' },
  parcalar: { tr: 'Parçalar', en: 'Parts' },
  bagli: { tr: 'Bağlı olduğu parçalar', en: 'Connected to' },
  ipucu: { tr: 'Bir parçaya tıkla ya da aşağıdan seç.', en: 'Click a part or pick one below.' },
  uye: { tr: 'Üye', en: 'Members' },
  ekip: { tr: 'Ana ekip', en: 'Main teams' },
  dal: { tr: 'Çalışma dalı', en: 'Branches' },
  finalist: { tr: 'TEKNOFEST finalistliği', en: 'TEKNOFEST finals' },
  duraklar: { tr: 'Dönemler', en: 'Periods' },
  onceki: { tr: 'Önceki', en: 'Previous' },
  sonraki: { tr: 'Sonraki', en: 'Next' },
} as const;

export type MAnahtar = keyof typeof m;
export const mm = (a: MAnahtar, dil: Dil): string => m[a][dil];
export const mPaket = (dil: Dil): string => JSON.stringify(Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v[dil]])));
