export class OnboardingRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OnboardingRepositoryError';
  }
}
