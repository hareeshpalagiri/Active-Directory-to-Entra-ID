# 01 — Reconnaissance & Enumeration

> **Section:** 05 — AD Attack Techniques  
> **Difficulty:** Intermediate  
> **Phase:** Initial — first thing an attacker does after gaining a foothold

---

## 📌 What is AD Enumeration?

After an attacker gains their first foothold (via phishing, password spray, or exploitation), they are typically a **regular domain user** — they do not have admin rights yet.

Their first task: **understand the environment**.

AD Enumeration is the process of querying Active Directory to map out:
- The domain structure
- All users and their attributes
- All groups and their members
- All computers and their OS versions
- Service accounts with SPNs (Kerberoasting targets)
- Password policy (lockout threshold for spraying)
- ACL misconfigurations (privilege escalation paths)
- Trust relationships

> **The dangerous truth:** Any authenticated domain user — even the most basic account — can query most of this information by default. AD was designed for accessibility, not least-privilege querying.

---

## 🧠 Why Enumeration Matters

```
Without enumeration — attacker is blind:
  "I have Hareesh's account. Now what?"
  → Random guessing → noisy → detected quickly

With enumeration — attacker has a map:
  "I have Hareesh's account. Let me see..."
  → 3 service accounts with SPNs → Kerberoast them
  → svc_backup has weak password → crack it
  → svc_backup has GenericAll on IT-Admins → add myself
  → IT-Admins has WriteDACL on Domain Admins → grant myself membership
  → I am now Domain Admin — no exploit needed ✅
  → Entire attack: 2 hours, zero exploits, just enumeration + credential abuse
```

---

## ⚙️ Enumeration Tools

### Tool 1 — Built-in Windows Commands (No Tools Needed)

```cmd
# Basic domain info
net user /domain              ← list all domain users
net group /domain             ← list all domain groups
net group "Domain Admins" /domain  ← members of Domain Admins
net localgroup administrators ← local admin members

# Domain info
echo %USERDOMAIN%             ← current domain
echo %LOGONSERVER%            ← domain controller being used
ipconfig /all                 ← DNS server = DC IP

# Find domain controllers
nltest /dclist:company.local

# Who am I?
whoami /all                   ← current user + all group memberships + privileges
```

---

### Tool 2 — PowerShell AD Module

```powershell
# Must have RSAT installed or be on a DC

# Get domain info
Get-ADDomain | Select-Object DNSRoot, DomainMode, PDCEmulator

# Get all users
Get-ADUser -Filter * -Properties Department, LastLogonDate, MemberOf |
    Select-Object Name, SamAccountName, Department, LastLogonDate

# Find Domain Admins
Get-ADGroupMember -Identity "Domain Admins" -Recursive |
    Select-Object Name, SamAccountName, ObjectClass

# Find all service accounts (SPN set = Kerberoasting target)
Get-ADUser -Filter {ServicePrincipalNames -ne "$null"} `
    -Properties ServicePrincipalNames, PasswordLastSet |
    Select-Object Name, SamAccountName, ServicePrincipalNames, PasswordLastSet

# Find accounts with pre-auth disabled (AS-REP Roasting target)
Get-ADUser -Filter {DoesNotRequirePreAuth -eq $true} `
    -Properties DoesNotRequirePreAuth |
    Select-Object Name, SamAccountName

# Find password policy (lockout threshold for spraying)
Get-ADDefaultDomainPasswordPolicy |
    Select-Object LockoutThreshold, LockoutDuration, MinPasswordLength

# Find all computers and OS versions
Get-ADComputer -Filter * -Properties OperatingSystem, LastLogonDate |
    Select-Object Name, OperatingSystem, LastLogonDate |
    Sort-Object OperatingSystem

# Find stale accounts (not logged in for 90 days)
$cutoff = (Get-Date).AddDays(-90)
Get-ADUser -Filter {LastLogonDate -lt $cutoff -and Enabled -eq $true} `
    -Properties LastLogonDate | Select-Object Name, LastLogonDate

# Find all AD trusts
Get-ADTrust -Filter * | Select-Object Name, TrustType, TrustDirection
```

---

### Tool 3 — PowerView (Most Popular Attacker Tool)

PowerView is a PowerShell module by Will Schroeder that makes AD enumeration extremely easy.

```powershell
# Import PowerView
Import-Module .\PowerView.ps1

# Get domain info
Get-Domain
Get-DomainController

# Find all users with detailed attributes
Get-DomainUser | Select-Object samaccountname, description, pwdlastset, memberof

# ← Check description fields — admins often store passwords here!
Get-DomainUser | Where-Object {$_.description -ne $null} |
    Select-Object samaccountname, description

# Find all computers
Get-DomainComputer | Select-Object name, operatingsystem, dnshostname

# Find local admin rights across the domain
# (Who has local admin on which machines?)
Find-LocalAdminAccess
# ← Returns machines where current user has local admin ← lateral movement targets

# Find where Domain Admins are logged in
Find-DomainUserLocation -UserGroupIdentity "Domain Admins"
# ← Shows which machines DAs are currently logged into → attack those machines

# Find shares accessible by current user
Find-DomainShare -CheckShareAccess

# Enumerate ACLs on all objects (find misconfigurations)
Get-DomainObjectAcl -ResolveGUIDs |
    Where-Object {
        $_.SecurityIdentifier -match "S-1-5-21-.*-1[1-9][0-9][0-9]$" -and
        $_.ActiveDirectoryRights -match "GenericAll|WriteDACL|WriteOwner|ForceChangePassword"
    }

# Find Kerberoastable accounts
Get-DomainUser -SPN | Select-Object samaccountname, serviceprincipalname

# Find AS-REP roastable accounts
Get-DomainUser -PreauthNotRequired | Select-Object samaccountname
```

---

### Tool 4 — ldapdomaindump (No PowerShell Needed)

```bash
# Run from Linux or Windows with Python
python3 ldapdomaindump.py \
    -u 'company\hareesh' \
    -p 'password' \
    DC01.company.local \
    -o /tmp/ldap-output/

# Output files:
# domain_users.json      ← all users + attributes
# domain_groups.json     ← all groups + members
# domain_computers.json  ← all computers + OS
# domain_policy.json     ← password policy
# domain_trusts.json     ← trust relationships
# domain_users_by_group.json ← group memberships

# Convert to HTML for easy viewing:
ldapdomaindump --dump -u 'company\hareesh' -p 'password' DC01
# Creates .html files you can open in browser
```

---

### Tool 5 — BloodHound/SharpHound (Attack Path Mapping)

```powershell
# SharpHound — data collector for BloodHound
# Run as any domain user

# Collect all data
.\SharpHound.exe --CollectionMethod All --OutputDirectory C:\Temp\

# Stealth collection (slower but less noisy)
.\SharpHound.exe --CollectionMethod DCOnly --OutputDirectory C:\Temp\

# Output: ZIP file containing JSON files
# Import into BloodHound GUI for visual attack path analysis
```

---

## 🏢 Real Attack Scenario — Full Enumeration

```
Scenario: Attacker has compromised Hareesh's standard user account
          via a phishing email. Now enumerating the domain.

Step 1: Understand current position
  whoami /all
  → hareesh@company.local
  → Groups: Domain Users, IT-Operations
  → No special privileges

Step 2: Map the domain
  Get-Domain
  → DNSRoot: company.local
  → DomainMode: Windows2016Domain
  → PDCEmulator: DC01.company.local

Step 3: Find high-value targets
  Get-ADGroupMember "Domain Admins"
  → GP (gp-t0@company.local) ← primary target
  → svc_dc_backup ← interesting — service account in Domain Admins?

Step 4: Find Kerberoastable accounts
  Get-DomainUser -SPN
  → svc_backup (SPN: backup/server01.company.local)
     Password last set: 2020-01-15 ← 4 years ago!
  → svc_webapp (SPN: HTTP/webapp.company.local)
     Password last set: 2023-06-01

Step 5: Find password policy
  Get-ADDefaultDomainPasswordPolicy
  → LockoutThreshold: 5
  → Can try 4 passwords per account without lockout

Step 6: Find where admins are logged in
  Find-DomainUserLocation -UserGroupIdentity "Domain Admins"
  → GP is logged into SERVER-APP01 right now! ← attack target

Step 7: Check current access
  Find-LocalAdminAccess
  → WORKSTATION-IT-003 ← Hareesh has local admin here

Step 8: Look for credentials in descriptions
  Get-DomainUser | Where-Object {$_.description -ne $null}
  → svc_monitor: description = "Password: Monitor@2022!" ← found cleartext password!

Attacker now has:
  ✅ Map of the entire domain
  ✅ 2 Kerberoastable accounts (especially svc_backup from 2020)
  ✅ Cleartext password for svc_monitor
  ✅ Location of GP (logged into SERVER-APP01)
  ✅ Machine with local admin (WORKSTATION-IT-003)
  ✅ Password policy (4 attempts safe for spraying)
  
Next step: Kerberoast svc_backup → crack password → escalate
```

---

## 🔍 Detection

```
Event ID 4661 — SAM handle request (mass user enumeration)
Event ID 1644 — LDAP query log (expensive/complex queries)
Event ID 4662 — Object access in AD

Enable LDAP query logging to detect enumeration:
  HKLM\SYSTEM\CurrentControlSet\Services\NTDS\Diagnostics
  "15 Field Engineering" = 5
  Threshold: log queries returning more than 1000 results

Microsoft Defender for Identity alerts:
  → "Account enumeration reconnaissance"
  → "Network mapping reconnaissance (DNS)"
  → "User and group membership reconnaissance"

Splunk/Sentinel query for bulk user enumeration:
  SecurityEvent
  | where EventID == 4661
  | summarize count() by Account, Computer, bin(TimeGenerated, 5m)
  | where count_ > 50
  | order by count_ desc

Signs of PowerView:
  → Single account querying many LDAP objects rapidly
  → Unusual LDAP queries from workstations (not from DC)
  → net.exe commands for group enumeration
```

---

## 🛡️ Defence

```
1. Restrict LDAP query access:
   Apply LDAP query limits:
   HKLM\SYSTEM\CurrentControlSet\Services\NTDS\Parameters
   "MaxPageSize" = 500 (limits results per query)
   
2. Enable LDAP query logging (Event ID 1644)

3. Deploy Microsoft Defender for Identity:
   → Automatically detects enumeration patterns
   → Alerts on: account enum, group enum, DNS recon

4. Restrict sensitive attributes from regular users:
   Remove read access to sensitive attributes via AD ACLs:
   → Description field (never store passwords here!)
   → ms-Mcs-AdmPwd (LAPS passwords)
   → UserPassword attribute

5. Hunt for passwords in description fields:
   Get-ADUser -Filter * -Properties Description |
       Where-Object {$_.Description -match "pass|pwd|password|key"} |
       Select-Object Name, Description
   → Clear any found immediately

6. Implement honeypot accounts:
   Create fake accounts with attractive names (svc_admin, backup_admin)
   Set alerts if anyone queries or tries to use them
   Any enumeration of these accounts = active attacker in environment
```

---

## 🎯 Interview Questions

**Q1. What is AD enumeration and why can any domain user do it?**  
**A:** AD enumeration is the process of querying Active Directory to map users, groups, computers, ACLs, and attack paths. Any domain user can do most of it because AD was designed for accessibility — applications, printers, and services all need to query the directory. By default, Authenticated Users have read access to most AD objects. This means an attacker who compromises even the most basic account can immediately gather a complete map of the environment.

---

**Q2. What is PowerView and what makes it dangerous?**  
**A:** PowerView is a PowerShell-based AD enumeration framework by Will Schroeder. It makes complex AD queries trivial — finding Kerberoastable accounts, mapping ACL attack paths, locating where Domain Admins are logged in, and finding machines where the current user has local admin access. It is dangerous because it requires no special privileges, no additional tools installation (pure PowerShell), and produces output that directly feeds into the next phase of attack (Kerberoasting, lateral movement, privilege escalation).

---

**Q3. What information should an attacker never find in AD user description fields?**  
**A:** Passwords — which unfortunately are found there regularly. Admins sometimes set a user's initial password in the description field for convenience, then forget to remove it. Any domain user can read description fields. An attacker running Get-DomainUser and filtering for description fields containing "pass" or "pwd" will often find active credentials. Audit and clear all description fields containing credential-like strings immediately.

---

**Q4. Scenario — MDI alerts fire showing a single account queried 500 users, 50 groups, and all computer objects in 3 minutes at 11pm. What is happening and what do you do?**  
**A:** This is active AD enumeration — likely automated tooling (PowerView, ldapdomaindump, or SharpHound). Actions: (1) Identify the source account and source machine from the alert. (2) Check if this is a legitimate activity — no IT admin should be running bulk AD queries at 11pm. (3) Isolate the source machine from the network immediately. (4) Check the machine for malware — the account may be compromised. (5) Review what data was accessed — did the query touch sensitive attributes like LAPS passwords or admin group memberships? (6) Reset the compromised account's password. (7) Check for follow-on attacks — was Kerberoasting or lateral movement attempted from the same source after the enumeration?

---

*"Enumeration is the reconnaissance phase of every AD attack. An attacker who has enumerated your domain knows more about your AD than most of your IT team. Run BloodHound yourself first — see what an attacker would see — and fix it before they do."*
