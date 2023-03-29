import { FIELD_SIZE_UI } from "./game-ui";

const PADDING = 16; // px
const SNAPPING = 32; // px

const PANEL_APPEAR_DURATION = 260; // ms
const PANEL_MIN_TRANSLATE = PADDING + FIELD_SIZE_UI / 2; // px
const PANEL_MIN_WIDTH = 512; // px
const PANEL_MAX_WIDTH = 800; // px
const PANEL_LAYOUT_TABLET = PANEL_MIN_WIDTH + SNAPPING; // px
const PANEL_LAYOUT_DESKTOP = FIELD_SIZE_UI + 2 * PADDING + PANEL_MIN_WIDTH; // px

const POPOVER_APPEARANCE_DESKTOP = 580; // px

const RESTART_POPOVER_TOP = 64; // px
const RESTART_POPOVER_RIGHT = 16; // px
const RESTART_POPOVER_WIDTH = 440; // px
const RESTART_POPOVER_POPOVER = POPOVER_APPEARANCE_DESKTOP; // px
const RESTART_POPOVER_DESKTOP =
  FIELD_SIZE_UI + 2 * RESTART_POPOVER_WIDTH + 4 * PADDING; // px
const RESTART_STATUS_MARGIN = 64; // px
const RESTART_STATUS_HEIGHT = 56; // px

enum PanelLayout {
  Mobile = "layout-mobile",
  Tablet = "layout-tablet",
  Desktop = "layout-desktop",
}

enum PopoverAppearance {
  Mobile = "popover-mobile",
  Desktop = "popover-desktop",
}

enum RestartPopoverAppearance {
  Mobile = "restart-popover-mobile",
  Auto = "restart-popover-auto",
  Desktop = "restart-popover-desktop",
}

function panelLayout(innerWidth: number): PanelLayout {
  if (innerWidth >= PANEL_LAYOUT_DESKTOP) {
    return PanelLayout.Desktop;
  } else if (innerWidth >= PANEL_LAYOUT_TABLET) {
    return PanelLayout.Tablet;
  }

  return PanelLayout.Mobile;
}

function popoverAppearance(innerWidth: number): PopoverAppearance {
  return innerWidth < POPOVER_APPEARANCE_DESKTOP
    ? PopoverAppearance.Mobile
    : PopoverAppearance.Desktop;
}

function restartPopoverAppearance(
  innerWidth: number
): RestartPopoverAppearance {
  const { Mobile, Auto: Popover, Desktop } = RestartPopoverAppearance;
  if (innerWidth < RESTART_POPOVER_POPOVER) {
    return Mobile;
  } else if (innerWidth < RESTART_POPOVER_DESKTOP) {
    return Popover;
  }

  return Desktop;
}

export {
  PANEL_APPEAR_DURATION,
  PANEL_MIN_TRANSLATE,
  PANEL_MIN_WIDTH,
  PANEL_MAX_WIDTH,
  PANEL_LAYOUT_TABLET,
  PANEL_LAYOUT_DESKTOP,
  POPOVER_APPEARANCE_DESKTOP,
  RESTART_POPOVER_TOP,
  RESTART_POPOVER_RIGHT,
  RESTART_POPOVER_WIDTH,
  RESTART_POPOVER_POPOVER,
  RESTART_POPOVER_DESKTOP,
  RESTART_STATUS_MARGIN,
  RESTART_STATUS_HEIGHT,
  panelLayout,
  popoverAppearance,
  restartPopoverAppearance,
  PanelLayout,
  PopoverAppearance,
  RestartPopoverAppearance,
};
