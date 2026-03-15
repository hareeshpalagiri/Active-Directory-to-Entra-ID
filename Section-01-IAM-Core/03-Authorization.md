# 03 — Authorization

> **Section:** 01 — IAM Core Concepts  
> **Difficulty:** Beginner → Intermediate  
> **Depends on:** [02-Authentication.md](./02-Authentication.md)

---

## 📌 What is Authorization?

Authentication answers: *"Who are you?"*  
Authorization answers: *"Now that I know who you are — what are you allowed to do?"*

> **Simple definition:**  
> Authorization is the process of deciding what resources an authenticated identity can access and what actions they can perform on those resources.

### Real-World Analogy

You arrive at a company office:

- You show your ID at reception → **Authentication** (proving who you are)
- Your ID shows you are an IT employee → **Authorization** begins
- Your access card opens the IT server room ✅
- Your access card does NOT open the Finance vault ❌
- Your access card does NOT open the CEO's office ❌

The card knows exactly which doors you are allowed to open. That set of permissions = **authorization**.

---

## 🔑 Authentication vs Authorization — Side by Side

| | Authentication | Authorization |
|---|---|---|
| **Question** | Who are you? | What can you do? |
| **Happens** | First | Second — after auth |
| **Example** | Hareesh logs in with password + MFA | Hareesh can read servers but not HR files |
| **Failure** | Login denied | "Access Denied" on the resource |
| **Controls** | Passwords, MFA, certificates | Permissions, roles, policies |

---

## 🏛️ Access Control Models

There are four main models for controlling access. Each one answers "who decides who gets access?" differently.

---

### Model 1 — RBAC (Role-Based Access Control)

The most widely used model in enterprise environments.

**Core idea:** Permissions are assigned to **roles**. People are assigned to **roles**. People get permissions through their role — never directly.

```
Without RBAC (messy, unmanageable):
  Hareesh → Read FileShare, Write FileShare, Read AD, Manage DNS, Read VPN logs...
  GP      → Read FileShare, Write FileShare, Read AD, Modify AD, Manage DNS...
  Priya   → Read FileShare, Read HR System, Write HR System...
  (Repeat for 500 employees → impossible to manage or audit)

With RBAC (clean, scalable):
  Role: "IT-Operations"
    └── Read FileShare
    └── Write FileShare
    └── Read Active Directory
    └── Manage DNS

  Role: "IT-Manager"
    └── Everything in IT-Operations
    └── Modify Active Directory
    └── Read Audit Logs
    └── Approve access requests

  Role: "HR-Staff"
    └── Read HR System
    └── Write HR System
    └── Read FileShare

  Hareesh → assigned to IT-Operations → gets those permissions
  GP      → assigned to IT-Manager    → gets those permissions
  Priya   → assigned to HR-Staff      → gets those permissions
```

**Changing access is simple:**
```
Hareesh is promoted to IT Manager:
  Before: Remove from IT-Operations role
  After:  Add to IT-Manager role
  → All permissions update automatically ✅
  → No individual permission changes needed
  → Full audit trail of role change ✅
```

**RBAC in Active Directory:**
```
AD Security Groups = Roles in RBAC

Group: SG-IT-Operations
  Members: Hareesh, Ravi, Sunita
  NTFS Permissions on \\FileServer\IT → Read, Write

Group: SG-Domain-Admins (separate from built-in Domain Admins)
  Members: GP
  Access to: Domain Controllers, AD management tools

When Hareesh moves to a new team:
  → Remove from SG-IT-Operations
  → Add to SG-NewTeam
  → Access changes immediately ✅
```

**RBAC in Azure (Azure RBAC):**

| Built-in Role | What it can do |
|--------------|---------------|
| **Owner** | Full control + manage access |
| **Contributor** | Create/manage resources, cannot manage access |
| **Reader** | View only — cannot change anything |
| **User Access Administrator** | Manage access only |

```
Example:
  GP        → Owner role on Production subscription
  Hareesh   → Contributor role on Dev resource group only
  Audit team → Reader role on all subscriptions

  Hareesh can deploy resources in Dev ✅
  Hareesh cannot touch Production ❌
  Hareesh cannot assign roles to others ❌
```

---

### Model 2 — ABAC (Attribute-Based Access Control)

More flexible and granular than RBAC. Access decisions are based on **attributes** — properties of the user, the resource, and the environment.

**Core idea:** Instead of "what role do you have?" it asks "what are your attributes and do they match the policy?"

```
ABAC Policy Example:
  ALLOW access IF:
    user.department    = "Finance"           ← user attribute
    AND resource.type  = "Financial-Report"  ← resource attribute
    AND time           = "09:00 to 18:00"    ← environment attribute
    AND device.managed = "true"              ← device attribute

Results:
  Hareesh (IT dept) at 10am on managed device:
    → user.department = "IT" → does not match "Finance" → DENY ❌

  GP (Finance approved) at 2pm on managed device:
    → All conditions match → ALLOW ✅

  GP at 2am from personal device:
    → time fails (outside 09:00-18:00)
    → device.managed = false
    → DENY ❌
```

**Where ABAC is used:**
- Azure Conditional Access policies
- AWS IAM condition keys
- SharePoint sensitivity-based access
- Healthcare systems (access based on patient relationship)

**RBAC vs ABAC:**

| | RBAC | ABAC |
|---|---|---|
| **Based on** | Job roles | Attributes + conditions |
| **Granularity** | Coarse | Very fine-grained |
| **Complexity** | Simple to manage | Complex to write policies |
| **Best for** | Standard IT, AD | Cloud, compliance-heavy environments |
| **Example** | AD security groups | Azure Conditional Access |

---

### Model 3 — DAC (Discretionary Access Control)

**Core idea:** The **owner** of a resource decides who can access it and can share it at their own discretion.

```
GP creates a folder on the file server:
  GP right-clicks → Properties → Security
  Sets NTFS permissions:
    GP (owner) → Full Control
    Hareesh    → Read only
    Finance team → No access

  GP decides he wants to give Hareesh Write access:
  → GP changes it → no IT admin involvement needed
  → It is GP's file → GP's discretion
```

**Where DAC is used:**
- Windows NTFS file permissions
- Linux file permissions (owner/group/others)
- OneDrive and SharePoint file sharing
- Google Drive

**Security risk of DAC:**
```
Problem: Users make poor sharing decisions
Example:
  Hareesh accidentally shares a confidential folder with "Everyone"
  → Entire company can now read confidential data
  → No central control prevented this

  OR

  Hareesh's account is compromised
  Attacker uses Hareesh's owner rights to grant themselves access
  → Self-propagating access escalation ❌
```

---

### Model 4 — MAC (Mandatory Access Control)

**Core idea:** The **system** enforces access based on security labels. Neither the owner nor the user can override it.

```
Security Labels (clearance levels):
  Top Secret > Secret > Confidential > Unclassified

Rules:
  Rule 1 — No Read Up:
    GP has "Secret" clearance
    → Cannot read "Top Secret" documents
    → Even if he is the file owner

  Rule 2 — No Write Down:
    GP has "Top Secret" clearance
    → Cannot save content into "Confidential" files
    → Prevents leaking classified info to lower levels
```

**Where MAC is used:**
- Military and government systems
- SELinux on Linux servers
- AppArmor on Ubuntu
- Trusted operating systems

```
Practical example — SELinux:
  Web server process (Apache) tries to read /etc/shadow (passwords)
  SELinux policy: Apache is NOT allowed to read /etc/shadow
  → Access denied at OS level ← even if Apache is compromised
  → Attacker controlling Apache cannot read password file ✅
```

---

### Quick Comparison — All Four Models

| Model | Who decides? | Based on | Flexibility | Enterprise use |
|-------|-------------|----------|-------------|---------------|
| **RBAC** | Admins | Job role | Medium | ✅ Most common |
| **ABAC** | Policy engine | Attributes + conditions | High | ✅ Cloud environments |
| **DAC** | Resource owner | Owner's choice | Very high | ✅ File shares, personal files |
| **MAC** | System policy | Security labels | Rigid | Government, military |

---

## ⚙️ How Authorization Works in Practice

### NTFS Permissions (DAC + RBAC combined)

```
File server permissions for \\FileServer01\Finance\

Share Permissions (top level):
  Authenticated Users → Read (share-level gate)

NTFS Permissions (actual control):
  SG-Finance-Read  → Read and Execute
  SG-Finance-Write → Modify
  GP               → Full Control
  SYSTEM           → Full Control

Effective access = More restrictive of Share AND NTFS permissions

Hareesh (member of SG-IT-Operations, not Finance groups):
  Share: Authenticated Users → Read ✅
  NTFS:  No entry for Hareesh or his groups → DENY ❌
  Result: Access denied ✅ (least restrictive rule does NOT apply here)
```

### Azure RBAC — How It Works

```
GP assigns Hareesh the "Contributor" role:
  Scope: Resource Group "RG-Development"

What this means:
  Hareesh can create/modify/delete resources in RG-Development ✅
  Hareesh cannot manage access (no Owner role) ❌
  Hareesh cannot touch RG-Production (different scope) ❌
  Hareesh cannot change subscription settings ❌

Role assignment stored in Azure Resource Manager
Every API call Hareesh makes → ARM checks his role → allows or denies
```

---

## 🏢 Real-World Scenarios

### Scenario 1 — New Project Access Request

```
A new project starts. Hareesh needs temporary access to a
production database for testing.

Bad approach (without RBAC/governance):
  IT gives Hareesh direct DB Admin rights
  Project ends, nobody removes the access
  6 months later — Hareesh still has DB Admin to production ← RISK

Good approach (RBAC + JIT):
  IT creates: Role "Project-X-DB-Read" → Read on ProjectX database only
  Hareesh assigned to role for 30 days
  Access review at end of 30 days:
    GP confirms: "Project ended — access no longer needed"
  Role assignment removed ✅
  Hareesh loses access automatically
```

### Scenario 2 — Detecting Privilege Escalation via IDOR

```
Company web portal: employees view their own payslips at
  https://portal.company.com/payslip?id=1045

Hareesh's employee ID is 1045.
Hareesh notices the URL and tries:
  https://portal.company.com/payslip?id=1046  ← GP's payslip

If the application only checks "is user logged in?" (authentication)
but NOT "does this user own payslip 1046?" (authorization):
  → Hareesh can view GP's salary ← IDOR vulnerability

Correct implementation:
  Server checks: Does the authenticated user (Hareesh, ID 1045)
                 own or have permission for resource ID 1046?
  → No → Access denied ✅

This is called IDOR (Insecure Direct Object Reference)
It is the #1 authorization vulnerability (OWASP Top 10 #1)
```

### Scenario 3 — Role Explosion Problem

```
Over 3 years, GP has created roles for every situation:
  IT-Ops-Level1, IT-Ops-Level2, IT-Ops-Level2-Plus,
  IT-Ops-Level2-Plus-Special, Project-A-IT, Project-B-IT...
  (247 roles for 150 employees)

Problems:
  Nobody knows what each role contains
  Some roles are duplicates
  Some roles have never been reviewed
  Audit fails — cannot explain what access each person has

Solution: RBAC governance
  Regular role review (quarterly)
  Role naming convention: TEAM-FUNCTION-LEVEL
  Maximum roles per person: reviewed and justified
  Automated access review via Azure AD Access Reviews
```

---

## ⚠️ Authorization Attacks

### 1. Privilege Escalation — Vertical
```
What: Low-privileged user gains higher privileges than intended
Example:
  Hareesh is a standard user
  Finds a misconfigured service running as SYSTEM
  Exploits it → gains SYSTEM (highest local privilege)
  → Now has admin rights on that machine

Defense: Principle of least privilege, regular privilege audits
```

### 2. Privilege Escalation — Horizontal
```
What: User accesses resources belonging to another user at same level
Example: IDOR — changing ?id=1045 to ?id=1046 to see GP's data
Defense: Server-side authorization checks on every request
```

### 3. ACL Abuse in Active Directory
```
What: Attacker exploits misconfigured AD permissions (ACLs)
Example:
  BloodHound reveals:
  Hareesh's account → has GenericWrite on IT-Admins group
  IT-Admins → has WriteDACL on Domain Admins
  
  Attack chain:
  Hareesh adds himself to IT-Admins (GenericWrite)
  Then modifies Domain Admins ACL (WriteDACL)
  Then adds himself to Domain Admins
  → Domain Admin without any exploit — just permission abuse

Defense: Regular ACL audits, BloodHound for defenders
```

### 4. Permission Creep
```
What: Users accumulate excess permissions over time
Example:
  GP joined as junior IT 5 years ago → got basic access
  Moved to senior IT → got more access (old access not removed)
  Became IT Manager → got more access (old access not removed)
  Today: GP has permissions from all 3 roles simultaneously
  → Far more access than his current role requires

Defense: Quarterly access reviews, automated de-provisioning
```

---

## 🛡️ Authorization Hardening Checklist

- [ ] Use security groups for ALL access — never assign permissions directly to users
- [ ] Apply principle of least privilege — minimum access for every role
- [ ] Conduct quarterly access reviews — remove unused permissions
- [ ] Run BloodHound to find dangerous AD permission paths
- [ ] Audit Domain Admins, Enterprise Admins membership monthly
- [ ] Enable Azure AD Access Reviews for all privileged roles
- [ ] Implement server-side authorization checks in all applications
- [ ] Never trust client-supplied object IDs without server-side ownership check
- [ ] Implement separation of duties — no single person controls an entire process
- [ ] Log all authorization decisions — especially denials

### Key PowerShell Commands

```powershell
# Check who is in Domain Admins
Get-ADGroupMember -Identity "Domain Admins" -Recursive |
    Select-Object Name, SamAccountName, ObjectClass

# Find users with direct permission assignments (bypassing groups)
# Check NTFS permissions on a folder
(Get-Acl "\\FileServer01\Finance").Access |
    Where-Object {$_.IdentityReference -notlike "*SG-*"} |
    Select-Object IdentityReference, FileSystemRights

# Find accounts with no group-based access (direct assignments)
Get-ADUser -Filter * -Properties MemberOf |
    Where-Object {$_.MemberOf.Count -eq 0}

# Azure RBAC — check role assignments for a user
Get-AzRoleAssignment -SignInName "hareesh@company.com" |
    Select-Object RoleDefinitionName, Scope
```

---

## 🔧 Troubleshooting

### User gets Access Denied on file share
```powershell
# Step 1: Check group memberships
Get-ADPrincipalGroupMembership -Identity "hareesh" | Select-Object Name

# Step 2: Check share permissions
Get-SmbShareAccess -Name "Finance"

# Step 3: Check NTFS permissions
(Get-Acl "\\FileServer01\Finance").Access |
    Select-Object IdentityReference, FileSystemRights, AccessControlType

# Step 4: Check effective access
# Windows → File Properties → Security → Advanced → Effective Access
# Enter username → Check access results

# Note: If share = Read and NTFS = Full Control → effective = Read
# The more restrictive permission always wins
```

### Azure RBAC not taking effect
```
- Wait up to 10 minutes for propagation
- Check if deny assignments exist (they override allow)
- Verify the scope — role on Resource Group doesn't apply to Subscription level
- Check if the user has re-authenticated (old tokens may not reflect new roles)
```

---

## 🎯 Interview Questions

**Q1. What is the difference between authentication and authorization?**  
**A:** Authentication verifies identity — it answers "who are you?" using passwords, MFA, certificates. Authorization determines what that verified identity is allowed to do — it answers "what can you access?" using roles, permissions, and policies. They are sequential: you must authenticate before you can be authorized. A system can know who you are (authentication) but still deny you access (authorization failure).

---

**Q2. What is RBAC and why is it preferred over direct permission assignment?**  
**A:** RBAC (Role-Based Access Control) assigns permissions to roles and assigns users to roles. It is preferred because it is scalable — changing a role updates all users in it simultaneously. It is auditable — you can see exactly what each role allows. It reduces errors — no individual permission sprawl. And it supports separation of duties — roles can be designed so no single person has conflicting permissions.

---

**Q3. What is the principle of least privilege and give a real example?**  
**A:** Least privilege means giving only the minimum access needed for a specific job function. Example: Hareesh as IT Admin needs to manage DNS and AD users — he does NOT need access to the Finance database or HR system. A backup service account needs Read access to data — it does NOT need Domain Admin rights. Least privilege limits the damage if an account is compromised, since the attacker only gets access to what that account was allowed.

---

**Q4. What is IDOR and why is it an authorization vulnerability?**  
**A:** IDOR (Insecure Direct Object Reference) occurs when an application exposes resource identifiers (like IDs in URLs) and does not verify whether the requesting user is authorized to access that specific resource. The user is authenticated — the server knows who they are. The problem is missing authorization — the server does not check "does this user own or have rights to resource 1046?" It is OWASP Top 10 #1 — Broken Access Control.

---

**Q5. Scenario — BloodHound shows that Hareesh's standard user account has a path to Domain Admin through 3 permission hops. What is this and how do you fix it?**  
**A:** This is an AD ACL abuse attack path. BloodHound identified that Hareesh has some AD permission (e.g., GenericWrite on a group) that can be chained to reach Domain Admin. Fix: (1) Identify each permission in the chain using BloodHound's path details. (2) Remove the excessive ACL — in AD Users and Computers or using PowerShell Remove-ADPermission. (3) Verify the removal in BloodHound by re-running collection. (4) Audit all other users for similar paths. (5) Implement regular BloodHound runs as a defensive measure to catch new paths that appear over time.

---

*"Authorization is not just about keeping people out — it is about ensuring that everyone, including insiders, can only do exactly what their job requires and nothing more."*
