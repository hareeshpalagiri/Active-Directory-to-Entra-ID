# 🌐 Microsoft Sentinel — Cloud-Native SIEM

> **Simple Definition:** Microsoft Sentinel is a **cloud-based security operations center (SOC) brain** — it collects logs from every corner of your environment (AD, cloud, firewalls, apps), uses AI to find threats, and helps your team investigate and respond — all from one screen.

---

## 🧠 The Mission Control Analogy

```
WITHOUT SENTINEL:                      WITH SENTINEL:
─────────────────────────────────────  ──────────────────────────────────
50 different tools, 50 dashboards      ONE dashboard for everything
Security analyst checks each           AI watches all feeds 24/7
  system manually                      Correlates events across all
                                         systems automatically
AD alert in one tab                    "AD breach + phishing email +
Firewall alert in another tab            cloud login = ONE INCIDENT"
Cloud alert in third tab               Alert sent before analyst even
                                         starts their morning coffee

Think: Mission Control NASA             Think: An always-on AI analyst
```

---

## 🏗️ Sentinel Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                     MICROSOFT SENTINEL                               │
│                                                                      │
│  DATA SOURCES                  SENTINEL ENGINE          OUTPUTS      │
│  ─────────────                 ───────────────          ───────      │
│                                                                      │
│  🏢 On-Premise:                ┌─────────────────┐    📧 Alerts     │
│  Windows Event Logs ──────────►│                 │    🎫 Incidents  │
│  AD Security Logs  ──────────►│   Log Analytics  │    📊 Dashboards │
│  DNS/DHCP Logs     ──────────►│   Workspace      │    📋 Reports    │
│                               │                 │    🤖 Automation │
│  ☁️ Cloud:                    │  KQL Query      │                  │
│  Entra ID Logs     ──────────►│  Engine         │                  │
│  Microsoft 365     ──────────►│                 │    🔍 Hunting    │
│  Azure Activity    ──────────►│  Analytics      │    📚 Notebooks  │
│  Defender (MDI,    ──────────►│  Rules (AI)     │                  │
│    MDE, MDO)       ──────────►│                 │                  │
│                               │  UEBA           │                  │
│  🌐 Third-party:              │  (Behavior)     │                  │
│  Cisco Firewall    ──────────►│                 │                  │
│  Palo Alto         ──────────►└─────────────────┘                  │
│  AWS / GCP         ──────────►                                      │
│  ServiceNow, etc.  ──────────►                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 Connecting Data Sources (Connectors)

```
SENTINEL DATA CONNECTORS:

  BUILT-IN (1-click enable):
  ─────────────────────────────────────────────────────────────────
  ✅ Microsoft Entra ID           (Sign-in, Audit logs)
  ✅ Microsoft Defender for Identity (AD alerts)
  ✅ Microsoft 365 Defender       (E5 suite alerts)
  ✅ Microsoft Defender for Cloud (Azure security alerts)
  ✅ Azure Activity Log           (Azure subscription events)
  ✅ Office 365                   (Exchange, Teams, SharePoint)
  ✅ Windows Security Events      (via Azure Monitor Agent)
  ✅ DNS                          (query logs)
  ✅ Azure Firewall               (network logs)

  PARTNER CONNECTORS (configured via portal):
  ─────────────────────────────────────────────────────────────────
  Cisco ASA, Fortinet, Palo Alto, Check Point (firewall logs)
  AWS CloudTrail, GCP Pub/Sub (multi-cloud)
  ServiceNow, Splunk, QRadar (SIEM migration)
  Syslog, CEF (any Linux/Unix system)

  CUSTOM (Logstash / REST API):
  ─────────────────────────────────────────────────────────────────
  Custom applications, legacy systems, homegrown tools
  Any HTTP endpoint → Sentinel via Data Collector API
```

---

## 📝 KQL — The Query Language of Sentinel

KQL (Kusto Query Language) is how you search and analyze logs:

```
KQL BASICS — THINK OF IT LIKE EXCEL FILTERS FOR LOGS:

  SIMPLE QUERY: Find all failed logins in last 24 hours
  ─────────────────────────────────────────────────────────────────
  SecurityEvent
  | where TimeGenerated > ago(24h)
  | where EventID == 4625
  | project TimeGenerated, Account, IpAddress, LogonType
  | order by TimeGenerated desc

  RESULT: Table of failed logins with who, when, from where


  MEDIUM QUERY: Find password spray (>10 accounts failed from 1 IP)
  ─────────────────────────────────────────────────────────────────
  SecurityEvent
  | where EventID == 4625
  | where TimeGenerated > ago(1h)
  | summarize FailedAccounts = dcount(TargetAccount),
              FailCount = count()
              by IpAddress
  | where FailedAccounts > 10
  | order by FailedAccounts desc

  RESULT: IPs attempting password spray → IMMEDIATE BLOCK


  ADVANCED QUERY: Detect DCSync (replication from non-DC)
  ─────────────────────────────────────────────────────────────────
  SecurityEvent
  | where EventID == 4662
  | where Properties contains "1131f6aa-9c07-11d1-f79f-00c04fc2dcd2"
  | where SubjectUserName !endswith "$"   // Exclude machine accounts
  | extend DCsyncUser = SubjectUserName
  | project TimeGenerated, DCsyncUser, Computer, IpAddress


  KQL COMMON OPERATORS:
  ─────────────────────────────────────────────────────────────────
  | where      → Filter rows
  | project    → Select specific columns
  | summarize  → Aggregate (count, sum, dcount)
  | join       → Combine two tables
  | extend     → Add new column
  | order by   → Sort results
  | limit      → Return N rows
  | ago(24h)   → Time function (1h, 7d, 30d)
```

---

## 🚨 Analytics Rules — Automated Alerting

```
ANALYTICS RULES are KQL queries that run on a schedule
and create alerts/incidents automatically:

  ┌─────────────────────────────────────────────────────────────┐
  │  RULE: Password Spray Detection                             │
  │                                                             │
  │  Query: (KQL query for password spray)                      │
  │  Schedule: Run every 5 minutes                              │
  │  Lookback: Past 1 hour of data                              │
  │  Threshold: Alert if FailedAccounts > 10                    │
  │  Severity: HIGH                                             │
  │  Tactics: Credential Access (MITRE ATT&CK)                  │
  │  Automation: Create Ticket in ServiceNow                    │
  └─────────────────────────────────────────────────────────────┘

RULE TYPES IN SENTINEL:
──────────────────────────────────────────────────────────────────

  SCHEDULED   → KQL query on a timer (most flexible)
  NRT         → Near Real-Time (< 1 min latency)
  FUSION      → AI correlation across multiple signals
  ML BEHAVIOR → Machine learning anomaly detection
  MICROSOFT   → Built-in rules from MDI/MDE/MDO
  THREAT INTEL → Match against known bad IPs/domains/hashes

BUILT-IN RULE TEMPLATES (1000+ available):
──────────────────────────────────────────────────────────────────
  Sentinel comes with 1000+ pre-built rules for:
  ✅ AD attacks (Kerberoasting, DCSync, Golden Ticket)
  ✅ M365 attacks (BEC, phishing, mailbox rules)
  ✅ Azure attacks (storage exposure, privilege escalation)
  ✅ Network attacks (brute force, C2 beaconing)
```

---

## 🎫 Incidents — The Investigation Unit

```
HOW AN INCIDENT IS CREATED:

  Multiple Related Alerts → Grouped into ONE Incident
  ─────────────────────────────────────────────────────────────
  Alert 1: "Password spray from 185.220.x.x"
  Alert 2: "Successful login from 185.220.x.x (5 min later)"
  Alert 3: "BloodHound queries from logged-in user"
  Alert 4: "Kerberoasting from same user"
       │
       ▼
  INCIDENT: "Multi-stage attack - Spray → Compromise → Recon"
  Severity: HIGH
  Status: New → Assigned → Active → Resolved
  Assigned to: alice.smith@soc.com


INCIDENT WORKBOOK:
──────────────────────────────────────────────────────────────────
  ┌─────────────────────────────────────────────────────────────┐
  │  INCIDENT #4521                                             │
  │  "Password Spray and Lateral Movement"                      │
  │  ─────────────────────────────────────────────             │
  │  Entities:  👤 bob@corp.com  🖥️ CORP-PC04  🌐 185.220.x.x │
  │  Timeline:  10:15 PM Spray → 10:20 PM Login → 10:25 PM Recon│
  │  Evidence:  47 log entries linked                           │
  │  Status:    Active → Under Investigation                    │
  │                                                             │
  │  ACTIONS:                                                   │
  │  [Disable User]  [Block IP]  [Isolate Device]  [Add Comment]│
  └─────────────────────────────────────────────────────────────┘
```

---

## 🤖 SOAR — Playbook Automation

SOAR = Security Orchestration, Automation and Response

```
AUTOMATED RESPONSE (Playbooks = Azure Logic Apps):

  EXAMPLE PLAYBOOK: Auto-respond to password spray

  TRIGGER: Alert fired "Password Spray Detected"
       │
       ▼
  STEP 1: Get IP from alert
       │
       ▼
  STEP 2: Query VirusTotal — is IP known malicious?
       │
       ├── YES: STEP 3a: Block IP in firewall via API
       │              STEP 3b: Create P1 ticket in ServiceNow
       │              STEP 3c: Page on-call SOC analyst
       │
       └── NO:  STEP 3b: Create P2 ticket, assign to analyst
                STEP 3c: Add IP to watchlist for 24h


  MORE PLAYBOOK EXAMPLES:
  ─────────────────────────────────────────────────────────────
  Alert: Impossible travel detected
  → Auto: Require MFA re-auth for the user
  → Auto: Post message to Teams SOC channel
  → Auto: Add user to risky users list

  Alert: New Global Admin added
  → Auto: Email CISO immediately
  → Auto: Create approval request for review
  → Auto: Revert if not approved within 1 hour
```

---

## 🔭 Threat Hunting

Sentinel lets you proactively look for threats that haven't alerted yet:

```
THREAT HUNTING WORKFLOW:

  HYPOTHESIS: "Maybe an attacker is already inside, 
               running BloodHound slowly to avoid detection"

  HUNTING QUERY:
  ─────────────────────────────────────────────────────────────
  // Find unusual LDAP queries (low and slow BloodHound)
  SecurityEvent
  | where EventID == 4662
  | where TimeGenerated between (ago(7d) .. now())
  | summarize LDAPQueries = count() by Account, bin(TimeGenerated, 1h)
  | where LDAPQueries between (10 .. 100)  // Not too fast, not too slow
  | order by TimeGenerated desc

  RESULT: "Look, svc-helpdesk account ran 45 LDAP queries at 
            3 AM every morning this week... That's suspicious!"

  ACTION: Investigate → New detection rule created → Attacker caught


BUILT-IN HUNTING QUERIES:
──────────────────────────────────────────────────────────────────
  Sentinel includes 200+ built-in hunting queries covering:
  → AD attacks, lateral movement, persistence, exfiltration
  Access via: Sentinel → Hunting → Queries
```

---

## 📊 Workbooks — Security Dashboards

```
SENTINEL WORKBOOKS (built-in dashboards):

  ┌─────────────────────────────────────────────────────────────┐
  │  MICROSOFT ENTRA ID WORKBOOK                                │
  │                                                             │
  │  Sign-in Summary          Failed Logins by Country          │
  │  ▓▓▓▓▓▓▓▓░░  92% success  🗺️  [World Map View]            │
  │                                                             │
  │  Top Risky Users           Conditional Access Policy Hits   │
  │  1. bob@corp   Score: 85   Blocked: 234  Granted: 12,445    │
  │  2. alice@corp Score: 72                                    │
  │                                                             │
  │  Anomalous Sign-ins        MFA Usage                        │
  │  Impossible travel: 3      Enabled: 94%  Not enrolled: 6%  │
  └─────────────────────────────────────────────────────────────┘

  OTHER USEFUL WORKBOOKS:
  ✅ Identity & Access          ✅ Azure Sentinel Overview
  ✅ Insecure Protocols         ✅ UEBA User Behavior
  ✅ Azure Activity             ✅ Microsoft Defender for Identity
```

---

## 💰 Sentinel Pricing (Important!)

```
PRICING MODEL: Pay per GB of data ingested

  FREE TIER: 10 GB/day (90-day retention)
  PAID: ~$2.76/GB ingested (varies by region)

  COST OPTIMIZATION TIPS:
  ─────────────────────────────────────────────────────────────
  ✅ Use Commitment Tiers (100GB/day = 40% cheaper)
  ✅ Don't ingest verbose DNS logs (huge volume, low value)
  ✅ Use Azure Monitor Basic Logs for noisy/low-priority data
  ✅ Filter at the connector level (send less)
  ✅ Defender XDR data = FREE in Sentinel (big win!)

  WHAT'S FREE IN SENTINEL:
  ─────────────────────────────────────────────────────────────
  ✅ Microsoft 365 Defender alerts
  ✅ Defender for Identity alerts
  ✅ Defender for Cloud alerts
  ✅ Entra ID Free logs
```

---

## 👮 Security Engineer's POV

> ⚠️ **Sentinel is only as good as the data you feed it and the rules you tune.**

```
COMMON SENTINEL PITFALLS:
──────────────────────────────────────────────────────────────────
  ❌ Alert fatigue: 500 alerts/day → analysts ignore them
     FIX: Tune rules aggressively, use incident grouping

  ❌ Missing critical data sources
     FIX: Connect MDI + MDE + Entra ID FIRST (highest value)

  ❌ No playbooks (all manual response)
     FIX: Automate at least: user disable, IP block, notifications

  ❌ KQL queries too broad (too slow, too noisy)
     FIX: Add time filters, use summarize for aggregation

  ❌ Nobody reviews hunting queries
     FIX: Schedule 2-hour hunting sessions weekly


SOC MATURITY MODEL WITH SENTINEL:
──────────────────────────────────────────────────────────────────
  Level 1: Basic - Connect sources, use built-in rules
  Level 2: Alert tuning, incident workflows, ServiceNow integration
  Level 3: Custom analytics rules for your environment
  Level 4: Full SOAR automation, threat hunting program
  Level 5: AI/ML detections, custom workbooks, XDR integration
```

---

## ✅ Summary

```
┌──────────────────────────────────────────────────────────────────┐
│  MICROSOFT SENTINEL IN A NUTSHELL:                               │
│                                                                  │
│  📡 Collects logs from everywhere (1000+ connectors)             │
│  🧠 KQL engine for querying ANY log data                         │
│  🚨 Analytics rules auto-create alerts + incidents               │
│  🤖 SOAR playbooks automate response                             │
│  🔭 Threat hunting for proactive detection                       │
│  📊 Workbooks = security dashboards                              │
│  💰 Pay per GB — optimize what you ingest                        │
│                                                                  │
│  START WITH: MDI + Entra ID + MDE + Windows Events              │
│  These 4 give you 80% of AD/identity security coverage           │
└──────────────────────────────────────────────────────────────────┘
```

---

**← Previous:** [03 - Defender for Identity](./03-Defender-for-Identity.md)
**Next →** [05 - IR Playbooks](./05-IR-Playbooks.md)
