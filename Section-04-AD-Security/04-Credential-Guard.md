# 04 — Credential Guard

> **Section:** 04 — AD Security & Hardening  
> **Difficulty:** Advanced  
> **Stops:** Credential dumping from LSASS, Pass-the-Hash, Pass-the-Ticket

---

## 📌 What is Credential Guard?

The most common credential theft technique is dumping **LSASS** (Local Security Authority Subsystem Service) — the Windows process that stores authentication credentials in memory.

Tools like **Mimikatz** can extract NTLM hashes, Kerberos tickets, and sometimes even cleartext passwords directly from LSASS memory. This is the foundation of most lateral movement attacks.

**Credential Guard** stops this by moving sensitive credential storage into an **isolated, virtualised environment** that even a compromised OS cannot reach.

> **Simple definition:**  
> Credential Guard uses hardware virtualisation (Hyper-V) to run a separate mini-OS called the Secure World — credential secrets are stored there, completely isolated from the main Windows OS. Even if Windows is fully compromised, Mimikatz cannot reach the credentials.

---

## 🔐 How Credential Guard Works

### Without Credential Guard

```
Normal Windows:
  Windows OS (Ring 0 — kernel)
    └── LSASS.exe (runs as SYSTEM)
          └── Stores: NTLM hashes, Kerberos tickets, WDigest passwords
  
  If attacker gets SYSTEM or SeDebugPrivilege:
  → Access LSASS memory
  → Mimikatz: sekurlsa::logonpasswords → dumps ALL credentials ❌
```

### With Credential Guard

```
Credential Guard uses VBS (Virtualisation Based Security):

  Hardware (CPU with VT-x/AMD-V + IOMMU)
    │
    ├── Hyper-V Hypervisor (below the OS)
    │
    ├── Normal World (Windows OS)
    │     └── LSASS.exe (runs normally BUT...)
    │         └── Credentials MOVED to Isolated LSA (not stored here)
    │         └── If Mimikatz runs → only gets empty/encrypted blobs ✅
    │
    └── Secure World (VSM — Virtual Secure Mode)
          └── Isolated LSA (lsaiso.exe)
                └── Stores: NTLM hashes, Kerberos tickets
                └── Completely isolated — Windows OS cannot access this
                └── Even kernel-level code cannot reach it
                └── Only specific approved processes can communicate with it

Attack result:
  Attacker gets SYSTEM on Windows
  Runs Mimikatz: sekurlsa::logonpasswords
  → Gets encrypted blobs that are useless ← cannot be cracked ✅
  → No NTLM hashes, no Kerberos keys, no cleartext ✅
```

---

## 🔧 Configuring Credential Guard

### Prerequisites

```
Hardware requirements:
  → 64-bit CPU with virtualisation support (Intel VT-x or AMD-V)
  → IOMMU (Intel VT-d or AMD-Vi) — for DMA protection
  → UEFI firmware (not legacy BIOS)
  → Secure Boot enabled
  → TPM 1.2 or 2.0 (recommended — for UEFI lock)

OS requirements:
  → Windows 10 Enterprise/Education (version 1607+)
  → Windows 11 Enterprise/Education
  → Windows Server 2016+ (Datacenter/Standard)
  → NOT available on Home editions

Check if hardware supports Credential Guard:
  Device Manager → check for Hyper-V support
  OR: systeminfo | findstr /i "hyper-v"
  
  Run Microsoft's hardware readiness tool:
  https://aka.ms/HardwareReadinessTool
```

### Method 1 — Enable via GPO (Recommended for Enterprise)

```
GPO: "Credential-Guard-Policy"
Applied to: OU=Workstations, OU=Servers (NOT Domain Controllers)

Computer Config → Admin Templates → System → Device Guard
→ "Turn On Virtualization Based Security"
→ Enabled ✅

Settings within this policy:
  Select Platform Security Level:
    → "Secure Boot and DMA Protection" ← recommended (requires IOMMU)
    → "Secure Boot" ← if no IOMMU

  Virtualization Based Protection of Code Integrity:
    → "Enabled with UEFI lock" ← cannot be disabled without physical access
    → (Or "Enabled without lock" for easier rollback during testing)

  Credential Guard Configuration:
    → "Enabled with UEFI lock" ← recommended for production
    → (Or "Enabled without lock" for testing)

Registry equivalent:
  HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard
  EnableVirtualizationBasedSecurity = 1
  RequirePlatformSecurityFeatures = 3 (Secure Boot + DMA)
  
  HKLM\SYSTEM\CurrentControlSet\Control\LSA
  LsaCfgFlags = 1 (Enabled with UEFI lock)
               2 (Enabled without lock)
```

### Method 2 — Enable via PowerShell (Manual/Testing)

```powershell
# Enable Hyper-V platform (required for VBS)
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -NoRestart

# Configure Credential Guard via registry
$DeviceGuardPath = "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard"
$LSAPath = "HKLM:\SYSTEM\CurrentControlSet\Control\LSA"

# Enable VBS
Set-ItemProperty -Path $DeviceGuardPath -Name "EnableVirtualizationBasedSecurity" -Value 1
Set-ItemProperty -Path $DeviceGuardPath -Name "RequirePlatformSecurityFeatures" -Value 3

# Enable Credential Guard (1 = with UEFI lock, 2 = without lock)
Set-ItemProperty -Path $LSAPath -Name "LsaCfgFlags" -Value 1

# Reboot required
Restart-Computer

# After reboot — verify Credential Guard is running:
Get-WmiObject -ClassName Win32_DeviceGuard -Namespace root\Microsoft\Windows\DeviceGuard |
    Select-Object -ExpandProperty SecurityServicesRunning
# Should include: 1 (Credential Guard running) ✅
```

### Method 3 — Enable via Windows Defender Security Center (Individual Machine)

```
Windows Security → Device Security → Core Isolation
→ Memory Integrity: ON ← this enables HVCI (related to Credential Guard)
→ Restart machine

For full Credential Guard (including LSA isolation):
  This GUI only enables HVCI, not full Credential Guard
  Full Credential Guard requires GPO or registry method above
```

### Verifying Credential Guard is Active

```powershell
# Method 1 — WMI query
$DeviceGuard = Get-WmiObject -ClassName Win32_DeviceGuard `
    -Namespace root\Microsoft\Windows\DeviceGuard

$DeviceGuard.SecurityServicesRunning
# Values: 1 = Credential Guard, 2 = HVCI
# Should see: {1, 2} ✅

$DeviceGuard.VirtualizationBasedSecurityStatus
# 2 = VBS running ✅

# Method 2 — Check running processes
Get-Process lsaiso -ErrorAction SilentlyContinue
# If lsaiso.exe is running → Credential Guard is active ✅
# lsaiso = LSA Isolated (the secure world process)

# Method 3 — Event Log
Get-WinEvent -LogName "Microsoft-Windows-DeviceGuard/Operational" |
    Where-Object {$_.Id -eq 7000} |
    Select-Object TimeCreated, Message -First 5
# Event 7000 = Credential Guard is configured and running ✅

# Method 4 — System Information
msinfo32
# Look for: "Virtualization-based security" → Running
#           "Credential Guard" → Running ✅
```

---

## 🏢 Real-World Deployment Scenario

```
Company deploys Credential Guard on all 300 workstations via GPO

Before deployment checklist:
  ✅ All workstations: Windows 10 Enterprise (verified)
  ✅ Hardware: UEFI firmware, Secure Boot supported (verified)
  ✅ Tested on 10 pilot machines — no issues
  ✅ Incompatible software identified (see below)
  ✅ Change management approved
  ✅ Rollback plan prepared

Deployment:
  GPO linked to OU=Workstations
  Machines apply GPO on next restart
  Restart scheduled for next maintenance window

After deployment:
  GP runs Mimikatz test on a test machine:
    mimikatz # sekurlsa::logonpasswords
    → Output: msv: [00000003] Primary
               * Username: hareesh
               * NTLM: (null) ← EMPTY ✅
               * SHA1: (null) ← EMPTY ✅
    
  Credential Guard is working ✅
  Hashes cannot be extracted ✅
```

---

## ⚠️ What Breaks with Credential Guard

```
Incompatibilities (must test before deploying):

1. Certain VPN clients:
   Older versions of Cisco AnyConnect, Pulse Secure
   Fix: Update to current version that supports VBS

2. Older fingerprint readers/biometric software:
   Some use unsigned drivers that conflict with VBS
   Fix: Update drivers, or replace hardware

3. vSphere guest VMs (VMware):
   Credential Guard requires VBS — conflicts with VMware virtualisation
   Cannot run Credential Guard inside a VMware VM (without enabling
   nested virtualisation — not recommended in production)
   Fix: Use Hyper-V instead, or disable Credential Guard on VMware VMs

4. Microsoft does NOT support Credential Guard on:
   Domain Controllers (DCs manage all credentials — cannot isolate)
   Azure Stack HCI nodes
   
5. WDigest authentication:
   Applications using HTTP Digest auth (older apps)
   Fix: Update application to use Kerberos/NTLM instead of WDigest

Check compatibility before deployment:
  Run MDATP (Defender for Endpoint) compatibility scan
  OR manually audit: Get-AppxPackage | check for unsigned drivers
```

---

## ⚠️ Credential Guard Bypass Techniques

### Bypass 1 — Harvesting Credentials Before Credential Guard Applies

```
Limitation: Credential Guard protects credentials IN memory
            It does not protect credentials that were already stolen

Attack: Attacker establishes persistence BEFORE Credential Guard deployed
        Waits for user to authenticate AFTER CG deployed
        No NTLM hash available in LSASS → pivot to other methods

Defense:
  Deploy Credential Guard along with full incident response
  Assume credentials may have been stolen before deployment
  Rotate all admin passwords after Credential Guard deployment
```

### Bypass 2 — Physical Attack / Boot to Different OS

```
Credential Guard without UEFI lock:
  Attacker with physical access → boots to Linux live USB
  Mounts Windows partition → accesses credential stores
  
Defense:
  Enable "with UEFI lock" — prevents disabling without physical BIOS access
  Enable Secure Boot — prevents booting unsigned OS
  Enable BitLocker — encrypts drive (even with live USB, data unreadable)
  Physical security controls on hardware
```

### Bypass 3 — Exploiting Non-Protected Authentication Paths

```
What: Even with Credential Guard, some credentials are NOT protected:
  → Local accounts (non-domain) credentials
  → Credentials provided via command line (--password flag)
  → Credentials in applications (config files, env vars)
  → RDP saved credentials (Windows Credential Manager)
  
Attacker pivots to finding these:
  Search for: passwords in config files, environment variables
  Check Windows Credential Manager: cmdkey /list
  Monitor process command lines for cleartext passwords

Defense:
  Audit Windows Credential Manager regularly
  Never store credentials in config files — use managed identities/secrets
  Combined with LAPS — removes the local admin credential exposure
```

---

## 🛡️ Credential Guard Hardening Checklist

- [ ] Verify all hardware meets requirements (UEFI, Secure Boot, IOMMU)
- [ ] Test on pilot group of 10-20 machines before full deployment
- [ ] Deploy via GPO to all workstations and servers
- [ ] Enable with UEFI lock for production machines
- [ ] Enable Secure Boot alongside Credential Guard
- [ ] Deploy BitLocker to complement Credential Guard
- [ ] Verify: lsaiso.exe process running after deployment
- [ ] Test: run Mimikatz to confirm hashes are empty
- [ ] Document incompatible software and update before deployment
- [ ] Monitor Event ID 7000 for Credential Guard status

---

## 🔧 Troubleshooting

```powershell
# Check why Credential Guard is not starting
Get-WmiObject -ClassName Win32_DeviceGuard `
    -Namespace root\Microsoft\Windows\DeviceGuard |
    Select-Object VirtualizationBasedSecurityStatus,
                  VirtualizationBasedSecurityProperties,
                  SecurityServicesRunning,
                  SecurityServicesConfigured

# VirtualizationBasedSecurityStatus values:
# 0 = Not enabled
# 1 = Enabled but not running
# 2 = Running ✅

# Common issues:

# Issue 1: VBS enabled but Credential Guard not running
# Cause: Hardware not fully supported (missing IOMMU)
# Fix: Check BIOS — enable VT-d (Intel) or AMD-Vi
#      Change RequirePlatformSecurityFeatures = 1 (Secure Boot only, no DMA)

# Issue 2: lsaiso.exe not in Task Manager after reboot
# Cause: Unsigned driver blocking VBS
# Get-WinEvent -LogName System | Where-Object {$_.Id -eq 16 -and $_.Message -match "Credential Guard"}

# Issue 3: Disable Credential Guard (WITHOUT UEFI lock)
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\LSA" `
    -Name "LsaCfgFlags" -Value 0
Restart-Computer
# (With UEFI lock — must access UEFI firmware settings to disable)

# Issue 4: Application broken after Credential Guard
# Test: does the application use NTLMv1?
# Check: Get-WinEvent -LogName "Microsoft-Windows-NTLM/Operational"
# Event ID 8004 = NTLM blocked → application needs updating
```

---

## 🎯 Interview Questions

**Q1. What is Credential Guard and what specific attack does it prevent?**  
**A:** Credential Guard uses hardware virtualisation (Hyper-V/VBS) to isolate LSASS credential storage in a separate, protected environment called the Secure World. It specifically prevents credential dumping attacks where tools like Mimikatz extract NTLM hashes and Kerberos tickets from LSASS memory. Without Credential Guard, an attacker with SYSTEM privileges can dump all credentials cached in LSASS. With Credential Guard, those credentials are stored in the isolated Secure World — LSASS in the normal OS only sees encrypted blobs that are computationally useless.

---

**Q2. What hardware is required for Credential Guard?**  
**A:** A 64-bit CPU with virtualisation extensions (Intel VT-x or AMD-V), IOMMU for DMA protection (Intel VT-d or AMD-Vi), UEFI firmware with Secure Boot capability, and optionally a TPM for UEFI lock. It requires Windows 10/11 Enterprise or Windows Server 2016+. It cannot run on Domain Controllers (by Microsoft's own guidance) or inside VMware VMs without nested virtualisation.

---

**Q3. What is the difference between "Enabled with UEFI lock" and "Enabled without lock"?**  
**A:** With UEFI lock: Credential Guard cannot be disabled by any software means — even by an administrator with full SYSTEM access. To disable, physical access to the UEFI firmware settings is required. This is recommended for production since even a fully compromised OS cannot disable it. Without lock: Credential Guard can be disabled via registry changes and a reboot. This is useful for testing and pilot deployments where you may need to roll back, but should not be used in production for critical systems.

---

**Q4. Does Credential Guard protect all credentials on a machine?**  
**A:** No. Credential Guard protects domain credentials cached in LSASS — NTLM hashes and Kerberos tickets for domain accounts. It does not protect: local account credentials, credentials stored in Windows Credential Manager, passwords typed in command lines, secrets in config files or environment variables, or credentials in applications. Attackers who find Credential Guard deployed often pivot to searching for these unprotected credential stores.

---

*"Credential Guard closes the door that Mimikatz has walked through for over a decade. It does not make a system unbreachable — but it makes credential theft dramatically harder and forces attackers to find noisier, more detectable methods."*
