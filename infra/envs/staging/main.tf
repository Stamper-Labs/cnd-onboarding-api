data "terraform_remote_state" "core_infra" {
  backend = "s3"
  config = {
    bucket = "stamper-labs-tfstate-bucket"
    key    = "base-infra/terraform.tfstate"
    region = "us-east-1"
  }
}

module "cnd_onboarding_api_policy_provision_staging" {
  source             = "../../module/iam_policy"
  policy_name        = "CndOnboardingApiProvisionPolicyStaging"
  policy_description = "Grants ECS tasks of the Connduct Onboarding API in the staging environment access to required AWS services for task provisioning and execution."
  policy             = file("./policy/cnd-onboarding-api-tdef-provision-policy.json")
}

module "cnd_onboarding_api_role_tdef_staging" {
  source             = "../../module/iam_role"
  role_name          = "CndServiceRoleForTaskDefinitionStaging"
  assume_role_policy = file("./policy/cnd-onboarding-api-tdef-assume-policy.json")
  policy_arns = {
    ecs_task_execution = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
    secrets_read_write = "arn:aws:iam::aws:policy/SecretsManagerReadWrite"
    cnd_onboarding_api_provision = module.cnd_onboarding_api_policy_provision_staging.arn
  }
  env_tag = "staging"
}

module "cnd_onboarding_api_ecs_tdef_staging" {
  source                   = "../../module/ecs_task_definition"
  td_family                = "cnd-onboarding-api-ecs-tdef-staging"
  td_network_mode          = "awsvpc"
  td_compatibilities       = ["FARGATE"]
  td_cpu                   = "256"
  td_memory                = "512"
  td_container_definitions = templatefile( 
    "./container/cnd-onboarding-api.json.tpl",
    { image_tag = var.image_tag }
    )
  td_execution_role_arn = module.cnd_onboarding_api_role_tdef_staging.arn
  env_tag                  = "staging"
}