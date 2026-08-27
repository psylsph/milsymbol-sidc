/**
 * Field codes for positions 1-7 of the 20-character numeric SIDC
 * (MIL-STD-2525D/E and APP-6 D/E coding structure).
 *
 * Values are the literal digit codes that appear in the SIDC string.
 */

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
export type StandardIdentity = (typeof StandardIdentity)[keyof typeof StandardIdentity];

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
