# 07 — Active Directory Trusts

> **Section:** 02 — Active Directory (On-Premise)  
> **Difficulty:** Intermediate  
> **Depends on:** [02-Forest-Domain-OU.md](./02-Forest-Domain-OU.md)

---

## 📌 What is an AD Trust?

By default, users in one AD domain cannot access resources in a completely different AD domain or forest. A **trust relationship** bridges that gap.

> **Simple definition:**  
> An AD Trust is a relationship between two domains or forests that allows users authenticated in one domain to access resources in the other domain — without needing a separate account in each.

### Real-World Analogy

Think of two countries with a **visa-free travel agreement**:
- Citizens of India can travel to the UK without a visa (trust relationship)
- The UK trusts India's passport as valid proof of identity
- The Indian citizen does not need a UK passport — their Indian passport is accepted

AD Trusts work the same way — users prove their identity in their own domain, and the trusting domain accepts that proof.

---

## 🔗 Trust Concepts

### Trust Direction

```
Trusting domain  ← Trust direction ←  Trusted domain

"Domain A trusts Domain B"
  → Users IN Domain B can access resources IN Domain A
  → Domain A is the TRUSTING domain (the one granting access)
  → Domain B is the TRUSTED domain (the one whose users get access)

Memory trick:
  "Trust flows toward the resources"
  "Access flows toward the users"
```

```
Example:
  company.local TRUSTS partner.local

  Users in partner.local:
    → Can access resources in company.local ✅

  Users in company.local:
    → CANNOT access resources in partner.local ❌ (one-way trust)

  If company.local and partner.local BOTH trust each other:
    → Two-way trust
    → Users in BOTH domains can access resources in BOTH domains ✅
```

### Trust Transitivity

```
Transitive trust:
  Domain A trusts Domain B
  Domain B trusts Domain C
  → Domain A AUTOMATICALLY trusts Domain C (transitivity)

Non-transitive trust:
  Domain A trusts Domain B
  Domain B trusts Domain C
  → Domain A does NOT automatically trust Domain C
  → Must be explicitly created
```

---

## 📋 Types of Trusts

### 1. Parent-Child Trust (Automatic)

Created automatically when a child domain is added to a forest.

```
company.local (parent)
  └── india.company.local (child)

Trust: Two-way, transitive (automatic)
  → Users in india.company.local can access company.local resources
  → Users in company.local can access india.company.local resources
  → No configuration needed ✅
```

### 2. Tree-Root Trust (Automatic)

Created automatically between the forest root domain and a new tree root domain.

```
Forest:
  company.local (tree 1 root)
  subsidiary.com (tree 2 root — different DNS namespace)

Trust: Two-way, transitive (automatic)
  → Both trees in same forest → automatic trust
```

### 3. Forest Trust (Manual)

Between two completely separate forests. Must be manually created by admins of both forests.

```
Forest A: company.local
Forest B: partner.local

GP creates a Forest Trust between the two forests:

Direction options:
  One-way: company.local → partner.local
    (partner users can access company resources)
  Two-way: company.local ↔ partner.local
    (both can access each other's resources)

Transitivity: Yes — applies to all domains in both forests

Use case:
  Company acquires another company
  Joint venture between two organisations
  Long-term partnership requiring resource sharing
```

### 4. External Trust (Manual)

Between a domain in one forest and a domain in another forest (not forest-wide).

```
company.local/uk.company.local ← trust → partner.local/us.partner.local

Direction: One or two-way
Transitivity: NO — non-transitive

Use case:
  Need to grant access to one specific domain only
  Don't want to expose all domains in the forest
  More limited scope than a Forest Trust
```

### 5. Shortcut Trust (Manual)

Between two domains in the same forest to speed up authentication.

```
Forest: enterprise.com
  ├── europe.enterprise.com
  │     └── uk.europe.enterprise.com
  └── asia.enterprise.com
        └── india.asia.enterprise.com

User in uk.europe.enterprise.com accesses india.asia.enterprise.com:
  Without shortcut trust:
    Authentication chain: uk → europe → enterprise → asia → india
    → 4 hops → slow

  With shortcut trust:
    Direct trust: uk.europe.enterprise.com ↔ india.asia.enterprise.com
    → 1 hop → fast ✅

Use case: Large forests where cross-domain authentication is frequent
```

### 6. Realm Trust

Between an AD domain and a non-Windows Kerberos realm (e.g., Linux/Unix environments using MIT Kerberos).

---

## 🔄 Trust Summary Table

| Trust Type | Created | Direction | Transitive | Use Case |
|-----------|---------|-----------|-----------|---------|
| Parent-Child | Automatic | Two-way | Yes | Child domain creation |
| Tree-Root | Automatic | Two-way | Yes | New tree in forest |
| Forest | Manual | One or two-way | Yes | Cross-forest access |
| External | Manual | One or two-way | No | Specific domain access |
| Shortcut | Manual | One or two-way | Yes | Speed up intra-forest auth |
| Realm | Manual | One or two-way | Configurable | Non-Windows Kerberos |

---

## 🏢 Real-World Trust Scenario

### Scenario — Acquisition

```
company.local acquires startup.local (separate forest)

Before trust:
  GP (company.local admin) needs access to startup.local systems
  → Needs a separate startup.local account
  → IT must manage credentials in two systems

After Forest Trust:
  GP establishes Forest Trust:
    company.local ← one-way ← startup.local
    (startup users can access company resources — for migration purposes)

  Hareesh from startup.local:
    → Uses startup.local credentials
    → Authenticates against startup.local DC ✅
    → Gets access to company.local SharePoint ✅
    → Never needs a separate company.local account ✅

  After migration complete:
    → Trust removed
    → All startup users migrated to company.local accounts
```

---

## ⚠️ Trust Security Risks

### 1. Trust Transitivity Abuse

```
Risk: In a transitive trust, compromising one domain can
      lead to other trusted domains

Example:
  Forest A trusts Forest B (two-way, transitive)
  Forest B also has a trust with Forest C

  Attacker compromises Forest B
  → Can pivot to Forest A (via trust)
  → Can pivot to Forest C (via trust)
  → One forest compromise → three forests compromised

Defense:
  Audit all forest trusts: Get-ADTrust -Filter *
  Review if trusts are still needed regularly
  Use Selective Authentication to limit which users can use the trust
```

### 2. SID History Attack

```
What: SID History is an attribute that stores previous domain SIDs
      (used when migrating users between domains)

Attack (SID History Injection):
  Attacker compromises Domain A (lower security)
  Forest Trust exists: Domain A ↔ Domain B

  Attacker injects Domain B Enterprise Admin SID
  into a Domain A user's SID History attribute

  When Domain A user accesses Domain B:
  → Domain B sees the Enterprise Admin SID in SID History
  → Grants Enterprise Admin access ← full forest compromise

Defense:
  Enable SID Filtering on all external and forest trusts
  (SID Filtering removes SID History attributes from cross-trust auth tokens)
  New-ADTrustRequest with -SIDFilteringForestAware flag
  Check: Get-ADTrust -Filter * | Select-Object Name, SIDFilteringForestAware
```

### 3. Kerberos Delegation Across Trusts

```
Risk: Unconstrained Kerberos delegation + trust = dangerous

If a server in Domain A has Unconstrained Delegation:
  And Domain B users authenticate to that server
  → Their Kerberos tickets are stored on the server
  → Attacker on that server can steal tickets and pivot to Domain B

Defense:
  Use Constrained Delegation (not Unconstrained)
  Enable "Account is sensitive and cannot be delegated" on privileged accounts
  Enable "Protected Users" group (blocks delegation entirely)
```

---

## 🔧 Trust Management Commands

```powershell
# View all trusts in the domain
Get-ADTrust -Filter * | Select-Object Name, TrustType, TrustDirection, TrustAttributes

# View trusts from the forest perspective
(Get-ADForest).Domains | ForEach-Object {
    Get-ADDomain -Identity $_ | Select-Object Name, ParentDomain
}

# Test trust relationship
netdom trust company.local /domain:partner.local /verify

# Create a new External Trust (one-way, company trusts partner)
New-ADTrust -Name "partner.local" `
            -SourceName "company.local" `
            -TrustType "External" `
            -TrustDirection "Inbound"

# Enable SID Filtering on a trust (security hardening)
netdom trust company.local /domain:partner.local /EnableSIDHistory:no /quarantine:yes

# Remove a trust
Remove-ADTrust -Identity "partner.local" -Confirm:$false

# Validate trust authentication
nltest /sc_verify:partner.local
```

---

## 🎯 Interview Questions

**Q1. What is an AD Trust and when would you need one?**  
**A:** An AD Trust is a relationship between two domains or forests that allows users authenticated in one domain to access resources in the other. You need one when: merging with or acquiring another company that has its own AD forest, setting up access for long-term partners, enabling resource sharing between divisions that have separate AD forests, or speeding up authentication between specific domains in a large forest (shortcut trust).

---

**Q2. What is the difference between a one-way and two-way trust?**  
**A:** In a one-way trust, only users from the trusted domain can access resources in the trusting domain — access flows in one direction. In a two-way trust, users from both domains can access resources in both domains — access flows both ways. Most corporate partnerships use one-way trusts (the partner can access specific company resources, but cannot access everything). Two-way trusts are typically used between domains within the same organisation.

---

**Q3. What is SID History injection and how does it relate to trusts?**  
**A:** SID History is an AD attribute that stores a user's previous domain SIDs — used legitimately during domain migrations. An attacker who compromises a domain can inject a high-privileged SID (like Enterprise Admin from the partner forest) into a user's SID History. When that user authenticates across a trust, the trusting domain sees the injected SID and grants the associated privileges — effectively escalating the attacker to admin in the trusting forest. Defence: enable SID Filtering on all trusts, which strips SID History attributes from cross-trust authentication tokens.

---

**Q4. What is Selective Authentication and why would you use it?**  
**A:** Selective Authentication is a trust configuration that restricts which users from the trusted domain can authenticate to which servers in the trusting domain. By default, all users in a trusted domain can attempt to access any resource in the trusting domain (subject to permissions). With Selective Authentication, each server in the trusting domain must explicitly grant "Allowed to Authenticate" permission to specific users or groups from the trusted domain. This is used to limit exposure — for example, only allowing specific partner employees to access specific servers, rather than all partner employees having free access attempts.

---

**Q5. Scenario — You discover your company.local forest has a two-way forest trust with an unknown forest called old-partner.local. Nobody in IT knows why it exists. What do you do?**  
**A:** (1) Research: check IT documentation, change management records, ask senior staff — was this for a historical project or partnership? (2) Assess current usage: check authentication logs for cross-trust logins — are any users actively using this trust? (3) Assess risk: a two-way forest trust means users from old-partner.local can potentially access company.local resources and vice versa. Immediately check if SID Filtering is enabled. (4) Immediate hardening: if the trust is not actively needed, disable it (do not delete yet — removal can break things). If it must stay, enable SID Filtering and Selective Authentication. (5) Remove: if confirmed unnecessary, remove the trust after communicating with relevant stakeholders. (6) Conduct a full audit of all trusts in the environment and document them with business justification.

---

*"Trusts extend your security boundary — and your attack surface. Every trust is a door between your environment and someone else's. Know every door you have open, who put it there, and whether it still needs to be open."*
