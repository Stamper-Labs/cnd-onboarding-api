import { OnboardingCheckpoint } from './onboarding-checkpoint.enum';

export class Onboarding {
  constructor(
    private readonly onboardingId: string,
    private readonly checkpoint: OnboardingCheckpoint,
    private readonly email: string,
    private readonly mobile?: string,
    private readonly emailOtp?: string,
    private readonly mobileOtp?: string,
  ) {}

  getOnboardingId(): string {
    return this.onboardingId;
  }

  getCheckpoint(): OnboardingCheckpoint {
    return this.checkpoint;
  }

  getEmail(): string {
    return this.email;
  }

  getMobile(): string | undefined {
    return this.mobile;
  }

  getEmailOtp(): string | undefined {
    return this.emailOtp;
  }

  getMobileOtp(): string | undefined {
    return this.mobileOtp;
  }

  static builder() {
    return new OnboardingBuilder();
  }
}

class OnboardingBuilder {
  private onboardingId!: string;
  private checkpoint: OnboardingCheckpoint;
  private email: string;
  private mobile?: string;
  private emailOtp?: string;
  private mobileOtp?: string;

  setOnboardingId(onboardingId: string): this {
    this.onboardingId = onboardingId;
    return this;
  }

  setCheckpoint(checkpoint: OnboardingCheckpoint): this {
    this.checkpoint = checkpoint;
    return this;
  }

  setEmail(email: string): this {
    this.email = email;
    return this;
  }

  setMobile(mobile: string): this {
    this.mobile = mobile;
    return this;
  }

  setEmailOtp(emailOtp: string): this {
    this.emailOtp = emailOtp;
    return this;
  }

  setMobileOtp(mobileOtp: string): this {
    this.mobileOtp = mobileOtp;
    return this;
  }

  build(): Onboarding {
    if (!this.onboardingId) {
      throw new Error('onboardingId is required to build an Onboarding object');
    }
    if (!this.checkpoint) {
      throw new Error('checkpoint is required to build an Onboarding object');
    }
    if (!this.email) {
      throw new Error('email is required to build an Onboarding object');
    }
    return new Onboarding(
      this.onboardingId,
      this.checkpoint,
      this.email,
      this.mobile,
      this.emailOtp,
      this.mobileOtp,
    );
  }
}
