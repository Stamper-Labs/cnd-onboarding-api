# IAM role for ECS Task Execution (needed for pulling images from ECR or accessing other AWS resources)
resource "aws_iam_role" "this" {
  name               = var.role_name
  assume_role_policy = var.assume_role_policy
  tags = {
    Name = var.role_name
    Env  = var.env_tag
  }
}

# IAM policy attachment for ECS task execution role
resource "aws_iam_role_policy_attachment" "this" {
  for_each   = var.policy_arns
  role       = aws_iam_role.this.name
  policy_arn = each.value
  depends_on = [aws_iam_role.this]
}
