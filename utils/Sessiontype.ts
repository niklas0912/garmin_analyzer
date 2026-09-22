// Sessions kennen aktuell keinen direkten Verweis auf ihren WorkoutType.
// Die id wird beim Erstellen aber fix als `${typeName}_${timestamp}` gebaut
// (siehe Beispiel-ids: "Intervalle 400m_1789553285555"), daher lässt sich der
// Typname zuverlässig daraus extrahieren — stabiler sogar als ein editierbares
// `name`-Feld, weil die id sich nach dem Anlegen nicht mehr ändert.
//
// Wichtig: nicht am ersten "_" splitten (Typnamen könnten selbst einen
// Unterstrich enthalten), sondern nur das abschließende "_<digits>"-Suffix
// abschneiden.
export function getWorkoutTypeNameFromId(id: string): string {
  const match = id.match(/^(.*)_\d+$/);
  return match ? match[1] : id;
}
