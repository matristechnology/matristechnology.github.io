// İHA'nın parçaları arasındaki bağlantılar: [nereden, nereye]. Kaynak: takımın Ön Tasarım Raporu'ndaki sistem mimarisi.
// Hem düğme ve panel kodu (iha-ici.ts) hem üç boyutlu model (iha-uc.ts) buradan okur.
export const HATLAR: Record<string, [string, string][]> = {
  guc: [['batarya', 'govde'], ['govde', 'esc'], ['esc', 'motor'], ['batarya', 'guc'], ['guc', 'bilgisayar'], ['guc', 'otopilot']],
  veri: [['gps', 'otopilot'], ['uwb', 'otopilot'], ['kamera', 'bilgisayar'], ['bilgisayar', 'otopilot'], ['bilgisayar', 'wifi']],
  sinyal: [['alici', 'otopilot'], ['otopilot', 'esc']],
};
/** Bir parçanın bütün bağlantıları: hangi hat üzerinden, hangi parçayla. */
export const baglantilar = (ad: string): { hat: string; diger: string }[] =>
  Object.entries(HATLAR).flatMap(([hat, l]) => l.filter((c) => c.includes(ad)).map((c) => ({ hat, diger: c[0] === ad ? c[1] : c[0] })));
