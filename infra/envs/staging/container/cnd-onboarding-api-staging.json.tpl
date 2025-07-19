[
  {
    "name": "cnd-onboarding-api",
    "image": "050752613795.dkr.ecr.us-east-1.amazonaws.com/stamper/cnd-onboarding-api:${image_tag}",
    "essential": true,
    "cpu": 128,
    "memory": 256,
    "command": ["yarn", "start:staging"],
    "portMappings": [
      {
        "containerPort": 3000,
        "hostPort": 3000,
        "protocol": "tcp"
      }
    ]
  }
]