# 10 — BloodHound Attack Paths

> **Section:** 05 — AD Attack Techniques  
> **Difficulty:** Advanced  
> **Tool:** BloodHound / SharpHound

---

## 📌 What is BloodHound?

BloodHound is a tool that maps Active Directory permissions as a **graph** — showing every user, group, computer, and the relationships (permissions) between them. It uses graph theory to find the **shortest path** from any account to Domain Admin.

> **Simple definition:**  
> BloodHound reveals hidden attack paths in AD — chains of permissions that allow a regular user to become Domain Admin without exploiting any vulnerability. It is used by both attackers (to find paths) and defenders (to find and eliminate them).

---

## ⚙️ How BloodHound Works

```
Step 1: Collect AD data using SharpHound
  SharpHound.exe --CollectionMethod All --OutputDirectory C:\Temp\

  SharpHound collects:
  → All users, groups, computers and their properties
  → Group memberships (who is in what group)
  → ACLs on all objects (who has what permissions)
  → Session data (who is logged into which machine)
  → Local admin rights (who has local admin where)
  → Kerberos delegation settings
  → Trust relationships

Step 2: Import data into BloodHound GUI
  BloodHound GUI → Upload Data → select ZIP file
  Graph database (Neo4j) stores all relationships

Step 3: Run attack path queries
  "Find Shortest Paths to Domain Admins"
  "Find All Paths from Domain Users to Domain Admins"
  "Shortest Paths to Unconstrained Delegation Systems"
  "Find Principals with DCSync Rights"
  "Kerberoastable Accounts in High Value Groups"
```

### Reading BloodHound Paths

```
Example attack path BloodHound found:

hareesh@company.com
    │
    │ MemberOf
    ▼
IT-Helpdesk (group)
    │
    │ GenericWrite
    ▼
svc_backup (user)
    │
    │ MemberOf
    ▼
Tier1-Admins (group)
    │
    │ WriteDACL
    ▼
Domain Admins (group)

Reading this path:
  Hareesh is in IT-Helpdesk
  IT-Helpdesk has GenericWrite on svc_backup
  svc_backup is in Tier1-Admins
  Tier1-Admins has WriteDACL on Domain Admins

Attack execution:
  1. Hareesh uses GenericWrite on svc_backup:
     Set-ADUser svc_backup -ServicePrincipalNames "fake/spn"
     Invoke-Kerberoast → crack svc_backup password

  2. As svc_backup (in Tier1-Admins):
     Use WriteDACL on Domain Admins to grant self GenericAll
  
  3. Add Hareesh to Domain Admins
  
  Total: 3 steps, zero exploits, just permission abuse ← normal user to DA
```

---

## 🛡️ Using BloodHound Defensively

```powershell
# Run SharpHound as defender (from any domain machine)
.\SharpHound.exe --CollectionMethod All

# Critical BloodHound queries for defenders:

1. "Find All Paths from Domain Users to Domain Admins"
   → Shows every path a regular user can take to DA
   → Each node in path = a permission to fix

2. "Find Principals with DCSync Rights"
   → Should only show: Domain Admins, Enterprise Admins, Domain Controllers

3. "Kerberoastable Accounts in High Value Groups"
   → Service accounts in privileged groups with crackable passwords

4. "Find AS-REP Roastable Users"
   → Accounts with pre-auth disabled

5. "Shortest Paths to Unconstrained Delegation Systems"
   → Machines with unconstrained delegation = ticket theft targets

For each path found:
  → Identify the weakest link (easiest permission to remove)
  → Remove it → rerun BloodHound → verify path is broken
  → Repeat until no paths exist from low-privilege users to DA
```

---

## 🔍 Detection

```
SharpHound collection is detectable:
  → Large volume of LDAP queries from single account/machine
  → Event ID 4662 — many AD object accesses
  → Event ID 1644 — expensive LDAP queries
  
MDI: "LDAP reconnaissance" alert fires during SharpHound collection

Signs of BloodHound-guided attack:
  → Unusual permission changes (Event ID 5136)
  → Account added to groups it has never been in
  → Sequential permission changes matching a path
```

---

## 🎯 Key Interview Question

**Q: What is BloodHound and how should defenders use it?**  
**A:** BloodHound maps Active Directory as a graph and finds attack paths from low-privilege users to Domain Admin using chains of permissions. Defenders should run it quarterly (using SharpHound for data collection), review all paths found, and systematically eliminate the weakest link in each path. The critical queries are: paths from Domain Users to Domain Admins, DCSync rights, Kerberoastable accounts in high-value groups, and unconstrained delegation systems. Regular BloodHound use is how defenders stay ahead of attackers who are running the same queries.

---

*"BloodHound doesn't find vulnerabilities — it finds your misconfigured permissions. Everything it shows is working exactly as configured. The question is: was it configured that way on purpose? Run it. Find out."*
