variable "project_name" {
  type    = string
  default = "theshuk-live"
}

variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "hls_bucket_name" {
  type = string
}

variable "acm_certificate_arn" {
  type    = string
  default = ""
}

variable "eks_version" {
  type    = string
  default = "1.30"
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}
