variable "table_name" {
  description = "the table name"
  type = string
}

variable "partition_key" {
  description = "the hask key"
  type = string
}

variable "partition_key_type" {
  description = "the partition key data type"
  type = string
}

variable "global_secondary_indexes" {
  description = "the list of secondary indexes"
  type = list(object({
    name            = string
    hash_key        = string
    projection_type = string
  }))
  validation {
    condition = alltrue([
      for gsi in var.global_secondary_indexes :
      contains(["ALL", "KEYS_ONLY", "INCLUDE"], gsi.projection_type)
    ])
    error_message = "Each projection_type must be one of: ALL, KEYS_ONLY, or INCLUDE."
  }
}

variable "gsi_attributes" {
  description = "the list of global index attributes"
  type = list(object({
    name = string
    type = string
  }))
  validation {
    condition = alltrue([
      for gsi in var.global_secondary_indexes :
      contains(["S", "N", "B"], gsi.projection_type)
    ])
    error_message = "Each type must be one of: S, N, or B."
  }
}