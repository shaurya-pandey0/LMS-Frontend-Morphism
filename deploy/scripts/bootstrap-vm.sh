#!/usr/bin/env bash
# =============================================================================
#  One-time VM preparation for LifeTrack on Debian 13 (trixie).
#  Tested target: GCE e2-standard-8, debian-13-trixie, x86_64.
#
#  Installs Docker Engine + compose plugin from Docker's official apt repo,
#  adds the current user to the docker group, and applies a few host tweaks.
#
#  Usage (on the VM):
#     sudo bash deploy/scripts/bootstrap-vm.sh
#     exec newgrp docker      # or log out and back in
# =============================================================================
set -euo pipefail

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Run with sudo: sudo bash $0"

TARGET_USER="${SUDO_USER:-$(id -un)}"

log "Host: $(. /etc/os-release && echo "$PRETTY_NAME") $(uname -m), $(nproc) vCPU, $(free -g | awk '/^Mem:/{print $2}') GB RAM"

# --- 1. Base packages --------------------------------------------------------
log "Updating apt and installing base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg git jq unzip \
    mysql-client apache2-utils

# --- 2. Docker Engine --------------------------------------------------------
if command -v docker >/dev/null 2>&1; then
    log "Docker already installed: $(docker --version)"
else
    log "Installing Docker Engine + compose plugin"
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg \
        -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    # Debian 13 (trixie) has its own Docker repo suite.
    CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME}")"
    cat >/etc/apt/sources.list.d/docker.list <<EOF
deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian ${CODENAME} stable
EOF

    apt-get update -qq
    apt-get install -y --no-install-recommends \
        docker-ce docker-ce-cli containerd.io \
        docker-buildx-plugin docker-compose-plugin
fi

systemctl enable --now docker
log "Docker: $(docker --version) | $(docker compose version)"

# --- 3. Docker daemon hardening / log rotation ------------------------------
log "Configuring docker daemon (json-file log rotation, live-restore)"
mkdir -p /etc/docker
if [[ -f /etc/docker/daemon.json ]]; then
    warn "/etc/docker/daemon.json already exists, leaving it untouched"
else
    cat >/etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "5" },
  "live-restore": true,
  "default-address-pools": [
    { "base": "172.30.0.0/16", "size": 24 }
  ]
}
EOF
    systemctl restart docker
fi

# --- 4. Non-root docker access ----------------------------------------------
if [[ "$TARGET_USER" != "root" ]]; then
    log "Adding '$TARGET_USER' to the docker group"
    usermod -aG docker "$TARGET_USER"
    warn "Group change needs a new login shell: run 'exec newgrp docker' or reconnect."
fi

# --- 5. Kernel / limits ------------------------------------------------------
log "Applying sysctl tweaks for MySQL + nginx"
cat >/etc/sysctl.d/99-lifetrack.conf <<'EOF'
vm.max_map_count=262144
vm.swappiness=10
net.core.somaxconn=1024
net.ipv4.tcp_max_syn_backlog=2048
fs.file-max=524288
EOF
sysctl --system >/dev/null

# --- 6. Firewall note --------------------------------------------------------
log "Firewall"
cat <<'EOF'
Ports are controlled by GCP VPC firewall rules, not by a host firewall on this
image. Open ONLY 80/443 to the internet. From your workstation:

  gcloud compute firewall-rules create lifetrack-allow-http \
    --allow=tcp:80,tcp:443 --direction=INGRESS \
    --target-tags=lifetrack --source-ranges=0.0.0.0/0

  gcloud compute instances add-tags instance-20260801-185224 \
    --zone=us-central1-a --tags=lifetrack

Do NOT open 8080, 8100, 3306, 9090 or 3000. The compose file keeps those on the
internal network or bound to 127.0.0.1; reach them over an SSH tunnel:

  gcloud compute ssh instance-20260801-185224 --zone=us-central1-a \
    --tunnel-through-iap -- -L 9090:localhost:9090 -L 3000:localhost:3000
EOF

log "Bootstrap complete. Next: cp .env.example .env && nano .env && bash deploy/scripts/deploy.sh"
