export class OnboardingRuleViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OnboardingRuleViolationError';
  }
}
