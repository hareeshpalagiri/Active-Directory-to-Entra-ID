# 🔑 Password Hash Sync (PHS)

> **Simple Definition:** Password Hash Sync copies a **hashed version** of your AD password to the cloud, so you can sign into cloud apps using the same password — without your real password ever leaving your network.

---

## 🧂 The Salt & Hash Analogy

Your password is never stored as plain text. Think of it like a **secret recipe**:

```
YOUR PASSWORD:  "MyPassword123!"
                      │
                      ▼
           ┌──────────────────────┐
           │  WINDOWS HASHING     │
           │                      │
           │  1. NT Hash created  │
           │  2. Salted (random)  │
           │  3. Hashed AGAIN     │
           │  4. 32-byte output   │
           └──────────────────────┘
                      │
                      ▼
           "a8f5f167f44f4964e6c998dee827110c"
           
           This hash goes to the cloud.
           CANNOT be reversed back to password!
```

---

## 🌊 How Password Hash Sync Flows

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PASSWORD HASH SYNC FLOW                         │
│                                                                     │
│  1. User changes     2. DC creates       3. Entra Connect          │
│     password in         NT Hash             reads hash             │
│     AD                                                             │
│                                                                     │
│  ┌──────────┐         ┌──────────┐         ┌────────────────┐      │
│  │ 👤 Alice │         │    DC    │         │ Entra Connect  │      │
│  │          │────────►│          │────────►│                │      │
│  │ changes  │ new pwd │ creates  │ repl.   │ reads via      │      │
│  │ password │         │ NT hash  │ changes │ DirSync        │      │
│  └──────────┘         └──────────┘         └───────┬────────┘      │
│                                                     │               │
│                                        4. Double-hash + salt       │
│                                                     │               │
│                                                     ▼               │
│                                           ┌──────────────────┐     │
│                                           │   Entra ID       │     │
│                                           │   (Cloud)        │     │
│                                           │                  │     │
│                                           │  Stores the      │     │
│                                           │  hashed hash     │     │
│                                           └──────────────────┘     │
│                                                                     │
│  5. User logs into Office 365 → Cloud validates hash → ✅ Access   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 What Exactly Gets Sent to the Cloud?

This is a common concern. Let's be precise:

```
WHAT IS SYNCED:
──────────────────────────────────────────────────────────

 AD stores:    NT Hash = MD4(UTF16LE("MyPassword123!"))
               = "8846f7eaee8fb117ad06bdd830b7586c"

 PHS sends:    PBKDF2(HMACSHA256(NT_Hash, salt, 1000))
               = completely different value
               = cannot reverse to NT Hash
               = cannot reverse to original password

 Cloud stores: Only this final derived hash value


WHAT IS NOT SYNCED:
──────────────────────────────────────────────────────────
  ❌ Original password
  ❌ NT Hash (the one used for NTLM in AD)
  ❌ LM Hash (old weak hash)
  ❌ Kerberos keys
  ❌ Cleartext password
```

---

## 🧪 Real-World Login with PHS

```
SCENARIO: Alice signs into teams.microsoft.com

  Step 1: Alice types her AD password
  ┌───────────────────────────────────────────────┐
  │  teams.microsoft.com login page               │
  │  Username: alice@contoso.com                  │
  │  Password: ●●●●●●●●●●●●                      │
  └───────────────────────────────────────────────┘
                    │
                    ▼
  Step 2: Microsoft 365 sends to Entra ID
  ┌───────────────────────────────────────────────┐
  │  Entra ID: "Let me check alice's password"    │
  │                                               │
  │  Hash what Alice typed → compare to stored   │
  │  cloud hash                                   │
  └───────────────────────────────────────────────┘
                    │
                    ▼
  Step 3: Match! Issue token
  ┌───────────────────────────────────────────────┐
  │  ✅ Hashes match → Issue OAuth token          │
  │  → Alice is in Teams                          │
  │  → No call to on-prem AD needed!              │
  └───────────────────────────────────────────────┘

  KEY INSIGHT: On-premise AD is NOT contacted at login time!
  Even if your DC is down, cloud login still works with PHS.
```

---

## 💪 PHS Advantages

```
┌─────────────────────────────────────────────────────┐
│  WHY CHOOSE PASSWORD HASH SYNC?                     │
│                                                     │
│  ✅ RESILIENT                                       │
│     Works even if on-prem AD/network is down        │
│     No dependency on DC availability                │
│                                                     │
│  ✅ SIMPLE                                          │
│     No extra servers needed                         │
│     No ADFS infrastructure                          │
│     Built into Entra Connect                        │
│                                                     │
│  ✅ ENABLES LEAKED CREDENTIAL DETECTION             │
│     Microsoft compares your hashes against          │
│     billions of leaked password databases!          │
│     Alerts you if employees use breached passwords  │
│                                                     │
│  ✅ FAST LOGIN                                      │
│     All auth happens in cloud                       │
│     No round-trip to on-prem                        │
└─────────────────────────────────────────────────────┘
```

---

## ⚠️ PHS Considerations

```
┌─────────────────────────────────────────────────────┐
│  THINGS TO KNOW / WATCH OUT FOR                     │
│                                                     │
│  ⏱️  SYNC DELAY                                     │
│     Password change takes ~2 minutes to sync        │
│     User changes password → cloud update delayed    │
│                                                     │
│  🔒 COMPLIANCE CONCERNS                             │
│     Some orgs uncomfortable sending ANY hash        │
│     to cloud (regulated industries)                 │
│     → Use PTA instead (see next file)               │
│                                                     │
│  🏢 SMART LOCKOUT BEHAVIOR                          │
│     Cloud-side lockout is separate from AD lockout  │
│     Could lock out in cloud but not AD (or vice     │
│     versa) — configure thresholds carefully         │
└─────────────────────────────────────────────────────┘
```

---

## 👮 Security Engineer's POV

> ⚠️ **PHS is convenient but creates a high-value target: Entra Connect itself.**

```
🚨 ATTACK SCENARIO: "Synced Hash Abuse"

  ATTACKER GAINS ACCESS TO ENTRA CONNECT SERVER
                    │
                    ▼
  Uses AADInternals PowerShell tool:
  ─────────────────────────────────────────────
  Get-AADIntSyncCredentials   # Gets sync account creds
  Set-AADIntUserPassword      # Resets ANY cloud user password
  
  → Even Global Admins can be targeted!
  → No MFA required because it's a "sync operation"
  → Attacker can pivot from AD breach → full M365 takeover


🛡️  DEFENSIVE MEASURES:
  ─────────────────────────────────────────────
  ✅ Protect Entra Connect server like a DC
  ✅ Enable Entra ID Protection (risky sign-in alerts)
  ✅ Monitor for: unexpected password resets
  ✅ Enable "Block Legacy Authentication"
  ✅ Use Privileged Access Workstations for admin work
  ✅ Alert on: ADSync account accessing non-sync APIs
  
🔍  LOG TO WATCH:
  Event ID 4723 - Password change attempted
  Entra Sign-in logs - Unexpected locations
  Entra Audit logs - Password reset by sync account
```

---

## 🆚 PHS vs PTA vs ADFS (Quick Compare)

```
                    PHS          PTA          ADFS
                 ─────────     ─────────     ──────────
Auth Location    Cloud          On-prem       On-prem
Extra Infra      None           PTA agents    ADFS servers
Works if DC down ✅ YES         ❌ NO         ❌ NO
Password in cloud Hash (safe)   Never sent    Never sent
Leaked cred det  ✅ YES         ❌ NO         ❌ NO
Complexity       Low            Medium        High
Recommended      ✅ Most cos    Compliance    Legacy/complex
```

---

## ✅ Summary

```
┌───────────────────────────────────────────────────────────┐
│  PASSWORD HASH SYNC IN A NUTSHELL:                        │
│                                                           │
│  📥 AD password change → NT Hash created                  │
│  🔄 Entra Connect reads hash every 2 min                  │
│  🧂 Hash is salted + re-hashed (safe for cloud)           │
│  ☁️  Cloud Entra ID stores derived hash                   │
│  ✅ User logs into M365 → hash compared → access granted  │
│                                                           │
│  🟢 RECOMMENDED for most organizations                    │
│  ⚠️  Protect Entra Connect server at all costs!           │
└───────────────────────────────────────────────────────────┘
```

---

**← Previous:** [02 - Entra Connect](./02-Entra-Connect.md)
**Next →** [04 - Pass-Through Authentication](./04-Pass-Through-Authentication.md)
