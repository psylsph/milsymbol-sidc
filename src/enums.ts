/**
 * Configuration values and field codes for positions 1-20 of the 20-character
 * numeric SIDC (MIL-STD-2525D/E and APP-6 D/E coding structure).
 *
 * SIDC field values are the literal digit codes that appear in the string.
 */

/**
 * Symbol standard family.
 *
 * Values match milsymbol's `standard` option and `ms.setStandard()` API.
 */
export const Standard = {
  /** US MIL-STD-2525 (the default standard family). */
  MilStd2525: "2525",
  /** NATO APP-6. */
  App6: "APP6",
} as const;
export type Standard = (typeof Standard)[keyof typeof Standard];

/** Position 8: headquarters, task force, and feint/dummy indicator. */
export const HqTaskForceDummy = {
  None: "0",
  FeintDummy: "1",
  Headquarters: "2",
  FeintDummyHeadquarters: "3",
  TaskForce: "4",
  FeintDummyTaskForce: "5",
  TaskForceHeadquarters: "6",
  FeintDummyTaskForceHeadquarters: "7",
} as const;
export type HqTaskForceDummy =
  (typeof HqTaskForceDummy)[keyof typeof HqTaskForceDummy];

/** Positions 9-10: echelon, mobility, leadership, or auxiliary amplifier. */
export const Amplifier = {
  None: "00",
  TeamCrew: "11",
  Squad: "12",
  Section: "13",
  PlatoonDetachment: "14",
  CompanyBatteryTroop: "15",
  BattalionSquadron: "16",
  RegimentGroup: "17",
  Brigade: "18",
  Division: "21",
  CorpsMef: "22",
  Army: "23",
  ArmyGroupFront: "24",
  RegionTheater: "25",
  Command: "26",
  WheeledLimitedCrossCountry: "31",
  WheeledCrossCountry: "32",
  Tracked: "33",
  WheeledTrackedCombination: "34",
  Towed: "35",
  Rail: "36",
  PackAnimals: "37",
  OverSnowPrimeMover: "41",
  Sled: "42",
  Barge: "51",
  Amphibious: "52",
  ShortTowedArray: "61",
  LongTowedArray: "62",
  LeaderIndividual: "71",
  DeputyIndividual: "72",
} as const;
export type Amplifier = (typeof Amplifier)[keyof typeof Amplifier];

/** Positions 1-2: Version / standard edition. */
export const Version = {
  /** MIL-STD-2525D (edition D) */
  MilStd2525D: "10",
  /** APP-6 edition D */
  App6D: "11",
  /** MIL-STD-2525E (edition E) - the default */
  MilStd2525E: "13",
  /** APP-6 edition E */
  App6E: "14",
} as const;
export type Version = (typeof Version)[keyof typeof Version];

/** Position 3: Context. */
export const Context = {
  Reality: "0",
  Exercise: "1",
  Simulation: "2",
} as const;
export type Context = (typeof Context)[keyof typeof Context];

/** Position 4: Standard identity (affiliation). */
export const StandardIdentity = {
  Pending: "0",
  Unknown: "1",
  AssumedFriend: "2",
  Friend: "3",
  Neutral: "4",
  /** Dual-use: Suspect (reality) / Joker (exercise). */
  SuspectJoker: "5",
  /** Dual-use: Hostile (reality) / Faker (exercise). */
  HostileFaker: "6",
} as const;
export type StandardIdentity =
  (typeof StandardIdentity)[keyof typeof StandardIdentity];

/** Positions 5-6: Symbol set. Only sets supported by milsymbol are listed. */
export const SymbolSet = {
  Unknown: "00",
  Air: "01",
  AirMissile: "02",
  Space: "05",
  SpaceMissile: "06",
  LandUnit: "10",
  LandCivilianUnit: "11",
  LandEquipment: "15",
  Installation: "20",
  ControlMeasure: "25",
  LandDismountedIndividual: "27",
  SeaSurface: "30",
  SeaSubsurface: "35",
  MineWarfare: "36",
  Activity: "40",
  SignalsIntelligenceSpace: "50",
  SignalsIntelligenceAir: "51",
  SignalsIntelligenceLand: "52",
  SignalsIntelligenceSeaSurface: "53",
  SignalsIntelligenceSubsurface: "54",
  Cyberspace: "60",
} as const;
export type SymbolSet = (typeof SymbolSet)[keyof typeof SymbolSet];

/** Position 7: Status / condition. */
export const Status = {
  Present: "0",
  Planned: "1",
  FullyCapable: "2",
  Damaged: "3",
  Destroyed: "4",
  FullToCapacity: "5",
} as const;
export type Status = (typeof Status)[keyof typeof Status];
