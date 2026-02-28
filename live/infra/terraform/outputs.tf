output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "hls_bucket" {
  value = aws_s3_bucket.hls.bucket
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.hls.domain_name
}
