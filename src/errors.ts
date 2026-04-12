export class ConsultingLangError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly column?: number,
  ) {
    super(message);
    this.name = "ConsultingLangError";
  }
}

export const errors = {
  undefinedVariable: (name: string) => `${name} hasn't been onboarded yet.`,
  wrongArgumentCount: "This synergy requires more stakeholders.",
  infiniteLoop: (cycles: number) =>
    `This initiative has been looping back for ${cycles} cycles. Escalating to leadership.`,
  typeError: "These deliverables are not aligned.",
  syntax: (line: number) =>
    `This doesn't land for me. Can you socialise this differently? (line ${line})`,
  stackOverflow: "We've exceeded capacity. Let's take this to a smaller room.",
  divisionByZero: "You cannot divide bandwidth that doesn't exist.",
  missingKickOff: "Nobody said we were starting. Please wait for the kick-off.",
  missingCloseTheLoop: "This initiative was never properly closed out. Circle back.",
  indexOutOfBounds: (index: unknown) => `Stakeholder ${index} is not in the room.`,
  invalidDeckExtension: "This deliverable needs to be a .deck file.",
  missingFile: (file: string) => `The deck ${file} hasn't been onboarded yet.`,
  unknownCommand: (command: string) => `The ${command} workstream is not on the roadmap.`,
};

export function syntaxError(line: number, column?: number): ConsultingLangError {
  return new ConsultingLangError(errors.syntax(line), line, column);
}

export function normalizeError(error: unknown): Error {
  if (error instanceof ConsultingLangError) {
    return error;
  }

  if (error instanceof RangeError) {
    return new ConsultingLangError(errors.stackOverflow);
  }

  if (error instanceof ReferenceError) {
    const match = /^(.+?) is not defined/.exec(error.message);
    return new ConsultingLangError(errors.undefinedVariable(match?.[1] ?? "That"));
  }

  if (error instanceof TypeError) {
    return new ConsultingLangError(errors.typeError);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}
