# AWS CLI Setup for SIEM Lambda Testing
## Complete Student Tutorial

### Overview
This tutorial will guide you through setting up AWS CLI on macOS to create Lambda functions that simulate Windows event logs for SIEM testing. This approach is more efficient than running resource-heavy virtual machines.

### Prerequisites
- macOS (Intel or Apple Silicon)
- Homebrew installed ([install here](https://brew.sh) if needed)
- AWS account (free tier is sufficient)
- Terminal access

### Table of Contents
1. [Install AWS CLI](#install-aws-cli)
2. [Create IAM User (NOT Root!)](#create-iam-user)
3. [Configure AWS CLI](#configure-aws-cli)
4. [Verify Installation](#verify-installation)
5. [Next Steps](#next-steps)
6. [Security Best Practices](#security-best-practices)

---

## Install AWS CLI

### Step 1: Install AWS CLI v2 using Homebrew

```bash
# Install AWS CLI
brew install awscli

# Verify installation
aws --version
# Expected output: aws-cli/2.27.31 Python/3.13.4 Darwin/24.5.0 source/arm64
```

### Step 2: Install Additional Tools (Optional but Recommended)

```bash
# Install Node.js for Lambda development
brew install node

# Install jq for JSON parsing
brew install jq

# Install AWS SAM CLI for easier Lambda development
brew tap aws/tap
brew install aws-sam-cli
```

---

## Create IAM User

⚠️ **CRITICAL WARNING**: Never use root account access keys! They have unlimited permissions and cannot be restricted.

### Step 1: Sign in to AWS Console
1. Go to [https://console.aws.amazon.com/](https://console.aws.amazon.com/)
2. Sign in with your root account email and password

### Step 2: Navigate to IAM
1. In the AWS Console, search for "IAM" in the top search bar
2. Click on "IAM" to open Identity and Access Management

### Step 3: Create New User
1. Click **Users** in the left sidebar
2. Click **Create user** button
3. User details:
   - **User name**: `siem-testing` (or your preferred name)
   - **DO NOT** check "Provide user access to the AWS Management Console"
   - We only need programmatic access (CLI/API)

### Step 4: Set Permissions
1. Click **Next** to go to permissions
2. Select **"Attach policies directly"**
3. Search for and check these policies:
   - ✅ `AWSLambdaBasicExecutionRole`
   - ✅ `CloudWatchLogsFullAccess`
   - ✅ `IAMReadOnlyAccess` (optional but helpful)

### Step 5: Review and Create
1. Click **Next: Tags** (skip tags for now)
2. Click **Next: Review**
3. Click **Create user**

### Step 6: Create Access Keys
1. Click on your newly created user name
2. Go to **Security credentials** tab
3. Under "Access keys", click **Create access key**
4. Select **"Command Line Interface (CLI)"**
5. Check the acknowledgment box
6. Click **Next**
7. Add description (optional): `SIEM Lambda Testing - [Current Date]`
8. Click **Create access key**

### Step 7: Save Your Credentials
⚠️ **CRITICAL**: You'll only see the secret access key ONCE!

1. Click **Download .csv file** to save credentials
2. Or copy both values:
   - **Access key ID**: `AKIA...` (starts with AKIA)
   - **Secret access key**: `wJal...` (longer string)
3. Store these securely - you'll need them next

---

## Configure AWS CLI

### Step 1: Run AWS Configure

```bash
aws configure
```

### Step 2: Enter Your Configuration

You'll be prompted for four values:

```
AWS Access Key ID [None]: AKIAZRGF02Q35GUDG0UP
AWS Secret Access Key [None]: [paste your secret key here]
Default region name [None]: us-east-1
Default output format [None]: json
```

**Region Recommendations**:
- `us-east-1` (N. Virginia) - Recommended for US users
- `us-west-2` (Oregon) - Alternative option
- Choose the region closest to you with full service availability

### Step 3: Verify Configuration

```bash
# Test your credentials
aws sts get-caller-identity

# Expected output:
{
    "UserId": "AIDAI23HXB...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/siem-testing"
}
```

### Step 4: Check Configuration Files

```bash
# View stored credentials
cat ~/.aws/credentials

# View configuration
cat ~/.aws/config
```

---

## Verify Installation

### Test Basic AWS Commands

```bash
# List S3 buckets (might be empty)
aws s3 ls

# List Lambda functions (might be empty)
aws lambda list-functions

# Get current user info
aws iam get-user
```

---

## Next Steps

### 1. Create Your First Lambda Function

Create a file named `windows-event-simulator.js`:

```javascript
// windows-event-simulator.js
exports.handler = async (event) => {
    // Simulate Windows Security Event
    const windowsEvent = {
        TimeCreated: new Date().toISOString(),
        EventID: 4624,
        Level: "Information",
        Task: "Logon",
        Channel: "Security",
        Computer: "WIN-SERVER-01",
        EventData: {
            TargetUserName: "john.doe",
            TargetDomainName: "CORP",
            LogonType: "3",
            IpAddress: "192.168.1.100"
        }
    };
    
    console.log(JSON.stringify(windowsEvent));
    return { statusCode: 200, body: 'Event logged' };
};
```

### 2. Deploy the Lambda Function

```bash
# Zip the function
zip function.zip windows-event-simulator.js

# Create Lambda function
aws lambda create-function \
  --function-name WindowsEventSimulator \
  --zip-file fileb://function.zip \
  --handler windows-event-simulator.handler \
  --runtime nodejs18.x \
  --role arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/lambda-execution-role
```

### 3. Schedule Automatic Execution

```bash
# Create EventBridge rule (runs every 5 minutes)
aws events put-rule \
  --name WindowsEventSimulatorSchedule \
  --schedule-expression "rate(5 minutes)"
```

---

## Security Best Practices

### 1. Never Use Root Access Keys
- Root keys have unlimited permissions
- Always create IAM users with limited permissions
- Delete any root access keys immediately

### 2. Rotate Access Keys Regularly
```bash
# Create new access key
aws iam create-access-key --user-name siem-testing

# Update configuration
aws configure

# Delete old access key
aws iam delete-access-key --access-key-id OLD_KEY_ID --user-name siem-testing
```

### 3. Use Least Privilege Principle
- Only grant permissions actually needed
- Review and remove unused permissions regularly

### 4. Protect Your Credentials
```bash
# Set appropriate file permissions
chmod 600 ~/.aws/credentials
chmod 600 ~/.aws/config

# Never commit credentials to Git
echo "~/.aws/" >> ~/.gitignore
```

### 5. Monitor Key Usage
```bash
# Check when access key was last used
aws iam get-access-key-last-used --access-key-id YOUR_KEY_ID
```

---

## Troubleshooting

### Common Issues

1. **"Invalid credentials" error**
   - Verify access keys are correct
   - Check if keys are active in IAM console
   - Ensure no extra spaces when pasting

2. **"Access Denied" errors**
   - Check IAM user has required policies
   - Verify you're using the correct region
   - Some services may not be available in all regions

3. **"Command not found" error**
   - Restart terminal after installation
   - Run `brew update && brew upgrade awscli`
   - Check PATH includes Homebrew: `echo $PATH`

### Getting Help

```bash
# AWS CLI help
aws help
aws lambda help
aws iam help

# Check AWS service health
open https://status.aws.amazon.com/
```

---

## Cost Management

### Free Tier Limits (Monthly)
- Lambda: 1 million requests
- Lambda: 400,000 GB-seconds compute time
- CloudWatch Logs: 5GB ingestion
- CloudWatch Logs: 5GB storage

### Monitor Your Usage
```bash
# Check current month's charges
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE
```

---

## Additional Resources

- [AWS CLI Documentation](https://docs.aws.amazon.com/cli/latest/userguide/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS Free Tier](https://aws.amazon.com/free/)

---

## Summary

You've successfully:
1. ✅ Installed AWS CLI on macOS
2. ✅ Created a secure IAM user (not root!)
3. ✅ Configured AWS CLI with access keys
4. ✅ Verified the installation works
5. ✅ Learned security best practices

Next: Start creating Lambda functions to simulate log events for your SIEM testing without the overhead of virtual machines!

---

*Tutorial created for SecureWatch SIEM testing course*