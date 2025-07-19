resource "aws_dynamodb_table" "this" {
  name           = var.table_name
  billing_mode   = "PAY_PER_REQEUST"
  hash_key       = var.partition_key

  attribute {
    name = var.partition_key
    type = var.partition_key_type
  }

  dynamic "global_secondary_index" {
    for_each = var.global_secondary_indexes
    content {
      name               = global_secondary_index.value.name
      hash_key           = global_secondary_index.value.hash_key
      projection_type    = global_secondary_index.value.projection_type
    }
  }

  dynamic "attribute" {
    for_each = var.gsi_attributes
    content {
      name = attribute.value.name
      type = attribute.value.type
    }
  }
}