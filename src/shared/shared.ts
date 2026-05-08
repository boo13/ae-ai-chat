import config from "../../cep.config";
export const ns = config.id;
export const company = config.zxp.org;
export const displayName = config.displayName;
export const version = config.version;

export type ContextChip =
  | { type: "comp"; label: string; compId: string }
  | { type: "layer"; label: string; layerIndex: number; compName: string }
  | {
      type: "effect";
      label: string;
      matchName: string;
      effectIndex: number;
      layerIndex: number;
      layerName: string;
    };
