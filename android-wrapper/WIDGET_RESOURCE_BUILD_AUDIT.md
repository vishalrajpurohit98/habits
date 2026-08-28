# Widget Android Resource Build Audit

The widget Android resource files were audited and corrected for aapt2-sensitive
XML string syntax.

Known failure:
`Today's Actionables`

The apostrophe is now escaped as `\'` inside the Android string resource.

Post-fix checks:
- XML parse validation
- Raw apostrophe scan in string resources
- Unescaped XML ampersand scan

This audit is source/resource-level; the GitHub Actions Android toolchain remains
the final compilation authority.
