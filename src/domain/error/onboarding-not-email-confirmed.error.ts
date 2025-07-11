export class OnboardingNotEmailConfirmedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OnboardingNotEmailConfirmedError';
  }
}
