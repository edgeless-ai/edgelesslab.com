// Static, typed access to the axis banks exported from blender.py by
// generated/nous-mj-overnight/export_dashboard_data.py. Do not hand-edit
// data/banks.json -- regenerate it from the Python source of truth.

import rawBanks from "./data/banks.json";
import type { Banks } from "./types";

export const banks: Banks = rawBanks as unknown as Banks;
