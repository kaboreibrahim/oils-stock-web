/** « à l'instant », « il y a 5 min », « il y a 3 h », « il y a 2 j », sinon la date. */
export function tempsRelatif(iso: string): string {
  const date = new Date(iso);
  const secondes = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secondes < 45) return "à l'instant";
  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  if (jours < 7) return `il y a ${jours} j`;
  return date.toLocaleDateString("fr-FR");
}
