import { solidcoreConfig } from "./config";
import { readJsonFile, writeJsonFile } from "./fs";

type SolidcoreState = {
  lastAuthAlertAt?: string;
  lastCheckAt?: string;
  lastNotifiedTargetMonth?: string;
  lastResult?: {
    candidateLines: string[];
    matchedDays: number[];
    releaseDetected: boolean;
    selectedStudios?: string[];
    sessionInvalid?: boolean;
    targetMonth: string;
  };
};

export async function readSolidcoreState(): Promise<SolidcoreState> {
  return (await readJsonFile<SolidcoreState>(solidcoreConfig.stateFilePath)) ?? {};
}

export async function writeSolidcoreState(state: SolidcoreState): Promise<void> {
  await writeJsonFile(solidcoreConfig.stateFilePath, state);
}
