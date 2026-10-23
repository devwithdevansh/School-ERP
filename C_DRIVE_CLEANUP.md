# C: Drive Cleanup Guide

Based on the WizTree scan: 260 GB total, 255.5 GB used, **4.4 GB free (1.7%)**.
Paths are inferred from the screenshot. Verify each one in Explorer before deleting.

## Tier 1: Biggest wins, safe

| Path | Size | What to do |
|---|---|---|
| `C:\Users\Lenovo\AppData\Local\Docker\wsl\disk\docker_data.vhdx` | 28.5 GB | Don't delete the file. Run `docker system prune -a --volumes`, then shrink it (see below). Or move Docker's disk image to D: in Docker Desktop > Settings > Resources > Advanced > Disk image location. |
| `C:\Users\Lenovo\.gradle\caches` | 7.7 GB (`.gradle` is 9.6 GB) | Safe to delete. Gradle re-downloads what it needs. Close Android Studio first. |
| `C:\Users\Lenovo\Downloads` | 11.8 GB | Delete the `kali-linux-2026.1-vmware` file or folder (3.6 GB) and any old installers, zips and ISOs. |
| `C:\Users\Lenovo\AppData\Local\Google\Chrome\User Data` | 7.3 GB | Chrome > `Ctrl+Shift+Del` > clear cached images and files. Or delete `...\User Data\Default\Cache` and `Code Cache`. |
| `C:\Users\Lenovo\AppData\Local\Temp` | varies | Delete everything inside. Skip files that are in use. |
| `C:\Windows\Temp` | varies | Delete everything inside. Skip files that are in use. |
| Recycle Bin | varies | Empty it. |

### Shrink the Docker disk after pruning
```powershell
docker system prune -a --volumes
wsl --shutdown
# Run diskpart, then:
#   select vdisk file="C:\Users\Lenovo\AppData\Local\Docker\wsl\disk\docker_data.vhdx"
#   attach vdisk readonly
#   compact vdisk
#   detach vdisk
#   exit
```

## Tier 2: Large, safe if you don't need them

| Path | Size | Notes |
|---|---|---|
| `C:\Users\Lenovo\AppData\Local\Programs\Python\Python311\Lib\site-packages` | 15.9 GB | `torch` alone is 4.9 GB. Run `pip list`, then `pip uninstall` what you don't use. Use per-project virtual environments in future. `pip cache purge` also helps. |
| `C:\Users\Lenovo\AppData\Local\wsl\{b8cf494...}\ext4.vhdx` | 3.7 GB | This is a WSL distro (Kali or Ubuntu). If you don't use it, run `wsl --list`, then `wsl --unregister <name>`. **This deletes the distro permanently.** |
| `C:\Users\Lenovo\AppData\Local\Android\Sdk` | 6.6 GB | Open SDK Manager. Remove old API levels, unused system images, NDK and emulator images you don't use. |
| `C:\Users\Lenovo\.vscode\extensions` | 3.8 GB | Uninstall extensions you don't use. Delete old duplicate-version folders. |
| Visual Studio / Studio files (`Stud...` 3.9 GB, `unt...` 2.0 GB) | about 6 GB | Check these in WizTree. Uninstall via Settings > Apps if unused. |
| `C:\Program Files\Microsoft SQL Server` (SQL2022) | 2.0 GB | Uninstall if you don't use it. |
| `C:\Program Files (x86)\Microsoft...` | 4.8 GB | Open it in WizTree to see which product. Uninstall via Apps if unused. |
| `C:\Program Files\Docker` | 4.1 GB | Keep if you use Docker. |
| `C:\Users\Lenovo\AppData\Local\Packages` | 9.7 GB | Microsoft Store app data. Don't bulk-delete. Uninstall unused Store apps from Settings > Apps instead. |

## Tier 3: Windows system folders (use tools, never delete by hand)

| Path | Size | Safe method |
|---|---|---|
| `C:\Windows\WinSxS` | 16.2 GB | `Dism.exe /online /Cleanup-Image /StartComponentCleanup /ResetBase` (run as Admin) |
| `C:\Windows\Installer` | 4.7 GB | **Do not delete by hand.** Use PatchCleaner or leave it. |
| `C:\Windows\System32\DriverStore\FileRepository` | 5.3 GB | Disk Cleanup > "Device driver packages". Don't hand-delete. |
| `C:\Windows\SoftwareDistribution\Download` | varies | Stop the `wuauserv` service, delete the contents, restart the service. |
| `C:\pagefile.sys` | 14.6 GB | Don't delete. Move it to D: via System Properties > Advanced > Performance > Virtual Memory. This frees 14 GB. |
| `hiberfil.sys` (hidden) | about 6 to 10 GB | If you don't use hibernate, run `powercfg /h off` as Admin. |
| Windows.old (if present) | varies | Settings > System > Storage > Temporary files. |

### Windows built-in cleanup
1. Press Win + R, type `cleanmgr /sageset:1`, tick everything, OK.
2. Run `cleanmgr /sagerun:1`.
3. Or use Settings > System > Storage > Temporary files, and tick everything except Downloads.

## Do NOT delete
- `C:\Windows\System32`, `C:\Windows\WinSxS` (by hand), `C:\Windows\Installer` (by hand)
- `C:\Users\Lenovo\AppData\Local\Docker\wsl\disk\docker_data.vhdx` itself, unless you accept losing all Docker data
- `pagefile.sys`
- Your projects folders

## Suggested order and expected gain

| Step | Estimated freed |
|---|---|
| Docker prune and compact | 10 to 25 GB |
| `.gradle\caches` | about 7 GB |
| Downloads (Kali VM and old files) | 5 to 10 GB |
| Uninstall unused pip packages | 5 to 10 GB |
| Chrome cache and Temp folders | 5 to 8 GB |
| Move pagefile to D: | 14 GB |
| WinSxS cleanup | 2 to 5 GB |
| Remove unused WSL distro | 3.7 GB |
| **Total** | **about 50 to 80 GB** |

## Long-term
- Move the Docker disk image and WSL distros to D:.
- Install Python and Android SDK on D:.
- Point Gradle's cache at D: with an environment variable: `GRADLE_USER_HOME=D:\gradle`.
- Run WizTree monthly, as Administrator for a faster scan.
