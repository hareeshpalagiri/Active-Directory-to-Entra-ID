# 06 — Smart Card & Certificate-Based Authentication

> **Section:** 03 — AD Authentication Protocols  
> **Difficulty:** Intermediate  
> **Depends on:** [04-AD-CS.md](./04-AD-CS.md), [01-Kerberos.md](./01-Kerberos.md)

---

## 📌 What is Smart Card Authentication?

A **smart card** is a physical card (like a credit card) with an embedded chip that stores a digital certificate and private key. When inserted into a card reader, the user can log into Windows using the certificate instead of a password.

> **Simple definition:**  
> Smart card authentication uses a physical card containing a digital certificate to prove identity — replacing the password entirely. The private key never leaves the card, making it impossible to steal credentials remotely.

### Why Smart Cards?

```
Password problems:
  Hareesh's password can be:
  → Phished (fake login page)
  → Keylogged (malware captures keystrokes)
  → Guessed (brute force)
  → Reused across accounts
  → Shoulder-surfed (someone watches him type)

Smart card advantages:
  → Private key NEVER leaves the card ← cannot be stolen remotely
  → Requires PHYSICAL possession of the card ← phishing is useless
  → Requires PIN (something you have + something you know = MFA)
  → Even if PIN is known → useless without the physical card
  → Cannot be reused across different accounts
  → Automated logon — no password to type
```

---

## 🔐 How Smart Card Login Works

### Under the Hood — Certificate-Based Kerberos

```
Smart card login uses a special Kerberos flow called PKINIT
(Public Key Cryptography for Initial Authentication)

Normal Kerberos (password):
  Hareesh encrypts timestamp with password hash → sends to KDC
  KDC decrypts with stored hash → verifies

Smart Card Kerberos (PKINIT):
  Step 1: Hareesh inserts smart card → prompted for PIN
  
  Step 2: Windows reads the certificate from the card
  
  Step 3: Windows creates a pre-authentication request:
    → Certificate (public key — proves who Hareesh is)
    → Timestamp — signed with PRIVATE KEY (stays on card)
    → Request encrypted with DC's public key
  
  Step 4: Sends to KDC (DC01)
  
  Step 5: DC01 verifies:
    → Certificate signed by trusted CA (Company-Issuing-CA)? ✅
    → Certificate not revoked (checks CRL/OCSP)? ✅
    → Signature valid (signed with matching private key)? ✅
    → Maps certificate to AD user account (Hareesh) ✅
  
  Step 6: KDC issues TGT for Hareesh ✅
  
  Step 7: Hareesh is logged in — normal Kerberos from here on

Key point:
  Private key NEVER left the smart card
  PIN was only verified by the card (not sent to DC)
  DC only saw the certificate and a signature — not a password
```

---

## 🔧 Real-World Smart Card Configuration

### Configuration 1 — Smart Card for Privileged Admin Accounts

```
Scenario: GP (IT Manager) needs to use a smart card for all
          privileged admin tasks. Even if her password is stolen,
          her admin account cannot be used without her physical card.

─────────────────────────────────────────
STEP 1: AD CS — Create Smart Card Template
─────────────────────────────────────────
  Issuing CA → Certificate Templates → Manage
  → Duplicate "Smartcard Logon" template
  → Name: "Company-SmartCard-Admin"
  
  Subject Name:
  → Build from Active Directory (not user-supplied)
  → Subject name format: Common name
  
  Extensions:
  → Enhanced Key Usage:
    Smart Card Logon ✅
    Client Authentication ✅
  
  Request Handling:
  → Purpose: Signature and encryption
  → Allow private key to be exported: NO ← critical
  
  Security:
  → IT-Admins group: Read ✅, Enroll ✅
  → Remove: Domain Users (regular users cannot request this)
  
  Validity: 1 year (shorter for admin certs)

─────────────────────────────────────────
STEP 2: Enroll Certificate onto Smart Card
─────────────────────────────────────────
  Option A: Self-enrollment via web
  GP inserts blank smart card into reader
  Browser: http://pki.company.local/certsrv
  → Request → Smart Card Enrollment
  → Template: Company-SmartCard-Admin
  → Enroll → Certificate written to smart card ✅

  Option B: Admin-enrolled (for new users — GP enrolls on behalf)
  Insert GP's card into enrollment station
  certutil -enrollmentagent [template] [user]

─────────────────────────────────────────
STEP 3: Set PIN on smart card
─────────────────────────────────────────
  Windows → Control Panel → Smart Card → Change PIN
  GP sets her PIN: must be 8+ digits (avoid birth dates!)
  
  PIN policy:
  → Minimum length: 8
  → Complexity: enabled (mix of numbers/letters)
  → Lockout: after 3 wrong attempts → card locked (requires PUK)

─────────────────────────────────────────
STEP 4: Configure AD to require smart card for admin account
─────────────────────────────────────────
  Active Directory Users and Computers
  → GP's admin account: gp-admin → Properties → Account
  → Check: "Smart card is required for interactive logon" ✅
  
  This flag:
  → Rotates the account password randomly every 24 hours (automatically)
  → Effectively makes the password useless — only smart card works
  → Even if someone finds the password → cannot use it without smart card

─────────────────────────────────────────
STEP 5: Configure Privileged Access Workstation (PAW)
─────────────────────────────────────────
  Smart card readers installed on all PAWs
  GPO on PAW OU: "Interactive logon: Require smart card" = Enabled
  
  Now:
  GP walks to her PAW
  Inserts smart card
  Types PIN
  Logs in as gp-admin ✅
  
  No smart card → cannot log into PAW at all ✅
  Even if attacker has gp-admin's password → useless without physical card ✅
```

---

### Configuration 2 — Windows Hello for Business (Modern Smart Card)

```
Windows Hello for Business (WHfB) is Microsoft's modern replacement
for physical smart cards — uses the device's TPM chip instead of
a physical card, but with the same cryptographic principles.

Why WHfB over physical cards:
  Smart card: requires physical card + reader + card management system
  WHfB: uses TPM chip already in every modern laptop
        → No card to carry, no reader needed
        → Same security: private key in TPM, cannot be extracted
        → Login: PIN, fingerprint, or face (Windows Hello)

─────────────────────────────────────────
Setup — WHfB via Hybrid Azure AD Join
─────────────────────────────────────────
  Step 1: Prerequisites
  → Azure AD tenant configured
  → Devices Hybrid Azure AD Joined (both AD + Entra ID)
  → MFA enabled for users in Entra ID

  Step 2: Enable WHfB via Intune or GPO
  GPO: Computer Config → Admin Templates → Windows Components
  → Windows Hello for Business → Use Windows Hello for Business
  → Enabled ✅
  
  → Use a hardware security device: Enabled ✅ (requires TPM)
  → Use certificate for on-premises authentication: Enabled
    (allows WHfB to work with on-prem AD — uses AD CS to issue cert to TPM)

  Step 3: Certificate enrollment
  WHfB requests a certificate from AD CS (via cloud trust or cert trust)
  Certificate stored in TPM — cannot be extracted

  Step 4: User enrollment
  First login after policy applies:
  Windows prompts: "Set up Windows Hello"
  Hareesh: scans fingerprint OR sets PIN (min 6 digits)
  
  TPM generates key pair:
  → Private key: locked in TPM
  → Public key: registered with AD and Entra ID
  → Certificate: issued by AD CS, stored in TPM

  Step 5: Daily login
  Hareesh: touches fingerprint sensor → logged in instantly ✅
  No password typed. No smart card needed.
  Same cryptographic security as physical smart card.

─────────────────────────────────────────
PIN vs Password — Common confusion
─────────────────────────────────────────
  People ask: "How is a PIN more secure than a password?"
  
  Password: tied to the account → works from any machine
             Stolen password → works everywhere
  
  WHfB PIN: tied to THIS SPECIFIC DEVICE + TPM
            PIN + device must both be present
            Stolen PIN without the physical device = useless
            Even Microsoft cannot use the PIN on another device
  
  The PIN unlocks the private key in the TPM
  The TPM then does the cryptographic authentication (like a smart card)
```

---

### Configuration 3 — Smart Card for Network Printer (Badge Printing)

```
Scenario: Company has HP multi-function printers.
          GP wants "follow-me printing" — print jobs held until
          the user taps their badge at the printer.

This is called "Pull Printing" or "Secure Print Release"

Components needed:
  → Smart cards with user certificates (from AD CS)
  → Smart card readers on each printer
  → Print management software (HP Access Control, Papercut, etc.)
  → Integration with Active Directory

─────────────────────────────────────────
Setup with HP Access Control
─────────────────────────────────────────
  Step 1: HP Access Control server configuration
  → LDAP connection to DC01:636 (LDAPS)
  → Service account: svc_print_auth
  → Certificate attribute mapping:
    Certificate SAN email → match to AD user UPN

  Step 2: Printer configuration
  HP EWS (printer admin page):
  → Security → Access Control → Smart Card
  → Reader type: PC/SC (standard reader)
  → Authentication: Certificate
  → CA certificate: import Company-Root-CA.cer
  
  Step 3: GPO — Print queue configuration
  Hareesh prints to "Follow-Me-Printer" virtual queue
  Job held on print server (not printed yet)
  
  Step 4: User release at printer
  Hareesh walks to any printer
  Taps badge on reader
  Card reader reads certificate
  HP Access Control matches cert → AD user account
  All Hareesh's pending print jobs displayed
  Hareesh selects jobs → printed ✅

Benefits:
  → Confidential documents not left in printer tray ✅
  → No print waste (unretrieved jobs auto-deleted after 24h) ✅
  → Full audit trail: who printed what, where, when ✅
  → Works across all printers in the building ✅
```

---

## ⚠️ Smart Card & WHfB Attack Techniques

### Attack 1 — Smart Card Certificate Theft

```
What: If smart card private key export is allowed,
      attacker can export the certificate + private key
      and use it from any machine.

Vulnerable template setting:
  Allow private key to be exported: YES ← mistake

Attack:
  Hareesh's smart card certificate is marked exportable
  Attacker compromises Hareesh's machine (malware)
  Exports certificate with private key:
    certutil -exportpfx -user MY hareesh_cert.pfx
  
  Uses pfx from any machine to authenticate as Hareesh ← everywhere

Defense:
  NEVER allow private key export on smart card templates
  Template: Request Handling → Allow private key to be exported: NO
  Use non-exportable keys: keys generated on TPM cannot be exported
  (TPM-bound keys are hardware-protected)
```

---

### Attack 2 — PIN Brute Force / Shoulder Surfing

```
What: Smart card requires PIN → attacker watches PIN being entered
      OR brute forces the PIN

Reality:
  Smart card lockout: typically 3 attempts before card locks
  → Brute force is not practical for hardware smart cards
  
  Shoulder surfing (shoulder-surfed PIN):
  Attacker watches GP type her PIN at printer
  Steals card from GP's desk
  → Uses PIN + stolen card

Defense:
  Privacy screens on workstations
  Physical security (card should not be left unattended)
  Card lock when removed from reader (GPO):
  → "Interactive logon: Smart card removal behavior"
  → Set to: Lock workstation ← locks PC when card removed
  
  User education: cover PIN entry, never leave card unattended
```

---

### Attack 3 — PKINIT Abuse — Certificate for Kerberos

```
What: If attacker gets any certificate with Smart Card Logon EKU
      and the user's UPN, they can use it to get a TGT.
      
Connection to AD CS attacks:
  ESC1 attack on AD CS → attacker gets certificate with GP's UPN
  → Uses certificate in PKINIT flow
  → Gets TGT as GP → Domain Admin

This is why AD CS security is so critical.
An AD CS misconfiguration can directly lead to Domain Admin
via certificate-based Kerberos authentication.

Defense:
  Audit AD CS templates (see Section 04 — AD CS)
  Monitor certificate requests with unexpected SANs (Event 4887)
  Defender for Identity: detects abnormal certificate-based auth
```

---

## 🛡️ Smart Card Hardening Checklist

- [ ] Set "Smart card required for interactive logon" on ALL privileged accounts
- [ ] Never allow private key export on smart card certificate templates
- [ ] Minimum PIN length: 8 digits, complexity enabled
- [ ] Smart card lockout: 3 attempts maximum
- [ ] Configure "Lock workstation on card removal" via GPO
- [ ] Use TPM-bound keys (Windows Hello for Business) where possible
- [ ] Audit all Smart Card Logon certificate templates for misconfigurations
- [ ] Monitor Event ID 4768 — Kerberos TGT with certificate pre-auth
- [ ] Implement physical card management: track issuance, revoke on loss
- [ ] Test card revocation: revoke a test card, verify login fails immediately

---

## 🔧 Troubleshooting

```powershell
# Check if smart card service is running
Get-Service -Name SCardSvr

# List smart cards detected
certutil -scinfo

# Check certificate on smart card
certutil -scinfo -v

# Test smart card login works
# Event ID 4768 with pre-auth type 16 (PKINIT) = smart card Kerberos

# Check "Smart card required" flag on user
Get-ADUser -Identity "gp-admin" -Properties SmartcardLogonRequired |
    Select-Object Name, SmartcardLogonRequired

# Set smart card required flag
Set-ADUser -Identity "gp-admin" -SmartcardLogonRequired $true

# Check CRL is accessible (smart card login fails if CRL unreachable)
certutil -URL http://pki.company.local/CRL/Company-Issuing-CA.crl

# Force CRL check
certutil -verify -urlfetch [certificate.cer]

# Common error: "The system could not log you on. Your credentials could not be verified"
# Causes:
# 1. CRL not accessible (pki.company.local unreachable)
# 2. Certificate revoked
# 3. Certificate CA not trusted by DC
# 4. Certificate expired
# 5. SAN/UPN does not match AD account UPN
```

---

## 🎯 Interview Questions

**Q1. How does smart card login work technically in Active Directory?**  
**A:** Smart card login uses PKINIT (Public Key Cryptography for Initial Authentication) — a Kerberos extension. When a user inserts their card and enters their PIN, Windows reads the certificate from the card. It creates a pre-authentication request signed with the card's private key (which never leaves the card) and sends it to the KDC along with the certificate. The DC verifies: the certificate is signed by a trusted CA, it is not revoked (CRL check), the signature is valid, and the certificate maps to an AD user. If all checks pass, a TGT is issued. The process is similar to normal Kerberos but uses a certificate+private key instead of a password hash.

---

**Q2. What does "Smart card is required for interactive logon" do in AD?**  
**A:** When this flag is set on an AD account, two things happen: (1) Interactive logon to Windows requires a smart card — the password alone cannot be used for login. (2) Active Directory automatically rotates the account's password to a random value every 24 hours, making the password effectively unknown and unusable. This means even if an attacker somehow obtains the password, they cannot log in interactively without the physical smart card. It is the recommended setting for all Tier 0 and Tier 1 admin accounts.

---

**Q3. What is Windows Hello for Business and how is it different from a PIN?**  
**A:** Windows Hello for Business (WHfB) uses the device's TPM chip to store a private key — the same cryptographic principle as a physical smart card. When a user sets up WHfB, the TPM generates a key pair; the private key is bound to that specific device's TPM and cannot be extracted. The user's PIN or biometric (fingerprint/face) unlocks the TPM to perform authentication. This is fundamentally different from a regular PIN — the WHfB PIN is device-specific and only unlocks the TPM locally. Even if someone knows the PIN, they cannot use it on another device.

---

**Q4. What is the relationship between AD CS attacks and smart card authentication?**  
**A:** Smart card authentication is certificate-based Kerberos (PKINIT). If an attacker exploits an AD CS misconfiguration (like ESC1) to obtain a certificate with another user's UPN in the Subject Alternative Name, they can use that forged certificate in the PKINIT flow to get a Kerberos TGT for that user — completely bypassing password authentication and MFA. This is why AD CS security directly impacts smart card authentication security. A vulnerable certificate template can let any domain user impersonate a Domain Admin without knowing their password.

---

**Q5. Scenario — GP's smart card is lost. She reports it missing. What is your immediate response?**  
**A:** (1) Immediately revoke GP's smart card certificate in AD CS: certutil -revoke [certificate serial number] 1 (reason: keyCompromise). (2) Publish updated CRL: certutil -crl. (3) Verify revocation is propagated — any login attempt with the old card should now fail immediately. (4) Temporarily create a temporary access method for GP if she needs to work (issue a temporary certificate on a temporary card or enable password temporarily with monitoring). (5) Issue a new smart card with a new certificate. (6) Report the physical card as lost — if it was stolen, treat it as a security incident and review audit logs for any usage between loss and revocation. (7) Consider whether GP's account needs additional monitoring.

---

*"A smart card turns a password into a physical object. You can phish a password, but you cannot phish a piece of plastic and a chip. Physical authentication is the strongest authentication — when combined with a PIN, it is true multi-factor by design."*
