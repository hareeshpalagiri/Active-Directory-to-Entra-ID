# Section 02 — Active Directory (On-Premise)

> **Repository:** Active Directory to Microsoft Entra ID  
> **Focus:** Understanding Windows domain infrastructure from the ground up  
> **Difficulty:** Beginner → Intermediate

---

## 📌 What This Section Covers

Active Directory (AD) is the backbone of identity management in most enterprise Windows environments. Before you can attack it, defend it, or migrate it to the cloud — you must understand how it is built and how it works.

This section starts from zero:
- What Active Directory is and why every enterprise uses it
- How the forest, domain, and OU structure is organised
- How users, groups, and computers are managed
- How Group Policy enforces security across all machines
- How DNS and DHCP integrate with AD
- How AD replicates across multiple sites
- How trust relationships work between domains
- How to recover deleted objects

---

## 📂 Sub-Topics

| # | File | Topic | Difficulty |
|---|------|-------|------------|
| 01 | [01-What-is-AD.md](./01-What-is-AD.md) | What is Active Directory | ⭐ Beginner |
| 02 | [02-Forest-Domain-OU.md](./02-Forest-Domain-OU.md) | Forest, Domain & OU Structure | ⭐ Beginner |
| 03 | [03-Users-Groups-Computers.md](./03-Users-Groups-Computers.md) | Users, Groups & Computers | ⭐⭐ Beginner-Intermediate |
| 04 | [04-Group-Policy-GPO.md](./04-Group-Policy-GPO.md) | Group Policy (GPO) | ⭐⭐ Beginner-Intermediate |
| 05 | [05-DNS-and-DHCP.md](./05-DNS-and-DHCP.md) | DNS & DHCP in AD | ⭐⭐ Beginner-Intermediate |
| 06 | [06-Sites-and-Replication.md](./06-Sites-and-Replication.md) | Sites, Subnets & Replication | ⭐⭐⭐ Intermediate |
| 07 | [07-AD-Trusts.md](./07-AD-Trusts.md) | AD Trusts | ⭐⭐⭐ Intermediate |
| 08 | [08-AD-Recycle-Bin.md](./08-AD-Recycle-Bin.md) | AD Recycle Bin & Recovery | ⭐⭐ Beginner-Intermediate |

---

## 🗺️ Learning Flow

```
Start here
    │
    ▼
01-What-is-AD
    What problem AD solves.
    Core components and roles.
    │
    ▼
02-Forest-Domain-OU
    How AD is structured hierarchically.
    Design decisions.
    │
    ▼
03-Users-Groups-Computers
    The objects AD manages daily.
    Group types and scopes.
    │
    ▼
04-Group-Policy
    How security settings are enforced
    across all machines automatically.
    │
    ▼
05-DNS-and-DHCP
    Why AD depends entirely on DNS.
    How machines find each other.
    │
    ▼
06-Sites-and-Replication
    How AD stays consistent across
    multiple physical locations.
    │
    ▼
07-AD-Trusts
    How separate domains share access.
    Security risks of trust relationships.
    │
    ▼
08-AD-Recycle-Bin
    Recovering accidentally deleted objects.
    Backup and restore strategies.
```

---

## ⚡ Key Concepts at a Glance

| Concept | One Line |
|---------|----------|
| **Active Directory** | Microsoft's directory service for managing users, computers, and policies |
| **Domain Controller (DC)** | The server that runs Active Directory |
| **Forest** | The top-level container — one or more domains sharing a schema |
| **Domain** | A security and administrative boundary within a forest |
| **OU (Organizational Unit)** | A container inside a domain for organising objects |
| **GPO** | Group Policy Object — enforces settings on users and computers |
| **LDAP** | The protocol used to query Active Directory |
| **Kerberos** | The authentication protocol used by Active Directory |
| **SPN** | Service Principal Name — identifies a service in the domain |
| **FSMO Roles** | Special AD roles held by specific Domain Controllers |
| **AD Replication** | How changes on one DC are copied to all other DCs |
| **Trust** | A relationship allowing users in one domain to access another |

---

## 🔗 How This Section Connects

```
Section 02 (Active Directory)
    │
    ├──► Section 03 (AD Auth Protocols)
    │    Kerberos and NTLM run inside AD
    │
    ├──► Section 04 (AD Security & Hardening)
    │    Hardening the AD structure built here
    │
    ├──► Section 05 (AD Attacks)
    │    Attacks target the objects and structure covered here
    │
    └──► Section 08 (Hybrid Identity)
         Entra Connect syncs this AD to the cloud
```

---

*"You cannot secure what you do not understand. Master the structure of Active Directory first — everything else builds on it."*
