# 🎤 Interview Q&A — Active Directory to Entra ID

> **400+ Interview Questions with detailed answers** covering all 10 sections of this guide. Organized by topic and difficulty level. Study these to ace any IAM, Identity Security, or AD Engineering interview.

---

## 📚 How to Use This Guide

```
DIFFICULTY LEVELS:
  🟢 Junior     (0-2 years experience)
  🟡 Mid-Level  (2-5 years experience)
  🔴 Senior     (5+ years / specialized)
  ⭐ Principal  (architect / lead level)

INTERVIEW TYPES:
  💼 General IT/Sysadmin Interview
  🔒 Security Engineer / Blue Team
  🎯 Penetration Tester / Red Team
  🏗️  Identity Architect
```

---

## 🔑 SECTION 1 — IAM Core Concepts

```
🟢 Q1: What is the difference between Authentication and Authorization?
   A: Authentication = proving WHO you are (username + password, MFA).
      Authorization = determining WHAT you can access after being identified.
      Example: Logging into the banking app = authentication.
              Seeing only YOUR account balance, not others = authorization.

🟢 Q2: What is Single Sign-On (SSO)?
   A: SSO lets a user log in once and access multiple applications without
      re-entering credentials. Example: Log into Google → automatically
      signed into Gmail, YouTube, Google Drive — one login, many apps.
      Protocols: SAML, OAuth 2.0, OIDC.

🟢 Q3: What is Multi-Factor Authentication (MFA)?
   A: MFA requires 2+ verification factors from different categories:
      Something you know (password), something you have (phone/token),
      something you are (biometric). Even if password is stolen, attacker
      needs the second factor too.

🟡 Q4: What is Zero Trust and how does it differ from traditional security?
   A: Traditional: "Trust but verify" — trust anything inside the network.
      Zero Trust: "Never trust, always verify" — verify every request,
      regardless of source location. Core principles: Verify explicitly,
      use least privilege access, assume breach.
      Real example: VPN access = old model. Conditional Access + device
      compliance check = Zero Trust model.

🟡 Q5: What is PAM (Privileged Access Management)?
   A: PAM controls and monitors privileged accounts (admins, service
      accounts). Features include: password vaulting (storing in safe),
      session recording, just-in-time access (get privileges only when
      needed), approval workflows.
      Example tools: CyberArk, BeyondTrust, Microsoft PIM.

🔴 Q6: Explain the principle of least privilege and how you enforce it in AD.
   A: Least privilege = give accounts ONLY the permissions needed for
      their job, nothing more.
      In AD: Use role-based groups (not direct user permissions), regularly
      audit group memberships, remove stale access, use tiered admin model
      (Tier 0/1/2), implement just-in-time access via PIM for admins.
      Monitor: Event 4728/4732 for group changes.

🔴 Q7: What is the difference between RBAC and ABAC?
   A: RBAC (Role-Based Access Control) = permissions based on role/group.
      "Alice is in Finance group → gets Finance SharePoint access."
      ABAC (Attribute-Based Access Control) = permissions based on user/
      resource attributes. "Alice with department=Finance AND clearance=High
      AND resource.classification=Confidential → access granted."
      ABAC is more granular but complex. Entra ID Conditional Access is
      essentially ABAC.
```

---

## 🏢 SECTION 2 — Active Directory On-Premise

```
🟢 Q8: What is Active Directory?
   A: Active Directory is Microsoft's on-premise identity and access
      management platform. It stores user accounts, computer accounts,
      groups, and policies. It enables centralized authentication
      (Kerberos/NTLM) and authorization across an organization.
      Think of it as the central "phonebook + security guard" for
      a Windows network.

🟢 Q9: What is the difference between a Domain, Tree, and Forest?
   A: Domain = basic AD unit. corp.local is one domain.
      Tree = domains sharing a namespace. corp.local + us.corp.local
             + eu.corp.local = one tree.
      Forest = top-level container. Multiple trees can exist in a forest.
               Forest trust = users in one forest can access another.
      Analogy: Domain = city, Tree = state, Forest = country.

🟢 Q10: What is an OU (Organizational Unit)?
   A: OUs are containers within a domain that organize objects (users,
      computers, groups). Like folders in a filing cabinet.
      Main purposes: 1) Delegate administration (IT team manages Employees OU)
      2) Apply Group Policy to specific objects.
      OUs do NOT control permissions — Security Groups do that.

🟡 Q11: What is a Group Policy Object (GPO)?
   A: A GPO is a set of settings applied to users and computers in AD.
      Example: Enforce password complexity, map network drives, push software,
      disable USB ports, configure security settings.
      GPOs are applied in LSDOU order: Local → Site → Domain → OU.
      Last applied wins (unless "Enforced").

🟡 Q12: What are the different AD group types and scopes?
   A: Types: Security groups (permission assignment), Distribution groups (email).
      Scopes:
        Domain Local = access resources in the local domain. Can contain
                       members from anywhere.
        Global = users from the same domain. Used to organize users.
        Universal = members from any domain in the forest. Used for
                    cross-domain access.
      Best practice: AGDLP — Accounts → Global groups → Domain Local
                     groups → Permissions.

🔴 Q13: What is AdminSDHolder and how can attackers abuse it?
   A: AdminSDHolder is an AD object whose ACL is periodically copied to
      all protected accounts (Domain Admins, etc.) by SDProp (runs every
      60 min). It "protects" admin accounts from ACL tampering.
      Attack: If attacker adds themselves to AdminSDHolder's ACL →
      within 60 min, they gain that permission on ALL protected accounts →
      persistence! Detection: Monitor Event 5136 on AdminSDHolder object.

🔴 Q14: Explain AD replication and what tombstone lifetime means.
   A: Replication syncs AD changes between Domain Controllers.
      Uses: USN (Update Sequence Numbers) to track changes.
      Topology: KCC (Knowledge Consistency Checker) auto-builds
      replication topology.
      Tombstone lifetime (default 180 days): How long deleted objects
      are kept. If a DC goes offline longer than tombstone lifetime →
      it can't replicate back → must be rebuilt.
      USNRollback: If DC restored from old backup → can cause replication
      issues → duplicate/missing objects.

⭐ Q15: How would you design AD for a 50,000-user enterprise with 3 countries?
   A: Single forest, multiple domains (one per country) or single domain
      with sites for each country.
      Key decisions: Separate domains if different IT teams/compliance;
      single domain if centralized management preferred.
      Sites and Services: Define AD sites for each office, configure
      site links with costs and replication schedules.
      DCs: At least 2 DCs per site for HA. RODC for remote/low-trust
      sites (branch offices).
      DNS: AD-integrated DNS on every DC. Conditional forwarders between
      domains.
```

---

## 🔑 SECTION 3 — AD Authentication Protocols

```
🟢 Q16: How does Kerberos authentication work? (Simple version)
   A: 1. User logs in → sends username to DC (not password)
      2. DC sends back a TGT (golden ticket to the castle) encrypted
         with the user's password hash — only the user can open it
      3. User opens TGT (proves they know their password)
      4. User presents TGT to get a Service Ticket for specific services
      5. Service validates the ticket → access granted
      All this happens invisibly in milliseconds at Windows login!

🟢 Q17: What is NTLM and when is it used?
   A: NTLM (NT LAN Manager) = challenge-response authentication protocol.
      Legacy protocol, used when Kerberos is not possible:
      → Authenticating via IP address instead of hostname
      → Non-domain joined machines
      → Some older applications
      Security issues: Susceptible to Pass-the-Hash, NTLM relay attacks.
      Best practice: Disable NTLMv1, restrict NTLMv2 where possible.

🟡 Q18: What is the Kerberos TGT and TGS?
   A: TGT (Ticket Granting Ticket) = your "passport" from the DC.
      Encrypted with krbtgt account hash. Proves you're authenticated.
      Valid for 10 hours by default.
      TGS (Ticket Granting Service) = ticket for a SPECIFIC service.
      You get a TGS by presenting your TGT to the KDC and saying
      "I want to access MSSQLSvc/server01." The TGS is encrypted with
      the service account's hash.

🟡 Q19: What is an NTLM relay attack?
   A: Attacker intercepts an NTLM authentication and relays it to
      another server to authenticate AS the victim.
      Tool: Responder + ntlmrelayx.
      Example: Alice's PC tries to reach \\attacker-share\ → NTLM auth →
      attacker relays it to \\FILESERVER → attacker authenticated as Alice!
      Defense: SMB signing, LDAP signing, disable NTLM where possible,
      use Kerberos authentication enforcement.

🔴 Q20: What is AS-REP Roasting and how does it differ from Kerberoasting?
   A: Kerberoasting: ANY domain user can request a TGS for service accounts
      with SPNs. The TGS is encrypted with the service account's hash.
      Crack the TGS offline → get the service account password.
      Requires: Being a domain user, SPN must exist.

      AS-REP Roasting: Targets accounts with "Do not require Kerberos
      pre-authentication" flag. Attacker requests a TGT for these accounts
      WITHOUT needing their password. The AS-REP contains data encrypted
      with the user's hash → crack offline.
      Requires: Just network access, no credentials needed!
      Detection: Event 4768 with Pre-Authentication Type = 0.
```

---

## 🔒 SECTION 4 — AD Security & Hardening

```
🟢 Q21: What is the Tiered Admin Model?
   A: Separates admin accounts into tiers to prevent credential theft
      from spreading:
      Tier 0: Domain Controllers, AD, PKI, ADFS → only used for DC admin
      Tier 1: Servers, applications → only used for server admin
      Tier 2: Workstations → only used for desktop support
      Rule: Admins NEVER log into lower-tier resources with higher-tier creds.
      Even if an attacker compromises Tier 2 → they can't get Tier 0 creds.

🟡 Q22: What is LAPS and what problem does it solve?
   A: LAPS (Local Administrator Password Solution) automatically sets
      unique, random passwords for the local Administrator account on
      every PC, stores them in AD, and rotates them.
      Problem solved: Previously, all PCs had the SAME local admin password.
      Attacker compromises one PC → knows local admin password everywhere!
      With LAPS: Each PC has different password → lateral movement stopped.

🟡 Q23: What is Credential Guard and how does it protect against Pass-the-Hash?
   A: Credential Guard uses virtualization (Hyper-V) to isolate LSASS
      (credential store) in a protected virtual environment.
      Even if attacker has SYSTEM privileges → they can't dump NTLM hashes
      from LSASS because it runs in a separate, protected VM.
      Prevents: Pass-the-Hash, Pass-the-Ticket from credential dumping.
      Requires: UEFI, Secure Boot, Windows 10+ Enterprise.

🔴 Q24: What is ACL-based persistence in Active Directory?
   A: Attackers add hidden permissions (ACEs) to AD objects that let them
      maintain access even after password resets.
      Common ACL backdoors:
      → GenericAll on domain object = can do DCSync anytime
      → WriteDACL on Domain Admins = can add yourself to DA
      → ForceChangePassword on CEO account = can reset CEO's password
      Detection: BloodHound for visual ACL analysis, Event 5136,
      Monitor AdminSDHolder changes.
```

---

## ⚔️ SECTION 5 — AD Attack Techniques

```
🟡 Q25: What is a Golden Ticket attack?
   A: Golden Ticket = forged Kerberos TGT using the krbtgt account hash.
      If attacker gets krbtgt hash (via DCSync or DC compromise) →
      they can forge a TGT for ANY user, with ANY group membership,
      valid for up to 10 years → unlimited access to everything.
      Defense: Reset krbtgt password TWICE (10 hours apart) when
      domain compromise suspected.

🟡 Q26: What is a Silver Ticket attack?
   A: Silver Ticket = forged Kerberos TGS for a SPECIFIC service.
      Uses the service account's hash (not krbtgt).
      Bypasses the DC entirely — ticket is validated by the service, not KDC.
      Harder to detect (no DC logs).
      Defense: Enable PAC validation on services, Credential Guard.

🟡 Q27: What is DCSync and how does it work?
   A: DCSync abuses the "Replicate Directory Changes" permission in AD.
      Normally only DCs use this to sync AD data between themselves.
      Attacker with this permission → mimics a DC → asks other DCs
      "sync all password hashes with me" → gets EVERY hash in the domain.
      Tool: mimikatz lsadump::dcsync /user:krbtgt
      Detection: Event 4662 + replication properties + non-DC source.
      Defense: Monitor who has replication rights. Should ONLY be DCs.

🔴 Q28: What is BloodHound and why is it important for defenders?
   A: BloodHound is a graph-based tool that maps all AD relationships
      (users, groups, computers, permissions) and finds attack paths.
      For attackers: finds shortest path to Domain Admin.
      For defenders: shows what needs fixing. Every attack path BloodHound
      shows = a real vulnerability that can be remediated.
      Regular BloodHound runs = proactive AD hardening.

🔴 Q29: What is DCShadow and how is it different from DCSync?
   A: Both abuse DC replication, but differently.
      DCSync: READS all data from DCs (passive, steals hashes).
      DCShadow: WRITES malicious changes to AD by temporarily registering
      a rogue DC. Can modify any AD object, add malicious GPOs, or
      change user attributes — and the changes look like legitimate
      DC replication.
      Detection: Unauthorized DC registration events, repadmin /showrepl.
```

---

## ☁️ SECTION 6 & 7 — Entra ID & Cloud Security

```
🟢 Q30: What is the difference between Active Directory and Entra ID?
   A: Active Directory (AD DS): On-premise only, Kerberos/NTLM auth,
      LDAP queries, Group Policy, domain join.
      Entra ID: Cloud service, OAuth 2.0/OIDC/SAML, REST APIs,
      Conditional Access, device registration. 
      You can't "domain join" to Entra ID the same way. Entra ID is
      designed for cloud apps, not legacy on-prem resources.

🟢 Q31: What are Azure Managed Identities?
   A: A Managed Identity is an Azure resource (like a VM or Function)
      with its own identity in Entra ID — automatically managed.
      No password, no secret — Azure handles it.
      Used for: App → Azure Key Vault, App → Storage Account, etc.
      No developer needs to store credentials in code!
      Types: System-assigned (tied to resource lifecycle),
             User-assigned (shared across multiple resources).

🟡 Q32: What is PIM (Privileged Identity Management)?
   A: PIM provides just-in-time privileged access to Entra ID roles.
      Instead of being permanently Global Admin, users are ELIGIBLE.
      When they need admin: request activation → approve → get 1 hour access.
      Features: MFA at activation, approval workflows, access reviews,
      audit trail of all admin actions.
      Prevents: Standing privilege → smaller attack window.

🟡 Q33: What is Conditional Access in Entra ID?
   A: Conditional Access evaluates conditions at login time and decides
      whether to grant, block, or add requirements.
      If (user=alice AND app=Teams AND location=US AND device=compliant)
      → Grant access.
      If (user=anyone AND risk=High) → Block.
      If (user=admin AND any location) → Require MFA.
      It's like a security checkpoint with smart rules instead of just
      a username/password check.

🔴 Q34: What are the risks of Entra ID Global Administrator role?
   A: Global Admin has full control over the entire Entra ID tenant:
      Can reset any user's password, disable MFA, add themselves to
      any application, read all data.
      Risks: If compromised → attacker owns entire M365/Azure tenant.
      Mitigations: Max 4-8 permanent GAs, PIM for all GAs, require
      phishing-resistant MFA, break-glass accounts, monitor all GA actions,
      never use GA for daily work.
```

---

## 🔗 SECTION 8 — Hybrid Identity

```
🟢 Q35: What is Entra Connect and what does it do?
   A: Entra Connect (formerly Azure AD Connect) syncs users, groups,
      and password information from on-premise AD to Entra ID.
      It runs on a dedicated Windows Server, queries AD every 30 minutes,
      and writes changes to Entra ID via HTTPS.
      Without it: AD users can't log into M365 or Azure apps.

🟡 Q36: What is the difference between PHS, PTA, and ADFS?
   A: PHS (Password Hash Sync): Password hash copied to cloud.
         Auth happens in cloud. Works if AD is down. Recommended.
      PTA (Pass-Through Auth): Password forwarded to on-prem AD agent.
         Auth happens on-prem. AD must be available. Good for compliance.
      ADFS: On-prem token issuer. Highest complexity, highest attack surface.
         Used for B2B federation, complex claims requirements.
         Microsoft recommends migrating away from ADFS.

🟡 Q37: What is a Hybrid AAD Join and why is it useful?
   A: Hybrid AAD Join = computer registered in BOTH on-prem AD and Entra ID.
      Benefits: Users get seamless SSO to cloud apps (via PRT),
      Conditional Access can require device compliance checks,
      IT can manage via both Group Policy and Intune.
      How it works: Entra Connect syncs computer objects → device
      registration happens via scheduled task on the Windows PC.

🔴 Q38: What is the Primary Refresh Token (PRT) and how can it be stolen?
   A: PRT is a long-lived token issued when a user logs into a Hybrid AAD
      Joined device. It enables silent SSO to all Entra ID / M365 apps.
      Stored in LSASS memory on the device.
      Theft (Pass-the-PRT): Attacker with admin on device dumps PRT using
      AADInternals or roadtx → uses it from their own machine → bypasses
      MFA because device is "trusted."
      Defense: Credential Guard, Token Protection (CA), monitor sign-ins
      from unexpected devices.

⭐ Q39: What would you do if Entra Connect was compromised?
   A: Immediate: Isolate the Entra Connect server from network.
      Revoke all sessions: Revoke all tokens for the sync service account.
      Assess: What did attacker access? Can they have changed cloud passwords?
      Check: Entra audit logs for unexpected password resets from sync account.
      Remediate: Rebuild Entra Connect on clean server, rotate ALL
      service account passwords, investigate scope of access.
      Hard truth: Entra Connect compromise = potential full tenant takeover.
      Treat as a Tier 0 breach.
```

---

## 🔭 SECTION 9 — Monitoring & IR

```
🟢 Q40: What Event IDs should you always monitor in AD?
   A: Critical Event IDs:
      4624/4625 = Login success/failure (detect brute force)
      4720/4726 = Account created/deleted (rogue accounts)
      4728/4732 = Group membership changes (privilege escalation)
      4719      = Audit policy changed (attacker hiding tracks)
      4672      = Special privilege logon (admin activity)
      5136      = AD object modified (DCSync setup, ACL backdoors)
      4769 + RC4= Kerberoasting attempt
      4698      = Scheduled task created (persistence)
      4104      = PowerShell Script Block (attack tools)

🟡 Q41: What is Microsoft Defender for Identity (MDI)?
   A: MDI is a cloud service with lightweight sensors deployed on all
      Domain Controllers. It reads network traffic and Event Logs in
      real-time, using AI to detect attack patterns:
      Reconnaissance (BloodHound, enum), Credential theft (Kerberoasting,
      NTLM relay), Lateral movement (PtH, PtT), Domain dominance
      (DCSync, Golden Ticket, Skeleton Key).
      Key feature: Behavioral baselines — alerts when behavior deviates
      from normal patterns (UEBA).

🟡 Q42: What is Microsoft Sentinel?
   A: Microsoft Sentinel is a cloud-native SIEM (Security Information
      and Event Management) and SOAR platform.
      SIEM: Collects logs from 1000+ sources, runs analytics rules to
      detect threats, creates incidents for investigation.
      SOAR: Automates response via Logic App playbooks.
      Query language: KQL (Kusto Query Language).
      Integration: Works with MDI, MDE, MDO, Entra ID for correlated
      incident creation across the full kill chain.

🔴 Q43: Walk me through the IR process for a suspected Domain Admin compromise.
   A: 1. TRIAGE: Confirm alert (MDI Golden Ticket / DCSync alert).
         Is it a false positive? Check MDI timeline.
      2. CONTAIN: Disable compromised account(s) in AD.
         Revoke Entra ID sessions. Block attacker IP.
         Isolate suspected machines via MDE.
      3. PRESERVE: Export Event Logs from all DCs BEFORE cleanup.
         Take memory snapshots. Document all IOCs.
      4. ERADICATE: Reset ALL Tier 0 passwords.
         Reset krbtgt TWICE (10 hours apart).
         Review all recent AD changes (5136, 4728, 4720).
         Remove backdoor accounts, ACLs, scheduled tasks.
      5. RECOVER: Re-enable accounts post-verification.
         Increase monitoring sensitivity.
      6. LESSONS: Root cause analysis. Update detections. Improve defenses.
```

---

## 🎯 Scenario-Based Questions (Senior Level)

```
🔴 Q44: "Our security team found an account doing thousands of LDAP queries
         at 3 AM. What do you investigate?"
   A: This is a classic BloodHound/SharpHound pattern.
      Steps: 1. Identify the account in AD (is it human or service?)
             2. Check where it's running from (source IP → what machine?)
             3. Pull MDI timeline for that account
             4. Check what it queried: usernames? computer accounts? ACLs?
             5. Who logged into that machine at that time (Event 4624)
             6. Is the account legitimate? Contact the owner.
             7. If suspicious: disable account, isolate machine, start IR.
             8. Create Sentinel alert for this query pattern going forward.

🔴 Q45: "A developer says they need local admin on their workstation.
         How do you handle this request?"
   A: Don't just say yes or no — analyze the need:
      Ask: What specifically do they need admin for? Install software?
      Run services? Access system logs?
      Options:
      1. If they need to install approved software → use Software Center/SCCM
      2. If they need local admin for development → provide a dedicated
         dev VM with local admin instead of their primary machine
      3. If truly needed: Use LAPS — give them the LAPS password for
         their own PC only (not all PCs)
      4. Document the exception, review quarterly
      Never: Add developer to Domain Admins just for convenience.

⭐ Q46: "Design an identity security architecture for a company migrating
        from on-prem AD to full cloud (Entra ID only)."
   A: Phase 1 - Foundation (Month 1-2):
         Deploy Entra Connect, PHS + Seamless SSO
         Enable MFA for all users (phased rollout)
         Implement Conditional Access baseline policies
         Block legacy authentication
      Phase 2 - Hardening (Month 3-4):
         PIM for all admin roles
         Entra ID Protection (risk policies)
         Hybrid AAD Join all workstations
         Intune for device compliance
      Phase 3 - Monitoring (Month 5-6):
         MDI on all DCs (during transition)
         Sentinel with full log ingestion
         Access reviews for all admin roles
         Break-glass accounts + runbooks
      Phase 4 - Cloud-Only (Month 7+):
         Migrate apps from ADFS to Entra ID SAML/OIDC
         Transition to Entra ID-only join for new devices
         Retire ADFS farm
         Decommission Entra Connect (Entra-native users only)
      Key principles throughout: Zero Trust, least privilege,
      continuous verification, full audit trail.

🔴 Q47: "Explain what happened in the SolarWinds attack from an AD perspective."
   A: SolarWinds 2020 was a sophisticated supply chain attack.
      AD/Identity component:
      1. Attackers compromised SolarWinds Orion software build process
      2. Added backdoor (SUNBURST) into legitimate updates
      3. 18,000 organizations installed the compromised update
      4. SUNBURST established C2 (Command & Control) communication
      5. Attackers used Golden SAML technique: stole ADFS token-signing
         certificate from on-premise environment
      6. Used stolen cert to forge SAML tokens for ANY cloud user
      7. Authenticated to Microsoft 365 as any user — including admins
      8. Read emails, accessed Azure, all without triggering normal alerts
      Lesson: ADFS token-signing cert = master key to cloud tenant.
              Protect it like the crown jewels or migrate away from ADFS.
```

---

## ⚡ Quick-Fire Questions (Common in Interviews)

```
Q: What port does Kerberos use?           A: 88 (TCP/UDP)
Q: What port does LDAP use?               A: 389 (LDAP), 636 (LDAPS)
Q: What port does SMB use?                A: 445 (TCP)
Q: What port does RDP use?                A: 3389 (TCP)
Q: What port does DNS use?                A: 53 (TCP/UDP)
Q: What port does HTTPS use?              A: 443 (TCP)
Q: What is the default Kerberos ticket    A: 10 hours (TGT),
   lifetime?                                 600 minutes
Q: What is the krbtgt account?            A: Special account whose hash
                                             is used to encrypt all TGTs
Q: What does PDC Emulator FSMO do?        A: Time sync, password changes,
                                             GPO edits, account lockouts
Q: What is tombstone lifetime in AD?      A: 180 days (default)
Q: What Event ID is a successful login?   A: 4624
Q: What Event ID is a failed login?       A: 4625
Q: What Event ID is account locked out?   A: 4740
Q: What Event ID is DCSync?               A: 4662 (with replication props)
Q: What does LAPS stand for?              A: Local Administrator Password
                                             Solution
Q: What does PRT stand for?               A: Primary Refresh Token
Q: What does MFA stand for?               A: Multi-Factor Authentication
Q: What does PIM stand for?               A: Privileged Identity Management
Q: What does UEBA stand for?              A: User and Entity Behavior Analytics
Q: What is the default sync interval      A: 30 minutes (delta sync)
   for Entra Connect?
Q: Name 3 Kerberos attack types           A: Kerberoasting, AS-REP Roasting,
                                             Golden Ticket, Silver Ticket,
                                             Pass-the-Ticket
Q: Name 3 AD persistence techniques       A: Golden Ticket, Silver Ticket,
                                             ACL backdoor, AdminSDHolder,
                                             DCShadow, Skeleton Key
Q: What does AGDLP stand for?             A: Accounts → Global → Domain
                                             Local → Permissions
Q: What is Seamless SSO?                  A: Kerberos-based auto sign-in
                                             for domain-joined PCs to
                                             cloud apps
Q: What is AZUREADSSO$?                   A: Computer account used as
                                             bridge for Seamless SSO
                                             between AD Kerberos and
                                             Entra ID
```

---

## 🏆 Behavioral / Culture Questions

```
Q48: "Tell me about a time you handled a security incident."
  Focus on: STAR format (Situation, Task, Action, Result)
  Key points: What you did, how you communicated, what you learned
  Avoid: Blaming others, vague answers, made-up stories

Q49: "How do you stay current with AD/identity security threats?"
  Good answers: Threat intel feeds (MSRC, CISA), BloodHound labs,
  Security conferences (DEF CON, BlueHat), Microsoft blogs,
  AD Security blog (adsecurity.org), practicing in home lab

Q50: "What's the most significant AD security finding you've ever made?"
  Show: Technical depth + business impact communication
  Example: "Found Domain Users = local admin on 300 workstations
  via BloodHound. Remediated with GPO in 2 days. Prevented potential
  ransomware lateral movement across entire organization."
```

---

## ✅ Interview Preparation Checklist

```
BEFORE YOUR INTERVIEW:
──────────────────────────────────────────────────────────────────
  □ Can you draw the Kerberos authentication flow from memory?
  □ Can you explain DCSync in plain English (non-technical)?
  □ Can you name 5 critical Event IDs and what they mean?
  □ Do you have a home lab to reference in answers?
  □ Have you done a real BloodHound run and found attack paths?
  □ Can you explain PIM vs traditional admin assignment?
  □ Can you walk through a CA policy decision flow?
  □ Do you know the NIST IR lifecycle phases?
  □ Can you explain hybrid identity auth methods (PHS/PTA/ADFS)?
  □ Do you have a real IR story (or lab scenario) to tell?
```

---

**← Previous:** [05 - PIM & Conditional Access Lab](./05-PIM-Conditional-Access-Lab.md)
**Next →** [Section README](./Section-10-README.md)
