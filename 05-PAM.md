# 05 — Privileged Access Management (PAM)

> **Section:** 01 — IAM Core Concepts  
> **Difficulty:** Intermediate  
> **Depends on:** [02-Authentication.md](./02-Authentication.md), [03-Authorization.md](./03-Authorization.md)

---

## 📌 What is PAM?

In every organisation, some accounts have more power than others.

A regular employee can read their own files and send emails.  
A **privileged account** can delete all files, disable security tools, create new admin accounts, and access every system in the organisation.

> **Simple definition:**  
> Privileged Access Management (PAM) is the set of controls, policies, and tools that manage, monitor, and secure accounts with elevated permissions — ensuring they are used legitimately, minimally, and with full accountability.

### Why PAM Exists

```
The uncomfortable truth about privileged accounts:

80%+ of security breaches involve privileged credentials
(Forrester Research)

Reasons why privileged accounts are targeted:
  → They have access to everything — one account = full compromise
  → They are often shared ("team admin password")
  → Passwords rarely change ("hasn't broken, don't fix it")
  → Actions are not always monitored
  → Service accounts often have Domain Admin "just to be safe"
  → Admins reuse passwords across personal and work accounts
```

---

## 🧑‍💼 Types of Privileged Accounts

| Account Type | What it can do | Risk Level |
|-------------|---------------|------------|
| **Domain Admin** | Full control over entire AD domain | 🔴 Critical |
| **Enterprise Admin** | Full control across all AD domains in forest | 🔴 Critical |
| **Schema Admin** | Modify the AD schema structure | 🔴 Critical |
| **Local Administrator** | Admin on a specific machine | 🟠 High |
| **Service Account** | Runs services/scheduled tasks/applications | 🟠 High |
| **Global Administrator** | Full Azure/M365 tenant control | 🔴 Critical |
| **Database Admin (DBA)** | Read/write/delete all database data | 🔴 Critical |
| **Root** | Full control on Linux/Unix systems | 🔴 Critical |
| **Application Admin** | Admin in a specific app (Salesforce, etc.) | 🟡 Medium |

---

## 🏛️ Core PAM Concepts

### 1. Credential Vaulting

Privileged passwords are stored in an encrypted vault — not in people's heads, shared spreadsheets, sticky notes, or emails.

```
Without PAM — dangerous reality:
  Domain Admin password: "Company@2019!"
  → Known by GP, Hareesh, and 3 other admins
  → Written in a shared Excel file on a network drive
  → Never changed since 2019
  → One admin left the company in 2021 and still knows it

With PAM (CyberArk / Azure PIM):
  Domain Admin password: "xK9#mP2@qR7tLz8!nW4vBc6&"
  → Auto-generated 32-character random string
  → Stored encrypted in CyberArk vault
  → NO human memorises it
  → Auto-rotated every 30 days or after each use
  → Checkout requires: request + justification + approval
  → Full audit log of every checkout
```

---

### 2. Just-in-Time (JIT) Access

Instead of permanent admin rights, privileged access is granted **only when needed** for a **limited time**.

```
Old model (permanent standing privilege):
  GP has Domain Admin rights 24 hours a day, 7 days a week
  
  Risk:
  → If GP's account is compromised at 3am on Sunday
  → Attacker has Domain Admin immediately, right now
  → No request, no approval, no time limit

JIT model:
  GP's normal account: standard user only

  When GP needs to do an admin task:
    Step 1: GP submits request in Azure PIM:
            Role: "Domain Admin equivalent"
            Duration: 2 hours
            Justification: "Applying security patches to DC01 — CHG-9821"

    Step 2: GP's manager receives approval request
            Approves via email or Teams notification

    Step 3: Role activated for exactly 2 hours
            GP performs the patching task

    Step 4: At exactly 14:00 — rights automatically revoked
            No manual step required

    Step 5: Full audit log:
            Who requested, what role, what justification, who approved,
            what time, every action taken during the window
```

---

### 3. Password Rotation

Privileged passwords are automatically changed by the PAM system — on a schedule or after each use.

```
CyberArk password rotation flow:
  09:00 — GP checks out the server admin password
           CyberArk provides a unique session credential
           GP logs into the server
  
  10:30 — GP finishes the task, checks the session back in
  
  10:30 — CyberArk IMMEDIATELY rotates the password
           New password: generated randomly → stored in vault
           Old password: no longer valid
  
  10:31 — Even if GP wrote down the password → it no longer works ✅
           Even if the password was captured in transit → invalid ✅
```

---

### 4. Session Recording

All privileged sessions are recorded — every keystroke, every command, every screen action.

```
GP connects to DC01 via PAM-proxied RDP:
  → CyberArk sits between GP and DC01 (transparent proxy)
  → Every screen frame recorded
  → Every keystroke logged
  → Every command executed captured

If an incident occurs:
  → Investigators open the session recording in CyberArk
  → Watch exactly what was done, command by command
  → Timeline of every action during the session

This is not optional — PCI-DSS, HIPAA, SOX all require
privileged session recording for compliance.
```

---

### 5. Least Privilege for Service Accounts

Service accounts (that run applications and automated tasks) are the most neglected privileged accounts in most organisations.

```
Common terrible practice:
  Hareesh creates a service account for the backup software:
    Account: svc_backup
    Password: "Backup2020!"
    Group: Domain Admins ← "just to make sure it can access everything"
    Password policy: "Password never expires"
    Last password change: 4 years ago

  Why this is a disaster:
    → Domain Admin rights for a backup job ← massive over-privilege
    → Weak password never changed in 4 years
    → Kerberoasting: any domain user can request a service ticket
      for svc_backup and crack the weak password offline
    → Result: attacker gets Domain Admin via a backup service account

Correct practice:
  svc_backup using gMSA (Group Managed Service Account):
    → Password: auto-generated 240-bit random string
    → Rotated every 30 days automatically
    → No human ever knows the password
    → Permissions: Read access to backup targets only — nothing else
    → Kerberoasting fails: password is uncrackable ✅
```

---

## 🏢 Real-World PAM Scenarios

### Scenario 1 — Emergency Break-Glass Access

```
It is 2am. The production database has crashed.
The on-call DBA (Hareesh) needs emergency admin access.
GP (the approver) is asleep.

Break-glass process:
  Hareesh opens CyberArk emergency access portal
  Selects "Emergency Break-Glass — Production DB Admin"
  Enters justification: "PROD DB down — INC-8821 — customer impact"
  
  System grants access automatically (no approval required for break-glass)
  Access valid for 1 hour
  
  Every action Hareesh takes is recorded
  An alert is sent to GP, the CISO, and the SOC
  GP reviews the session recording in the morning
  
  If access was legitimate → incident closed ✅
  If access was suspicious → investigation opened ← accountability works
```

### Scenario 2 — Azure PIM in Practice

```
GP manages the Azure environment.
For day-to-day work, he is a standard user.

Monthly security review requires Global Admin:
  
  GP opens Azure PIM portal:
    Role: Global Administrator
    Duration: 4 hours
    Justification: "Monthly security configuration review — Q1 audit"
  
  Approval sent to IT Security Lead
  Approval received within 5 minutes
  
  GP activates the role:
    MFA challenge → approved ← extra verification for privileged activation
    Global Admin role active
  
  GP performs the review
  
  After 4 hours:
    Role auto-expires
    All Global Admin actions logged in Azure AD Audit Logs
    Audit trail shows: who, what, when, why ✅
```

### Scenario 3 — Service Account Discovery (First PAM Deployment)

```
Company is deploying PAM for the first time.
IT runs a discovery to find all privileged accounts.

Discovery results (surprised everyone):
  Domain Admin members: 47 accounts
  (Expected: 5 maximum)
  
  Includes:
  → 8 service accounts with Domain Admin "for convenience"
  → 12 accounts of employees who left the company
  → 15 accounts of users whose roles no longer require Domain Admin
  → 5 accounts with names nobody recognises
  → 7 legitimate current admin accounts
  
  Immediate actions:
  → Disable 12 orphaned accounts
  → Reduce service account permissions to minimum required
  → Remove Domain Admin from 15 current users
  → Investigate the 5 unknown accounts
  → Keep 7 legitimate admins — enrol them in PAM
  
  Result: Domain Admins reduced from 47 to 7 ✅
```

---

## ⚙️ PAM Tools

| Tool | Type | What it does |
|------|------|-------------|
| **CyberArk** | Enterprise PAM | Credential vault, JIT, session recording, rotation |
| **BeyondTrust** | Enterprise PAM | PAM + endpoint privilege management |
| **Delinea (Thycotic)** | Mid-market PAM | Secret Server for credential vaulting |
| **Azure PIM** | Cloud PAM | JIT for Azure/M365 roles, approvals, audit |
| **Microsoft LAPS** | Local admin | Randomises local admin passwords per machine |
| **gMSA** | Service accounts | Auto-managed service account passwords |
| **Defender for Identity** | Detection | Detects PAM bypass attacks (PtH, Golden Ticket) |

---

### LAPS — Local Administrator Password Solution

Every Windows machine has a local Administrator account. Without LAPS, all machines often share the **same local admin password** (set during imaging).

```
Without LAPS — lateral movement is easy:
  Attacker compromises Hareesh's workstation
  Extracts local admin NTLM hash with Mimikatz
  
  That same hash works on:
  → Every other workstation (same image, same password)
  → Server01, Server02, Server03...
  
  From one compromised workstation → attacker reaches entire fleet ❌

With LAPS — lateral movement is blocked:
  Each machine has a UNIQUE randomly generated local admin password
  Stored in AD (only authorised IT staff can read it)
  Rotated every 30 days automatically
  
  Attacker compromises Hareesh's workstation
  Extracts local admin hash
  Tries it on Server01 → different password → FAILS ✅
  Lateral movement via local admin is blocked ✅
```

```powershell
# Check LAPS password for a machine (requires permission)
Get-ADComputer -Identity "DESKTOP-HR-001" -Properties ms-Mcs-AdmPwd |
    Select-Object Name, "ms-Mcs-AdmPwd"

# Check LAPS expiry
Get-ADComputer -Identity "DESKTOP-HR-001" -Properties ms-Mcs-AdmPwdExpirationTime
```

---

## ⚠️ Attacks Targeting Privileged Accounts

### 1. Pass-the-Hash
```
What: Capture NTLM hash of privileged account → use directly
Example:
  GP logs into Server01 for a task
  GP's NTLM hash cached on Server01
  Attacker compromises Server01 → dumps GP's hash
  Uses hash to authenticate as GP to other servers
  → No password needed — hash IS the credential in NTLM

Defense: Credential Guard, Protected Users group, LAPS
```

### 2. Kerberoasting — Targeting Service Accounts
```
What: Request service tickets for SPN accounts → crack offline
Example:
  Attacker (any domain user) runs: Invoke-Kerberoast
  Gets encrypted ticket for svc_backup
  Runs Hashcat → cracks weak password in hours
  svc_backup has Domain Admin → full compromise

Defense: gMSA for service accounts, long random passwords (25+)
```

### 3. DCSync — Impersonating a Domain Controller
```
What: Account with replication rights can pull all AD password hashes
Example:
  GP's account has "Replicating Directory Changes" permission
  GP's account compromised
  Attacker runs: mimikatz lsadump::dcsync /user:krbtgt
  Gets KRBTGT hash → creates Golden Ticket → unlimited access

Defense: Audit replication permissions, Defender for Identity detection
```

### 4. Privileged Account Phishing
```
What: Attacker specifically targets admin accounts
Example:
  GP receives a convincing phishing email about "urgent AD issue"
  Clicks link → fake Microsoft login page
  Enters credentials → attacker captures them
  GP's admin account compromised
  
Defense: Phishing-resistant MFA (FIDO2) for all admin accounts
         Security awareness training
         AiTM-aware Conditional Access policies
```

---

## 🛡️ PAM Hardening Checklist

- [ ] Deploy PAM solution for all privileged accounts
- [ ] Implement JIT — no permanent admin role assignments
- [ ] Vault all privileged credentials — no human memorises admin passwords
- [ ] Auto-rotate privileged passwords (daily or after each use)
- [ ] Enforce MFA for all privileged access — separate from daily MFA
- [ ] Record all privileged sessions (RDP, SSH, database)
- [ ] Implement tiered admin model (Tier 0/1/2)
- [ ] Deploy LAPS on all Windows workstations and servers
- [ ] Use gMSA for all service accounts — no manually managed service account passwords
- [ ] Audit Domain Admins membership monthly — should be 5 or fewer accounts
- [ ] Add all Tier 0 admin accounts to Protected Users security group
- [ ] Enable Credential Guard on all workstations and servers
- [ ] Deploy Defender for Identity to detect PAM bypass attacks
- [ ] Run BloodHound quarterly to find attack paths to privileged accounts

---

## 🔧 Troubleshooting

### Finding over-privileged service accounts
```powershell
# Find all service accounts in Domain Admins
Get-ADGroupMember -Identity "Domain Admins" |
    ForEach-Object {
        Get-ADUser $_ -Properties ServicePrincipalNames, Description |
        Where-Object {$_.ServicePrincipalNames -ne $null}
    }

# Find accounts with Password Never Expires
Get-ADUser -Filter {PasswordNeverExpires -eq $true} -Properties PasswordNeverExpires |
    Select-Object Name, SamAccountName, PasswordNeverExpires

# Find accounts that have not logged in for 90 days
$cutoff = (Get-Date).AddDays(-90)
Get-ADGroupMember -Identity "Domain Admins" | ForEach-Object {
    Get-ADUser $_ -Properties LastLogonDate |
    Where-Object {$_.LastLogonDate -lt $cutoff -or $_.LastLogonDate -eq $null}
} | Select-Object Name, SamAccountName, LastLogonDate
```

### Key Event IDs for PAM Monitoring

| Event ID | Meaning |
|----------|---------|
| 4672 | Special privileges assigned at logon |
| 4728 | User added to privileged global group |
| 4732 | User added to privileged local group |
| 4756 | User added to universal security group |
| 4769 | Kerberos Service Ticket requested — watch for RC4 (Kerberoasting) |
| 4662 | AD object operation — watch for replication (DCSync) |

---

## 🎯 Interview Questions

**Q1. What is PAM and why is it critical?**  
**A:** PAM (Privileged Access Management) secures accounts with elevated permissions — domain admins, root, service accounts, cloud admins. It is critical because over 80% of breaches involve privileged credentials. PAM reduces risk through credential vaulting (no human knows admin passwords), JIT access (temporary rights that auto-expire), session recording (full audit trail), and MFA enforcement. If an attacker needs to fully compromise an environment, they need privileged credentials — PAM makes those credentials harder to steal and useless after each use.

---

**Q2. What is Just-in-Time access and what problem does it solve?**  
**A:** JIT access means privileged rights are granted temporarily — only when needed, for only as long as needed — then automatically revoked. It solves the problem of standing privilege — permanently active admin accounts that are always at risk of theft and misuse. With JIT, even if an admin's credentials are compromised, they have no elevated access unless an active session was requested and approved. Azure PIM is Microsoft's JIT implementation.

---

**Q3. What is LAPS and what specific attack does it prevent?**  
**A:** LAPS (Local Administrator Password Solution) automatically manages local administrator passwords on domain-joined machines — each machine gets a unique, randomly generated password, stored in Active Directory, rotated on a schedule. It prevents lateral movement via Pass-the-Hash using local admin credentials. Without LAPS, all machines often share the same local admin password from imaging — one compromised machine's hash grants access to all machines. With LAPS, each hash is unique — compromise of one machine's local admin cannot be used on others.

---

**Q4. What is gMSA and why is it better than a traditional service account?**  
**A:** gMSA (Group Managed Service Account) is an AD account where Windows automatically manages the password — generating a 240-bit random password, rotating it every 30 days, and making it available to authorised servers via the KDS root key. No human ever knows the password. This eliminates Kerberoasting risk (the password is computationally uncrackable), removes manual rotation burden, and prevents credential sharing. Traditional service accounts have manually set passwords that are often weak, never rotated, and known to multiple people.

---

**Q5. Scenario — During a security review you find a service account with Domain Admin rights, password last set 4 years ago, and a weak password. How do you fix this without breaking the service?**  
**A:** (1) First — identify exactly what the service account is used for by checking scheduled tasks, services, and IIS app pools across all servers (Get-ADUser with ServicePrincipalNames, then search services on servers). (2) Determine the minimum permissions the service actually needs — likely just read access to specific paths, not Domain Admin. (3) Create a replacement gMSA with only the minimum required permissions. (4) Test the gMSA in a non-production environment first. (5) Schedule a maintenance window to update each service to use the new gMSA. (6) Monitor for failures after the change. (7) Disable (not delete) the old service account and monitor for any alerts. (8) Delete after 30 days of no activity.

---

*"The most dangerous account in your environment is not the one an attacker creates — it is the one you forgot about, never reviewed, and left with Domain Admin rights since 2019."*
