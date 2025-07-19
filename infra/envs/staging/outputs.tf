output "cnd_onboarding_api_ecs_tdef_staging_arn" {
  value = module.cnd_onboarding_api_ecs_tdef_staging.arn
}

output "stamper_vpc_subnet_a_public_id" {
  value = data.terraform_remote_state.core_infra.outputs.stamper_vpc_subnet_a_public_id
}

output "stamper_vpc_subnet_b_private_id" {
  value = data.terraform_remote_state.core_infra.outputs.stamper_vpc_subnet_b_private_id
}

output "stamper_vpc_security_group_id" {
  value = data.terraform_remote_state.core_infra.outputs.stamper_vpc_security_group_id
}

output "cnd_ecs_cluster_staging_name" {
  value = data.terraform_remote_state.core_infra.outputs.cnd_ecs_cluster_staging_name
}