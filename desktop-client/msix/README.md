# Microsoft Store package (MSIX)

Store listing: **Everything Clipboard**, Store ID `9NM290667HZM`
(https://apps.microsoft.com/detail/9NM290667HZM).

```powershell
.\build_windows.bat              # PyInstaller -> build-output\windows\ClipSync
.\build_msix.ps1                 # -> build-output\msix\EverythingClipboard-<ver>-x64.msix
.\build_msix.ps1 -Register       # also installs the unpacked layout locally (Developer Mode)
msstore publish build-output\msix\EverythingClipboard-<ver>-x64.msix -id 9NM290667HZM --noCommit
```

- The version comes from `APP_VERSION` in `app.py`: `2.0-rc.7` becomes `2.0.7.0`.
- When the app runs packaged (`STORE_BUILD` in `app.py`), it never checks for or applies
  updates, since the Store updates it. Start on login is the manifest's `startupTask`
  (off by default, Settings > Apps > Startup).
- **Store upload:** leave the package unsigned. The Store signs it.
- **Website download:** Windows installs an MSIX only if it is signed by a certificate the
  PC trusts, and a self-signed certificate would make every user import it as admin first.
  Sign it with a public code-signing certificate, for example Azure Artifact Signing
  (`signtool sign /fd SHA256 ...`), then save it as
  `build-output\msix\EverythingClipboard-website.msix` and run
  `npm run upload:downloads windows-msix` in `website/`. The manifest's `Publisher` must
  then equal that certificate's subject, so the website package is a different package
  family from the Store one: the two install side by side and don't update each other.
