variable "role_name" {
  description = "the role name"
  type        = string
}

variable "assume_role_policy" {
  description = "the assume role policy"
  type        = string
}

variable "policy_arns" {
  description = "Map of policy ARNs to attach"
  type        = map(string)
  default     = {}
}

variable "env_tag" {
  description = "the environment"
  type        = string
}
