# NPM Dependency Confusion RCE Proof-of-Concept

This repository contains a payload demonstrating a Remote Code Execution (RCE) vulnerability via NPM dependency confusion attacks. The payload first establishes a reverse shell, allowing the attacker to extract sensitive information such as AWS secrets, credentials, and other critical data.

# Payload Functionality
The payload performs the following actions:

## Command Execution:
It uses a stealthy execution wrapper to run commands and handle errors.

## AWS Metadata Extraction:
It retrieves AWS IAM role credentials and instance metadata by querying the AWS Metadata Service.

## Environment Variable Extraction:
It scans environment variables for any containing AWS credentials.

## File System Search:
It searches common file paths for AWS credentials files.

## Container Credentials Extraction:
It extracts credentials from ECS tasks and Kubernetes service accounts if running in a containerized environment.

## Data Exfiltration:
It exfiltrates collected data via DNS and HTTP requests and writes it to a temporary file for persistence.

## Reverse Shell Establishment:
It attempts to create a reverse shell connection to a specified attacker's IP and port, allowing for interactive access.

## Main Execution:
It runs immediately when the package is installed, extracting and exfiltrating AWS credentials and establishing a reverse shell for further exploitation.


# Disclaimer
This repository is intended for educational purposes only. Use this information responsibly and ethically. Do not attempt to exploit vulnerabilities without proper authorization.
