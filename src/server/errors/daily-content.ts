export class DailyContentValidationError extends Error {
  readonly kind = "DailyContentValidationError" as const;
  constructor(message: string) {
    super(message);
    this.name = "DailyContentValidationError";
  }
}
