# 01 — Tiered Administration Model

> **Section:** 04 — AD Security & Hardening  
> **Difficulty:** Advanced  
> **Stops:** Lateral movement, credential theft across tiers

---

## 📌 What is the Tiered Admin Model?

In most organisations, admins use one account for everything:
- GP logs into her workstation as a domain admin
- Uses the same account to check email, browse the web, manage servers, and access domain controllers
- If malware hits her workstation → attacker gets Domain Admin instantly

The **Tiered Administration Model** (also called the **Administrative Tier Model**) fixes this by separating admin activities into isolated tiers with **dedicated accounts** for each.

> **Simple definition:**  
> The Tiered Admin Model separates privileged accounts into three levels — Tier 0 (most critical), Tier 1 (servers), and Tier 2 (workstations) — with strict rules that credentials from a higher tier NEVER touch systems in a lower tier.

---

## 🏗️ The Three Tiers

```
┌──────────────────────────────────────────────────────┐
│  TIER 0 — Identity Infrastructure (Most Critical)    │
│                                                      │
│  Systems: Domain Controllers, ADFS, AD CS,           │
│           Entra Connect, PKI servers                 │
│                                                      │
│  Accounts: gp-t0-admin (used ONLY for Tier 0 tasks) │
│  Access from: Tier 0 PAW ONLY                        │
│  Risk if compromised: ENTIRE FOREST                  │
└──────────────────────────────────────────────────────┘
                        ▲
              NO downward flow
              of credentials
                        │
┌──────────────────────────────────────────────────────┐
│  TIER 1 — Server Infrastructure                      │
│                                                      │
│  Systems: Member servers, application servers,       │
│           databases, file servers                    │
│                                                      │
│  Accounts: hareesh-t1 (used ONLY for Tier 1 tasks)  │
│  Access from: Tier 1 PAW or jump server              │
│  Risk if compromised: All servers                    │
└──────────────────────────────────────────────────────┘
                        ▲
              NO downward flow
              of credentials
                        │
┌──────────────────────────────────────────────────────┐
│  TIER 2 — Workstations & End Users                   │
│                                                      │
│  Systems: Employee laptops, desktops                 │
│                                                      │
│  Accounts: hareesh (daily use — standard user)      │
│            gp (daily use — standard user)            │
│  Access from: Any workstation                        │
│  Risk if compromised: That user's data only          │
└──────────────────────────────────────────────────────┘
```

### The Golden Rule

```
A Tier 0 admin NEVER logs into a Tier 1 or Tier 2 machine.
A Tier 1 admin NEVER logs into a Tier 2 machine.

Why?
  If GP logs into Hareesh's workstation (Tier 2) with her Tier 0 admin account:
  → Her credentials are cached on Hareesh's machine
  → Hareesh's machine gets malware (common)
  → Attacker extracts GP's Tier 0 credentials from cache
  → Attacker has Domain Admin access ← total compromise

  If GP uses a SEPARATE Tier 0 account that NEVER touches Tier 2:
  → Hareesh's machine gets malware
  → Only Hareesh's standard credentials are at risk
  → Tier 0 credentials are safe ← attack contained ✅
```

---

## 👥 Account Structure in Practice

```
GP's accounts (IT Manager / Domain Admin):

  gp@company.com              ← Daily use (email, Teams, web browsing)
                                 Standard user, no admin rights
                                 Used from: any workstation

  gp-t1@company.com           ← Server administration
                                 Local admin on member servers
                                 Used from: Tier 1 jump server ONLY

  gp-t0@company.com           ← Domain Controller / forest administration
                                 Member of: Domain Admins
                                 Used from: Tier 0 PAW ONLY
                                 Smart card required: YES
                                 MFA: YES (additional factor)

Hareesh's accounts (IT Administrator):

  hareesh@company.com         ← Daily use (standard user)

  hareesh-t1@company.com      ← Server administration
                                 Used from: Tier 1 jump server ONLY

  (No Tier 0 account — Hareesh does not have DC-level access)
```

---

## ⚙️ How to Implement the Tiered Model

### Step 1 — Create the OU Structure

```powershell
# Create Tier-specific OUs for accounts
New-ADOrganizationalUnit -Name "Tier0-Accounts" `
    -Path "OU=Admin-Accounts,DC=company,DC=local" `
    -ProtectedFromAccidentalDeletion $true

New-ADOrganizationalUnit -Name "Tier1-Accounts" `
    -Path "OU=Admin-Accounts,DC=company,DC=local" `
    -ProtectedFromAccidentalDeletion $true

New-ADOrganizationalUnit -Name "Tier2-Accounts" `
    -Path "OU=Admin-Accounts,DC=company,DC=local" `
    -ProtectedFromAccidentalDeletion $true

# Create Tier-specific OUs for computers
New-ADOrganizationalUnit -Name "Tier0-Servers" `
    -Path "OU=Computers,DC=company,DC=local" `
    -ProtectedFromAccidentalDeletion $true

New-ADOrganizationalUnit -Name "Tier1-Servers" `
    -Path "OU=Computers,DC=company,DC=local" `
    -ProtectedFromAccidentalDeletion $true

New-ADOrganizationalUnit -Name "Tier2-Workstations" `
    -Path "OU=Computers,DC=company,DC=local" `
    -ProtectedFromAccidentalDeletion $true
```

### Step 2 — Create Admin Accounts per Tier

```powershell
# Create GP's Tier 0 admin account
New-ADUser `
    -Name "GP-T0-Admin" `
    -SamAccountName "gp-t0" `
    -UserPrincipalName "gp-t0@company.com" `
    -Path "OU=Tier0-Accounts,OU=Admin-Accounts,DC=company,DC=local" `
    -AccountPassword (ConvertTo-SecureString "VeryLong@Rand0m2024!#" -AsPlainText -Force) `
    -Enabled $true `
    -Description "Tier 0 admin account for GP — DC/Forest management only"

# Require smart card for Tier 0 account
Set-ADUser -Identity "gp-t0" -SmartcardLogonRequired $true

# Add to Domain Admins
Add-ADGroupMember -Identity "Domain Admins" -Members "gp-t0"

# Create Hareesh's Tier 1 admin account
New-ADUser `
    -Name "Hareesh-T1-Admin" `
    -SamAccountName "hareesh-t1" `
    -UserPrincipalName "hareesh-t1@company.com" `
    -Path "OU=Tier1-Accounts,OU=Admin-Accounts,DC=company,DC=local" `
    -AccountPassword (ConvertTo-SecureString "AnotherL0ng@Pass!" -AsPlainText -Force) `
    -Enabled $true `
    -Description "Tier 1 admin account for Hareesh — server management only"
```

### Step 3 — Enforce Tier Boundaries via GPO

The most critical part — prevent Tier 0 accounts from logging into Tier 1/2 machines, and vice versa.

```
GPO 1: "Tier0-Logon-Restrictions" — applied to Tier 0 systems (DCs)

Computer Config → Windows Settings → Security Settings
→ Local Policies → User Rights Assignment

"Allow log on locally":
  Remove: Domain Users, Administrators
  Add: Tier0-Admins group ONLY

"Deny log on locally":
  Add: Tier1-Admins group
  Add: Tier2-Users group
  (Tier 1 and Tier 2 accounts cannot log into DCs)

"Deny access to this computer from the network":
  Add: Tier1-Admins group
  Add: Tier2-Users group

─────────────────────────────────────────────

GPO 2: "Tier1-Logon-Restrictions" — applied to Tier 1 servers

"Deny log on locally":
  Add: Tier0-Admins group ← Tier 0 accounts cannot log into servers
  (Tier 0 should only ever be used on DCs/PAWs)

"Allow log on locally":
  Add: Tier1-Admins group

─────────────────────────────────────────────

GPO 3: "Tier2-Logon-Restrictions" — applied to Tier 2 workstations

"Deny log on locally":
  Add: Tier0-Admins group ← Domain Admin accounts cannot log into workstations
  Add: Tier1-Admins group ← Server admin accounts cannot log into workstations
```

### Step 4 — Create Security Groups per Tier

```powershell
# Tier 0 group
New-ADGroup -Name "Tier0-Admins" `
    -GroupScope Global `
    -GroupCategory Security `
    -Path "OU=Admin-Groups,DC=company,DC=local" `
    -Description "Tier 0 administrators — DC and forest management"

Add-ADGroupMember -Identity "Tier0-Admins" -Members "gp-t0"

# Tier 1 group
New-ADGroup -Name "Tier1-Admins" `
    -GroupScope Global `
    -GroupCategory Security `
    -Path "OU=Admin-Groups,DC=company,DC=local" `
    -Description "Tier 1 administrators — server management"

Add-ADGroupMember -Identity "Tier1-Admins" -Members "hareesh-t1", "gp-t1"

# Apply groups to GPO deny lists (as above)
```

### Step 5 — Verify Tier Boundaries Work

```powershell
# Test: Try to log into DC with a Tier 1 account (should fail)
# On DC01, check effective policy:
gpresult /r /scope computer

# Check deny logon policy is applied:
secedit /export /cfg c:\secpolicy.txt
# Look for: SeDenyInteractiveLogonRight, SeDenyNetworkLogonRight

# Simulate: what happens when hareesh-t1 tries to RDP to DC01?
# Expected: "The local policy of this system does not permit you to logon interactively"
```

---

## 🏢 Real-World Implementation Scenario

```
Company: 200 employees, 15 servers, 2 Domain Controllers

Before Tiered Model:
  GP uses gp@company.com for everything
  Logs into her laptop (Tier 2) daily with Domain Admin account
  Email, web, admin tasks — all from same account
  
  Attacker sends GP a phishing email with malicious attachment
  Malware runs on GP's laptop
  Mimikatz extracts Domain Admin hash from LSASS
  Attacker has Domain Admin → deploys ransomware → all 15 servers encrypted

After Tiered Model:
  GP uses gp@company.com (standard user) for daily work
  Phishing email → malware runs on GP's laptop
  Mimikatz runs → only finds gp@company.com (standard user) hash
  Attacker has standard user account → cannot reach servers ✅
  IT detects malware → remove and rebuild laptop
  
  Servers and DCs: NEVER compromised ✅
  Total damage: 1 workstation rebuilt (vs entire company encrypted)
```

---

## ⚠️ Common Mistakes and Bypass Attempts

### Mistake 1 — Incomplete Deny Policies

```
Problem: GPO denies interactive logon but not network logon
Attack: Attacker uses hashes for network authentication (PtH)
        Does not need interactive logon — uses net use or WMI

Fix: Deny BOTH:
  SeDenyInteractiveLogonRight (deny log on locally)
  SeDenyNetworkLogonRight (deny access from network)
  SeDenyRemoteInteractiveLogonRight (deny RDP)
```

### Mistake 2 — Admin Account Used for Email

```
Problem: GP's Tier 0 account is also her email account
         She reads email from the Tier 0 PAW
         Phishing email with link → clicked on PAW → malware on PAW

Fix: Tier 0 accounts must NEVER be used for email, web browsing, or any
     activity other than direct AD administration
     Separate account for daily work — always
```

### Mistake 3 — Service Accounts in Wrong Tier

```
Problem: svc_backup runs with Domain Admin rights (Tier 0 equivalent)
         but runs on a file server (Tier 1 system)
         
Attack: Attacker compromises file server → extracts svc_backup hash
        svc_backup has Domain Admin → full compromise

Fix: Service accounts should have only the permissions needed
     for the Tier where they run — never higher
     svc_backup on Tier 1 server → only backup rights, not Domain Admin
```

---

## 🛡️ Tiered Model Hardening Checklist

- [ ] Create separate admin accounts per tier for all admins
- [ ] Create Tier-specific OUs for accounts and computers
- [ ] Create Tier-specific security groups
- [ ] Implement Deny Logon GPOs for all three tiers
- [ ] Require smart card for all Tier 0 accounts
- [ ] Enable MFA for all Tier 0 and Tier 1 accounts
- [ ] Verify no Tier 0 accounts are used for email or web browsing
- [ ] Deploy PAWs for Tier 0 and Tier 1 admin tasks
- [ ] Audit service account tiers — no Tier 0 rights on Tier 1 systems
- [ ] Test tier boundaries monthly — attempt cross-tier login and verify denial
- [ ] Monitor Event ID 4625 for denied tier-boundary login attempts

---

## 🔧 Troubleshooting

```powershell
# Find accounts that are members of Domain Admins
# AND have logged into workstations recently (tier violation)
$domainAdmins = Get-ADGroupMember -Identity "Domain Admins" -Recursive |
    Select-Object -ExpandProperty SamAccountName

# Check logon events for DA accounts on workstations (Event ID 4624)
# Cross-reference: DA accounts should ONLY show logons on DCs/PAWs

# Find Tier 0 accounts logging into non-Tier-0 systems:
Get-WinEvent -ComputerName "WORKSTATION-001" -FilterHashtable @{
    LogName='Security'; Id=4624
} | Where-Object {
    $xml = [xml]$_.ToXml()
    $domainAdmins -contains $xml.Event.EventData.Data[5].'#text'
}
# If any results → tier boundary violation → investigate immediately

# Verify GPO deny policies are applied on a workstation
secedit /export /cfg C:\policy_check.txt /areas SECURITYPOLICY
Select-String -Path C:\policy_check.txt -Pattern "SeDenyInteractiveLogonRight"
```

---

## 🎯 Interview Questions

**Q1. What is the Tiered Admin Model and why was it created?**  
**A:** The Tiered Admin Model separates privileged accounts into three isolated levels: Tier 0 (identity infrastructure — DCs, AD CS), Tier 1 (servers), and Tier 2 (workstations and end users). The core rule is that credentials from a higher tier never touch lower-tier systems. It was created to stop lateral movement — if an attacker compromises a workstation (Tier 2), they find only standard user credentials there, not Domain Admin credentials. Without the model, admins using one account for everything means a single workstation compromise can lead to full domain compromise.

---

**Q2. What are the three tiers and what does each contain?**  
**A:** Tier 0 is the most critical tier — it contains identity infrastructure: Domain Controllers, AD Certificate Services, ADFS, Entra Connect, and PKI servers. Compromise of Tier 0 means compromise of the entire forest. Tier 1 contains member servers and applications — file servers, web servers, databases, application servers. Tier 2 contains workstations and end-user devices. Each tier has its own dedicated admin accounts that are only used within that tier.

---

**Q3. How do you technically enforce tier boundaries in Active Directory?**  
**A:** Through GPO User Rights Assignment policies. On Tier 0 systems: deny logon rights (interactive, network, RDP) to Tier 1 and Tier 2 accounts. On Tier 1 systems: deny logon to Tier 0 accounts (they should never need to log into servers — only DCs/PAWs). On Tier 2 systems: deny logon to both Tier 0 and Tier 1 admin accounts. These deny policies prevent admin accounts from being used on the wrong tier even if an attacker knows the credentials.

---

**Q4. Scenario — You discover that a Domain Admin account was used to log into a regular workstation at 3am. What does this indicate and what do you do?**  
**A:** This is either a tier boundary violation (misconfigured deny policy not working) or the Domain Admin account is compromised. Actions: (1) Identify which workstation and check its security logs for what the account did. (2) Check if the domain admin was legitimately working (contact them out-of-band). (3) If suspicious — disable the account immediately and revoke sessions. (4) Investigate how the login was possible — why did the deny policy not block it? (5) Check if LSASS was accessed on that workstation during the session (Mimikatz usage). (6) If the account is compromised — treat as a full incident response and check for persistence mechanisms.

---

*"The Tiered Admin Model is not a security product — it is a discipline. Every time an admin uses their Domain Admin account to check email, they are putting the entire organisation at risk. Separate accounts are not inconvenient — they are the difference between a contained incident and a total disaster."*
