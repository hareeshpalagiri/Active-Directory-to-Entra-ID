# 02 — Forest, Domain & OU Structure

> **Section:** 02 — Active Directory (On-Premise)  
> **Difficulty:** Beginner  
> **Depends on:** [01-What-is-AD.md](./01-What-is-AD.md)

---

## 📌 Overview

Active Directory is not a flat database. It is organised in a **strict hierarchy** — like a set of nested containers, each with a specific purpose.

Understanding this hierarchy is essential because:
- Security boundaries are defined by it
- Group Policy inheritance follows it
- Attack paths exploit it
- Replication is based on it

The hierarchy from top to bottom:

```
Forest
  └── Tree
        └── Domain
              └── Organizational Unit (OU)
                    └── Objects (Users, Computers, Groups)
```

---

## 🌲 The Forest

The **forest** is the top-level container in Active Directory. It is the **security boundary** of AD — nothing outside the forest is trusted by default.

> **Simple definition:**  
> A forest is a collection of one or more domains that share the same AD schema, global catalog, and configuration. It is the outermost boundary of an Active Directory environment.

```
Think of the forest as a country.
  → The country has one set of laws (schema)
  → It may have multiple states (domains)
  → Citizens of one state are still part of the same country
  → Other countries are separate — need a treaty (trust) to share access
```

### What the Forest Contains

```
Forest: company.local
  │
  ├── Shared schema (structure of all AD objects)
  ├── Shared configuration (sites, services, replication topology)
  ├── Global Catalog (searchable index of all objects)
  └── Forest-wide trust (all domains trust each other by default)
```

### Forest Root Domain

The first domain created in a forest is the **forest root domain**. It is special — it holds the Schema Master and Domain Naming Master FSMO roles.

```
Best practice:
  Create a dedicated empty forest root domain
  Forest root: company.local (admin accounts only, no regular users)
  Child domains: uk.company.local, india.company.local

  Why?
  → Isolates the most sensitive FSMO roles
  → If a child domain is compromised → forest root remains protected
  → Attackers must compromise the forest root separately
```

### Global Catalog

A partial, read-only copy of all objects in ALL domains in the forest. Used for universal group membership lookups and cross-domain searches.

```
Without Global Catalog:
  Hareesh in india.company.local tries to log in
  His Universal Group memberships are in uk.company.local
  Login server cannot find them → login fails or is slow

With Global Catalog:
  Every DC with GC role has a copy of all objects across all domains
  Login server queries local GC → finds memberships instantly → fast login ✅

Global Catalog port: 3268 (unencrypted), 3269 (TLS)
```

---

## 🌳 Trees

A **tree** is a collection of domains that share a contiguous DNS namespace.

```
Tree 1:
  company.local (root)
    ├── uk.company.local
    ├── india.company.local
    └── us.company.local

Tree 2 (different namespace — different tree, same forest):
  subsidiary.com (root)
    ├── eu.subsidiary.com
    └── asia.subsidiary.com

Both trees in same forest → automatically trust each other
```

In most single-company environments, there is only one tree. Multiple trees appear in merger/acquisition scenarios.

---

## 🏛️ The Domain

A **domain** is the primary administrative and security unit in Active Directory.

> **Simple definition:**  
> A domain is a logical grouping of users, computers, and resources that share the same AD database, security policies, and administrative boundary.

```
Domain: company.local

Contains:
  → All user accounts for this domain
  → All computer accounts
  → All group policies
  → Two or more Domain Controllers

DNS name: company.local
NetBIOS name: COMPANY (legacy, still used)
```

### When to Create Multiple Domains

Most organisations use a **single domain**. Multiple domains are needed when:

| Reason | Example |
|--------|---------|
| **Different security policies** | Military division needs stricter password policy than HQ |
| **Regulatory compliance** | Data sovereignty — India data must stay in India |
| **Acquisitions** | Acquired company keeps its own domain |
| **Very large scale** | Millions of objects — performance optimisation |
| **Administrative autonomy** | Subsidiary needs independent IT team |

```
GP's company acquires a startup:
  Before: company.local
  After:  company.local (original)
          startup.company.local (acquired company's domain)

  Both in same forest → automatic trust ✅
  startup has its own DC, its own IT admin ✅
  Users in company.local can access startup resources (with trust) ✅
```

---

## 📁 Organizational Units (OUs)

An **OU** is a container inside a domain used to organise AD objects and apply Group Policy.

> **Simple definition:**  
> An OU is like a folder inside a domain. You put users, computers, and groups into OUs to organise them and apply different policies to different groups.

```
Domain: company.local
  │
  ├── OU: Headquarters
  │     ├── OU: IT Department
  │     │     ├── Hareesh (user)
  │     │     ├── LAPTOP-HR-001 (computer)
  │     │     └── SG-IT-Admins (group)
  │     │
  │     ├── OU: Finance Department
  │     │     ├── Finance users
  │     │     └── Finance computers
  │     │
  │     └── OU: HR Department
  │           ├── HR users
  │           └── HR computers
  │
  ├── OU: Branch Offices
  │     ├── OU: Bengaluru
  │     │     ├── GP (user)
  │     │     └── Branch computers
  │     └── OU: Mumbai
  │
  └── OU: Service Accounts
        ├── svc_backup
        └── svc_webapp
```

### OU vs Security Group — Key Difference

This confuses many people. They look similar but serve very different purposes.

| | OU | Security Group |
|---|---|---|
| **Purpose** | Organise objects + apply GPO | Control access to resources |
| **GPO** | ✅ Can have GPO linked | ❌ Cannot have GPO linked |
| **Resource access** | ❌ Cannot be used for permissions | ✅ Used for NTFS/share permissions |
| **Nesting** | Deeply nested | Can be nested (within limits) |
| **Example** | OU: IT-Department → GPO applies to all IT users | Group: SG-IT-FileShare → grants access to IT share |

```
Example showing the difference:

OU: IT-Department
  → GPO linked: "Disable USB drives on IT computers"
  → Applies to ALL computers in this OU automatically

Security Group: SG-IT-FileShare
  → NTFS permission on \\FileServer\IT-Share → Read/Write
  → Only members of this group get that access

Hareesh is in OU: IT-Department AND member of SG-IT-FileShare
  → Gets USB disabled policy (from OU/GPO)
  → Gets access to IT file share (from Security Group)
```

---

## 🏗️ Designing the OU Structure

OU design is one of the most important decisions in an AD deployment. A good OU structure makes administration easy and security tight.

### Approach 1 — By Department (most common)

```
company.local
  ├── OU: Users
  │     ├── OU: IT
  │     ├── OU: Finance
  │     ├── OU: HR
  │     └── OU: Operations
  │
  ├── OU: Computers
  │     ├── OU: Workstations
  │     │     ├── OU: IT-Workstations
  │     │     └── OU: Finance-Workstations
  │     └── OU: Servers
  │
  └── OU: Service-Accounts
```

### Approach 2 — By Location

```
company.local
  ├── OU: London
  │     ├── OU: Users
  │     └── OU: Computers
  │
  ├── OU: Bengaluru
  │     ├── OU: Users
  │     └── OU: Computers
  │
  └── OU: New-York
        ├── OU: Users
        └── OU: Computers
```

### Approach 3 — By Function (best for GPO)

```
company.local
  ├── OU: Tier0-Admin-Accounts     ← Domain Admin accounts — strictest policy
  ├── OU: Tier1-Server-Admins      ← Server admin accounts
  ├── OU: Tier2-Workstation-Users  ← Standard users
  │
  ├── OU: Workstations             ← All workstations — standard GPO
  ├── OU: Servers                  ← All servers — server hardening GPO
  └── OU: Domain-Controllers       ← DC security GPO (most restrictive)
```

> 💡 **Best practice:** Design OUs around how you want to **apply Group Policy**, not just how the org chart looks. OUs are your GPO delivery mechanism.

---

## 🔢 The Distinguished Name (DN)

Every object in AD has a unique path called a **Distinguished Name**. This is how LDAP identifies objects.

```
Hareesh's user account DN:
  CN=Hareesh,OU=IT,OU=Headquarters,DC=company,DC=local

Breaking it down:
  CN=Hareesh          ← Common Name (the object's name)
  OU=IT               ← Inside the IT OU
  OU=Headquarters     ← Inside the Headquarters OU
  DC=company          ← In the company domain
  DC=local            ← .local TLD

GP's user account DN:
  CN=GP,OU=Bengaluru,OU=Branch-Offices,DC=company,DC=local
```

```powershell
# Find Hareesh's DN
Get-ADUser -Identity "hareesh" | Select-Object DistinguishedName

# Output:
# CN=Hareesh,OU=IT,OU=Headquarters,DC=company,DC=local
```

---

## ⚠️ Security Implications of the Structure

### Forest Boundary Attack

```
The forest is the security boundary — NOT the domain.

If two domains are in the same forest:
  → They automatically trust each other
  → A Domain Admin in domain A can attack domain B
  → Compromising ANY domain in a forest can lead to forest-wide compromise

Example:
  Forest: enterprise.com
    ├── domain: uk.enterprise.com   (compromised)
    └── domain: us.enterprise.com

  Attacker compromises uk.enterprise.com Domain Admin
  → Can use SID history injection or trust attacks
  → Can reach us.enterprise.com
  → Full forest compromise possible

Real-world lesson:
  If two entities need true security isolation → separate forests
  If they just need administrative separation → separate domains is fine
```

### OU Delegation Attack

```
Admins can delegate control of OUs to specific users.
Example: Helpdesk team can reset passwords in the Users OU.

Misconfiguration risk:
  If delegation is too broad (e.g., Full Control over an OU)
  → Delegated user can modify any object in that OU
  → Including adding themselves to privileged groups

Check for dangerous OU delegations:
```

```powershell
# Find all delegated permissions on an OU
(Get-ACL "AD:\OU=IT,DC=company,DC=local").Access |
    Where-Object {$_.IdentityReference -notlike "*Domain Admins*"} |
    Select-Object IdentityReference, ActiveDirectoryRights
```

---

## 🔧 Essential Commands

```powershell
# View domain information
Get-ADDomain | Select-Object Name, DNSRoot, DomainMode, PDCEmulator

# View forest information
Get-ADForest | Select-Object Name, ForestMode, Domains, GlobalCatalogs

# List all OUs
Get-ADOrganizationalUnit -Filter * | Select-Object Name, DistinguishedName

# Create a new OU
New-ADOrganizationalUnit -Name "Service-Accounts" `
    -Path "DC=company,DC=local" `
    -ProtectedFromAccidentalDeletion $true

# Move a user to a different OU
Move-ADObject -Identity "CN=Hareesh,OU=IT,DC=company,DC=local" `
    -TargetPath "OU=Senior-IT,OU=IT,DC=company,DC=local"

# Find all objects in a specific OU
Get-ADObject -Filter * -SearchBase "OU=IT,DC=company,DC=local" |
    Select-Object Name, ObjectClass
```

---

## 🎯 Interview Questions

**Q1. What is the difference between a forest, a domain, and an OU?**  
**A:** A forest is the top-level security boundary containing one or more domains — all domains in a forest share the same schema and automatically trust each other. A domain is the primary administrative unit — it has its own database, security policies, and Domain Controllers. An OU is a container within a domain used to organise objects and apply Group Policy — it is not a security boundary, just an administrative one. The forest is the security boundary; the domain is the administrative boundary; the OU is the organisational unit.

---

**Q2. What is the Global Catalog and why is it important?**  
**A:** The Global Catalog is a partial, read-only copy of all objects across all domains in a forest, stored on designated DCs. It is important because during login, Windows needs to look up a user's Universal Group memberships — which may be defined in a different domain. Without a Global Catalog, this lookup fails and login is slow or impossible. The Global Catalog also enables cross-domain searches and is queried by Exchange for email address lookups.

---

**Q3. What is the difference between an OU and a Security Group?**  
**A:** An OU is used to organise objects and link Group Policy — it defines which GPO applies to which users and computers. A Security Group is used to control access to resources — you add users to a group, then grant the group permission to files, folders, or applications. You cannot link a GPO to a Security Group, and you cannot use an OU as a permission boundary on a file share. They serve completely different purposes and are often used together.

---

**Q4. Why is the forest the security boundary and not the domain?**  
**A:** All domains within a forest automatically trust each other with transitive trust. A Domain Admin in one domain can potentially attack other domains in the same forest through techniques like SID history injection or trust exploitation. True security isolation requires separate forests — a compromise in one domain can potentially cascade to other domains in the same forest. Organisations that need genuine security separation (e.g., a highly sensitive division) should use separate forests.

---

**Q5. Scenario — A junior IT admin accidentally deleted the entire Finance OU containing 50 user accounts and their computers. How do you recover?**  
**A:** If the AD Recycle Bin is enabled: use Get-ADObject -Filter {isDeleted -eq $true} -IncludeDeletedObjects to find the deleted OU and its contents, then use Restore-ADObject to restore them — all attributes are preserved. If the Recycle Bin was not enabled: perform an authoritative restore from the most recent AD backup — boot the DC into DSRM (Directory Services Restore Mode), restore NTDS.dit from backup, mark the objects as authoritative so they replicate back to all DCs. Future prevention: enable Protected From Accidental Deletion on all OUs (New-ADOrganizationalUnit with -ProtectedFromAccidentalDeletion $true).

---

*"The OU structure is your security policy delivery system. Design it for Group Policy first, org chart second — your future self will thank you."*
