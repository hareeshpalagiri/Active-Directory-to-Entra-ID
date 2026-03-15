# 03 — Users, Groups & Computers

> **Section:** 02 — Active Directory (On-Premise)  
> **Difficulty:** Beginner → Intermediate  
> **Depends on:** [02-Forest-Domain-OU.md](./02-Forest-Domain-OU.md)

---

## 📌 Overview

The three most common objects in Active Directory are **users**, **groups**, and **computers**. Understanding how they work, how they relate to each other, and how they are managed is the foundation of day-to-day AD administration — and the foundation of most AD attacks.

---

## 👤 User Accounts

A user account in AD represents a person (or service) that needs to authenticate and access resources.

### User Account Types

| Type | Purpose | Example |
|------|---------|---------|
| **Regular user** | Day-to-day work account | hareesh@company.com |
| **Admin account** | Privileged tasks only — separate from daily account | hareesh-admin@company.com |
| **Service account** | Runs applications and scheduled tasks | svc_backup, svc_webapp |
| **Guest account** | Temporary/limited access | contractor-john |
| **Shared mailbox account** | Disabled account for shared email | finance-shared |

### Key User Attributes

Every user account has attributes stored in AD. These are queried constantly by applications, authentication systems, and attackers.

| Attribute | What it stores | AD Attribute Name |
|-----------|---------------|-------------------|
| Username | Login name | sAMAccountName |
| UPN | Email-style login | userPrincipalName |
| Display name | Full name shown | displayName |
| Password hash | Stored hash of password | unicodePwd (not readable directly) |
| Last login | When they last logged in | lastLogonDate |
| Account status | Enabled or disabled | userAccountControl |
| Group memberships | Which groups they belong to | memberOf |
| Manager | Their reporting manager | manager |
| Department | Their department | department |
| SPN | Service Principal Name (service accounts) | servicePrincipalName |

```powershell
# View all attributes of Hareesh's account
Get-ADUser -Identity "hareesh" -Properties * |
    Select-Object Name, SamAccountName, UserPrincipalName,
                  Department, Manager, LastLogonDate,
                  Enabled, PasswordLastSet, MemberOf

# Output example:
# Name              : Hareesh
# SamAccountName    : hareesh
# UserPrincipalName : hareesh@company.com
# Department        : IT Operations
# Manager           : CN=GP,OU=Bengaluru,DC=company,DC=local
# LastLogonDate     : 15/03/2024 09:05:32
# Enabled           : True
# PasswordLastSet   : 01/02/2024 14:30:00
# MemberOf          : {CN=SG-IT-Operations,...}
```

### User Account Control (UAC) Flags

The `userAccountControl` attribute is a bitmask that stores multiple account settings in one number.

| Flag | Value | Meaning |
|------|-------|---------|
| NORMAL_ACCOUNT | 512 | Standard enabled account |
| ACCOUNTDISABLE | 2 | Account is disabled |
| PASSWD_NOTREQD | 32 | No password required ← dangerous |
| DONT_EXPIRE_PASSWORD | 65536 | Password never expires |
| NOT_DELEGATED | 1048576 | Account cannot be delegated |
| DONT_REQ_PREAUTH | 4194304 | Kerberos pre-auth disabled ← AS-REP Roasting target |

```powershell
# Find accounts with Kerberos pre-auth disabled (AS-REP Roasting risk)
Get-ADUser -Filter {DoesNotRequirePreAuth -eq $true} `
    -Properties DoesNotRequirePreAuth |
    Select-Object Name, SamAccountName

# Find accounts with password never expires
Get-ADUser -Filter {PasswordNeverExpires -eq $true} `
    -Properties PasswordNeverExpires |
    Select-Object Name, SamAccountName, PasswordNeverExpires
```

---

## 👥 Groups

Groups are used to organise users (and other objects) so that permissions can be assigned to the group rather than to individuals.

### Group Types

| Type | Purpose |
|------|---------|
| **Security Group** | Used for assigning permissions to resources (files, folders, apps) |
| **Distribution Group** | Used for email distribution lists only — cannot be used for permissions |

> ⚠️ Distribution groups cannot be used for security permissions — only Security groups can be added to NTFS or share permissions.

### Group Scopes

This is where most people get confused. Group scope determines **where the group can be used** and **who can be a member**.

| Scope | Members can be from | Can be used in |
|-------|-------------------|----------------|
| **Domain Local** | Any domain in forest + external | Same domain only |
| **Global** | Same domain only | Any domain in forest |
| **Universal** | Any domain in forest | Any domain in forest |

#### Simple way to remember:

```
Global Group:
  → Think "global" as in the group is globally available across the forest
  → But members must be from the SAME domain
  → Use for: collecting users from one domain

Domain Local Group:
  → Think "local" as in it only works in its HOME domain
  → But can accept members from ANYWHERE in the forest
  → Use for: assigning permissions to resources

Universal Group:
  → No restrictions — anyone from anywhere, used anywhere
  → Stored in Global Catalog → increases GC size
  → Use for: cross-domain access scenarios
```

#### The AGDLP Best Practice

Microsoft recommends organising groups in this pattern:

```
A  → Accounts (user accounts)
G  → Global Groups (role-based groups)
DL → Domain Local Groups (resource-based groups)
P  → Permissions (applied to resources)

Example:
  Hareesh (A) 
    → added to SG-IT-Staff (G — Global group, IT role)
      → SG-IT-Staff added to SG-FileShare-IT-Access (DL — Domain Local group)
        → SG-FileShare-IT-Access has NTFS Read/Write on \\FileServer\IT (P)

Benefits:
  → Want to add 10 new IT staff? Add them to SG-IT-Staff only
  → Their access to all IT resources follows automatically
  → Clean, auditable, scalable
```

### Built-in Privileged Groups

These groups exist in every AD domain. Their memberships must be carefully controlled.

| Group | What members can do | Risk |
|-------|-------------------|------|
| **Domain Admins** | Full control of the domain | 🔴 Critical |
| **Enterprise Admins** | Full control of entire forest | 🔴 Critical |
| **Schema Admins** | Modify AD schema | 🔴 Critical |
| **Administrators** | Local admin on Domain Controllers | 🔴 Critical |
| **Account Operators** | Create/modify user accounts | 🟠 High |
| **Backup Operators** | Back up and restore files (bypasses NTFS) | 🟠 High |
| **Server Operators** | Manage domain servers | 🟠 High |
| **Group Policy Creator Owners** | Create and edit GPOs | 🟠 High |
| **Remote Desktop Users** | RDP access to servers | 🟡 Medium |
| **DNS Admins** | Manage DNS — can be exploited for privilege escalation | 🟠 High |

```powershell
# Check Domain Admins members
Get-ADGroupMember -Identity "Domain Admins" -Recursive |
    Select-Object Name, SamAccountName, ObjectClass

# Check Enterprise Admins
Get-ADGroupMember -Identity "Enterprise Admins" -Recursive |
    Select-Object Name, SamAccountName

# Find ALL privileged group memberships for Hareesh
Get-ADPrincipalGroupMembership -Identity "hareesh" |
    Select-Object Name, GroupScope, GroupCategory
```

---

## 💻 Computer Accounts

Every machine joined to the domain has a **computer account** in AD. Computers authenticate to the domain just like users — they have their own password (managed automatically).

### Computer Account Facts

```
When a computer joins the domain:
  → A computer account is created in AD
  → Computer account name: DESKTOP-HR-001$  ← note the $ suffix
  → Computer gets a random password (120 chars, changed every 30 days)
  → Password managed automatically by Windows — admin never needs to know it

The computer account allows:
  → Machine authentication to the domain
  → Group Policy application
  → Kerberos tickets for machine-level services
  → Remote management via WMI, PSRemoting
```

### Computer Account Attributes

| Attribute | What it stores |
|-----------|---------------|
| Name | Computer hostname |
| Operating System | Windows version |
| Last logon | When it last authenticated to DC |
| Enabled/Disabled | Whether the account is active |
| DNS Hostname | FQDN of the machine |
| ServicePrincipalNames | Services running on this machine |

```powershell
# Find all computers in the domain
Get-ADComputer -Filter * -Properties OperatingSystem, LastLogonDate |
    Select-Object Name, OperatingSystem, LastLogonDate

# Find computers that haven't logged in for 90 days (stale)
$cutoff = (Get-Date).AddDays(-90)
Get-ADComputer -Filter {LastLogonDate -lt $cutoff -and Enabled -eq $true} `
    -Properties LastLogonDate |
    Select-Object Name, LastLogonDate

# Find computers running older OS versions
Get-ADComputer -Filter * -Properties OperatingSystem |
    Where-Object {$_.OperatingSystem -like "*Windows 7*" -or
                  $_.OperatingSystem -like "*Windows Server 2008*"} |
    Select-Object Name, OperatingSystem
```

---

## 🔗 How Users, Groups, and Computers Work Together

### Full Access Control Example

```
Scenario:
  GP wants Hareesh to access \\FileServer01\Finance-Reports

Step 1 — Create the Security Group:
  New-ADGroup -Name "SG-Finance-Reports-Read" `
              -GroupScope DomainLocal `
              -GroupCategory Security `
              -Path "OU=Groups,DC=company,DC=local"

Step 2 — Add Hareesh to the group:
  Add-ADGroupMember -Identity "SG-Finance-Reports-Read" `
                    -Members "hareesh"

Step 3 — Set NTFS permissions on the folder:
  $acl = Get-Acl "\\FileServer01\Finance-Reports"
  $permission = "COMPANY\SG-Finance-Reports-Read","Read","Allow"
  $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
  $acl.SetAccessRule($accessRule)
  Set-Acl "\\FileServer01\Finance-Reports" $acl

Result:
  Hareesh (user) → member of SG-Finance-Reports-Read (group)
  → Group has Read NTFS permission on Finance-Reports folder
  → Hareesh can read Finance-Reports ✅
  → GP only needs to manage group membership — not individual permissions ✅
```

### Onboarding a New Employee — Full AD Setup

```powershell
# New employee: Priya, Finance Department
# Manager: GP

# Step 1: Create user account
New-ADUser `
    -Name "Priya" `
    -SamAccountName "priya" `
    -UserPrincipalName "priya@company.com" `
    -Path "OU=Finance,OU=Headquarters,DC=company,DC=local" `
    -Department "Finance" `
    -Manager "GP" `
    -AccountPassword (ConvertTo-SecureString "TempP@ss2024!" -AsPlainText -Force) `
    -ChangePasswordAtLogon $true `
    -Enabled $true

# Step 2: Add to appropriate groups
Add-ADGroupMember -Identity "SG-Finance-Staff" -Members "priya"
Add-ADGroupMember -Identity "SG-Office365-Licensed" -Members "priya"
Add-ADGroupMember -Identity "SG-VPN-Users" -Members "priya"

# Step 3: Verify
Get-ADUser -Identity "priya" -Properties MemberOf |
    Select-Object Name, Enabled, @{N="Groups";E={$_.MemberOf}}
```

---

## ⚠️ Security Risks

### 1. Stale User Accounts
```
Risk: Accounts of employees who left — still enabled
Attack: Former employee or attacker uses old credentials
Defense:
  → Disable accounts on last day of employment (same day)
  → Run quarterly audit of inactive accounts:

$cutoff = (Get-Date).AddDays(-90)
Get-ADUser -Filter {LastLogonDate -lt $cutoff -and Enabled -eq $true} `
    -Properties LastLogonDate | Select-Object Name, LastLogonDate
```

### 2. DNSAdmins Group Abuse
```
Risk: Members of DNSAdmins can load a DLL as SYSTEM on the DNS server
Attack:
  Attacker adds themselves to DNSAdmins
  Uses dnscmd to load a malicious DLL
  DLL runs as SYSTEM on the DNS server (which is usually a DC)
  → Privilege escalation to Domain Admin level

Defense:
  Keep DNSAdmins group empty — use temporary delegation
  Monitor additions to DNSAdmins (Event ID 4728)
```

### 3. Kerberoastable Service Accounts
```
Risk: Service accounts with SPNs and weak passwords
Attack:
  Any domain user runs: Invoke-Kerberoast
  Gets service ticket for svc_backup (has SPN)
  Cracks weak password offline

Defense:
  Use gMSA for service accounts
  Set long random passwords (25+ chars) on legacy service accounts
  Audit SPNs:

Get-ADUser -Filter {ServicePrincipalNames -ne "$null"} `
    -Properties ServicePrincipalNames |
    Select-Object Name, ServicePrincipalNames
```

### 4. AdminSDHolder Abuse
```
What is AdminSDHolder?
  A special AD object that protects privileged group members
  Every 60 minutes, SDProp process copies AdminSDHolder ACL
  to all members of Domain Admins, Enterprise Admins, etc.

Attack:
  Attacker adds malicious ACE to AdminSDHolder
  After 60 minutes → SDProp copies it to ALL privileged users
  Attacker now has persistent rights over ALL privileged accounts

Defense:
  Monitor AdminSDHolder object for ACL changes (Event ID 5136)
  Regularly review AdminSDHolder permissions
```

---

## 🔧 Troubleshooting

### User cannot access a resource
```powershell
# Check group memberships (have they been added to correct group?)
Get-ADPrincipalGroupMembership -Identity "hareesh" | Select-Object Name

# NOTE: Group membership changes require re-login to take effect
# The Kerberos ticket caches group memberships at login time
# User must log off and back on for new group membership to apply

# Check if the group has correct NTFS permissions
(Get-Acl "\\FileServer01\Finance").Access |
    Where-Object {$_.IdentityReference -like "*SG-Finance*"}
```

### Computer account issues
```powershell
# Test secure channel between workstation and domain
Test-ComputerSecureChannel

# Repair broken secure channel
Test-ComputerSecureChannel -Repair

# Reset computer account from DC
Reset-ComputerMachinePassword -Server "DC01.company.local"
```

---

## 🎯 Interview Questions

**Q1. What is the difference between a Security Group and a Distribution Group?**  
**A:** A Security Group can be used to assign permissions to resources (files, shares, applications) AND for email distribution. A Distribution Group can only be used for email distribution — it cannot be used for resource permissions. In practice, most organisations use Security Groups for everything, since they serve both purposes.

---

**Q2. Explain the AGDLP model.**  
**A:** AGDLP stands for Accounts → Global Groups → Domain Local Groups → Permissions. Users are added to Global Groups (organised by role or department). Global Groups are added to Domain Local Groups (organised by resource access). Domain Local Groups are assigned permissions to resources. This model is scalable — adding a new user to a Global Group automatically gives them all the access that group provides, without changing any permissions directly.

---

**Q3. What is the difference between Group Scope types?**  
**A:** Global Groups accept members only from the same domain but can be used in any domain in the forest — ideal for grouping users by role. Domain Local Groups accept members from any domain in the forest but can only be used to assign permissions in their home domain — ideal for resource access groups. Universal Groups accept members from anywhere and can be used anywhere, but are stored in the Global Catalog which can cause replication overhead — best for cross-domain access scenarios.

---

**Q4. What is the AdminSDHolder and why is it a security concern?**  
**A:** AdminSDHolder is an AD object whose ACL is automatically copied to all members of privileged groups (Domain Admins, etc.) every 60 minutes by the SDProp process. This is a security concern because if an attacker modifies the AdminSDHolder ACL — adding themselves as having GenericAll over it — the SDProp process will propagate that malicious permission to all privileged users within an hour. This creates persistent rights over all admin accounts. Defenders must monitor AdminSDHolder for unexpected ACL changes.

---

**Q5. Scenario — You run a query and find 150 user accounts that have not logged in for over 180 days. What do you do?**  
**A:** (1) Export the list with names, last logon dates, and department. (2) Cross-reference with HR — are any of these employees who left? Those should have been disabled on their last day — disable them immediately. (3) For accounts of current employees — contact their managers: are these legitimate accounts still needed? (4) For service accounts — check if the service is still running; if not, disable the account. (5) Do NOT delete immediately — disable first and monitor for 30 days. If no alerts fire and no service breaks, then delete. (6) Implement a process to prevent recurrence: automated 90-day inactive account reporting, HR-triggered offboarding workflow.

---

*"In Active Directory, groups are not just an organisational convenience — they are your permission management system. Design them well and access control becomes effortless. Design them poorly and you will spend years cleaning up the mess."*
