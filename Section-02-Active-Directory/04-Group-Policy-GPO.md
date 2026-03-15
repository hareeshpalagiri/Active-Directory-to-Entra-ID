# 04 — Group Policy (GPO)

> **Section:** 02 — Active Directory (On-Premise)  
> **Difficulty:** Beginner → Intermediate  
> **Depends on:** [02-Forest-Domain-OU.md](./02-Forest-Domain-OU.md)

---

## 📌 What is Group Policy?

Imagine GP needs to enforce these rules across all 500 company computers:

- Password must be at least 14 characters
- Screen locks after 10 minutes of inactivity
- USB drives are disabled
- BitLocker encryption is enabled
- Windows Firewall is always on
- Only approved software can run

Without Group Policy, IT would need to configure each of these settings **manually on every single machine**. 500 machines × 10 settings = 5,000 manual changes. Every time a new machine is added, start again.

**Group Policy automates all of this.**

> **Simple definition:**  
> Group Policy is a feature of Active Directory that allows administrators to centrally define and automatically enforce security settings, software configurations, and restrictions across all users and computers in a domain.

---

## 🧠 How Group Policy Works — Simply

```
GP opens Group Policy Management Console on DC01:
  Creates a GPO: "Security Baseline Policy"
  Configures settings:
    → Minimum password length: 14
    → Account lockout: 5 attempts
    → Screen lock timeout: 10 minutes
    → Disable USB storage: Yes
  
  Links the GPO to: OU=Workstations

Result:
  Every computer in the Workstations OU:
  → Downloads and applies these settings automatically
  → Next time Hareesh tries to use a USB drive → BLOCKED ✅
  → Next time someone uses a weak password → REJECTED ✅
  → Screen locks after 10 minutes on every machine ✅
  
  GP made ONE change → applied to ALL 500 machines ✅
```

---

## 🏗️ GPO Structure

### What a GPO Contains

A Group Policy Object has two main sections:

```
GPO: "Security Baseline Policy"
  │
  ├── Computer Configuration
  │     → Settings that apply to the COMPUTER
  │     → Applied when the computer starts up
  │     → Regardless of who logs in
  │     │
  │     ├── Windows Settings
  │     │     ├── Security Settings (password policy, audit policy, firewall)
  │     │     └── Scripts (startup/shutdown scripts)
  │     │
  │     └── Administrative Templates
  │           └── (Registry-based settings for Windows and apps)
  │
  └── User Configuration
        → Settings that apply to the USER
        → Applied when the user logs in
        → Follow the user to any computer
        │
        ├── Windows Settings
        │     ├── Scripts (logon/logoff scripts)
        │     └── Folder Redirection (redirect Desktop/Documents to server)
        │
        └── Administrative Templates
              └── (Restrict Control Panel, Start Menu, browser settings)
```

### Real Examples of GPO Settings

**Computer Configuration settings:**
```
Security Settings:
  Password Policy:
    → Minimum password length: 14 characters
    → Password complexity: Enabled (upper, lower, number, symbol)
    → Maximum password age: 90 days
    → Password history: 24 (cannot reuse last 24 passwords)

  Account Lockout Policy:
    → Lockout threshold: 5 failed attempts
    → Lockout duration: 30 minutes
    → Observation window: 30 minutes

  Audit Policy:
    → Audit logon events: Success and Failure
    → Audit account management: Success and Failure
    → Audit object access: Success and Failure

  Windows Firewall:
    → Domain profile: Enabled
    → Block all inbound by default
```

**User Configuration settings:**
```
Administrative Templates:
  → Disable Control Panel: Enabled (standard users cannot change system settings)
  → Remove "Run" from Start Menu: Enabled
  → Prevent access to Command Prompt: Enabled (for non-IT users)
  → Browser homepage: https://intranet.company.com

Windows Settings:
  → Folder Redirection: Desktop → \\FileServer01\Users\%username%\Desktop
    (Desktop files saved to server — survives machine replacement)
  → Logon script: Map network drives automatically
```

---

## 🔗 GPO Processing — How and When Settings Apply

### The LSDOU Order

GPOs are processed in a specific order. Later GPOs override earlier ones.

```
L → Local Policy (on the machine itself — processed first, lowest priority)
S → Site Policy (linked to the AD site)
D → Domain Policy (linked to the domain root)
O → OU Policy (linked to OUs — processed last, HIGHEST priority)

Processing order:
  Local → Site → Domain → OU (parent) → OU (child)
  
  Last one wins (by default)
```

**Practical example:**
```
Domain GPO: "Password minimum length = 8"
OU GPO (IT): "Password minimum length = 16"

Hareesh (in IT OU):
  → Domain GPO applied first (8 chars minimum)
  → IT OU GPO applied second (16 chars minimum) ← WINS
  → Hareesh's effective policy: 16 characters ✅

GP (in Management OU, no password GPO):
  → Domain GPO applied (8 chars minimum)
  → Management OU has no password GPO
  → GP's effective policy: 8 characters
```

### When GPO Applies

```
Computer Configuration:
  → Applied at machine startup
  → Refreshed every 90 minutes (with random 0-30 min offset)
  → Force immediate refresh: gpupdate /force

User Configuration:
  → Applied at user logon
  → Refreshed every 90 minutes
  → Force immediate refresh: gpupdate /force

Security settings (like password policy):
  → Applied immediately on refresh (no reboot needed)

Some settings require reboot or logoff to take effect
```

---

## 🔒 GPO Inheritance and Exceptions

### Block Inheritance

A child OU can block GPOs from parent containers from flowing down.

```
Domain GPO: "Disable USB drives" (applies to all)
  └── OU: IT-Department
        Block Inheritance enabled ← USB policy does NOT apply to IT
        
Result:
  IT staff can use USB drives (needed for their work)
  Everyone else: USB blocked ✅
```

### Enforced (No Override)

A parent container can force a GPO to apply regardless of Block Inheritance.

```
Domain GPO: "Legal Compliance Policy" — set to ENFORCED
  └── OU: IT-Department
        Block Inheritance enabled ← normally blocks domain GPOs
        
Result:
  Enforced GPO overrides Block Inheritance
  IT still gets Legal Compliance Policy applied ✅
  
Use case: Security baselines that must apply to everyone
          regardless of OU-level blocks
```

### GPO Filtering — Security Filtering

By default, GPOs apply to all Authenticated Users. You can limit which users/computers get a GPO using Security Filtering.

```
GPO: "Developer Tools Allowed"
  Security Filtering:
    Remove: Authenticated Users
    Add: SG-Developers (security group)

Result:
  Only members of SG-Developers get this GPO
  Everyone else: developer tools still restricted ✅
```

---

## 🏢 Real-World GPO Scenarios

### Scenario 1 — Security Baseline GPO

```
GP deploys a Security Baseline GPO to all workstations:

Computer Configuration → Windows Settings → Security Settings:
  Account Policies:
    → Min password length: 14
    → Complexity: enabled
    → Max age: 90 days
    → History: 24

  Local Policies → Audit Policy:
    → Logon events: Success + Failure
    → Account management: Success + Failure
    → Privilege use: Success + Failure

  Windows Firewall:
    → All profiles: Enabled
    → Inbound default: Block

  Security Options:
    → Interactive logon: display last username: Disabled
    → Accounts: rename administrator account: "local-admin"
    → Network security: LAN Manager auth level: NTLMv2 only

Administrative Templates → System:
  → Disable autorun: Enabled (prevent USB autorun attacks)
  → Prevent installation of removable devices: Enabled
```

### Scenario 2 — Logon Script via GPO

```powershell
# Logon script: MapDrives.ps1
# Applied via GPO → User Configuration → Windows Settings → Scripts → Logon

# Map network drives based on group membership
$groups = (Get-ADPrincipalGroupMembership -Identity $env:USERNAME).Name

if ($groups -contains "SG-Finance-Staff") {
    New-PSDrive -Name "F" -PSProvider FileSystem `
        -Root "\\FileServer01\Finance" -Persist
}

if ($groups -contains "SG-IT-Operations") {
    New-PSDrive -Name "I" -PSProvider FileSystem `
        -Root "\\FileServer01\IT" -Persist
}

# Map the shared company drive for everyone
New-PSDrive -Name "S" -PSProvider FileSystem `
    -Root "\\FileServer01\Shared" -Persist
```

### Scenario 3 — Restricting Standard Users

```
GPO: "Standard User Restrictions"
Applied to: OU=Standard-Users (all non-IT staff)

User Configuration → Administrative Templates:
  Control Panel:
    → Prohibit access to Control Panel: Enabled
  System:
    → Prevent access to the command prompt: Enabled
    → Prevent access to registry editing tools: Enabled
  Start Menu:
    → Remove Run menu from Start Menu: Enabled
  Windows Components → Windows Installer:
    → Prevent users from installing software: Enabled

Result:
  Finance, HR, Operations staff:
  → Cannot install software ✅
  → Cannot access registry ✅
  → Cannot run cmd.exe ✅
  → Significantly reduces attack surface ✅
```

---

## ⚠️ GPO Security Risks & Attacks

### 1. GPO Misconfiguration — Write Permissions
```
Risk: If a non-admin user has Write permission on a GPO
Attack:
  Attacker discovers Hareesh has "Modify" rights on "Security Baseline GPO"
  (BloodHound finds this)
  Attacker adds a malicious startup script to the GPO
  Script runs on every computer the GPO applies to
  → Code execution on hundreds of machines simultaneously

Defense:
  Audit GPO permissions regularly
  Only Domain Admins and Group Policy Creator Owners should modify GPOs
  Review: Get-GPPermission -All -Name "Security Baseline GPO"
```

### 2. Malicious GPO Deployment (Ransomware)
```
How ransomware actors use GPO:
  Attacker compromises Domain Admin account
  Creates new GPO: "Windows Update Policy"  ← innocent-looking name
  Adds startup script: deploy_ransomware.bat
  Links GPO to domain root ← applies to ALL machines
  
  Next morning at 8am — all 500 machines execute ransomware simultaneously
  
  This is exactly how Ryuk, Maze, and other ransomware groups operated.

Defense:
  Monitor new GPO creation (Event ID 5136)
  Alert on GPOs linked at domain root (unusual)
  Restrict who can create/link GPOs
```

### 3. GPO Password Storage (SYSVOL)
```
Historical vulnerability (now patched but still found):
  Older GPOs could store local admin passwords in SYSVOL
  File: Groups.xml in SYSVOL
  Password was encrypted with AES — but Microsoft published the key!

  Any domain user could read SYSVOL
  → Download Groups.xml
  → Decrypt password with public key (Get-GPPPassword tool)
  → Get local admin password on all machines

Defense:
  Search for cpassword strings in SYSVOL:
  findstr /s /i "cpassword" \\domain\sysvol\*.xml
  Remove any found — use LAPS instead
```

---

## 🔧 Essential GPO Commands

```powershell
# List all GPOs in the domain
Get-GPO -All | Select-Object DisplayName, GpoStatus, CreationTime

# View GPO links on an OU
Get-GPInheritance -Target "OU=Workstations,DC=company,DC=local"

# Force GPO refresh on local machine
gpupdate /force

# Force GPO refresh on a remote machine
Invoke-GPUpdate -Computer "DESKTOP-HR-001" -Force

# View resultant GPO (what actually applies to a user/computer)
gpresult /r                    # current user and computer
gpresult /user hareesh /h C:\gpresult.html  # save to HTML report

# View GPO permissions
Get-GPPermission -All -Name "Security Baseline Policy" |
    Select-Object Trustee, Permission

# Create a new GPO
New-GPO -Name "USB Block Policy" -Comment "Disables USB storage devices"

# Link GPO to OU
New-GPLink -Name "USB Block Policy" `
           -Target "OU=Workstations,DC=company,DC=local"

# Back up all GPOs
Backup-GPO -All -Path "C:\GPO-Backup\$(Get-Date -Format 'yyyy-MM-dd')"

# Search SYSVOL for stored passwords (security check)
findstr /s /i /m "cpassword" "\\company.local\sysvol\*.xml"
```

---

## 🎯 Interview Questions

**Q1. What is Group Policy and what is it used for?**  
**A:** Group Policy is an Active Directory feature that allows centrally defined settings to be automatically applied to users and computers across the domain. It is used for enforcing security settings (password policy, account lockout, firewall), configuring the user environment (mapped drives, desktop settings), restricting user actions (preventing software installation, disabling CMD), deploying software, and running logon/startup scripts. One change in a GPO can instantly affect hundreds or thousands of machines.

---

**Q2. What is the LSDOU processing order?**  
**A:** GPOs are processed in this order: Local policy (on the machine itself), then Site policy, then Domain policy, then OU policy (from parent OU to child OU). Later-processed GPOs override earlier ones by default — so OU-linked GPOs have the highest priority. This means a setting configured in an OU GPO will override the same setting in the Domain GPO.

---

**Q3. What is the difference between Block Inheritance and Enforced?**  
**A:** Block Inheritance is set on a child OU and prevents GPOs from parent containers from flowing down to that OU. Enforced (formerly "No Override") is set on a GPO and forces its settings to apply even if a child OU has Block Inheritance enabled. Enforced wins over Block Inheritance — it is used for security baselines that must apply everywhere without exception.

---

**Q4. How can attackers abuse Group Policy?**  
**A:** Several ways: (1) If a non-admin has write permissions on a GPO, they can modify it to add malicious scripts that run on all affected machines. (2) A Domain Admin can create a GPO deploying ransomware or malware and link it at the domain root — affecting all machines simultaneously. (3) Old GPOs may contain stored passwords in SYSVOL (Groups.xml cpassword) readable by any domain user. (4) Malicious GPOs can disable security tools like antivirus or audit logging across the domain.

---

**Q5. Scenario — You need to apply a strict USB blocking policy to all workstations, but IT staff need USB access. How do you configure this?**  
**A:** Create a GPO "Block USB Storage" with Computer Configuration → Administrative Templates → System → Removable Storage Access → All Removable Storage: Deny All Access. Link this GPO to the OU containing all workstations. Create a security group "SG-IT-USB-Exempt." On the GPO, modify Security Filtering: remove Authenticated Users, add the target workstation OU computers — BUT add an exception using a WMI filter or create a separate "Allow USB" GPO with higher precedence, linked to the IT Workstations OU and filtered to SG-IT-USB-Exempt members. The child OU GPO overrides the parent, giving IT their USB access while everyone else remains blocked.

---

*"Group Policy is the most powerful tool an AD admin has — and the most powerful weapon an attacker uses after they become a Domain Admin. Protect who can modify GPOs as carefully as you protect Domain Admin itself."*
