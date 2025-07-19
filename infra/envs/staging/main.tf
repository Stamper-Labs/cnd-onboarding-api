data "terraform_remote_state" "core_infra" {
  backend = "s3"
  config = {
    bucket = "stamper-labs-tfstate-bucket"
    key    = "base-infra/terraform.tfstate"
    region = "us-east-1"
  }
}

module "cnd_policy_dynamo_full_access_staging" {
  source             = "../../module/iam_policy"
  policy_name        = "CndDynamoFullAccessPolicyStaging"
  policy_description = "Grants Connduct ECS tasks full access to DynamoDB tables in staging environment"
  policy             = file("./policy/dynamo-full-access.json")
}

module "cnd_role_tdef_staging" {
  source             = "../../module/iam_role"
  role_name          = "CndServiceRoleForTaskDefinitionStaging"
  assume_role_policy = file("./policy/ecs-task-assume-policy.json")
  policy_arns = {
    ecs_task_execution = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
    secrets_read_write = "arn:aws:iam::aws:policy/SecretsManagerReadWrite"
    dynamo_full_access = module.cnd_policy_dynamo_full_access_staging.arn
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
  td_execution_role_arn = module.cnd_role_tdef_staging.arn
  env_tag                  = "staging"
}