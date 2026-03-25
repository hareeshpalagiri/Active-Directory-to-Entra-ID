# 🔁 Pass-Through Authentication (PTA)

> **Simple Definition:** With Pass-Through Authentication, when you log into a cloud app, Microsoft sends your password back to your **on-premise AD** to verify it — like a hotel calling the airline to verify your ID before giving you the flight upgrade.

---

## 🏨 The Hotel Check-in Analogy

```
WITHOUT PTA (PHS):                  WITH PTA:
─────────────────────               ──────────────────────────────
Hotel has a COPY of your            Hotel CALLS your employer
  reservation on file.              to verify you're really an
Just checks their own records.      employee before giving perks.

Fast, independent                   Needs employer to be reachable
Works if employer is closed         Real-time verification
```

---

## 🌊 How PTA Works Step by Step

```
┌──────────────────────────────────────────────────────────────────────┐
│                   PASS-THROUGH AUTH FLOW                             │
│                                                                      │
│  1. User logs        2. Entra ID          3. PTA Agent               │
│     into M365           queues request       picks it up             │
│                                                                      │
│  ┌──────────┐         ┌──────────┐           ┌─────────────────┐    │
│  │ 👤 Alice │         │ Entra ID │           │  ON-PREMISE     │    │
│  │          │────────►│  (Cloud) │◄──────────│  PTA AGENT      │    │
│  │ password │         │          │ encrypted │  (polls cloud)  │    │
│  │ entered  │         │ encrypted│  request  │                 │    │
│  └──────────┘         │ password │           └────────┬────────┘    │
│                       │ queued   │                    │             │
│                       └──────────┘                    │             │
│                                            4. Agent asks AD         │
│                                                        │             │
│                                                        ▼             │
│                                           ┌────────────────────┐    │
│                                           │  ACTIVE DIRECTORY  │    │
│                                           │                    │    │
│                                           │  "Is this Alice's  │    │
│                                           │   password?" ✅    │    │
│                                           └────────┬───────────┘    │
│                                                    │                │
│                                        5. Agent returns result      │
│                                                    │                │
│                                                    ▼                │
│                                           ┌──────────────┐         │
│                                           │  Entra ID    │         │
│                                           │              │         │
│                                           │ ✅ Auth OK!  │         │
│                                           │ Issue token  │         │
│                                           └──────────────┘         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🤖 The PTA Agent

The PTA Agent is a small service installed on your on-premise servers:

```
┌──────────────────────────────────────────────────────────┐
│                    PTA AGENT                             │
│                                                          │
│  📍 Location: On-premise server (not DC)                 │
│  💡 Size: Lightweight agent                              │
│  🔄 Communication: OUTBOUND only (to Azure)              │
│  🔐 No inbound firewall rules needed!                    │
│                                                          │
│  HOW IT CONNECTS:                                        │
│                                                          │
│  PTA Agent ──HTTPS──► Azure Service Bus ◄── Entra ID    │
│                                                          │
│  The agent POLLS Azure (like checking your email)        │
│  When a login request arrives → agent processes it       │
│  Returns result to Azure → user gets access              │
│                                                          │
│  RECOMMENDED: Install on 3+ servers for HA              │
└──────────────────────────────────────────────────────────┘
```

---

## 🏢 PTA in a Real Enterprise

```
CONTOSO CORPORATION - PTA DEPLOYMENT

  CLOUD                               ON-PREMISE
  ┌──────────────────┐                ┌──────────────────────────┐
  │                  │                │                          │
  │   Entra ID       │◄──────────────►│  PTA Agent Server 1     │
  │                  │   HTTPS only   │  (Windows Server 2019)  │
  │   Authentication │◄──────────────►│  PTA Agent Server 2     │
  │   Requests       │   No inbound   │  (Windows Server 2019)  │
  │                  │   ports needed │  PTA Agent Server 3     │
  └──────────────────┘                │  (for redundancy)       │
                                      │          │               │
                                      │          ▼               │
                                      │   Active Directory       │
                                      │   Domain Controller      │
                                      │   ✅ Validates password   │
                                      └──────────────────────────┘

  RESULT: Password NEVER sent to cloud
          AD always does the verification
          On-prem policies enforced in real-time
```

---

## 💪 PTA Advantages

```
┌─────────────────────────────────────────────────────────┐
│  WHY CHOOSE PASS-THROUGH AUTH?                          │
│                                                         │
│  ✅ PASSWORD NEVER IN CLOUD                             │
│     Great for regulated industries (finance, govt)      │
│     Password + auth stays 100% on-premise              │
│                                                         │
│  ✅ REAL-TIME POLICY ENFORCEMENT                        │
│     Disabled account in AD? → Immediately blocked       │
│     in cloud too (PHS has 2 min delay)                  │
│     Password expiry? → Cloud enforces it too            │
│     Account lockout? → Instant cloud lockout            │
│                                                         │
│  ✅ NO EXTRA INFRA LIKE ADFS                            │
│     Lightweight agents vs full ADFS farm                │
│     Much simpler to manage                              │
│                                                         │
│  ✅ ON-PREM COMPLIANCE                                  │
│     "Our passwords must never leave our network"        │
│     → PTA fulfills this requirement                     │
└─────────────────────────────────────────────────────────┘
```

---

## ⚠️ PTA Limitations

```
┌─────────────────────────────────────────────────────────┐
│  TRADE-OFFS TO UNDERSTAND                               │
│                                                         │
│  ❌ REQUIRES ON-PREM AVAILABILITY                       │
│     If AD or PTA agents go down →                       │
│     Users CANNOT log into cloud apps!                   │
│     (This is the #1 reason orgs also enable PHS         │
│      as a backup/fallback)                              │
│                                                         │
│  ❌ NO LEAKED CREDENTIAL DETECTION                      │
│     Microsoft can't check your passwords against        │
│     breach databases (they never see the hash)          │
│                                                         │
│  ❌ SMART LOCKOUT INTEGRATION COMPLEXITY                │
│     Must tune BOTH cloud Smart Lockout AND AD LockoutPolicy│
│     to avoid conflicts                                  │
│                                                         │
│  ❌ LATENCY                                             │
│     Each auth = network round trip to on-prem           │
│     PHS is faster (all cloud)                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🛡️ PTA + PHS Together (Best Practice)

```
RECOMMENDED CONFIGURATION:

  PRIMARY: Pass-Through Authentication
  BACKUP:  Password Hash Sync (enabled as fallback)

  ┌─────────────────────────────────────────────────────┐
  │                                                     │
  │  Normal day → PTA handles all authentication        │
  │                                                     │
  │  Internet outage or DC down →                       │
  │  Entra ID auto-falls back to PHS!                   │
  │  Users still get in! 🎉                             │
  │                                                     │
  │  This is Microsoft's recommended approach for       │
  │  compliance-sensitive orgs who need resilience      │
  │                                                     │
  └─────────────────────────────────────────────────────┘

  CONFIG IN ENTRA CONNECT:
  ────────────────────────
  Authentication Method: Pass-through authentication
  ☑️  Enable Password Hash Sync as backup  ← CHECK THIS!
```

---

## 👮 Security Engineer's POV

> ⚠️ **PTA agents are privileged — protect them like your DCs.**

```
🚨 ATTACK SCENARIOS:

  ATTACK 1: Compromise PTA Agent Server
  ──────────────────────────────────────
  PTA agent runs as a service with AD auth access
  If attacker installs a rogue PTA agent →
  They can intercept cleartext passwords during auth!
  (Every user who logs in sends their password through)

  ATTACK 2: Rogue Agent Registration
  ────────────────────────────────────
  Attacker with Global Admin access in Entra →
  Can register their own PTA agent →
  Capture passwords in transit

  ATTACK 3: PTA Agent Account Abuse
  ───────────────────────────────────
  The agent account in AD has special permissions
  Compromise it → password validation bypass possible

🛡️  DEFENSIVE MEASURES:
  ✅ Monitor which servers have PTA agents installed
  ✅ PTA agent servers should be Tier 0 assets
  ✅ Alert on: new PTA agent registrations
  ✅ Review Entra audit logs for "Agent registered" events
  ✅ Restrict admin access to PTA agent servers
  ✅ Network segmentation: PTA servers → only HTTPS outbound
  ✅ Enable PHS as backup (resilience + fallback)

🔍  LOGS TO MONITOR:
  Entra Audit Log: "PassThroughAuthentication" category
  Event logs on PTA server: Application/System errors
  AD Security log: 4776 (NTLM auth requests from PTA)
```

---

## ✅ Summary

```
┌──────────────────────────────────────────────────────────┐
│  PASS-THROUGH AUTHENTICATION IN A NUTSHELL:             │
│                                                          │
│  🔁 Password entered in cloud → forwarded to on-prem     │
│  🤖 PTA Agent on-prem validates with AD                  │
│  🔐 Password NEVER stored in cloud                       │
│  ⚡ Real-time AD policy enforcement                      │
│  📡 Needs on-prem to be available                        │
│  ✅ Best with PHS as backup/fallback                     │
│                                                          │
│  USE WHEN: Compliance requires passwords stay on-prem    │
└──────────────────────────────────────────────────────────┘
```

---

**← Previous:** [03 - Password Hash Sync](./03-Password-Hash-Sync.md)
**Next →** [05 - ADFS Federation](./05-ADFS-Federation.md)
