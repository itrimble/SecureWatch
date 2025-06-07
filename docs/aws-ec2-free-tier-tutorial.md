# AWS EC2 Free Tier VMs for SIEM Testing
## Creating Virtual Machines to Complement Lambda Log Simulation

### Overview
This tutorial extends the AWS CLI setup to create free tier EC2 instances (VMs) for comprehensive SIEM testing. You'll learn to launch Windows and Linux instances that generate real OS logs.

### Prerequisites
- Completed AWS CLI setup from previous tutorial
- Active AWS account with free tier eligibility
- SSH client (built into macOS/Linux)
- RDP client for Windows instances (Microsoft Remote Desktop for Mac)

### Free Tier Limits (12 months from account creation)
- **750 hours/month** of t2.micro or t3.micro instances
- Can run 1 instance 24/7 or multiple instances part-time
- **30 GB** of EBS storage
- **15 GB** of bandwidth

---

## Important Notes

### Available Operating Systems
- ✅ **Windows Server** (2019, 2022)
- ✅ **Linux** (Amazon Linux, Ubuntu, CentOS, Debian, etc.)
- ❌ **macOS** (Not available on EC2)

### Instance Type
- **t2.micro** or **t3.micro** only for free tier
- 1 vCPU, 1 GB RAM
- Suitable for light testing

---

## Step 1: Create Security Credentials

### Create a Key Pair for SSH/RDP Access

```bash
# Create key pair for SSH access (Linux) and RDP (Windows)
aws ec2 create-key-pair \
  --key-name siem-testing-key \
  --query 'KeyMaterial' \
  --output text > ~/siem-testing-key.pem

# Set proper permissions (macOS/Linux)
chmod 400 ~/siem-testing-key.pem

# Verify key was created
ls -la ~/siem-testing-key.pem
```

---

## Step 2: Create Security Group

### Set Up Firewall Rules

```bash
# Create security group
aws ec2 create-security-group \
  --group-name siem-testing-sg \
  --description "Security group for SIEM testing VMs"

# Get your IP address
MY_IP=$(curl -s https://checkip.amazonaws.com)
echo "Your IP is: $MY_IP"

# Allow SSH (for Linux)
aws ec2 authorize-security-group-ingress \
  --group-name siem-testing-sg \
  --protocol tcp \
  --port 22 \
  --cidr $MY_IP/32

# Allow RDP (for Windows)
aws ec2 authorize-security-group-ingress \
  --group-name siem-testing-sg \
  --protocol tcp \
  --port 3389 \
  --cidr $MY_IP/32

# Allow ICMP (ping)
aws ec2 authorize-security-group-ingress \
  --group-name siem-testing-sg \
  --protocol icmp \
  --port -1 \
  --cidr $MY_IP/32
```

---

## Step 3: Launch EC2 Instances

### Option A: Windows Server 2022 (Free Tier)

```bash
# Find Windows AMI ID
aws ec2 describe-images \
  --owners amazon \
  --filters \
    "Name=platform,Values=windows" \
    "Name=architecture,Values=x86_64" \
    "Name=name,Values=Windows_Server-2022-English-Full-Base-*" \
  --query 'Images[0].ImageId' \
  --output text

# Launch Windows instance
aws ec2 run-instances \
  --image-id ami-0c2b0d3fb02824d92 \
  --instance-type t2.micro \
  --key-name siem-testing-key \
  --security-groups siem-testing-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=SIEM-Windows-Test}]' \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp2"}}]'
```

### Option B: Ubuntu 24.04 LTS (Free Tier)

```bash
# Find Ubuntu AMI ID
aws ec2 describe-images \
  --owners 099720109477 \
  --filters \
    "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" \
    "Name=state,Values=available" \
  --query 'Images[0].ImageId' \
  --output text

# Launch Ubuntu instance
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t2.micro \
  --key-name siem-testing-key \
  --security-groups siem-testing-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=SIEM-Ubuntu-Test}]'
```

### Option C: Amazon Linux 2023 (Free Tier)

```bash
# Launch Amazon Linux instance
aws ec2 run-instances \
  --image-id resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --instance-type t2.micro \
  --key-name siem-testing-key \
  --security-groups siem-testing-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=SIEM-AmazonLinux-Test}]'
```

---

## Step 4: Get Instance Information

### List Running Instances

```bash
# View all instances
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[*].Instances[*].[InstanceId,Tags[?Key==`Name`].Value|[0],PublicIpAddress,Platform]' \
  --output table
```

### Get Specific Instance Details

```bash
# Store instance IDs in variables
WINDOWS_ID=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=SIEM-Windows-Test" "Name=instance-state-name,Values=running" --query 'Reservations[0].Instances[0].InstanceId' --output text)
UBUNTU_ID=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=SIEM-Ubuntu-Test" "Name=instance-state-name,Values=running" --query 'Reservations[0].Instances[0].InstanceId' --output text)

# Get public IPs
WINDOWS_IP=$(aws ec2 describe-instances --instance-ids $WINDOWS_ID --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
UBUNTU_IP=$(aws ec2 describe-instances --instance-ids $UBUNTU_ID --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo "Windows IP: $WINDOWS_IP"
echo "Ubuntu IP: $UBUNTU_IP"
```

---

## Step 5: Connect to Instances

### Connect to Linux Instances (SSH)

```bash
# Connect to Ubuntu
ssh -i ~/siem-testing-key.pem ubuntu@$UBUNTU_IP

# Connect to Amazon Linux
ssh -i ~/siem-testing-key.pem ec2-user@$AMAZON_LINUX_IP

# If connection refused, wait 2-3 minutes for instance to fully boot
```

### Connect to Windows Instances (RDP)

#### Get Windows Password

```bash
# Get Windows admin password (wait ~4 minutes after launch)
aws ec2 get-password-data \
  --instance-id $WINDOWS_ID \
  --priv-launch-key ~/siem-testing-key.pem \
  --query 'PasswordData' \
  --output text
```

#### Connect via RDP

1. Open Microsoft Remote Desktop
2. Add new PC:
   - PC name: `[Windows Public IP]`
   - User account: `Administrator`
   - Password: `[From previous command]`
3. Connect and accept certificate

---

## Step 6: Configure Instances for SIEM

### Windows Configuration

```powershell
# Once connected via RDP, open PowerShell as Administrator

# Enable Windows Event Log forwarding
winrm quickconfig -y

# Set up audit policies for better logging
auditpol /set /subcategory:"Logon" /success:enable /failure:enable
auditpol /set /subcategory:"Logoff" /success:enable /failure:enable
auditpol /set /subcategory:"Account Lockout" /success:enable /failure:enable

# Install Sysmon for enhanced logging (optional)
Invoke-WebRequest -Uri https://download.sysinternals.com/files/Sysmon.zip -OutFile Sysmon.zip
Expand-Archive Sysmon.zip
cd Sysmon
.\Sysmon64.exe -accepteula -i
```

### Linux Configuration

```bash
# Configure rsyslog for remote logging
sudo nano /etc/rsyslog.conf

# Add these lines for remote logging to your SIEM
# *.* @@your-siem-server:514  # TCP
# *.* @your-siem-server:514   # UDP

# Install auditd for enhanced logging
sudo apt update && sudo apt install auditd  # Ubuntu
sudo yum install audit  # Amazon Linux

# Start audit service
sudo systemctl enable auditd
sudo systemctl start auditd

# Add audit rules
sudo auditctl -w /etc/passwd -p wa -k passwd_changes
sudo auditctl -w /var/log/sudo.log -p wa -k sudo_commands
```

---

## Step 7: Install CloudWatch Agent (Send Logs to AWS)

### On Linux Instances

```bash
# Download CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# Configure the agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

### On Windows Instances

```powershell
# Download CloudWatch agent
Invoke-WebRequest -Uri https://s3.amazonaws.com/amazoncloudwatch-agent/windows/amd64/latest/amazon-cloudwatch-agent.msi -OutFile amazon-cloudwatch-agent.msi

# Install
msiexec /i amazon-cloudwatch-agent.msi

# Configure
cd "C:\Program Files\Amazon\AmazonCloudWatchAgent"
.\amazon-cloudwatch-agent-config-wizard.exe
```

---

## Step 8: Managing Instance Costs

### Stop Instances When Not in Use

```bash
# Stop instances (no charges while stopped, only EBS storage)
aws ec2 stop-instances --instance-ids $WINDOWS_ID $UBUNTU_ID

# Start instances when needed
aws ec2 start-instances --instance-ids $WINDOWS_ID $UBUNTU_ID

# Check instance states
aws ec2 describe-instances \
  --instance-ids $WINDOWS_ID $UBUNTU_ID \
  --query 'Reservations[*].Instances[*].[InstanceId,State.Name]' \
  --output table
```

### Create Stop/Start Scripts

```bash
# Create stop script
cat > stop-siem-instances.sh << 'EOF'
#!/bin/bash
echo "Stopping SIEM test instances..."
aws ec2 stop-instances \
  --instance-ids $(aws ec2 describe-instances \
    --filters "Name=tag-key,Values=Name" "Name=tag-value,Values=SIEM-*" "Name=instance-state-name,Values=running" \
    --query 'Reservations[*].Instances[*].InstanceId' \
    --output text)
echo "Instances stopped. No compute charges while stopped."
EOF

chmod +x stop-siem-instances.sh
```

---

## Step 9: Monitor Usage and Costs

### Check Free Tier Usage

```bash
# View current month usage
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity DAILY \
  --metrics "UsageQuantity" \
  --filter file://free-tier-filter.json \
  --group-by Type=DIMENSION,Key=USAGE_TYPE

# Check EC2 hours used
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=$WINDOWS_ID \
  --statistics Average \
  --start-time $(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600
```

---

## Step 10: Clean Up Resources

### Terminate Instances (When Done Testing)

```bash
# WARNING: This permanently deletes instances
# Terminate all test instances
aws ec2 terminate-instances \
  --instance-ids $(aws ec2 describe-instances \
    --filters "Name=tag-key,Values=Name" "Name=tag-value,Values=SIEM-*" \
    --query 'Reservations[*].Instances[*].InstanceId' \
    --output text)

# Delete security group (after instances are terminated)
aws ec2 delete-security-group --group-name siem-testing-sg

# Delete key pair
aws ec2 delete-key-pair --key-name siem-testing-key
rm ~/siem-testing-key.pem
```

---

## Best Practices for SIEM Testing

### 1. Time Management
- **750 hours/month** = ~31 days of 1 instance
- Running 3 instances = ~10 days each
- Stop instances when not actively testing

### 2. Log Collection Strategy
- Use CloudWatch Logs for centralization
- Forward to your SIEM via:
  - CloudWatch Logs subscription
  - Direct agent installation (Splunk, Elastic, etc.)
  - Syslog forwarding

### 3. Security Considerations
- Regularly update security group IPs
- Use Systems Manager Session Manager instead of direct SSH/RDP
- Enable CloudTrail for audit logging

### 4. Cost Optimization
```bash
# Set up daily stop schedule
aws events put-rule \
  --name StopSIEMInstances \
  --schedule-expression "cron(0 2 * * ? *)"  # 2 AM UTC daily
```

---

## Common SIEM Integration Patterns

### 1. Filebeat/Winlogbeat to Elasticsearch
```bash
# On Linux
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.11.0-linux-x86_64.tar.gz
tar xzvf filebeat-8.11.0-linux-x86_64.tar.gz

# On Windows
Invoke-WebRequest -Uri https://artifacts.elastic.co/downloads/beats/winlogbeat/winlogbeat-8.11.0-windows-x86_64.zip -OutFile winlogbeat.zip
```

### 2. Splunk Universal Forwarder
```bash
# Install on Linux
wget -O splunkforwarder.tgz 'https://www.splunk.com/bin/splunk/DownloadActivityServlet?architecture=x86_64&platform=linux&version=latest&product=universalforwarder&filename=splunkforwarder-latest-Linux-x86_64.tgz&wget=true'
```

### 3. AWS Native Solution
- CloudWatch Logs → Kinesis Data Firehose → S3 → SIEM

---

## Troubleshooting

### Instance Won't Start
```bash
# Check instance status
aws ec2 describe-instance-status --instance-id $INSTANCE_ID

# View system logs
aws ec2 get-console-output --instance-id $INSTANCE_ID
```

### Can't Connect
1. Verify security group allows your current IP
2. Check instance is running
3. Ensure correct username (ubuntu, ec2-user, Administrator)
4. Wait 3-5 minutes after launch

### Free Tier Exceeded
- Check account age (>12 months loses free tier)
- Verify using t2.micro or t3.micro
- Monitor total hours across all instances

---

## Summary

You now have:
1. ✅ Key pair for secure access
2. ✅ Security group with proper rules
3. ✅ Windows and Linux EC2 instances
4. ✅ Connection methods for both platforms
5. ✅ Cost management strategies
6. ✅ SIEM integration approaches

Combined with your Lambda functions, you have a comprehensive log generation environment for SIEM testing!

---

## Next Steps
1. Configure log forwarding to SecureWatch
2. Create test scenarios (failed logins, privilege escalation)
3. Set up automated start/stop schedules
4. Document log patterns for analysis

---

*Remember: Stop instances when not in use to maximize your 750 free hours!*