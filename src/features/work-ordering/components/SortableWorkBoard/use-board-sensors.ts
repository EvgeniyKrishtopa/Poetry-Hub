"use client";

import { type KeyboardCoordinateGetter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";

import {
  KEYBOARD_CODES,
  MOUSE_DRAG_DISTANCE_PX,
  TOUCH_HOLD_MS,
  TOUCH_HOLD_TOLERANCE_PX,
} from "../../model/work-ordering.constants";

/** The three ways to lift a handle: a mouse drag, a touch hold, and Space on the keyboard (FR-7, design D5). */
export function useBoardSensors(getKeyboardCoordinates: KeyboardCoordinateGetter) {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: MOUSE_DRAG_DISTANCE_PX } }),
    useSensor(TouchSensor, { activationConstraint: { delay: TOUCH_HOLD_MS, tolerance: TOUCH_HOLD_TOLERANCE_PX } }),
    useSensor(KeyboardSensor, { keyboardCodes: KEYBOARD_CODES, coordinateGetter: getKeyboardCoordinates }),
  );
}
