# 01 — What is Active Directory?

> **Section:** 02 — Active Directory (On-Premise)  
> **Difficulty:** Beginner  
> **Read time:** ~20 minutes

---

## 📌 What is Active Directory?

Imagine a company with 500 employees, 300 computers, 50 servers, and 20 printers — all connected on the same network.

Without any management system:
```
Problems:
  → Every computer needs its own username and password database
  → Hareesh has 50 different passwords for 50 different machines
  → GP cannot push a security policy to all 300 computers at once
  → A new employee needs IT to manually set up each machine
  → When someone leaves — IT must log into every machine to remove them
  → No central record of who has access to what
  → No way to enforce password complexity on all machines at once
```

**Active Directory solves all of this.**

> **Simple definition:**  
> Active Directory (AD) is Microsoft's directory service — a centralised database that stores information about every user, computer, group, and resource in an organisation, and controls who can access what across the entire network.

### Real-World Analogy

Think of Active Directory as the **HR department + security office + phone directory** of a company — all combined into one system:

- **HR department** — knows every employee, their role, their manager, their department
- **Security office** — controls which doors each employee can open
- **Phone directory** — can look up any person or resource instantly
- **Policy enforcer** — ensures every employee follows the same rules

---

## 🏗️ What Problem Does AD Solve?

### Before Active Directory (Workgroup Model)

```
Small office — 5 computers, no AD:

Computer1: has its own user accounts (hareesh, gp)
Computer2: has its own user accounts (hareesh, gp) ← separate database
Computer3: has its own user accounts (hareesh, gp) ← separate database

Problems:
  → Hareesh changes his password on Computer1
  → Still needs to change it separately on Computer2 and Computer3
  → IT must visit every machine individually to make changes
  → No central control of security policies
  → Fine for 5 computers → IMPOSSIBLE for 500 computers
```

### After Active Directory (Domain Model)

```
Company with 500 computers, Active Directory deployed:

Active Directory (on Domain Controller):
  One central database:
    Users: hareesh, gp, 498 other employees
    Computers: all 500 machines
    Groups: Finance-Team, IT-Admins, HR-Staff...
    Policies: password complexity, screen lock, USB disabled...

Hareesh changes his password once in AD:
  → Works on ALL 500 computers immediately ✅

GP pushes a new security policy from AD:
  → Applies to ALL 500 computers automatically ✅

New employee joins:
  → One account created in AD
  → Can log into ANY company computer immediately ✅

Employee leaves:
  → One account disabled in AD
  → Cannot log into ANY company computer ✅
```

---

## 🧩 Core Components of Active Directory

### 1. Domain Controller (DC)

The server that **runs Active Directory**. It is the heart of the entire system.

```
What a Domain Controller does:
  ✅ Stores the AD database (NTDS.dit)
  ✅ Authenticates users when they log in (Kerberos/NTLM)
  ✅ Authorises access to resources
  ✅ Applies Group Policy to users and computers
  ✅ Replicates changes to other Domain Controllers
  ✅ Runs DNS (usually)

What happens if the DC goes down?
  → Users cannot log in to domain-joined machines
  → Network resources become inaccessible
  → This is why every company has at least 2 DCs (redundancy)

GP's environment:
  DC01 — Primary Domain Controller (London office)
  DC02 — Secondary Domain Controller (London office — redundancy)
  DC03 — Domain Controller (Bengaluru office)
```

### 2. The AD Database — NTDS.dit

The actual file where all AD data is stored on the Domain Controller.

```
Location: C:\Windows\NTDS\NTDS.dit

Contains:
  → All user accounts and password hashes
  → All computer accounts
  → All group memberships
  → All GPO links
  → All AD object attributes

Why attackers want this file:
  → Contains ALL password hashes for ALL domain accounts
  → If stolen → can crack every password offline
  → DCSync attack replicates this data without touching the file
  → This file must be protected at all costs
```

### 3. SYSVOL

A shared folder on every Domain Controller that stores Group Policy files and logon scripts.

```
Location: C:\Windows\SYSVOL\sysvol\domain.com\

Contains:
  → Group Policy templates and settings
  → Logon/logoff scripts
  → Startup/shutdown scripts

Replicated between all DCs using:
  → DFSR (Distributed File System Replication) — modern
  → FRS (File Replication Service) — legacy

Why it matters for security:
  → If an attacker can write to SYSVOL
  → They can create malicious scripts that run on every machine
  → GPO abuse attack vector
```

### 4. LDAP — The Query Language

LDAP (Lightweight Directory Access Protocol) is how applications and users **query** Active Directory.

```
Examples of LDAP queries:
  "Find all users in the Finance department"
  "Find all computers that haven't logged in for 90 days"
  "Find all members of the Domain Admins group"
  "Find Hareesh's email address and manager"

LDAP Ports:
  389  → LDAP (unencrypted) — avoid in production
  636  → LDAPS (LDAP over TLS) — use this
  3268 → Global Catalog
  3269 → Global Catalog over TLS
```

### 5. Kerberos — The Authentication Protocol

The protocol AD uses to authenticate users. Covered in depth in Section 03.

```
Simple summary:
  Hareesh logs into his workstation
  → Kerberos issues a TGT (Ticket Granting Ticket)
  → This TGT is used to access all network resources
  → Password is only checked once — at initial login
  → Tickets are used for everything after that

Port: 88 (TCP/UDP)
```

### 6. DNS — The Navigation System

Active Directory **cannot function without DNS**. DNS is how all computers find the Domain Controller.

```
When Hareesh's laptop starts up:
  Step 1: Laptop queries DNS: "Where is the Domain Controller?"
  DNS responds: "DC01 is at 192.168.1.10"
  Step 2: Laptop contacts DC01 at 192.168.1.10
  Step 3: Kerberos authentication begins

If DNS is broken:
  → Laptops cannot find the Domain Controller
  → No authentication possible
  → No Group Policy applies
  → Network resources unreachable
  → AD is effectively down even though DC is running
```

---

## 🔧 FSMO Roles — Special Domain Controller Responsibilities

Not all DCs are equal. Five special roles (FSMO — Flexible Single Master Operations) are assigned to specific DCs.

### Forest-Wide Roles (one per forest)

| Role | What it does |
|------|-------------|
| **Schema Master** | Controls changes to the AD schema (structure of all objects) |
| **Domain Naming Master** | Controls adding/removing domains in the forest |

### Domain-Wide Roles (one per domain)

| Role | What it does |
|------|-------------|
| **PDC Emulator** | Handles password changes, time sync, account lockouts — most important |
| **RID Master** | Allocates unique IDs (RIDs) for new objects created in the domain |
| **Infrastructure Master** | Maintains references to objects in other domains |

```
Real-world example:
  Hareesh changes his password on his workstation
  → The change goes to the PDC Emulator DC first
  → PDC Emulator immediately replicates it to all other DCs
  → Ensures password change takes effect within seconds

  If PDC Emulator is down:
  → Password changes may be slow or fail
  → Account lockouts may not propagate quickly
  → This is why the PDC Emulator should be on your best DC

Check FSMO role holders:
```

```powershell
# Find all FSMO role holders
netdom query fsmo

# Output:
# Schema master          DC01.company.local
# Domain naming master   DC01.company.local
# PDC                    DC01.company.local
# RID pool manager       DC01.company.local
# Infrastructure master  DC02.company.local
```

---

## 🏢 Real-World AD Architecture

### Small Company (single domain)

```
Forest: company.local
  │
  Domain: company.local
    │
    ├── DC01 (Domain Controller — PDC Emulator, Schema Master)
    ├── DC02 (Domain Controller — redundancy)
    │
    ├── Users: 150 user accounts
    ├── Computers: 120 workstations, 15 servers
    └── Groups: 30 security groups
```

### Large Enterprise (multiple domains)

```
Forest: enterprise.com
  │
  ├── Domain: enterprise.com (root domain)
  │     ├── DC01, DC02
  │     └── Admin accounts only
  │
  ├── Domain: uk.enterprise.com
  │     ├── DC-UK01, DC-UK02
  │     └── UK users and computers
  │
  ├── Domain: india.enterprise.com
  │     ├── DC-IN01, DC-IN02
  │     └── India users and computers (Hareesh, GP)
  │
  └── Domain: us.enterprise.com
        ├── DC-US01, DC-US02
        └── US users and computers
```

---

## ⚠️ Why AD is the #1 Attack Target

```
Statistics:
  → 90%+ of Fortune 500 companies use Active Directory
  → Every Windows enterprise environment has AD
  → Compromising AD = compromising the entire organisation

What an attacker gets with Domain Admin:
  ✅ Read all user password hashes
  ✅ Create new admin accounts
  ✅ Access every server, every file share, every database
  ✅ Disable security tools (AV, EDR)
  ✅ Deploy ransomware to all machines via GPO
  ✅ Persist indefinitely (Golden Ticket lasts 10 years)

Common attack chain:
  Phish regular user (Hareesh)
       ↓
  Enumerate AD — find paths to admin
       ↓
  Kerberoast service account
       ↓
  Crack service account password
       ↓
  Lateral movement to server
       ↓
  Dump credentials — find Domain Admin hash
       ↓
  Domain Admin compromised
       ↓
  Full forest compromise ← game over
```

---

## 👨‍💻 AD from a Cybersecurity Perspective

### SOC Analyst
```
Daily monitoring:
  → Additions to Domain Admins (Event ID 4728)
  → New accounts created after hours (Event ID 4720)
  → DC replication failures (may indicate DCSync)
  → GPO modifications (Event ID 5136)
  → Large number of Kerberos ticket requests (Kerberoasting)
```

### Penetration Tester
```
First steps after initial access:
  → Enumerate AD: PowerView, BloodHound, ldapdomaindump
  → Find: Domain Admins, service accounts with SPNs, ACL misconfigs
  → Check: LAPS deployment, Kerberos delegation settings
  → Map: Attack paths to Domain Admin via BloodHound
```

### Security Engineer
```
Hardening priorities:
  → Tier 0 protection (Domain Controllers)
  → Privileged account management (PAM)
  → GPO security baseline
  → AD audit logging
  → Defender for Identity deployment
```

---

## 🔧 Essential AD Commands

```powershell
# Check domain information
Get-ADDomain

# Check forest information
Get-ADForest

# Find all Domain Controllers
Get-ADDomainController -Filter *

# Check FSMO roles
netdom query fsmo

# Find all users
Get-ADUser -Filter * | Select-Object Name, SamAccountName, Enabled

# Find disabled accounts
Get-ADUser -Filter {Enabled -eq $false} | Select-Object Name, SamAccountName

# Find accounts not logged in for 90 days
$cutoff = (Get-Date).AddDays(-90)
Get-ADUser -Filter {LastLogonDate -lt $cutoff -and Enabled -eq $true} `
    -Properties LastLogonDate | Select-Object Name, LastLogonDate

# Check DC health
dcdiag /test:replications
repadmin /showrepl
```

---

## ❓ Think About This

1. Your company has one Domain Controller. It crashes at 9am on a Monday. What happens to every employee trying to log in? How would you prevent this?
2. An attacker gains read access to the NTDS.dit file. What can they do with it and how would you detect this?
3. Why does Active Directory depend on DNS? What would you do if DNS failed in a production environment?
4. The PDC Emulator is the most critical FSMO role in daily operations. If it goes offline, what three things immediately start failing?
5. A company says "we have a firewall so our AD is safe." Why is this statement dangerously wrong?

---

## 🎯 Interview Questions

**Q1. What is Active Directory and what problem does it solve?**  
**A:** Active Directory is Microsoft's directory service — a centralised database that manages users, computers, groups, and policies across an entire organisation. It solves the problem of managing identity at scale — instead of maintaining separate user databases on every machine, AD provides one central identity store. Any user can log into any domain-joined computer, security policies apply automatically to all machines, and access control is managed centrally.

---

**Q2. What is a Domain Controller and what happens if it goes offline?**  
**A:** A Domain Controller is the server that runs Active Directory. It authenticates users, authorises resource access, stores the AD database (NTDS.dit), applies Group Policy, and replicates changes to other DCs. If the only DC goes offline: users cannot log in to domain-joined machines, network resources become inaccessible, Group Policy cannot be applied, and DNS may fail. This is why every organisation should have a minimum of two DCs for redundancy.

---

**Q3. What are FSMO roles and which one is most critical for daily operations?**  
**A:** FSMO (Flexible Single Master Operations) roles are five special responsibilities held by specific Domain Controllers. The five roles are: Schema Master, Domain Naming Master, PDC Emulator, RID Master, and Infrastructure Master. The PDC Emulator is most critical for daily operations — it handles password changes (ensuring they replicate immediately), processes account lockouts, and acts as the authoritative time source for the domain. Kerberos requires time synchronisation within 5 minutes — if the PDC Emulator is down, time drift can cause authentication failures.

---

**Q4. Why is NTDS.dit so sensitive and how do attackers target it?**  
**A:** NTDS.dit is the Active Directory database file stored on Domain Controllers. It contains all user account password hashes for the entire domain. If an attacker obtains this file, they can crack all password hashes offline. Attackers target it through: direct file copy (requires DC-level access), Volume Shadow Copy theft, or the DCSync attack (using Mimikatz to replicate the database over the network by impersonating a DC — without touching the file at all). Defence: protect DCs as Tier 0 assets, use Defender for Identity to detect DCSync.

---

**Q5. Scenario — An employee reports they cannot log into their workstation with correct credentials. AD appears healthy. What do you check?**  
**A:** (1) Check if the account is locked out or disabled — Get-ADUser with LockedOut and Enabled properties. (2) Check if the password has expired. (3) Check if there are workstation or time restrictions on the account. (4) Check if the machine can reach the Domain Controller — Test-NetConnection to DC on port 88 (Kerberos) and 389 (LDAP). (5) Check DNS resolution — nslookup company.local — if the machine cannot find the DC via DNS, authentication fails. (6) Check the machine's domain membership — if it lost its secure channel, re-join the domain or reset the computer account with Test-ComputerSecureChannel -Repair.

---

*"Active Directory is the master key to the entire Windows enterprise. Whoever controls AD controls everything — which is exactly why every attacker wants it and every defender must protect it."*
