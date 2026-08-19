# SSH Access & GitHub Actions CI/CD Setup & Troubleshooting Guide

This guide documents:
1. Connecting to the GCP Production VM directly from your local Windows PC (CMD/PowerShell)
2. Setting up and debugging GitHub Actions CI/CD automated deployment
3. Common issues encountered when downsizing/restarting GCP VMs and how to resolve them

---

## 1. Connect to GCP VM from Local Windows PC (Passwordless SSH)

Instead of using the GCP browser SSH terminal, you can connect directly from Windows Command Prompt, PowerShell, or VS Code terminal.

### Step 1: Generate an SSH Key Pair on Windows PC
Run in your **local Windows CMD**:
```cmd
ssh-keygen -t ed25519 -f %USERPROFILE%\.ssh\gcp_vm_key -N ""
```

### Step 2: View and Copy Your Public Key
Run in **Windows CMD**:
```cmd
type %USERPROFILE%\.ssh\gcp_vm_key.pub
```
Copy the printed line (starts with `ssh-ed25519 AAAAC3...`).

### Step 3: Authorize the Key on the GCP VM
Inside your **GCP VM terminal**, append the key:
```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "PASTE_YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Step 4: Connect from Windows
Run from **Windows CMD**:
```cmd
ssh -i %USERPROFILE%\.ssh\gcp_vm_key aidevelopment11@lifetrack.fun
```
*(Or use the external IP: `ssh -i %USERPROFILE%\.ssh\gcp_vm_key aidevelopment11@35.255.30.200`)*

---

### 💡 Pro-Tip: 1-Word Shortcut on Windows (`ssh lifetrack`)
Create or edit `C:\Users\PC\.ssh\config` on your Windows PC:

```text
Host lifetrack
    HostName lifetrack.fun
    User aidevelopment11
    IdentityFile ~/.ssh/gcp_vm_key
```

Now you can log in instantly with just:
```cmd
ssh lifetrack
```

---

## 2. GitHub Actions CI/CD Pipeline Configuration

Whenever you push to the `main` branch, `.github/workflows/deploy.yml` automatically SSHs into the VM, pulls the latest code, and runs `deploy.sh --pull` with zero downtime.

### Required GitHub Secrets
Go to **GitHub Repo → Settings → Secrets and variables → Actions** and configure:

| Secret Name | Value | Description |
|---|---|---|
| `VM_HOST` | `lifetrack.fun` (or `35.255.30.200`) | External IP or domain name of the VM |
| `VM_USER` | `aidevelopment11` | Linux username on the VM (`whoami`) |
| `VM_SSH_KEY` | *(Private Key Content)* | Full ED25519 private key generated on the VM |

### Generating the GitHub Actions Deploy Key on the VM
Run directly on the **GCP VM**:
```bash
# 1. Generate dedicated deployment key
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_key -N "" -q

# 2. Authorize it
cat ~/.ssh/github_actions_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# 3. Print the private key to copy to GitHub Secrets (VM_SSH_KEY)
cat ~/.ssh/github_actions_key
```

> **Important:** Copy the entire output including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`.

---

## 3. Troubleshooting & Root Cause Analysis

### Issue A: `ssh: handshake failed: unable to authenticate, attempted methods [none publickey]`
* **Cause:** The private key in GitHub secret `VM_SSH_KEY` does not match any entry in `~/.ssh/authorized_keys` on the VM, or file permissions are too open.
* **Fix:**
  1. Re-generate the key on the VM and append `.pub` to `authorized_keys`.
  2. Ensure strict permissions:
     ```bash
     chmod 700 ~
     chmod 700 ~/.ssh
     chmod 600 ~/.ssh/authorized_keys
     ```
  3. Ensure `VM_USER` matches the account where `authorized_keys` lives (`aidevelopment11`).

---

### Issue B: GCP Browser SSH Stuck on "Establishing connection..." or Connection Timeout
* **Cause:** After downsizing or editing VM machine type (e.g. from `e2-standard-8` to `e2-standard-4`), network tags or ephemeral public IPs may change/reset, or port 22 firewall rule is missing.
* **Fix:**
  1. Ensure firewall rule allows TCP port 22:
     ```bash
     gcloud compute firewall-rules create allow-ssh-ingress \
       --allow=tcp:22 --direction=INGRESS --priority=1000 \
       --network=default --source-ranges=0.0.0.0/0
     ```
  2. Add network tags to the VM:
     ```bash
     gcloud compute instances add-tags instance-20260801-185224 \
       --zone=us-central1-a --tags=lifetrack,http-server,https-server
     ```
  3. Connect via Google Cloud Shell using IAP tunnel (always works as backup):
     ```bash
     gcloud compute ssh instance-20260801-185224 --zone=us-central1-a --tunnel-through-iap
     ```

---

### Issue C: Ephemeral IP Changed After VM Stop/Restart
* **Cause:** Standard GCP external IPs are ephemeral unless explicitly promoted to static.
* **Impact:** `lifetrack.fun` DNS A-record and GitHub Actions `VM_HOST` secret point to the old IP.
* **Fix:**
  1. Check new External IP in GCP Console (Compute Engine → VM instances).
  2. Update Hostinger DNS A-record to the new IP.
  3. Update `VM_HOST` secret in GitHub.
