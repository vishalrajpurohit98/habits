# Widget Build Audit

Audited Android wrapper resources and Java widget sources for:
- XML parsing/resource syntax
- Android string apostrophes
- duplicate Java method signatures
- manifest class references
- PendingIntent mutability flags
- obvious unescaped XML ampersands

The known `Today's Actionables` resource issue has been fixed using `&apos;`.
The ZIP was re-audited after the fix.
