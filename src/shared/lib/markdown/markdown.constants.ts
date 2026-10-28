/** U+2003 EM SPACE. */
const EM_SPACE = String.fromCodePoint(0x2003);

/**
 * One step of the indent format: two em spaces. CommonMark treats only spaces and tabs as indentation, so these
 * never turn a line into a code block, and CSS `pre-line` keeps them (add-poem-creation design D6).
 */
export const INDENT_STEP = EM_SPACE.repeat(2);

/** The part separator as typed: a thematic break, drawn as a centred «* * *». */
export const SEPARATOR_LINE = "* * *";
