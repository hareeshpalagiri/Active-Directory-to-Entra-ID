# 🔗 Section 08 — Hybrid Identity

> **"One identity. Two worlds. Seamless access."**

---

```
╔══════════════════════════════════════════════════════════════════════╗
║                    SECTION 08: HYBRID IDENTITY                      ║
║                                                                      ║
║   ON-PREMISE (Active Directory)  ←────────→  CLOUD (Entra ID)       ║
║                                                                      ║
║   The bridge between your traditional IT infrastructure              ║
║   and the modern cloud world of Microsoft 365 and Azure              ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 📚 What's in This Section

| File | Topic | What You'll Learn |
|------|-------|-------------------|
| [01](./01-What-is-Hybrid-Identity.md) | What is Hybrid Identity? | The big picture, why it exists, the 3 pillars |
| [02](./02-Entra-Connect.md) | Entra Connect | The sync engine, how it works, filtering, health |
| [03](./03-Password-Hash-Sync.md) | Password Hash Sync | How hashes are synced, security implications |
| [04](./04-Pass-Through-Authentication.md) | Pass-Through Auth | Real-time on-prem auth, PTA agents |
| [05](./05-ADFS-Federation.md) | ADFS Federation | SAML tokens, claims, Golden SAML attack |
| [06](./06-Hybrid-AAD-Join.md) | Hybrid AAD Join | Device registration, PRT, Conditional Access |
| [07](./07-Seamless-SSO.md) | Seamless SSO | Kerberos-based silent login, AZUREADSSO$ |

---

## 🗺️ The Hybrid Identity Map

```
┌──────────────────────────────────────────────────────────────────────┐
│                     HYBRID IDENTITY ECOSYSTEM                        │
│                                                                      │
│   ON-PREMISE                        CLOUD (Entra ID / Azure)         │
│   ─────────────────────────         ─────────────────────────────    │
│                                                                      │
│   👥 Active Directory          ──►  👥 Entra ID Users/Groups         │
│      (users, groups, OUs)     SYNC     (synced from AD)             │
│             │                                    │                   │
│             │                                    │                   │
│   🔐 Authentication                   🔐 Token Issuance              │
│      ┌──────────────┐                    ┌───────────────┐           │
│      │ PHS / PTA /  │                    │ OAuth 2.0     │           │
│      │ ADFS         │◄──────────────────►│ OIDC          │           │
│      └──────────────┘                    │ SAML          │           │
│             │                            └───────────────┘           │
│             │                                    │                   │
│   💻 Devices (Computers)              ☁️ Cloud Apps                  │
│      ┌──────────────────┐               ┌────────────────────┐       │
│      │ AD Joined     +  │               │ Microsoft 365      │       │
│      │ Entra ID Joined  │──────────────►│ Teams, SharePoint  │       │
│      │ (Hybrid Join)    │  PRT / SSO    │ Azure Portal       │       │
│      └──────────────────┘               └────────────────────┘       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Authentication Method Comparison

```
┌─────────────────────────────────────────────────────────────────────┐
│             WHICH AUTH METHOD SHOULD YOU USE?                       │
├──────────────────┬────────────────┬────────────────┬────────────────┤
│                  │      PHS       │      PTA       │      ADFS      │
├──────────────────┼────────────────┼────────────────┼────────────────┤
│ Password in      │ Hash (safe)    │ Never in cloud │ Never in cloud │
│ cloud?           │                │                │                │
├──────────────────┼────────────────┼────────────────┼────────────────┤
│ Works if AD      │ ✅ YES         │ ❌ NO          │ ❌ NO          │
│ is down?         │                │                │                │
├──────────────────┼────────────────┼────────────────┼────────────────┤
│ Leaked cred      │ ✅ YES         │ ❌ NO          │ ❌ NO          │
│ detection?       │                │                │                │
├──────────────────┼────────────────┼────────────────┼────────────────┤
│ Extra infra      │ None           │ PTA Agents     │ ADFS Farm +    │
│ needed?          │                │ (2-3 servers)  │ WAP servers    │
├──────────────────┼────────────────┼────────────────┼────────────────┤
│ Complexity       │ 🟢 Low         │ 🟡 Medium      │ 🔴 High        │
├──────────────────┼────────────────┼────────────────┼────────────────┤
│ B2B/Partner      │ ❌ No          │ ❌ No          │ ✅ YES         │
│ Federation?      │                │                │                │
├──────────────────┼────────────────┼────────────────┼────────────────┤
│ Best for         │ Most orgs      │ Compliance-    │ Legacy/B2B     │
│                  │ ✅ RECOMMENDED │ sensitive      │ scenarios      │
└──────────────────┴────────────────┴────────────────┴────────────────┘
```

---

## 🔐 Security Summary — Top Threats

```
┌────────────────────────────────────────────────────────────────────┐
│                  HYBRID IDENTITY ATTACK SURFACE                    │
├──────────────────────────────────────────────────────────────────  │
│                                                                    │
│  🚨 THREAT 1: Entra Connect Server Compromise                      │
│     Impact: Full cloud + on-prem takeover                          │
│     Defense: Treat as Tier 0, patch regularly                      │
│                                                                    │
│  🚨 THREAT 2: AZUREADSSO$ Hash Theft (Silver Ticket for SSO)       │
│     Impact: Forge tokens for any user                              │
│     Defense: Rotate password every 30 days, monitor               │
│                                                                    │
│  🚨 THREAT 3: Golden SAML (ADFS signing cert theft)                │
│     Impact: Forge SAML tokens, bypass MFA                          │
│     Defense: HSM for cert, migrate away from ADFS                  │
│                                                                    │
│  🚨 THREAT 4: PRT Theft (Pass-the-PRT)                             │
│     Impact: Bypass MFA, impersonate users                          │
│     Defense: Credential Guard, Token Protection                    │
│                                                                    │
│  🚨 THREAT 5: PTA Agent Compromise                                 │
│     Impact: Capture cleartext passwords in transit                 │
│     Defense: Harden PTA servers, monitor registrations             │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🎓 Key Concepts Quick Reference

| Concept | One-Line Summary |
|---------|-----------------|
| **Hybrid Identity** | One AD identity that works on-prem AND in the cloud |
| **Entra Connect** | Software that syncs AD → Entra ID every 30 mins |
| **PHS** | Password hash copied to cloud (safe, recommended) |
| **PTA** | Cloud sends password to on-prem AD for verification |
| **ADFS** | On-prem token issuer using SAML (complex, legacy) |
| **Hybrid AAD Join** | PC registered in both AD and Entra ID |
| **PRT** | "Master key card" — SSO ticket stored on device |
| **Seamless SSO** | Kerberos-based silent cloud login for domain users |
| **AZUREADSSO$** | Special AD account that bridges Kerberos → cloud |
| **Claims** | Facts about a user sent in a security token |
| **SCP** | AD pointer that tells PCs where to register in cloud |

---

## 🧪 Hands-On Checklist

```
SECTION 08 LABS - TRY THESE:

  □ Install Entra Connect in lab environment
  □ Configure Password Hash Sync
  □ Run: Start-ADSyncSyncCycle -PolicyType Delta
  □ Verify sync with: Get-AzureADUser
  □ Enable Seamless SSO and test in browser
  □ Run: dsregcmd /status on a domain-joined PC
  □ Check PRT status in dsregcmd output
  □ Create a Conditional Access policy requiring Hybrid Join
  □ Test: Access SharePoint from non-domain device → blocked
  □ Run AADInternals in lab to see what attackers can do
  □ Enable Azure AD Connect Health dashboard
```

---

## ➡️ What's Next

| Section | Topic |
|---------|-------|
| ← Section 07 | [Entra ID Security](../Section-07-Entra-ID-Security/) |
| → Section 09 | [Monitoring, Logging & Incident Response](../Section-09-Monitoring/) |

---

```
╔══════════════════════════════════════════════════════════════════════╗
║  SECTION 08 COMPLETE ✅                                              ║
║                                                                      ║
║  You now understand:                                                 ║
║  ✅ Why hybrid identity exists                                       ║
║  ✅ How Entra Connect syncs AD to cloud                              ║
║  ✅ The 3 auth methods (PHS / PTA / ADFS) and when to use each      ║
║  ✅ How devices register in both worlds (Hybrid AAD Join)            ║
║  ✅ How Seamless SSO works with Kerberos                             ║
║  ✅ The top security threats and defenses for each                   ║
╚══════════════════════════════════════════════════════════════════════╝
```
