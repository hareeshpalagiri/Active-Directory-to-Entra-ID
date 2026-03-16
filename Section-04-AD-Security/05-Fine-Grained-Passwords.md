# 05 — Fine-Grained Password Policies

> **Section:** 04 — AD Security & Hardening  
> **Difficulty:** Intermediate  
> **Stops:** Password spray attacks on admin accounts

---

## 📌 What are Fine-Grained Password Policies?

In older AD environments, one password policy applies to **everyone** in the domain — the Default Domain Policy. This means you cannot have different password rules for admins vs regular users.

**Fine-Grained Password Policies (FGPP)** — introduced in Windows Server 2008 — allow you to apply **different password policies to specific users or groups**.

> **Simple definition:**  
> Fine-Grained Password Policies let you enforce stricter password rules for admin accounts while keeping more practical rules for regular users — all within the same domain.

---

## 🔧 Configuration

### Step 1 — Create a Password Settings Object (PSO)

```powershell
# Create strict policy for admin accounts
New-ADFineGrainedPasswordPolicy `
    -Name "Admin-Password-Policy" `
    -Precedence 10 `
    -MinPasswordLength 20 `
    -PasswordHistoryCount 24 `
    -ComplexityEnabled $true `
    -MaxPasswordAge "60.00:00:00" `
    -MinPasswordAge "1.00:00:00" `
    -LockoutThreshold 3 `
    -LockoutDuration "00:30:00" `
    -LockoutObservationWindow "00:30:00" `
    -ReversibleEncryptionEnabled $false

# Create standard policy for regular users
New-ADFineGrainedPasswordPolicy `
    -Name "User-Password-Policy" `
    -Precedence 20 `
    -MinPasswordLength 14 `
    -PasswordHistoryCount 12 `
    -ComplexityEnabled $true `
    -MaxPasswordAge "90.00:00:00" `
    -MinPasswordAge "1.00:00:00" `
    -LockoutThreshold 5 `
    -LockoutDuration "00:30:00" `
    -LockoutObservationWindow "00:30:00" `
    -ReversibleEncryptionEnabled $false
```

### Step 2 — Apply PSO to Groups/Users

```powershell
# Apply admin policy to Domain Admins group
Add-ADFineGrainedPasswordPolicySubject `
    -Identity "Admin-Password-Policy" `
    -Subjects "Domain Admins", "Tier0-Admins", "Tier1-Admins"

# Apply user policy to all standard users
Add-ADFineGrainedPasswordPolicySubject `
    -Identity "User-Password-Policy" `
    -Subjects "SG-Standard-Users"

# Note: Lower Precedence number = HIGHER priority
# If a user is in both groups → lowest precedence number wins
# Admin accounts: Precedence 10 (wins over User policy Precedence 20)
```

### Step 3 — Verify Policy Application

```powershell
# Check effective policy for a specific user
Get-ADUserResultantPasswordPolicy -Identity "gp-t0"

# View all PSOs in the domain
Get-ADFineGrainedPasswordPolicy -Filter *

# Check who a PSO applies to
Get-ADFineGrainedPasswordPolicySubject -Identity "Admin-Password-Policy"
```

---

## 📋 Recommended Policy Settings

| Setting | Admin Accounts | Regular Users |
|---------|---------------|---------------|
| **Minimum length** | 20 characters | 14 characters |
| **Complexity** | Enabled | Enabled |
| **History** | 24 passwords | 12 passwords |
| **Max age** | 60 days | 90 days |
| **Lockout threshold** | 3 attempts | 5 attempts |
| **Lockout duration** | 30 minutes | 30 minutes |
| **Precedence** | 10 (highest) | 20 |

---

## ⚠️ Why This Matters for Security

```
Password spray attack on admin accounts:
  Attacker tries "Winter2024!" across all accounts
  
  Without FGPP: All accounts locked after 5 attempts (normal policy)
  With FGPP admin policy: Admin accounts locked after 3 attempts
  → Faster lockout → fewer spray attempts possible ✅
  
  Also: 20-char minimum makes common passwords unusable
  → "Winter2024!" is only 11 chars → rejected by admin policy ✅
```

---

## 🎯 Key Interview Questions

**Q: What is a Fine-Grained Password Policy and when would you use it?**  
**A:** FGPP allows different password settings to be applied to specific users or groups, overriding the Default Domain Policy. It is used when you need stricter controls for admin accounts (longer passwords, lower lockout threshold) without affecting the standard user experience. Applied via Password Settings Objects (PSOs) linked to security groups — lower precedence number wins when multiple apply.

---

*"One password policy for all is like one lock for the CEO's office and the supply closet. Fine-grained policies let you protect what matters most with the strongest controls."*
