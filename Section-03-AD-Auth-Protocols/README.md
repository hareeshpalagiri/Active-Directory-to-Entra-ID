# Section 03 — Active Directory Authentication Protocols

> **Repository:** Active Directory to Microsoft Entra ID  
> **Focus:** How authentication actually works under the hood in AD environments  
> **Difficulty:** Intermediate

---

## 📌 What This Section Covers

Every time a user logs into Windows, accesses a file share, connects to a printer,
or authenticates through a VPN — a specific protocol is doing the work behind the scenes.

This section explains every major authentication protocol used in Active Directory:
- How each one works step by step
- How to configure it in real enterprise scenarios
- How attackers exploit each protocol
- How to detect and defend against those attacks

---

## 📂 Sub-Topics

| # | File | Protocol | Difficulty |
|---|------|----------|------------|
| 01 | [01-Kerberos.md](./01-Kerberos.md) | Kerberos | ⭐⭐ Intermediate |
| 02 | [02-NTLM.md](./02-NTLM.md) | NTLM | ⭐⭐ Intermediate |
| 03 | [03-LDAP-and-LDAPS.md](./03-LDAP-and-LDAPS.md) | LDAP & LDAPS | ⭐⭐ Intermediate |
| 04 | [04-AD-CS.md](./04-AD-CS.md) | AD Certificate Services | ⭐⭐⭐ Advanced |
| 05 | [05-RADIUS-and-8021X.md](./05-RADIUS-and-8021X.md) | RADIUS & 802.1X | ⭐⭐ Intermediate |
| 06 | [06-Smart-Card-Auth.md](./06-Smart-Card-Auth.md) | Smart Card Auth | ⭐⭐ Intermediate |

---

## 🗺️ Protocol Usage Map

```
User logs into Windows workstation
    └── Kerberos (primary) or NTLM (fallback)

User accesses file share
    └── Kerberos (service ticket for file server)

Application queries AD for user info
    └── LDAP (port 389) or LDAPS (port 636)

User connects to VPN or Wi-Fi
    └── RADIUS + 802.1X (validates against AD)

User logs in with smart card / badge
    └── Smart Card Auth (certificate-based Kerberos)

Web server needs HTTPS certificate
    └── AD CS (certificate authority)

Network printer authenticates users
    └── LDAP (for user lookup) + RADIUS (for auth)
```

---

## ⚡ Protocol Quick Reference

| Protocol | Port | Purpose | Secure? |
|----------|------|---------|---------|
| **Kerberos** | 88 | Primary AD authentication | ✅ Yes |
| **NTLM** | N/A (embedded) | Legacy fallback auth | ⚠️ Weak |
| **LDAP** | 389 | Directory queries (unencrypted) | ❌ No |
| **LDAPS** | 636 | Directory queries (encrypted) | ✅ Yes |
| **RADIUS** | 1812/1813 | Network access auth | ✅ With TLS |
| **AD CS** | 443/80 | Certificate issuance | ✅ Yes |

---

## 🔗 How This Section Connects

```
Section 03 (AD Auth Protocols)
    │
    ├──► Section 04 (AD Security & Hardening)
    │    Hardening Kerberos, disabling NTLM, enforcing LDAPS
    │
    ├──► Section 05 (AD Attacks)
    │    Kerberoasting, Pass-the-Hash, Golden Ticket — all exploit these protocols
    │
    └──► Section 08 (Hybrid Identity)
         Azure AD uses modern protocols (OIDC/SAML) built on these foundations
```

---

*"Authentication protocols are the plumbing of Active Directory. You never see them — until they break or get attacked. Then they are all you think about."*
