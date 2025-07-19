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
  validation {
    condition     = contains(["S", "N", "B"], var.partition_key_type)
    error_message = "Partition key type must be one of: S (string), N (number), or B (binary)."
  }
}

variable "global_secondary_indexes" {
  description = "The list of secondary indexes"
  type = list(object({
    name            = string
    hash_key        = string
    projection_type = string
    type            = string
  }))

  validation {
    condition = alltrue([
      for gsi in var.global_secondary_indexes :
      contains(["ALL", "KEYS_ONLY", "INCLUDE"], gsi.projection_type)
    ])
    error_message = "Each projection_type must be one of: ALL, KEYS_ONLY, or INCLUDE."
  }

  validation {
    condition = alltrue([
      for gsi in var.global_secondary_indexes :
      contains(["S", "N", "B"], gsi.type)
    ])
    error_message = "Each index type must be one of: S (String), N (Number), or B (Binary)."
  }
}