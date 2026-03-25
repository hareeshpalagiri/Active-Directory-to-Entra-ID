# 🐕 Lab 04 — BloodHound Attack Path Analysis

> **Goal:** Use BloodHound to visually map attack paths through your AD lab, find the shortest path to Domain Admin, and then remediate those paths. BloodHound is the most powerful tool attackers use to navigate AD — and defenders must know it equally well.

---

## 🐕 What is BloodHound?

```
PLAIN ENGLISH:
──────────────────────────────────────────────────────────────────
  BloodHound is like Google Maps for Active Directory attacks.

  Normal maps:  "How do I get from Home to Airport?"
  BloodHound:   "How do I get from 'regular user' to 'Domain Admin'?"

  It collects ALL relationships in AD:
  → Who is in which group
  → Who has admin rights on which PC
  → Which PCs are logged into by admins
  → Which accounts can reset whose passwords
  → Which objects have dangerous permissions

  Then draws the SHORTEST PATH to Domain Admin.

  Attacker with BloodHound: Finds privilege escalation path in minutes
  Without BloodHound: Takes days of manual enumeration
```

---

## 🏗️ BloodHound Components

```
┌──────────────────────────────────────────────────────────────────────┐
│                    BLOODHOUND ARCHITECTURE                           │
│                                                                      │
│  COMPONENT 1: SharpHound / BloodHound.py (Collector)                │
│  ─────────────────────────────────────────────────────             │
│  Runs as a domain user                                               │
│  Queries AD via LDAP and SMB                                         │
│  Collects: Users, Groups, Computers, Sessions, ACLs                  │
│  Outputs: ZIP file of JSON data                                      │
│                                                                      │
│                        ↓ (JSON ZIP)                                  │
│                                                                      │
│  COMPONENT 2: Neo4j Database                                         │
│  ─────────────────────────────────────────────────────             │
│  Graph database (nodes + relationships)                              │
│  Stores all AD relationship data                                     │
│  Each user/computer/group = a NODE                                   │
│  Each permission/membership = an EDGE                                │
│                                                                      │
│                        ↓ (query)                                     │
│                                                                      │
│  COMPONENT 3: BloodHound GUI                                         │
│  ─────────────────────────────────────────────────────             │
│  Visual graph interface                                              │
│  Pre-built queries for common attack paths                           │
│  Shows shortest path from any node to any target                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 📥 Setup — Install BloodHound CE

```
BLOODHOUND COMMUNITY EDITION (New, Docker-based):
──────────────────────────────────────────────────────────────────

  PREREQUISITES ON KALI:
  ─────────────────────────────────────────────────────────────────
  # Install Docker
  sudo apt update
  sudo apt install -y docker.io docker-compose
  sudo systemctl enable docker
  sudo systemctl start docker
  sudo usermod -aG docker $USER
  # Log out and back in


  INSTALL BLOODHOUND CE:
  ─────────────────────────────────────────────────────────────────
  # Download docker-compose file
  curl -L https://ghcr.io/bloodhoundad/bloodhound/releases/latest/\
    download/docker-compose.yml -o bloodhound-compose.yml

  # Start BloodHound
  docker-compose -f bloodhound-compose.yml up -d

  # BloodHound will be at: http://localhost:8080
  # Default creds shown in docker output (change on first login!)


  ALTERNATIVE: BloodHound Legacy (simpler for beginners)
  ─────────────────────────────────────────────────────────────────
  # On Kali (pre-installed or install via apt)
  sudo apt install bloodhound

  # Start Neo4j first
  sudo neo4j start
  # Open: http://localhost:7474 → login neo4j/neo4j → change password

  # Then start BloodHound
  bloodhound &
  # Login with neo4j credentials
```

---

## 🔍 Phase 1 — Data Collection with SharpHound

```
COLLECT AD DATA (run as domain user on WIN10-CLIENT):
──────────────────────────────────────────────────────────────────

  METHOD A: SharpHound.exe (Windows)
  ─────────────────────────────────────────────────────────────────
  # Download SharpHound from GitHub (BloodHound releases)
  # Transfer to WIN10-CLIENT

  # Run as alice (regular domain user)
  .\SharpHound.exe --CollectionMethods All --Domain lab.local

  # Output: 20240115123456_BloodHound.zip
  # Transfer this ZIP to Kali for analysis


  METHOD B: BloodHound.py (Python, from Kali)
  ─────────────────────────────────────────────────────────────────
  # Install
  pip3 install bloodhound

  # Run from Kali (no agent needed on Windows!)
  bloodhound-python \
    -u alice \
    -p 'Password123!' \
    -d lab.local \
    -dc 192.168.10.10 \
    -c All \
    --zip

  # Output: 20240115_bloodhound.zip
  # This is the file to import into BloodHound GUI!


  COLLECTION METHODS:
  ─────────────────────────────────────────────────────────────────
  --CollectionMethods All          → Everything (slowest, most data)
  --CollectionMethods Default      → Groups, sessions, ACLs, trusts
  --CollectionMethods Session      → Who's logged in where
  --CollectionMethods ACL          → Object permissions only
  --CollectionMethods GPOLocalGroup→ GPO-based local admin
```

---

## 📊 Phase 2 — Import and Analyze

```
IMPORT DATA INTO BLOODHOUND:
──────────────────────────────────────────────────────────────────
  1. Open BloodHound UI (http://localhost:8080 or app)
  2. Click "Upload Data" (top right)
  3. Select your .zip file
  4. Wait for import to complete (1-2 minutes for small lab)
  5. Click "Explore" to start analyzing


KEY BLOODHOUND QUERIES (Built-in):
──────────────────────────────────────────────────────────────────

  QUERY 1: "Find all Domain Admins"
  ─────────────────────────────────────────────────────────────────
  Click: "Pre-Built Queries" → "Find all Domain Admins"
  → See: diana, Administrator shown as Domain Admins
  → Click on diana node → See all her properties


  QUERY 2: "Shortest Path to Domain Admins"
  ─────────────────────────────────────────────────────────────────
  Click: "Pre-Built Queries" → "Shortest Paths to Domain Admins"
  → BloodHound draws the ATTACK GRAPH
  → Each arrow = one step the attacker can take

  Example path in your lab:
  alice → [MemberOf] → HR-Team
  No path to DA from alice (good!)

  charlie → [MemberOf] → Finance
  No direct path (good!)

  BUT: If alice has local admin on WIN10-CLIENT where diana is logged in:
  alice → [AdminTo] → WIN10-CLIENT → [HasSession] → diana → [MemberOf] → Domain Admins
  ↑ This is a 3-hop path to Domain Admin!


  QUERY 3: "Find Kerberoastable Users in High-Value Groups"
  ─────────────────────────────────────────────────────────────────
  Click: "Pre-Built Queries" → "Find Kerberoastable Users in High Value Groups"
  → If svc-sql is in any high-priv group, it shows here!
  → Even indirect membership via nested groups


  QUERY 4: "Find Computers where Domain Users are Local Admin"
  ─────────────────────────────────────────────────────────────────
  → Critical: If Domain Users group = local admin on ANY PC
  → That's a privilege escalation path for EVERY domain user!
```

---

## 🗺️ Understanding the Attack Graph

```
READING BLOODHOUND EDGES (ARROWS):

  EDGE TYPE          MEANING
  ─────────────────────────────────────────────────────────────────
  MemberOf        →  User is in this group
  AdminTo         →  Has local admin on this computer
  HasSession      →  User has an active session on this PC
  GenericAll      →  Full control over this object
  GenericWrite    →  Can modify attributes of this object
  WriteOwner      →  Can take ownership
  WriteDacl       →  Can modify permissions
  ForceChangePassword → Can reset their password
  DCSync          →  Has replication rights (DCSync attack!)
  AllExtendedRights → Special AD permissions
  Owns            →  Object owner (implicit full control)
  CanRDP          →  Can RDP to this machine
  CanPSRemote     →  Can PowerShell remote to this machine


  ATTACK PATH EXAMPLE (Step by Step):
  ─────────────────────────────────────────────────────────────────
  Node:     alice@lab.local
  Edge:     MemberOf
  Node:     Helpdesk@lab.local (group)
  Edge:     AdminTo
  Node:     CORPSERVER01.lab.local
  Edge:     HasSession
  Node:     diana@lab.local (logged into that server)
  Edge:     MemberOf
  Node:     DOMAIN ADMINS@lab.local

  MEANING:
  "alice → member of Helpdesk → Helpdesk has local admin on CORPSERVER01
  → diana (DA) has a session on CORPSERVER01
  → alice can dump diana's credentials from CORPSERVER01
  → alice becomes Domain Admin"

  This 4-hop path = alice can become DA!
```

---

## 🛡️ Defense Phase — Remediate Attack Paths

```
FOR EACH ATTACK PATH BLOODHOUND SHOWS, REMEDIATE:

  PATH TYPE 1: Domain User is local admin on workstation
  ─────────────────────────────────────────────────────────────────
  FIX: Remove "Domain Users" from local Administrators group
  GPO: Computer Config → Policies → Windows Settings →
         Security Settings → Restricted Groups
       "Administrators" → Remove Domain Users
  Result: BloodHound edge removed!


  PATH TYPE 2: Domain Admin has session on regular workstation
  ─────────────────────────────────────────────────────────────────
  FIX: Implement Tiered Admin Model
  → Tier 0 admins (DA) only log into DCs
  → Tier 1 admins log into servers
  → Tier 2 admins log into workstations
  → NEVER mix tiers!
  Result: No DA session on user workstations → path broken


  PATH TYPE 3: User has GenericAll / WriteDACL on sensitive group
  ─────────────────────────────────────────────────────────────────
  FIX: Audit and remove dangerous ACLs
  # Find the ACL in BloodHound → right-click edge → "Help"
  # It shows exactly what to fix!

  # Remove GenericAll from user
  # In ADUC → Advanced → Security tab → remove the permission


  PATH TYPE 4: Service account with SPN is Kerberoastable
  ─────────────────────────────────────────────────────────────────
  FIX: Already covered in Lab 03!
  → Strong password OR gMSA
  → BloodHound edge will still show but no longer exploitable


  VERIFY REMEDIATION:
  ─────────────────────────────────────────────────────────────────
  After making changes:
  1. Re-run SharpHound to collect fresh data
  2. Import new data into BloodHound
  3. Re-run "Shortest Paths to Domain Admins"
  4. Verify the path you fixed is GONE
  5. Repeat until no unexpected paths remain
```

---

## 🔭 Advanced BloodHound — Custom Queries

```
CUSTOM CYPHER QUERIES (BloodHound uses Neo4j Cypher language):
──────────────────────────────────────────────────────────────────

  FIND ALL USERS WITH DCSYNC RIGHTS:
  ─────────────────────────────────────────────────────────────────
  MATCH p=(n)-[:DCSync|AllExtendedRights|GenericAll]->(d:Domain)
  WHERE n.name <> "DOMAIN ADMINS@LAB.LOCAL"
  RETURN p


  FIND ALL COMPUTERS WITH UNCONSTRAINED DELEGATION:
  ─────────────────────────────────────────────────────────────────
  MATCH (c:Computer {unconstraineddelegation:true})
  RETURN c.name


  FIND ALL PATHS FROM KERBEROASTABLE USERS TO DA:
  ─────────────────────────────────────────────────────────────────
  MATCH p=shortestPath(
    (u:User {hasspn:true})-[*1..]->(g:Group {name:"DOMAIN ADMINS@LAB.LOCAL"})
  )
  RETURN p


  FIND USERS WITH MORE THAN 5 HOPS TO DA (Hard targets):
  ─────────────────────────────────────────────────────────────────
  MATCH p=shortestPath(
    (u:User)-[*]->(g:Group {name:"DOMAIN ADMINS@LAB.LOCAL"})
  )
  WHERE length(p) > 5 AND u.enabled = true
  RETURN u.name, length(p) as PathLength
  ORDER BY PathLength ASC
```

---

## 👮 Security Engineer's POV

> ⚠️ **Run BloodHound on your OWN environment. What you find will shock you.**

```
REAL-WORLD FINDINGS FROM BLOODHOUND:
──────────────────────────────────────────────────────────────────
  🔴 Finding 1 (very common):
     Default "Domain Users" group → local admin on 200+ PCs
     → ANY domain user = local admin everywhere
     → Attacker compromises ONE PC → pivots everywhere

  🔴 Finding 2 (common):
     Service desk account → ForceChangePassword →
     IT Manager → MemberOf → Domain Admins
     → Compromise help desk → reset IT manager password → DA

  🔴 Finding 3 (surprisingly common):
     Old employee account still active →
     Was once in a powerful group →
     Still has path to DA

  🔴 Finding 4 (less obvious):
     GPO applies to OU → GPO editors group can modify GPO →
     Edit GPO to add startup script → code runs as SYSTEM on all
     machines in OU → DA

  RECOMMENDATION:
  ─────────────────────────────────────────────────────────────────
  Run BloodHound every quarter as a security assessment.
  Treat new attack paths like security vulnerabilities.
  Assign tickets, remediate, verify, close.
```

---

## ✅ Lab Checklist

```
BLOODHOUND LAB COMPLETE WHEN:
──────────────────────────────────────────────────────────────────
  SETUP:
  □ BloodHound and Neo4j running on Kali
  □ SharpHound / bloodhound-python collected lab data
  □ Data imported into BloodHound GUI

  ANALYSIS:
  □ Found all Domain Admins in your lab
  □ Ran "Shortest Paths to Domain Admins"
  □ Identified at least one attack path
  □ Can explain each step of the path in plain English
  □ Ran "Find Kerberoastable Users" query

  REMEDIATION:
  □ Fixed one identified attack path
  □ Re-ran SharpHound after fix
  □ Verified path is gone from BloodHound

  CUSTOM QUERIES:
  □ Ran DCSync rights query
  □ Ran Unconstrained Delegation query
  □ Understand what each result means
```

---

**← Previous:** [03 - Kerberoasting Lab](./03-Kerberoasting-Lab.md)
**Next →** [05 - PIM Lab](./05-PIM-Lab.md)
